'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompareArrows,
  Eye,
  EyeOff,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { useTranslationStore } from './TranslationStore';

// ── Word-level diff algorithm ──

type DiffType = 'match' | 'removal' | 'addition' | 'modification';

interface WordDiff {
  word: string;
  type: DiffType;
  confidence: 'high' | 'medium' | 'low';
}

interface SegmentDiff {
  original: WordDiff[];
  translated: WordDiff[];
  matchScore: number; // 0–1
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Simple word-level diff: compare two word arrays and classify each word.
 * Uses a longest-common-subsequence-inspired approach:
 * - Words that appear in both at the same relative position = match
 * - Words only in source = removal (red)
 * - Words only in target = addition (green)
 * - Words that are close but different = modification (amber/yellow)
 */
function computeWordDiff(
  sourceWords: string[],
  targetWords: string[]
): SegmentDiff {
  // Build LCS table for alignment
  const m = sourceWords.length;
  const n = targetWords.length;

  // Simple alignment using longest common subsequence
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (
        sourceWords[i - 1].toLowerCase() === targetWords[j - 1].toLowerCase()
      ) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find alignment
  const sourceMatched = new Set<number>();
  const targetMatched = new Set<number>();
  const alignedPairs: [number, number][] = [];

  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (
      sourceWords[i - 1].toLowerCase() === targetWords[j - 1].toLowerCase()
    ) {
      alignedPairs.push([i - 1, j - 1]);
      sourceMatched.add(i - 1);
      targetMatched.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  alignedPairs.reverse();

  // For unmatched words near each other, classify as "modification" if they
  // are at similar positions (likely a translation of the same concept)
  const sourceAligned = new Map<number, number>(); // sourceIdx -> targetIdx
  for (const [si, ti] of alignedPairs) {
    sourceAligned.set(si, ti);
  }

  // Try to pair remaining unmatched words by proximity
  const sourceUnmatched = Array.from(
    { length: m },
    (_, idx) => idx
  ).filter((idx) => !sourceMatched.has(idx));
  const targetUnmatched = Array.from(
    { length: n },
    (_, idx) => idx
  ).filter((idx) => !targetMatched.has(idx));

  const modificationPairs: [number, number][] = [];
  const usedTarget = new Set<number>();

  for (const si of sourceUnmatched) {
    // Find nearest unmatched target word
    let bestTi = -1;
    let bestDist = Infinity;
    for (const ti of targetUnmatched) {
      if (usedTarget.has(ti)) continue;
      // Use relative position distance
      const relSi = si / Math.max(m, 1);
      const relTi = ti / Math.max(n, 1);
      const dist = Math.abs(relSi - relTi);
      if (dist < bestDist && dist < 0.3) {
        bestDist = dist;
        bestTi = ti;
      }
    }
    if (bestTi >= 0) {
      modificationPairs.push([si, bestTi]);
      usedTarget.add(bestTi);
    }
  }

  const sourceModified = new Set(modificationPairs.map((p) => p[0]));
  const targetModified = new Set(modificationPairs.map((p) => p[1]));
  const modificationMap = new Map(modificationPairs);

  // Build original diff
  const original: WordDiff[] = sourceWords.map((word, idx) => {
    if (sourceMatched.has(idx)) {
      return { word, type: 'match', confidence: 'high' };
    } else if (sourceModified.has(idx)) {
      return { word, type: 'modification', confidence: 'medium' };
    } else {
      return { word, type: 'removal', confidence: 'low' };
    }
  });

  // Build translated diff
  const translated: WordDiff[] = targetWords.map((word, idx) => {
    if (targetMatched.has(idx)) {
      return { word, type: 'match', confidence: 'high' };
    } else if (targetModified.has(idx)) {
      return { word, type: 'modification', confidence: 'medium' };
    } else {
      return { word, type: 'addition', confidence: 'low' };
    }
  });

  // Calculate match score
  const matchedCount = sourceMatched.size;
  const modifiedCount = modificationPairs.length;
  const maxWords = Math.max(m, n, 1);
  const matchScore = (matchedCount + modifiedCount * 0.5) / maxWords;

  let confidence: 'high' | 'medium' | 'low';
  if (matchScore >= 0.7) {
    confidence = 'high';
  } else if (matchScore >= 0.4) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { original, translated, matchScore, confidence };
}

function tokenize(text: string): string[] {
  // Split into words, preserving spaces as part of the token for display
  return text
    .split(/(\s+)/)
    .filter((t) => t.length > 0);
}

// ── Color mapping for diff types ──

function getDiffColors(type: DiffType): {
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case 'match':
      return {
        bg: 'bg-emerald-100/60 dark:bg-emerald-900/20',
        text: 'text-emerald-800 dark:text-emerald-200',
        border: 'border-emerald-200/50 dark:border-emerald-800/50',
      };
    case 'removal':
      return {
        bg: 'bg-rose-100/60 dark:bg-rose-900/20',
        text: 'text-rose-800 dark:text-rose-200',
        border: 'border-rose-200/50 dark:border-rose-800/50',
      };
    case 'addition':
      return {
        bg: 'bg-green-100/60 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-200',
        border: 'border-green-200/50 dark:border-green-800/50',
      };
    case 'modification':
      return {
        bg: 'bg-amber-100/60 dark:bg-amber-900/20',
        text: 'text-amber-800 dark:text-amber-200',
        border: 'border-amber-200/50 dark:border-amber-800/50',
      };
  }
}

function getConfidenceIcon(confidence: 'high' | 'medium' | 'low') {
  switch (confidence) {
    case 'high':
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case 'medium':
      return <AlertCircle className="size-3.5 text-amber-500" />;
    case 'low':
      return <HelpCircle className="size-3.5 text-rose-500" />;
  }
}

// ── Legend ──

function DiffLegend() {
  const items = [
    { label: 'Match', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    { label: 'Removed', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
    { label: 'Added', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    { label: 'Modified', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block size-3 rounded ${item.bg} border border-current/10`} />
          <span className={`text-xs ${item.text}`}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Word display component ──

function WordSpan({ diff, showColors }: { diff: WordDiff; showColors: boolean }) {
  const isSpace = diff.word.trim().length === 0;
  if (isSpace) {
    return <span>{diff.word}</span>;
  }

  if (!showColors) {
    return <span>{diff.word}</span>;
  }

  const colors = getDiffColors(diff.type);
  return (
    <span
      className={`inline rounded-sm px-0.5 ${colors.bg} ${colors.text} border ${colors.border} transition-colors`}
    >
      {diff.word}
    </span>
  );
}

// ── Main component ──

export function TranslationDiffView() {
  const [viewMode, setViewMode] = useState<'diff' | 'clean'>('diff');
  const { segments, srcLang, tgtLang } = useTranslationStore();

  const segmentDiffs = useMemo(() => {
    if (segments.length === 0) return [];
    return segments.map((seg) => {
      const srcWords = tokenize(seg.original);
      const tgtWords = tokenize(seg.translated);
      return computeWordDiff(srcWords, tgtWords);
    });
  }, [segments]);

  const overallStats = useMemo(() => {
    if (segmentDiffs.length === 0) return { match: 0, removal: 0, addition: 0, modification: 0, avgScore: 0 };
    let match = 0;
    let removal = 0;
    let addition = 0;
    let modification = 0;
    let totalScore = 0;

    for (const diff of segmentDiffs) {
      for (const w of diff.original) {
        if (w.type === 'match') match++;
        else if (w.type === 'removal') removal++;
        else if (w.type === 'modification') modification++;
      }
      for (const w of diff.translated) {
        if (w.type === 'addition') addition++;
      }
      totalScore += diff.matchScore;
    }

    return {
      match,
      removal,
      addition,
      modification,
      avgScore: totalScore / segmentDiffs.length,
    };
  }, [segmentDiffs]);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'diff' ? 'clean' : 'diff'));
  }, []);

  if (segments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <GitCompareArrows className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No translation results to compare.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Translate some text first to see the diff view.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitCompareArrows className="size-4 text-teal-600" />
              Translation Diff View
              <Badge variant="outline" className="text-xs font-normal">
                {segments.length} segments
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={toggleViewMode}
              >
                {viewMode === 'diff' ? (
                  <>
                    <EyeOff className="size-3" />
                    Clean View
                  </>
                ) : (
                  <>
                    <Eye className="size-3" />
                    Diff View
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Legend + Stats */}
          <AnimatePresence mode="wait">
            {viewMode === 'diff' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <DiffLegend />
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowLeftRight className="size-3" />
                    Avg match: {Math.round(overallStats.avgScore * 100)}%
                  </span>
                  <span>{overallStats.match} matched</span>
                  <span className="text-rose-500">{overallStats.removal} removed</span>
                  <span className="text-green-500">{overallStats.addition} added</span>
                  <span className="text-amber-500">{overallStats.modification} modified</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Segment pairs */}
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3">
              {segmentDiffs.map((segDiff, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden"
                >
                  {/* Segment header */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Match: {Math.round(segDiff.matchScore * 100)}%
                      </span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            {getConfidenceIcon(segDiff.confidence)}
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {segDiff.confidence}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Confidence: {segDiff.confidence} (
                            {Math.round(segDiff.matchScore * 100)}% match)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Side-by-side content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30">
                    {/* Original column */}
                    <div className="p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        {srcLang} (Original)
                      </p>
                      <div className="text-sm leading-relaxed">
                        {segDiff.original.map((w, wi) => (
                          <WordSpan
                            key={wi}
                            diff={w}
                            showColors={viewMode === 'diff'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Translated column */}
                    <div className="p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        {tgtLang} (Translated)
                      </p>
                      <div className="text-sm leading-relaxed">
                        {segDiff.translated.map((w, wi) => (
                          <WordSpan
                            key={wi}
                            diff={w}
                            showColors={viewMode === 'diff'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
