'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { useTranslationStore } from './TranslationStore';
import { useToast } from '@/src/hooks/use-toast';

/* ── Simulated confidence calculation ── */
function simulateConfidence(word: string, _index: number): number {
  const len = word.length;

  // Numbers and punctuation: very high
  if (/^[\d,.\-+%]+$/.test(word)) return 0.95 + Math.random() * 0.05;
  // Very short common words (articles, prepositions): high
  if (len <= 2) return 0.88 + Math.random() * 0.10;
  // Short words: generally high
  if (len <= 4) return 0.80 + Math.random() * 0.15;
  // Medium words: moderate to high
  if (len <= 6) return 0.65 + Math.random() * 0.20;
  // Longer words: moderate
  if (len <= 8) return 0.55 + Math.random() * 0.25;
  // Technical/long terms: lower
  return 0.40 + Math.random() * 0.30;
}

interface WordConfidence {
  word: string;
  confidence: number;
}

/* ── Confidence color helpers ── */
function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence > 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

function getWordBgColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return 'bg-emerald-100 dark:bg-emerald-900/30';
    case 'medium':
      return 'bg-amber-100 dark:bg-amber-900/30';
    case 'low':
      return 'bg-rose-100 dark:bg-rose-900/30';
  }
}

function getWordBorderColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return 'border-emerald-300 dark:border-emerald-700';
    case 'medium':
      return 'border-amber-300 dark:border-amber-700';
    case 'low':
      return 'border-rose-300 dark:border-rose-700';
  }
}

function getWordTextColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return 'text-emerald-800 dark:text-emerald-300';
    case 'medium':
      return 'text-amber-800 dark:text-amber-300';
    case 'low':
      return 'text-rose-800 dark:text-rose-300';
  }
}

