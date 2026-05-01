'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  Type,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useTranslationStore } from './TranslationStore';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BenchmarkEntry {
  timestamp: number;
  totalTime: number; // ms
  segmentCount: number;
  charCount: number;
  wordCount: number;
  charsPerSecond: number;
  wordsPerMinute: number;
  srcLang: string;
  tgtLang: string;
}

// ─── localStorage helpers ───────────────────────────────────────────────────

const STORAGE_KEY = 'tamangnetra-benchmarks';
const MAX_HISTORY = 50;

function loadBenchmarks(): BenchmarkEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [];
}

function saveBenchmarks(entries: BenchmarkEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_HISTORY)));
}

// ─── Animated Number Counter ────────────────────────────────────────────────

function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
  className = '',
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(() => value);
  const prevValue = useRef(value);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    prevValue.current = value;
    if (Math.abs(diff) < 0.01) {
      return;
    }
    const duration = 600;
    const startTime = Date.now();

    let rafId: number;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayed(start + diff * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <span className={className}>
      {displayed.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// ─── SVG Arc Gauge ──────────────────────────────────────────────────────────

function SpeedGauge({ speed, maxSpeed = 10 }: { speed: number; maxSpeed?: number }) {
  const percentage = Math.min(speed / maxSpeed, 1);
  const angle = percentage * 180; // 0 to 180 degrees

  // Arc parameters
  const cx = 120;
  const cy = 110;
  const radius = 90;
  const startAngle = Math.PI;
  const endAngle = 0;

  // Create arc path
  const polarToCartesian = (angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const startPoint = polarToCartesian(startAngle);
  const endPoint = polarToCartesian(endAngle);

  // Needle endpoint
  const needleAngle = Math.PI - percentage * Math.PI;
  const needleLength = radius - 15;
  const needleEnd = {
    x: cx + needleLength * Math.cos(needleAngle),
    y: cy + needleLength * Math.sin(needleAngle),
  };

  // Color based on speed
  const getColor = () => {
    if (speed < 2) return { main: '#10b981', glow: '#10b98140', label: 'Fast' };
    if (speed < 5) return { main: '#f59e0b', glow: '#f59e0b40', label: 'Medium' };
    return { main: '#f43f5e', glow: '#f43f5e40', label: 'Slow' };
  };

  const color = getColor();

  // Tick marks
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const tickAngle = Math.PI - (i / 10) * Math.PI;
    const innerR = radius - 8;
    const outerR = radius - 2;
    ticks.push({
      x1: cx + innerR * Math.cos(tickAngle),
      y1: cy + innerR * Math.sin(tickAngle),
      x2: cx + outerR * Math.cos(tickAngle),
      y2: cy + outerR * Math.sin(tickAngle),
      label: (i * (maxSpeed / 10)).toFixed(0),
      labelX: cx + (radius + 14) * Math.cos(tickAngle),
      labelY: cy + (radius + 14) * Math.sin(tickAngle),
    });
  }

  return (
    <svg viewBox="0 0 240 140" className="w-full max-w-[280px] mx-auto">
      {/* Background arc */}
      <path
        d={`M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-muted-foreground/15"
        strokeLinecap="round"
      />

      {/* Colored progress arc */}
      <motion.path
        d={`M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y}`}
        fill="none"
        stroke={color.main}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${percentage * Math.PI * radius} ${Math.PI * radius}`}
        initial={{ strokeDasharray: `0 ${Math.PI * radius}` }}
        animate={{ strokeDasharray: `${percentage * Math.PI * radius} ${Math.PI * radius}` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      {/* Glow effect on arc */}
      <motion.path
        d={`M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y}`}
        fill="none"
        stroke={color.main}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${percentage * Math.PI * radius} ${Math.PI * radius}`}
        opacity="0.3"
        filter="blur(4px)"
        initial={{ strokeDasharray: `0 ${Math.PI * radius}` }}
        animate={{ strokeDasharray: `${percentage * Math.PI * radius} ${Math.PI * radius}` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      {/* Tick marks */}
      {ticks.map((tick, i) => (
        <g key={i}>
          <line
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="currentColor"
            strokeWidth={i % 5 === 0 ? 2 : 1}
            className="text-muted-foreground/30"
          />
          {i % 5 === 0 && (
            <text
              x={tick.labelX}
              y={tick.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              className="fill-muted-foreground"
            >
              {tick.label}s
            </text>
          )}
        </g>
      ))}

      {/* Needle */}
      <motion.g
        initial={{ rotate: -90 }}
        animate={{ rotate: -90 + angle }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={color.main}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Needle glow */}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={color.main}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.3"
          filter="blur(2px)"
        />
      </motion.g>

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="6" fill={color.main} />
      <circle cx={cx} cy={cy} r="3" fill="white" className="dark:fill-background" />

      {/* Speed value */}
      <text
        x={cx}
        y={cy + 30}
        textAnchor="middle"
        fontSize="20"
        fontWeight="bold"
        fill={color.main}
      >
        {speed.toFixed(1)}s
      </text>

      {/* Rating label */}
      <text
        x={cx}
        y={cy + 44}
        textAnchor="middle"
        fontSize="10"
        className="fill-muted-foreground"
      >
        {color.label}
      </text>
    </svg>
  );
}

// ─── Speed History Bar Chart ────────────────────────────────────────────────

function SpeedHistoryChart({ history }: { history: BenchmarkEntry[] }) {
  const last5 = history.slice(-5);
  if (last5.length === 0) return null;

  const maxTime = Math.max(...last5.map((h) => h.totalTime / 1000), 1);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Speed History (last {last5.length})
      </p>
      <div className="flex items-end gap-2 h-32">
        {last5.map((entry, i) => {
          const timeS = entry.totalTime / 1000;
          const heightPct = (timeS / maxTime) * 100;
          const color =
            timeS < 2
              ? 'from-emerald-400 to-emerald-600'
              : timeS < 5
                ? 'from-amber-400 to-amber-600'
                : 'from-rose-400 to-rose-600';

          return (
            <motion.div
              key={i}
              className="flex-1 flex flex-col items-center gap-1"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <span className="text-[10px] font-medium text-muted-foreground">
                {timeS.toFixed(1)}s
              </span>
              <motion.div
                className={`w-full rounded-t-md bg-gradient-to-t ${color} min-h-[4px]`}
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.5, ease: 'easeOut' }}
                style={{ maxHeight: '100%' }}
              />
              <span className="text-[9px] text-muted-foreground">
                #{history.length - last5.length + i + 1}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Speed Rating Badge ─────────────────────────────────────────────────────

function SpeedRatingBadge({ timeS }: { timeS: number }) {
  if (timeS < 2) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800 text-xs">
        <Zap className="size-3 mr-1" />
        Fast
      </Badge>
    );
  }
  if (timeS < 5) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-800 text-xs">
        <Clock className="size-3 mr-1" />
        Medium
      </Badge>
    );
  }
  return (
    <Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/50 dark:text-rose-400 dark:border-rose-800 text-xs">
      <Gauge className="size-3 mr-1" />
      Slow
    </Badge>
  );
}

// ─── Comparison Indicator ───────────────────────────────────────────────────

function ComparisonIndicator({
  current,
  average,
}: {
  current: number;
  average: number;
}) {
  if (average === 0) return null;

  const diff = current - average;
  const pctDiff = ((diff / average) * 100).toFixed(0);

  if (Math.abs(diff) < 0.1) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" />
        Same as average
      </div>
    );
  }

  if (diff < 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <TrendingDown className="size-3" />
        {pctDiff}% faster than avg
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
      <TrendingUp className="size-3" />
      {pctDiff}% slower than avg
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TranslationBenchmark() {
  const {
    segments,
    originalText,
    translatedText,
    srcLang,
    tgtLang,
    isTranslating,
  } = useTranslationStore();

  const [benchmarks, setBenchmarks] = useState<BenchmarkEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadBenchmarks();
  });
  const [currentBenchmark, setCurrentBenchmark] = useState<BenchmarkEntry | null>(null);
  const translateStartRef = useRef<number | null>(null);

  // Track when translation starts
  useEffect(() => {
    if (isTranslating) {
      translateStartRef.current = Date.now();
    }
  }, [isTranslating]);

  // Track when translation completes
  useEffect(() => {
    if (!isTranslating && translateStartRef.current && segments.length > 0) {
      const totalTime = Date.now() - translateStartRef.current;
      const charCount = originalText.length;
      const wordCount = originalText.split(/\s+/).filter(Boolean).length;
      const timeInSeconds = totalTime / 1000;

      const entry: BenchmarkEntry = {
        timestamp: Date.now(),
        totalTime,
        segmentCount: segments.length,
        charCount,
        wordCount,
        charsPerSecond: timeInSeconds > 0 ? charCount / timeInSeconds : 0,
        wordsPerMinute: timeInSeconds > 0 ? (wordCount / timeInSeconds) * 60 : 0,
        srcLang,
        tgtLang,
      };

      setCurrentBenchmark(entry);
      const updated = [...benchmarks, entry];
      setBenchmarks(updated);
      saveBenchmarks(updated);
      translateStartRef.current = null;
    }
  }, [isTranslating, segments.length, originalText, srcLang, tgtLang, benchmarks]);

  const averageSpeed = useMemo(() => {
    if (benchmarks.length === 0) return 0;
    return benchmarks.reduce((sum, b) => sum + b.totalTime / 1000, 0) / benchmarks.length;
  }, [benchmarks]);

  const averageCharsPerSecond = useMemo(() => {
    if (benchmarks.length === 0) return 0;
    return benchmarks.reduce((sum, b) => sum + b.charsPerSecond, 0) / benchmarks.length;
  }, [benchmarks]);

  const averageWordsPerMinute = useMemo(() => {
    if (benchmarks.length === 0) return 0;
    return benchmarks.reduce((sum, b) => sum + b.wordsPerMinute, 0) / benchmarks.length;
  }, [benchmarks]);

  const handleClear = useCallback(() => {
    setBenchmarks([]);
    setCurrentBenchmark(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const currentSpeed = currentBenchmark ? currentBenchmark.totalTime / 1000 : 0;

  // Empty state
  if (!currentBenchmark && benchmarks.length === 0) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-emerald-600" />
            Translation Benchmark
          </CardTitle>
          <CardDescription>
            Track and measure translation performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <motion.div
              className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="size-7 text-emerald-500" />
            </motion.div>
            <p className="text-sm text-muted-foreground">
              No benchmark data yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Translate some text to see speed metrics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit overflow-hidden">
      {/* Gradient top accent */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4 text-emerald-600" />
              Translation Benchmark
            </CardTitle>
            <CardDescription>
              Performance metrics for your translations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {benchmarks.length} runs
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-red-500"
              onClick={handleClear}
              title="Clear benchmark history"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Speed Gauge */}
        {currentBenchmark && (
          <div className="rounded-xl border bg-gradient-to-b from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 p-4">
            <SpeedGauge speed={currentSpeed} />
            <div className="flex items-center justify-center gap-2 mt-2">
              <SpeedRatingBadge timeS={currentSpeed} />
              {averageSpeed > 0 && (
                <ComparisonIndicator
                  current={currentSpeed}
                  average={averageSpeed}
                />
              )}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {currentBenchmark && (
          <div className="grid grid-cols-2 gap-3">
            {/* Total Time */}
            <div className="rounded-lg border bg-background/50 dark:bg-background/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" />
                Total Time
              </div>
              <AnimatedNumber
                value={currentBenchmark.totalTime / 1000}
                decimals={2}
                suffix="s"
                className="text-lg font-bold text-foreground"
              />
            </div>

            {/* Time per Segment */}
            <div className="rounded-lg border bg-background/50 dark:bg-background/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Gauge className="size-3" />
                Per Segment
              </div>
              <AnimatedNumber
                value={
                  currentBenchmark.segmentCount > 0
                    ? currentBenchmark.totalTime / 1000 / currentBenchmark.segmentCount
                    : 0
                }
                decimals={2}
                suffix="s"
                className="text-lg font-bold text-foreground"
              />
            </div>

            {/* Characters per Second */}
            <div className="rounded-lg border bg-background/50 dark:bg-background/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Type className="size-3" />
                Chars/sec
              </div>
              <AnimatedNumber
                value={currentBenchmark.charsPerSecond}
                decimals={1}
                className="text-lg font-bold text-emerald-600 dark:text-emerald-400"
              />
              {averageCharsPerSecond > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  avg: {averageCharsPerSecond.toFixed(1)}
                </div>
              )}
            </div>

            {/* Words per Minute */}
            <div className="rounded-lg border bg-background/50 dark:bg-background/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="size-3" />
                Words/min
              </div>
              <AnimatedNumber
                value={currentBenchmark.wordsPerMinute}
                decimals={0}
                className="text-lg font-bold text-teal-600 dark:text-teal-400"
              />
              {averageWordsPerMinute > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  avg: {averageWordsPerMinute.toFixed(0)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Segment Info */}
        {currentBenchmark && (
          <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {currentBenchmark.srcLang} → {currentBenchmark.tgtLang}
              </span>
              <span className="text-muted-foreground">
                {currentBenchmark.segmentCount} segments • {currentBenchmark.charCount} chars
              </span>
            </div>
          </div>
        )}

        {/* Speed History Chart */}
        <SpeedHistoryChart history={benchmarks} />

        {/* Average Speed Display */}
        {benchmarks.length > 1 && (
          <div className="rounded-lg border bg-background/50 dark:bg-background/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Average Speed</span>
              <span className="text-sm font-semibold text-foreground">
                {averageSpeed.toFixed(2)}s
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Best Speed</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {Math.min(...benchmarks.map((b) => b.totalTime / 1000)).toFixed(2)}s
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Worst Speed</span>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                {Math.max(...benchmarks.map((b) => b.totalTime / 1000)).toFixed(2)}s
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
