'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Award,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { Progress } from '@/src/components/ui/progress';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/src/components/ui/collapsible';
import { useTranslationStore, type TranslationSegment } from './TranslationStore';

// ============ Quality Scoring Algorithm ============

interface ScoreBreakdown {
  lengthRatio: number;
  scriptConsistency: number;
  punctuationPreservation: number;
  numberPreservation: number;
  coverage: number;
  overall: number;
}

function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function extractPunctuation(text: string): string[] {
  return text.match(/[.,;:!?।\-\–\—\(\)\[\]\"\'\/\\]/g) || [];
}

function extractNumbers(text: string): string[] {
  return text.match(/\d+/g) || [];
}

function scoreLengthRatio(source: string, target: string): number {
  if (!source || !target) return 0;
  const srcLen = source.length;
  const tgtLen = target.length;
  if (srcLen === 0) return 0;
  const ratio = tgtLen / srcLen;

  // Ideal ratios: Devanagari tends to be 1.2-2.0x longer; Latin-to-Latin ~0.8-1.5
  // Score drops as ratio moves away from reasonable range
  if (ratio >= 0.3 && ratio <= 3.0) {
    // Peak score around 1.0-1.8
    if (ratio >= 0.8 && ratio <= 2.2) return 100;
    if (ratio >= 0.5 && ratio <= 2.8) return 70;
    return 40;
  }
  return 15;
}

function scoreScriptConsistency(source: string, target: string, tgtLang: string): number {
  if (!target) return 0;
  const targetHasDevanagari = hasDevanagari(target);
  const expectedDevanagari = tgtLang === 'Nepali' || tgtLang === 'Tamang';
  const expectedLatin = tgtLang === 'English';

  if (expectedDevanagari && targetHasDevanagari) return 100;
  if (expectedDevanagari && !targetHasDevanagari) return 15;
  if (expectedLatin && !targetHasDevanagari) return 100;
  if (expectedLatin && targetHasDevanagari) return 15;
  // Mixed / unknown — partial credit if target has some expected chars
  return 50;
}

function scorePunctuationPreservation(source: string, target: string): number {
  const srcPunct = extractPunctuation(source);
  if (srcPunct.length === 0) return 100; // No punctuation to preserve
  const tgtPunct = extractPunctuation(target);

  // Check how many source punctuation marks appear in target
  const srcPunctSet = new Set(srcPunct);
  const tgtPunctSet = new Set(tgtPunct);
  let preserved = 0;
  for (const p of srcPunctSet) {
    if (tgtPunctSet.has(p)) preserved++;
  }
  return Math.round((preserved / srcPunctSet.size) * 100);
}

function scoreNumberPreservation(source: string, target: string): number {
  const srcNums = extractNumbers(source);
  if (srcNums.length === 0) return 100; // No numbers to preserve
  const tgtNums = extractNumbers(target);

  const srcNumSet = new Set(srcNums);
  const tgtNumSet = new Set(tgtNums);
  let preserved = 0;
  for (const n of srcNumSet) {
    if (tgtNumSet.has(n)) preserved++;
  }
  return Math.round((preserved / srcNumSet.size) * 100);
}

function scoreCoverage(source: string, target: string): number {
  if (!source || !target) return 0;
  // Check if target has substantial content relative to source
  const srcWords = source.split(/\s+/).filter(Boolean);
  const tgtWords = target.split(/\s+/).filter(Boolean);

  if (srcWords.length === 0) return 0;

  // Very short translation relative to source is suspicious
  const wordRatio = tgtWords.length / srcWords.length;
  if (wordRatio >= 0.4 && wordRatio <= 3.0) return 100;
  if (wordRatio >= 0.2 && wordRatio <= 4.0) return 60;
  if (tgtWords.length > 0) return 30;
  return 0;
}

function computeScore(source: string, target: string, srcLang: string, tgtLang: string): ScoreBreakdown {
  const lengthRatio = scoreLengthRatio(source, target);
  const scriptConsistency = scoreScriptConsistency(source, target, tgtLang);
  const punctuationPreservation = scorePunctuationPreservation(source, target);
  const numberPreservation = scoreNumberPreservation(source, target);
  const coverage = scoreCoverage(source, target);

  // Weighted average: script consistency and coverage are most important
  const overall = Math.round(
    lengthRatio * 0.2 +
    scriptConsistency * 0.3 +
    punctuationPreservation * 0.15 +
    numberPreservation * 0.15 +
    coverage * 0.2
  );

  return {
    lengthRatio,
    scriptConsistency,
    punctuationPreservation,
    numberPreservation,
    coverage,
    overall,
  };
}

// ============ Circular Progress Ring ============

function ScoreRing({
  score,
  size = 64,
  strokeWidth = 5,
  label,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 70
      ? 'text-emerald-500'
      : score >= 40
        ? 'text-amber-500'
        : 'text-red-500';

  const strokeColor =
    score >= 70
      ? 'stroke-emerald-500'
      : score >= 40
        ? 'stroke-amber-500'
        : 'stroke-red-500';

  const bgColor =
    score >= 70
      ? 'stroke-emerald-500/15'
      : score >= 40
        ? 'stroke-amber-500/15'
        : 'stroke-red-500/15';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={bgColor}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color}`}>{score}</span>
        </div>
      </div>
      {label && (
        <span className="text-[10px] text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

// ============ Segment Score Card ============

function SegmentScoreCard({
  index,
  segment,
  score,
}: {
  index: number;
  segment: TranslationSegment;
  score: ScoreBreakdown;
}) {
  const tier =
    score.overall >= 70
      ? { label: 'High', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' }
      : score.overall >= 40
        ? { label: 'Medium', icon: HelpCircle, cls: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' }
        : { label: 'Low', icon: AlertTriangle, cls: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/50 border-red-200 dark:border-red-800' };

  const TierIcon = tier.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border bg-card/60 backdrop-blur-sm p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            #{index + 1}
          </span>
          <p className="text-xs truncate text-foreground/80">
            {segment.original.slice(0, 60)}
            {segment.original.length > 60 ? '...' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${tier.cls}`}>
            <TierIcon className="size-3 mr-0.5" />
            {tier.label}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <ScoreRing score={score.overall} size={36} strokeWidth={3} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[260px] p-3">
                <p className="text-xs font-semibold mb-2">Score Breakdown</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <span>Length Ratio</span>
                    <span className="font-mono">{score.lengthRatio}/100</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Script Consistency</span>
                    <span className="font-mono">{score.scriptConsistency}/100</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Punctuation</span>
                    <span className="font-mono">{score.punctuationPreservation}/100</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Number Preservation</span>
                    <span className="font-mono">{score.numberPreservation}/100</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Coverage</span>
                    <span className="font-mono">{score.coverage}/100</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress
          value={score.overall}
          className="h-1.5 flex-1"
        />
      </div>
    </motion.div>
  );
}