/* ── Mini Bar Chart for confidence distribution ── */
function ConfidenceBarChart({
  high,
  medium,
  low,
}: {
  high: number;
  medium: number;
  low: number;
}) {
  const total = high + medium + low;
  const highPct = total > 0 ? (high / total) * 100 : 0;
  const medPct = total > 0 ? (medium / total) * 100 : 0;
  const lowPct = total > 0 ? (low / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-10">High</span>
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${highPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{high}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-10">Med</span>
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-amber-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${medPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{medium}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-10">Low</span>
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-rose-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${lowPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{low}</span>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function ConfidenceHeatmap() {
  const store = useTranslationStore();
  const { toast } = useToast();
  const [copiedAll, setCopiedAll] = useState(false);
  const [hoveredWordIdx, setHoveredWordIdx] = useState<string | null>(null);

  const segments = store.segments;
  const tgtLang = store.tgtLang;
  const srcLang = store.srcLang;

  // Compute per-word confidence for translated text
  const segmentConfidences = useMemo(() => {
    return segments.map((seg, segIdx) => {
      const words = seg.translated.trim().split(/\s+/).filter(Boolean);
      const wordConfs: WordConfidence[] = words.map((word, wi) => ({
        word,
        confidence: simulateConfidence(word, wi + segIdx * 100),
      }));
      return { segmentIndex: segIdx, wordConfs, originalText: seg.original };
    });
  }, [segments]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalWords = 0;
    let totalConfidence = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    segmentConfidences.forEach((sc) => {
      sc.wordConfs.forEach((wc) => {
        totalWords++;
        totalConfidence += wc.confidence;
        const level = getConfidenceLevel(wc.confidence);
        if (level === 'high') highCount++;
        else if (level === 'medium') mediumCount++;
        else lowCount++;
      });
    });

    return {
      totalWords,
      overallConfidence: totalWords > 0 ? totalConfidence / totalWords : 0,
      highCount,
      mediumCount,
      lowCount,
    };
  }, [segmentConfidences]);

  const handleCopyAll = useCallback(async () => {
    const text = segmentConfidences.map((sc) => {
      const line = sc.wordConfs
        .map((wc) => `${wc.word}(${Math.round(wc.confidence * 100)}%)`)
        .join(' ');
      return `[Segment ${sc.segmentIndex + 1}] ${line}`;
    }).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast({ title: 'Copied', description: 'Confidence heatmap data copied.' });
  }, [segmentConfidences, toast]);

  if (segments.length === 0) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center gap-4"
          >
            <div className="relative">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
                <Thermometer className="size-8 text-amber-500/60" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 size-3 rounded-full bg-rose-400"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No Confidence Data</p>
              <p className="text-xs text-muted-foreground mt-1">
                Translate text to see confidence heatmap visualization
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  const overallPct = Math.round(stats.overallConfidence * 100);
  const overallLevel = getConfidenceLevel(stats.overallConfidence);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden">
        {/* Gradient header accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />

        <CardHeader className="pb-3 p-4 sm:p-6 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Thermometer className="size-4 text-amber-600" />
              Confidence Heatmap
              <Badge variant="outline" className="text-xs font-normal border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
                {stats.totalWords} words
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Overall confidence */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${
                overallLevel === 'high' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400' :
                overallLevel === 'medium' ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400' :
                'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/30 dark:border-rose-700 dark:text-rose-400'
              }`}>
                <TrendingUp className="size-3" />
                Overall: {overallPct}% confidence
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleCopyAll}
              >
                {copiedAll ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copiedAll ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {/* Stats section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Overall confidence ring */}
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
              <div className="relative">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="currentColor"
                    className="text-muted/30"
                    strokeWidth="4"
                  />
                  <motion.circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke={
                      overallLevel === 'high' ? '#10b981' :
                      overallLevel === 'medium' ? '#f59e0b' : '#f43f5e'
                    }
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - stats.overallConfidence)}
                    transform="rotate(-90 32 32)"
                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - stats.overallConfidence) }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                  {overallPct}%
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Translation Confidence</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on {stats.totalWords} words across {segments.length} segments
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="flex items-center gap-1 text-[10px]">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    {stats.highCount}
                  </span>
                  <span className="flex items-center gap-1 text-[10px]">
                    <span className="size-2 rounded-full bg-amber-500" />
                    {stats.mediumCount}
                  </span>
                  <span className="flex items-center gap-1 text-[10px]">
                    <span className="size-2 rounded-full bg-rose-500" />
                    {stats.lowCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Distribution bar chart */}
            <div className="p-4 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="size-3.5 text-amber-600" />
                <p className="text-xs font-semibold text-foreground">Confidence Distribution</p>
              </div>
              <ConfidenceBarChart
                high={stats.highCount}
                medium={stats.mediumCount}
                low={stats.lowCount}
              />
            </div>
          </div>

          {/* Heatmap sections */}
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-6">
              {segmentConfidences.map((segConf, segIdx) => (
                <motion.div
                  key={segIdx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: segIdx * 0.05 }}
                >
                  {/* Segment header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`shrink-0 flex size-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${segIdx % 3 === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : segIdx % 3 === 1 ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>
                      {segIdx + 1}
                    </span>
                    <p className="text-[10px] text-muted-foreground truncate max-w-xs">
                      {segConf.originalText.slice(0, 60)}{segConf.originalText.length > 60 ? '...' : ''}
                    </p>
                    <div className="h-px flex-1 bg-border/50" />
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        getConfidenceLevel(
                          segConf.wordConfs.reduce((a, c) => a + c.confidence, 0) / segConf.wordConfs.length
                        ) === 'high' ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400' :
                        getConfidenceLevel(
                          segConf.wordConfs.reduce((a, c) => a + c.confidence, 0) / segConf.wordConfs.length
                        ) === 'medium' ? 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400' :
                        'border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {Math.round(
                        (segConf.wordConfs.reduce((a, c) => a + c.confidence, 0) / segConf.wordConfs.length) * 100
                      )}%
                    </Badge>
                  </div>

                  {/* Word heatmap */}
                  <div className="flex flex-wrap gap-1.5">
                    {segConf.wordConfs.map((wc, wi) => {
                      const wordKey = `${segIdx}-${wi}`;
                      const isHovered = hoveredWordIdx === wordKey;
                      const pct = Math.round(wc.confidence * 100);

                      return (
                        <TooltipProvider key={wi}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: wi * 0.02 + segIdx * 0.05 }}
                                onMouseEnter={() => setHoveredWordIdx(wordKey)}
                                onMouseLeave={() => setHoveredWordIdx(null)}
                                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 cursor-default
                                  ${getWordBgColor(wc.confidence)}
                                  ${getWordBorderColor(wc.confidence)}
                                  ${getWordTextColor(wc.confidence)}
                                  ${isHovered ? 'scale-110 shadow-md ring-2 ring-offset-1' : 'hover:scale-105'}
                                  ${isHovered ? (getConfidenceLevel(wc.confidence) === 'high' ? 'ring-emerald-400' : getConfidenceLevel(wc.confidence) === 'medium' ? 'ring-amber-400' : 'ring-rose-400') : ''}
                                `}
                              >
                                {wc.word}
                              </motion.span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">&quot;{wc.word}&quot;</p>
                                <p className={`${getWordTextColor(wc.confidence)}`}>
                                  Confidence: {pct}%
                                </p>
                                <p className="text-muted-foreground">
                                  {getConfidenceLevel(wc.confidence) === 'high' ? '✅ High confidence' :
                                   getConfidenceLevel(wc.confidence) === 'medium' ? '⚠️ Medium confidence' :
                                   '❌ Low confidence'}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          {/* Legend at bottom */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="size-3 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700" />
              High (&gt;80%)
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="size-3 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700" />
              Medium (50-80%)
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="size-3 rounded bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700" />
              Low (&lt;50%)
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
