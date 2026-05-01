'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Search,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  Copy,
  Check,
  BarChart3,
  Clock,
  Zap,
  X,
  Languages,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { Switch } from '@/src/components/ui/label';
import { Label } from '@/src/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/src/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/components/ui/alert-dialog';
import { useToast } from '@/src/hooks/use-toast';
import { useTranslationStore } from './TranslationStore';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TranslationMemoryEntry {
  id: string;
  source: string;
  target: string;
  srcLang: string;
  tgtLang: string;
  timestamp: number;
  hitCount: number;
}

// ─── Levenshtein distance & similarity ──────────────────────────────────────

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

// ─── localStorage helpers ───────────────────────────────────────────────────

const STORAGE_KEY = 'tamangnetra-tm';
const MAX_ENTRIES = 500;

function loadEntries(): TranslationMemoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveEntries(entries: TranslationMemoryEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ─── Shared state (singleton pattern) ──────────────────────────────────────

let sharedEntries: TranslationMemoryEntry[] = [];
let sharedEnabled: boolean = true;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function initIfNeeded() {
  if (sharedEntries.length === 0 && typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        sharedEntries = JSON.parse(stored);
      } catch {
        sharedEntries = [];
      }
    }
    const storedEnabled = localStorage.getItem(`${STORAGE_KEY}-enabled`);
    sharedEnabled = storedEnabled !== null ? storedEnabled === 'true' : true;
  }
}

// ─── useTranslationMemory hook ─────────────────────────────────────────────

export function useTranslationMemory() {
  const [, forceUpdate] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    initIfNeeded();
    mountedRef.current = true;
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const lookup = useCallback(
    (
      source: string,
      srcLang: string,
      tgtLang: string,
      threshold = 0.8
    ): TranslationMemoryEntry | null => {
      initIfNeeded();
      if (!sharedEnabled) return null;

      // First try exact match
      const exact = sharedEntries.find(
        (e) =>
          e.srcLang === srcLang &&
          e.tgtLang === tgtLang &&
          e.source.toLowerCase() === source.toLowerCase()
      );
      if (exact) {
        // Increment hit count
        exact.hitCount++;
        exact.timestamp = Date.now();
        saveEntries(sharedEntries);
        notifyListeners();
        return exact;
      }

      // Fuzzy match using Levenshtein ratio
      let bestMatch: TranslationMemoryEntry | null = null;
      let bestRatio = 0;

      for (const entry of sharedEntries) {
        if (entry.srcLang !== srcLang || entry.tgtLang !== tgtLang) continue;
        const ratio = levenshteinRatio(source, entry.source);
        if (ratio >= threshold && ratio > bestRatio) {
          bestRatio = ratio;
          bestMatch = entry;
        }
      }

      if (bestMatch) {
        bestMatch.hitCount++;
        bestMatch.timestamp = Date.now();
        saveEntries(sharedEntries);
        notifyListeners();
      }

      return bestMatch;
    },
    []
  );

  const addEntry = useCallback(
    (source: string, target: string, srcLang: string, tgtLang: string) => {
      initIfNeeded();
      if (!sharedEnabled) return;

      // Check for duplicate (exact match)
      const existingIndex = sharedEntries.findIndex(
        (e) =>
          e.srcLang === srcLang &&
          e.tgtLang === tgtLang &&
          e.source.toLowerCase() === source.toLowerCase()
      );

      if (existingIndex >= 0) {
        // Update existing entry (increment hit count, update target)
        sharedEntries[existingIndex].hitCount++;
        sharedEntries[existingIndex].target = target;
        sharedEntries[existingIndex].timestamp = Date.now();
      } else {
        // Add new entry
        const newEntry: TranslationMemoryEntry = {
          id: crypto.randomUUID(),
          source,
          target,
          srcLang,
          tgtLang,
          timestamp: Date.now(),
          hitCount: 1,
        };
        sharedEntries = [...sharedEntries, newEntry];

        // LRU eviction when exceeding max
        if (sharedEntries.length > MAX_ENTRIES) {
          // Sort by timestamp (oldest first) and remove the oldest
          sharedEntries.sort((a, b) => a.timestamp - b.timestamp);
          sharedEntries = sharedEntries.slice(
            sharedEntries.length - MAX_ENTRIES
          );
        }
      }

      saveEntries(sharedEntries);
      notifyListeners();
    },
    []
  );

  const clearAll = useCallback(() => {
    sharedEntries = [];
    saveEntries(sharedEntries);
    notifyListeners();
  }, []);

  const getStats = useCallback(() => {
    initIfNeeded();
    const totalEntries = sharedEntries.length;
    const langPairs = new Set(
      sharedEntries.map((e) => `${e.srcLang}→${e.tgtLang}`)
    );
    const totalHits = sharedEntries.reduce((sum, e) => sum + e.hitCount, 0);
    const mostUsed =
      sharedEntries.length > 0
        ? sharedEntries.reduce((a, b) => (a.hitCount > b.hitCount ? a : b))
        : null;

    // Language distribution
    const langDistribution: Record<string, number> = {};
    for (const entry of sharedEntries) {
      const key = `${entry.srcLang}→${entry.tgtLang}`;
      langDistribution[key] = (langDistribution[key] || 0) + 1;
    }

    return {
      totalEntries,
      languagePairs: langPairs.size,
      totalHits,
      mostUsed,
      langDistribution,
    };
  }, []);

  const toggleEnabled = useCallback(() => {
    initIfNeeded();
    sharedEnabled = !sharedEnabled;
    localStorage.setItem(`${STORAGE_KEY}-enabled`, String(sharedEnabled));
    notifyListeners();
  }, []);

  const importEntries = useCallback((entries: TranslationMemoryEntry[]) => {
    initIfNeeded();
    sharedEntries = [...sharedEntries, ...entries];
    // Enforce max entries
    if (sharedEntries.length > MAX_ENTRIES) {
      sharedEntries.sort((a, b) => a.timestamp - b.timestamp);
      sharedEntries = sharedEntries.slice(
        sharedEntries.length - MAX_ENTRIES
      );
    }
    saveEntries(sharedEntries);
    notifyListeners();
  }, []);

  return {
    entries: sharedEntries,
    lookup,
    addEntry,
    clearAll,
    getStats,
    enabled: sharedEnabled,
    toggleEnabled,
    importEntries,
  };
}