// ============ Distribution Bar Chart ============

function DistributionChart({ segments }: { segments: { score: number }[] }) {
  const tiers = useMemo(() => {
    const high = segments.filter((s) => s.score >= 70).length;
    const medium = segments.filter((s) => s.score >= 40 && s.score < 70).length;
    const low = segments.filter((s) => s.score < 40).length;
    const max = Math.max(high, medium, low, 1);
    return [
      { label: 'High (≥70)', count: high, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Medium (40-69)', count: medium, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
      { label: 'Low (<40)', count: low, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
    ].map((t) => ({ ...t, pct: Math.round((t.count / max) * 100) }));
  }, [segments]);

  return (
    <div className="space-y-2">
      {tiers.map((tier) => (
        <div key={tier.label} className="flex items-center gap-3">
          <span className="text-[10px] w-24 text-right text-muted-foreground shrink-0">
            {tier.label}
          </span>
          <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tier.pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded ${tier.color} opacity-80`}
            />
          </div>
          <span className={`text-xs font-mono w-6 ${tier.textColor}`}>
            {tier.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============ Main Component ============

export function TranslationQualityScore() {
  const { segments, srcLang, tgtLang } = useTranslationStore();
  const [reportOpen, setReportOpen] = useState(false);

  const scoredSegments = useMemo(() => {
    return segments.map((seg) => ({
      segment: seg,
      score: computeScore(seg.original, seg.translated, srcLang, tgtLang),
    }));
  }, [segments, srcLang, tgtLang]);

  const overallScore = useMemo(() => {
    if (scoredSegments.length === 0) return 0;
    const total = scoredSegments.reduce((sum, s) => sum + s.score.overall, 0);
    return Math.round(total / scoredSegments.length);
  }, [scoredSegments]);

  const worstSegments = useMemo(() => {
    return [...scoredSegments]
      .sort((a, b) => a.score.overall - b.score.overall)
      .slice(0, 3);
  }, [scoredSegments]);

  if (segments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No translation results yet.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Translate some text to see quality scores.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overallColor =
    overallScore >= 70
      ? 'from-emerald-500 to-emerald-600'
      : overallScore >= 40
        ? 'from-amber-500 to-amber-600'
        : 'from-red-500 to-red-600';

  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <Card className="bg-card/60 backdrop-blur-md border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="size-4 text-emerald-600" />
            Translation Quality Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <ScoreRing score={overallScore} size={80} strokeWidth={6} label="Overall" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {overallScore >= 70
                    ? 'Good Quality'
                    : overallScore >= 40
                      ? 'Moderate Quality'
                      : 'Low Quality'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {scoredSegments.length} segment{scoredSegments.length !== 1 ? 's' : ''} analyzed • {srcLang} → {tgtLang}
                </p>
              </div>
              <DistributionChart
                segments={scoredSegments.map((s) => ({ score: s.score.overall }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worst Segments Highlight */}
      {worstSegments.length > 0 && worstSegments[0].score.overall < 70 && (
        <Card className="border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-amber-500" />
              Segments Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {worstSegments.map((ws, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-background/50 p-2"
              >
                <Badge
                  variant="outline"
                  className="text-[10px] shrink-0 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                >
                  {ws.score.overall}
                </Badge>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {ws.segment.original.slice(0, 100)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Quality Report */}
      <Collapsible open={reportOpen} onOpenChange={setReportOpen}>
        <Card className="bg-card/60 backdrop-blur-md border-border/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-teal-600" />
                  Quality Report — All Segments
                </span>
                {reportOpen ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-2 pr-3">
                  {scoredSegments.map((ss, i) => (
                    <SegmentScoreCard
                      key={i}
                      index={i}
                      segment={ss.segment}
                      score={ss.score}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Methodology note */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-3">
        <Info className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Quality scores are heuristic-based estimates, not absolute measures.
          They consider length ratio, script consistency, punctuation/number preservation,
          and coverage. Scores may not reflect actual translation accuracy.
        </p>
      </div>
    </div>
  );
}
