/**
 * Knowledge Graph — Document-Level Terminology Consistency Tracker
 *
 * Maintains a map of source terms to their translations.
 * When a term is first translated, it's stored. When the same term
 * appears again, the stored translation is used for consistency.
 *
 * This eliminates the "same term translated 3 different ways" problem.
 */

/**
 * Represents a term entry in the knowledge graph.
 */
interface TermEntry {
  /** The source term */
  source: string;
  /** The translated term */
  translation: string;
  /** The language pair (e.g., "en-ne" for English→Nepali) */
  lang: string;
  /** Number of times this term has been used */
  frequency: number;
  /** Timestamp when the term was first added */
  firstSeen: number;
  /** Timestamp when the term was last used */
  lastUsed: number;
}

/**
 * Node in the knowledge graph for visualization.
 */
interface GraphNode {
  id: string;
  label: string;
  type: 'source' | 'translation';
  lang: string;
  frequency: number;
}

/**
 * Edge in the knowledge graph for visualization.
 */
interface GraphEdge {
  source: string;
  target: string;
  label: string;
  frequency: number;
}

/**
 * Knowledge Graph for document-level terminology consistency.
 */
export class KnowledgeGraph {
  /**
   * Map from language pair → (source term → TermEntry)
   * Outer key: language pair like "en-ne"
   * Inner key: source term string
   */
  private terms: Map<string, Map<string, TermEntry>> = new Map();

  /**
   * Add a term and its translation to the knowledge graph.
   *
   * @param source - The source term
   * @param translation - The translated term
   * @param lang - The language pair (e.g., "en-ne")
   */
  addTerm(source: string, translation: string, lang: string): void {
    if (!this.terms.has(lang)) {
      this.terms.set(lang, new Map());
    }

    const langMap = this.terms.get(lang)!;
    const normalizedSource = source.trim().toLowerCase();
    const key = normalizedSource;

    const existing = langMap.get(key);
    if (existing) {
      // Update existing entry — keep the first translation for consistency
      existing.frequency += 1;
      existing.lastUsed = Date.now();
    } else {
      // Add new entry
      langMap.set(key, {
        source: source.trim(),
        translation: translation.trim(),
        lang,
        frequency: 1,
        firstSeen: Date.now(),
        lastUsed: Date.now(),
      });
    }
  }

  /**
   * Look up a previously translated term.
   *
   * @param source - The source term to look up
   * @param lang - The language pair (e.g., "en-ne")
   * @returns The stored translation, or null if not found
   */
  getTranslation(source: string, lang: string): string | null {
    const langMap = this.terms.get(lang);
    if (!langMap) return null;

    const normalizedSource = source.trim().toLowerCase();
    const entry = langMap.get(normalizedSource);
    return entry ? entry.translation : null;
  }

  /**
   * Check if a term exists in the knowledge graph.
   *
   * @param source - The source term to check
   * @param lang - The language pair
   * @returns true if the term has been previously translated
   */
  hasTerm(source: string, lang: string): boolean {
    return this.getTranslation(source, lang) !== null;
  }

  /**
   * Get all terms in the knowledge graph.
   *
   * @returns The full terms map (language pair → source term → TermEntry)
   */
  getAllTerms(): Map<string, Map<string, TermEntry>> {
    return new Map(this.terms);
  }

  /**
   * Get all terms for a specific language pair.
   *
   * @param lang - The language pair (e.g., "en-ne")
   * @returns Map of source terms to their entries
   */
  getTermsByLang(lang: string): Map<string, TermEntry> {
    return new Map(this.terms.get(lang) ?? new Map());
  }

