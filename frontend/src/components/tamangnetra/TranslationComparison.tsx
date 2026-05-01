'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompare,
  History,
  Info,
  FileText,
  Type,
  Hash,
  TrendingUp,
  Languages,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { useTranslationHistory, type HistoryEntry } from './TranslationHistory';

// ── Helpers ──

function getLangCode(lang: string): string {
  switch (lang.toLowerCase()) {
    case 'english':
      return 'EN';
    case 'nepali':
      return 'NE';
    case 'tamang':
      return 'TM';
    default:
      return lang.slice(0, 2).toUpperCase();
  }
}

function getLangEmoji(lang: string): string {
  switch (lang.toLowerCase()) {
    case 'english':
      return '🇬🇧';
    case 'nepali':
      return '🇳🇵';
    case 'tamang':
      return '🏔️';
    default:
      return '🌐';
  }
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// ── Word-Level Diff Algorithm ──
// Returns indices of words in each array that are part of the LCS (shared).

type WordTag = 'shared' | 'unique';

interface TaggedWord {
  text: string;
  tag: WordTag;
}

function computeTaggedWords(leftText: string, rightText: string): {
  leftTagged: TaggedWord[];
  rightTagged: TaggedWord[];
} {
  const leftWords = leftText.trim().split(/\s+/).filter(Boolean);
  const rightWords = rightText.trim().split(/\s+/).filter(Boolean);

  if (leftWords.length === 0 && rightWords.length === 0) {
    return { leftTagged: [], rightTagged: [] };
  }
  if (leftWords.length === 0) {
    return {
      leftTagged: [],
      rightTagged: rightWords.map((t) => ({ text: t, tag: 'unique' as const })),
    };
  }
  if (rightWords.length === 0) {
    return {
      leftTagged: leftWords.map((t) => ({ text: t, tag: 'unique' as const })),
      rightTagged: [],
    };
  }

  // Build LCS table
  const m = leftWords.length;
  const n = rightWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftWords[i - 1].toLowerCase() === rightWords[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find which indices are in the LCS
  const leftInLcs = new Set<number>();
  const rightInLcs = new Set<number>();
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (leftWords[i - 1].toLowerCase() === rightWords[j - 1].toLowerCase()) {
      leftInLcs.add(i - 1);
      rightInLcs.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const leftTagged: TaggedWord[] = leftWords.map((text, idx) => ({
    text,
    tag: leftInLcs.has(idx) ? 'shared' : 'unique',
  }));

  const rightTagged: TaggedWord[] = rightWords.map((text, idx) => ({
    text,
    tag: rightInLcs.has(idx) ? 'shared' : 'unique',
  }));

  return { leftTagged, rightTagged };
}

function computeSimilarity(leftText: string, rightText: string): number {
  const leftWords = new Set(leftText.trim().toLowerCase().split(/\s+/).filter(Boolean));
  const rightWords = new Set(rightText.trim().toLowerCase().split(/\s+/).filter(Boolean));

  if (leftWords.size === 0 && rightWords.size === 0) return 100;
  if (leftWords.size === 0 || rightWords.size === 0) return 0;

  const allWords = new Set([...leftWords, ...rightWords]);
  const shared = new Set([...leftWords].filter((w) => rightWords.has(w)));

  return Math.round((shared.size / allWords.size) * 100);
}

// ── Tagged Word Renderer ──

function TaggedWordSpan({
  word,
  side,
}: {
  word: TaggedWord;
  side: 'left' | 'right';
}) {
  let className = 'px-1 py-0.5 rounded-sm text-sm leading-relaxed transition-colors ';

  if (word.tag === 'shared') {
    className += 'bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300';
  } else if (side === 'left') {
    // Unique to left → green
    className += 'bg-green-100/60 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium';
  } else {
    // Unique to right → amber
    className += 'bg-amber-100/60 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium';
  }

  return <span className={className}>{word.text}</span>;
}

// ── Main Component ──

export function TranslationComparison() {
  const { history } = useTranslationHistory();
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  const leftEntry = useMemo(
    () => history.find((e) => String(e.id) === leftId) ?? null,
    [history, leftId]
  );
  const rightEntry = useMemo(
    () => history.find((e) => String(e.id) === rightId) ?? null,
    [history, rightId]
  );

  const taggedResult = useMemo(() => {
    if (!leftEntry || !rightEntry) return null;
    return computeTaggedWords(leftEntry.translatedText, rightEntry.translatedText);
  }, [leftEntry, rightEntry]);

  const similarity = useMemo(() => {
    if (!leftEntry || !rightEntry) return 0;
    return computeSimilarity(leftEntry.translatedText, rightEntry.translatedText);
  }, [leftEntry, rightEntry]);

  // Stats
  const leftChars = leftEntry?.translatedText.length ?? 0;
  const rightChars = rightEntry?.translatedText.length ?? 0;
  const leftWords = countWords(leftEntry?.translatedText ?? '');
  const rightWords = countWords(rightEntry?.translatedText ?? '');

  // Diff counts
  const sharedCount = taggedResult?.leftTagged.filter((w) => w.tag === 'shared').length ?? 0;
  const leftOnlyCount = taggedResult?.leftTagged.filter((w) => w.tag === 'unique').length ?? 0;
  const rightOnlyCount = taggedResult?.rightTagged.filter((w) => w.tag === 'unique').length ?? 0;

  const sameRun = leftId && rightId && leftId === rightId;

  // ── Select Option Label ──

  function renderSelectOption(entry: HistoryEntry) {
    const langCode = `${getLangCode(entry.srcLang)}→${getLangCode(entry.tgtLang)}`;
    const preview = truncateText(entry.originalText, 30);
    const time = formatTimestamp(entry.timestamp);
    return `${time} · ${langCode} · ${preview}`;
  }

  // ── Similarity color ──

  function getSimilarityColor(pct: number): string {
    if (pct >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  }

  function getSimilarityBg(pct: number): string {
    if (pct >= 70) return 'bg-emerald-500';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  }

  // ── Empty States ──

  if (history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/30 mb-4">
              <History className="size-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              No Translation History
            </h3>
            <p className="text-xs text-muted-foreground/70 max-w-[260px]">
              Translate something first to build your history, then come back to compare runs.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (history.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-100/50 dark:bg-amber-900/20 mb-4">
              <GitCompare className="size-8 text-amber-500/70" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Need More Translations
            </h3>
            <p className="text-xs text-muted-foreground/70 max-w-[260px]">
              At least two translation runs are needed to compare. You currently have only one.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ── Render ──

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Header + Selectors */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
              <GitCompare className="size-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Translation Comparison</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compare two translation runs side by side
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Selector Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold">
                  A
                </span>
                First Translation
              </label>
              <Select value={leftId} onValueChange={setLeftId}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Select a translation run…" />
                </SelectTrigger>
                <SelectContent>
                  {history.map((entry) => (
                    <SelectItem key={entry.id} value={String(entry.id)} className="text-xs">
                      {renderSelectOption(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                  B
                </span>
                Second Translation
              </label>
              <Select value={rightId} onValueChange={setRightId}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Select a translation run…" />
                </SelectTrigger>
                <SelectContent>
                  {history.map((entry) => (
                    <SelectItem key={entry.id} value={String(entry.id)} className="text-xs">
                      {renderSelectOption(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Same run warning */}
          <AnimatePresence>
            {sameRun && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                  <Info className="size-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    You selected the same translation run in both dropdowns. Choose two different runs to see a comparison.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          {taggedResult && !sameRun && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-3 text-xs"
            >
              <span className="text-muted-foreground font-medium">Legend:</span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded-sm bg-emerald-200/80 dark:bg-emerald-800/50" />
                Shared words
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded-sm bg-green-200/80 dark:bg-green-800/50" />
                Only in A
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded-sm bg-amber-200/80 dark:bg-amber-800/50" />
                Only in B
              </span>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Comparison View */}
      {leftEntry && rightEntry && !sameRun && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          {/* Original Text (shared) */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-md">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="size-4 text-teal-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Original Text
                </span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {leftEntry.originalText}
              </p>
            </CardContent>
          </Card>

          {/* Side-by-side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Translation (A) */}
            <Card className="border-green-200/50 dark:border-green-800/30 bg-card/80 backdrop-blur-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                      A
                    </span>
                    <CardTitle className="text-sm">Translation A</CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 border-green-500/20 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                  >
                    {getLangEmoji(leftEntry.srcLang)} {getLangCode(leftEntry.srcLang)}→{getLangCode(leftEntry.tgtLang)} {getLangEmoji(leftEntry.tgtLang)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  {formatTimestamp(leftEntry.timestamp)} · {leftEntry.segmentCount} segment{leftEntry.segmentCount !== 1 ? 's' : ''}
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <div className="text-sm leading-relaxed">
                    {taggedResult?.leftTagged.map((word, idx) => (
                      <TaggedWordSpan key={idx} word={word} side="left" />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Translation (B) */}
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-card/80 backdrop-blur-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                      B
                    </span>
                    <CardTitle className="text-sm">Translation B</CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                  >
                    {getLangEmoji(rightEntry.srcLang)} {getLangCode(rightEntry.srcLang)}→{getLangCode(rightEntry.tgtLang)} {getLangEmoji(rightEntry.tgtLang)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  {formatTimestamp(rightEntry.timestamp)} · {rightEntry.segmentCount} segment{rightEntry.segmentCount !== 1 ? 's' : ''}
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <div className="text-sm leading-relaxed">
                    {taggedResult?.rightTagged.map((word, idx) => (
                      <TaggedWordSpan key={idx} word={word} side="right" />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-md">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-teal-500" />
                  <CardTitle className="text-sm">Statistics Comparison</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Character Count */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Type className="size-3" />
                      Characters
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs px-2 border-green-500/20 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                      >
                        A: {leftChars}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs px-2 border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                      >
                        B: {rightChars}
                      </Badge>
                    </div>
                  </div>

                  {/* Word Count */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Hash className="size-3" />
                      Words
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs px-2 border-green-500/20 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                      >
                        A: {leftWords}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs px-2 border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                      >
                        B: {rightWords}
                      </Badge>
                    </div>
                  </div>

                  {/* Similarity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="size-3" />
                      Similarity
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[120px] h-2 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${similarity}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full ${getSimilarityBg(similarity)}`}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${getSimilarityColor(similarity)}`}>
                        {similarity}%
                      </span>
                    </div>
                  </div>

                  {/* Direction Badges */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Languages className="size-3" />
                      Direction
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 w-fit border-green-500/20 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                      >
                        A: {getLangCode(leftEntry.srcLang)}→{getLangCode(leftEntry.tgtLang)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 w-fit border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                      >
                        B: {getLangCode(rightEntry.srcLang)}→{getLangCode(rightEntry.tgtLang)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Diff Summary */}
                {taggedResult && (leftOnlyCount > 0 || rightOnlyCount > 0 || sharedCount > 0) && (
                  <div className="mt-4 pt-3 border-t border-border/30">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-muted-foreground font-medium">Word Diff:</span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block size-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-800/60" />
                        <span className="text-muted-foreground">{sharedCount} shared</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block size-2.5 rounded-sm bg-green-200 dark:bg-green-800/60" />
                        <span className="text-muted-foreground">{leftOnlyCount} only in A</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block size-2.5 rounded-sm bg-amber-200 dark:bg-amber-800/60" />
                        <span className="text-muted-foreground">{rightOnlyCount} only in B</span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
