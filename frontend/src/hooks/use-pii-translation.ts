'use client';

import { detectPII, findPIIEntities } from '@/src/lib/pii-detector';
import type { PIIFragment } from '@/src/lib/pii-detector';

/**
 * PII-aware translation segment
 */
export interface PIISegment {
  /** The text content of this segment */
  text: string;
  /** Whether this segment is PII (should not be translated) */
  isPII: boolean;
  /** The type of PII if isPII is true */
  piiType?: 'name' | 'phone' | 'email' | 'address' | 'location';
}

/**
 * Result of PII-aware text analysis for translation
 */
export interface PIITranslationResult {
  /** All segments (both PII and translatable text) */
  segments: PIISegment[];
  /** Only the translatable (non-PII) text segments, in order */
  translatableText: string[];
  /** Number of PII entities detected */
  piiCount: number;
  /** Types of PII found */
  piiTypes: string[];
  /**
   * Reconstruct the full text by interleaving PII segments with their
   * corresponding translations. The translations array must match the
   * order and count of translatableText segments.
   */
  reconstruct: (translations: string[]) => string;
}

/**
 * PII-aware translation flow:
 * 1. Detect PII in the input text
 * 2. Split the text around PII entities
 * 3. Only translate the non-PII text segments
 * 4. Reassemble: interleave original PII with translated text
 * 5. Return the full translated text with PII preserved
 *
 * @param text - The input text to analyze
 * @param piiEnabled - Whether PII detection is enabled
 * @returns Analysis result with segments, translatable text, and reconstruction function
 *
 * @example
 * const result = translateWithPII("My name is John Smith and I live in Kathmandu", true);
 * // result.segments: [
 * //   {text:"My name is ", isPII:false},
 * //   {text:"John Smith", isPII:true, piiType:"name"},
 * //   {text:" and I live in ", isPII:false},
 * //   {text:"Kathmandu", isPII:true, piiType:"location"}
 * // ]
 * // result.translatableText: ["My name is ", " and I live in "]
 * // result.reconstruct(["मेरो नाम हो", " र म बस्छु "])
 * //   → "मेरो नाम हो John Smith र म बस्छु Kathmandu"
 */
export function translateWithPII(
  text: string,
  piiEnabled: boolean
): PIITranslationResult {
  // If PII detection is disabled, treat the entire text as one translatable segment
  if (!piiEnabled) {
    return {
      segments: [{ text, isPII: false }],
      translatableText: [text],
      piiCount: 0,
      piiTypes: [],
      reconstruct: (translations: string[]) => translations[0] ?? text,
    };
  }

  // Use the PII detector to split the text around PII entities
  const fragments: PIIFragment[] = detectPII(text);

  // Count PII entities
  const piiEntities = findPIIEntities(text);
  const piiTypes = [...new Set(piiEntities.map((e) => e.type))];

  // Build segments
  const segments: PIISegment[] = fragments.map((f) => ({
    text: f.value,
    isPII: f.type === 'pii',
    piiType: f.piiType,
  }));

  // Extract only translatable (non-PII) text segments
  const translatableText = segments
    .filter((s) => !s.isPII && s.text.trim().length > 0)
    .map((s) => s.text);

  // Build the reconstruct function
  // It takes translations for the translatable segments and interleaves
  // them with the original PII segments
  const reconstruct = (translations: string[]): string => {
    let translationIndex = 0;

    return segments
      .map((segment) => {
        if (segment.isPII) {
          // PII segments are preserved as-is
          return segment.text;
        }

        // For translatable segments, use the provided translation
        // Empty/whitespace-only segments still get their translation
        if (segment.text.trim().length === 0) {
          return segment.text;
        }

        const translated = translations[translationIndex] ?? segment.text;
        translationIndex++;
        return translated;
      })
      .join('');
  };

  return {
    segments,
    translatableText,
    piiCount: piiEntities.length,
    piiTypes,
    reconstruct,
  };
}
