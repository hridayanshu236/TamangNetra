'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Share2, Search, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { useTranslationStore, KnowledgeEntry } from './TranslationStore';

// Force-directed graph layout using SVG
function SimpleGraph({
  entries,
  selectedTerm,
  onSelect,
}: {
  entries: KnowledgeEntry[];
  selectedTerm: string | null;
  onSelect: (term: string) => void;
}) {
  // Calculate positions for nodes
  const { nodes, edges } = useMemo(() => {
    const topEntries = entries.slice(0, 20);
    const nodeMap = new Map<
      string,
      { id: string; label: string; x: number; y: number; type: 'source' | 'translation' }
    >();

    const centerX = 300;
    const centerY = 200;
    const radius = 140;

    topEntries.forEach((entry, i) => {
      const angle = (i / topEntries.length) * Math.PI * 2 - Math.PI / 2;
      const srcX = centerX + radius * Math.cos(angle) - 60;
      const srcY = centerY + radius * Math.sin(angle);
      const tgtX = centerX + (radius + 80) * Math.cos(angle) - 60;
      const tgtY = centerY + (radius + 80) * Math.sin(angle);

      nodeMap.set(`src_${i}`, {
        id: `src_${i}`,
        label: entry.source.length > 15 ? entry.source.substring(0, 15) + '...' : entry.source,
        x: srcX,
        y: srcY,
        type: 'source',
      });

      nodeMap.set(`tgt_${i}`, {
        id: `tgt_${i}`,
        label: entry.translation.length > 15 ? entry.translation.substring(0, 15) + '...' : entry.translation,
        x: tgtX,
        y: tgtY,
        type: 'translation',
      });
    });

    const edgeList = topEntries.map((entry, i) => ({
      from: `src_${i}`,
      to: `tgt_${i}`,
      frequency: entry.frequency,
    }));

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        No knowledge graph data yet. Translate some text first.
      </div>
    );
  }

  return (
    <svg viewBox="0 0 600 400" className="w-full h-64 sm:h-80">
      {/* Edges */}
      {edges.map((edge, i) => {
        const fromNode = nodes.find((n) => n.id === edge.from);
        const toNode = nodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) return null;

        const isSelected =
          selectedTerm &&
          (fromNode.id.includes(selectedTerm) || toNode.id.includes(selectedTerm));

        return (
          <line
            key={i}
            x1={fromNode.x + 30}
            y1={fromNode.y + 8}
            x2={toNode.x + 30}
            y2={toNode.y + 8}
            stroke={isSelected ? '#10b981' : '#94a3b8'}
            strokeWidth={isSelected ? 2 : 1}
            opacity={isSelected ? 1 : 0.4}
            className="transition-all duration-200 dark:opacity-80"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const isSelected =
          selectedTerm && node.id.includes(selectedTerm);
        const isSource = node.type === 'source';

        return (
          <g
            key={node.id}
            onClick={() => onSelect(node.id)}
            className="cursor-pointer"
          >
            <rect
              x={node.x}
              y={node.y}
              width={60}
              height={16}
              rx={4}
              fill={
                isSource
                  ? isSelected
                    ? '#10b981'
                    : '#d1fae5'
                  : isSelected
                    ? '#f59e0b'
                    : '#fef3c7'
              }
              stroke={
                isSource
                  ? isSelected
                    ? '#059669'
                    : '#6ee7b7'
                  : isSelected
                    ? '#d97706'
                    : '#fcd34d'
              }
              strokeWidth={isSelected ? 2 : 1}
              className="transition-all duration-200"
            />
            <text
              x={node.x + 30}
              y={node.y + 11}
              textAnchor="middle"
              fontSize={7}
              fill={isSelected ? '#ffffff' : '#374151'}
              className="transition-all duration-200"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function KnowledgeGraphPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const { knowledgeEntries, srcLang, tgtLang } = useTranslationStore();

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return knowledgeEntries;
    const term = searchTerm.toLowerCase();
    return knowledgeEntries.filter(
      (e) =>
        e.source.toLowerCase().includes(term) ||
        e.translation.toLowerCase().includes(term)
    );
  }, [knowledgeEntries, searchTerm]);

  const handleSelectTerm = (termId: string) => {
    setSelectedTerm(selectedTerm === termId ? null : termId);
  };

  if (knowledgeEntries.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Share2 className="size-4 text-teal-600" />
                Knowledge Graph
              </CardTitle>
              <CardDescription>
                Terminology consistency across your document
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit text-xs">
              {knowledgeEntries.length} terms
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Graph Visualization */}
          <div className="rounded-lg border bg-muted/10 dark:bg-muted/5 dark:border-border/40">
            <SimpleGraph
              entries={filteredEntries}
              selectedTerm={selectedTerm}
              onSelect={handleSelectTerm}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search terms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm dark:border-border/60 dark:bg-background/80"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="size-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Term List */}
          <ScrollArea className="max-h-48">
            <div className="space-y-1.5">
              {filteredEntries.slice(0, 30).map((entry, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectTerm(`src_${i}`)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-all ${
                    selectedTerm === `src_${i}`
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
                      : 'hover:bg-muted/50 dark:hover:bg-muted/30 border-transparent dark:border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm truncate dark:text-foreground/90">{entry.source}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-sm truncate text-emerald-700 dark:text-emerald-400">
                      {entry.translation}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] shrink-0 px-1.5 dark:border-border/40 dark:text-muted-foreground/80"
                  >
                    ×{entry.frequency}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Language pair info */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 dark:border-emerald-700/50 dark:text-emerald-400 dark:bg-emerald-950/20">
              {srcLang}
            </Badge>
            <span>→</span>
            <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 dark:border-amber-700/50 dark:text-amber-400 dark:bg-amber-950/20">
              {tgtLang}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
