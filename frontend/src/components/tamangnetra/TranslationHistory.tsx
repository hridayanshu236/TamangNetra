'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Search,
  Trash2,
  History,
  ArrowRightLeft,
  FileText,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/src/components/ui/sheet';
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
import { useTranslationStore, type TranslationSegment } from './TranslationStore';

// --- Types ---

export interface HistoryEntry {
  id: number;
  srcLang: string;
  tgtLang: string;
  originalText: string;
  translatedText: string;
  timestamp: number;
  segmentCount: number;
}

const STORAGE_KEY = 'tamangnetra-history';
const MAX_ENTRIES = 20;

// --- Helpers ---

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  // Fallback to date string
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
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

function readHistoryFromStorage(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeHistoryToStorage(entries: HistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// --- Shared State (module-level singleton) ---

let sharedHistory: HistoryEntry[] = typeof window !== 'undefined' ? readHistoryFromStorage() : [];
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function addToHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
  const newEntry: HistoryEntry = {
    ...entry,
    id: Date.now(),
    timestamp: Date.now(),
  };
  sharedHistory = [newEntry, ...sharedHistory].slice(0, MAX_ENTRIES);
  writeHistoryToStorage(sharedHistory);
  notifyListeners();
}

function clearAllHistory() {
  sharedHistory = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  notifyListeners();
}

// --- Hook ---

export function useTranslationHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(sharedHistory);

  useEffect(() => {
    const listener = () => {
      setHistory([...sharedHistory]);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const saveTranslation = useCallback(
    (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
      addToHistory(entry);
    },
    []
  );

  const clearHistory = useCallback(() => {
    clearAllHistory();
  }, []);

  const searchHistory = useCallback(
    (query: string): HistoryEntry[] => {
      if (!query.trim()) return sharedHistory;
      const q = query.toLowerCase();
      return sharedHistory.filter(
        (e) =>
          e.originalText.toLowerCase().includes(q) ||
          e.translatedText.toLowerCase().includes(q) ||
          e.srcLang.toLowerCase().includes(q) ||
          e.tgtLang.toLowerCase().includes(q)
      );
    },
    []
  );

  return { history, saveTranslation, clearHistory, searchHistory };
}

// --- Component ---

interface TranslationHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TranslationHistory({ open, onOpenChange }: TranslationHistoryProps) {
  const { history, clearHistory, searchHistory } = useTranslationHistory();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = searchQuery.trim()
    ? searchHistory(searchQuery)
    : history.slice(0, MAX_ENTRIES);

  const store = useTranslationStore();

  const handleLoadEntry = (entry: HistoryEntry) => {
    // Reconstruct segments from the stored text — split by newlines
    const originalLines = entry.originalText.split('\n');
    const translatedLines = entry.translatedText.split('\n');
    const maxLen = Math.max(originalLines.length, translatedLines.length);
    const segments: TranslationSegment[] = [];
    for (let i = 0; i < maxLen; i++) {
      segments.push({
        original: originalLines[i] || '',
        translated: translatedLines[i] || '',
      });
    }

    store.setSrcLang(entry.srcLang);
    store.setTgtLang(entry.tgtLang);
    store.setResults(entry.originalText, entry.translatedText, segments);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-emerald-500/20"
      >
        {/* Header */}
        <SheetHeader className="p-4 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                <History className="size-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-base">Translation History</SheetTitle>
                <SheetDescription className="text-xs">
                  Your recent translations
                </SheetDescription>
              </div>
            </div>
            {history.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 px-2"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Translation History?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {history.length} translation
                      record{history.length !== 1 ? 's' : ''}. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearHistory}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Search */}
          {history.length > 0 && (
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search translations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30 border-border/50 focus-visible:ring-emerald-500/30"
              />
            </div>
          )}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {filteredHistory.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/30 mb-4">
                  <Inbox className="size-8 text-muted-foreground/50" />
                </div>
              </motion.div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {searchQuery ? 'No matches found' : 'No history yet'}
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Your translations will appear here after you translate text'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                <AnimatePresence mode="popLayout">
                  {filteredHistory.map((entry, index) => (
                    <motion.button
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.03,
                      }}
                      onClick={() => handleLoadEntry(entry)}
                      className="w-full text-left rounded-lg p-3 transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 group border border-transparent hover:border-emerald-500/10 dark:hover:border-emerald-500/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Language pair */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                            >
                              {getLangEmoji(entry.srcLang)} {entry.srcLang}
                            </Badge>
                            <ArrowRightLeft className="size-3 text-muted-foreground/50" />
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5 border-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400"
                            >
                              {getLangEmoji(entry.tgtLang)} {entry.tgtLang}
                            </Badge>
                          </div>

                          {/* Text preview */}
                          <p className="text-xs text-foreground truncate leading-relaxed">
                            {truncate(entry.originalText, 100)}
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate leading-relaxed mt-0.5">
                            {truncate(entry.translatedText, 100)}
                          </p>
                        </div>

                        <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors mt-1 shrink-0" />
                      </div>

                      {/* Footer: timestamp + segment count */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 text-muted-foreground/60">
                          <Clock className="size-3" />
                          <span className="text-[10px]">
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                        </div>
                        {entry.segmentCount > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground/60">
                            <FileText className="size-3" />
                            <span className="text-[10px]">
                              {entry.segmentCount} segment
                              {entry.segmentCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-3 border-t border-border/50 bg-muted/10">
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Showing {filteredHistory.length} of {history.length} translation
              {history.length !== 1 ? 's' : ''} • Last 20 stored
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// --- Floating History Button ---

export function HistoryButton({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return readHistoryFromStorage().length;
  });

  useEffect(() => {
    // Listen for storage changes from other tabs
    const handleStorage = () => {
      setCount(readHistoryFromStorage().length);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="relative gap-1.5 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 hover:border-emerald-500/30 transition-all"
    >
      <History className="size-3.5" />
      <span className="hidden sm:inline text-xs">History</span>
      {count > 0 && (
        <Badge className="absolute -top-1.5 -right-1.5 size-4 p-0 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] border-0">
          {count > 9 ? '9+' : count}
        </Badge>
      )}
    </Button>
  );
}
