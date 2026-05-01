'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Shield,
  Lock,
  Share2,
  Gauge,
  BarChart3,
  Languages,
  CheckCircle2,
  XCircle,
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
import { useTranslationStore } from './TranslationStore';

// ── Animated counter hook ──

function useAnimatedCounter(target: number, duration: number = 600) {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target) return;

    const start = prevTarget.current;
    const diff = target - start;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevTarget.current = target;
        setCurrent(target);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return current;
}

// ── Circular progress ring (SVG) ──

function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 6,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const color =
    percentage >= 80
      ? 'text-emerald-500'
      : percentage >= 50
        ? 'text-amber-500'
        : 'text-rose-500';

  const strokeColor =
    percentage >= 80
      ? '#10b981'
      : percentage >= 50
        ? '#f59e0b'
        : '#f43f5e';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${color}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// ── Feature status icon ──

function FeatureStatus({
  icon: Icon,
  label,
  enabled,
  activeColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  enabled: boolean;
  activeColor: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <div className="relative">
              <Icon
                className={`size-3.5 ${
                  enabled ? activeColor : 'text-muted-foreground/40'
                }`}
              />
              {enabled ? (
                <CheckCircle2 className="size-2 absolute -top-0.5 -right-0.5 text-emerald-500" />
              ) : (
                <XCircle className="size-2 absolute -top-0.5 -right-0.5 text-muted-foreground/30" />
              )}
            </div>
            <span
              className={`text-[10px] ${
                enabled ? 'text-foreground' : 'text-muted-foreground/50'
              }`}
            >
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {label}: {enabled ? 'Enabled' : 'Disabled'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Mini bar chart (pure CSS) ──

function MiniBarChart({ data }: { data: number[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-12 text-[10px] text-muted-foreground/50">
        No data yet
      </div>
    );
  }

  const maxVal = Math.max(...data, 1);
  const barColors = [
    'bg-emerald-400 dark:bg-emerald-600',
    'bg-teal-400 dark:bg-teal-600',
    'bg-cyan-400 dark:bg-cyan-600',
    'bg-amber-400 dark:bg-amber-600',
    'bg-orange-400 dark:bg-orange-600',
    'bg-rose-400 dark:bg-rose-600',
  ];

  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((val, i) => {
        const heightPercent = Math.max((val / maxVal) * 100, 4);
        return (
          <TooltipProvider key={i}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className={`flex-1 rounded-t-sm min-w-[6px] ${
                    barColors[i % barColors.length]
                  } cursor-help`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {val} words
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// ── Main component ──

export function TranslationProgressDashboard() {
  const {
    progress,
    totalSegments,
    completedSegments,
    segments,
    srcLang,
    tgtLang,
    piiEnabled,
    encryptionEnabled,
    knowledgeGraphEnabled,
    isTranslating,
  } = useTranslationStore();

  // Animated counters
  const animatedCompleted = useAnimatedCounter(completedSegments);
  const animatedTotal = useAnimatedCounter(totalSegments);
  const animatedProgress = useAnimatedCounter(progress);

  // Translation speed calculation
  const translationStartTime = useRef<number | null>(null);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    if (isTranslating && !translationStartTime.current) {
      translationStartTime.current = Date.now();
    }
    if (!isTranslating) {
      translationStartTime.current = null;
    }
  }, [isTranslating]);

  useEffect(() => {
    if (isTranslating && translationStartTime.current && completedSegments > 0) {
      const elapsed = (Date.now() - translationStartTime.current) / 1000 / 60; // minutes
      if (elapsed > 0) {
        setSpeed(Math.round((completedSegments / elapsed) * 10) / 10);
      }
    }
    if (!isTranslating && completedSegments > 0 && totalSegments > 0 && completedSegments >= totalSegments) {
      // Translation complete - keep last speed
    }
  }, [completedSegments, isTranslating, totalSegments]);

  // Average segment length
  const avgSegmentLength = useMemo(() => {
    if (segments.length === 0) return 0;
    const totalWords = segments.reduce(
      (acc, seg) =>
        acc + seg.original.split(/\s+/).filter(Boolean).length,
      0
    );
    return Math.round(totalWords / segments.length);
  }, [segments]);

  // Segment length distribution (buckets)
  const segmentDistribution = useMemo(() => {
    if (segments.length === 0) return [];
    const lengths = segments.map(
      (seg) => seg.original.split(/\s+/).filter(Boolean).length
    );
    // Create buckets: 1-5, 6-10, 11-20, 21-40, 41-80, 80+
    const buckets = [0, 0, 0, 0, 0, 0];
    for (const len of lengths) {
      if (len <= 5) buckets[0] += len;
      else if (len <= 10) buckets[1] += len;
      else if (len <= 20) buckets[2] += len;
      else if (len <= 40) buckets[3] += len;
      else if (len <= 80) buckets[4] += len;
      else buckets[5] += len;
    }
    return buckets;
  }, [segments]);

  // Language flags
  const langFlags: Record<string, string> = {
    English: '🇬🇧',
    Nepali: '🇳🇵',
    Tamang: '🏔️',
  };

  const hasData = segments.length > 0 || isTranslating;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="h-fit backdrop-blur-md bg-card/80 dark:bg-card/60 border-border/50 shadow-lg card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4 text-teal-600" />
            Translation Progress
            {isTranslating && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 border-teal-300 text-teal-600 dark:border-teal-700 dark:text-teal-400 animate-pulse"
              >
                LIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress ring + stats */}
          <div className="flex items-center gap-4">
            <ProgressRing
              percentage={animatedProgress}
              size={72}
              strokeWidth={5}
            />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {animatedCompleted}
                </span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {animatedTotal}
                </span>
                <span className="text-xs text-muted-foreground">segments</span>
              </div>

              {/* Speed */}
              <div className="flex items-center gap-1.5">
                <Gauge className="size-3 text-amber-500" />
                <span className="text-xs text-muted-foreground">
                  {speed > 0 ? `${speed} seg/min` : '— seg/min'}
                </span>
              </div>

              {/* Avg length */}
              <div className="flex items-center gap-1.5">
                <BarChart3 className="size-3 text-teal-500" />
                <span className="text-xs text-muted-foreground">
                  {avgSegmentLength > 0
                    ? `${avgSegmentLength} words/seg avg`
                    : '— words/seg avg'}
                </span>
              </div>
            </div>
          </div>

          {/* Language pair */}
          <div className="flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-border/30">
            <Languages className="size-3.5 text-emerald-600" />
            <span className="text-xs font-medium">
              {langFlags[srcLang] || '🌐'} {srcLang}
            </span>
            <span className="text-[10px] text-muted-foreground">→</span>
            <span className="text-xs font-medium">
              {langFlags[tgtLang] || '🌐'} {tgtLang}
            </span>
          </div>

          {/* Feature status icons */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Active Features
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              <FeatureStatus
                icon={Shield}
                label="PII Shield"
                enabled={piiEnabled}
                activeColor="text-emerald-600"
              />
              <FeatureStatus
                icon={Lock}
                label="Encryption"
                enabled={encryptionEnabled}
                activeColor="text-amber-600"
              />
              <FeatureStatus
                icon={Share2}
                label="Knowledge Graph"
                enabled={knowledgeGraphEnabled}
                activeColor="text-teal-600"
              />
            </div>
          </div>

          {/* Segment length distribution mini chart */}
          {hasData && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Segment Length Distribution
              </p>
              <MiniBarChart data={segmentDistribution} />
              <div className="flex justify-between text-[8px] text-muted-foreground/50">
                <span>1-5</span>
                <span>6-10</span>
                <span>11-20</span>
                <span>21-40</span>
                <span>41-80</span>
                <span>80+</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasData && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <Activity className="size-6 text-muted-foreground/20 mb-2" />
              <p className="text-[10px] text-muted-foreground/50">
                Start a translation to see live progress
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
