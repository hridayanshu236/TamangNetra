'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Languages,
  Clock,
  TrendingUp,
  Hash,
  Activity,
  Inbox,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';

// ── Types ──

interface AnalyticsEntry {
  id: number;
  srcLang: string;
  tgtLang: string;
  originalText: string;
  translatedText: string;
  timestamp: number;
  segmentCount: number;
}

// ── Helpers ──

const STORAGE_KEY = 'tamangnetra-history';

function readHistory(): AnalyticsEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalyticsEntry[];
  } catch {
    return [];
  }
}

function getLangPair(src: string, tgt: string): string {
  const short: Record<string, string> = { English: 'EN', Nepali: 'NE', Tamang: 'TM' };
  return `${short[src] || src}→${short[tgt] || tgt}`;
}

function getLangEmoji(lang: string): string {
  switch (lang.toLowerCase()) {
    case 'english': return '🇬🇧';
    case 'nepali': return '🇳🇵';
    case 'tamang': return '🏔️';
    default: return '🌐';
  }
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDayOfWeek(timestamp: number): number {
  const d = new Date(timestamp).getDay();
  // Convert Sunday=0 to Monday-based index (Mon=0, Sun=6)
  return d === 0 ? 6 : d - 1;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Animated Counter ──

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(() => target);

  useEffect(() => {
    if (target === 0) { return; }
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count}</span>;
}

// ── Summary Card ──

function SummaryCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle?: string;
  color: 'emerald' | 'teal' | 'amber' | 'rose';
  delay: number;
}) {
  const colorMap = {
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    teal: 'from-teal-500/10 to-teal-600/5 border-teal-500/20 text-teal-600 dark:text-teal-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    rose: 'from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-600 dark:text-rose-400',
  };

  const iconColorMap = {
    emerald: 'text-emerald-500',
    teal: 'text-teal-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className={`relative overflow-hidden bg-gradient-to-br ${colorMap[color]} backdrop-blur-sm`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`size-4 ${iconColorMap[color]}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Bar Chart (pure CSS) ──

function LanguageBarChart({ data }: { data: { pair: string; count: number; color: string }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <motion.div
          key={item.pair}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
          className="space-y-1"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{item.pair}</span>
            <span className="text-muted-foreground">{item.count}</span>
          </div>
          <div className="h-6 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((item.count / maxCount) * 100, 4)}%` }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${item.color} flex items-center justify-end pr-2`}
            >
              {item.count > 0 && (
                <span className="text-[9px] font-bold text-white">{item.count}</span>
              )}
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Heat Map ──

function WeekHeatMap({ data }: { data: number[] }) {
  const maxVal = Math.max(...data, 1);

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day, i) => {
        const intensity = data[i] / maxVal;
        const bgOpacity = Math.max(intensity * 0.8, 0.05);
        return (
          <motion.div
            key={day}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="size-8 sm:size-10 rounded-lg flex items-center justify-center text-xs font-bold text-foreground transition-colors"
              style={{
                backgroundColor: `rgba(16, 185, 129, ${bgOpacity})`,
              }}
              title={`${day}: ${data[i]} translations`}
            >
              {data[i] || '-'}
            </div>
            <span className="text-[9px] text-muted-foreground">{day}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Timeline ──

function ActivityTimeline({ entries }: { entries: AnalyticsEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
          className="flex gap-3 items-start"
        >
          {/* Timeline dot and line */}
          <div className="flex flex-col items-center shrink-0">
            <div className="size-2.5 rounded-full bg-emerald-500 mt-1.5" />
            {i < entries.length - 1 && (
              <div className="w-[1px] h-8 bg-border/50" />
            )}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
              >
                {getLangEmoji(entry.srcLang)} {getLangPair(entry.srcLang, entry.tgtLang)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {formatTimestamp(entry.timestamp)}
              </span>
            </div>
            <p className="text-xs text-foreground truncate">
              {entry.originalText.slice(0, 80)}{entry.originalText.length > 80 ? '…' : ''}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
              {entry.translatedText.slice(0, 80)}{entry.translatedText.length > 80 ? '…' : ''}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Empty State ──

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/30 mb-4">
        <Inbox className="size-8 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">
        No translation history yet
      </p>
      <p className="text-xs text-muted-foreground/70 max-w-[250px]">
        Translate some text to see your analytics dashboard come to life with stats, charts, and insights.
      </p>
    </motion.div>
  );
}

// ── Main Component ──

export function TranslationAnalytics() {
  const [history, setHistory] = useState<AnalyticsEntry[]>(() => readHistory());

  useEffect(() => {
    // Listen for storage changes (when new translations are saved)
    const handleStorage = () => {
      setHistory(readHistory());
    };
    window.addEventListener('storage', handleStorage);

    // Also poll periodically to catch same-tab updates
    const interval = setInterval(() => {
      setHistory(readHistory());
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Compute analytics
  const analytics = useMemo(() => {
    if (history.length === 0) return null;

    // Total translations
    const totalTranslations = history.length;

    // Total characters
    const totalChars = history.reduce((sum, e) => sum + e.originalText.length, 0);

    // Language pair distribution
    const pairCounts: Record<string, { count: number; src: string; tgt: string }> = {};
    for (const e of history) {
      const pair = getLangPair(e.srcLang, e.tgtLang);
      if (!pairCounts[pair]) {
        pairCounts[pair] = { count: 0, src: e.srcLang, tgt: e.tgtLang };
      }
      pairCounts[pair].count++;
    }

    // Most used pair
    const sortedPairs = Object.entries(pairCounts).sort((a, b) => b[1].count - a[1].count);
    const mostUsedPair = sortedPairs[0]?.[0] || 'N/A';

    // Average translation length
    const avgLength = Math.round(totalChars / totalTranslations);

    // Language distribution for chart
    const barColors = [
      'bg-gradient-to-r from-emerald-500 to-emerald-600',
      'bg-gradient-to-r from-teal-500 to-teal-600',
      'bg-gradient-to-r from-amber-500 to-amber-600',
      'bg-gradient-to-r from-rose-500 to-rose-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-violet-500 to-violet-600',
    ];
    const langDistribution = sortedPairs.map(([pair, data], i) => ({
      pair: `${getLangEmoji(data.src)} ${pair}`,
      count: data.count,
      color: barColors[i % barColors.length],
    }));

    // Recent activity (last 5)
    const recentActivity = history.slice(0, 5);

    // Heat map (day of week)
    const dayCounts = new Array(7).fill(0);
    for (const e of history) {
      dayCounts[getDayOfWeek(e.timestamp)]++;
    }

    return {
      totalTranslations,
      totalChars,
      mostUsedPair,
      avgLength,
      langDistribution,
      recentActivity,
      dayCounts,
    };
  }, [history]);

  if (!analytics) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={BarChart3}
          title="Total"
          value={<AnimatedCounter target={analytics.totalTranslations} />}
          subtitle="translations"
          color="emerald"
          delay={0.1}
        />
        <SummaryCard
          icon={Hash}
          title="Characters"
          value={<AnimatedCounter target={analytics.totalChars} />}
          subtitle="total translated"
          color="teal"
          delay={0.15}
        />
        <SummaryCard
          icon={Languages}
          title="Top Pair"
          value={analytics.mostUsedPair}
          subtitle="most used"
          color="amber"
          delay={0.2}
        />
        <SummaryCard
          icon={TrendingUp}
          title="Avg Length"
          value={<AnimatedCounter target={analytics.avgLength} />}
          subtitle="chars per translation"
          color="rose"
          delay={0.25}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Language Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-emerald-600" />
                Language Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {analytics.langDistribution.length > 0 ? (
                <LanguageBarChart data={analytics.langDistribution} />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No data yet
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Week Heat Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-teal-500/5 to-amber-500/5 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-teal-600" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <WeekHeatMap data={analytics.dayCounts} />
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Translation activity by day of week
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-amber-500/5 to-emerald-500/5 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-amber-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <ActivityTimeline entries={analytics.recentActivity} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