  /**
   * Get the most frequently used terms across all languages.
   *
   * @param limit - Maximum number of terms to return
   * @returns Array of term entries sorted by frequency (descending)
   */
  getTopTerms(limit: number = 20): TermEntry[] {
    const allEntries: TermEntry[] = [];

    for (const langMap of this.terms.values()) {
      for (const entry of langMap.values()) {
        allEntries.push(entry);
      }
    }

    return allEntries
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get statistics about the knowledge graph.
   */
  getStats(): {
    totalTerms: number;
    languagePairs: number;
    termsByLang: Record<string, number>;
    avgFrequency: number;
  } {
    let totalTerms = 0;
    let totalFrequency = 0;
    const termsByLang: Record<string, number> = {};

    for (const [lang, langMap] of this.terms) {
      const count = langMap.size;
      termsByLang[lang] = count;
      totalTerms += count;

      for (const entry of langMap.values()) {
        totalFrequency += entry.frequency;
      }
    }

    return {
      totalTerms,
      languagePairs: this.terms.size,
      termsByLang,
      avgFrequency: totalTerms > 0 ? totalFrequency / totalTerms : 0,
    };
  }

  /**
   * Clear all terms from the knowledge graph.
   */
  clear(): void {
    this.terms.clear();
  }

  /**
   * Clear terms for a specific language pair.
   *
   * @param lang - The language pair to clear
   */
  clearLang(lang: string): void {
    this.terms.delete(lang);
  }

  /**
   * Export the knowledge graph as a serializable object for visualization.
   *
   * @returns An object with nodes and edges suitable for graph visualization
   */
  exportGraph(): {
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata: {
      totalTerms: number;
      languagePairs: string[];
      exportedAt: string;
    };
  } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const languagePairs: string[] = [];

    for (const [lang, langMap] of this.terms) {
      languagePairs.push(lang);

      for (const entry of langMap.values()) {
        const sourceId = `source_${lang}_${this.sanitizeId(entry.source)}`;
        const translationId = `trans_${lang}_${this.sanitizeId(entry.translation)}`;

        // Add source node
        nodes.push({
          id: sourceId,
          label: entry.source,
          type: 'source',
          lang,
          frequency: entry.frequency,
        });

        // Add translation node
        nodes.push({
          id: translationId,
          label: entry.translation,
          type: 'translation',
          lang,
          frequency: entry.frequency,
        });

        // Add edge
        edges.push({
          source: sourceId,
          target: translationId,
          label: lang,
          frequency: entry.frequency,
        });
      }
    }

    return {
      nodes,
      edges,
      metadata: {
        totalTerms: nodes.filter((n) => n.type === 'source').length,
        languagePairs,
        exportedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Export the knowledge graph as JSON string for persistence.
   */
  exportJSON(): string {
    const data: Record<string, Array<{
      source: string;
      translation: string;
      frequency: number;
      firstSeen: number;
      lastUsed: number;
    }>> = {};

    for (const [lang, langMap] of this.terms) {
      data[lang] = [];
      for (const entry of langMap.values()) {
        data[lang].push({
          source: entry.source,
          translation: entry.translation,
          frequency: entry.frequency,
          firstSeen: entry.firstSeen,
          lastUsed: entry.lastUsed,
        });
      }
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import the knowledge graph from JSON string.
   *
   * @param json - JSON string previously exported by exportJSON()
   */
  importJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Record<string, Array<{
        source: string;
        translation: string;
        frequency: number;
        firstSeen: number;
        lastUsed: number;
      }>>;

      for (const [lang, entries] of Object.entries(data)) {
        if (!this.terms.has(lang)) {
          this.terms.set(lang, new Map());
        }
        const langMap = this.terms.get(lang)!;

        for (const entry of entries) {
          const key = entry.source.trim().toLowerCase();
          if (!langMap.has(key)) {
            langMap.set(key, {
              source: entry.source,
              translation: entry.translation,
              lang,
              frequency: entry.frequency,
              firstSeen: entry.firstSeen,
              lastUsed: entry.lastUsed,
            });
          }
        }
      }
    } catch {
      throw new Error('Failed to import knowledge graph: invalid JSON');
    }
  }

  /**
   * Sanitize a string for use as a graph node ID.
   */
  private sanitizeId(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}

/**
 * Singleton instance for use across the application.
 */
export const knowledgeGraph = new KnowledgeGraph();
