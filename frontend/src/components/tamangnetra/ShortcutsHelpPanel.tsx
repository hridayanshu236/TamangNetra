'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Keyboard,
  Search,
  X,
  Languages,
  Navigation,
  Wrench,
  Sparkles,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/src/components/ui/sheet';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Shortcut {
  keys: string[];
  description: string;
  category: 'translation' | 'navigation' | 'tools' | 'general';
}

// ─── Shortcut Definitions ───────────────────────────────────────────────────

const SHORTCUTS: Shortcut[] = [
  // Translation
  { keys: ['Ctrl', 'Enter'], description: 'Translate current text', category: 'translation' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Export translation', category: 'translation' },
  { keys: ['Ctrl', 'D'], description: 'Download result', category: 'translation' },
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Command palette', category: 'navigation' },
  { keys: ['Ctrl', 'H'], description: 'Open history', category: 'navigation' },
  { keys: ['Ctrl', '1'], description: 'Switch to File tab', category: 'navigation' },
  { keys: ['Ctrl', '2'], description: 'Switch to Batch tab', category: 'navigation' },
  { keys: ['Ctrl', '3'], description: 'Switch to YouTube tab', category: 'navigation' },
  // Tools
  { keys: ['Ctrl', 'G'], description: 'Open glossary', category: 'tools' },
  { keys: ['Ctrl', 'M'], description: 'Open translation memory', category: 'tools' },
  { keys: ['Ctrl', 'Shift', 'T'], description: 'Toggle dark/light theme', category: 'tools' },
  // General
  { keys: ['Esc'], description: 'Close dialogs & panels', category: 'general' },
  { keys: ['?'], description: 'Show this shortcuts panel', category: 'general' },
];

// ─── Category config ────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'translation' as const,
    label: 'Translation',
    icon: Languages,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
  },
  {
    id: 'navigation' as const,
    label: 'Navigation',
    icon: Navigation,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    border: 'border-teal-200 dark:border-teal-800/50',
  },
  {
    id: 'tools' as const,
    label: 'Tools',
    icon: Wrench,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800/50',
  },
  {
    id: 'general' as const,
    label: 'General',
    icon: Sparkles,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    border: 'border-rose-200 dark:border-rose-800/50',
  },
];

// ─── Kbd-style element ──────────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md border border-border/60 bg-muted/80 dark:bg-muted/40 text-[11px] font-mono font-medium text-foreground shadow-[0_1px_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_1px_rgba(255,255,255,0.05)]">
      {children}
    </kbd>
  );
}

// ─── Shortcut Row ───────────────────────────────────────────────────────────

function ShortcutRow({
  shortcut,
  index,
}: {
  shortcut: Shortcut;
  index: number;
}) {
  const category = CATEGORIES.find((c) => c.id === shortcut.category);
  const CategoryIcon = category?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`size-6 rounded flex items-center justify-center shrink-0 ${category?.bg || ''}`}
        >
          {CategoryIcon && <CategoryIcon className={`size-3 ${category?.color || ''}`} />}
        </div>
        <span className="text-sm text-foreground truncate">
          {shortcut.description}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {shortcut.keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            <Kbd>{key}</Kbd>
            {i < shortcut.keys.length - 1 && (
              <span className="text-muted-foreground text-[10px]">+</span>
            )}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface ShortcutsHelpPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ShortcutsHelpPanel({
  open: controlledOpen,
  onOpenChange: controlledSetOpen,
}: ShortcutsHelpPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledSetOpen ?? setInternalOpen;

  // Listen for ? key to open panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUTS;
    const query = searchQuery.toLowerCase();
    return SHORTCUTS.filter(
      (s) =>
        s.description.toLowerCase().includes(query) ||
        s.keys.some((k) => k.toLowerCase().includes(query)) ||
        s.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group by category
  const groupedShortcuts = useMemo(() => {
    const groups = new Map<string, Shortcut[]>();
    for (const cat of CATEGORIES) {
      const items = filteredShortcuts.filter((s) => s.category === cat.id);
      if (items.length > 0) {
        groups.set(cat.id, items);
      }
    }
    return groups;
  }, [filteredShortcuts]);

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="size-3.5" />
          <span className="hidden sm:inline">Shortcuts</span>
          <kbd className="hidden sm:inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-border/60 bg-muted/80 dark:bg-muted/40 text-[9px] font-mono text-muted-foreground">
            ?
          </kbd>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-[440px] overflow-y-auto p-0"
      >
        {/* Glassmorphism header */}
        <div className="sticky top-0 z-10 bg-background/80 dark:bg-background/90 backdrop-blur-xl border-b border-border/50">
          <SheetHeader className="px-6 pt-6 pb-3">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Keyboard className="size-4 text-white" />
              </div>
              Keyboard Shortcuts
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Quick reference for all available shortcuts
            </p>
          </SheetHeader>

          {/* Search bar */}
          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-sm pl-9 pr-8 bg-muted/30 dark:bg-muted/20 border-border/50"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="px-4 pb-8 pt-2 space-y-6">
          <AnimatePresence mode="wait">
            {filteredShortcuts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Search className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No shortcuts found for &ldquo;{searchQuery}&rdquo;
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={clearSearch}
                >
                  Clear search
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {CATEGORIES.map((cat) => {
                  const items = groupedShortcuts.get(cat.id);
                  if (!items || items.length === 0) return null;

                  let globalIndex = 0;
                  for (const prevCat of CATEGORIES) {
                    if (prevCat.id === cat.id) break;
                    const prevItems = groupedShortcuts.get(prevCat.id);
                    if (prevItems) globalIndex += prevItems.length;
                  }

                  return (
                    <div key={cat.id} className="space-y-1">
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-3 mb-1">
                        <div
                          className={`size-5 rounded flex items-center justify-center ${cat.bg}`}
                        >
                          <cat.icon className={`size-2.5 ${cat.color}`} />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {cat.label}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${cat.border} ${cat.color}`}
                        >
                          {items.length}
                        </Badge>
                      </div>

                      {/* Shortcut items */}
                      <div className="rounded-xl border border-border/30 dark:border-border/20 bg-card/50 dark:bg-card/30 overflow-hidden">
                        {items.map((shortcut, i) => (
                          <ShortcutRow
                            key={`${shortcut.category}-${i}`}
                            shortcut={shortcut}
                            index={globalIndex + i}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer hint */}
          <div className="flex items-center justify-center gap-2 pt-4 text-[10px] text-muted-foreground">
            <Kbd>?</Kbd>
            <span>to toggle this panel</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Floating Help Button ───────────────────────────────────────────────────

export function ShortcutsFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <motion.button
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 lg:bottom-4 flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 dark:bg-background/70 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 group"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Keyboard shortcuts help"
      >
        <Keyboard className="size-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">
          Shortcuts
        </span>
        <kbd className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded border border-border/60 bg-muted/80 dark:bg-muted/40 text-[9px] font-mono text-muted-foreground">
          ?
        </kbd>
      </motion.button>

      <ShortcutsHelpPanel open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