// ─── Language flags helper ──────────────────────────────────────────────────

function getLangFlag(lang: string): string {
  switch (lang) {
    case 'English':
      return '🇬🇧';
    case 'Nepali':
      return '🇳🇵';
    case 'Tamang':
      return '🏔️';
    default:
      return '🌐';
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ─── TranslationMemory Component ────────────────────────────────────────────

export function TranslationMemory() {
  const {
    entries,
    clearAll,
    getStats,
    enabled,
    toggleEnabled,
    importEntries,
  } = useTranslationMemory();
  const { translationMemoryEnabled, toggleTranslationMemory } =
    useTranslationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const stats = getStats();

  // Sync store state on mount
  useEffect(() => {
    if (translationMemoryEnabled !== enabled) {
      toggleTranslationMemory();
    }
  }, []);

  // Filter entries based on search and language filter
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      !searchQuery ||
      entry.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang =
      filterLang === 'all' ||
      entry.srcLang === filterLang ||
      entry.tgtLang === filterLang;
    return matchesSearch && matchesLang;
  });

  // Sort by most recent
  const sortedEntries = [...filteredEntries].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  // Export TM as JSON
  const handleExport = useCallback(() => {
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tamangnetra-tm.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Translation Memory exported',
      description: `${entries.length} entries exported as JSON.`,
    });
  }, [entries, toast]);

  // Import TM from JSON
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (!Array.isArray(data)) {
            throw new Error('Invalid format: expected an array');
          }
          const validEntries: TranslationMemoryEntry[] = data
            .filter(
              (item: Record<string, unknown>) =>
                item.source && item.target && item.srcLang && item.tgtLang
            )
            .map((item: Record<string, unknown>) => ({
              id: (item.id as string) || crypto.randomUUID(),
              source: item.source as string,
              target: item.target as string,
              srcLang: item.srcLang as string,
              tgtLang: item.tgtLang as string,
              timestamp: (item.timestamp as number) || Date.now(),
              hitCount: (item.hitCount as number) || 1,
            }));

          if (validEntries.length === 0) {
            throw new Error('No valid entries found in file');
          }

          importEntries(validEntries);
          toast({
            title: 'Translation Memory imported',
            description: `${validEntries.length} entries imported successfully.`,
          });
        } catch (err) {
          toast({
            title: 'Import failed',
            description:
              err instanceof Error ? err.message : 'Invalid JSON file.',
            variant: 'destructive',
          });
        }
      };
      reader.readAsText(file);

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [importEntries, toast]
  );

  // Copy to clipboard
  const handleCopy = useCallback(
    async (text: string, id: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast({
          title: 'Copied to clipboard',
          description: 'Translation copied successfully.',
        });
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        toast({
          title: 'Copy failed',
          description: 'Could not copy to clipboard.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // Toggle handler that syncs both states
  const handleToggle = useCallback(() => {
    toggleEnabled();
    toggleTranslationMemory();
  }, [toggleEnabled, toggleTranslationMemory]);

  return (
    <Card className="h-fit">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4 text-teal-600" />
              Translation Memory
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Enable/Disable toggle */}
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="tm-toggle"
                  className={`text-xs cursor-pointer ${
                    enabled
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {enabled ? 'On' : 'Off'}
                </Label>
                <input
                  id="tm-toggle"
                  type="checkbox"
                  checked={enabled}
                  onChange={handleToggle}
                  className="h-4 w-4 rounded border-border accent-teal-600"
                />
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="size-4" />
                  </motion.div>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CardDescription className="text-xs">
            Reuse previous translations with fuzzy matching (≥80% similarity).
            {enabled && (
              <Badge
                variant="outline"
                className="ml-2 text-[10px] border-teal-300 text-teal-600 dark:border-teal-700 dark:text-teal-400"
              >
                Active
              </Badge>
            )}
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Stats display */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 p-2.5 text-center dark:from-teal-950/30 dark:to-emerald-950/30">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Database className="size-3 text-teal-600" />
                  <span className="text-[10px] text-muted-foreground">
                    Entries
                  </span>
                </div>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-400">
                  {stats.totalEntries}
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-amber-50 p-2.5 text-center dark:from-emerald-950/30 dark:to-amber-950/30">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Zap className="size-3 text-emerald-600" />
                  <span className="text-[10px] text-muted-foreground">
                    Hits
                  </span>
                </div>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {stats.totalHits}
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-amber-50 to-teal-50 p-2.5 text-center dark:from-amber-950/30 dark:to-teal-950/30">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Languages className="size-3 text-amber-600" />
                  <span className="text-[10px] text-muted-foreground">
                    Pairs
                  </span>
                </div>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {stats.languagePairs}
                </p>
              </div>
            </div>

            {/* Language distribution */}
            {Object.keys(stats.langDistribution).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(stats.langDistribution).map(
                  ([pair, count]) => (
                    <Badge
                      key={pair}
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 border-border/50 bg-background/60"
                    >
                      {pair} ({count})
                    </Badge>
                  )
                )}
              </div>
            )}

            {/* Status banner */}
            <div
              className={`rounded-lg p-3 transition-colors duration-300 ${
                enabled
                  ? 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30'
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Database
                  className={`size-4 ${
                    enabled ? 'text-teal-600' : 'text-muted-foreground'
                  }`}
                />
                <span className="text-xs font-medium">
                  {enabled ? (
                    <span className="text-teal-700 dark:text-teal-400">
                      TM is active — translations will be cached and reused
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      TM is disabled — enable to cache and reuse translations
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Search and filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search source or target..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="size-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Select value={filterLang} onValueChange={setFilterLang}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
                  <SelectValue placeholder="Filter by language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="English">🇬🇧 English</SelectItem>
                  <SelectItem value="Nepali">🇳🇵 Nepali</SelectItem>
                  <SelectItem value="Tamang">🏔️ Tamang</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entries list */}
            <div className="max-h-96 overflow-y-auto rounded-lg border space-y-0">
              <AnimatePresence>
                {sortedEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Database className="size-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {searchQuery || filterLang !== 'all'
                        ? 'No matching entries found.'
                        : 'No translation memory entries yet. Translations will be cached automatically.'}
                    </p>
                  </div>
                ) : (
                  sortedEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.15, delay: index * 0.02 }}
                      className={`flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      }`}
                      onClick={() => handleCopy(entry.target, entry.id)}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium truncate">
                            {entry.source}
                          </p>
                        </div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
                          → {entry.target}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-border/50 bg-background/60"
                          >
                            {getLangFlag(entry.srcLang)}→
                            {getLangFlag(entry.tgtLang)}
                          </Badge>
                          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                            <Zap className="size-2.5" />
                            {entry.hitCount}
                          </span>
                          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                            <Clock className="size-2.5" />
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {copiedId === entry.id ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <Upload className="size-3 mr-1" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={entries.length === 0}
                className="text-xs"
              >
                <Download className="size-3 mr-1" />
                Export
              </Button>
              <div className="flex-1" />
              {entries.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="size-3 mr-1" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Translation Memory?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {entries.length} translation
                        memory entries. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          clearAll();
                          toast({
                            title: 'Translation Memory cleared',
                            description:
                              'All TM entries have been removed.',
                          });
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
