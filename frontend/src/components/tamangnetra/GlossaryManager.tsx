'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  Download,
  Upload,
  ChevronDown,
  BookMarked,
  Languages,
  X,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/src/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { useToast } from '@/src/hooks/use-toast';
import { useTranslationStore } from './TranslationStore';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GlossaryEntry {
  id: string;
  sourceTerm: string;
  targetTranslation: string;
  srcLang: string;
  tgtLang: string;
}

// ─── Sample entries ─────────────────────────────────────────────────────────

const SAMPLE_ENTRIES: Omit<GlossaryEntry, 'id'>[] = [
  { sourceTerm: 'Himalaya', targetTranslation: 'हिमालय', srcLang: 'English', tgtLang: 'Nepali' },
  { sourceTerm: 'Kathmandu', targetTranslation: 'काठमाडौं', srcLang: 'English', tgtLang: 'Nepali' },
  { sourceTerm: 'Tamang', targetTranslation: 'तामाङ', srcLang: 'English', tgtLang: 'Nepali' },
  { sourceTerm: 'Nepal', targetTranslation: 'नेपाल', srcLang: 'English', tgtLang: 'Nepali' },
  { sourceTerm: 'Boudhanath', targetTranslation: 'बौद्धनाथ', srcLang: 'English', tgtLang: 'Nepali' },
  { sourceTerm: 'Pokhara', targetTranslation: 'पोखरा', srcLang: 'English', tgtLang: 'Nepali' },
  { sourceTerm: 'Everest', targetTranslation: 'सगरमाथा', srcLang: 'English', tgtLang: 'Nepali' },
  { sourceTerm: 'Lumbini', targetTranslation: 'लुम्बिनी', srcLang: 'English', tgtLang: 'Nepali' },
  { sourceTerm: 'Tamang', targetTranslation: 'तामाङ', srcLang: 'English', tgtLang: 'Tamang' },
  { sourceTerm: 'Nepal', targetTranslation: 'नेपाल', srcLang: 'English', tgtLang: 'Tamang' },
  { sourceTerm: 'हिमालय', targetTranslation: 'Himalaya', srcLang: 'Nepali', tgtLang: 'English' },
  { sourceTerm: 'काठमाडौं', targetTranslation: 'Kathmandu', srcLang: 'Nepali', tgtLang: 'English' },
];

// ─── localStorage helpers ───────────────────────────────────────────────────

const STORAGE_KEY = 'tamangnetra-glossary';

function loadEntries(): GlossaryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  // Pre-populate with sample entries on first load
  const initial: GlossaryEntry[] = SAMPLE_ENTRIES.map((e) => ({
    ...e,
    id: crypto.randomUUID(),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveEntries(entries: GlossaryEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ─── Shared state (singleton pattern like TranslationHistory) ───────────────

let sharedEntries: GlossaryEntry[] = [];
let sharedEnabled: boolean = true;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function initIfNeeded() {
  if (sharedEntries.length === 0 && typeof window !== 'undefined') {
    sharedEntries = loadEntries();
    const storedEnabled = localStorage.getItem(`${STORAGE_KEY}-enabled`);
    sharedEnabled = storedEnabled !== null ? storedEnabled === 'true' : true;
  }
}

// ─── useGlossary hook ───────────────────────────────────────────────────────

export function useGlossary() {
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

  const addEntry = useCallback((entry: Omit<GlossaryEntry, 'id'>) => {
    initIfNeeded();
    const newEntry: GlossaryEntry = { ...entry, id: crypto.randomUUID() };
    sharedEntries = [...sharedEntries, newEntry];
    saveEntries(sharedEntries);
    notifyListeners();
  }, []);

  const removeEntry = useCallback((id: string) => {
    initIfNeeded();
    sharedEntries = sharedEntries.filter((e) => e.id !== id);
    saveEntries(sharedEntries);
    notifyListeners();
  }, []);

  const toggleEnabled = useCallback(() => {
    initIfNeeded();
    sharedEnabled = !sharedEnabled;
    localStorage.setItem(`${STORAGE_KEY}-enabled`, String(sharedEnabled));
    notifyListeners();
  }, []);

  const applyGlossary = useCallback(
    (text: string, srcLang: string, tgtLang: string): string => {
      initIfNeeded();
      if (!sharedEnabled) return text;

      // Find matching entries for this language pair
      const matching = sharedEntries.filter(
        (e) =>
          e.srcLang === srcLang &&
          e.tgtLang === tgtLang
      );

      if (matching.length === 0) return text;

      // Sort by length descending so longer terms are replaced first
      // (e.g., "Kathmandu Valley" before "Kathmandu")
      const sorted = [...matching].sort(
        (a, b) => b.sourceTerm.length - a.sourceTerm.length
      );

      let result = text;
      // Build a map of placeholder → translation for safe replacement
      const placeholderMap = new Map<string, string>();

      for (const entry of sorted) {
        const sourceTerm = entry.sourceTerm;
        const targetTranslation = entry.targetTranslation;

        // Case-insensitive matching with word boundaries
        const escaped = sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

        result = result.replace(regex, (match) => {
          const placeholder = `\x00GLOSS_${crypto.randomUUID()}\x00`;
          placeholderMap.set(placeholder, targetTranslation);
          return placeholder;
        });
      }

      // Replace placeholders with actual translations
      for (const [placeholder, translation] of placeholderMap) {
        result = result.replaceAll(placeholder, translation);
      }

      return result;
    },
    []
  );

  const importEntries = useCallback((entries: GlossaryEntry[]) => {
    initIfNeeded();
    sharedEntries = [...sharedEntries, ...entries];
    saveEntries(sharedEntries);
    notifyListeners();
  }, []);

  const clearAll = useCallback(() => {
    sharedEntries = [];
    saveEntries(sharedEntries);
    notifyListeners();
  }, []);

  return {
    entries: sharedEntries,
    addEntry,
    removeEntry,
    applyGlossary,
    enabled: sharedEnabled,
    toggleEnabled,
    importEntries,
    clearAll,
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

// ─── Add Entry Dialog ───────────────────────────────────────────────────────

function AddEntryDialog({ onAdd }: { onAdd: (entry: Omit<GlossaryEntry, 'id'>) => void }) {
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTranslation, setTargetTranslation] = useState('');
  const [srcLang, setSrcLang] = useState('English');
  const [tgtLang, setTgtLang] = useState('Nepali');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!sourceTerm.trim() || !targetTranslation.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Both source term and target translation are required.',
        variant: 'destructive',
      });
      return;
    }
    if (srcLang === tgtLang) {
      toast({
        title: 'Same language',
        description: 'Source and target languages must be different.',
        variant: 'destructive',
      });
      return;
    }
    onAdd({
      sourceTerm: sourceTerm.trim(),
      targetTranslation: targetTranslation.trim(),
      srcLang,
      tgtLang,
    });
    setSourceTerm('');
    setTargetTranslation('');
    setOpen(false);
    toast({
      title: 'Entry added',
      description: `"${sourceTerm.trim()}" → "${targetTranslation.trim()}" added to glossary.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
        >
          <Plus className="size-3.5 mr-1" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="size-4 text-emerald-600" />
            Add Glossary Entry
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Source Term
            </Label>
            <Input
              placeholder="e.g., Himalaya"
              value={sourceTerm}
              onChange={(e) => setSourceTerm(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Source Language
              </Label>
              <Select value={srcLang} onValueChange={setSrcLang}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">
                    🇬🇧 English
                  </SelectItem>
                  <SelectItem value="Nepali">
                    🇳🇵 Nepali
                  </SelectItem>
                  <SelectItem value="Tamang">
                    🏔️ Tamang
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Target Language
              </Label>
              <Select value={tgtLang} onValueChange={setTgtLang}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English" disabled={srcLang === 'English'}>
                    🇬🇧 English
                  </SelectItem>
                  <SelectItem value="Nepali" disabled={srcLang === 'Nepali'}>
                    🇳🇵 Nepali
                  </SelectItem>
                  <SelectItem value="Tamang" disabled={srcLang === 'Tamang'}>
                    🏔️ Tamang
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Target Translation
            </Label>
            <Input
              placeholder="e.g., हिमालय"
              value={targetTranslation}
              onChange={(e) => setTargetTranslation(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 p-3 dark:from-emerald-950/30 dark:to-teal-950/30">
            <p className="text-xs text-muted-foreground text-center">
              Preview:{' '}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {sourceTerm || '—'}
              </span>{' '}
              →{' '}
              <span className="font-semibold text-teal-700 dark:text-teal-400">
                {targetTranslation || '—'}
              </span>
            </p>
            <p className="text-[10px] text-center text-muted-foreground mt-1">
              {getLangFlag(srcLang)} {srcLang} → {getLangFlag(tgtLang)} {tgtLang}
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={handleSubmit}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
          >
            Add Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── GlossaryManager Component ──────────────────────────────────────────────

export function GlossaryManager() {
  const { entries, addEntry, removeEntry, enabled, toggleEnabled, importEntries, clearAll } =
    useGlossary();
  const { glossaryEnabled, toggleGlossary } = useTranslationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync the store's glossaryEnabled with the hook's enabled state
  useEffect(() => {
    if (glossaryEnabled !== enabled) {
      toggleGlossary();
    }
  // Sync on mount to reconcile store ↔ localStorage state
  }, []);

  // Filter entries based on search and language filter
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      !searchQuery ||
      entry.sourceTerm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.targetTranslation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang =
      filterLang === 'all' ||
      entry.srcLang === filterLang ||
      entry.tgtLang === filterLang;
    return matchesSearch && matchesLang;
  });

  // Export glossary as JSON
  const handleExport = useCallback(() => {
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tamangnetra-glossary.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Glossary exported',
      description: `${entries.length} entries exported as JSON.`,
    });
  }, [entries, toast]);

  // Import glossary from JSON
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
          // Validate entries
          const validEntries: GlossaryEntry[] = data
            .filter(
              (item: Record<string, unknown>) =>
                item.sourceTerm &&
                item.targetTranslation &&
                item.srcLang &&
                item.tgtLang
            )
            .map((item: Record<string, unknown>) => ({
              id: (item.id as string) || crypto.randomUUID(),
              sourceTerm: item.sourceTerm as string,
              targetTranslation: item.targetTranslation as string,
              srcLang: item.srcLang as string,
              tgtLang: item.tgtLang as string,
            }));

          if (validEntries.length === 0) {
            throw new Error('No valid entries found in file');
          }

          importEntries(validEntries);
          toast({
            title: 'Glossary imported',
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

      // Reset input so the same file can be re-imported
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [importEntries, toast]
  );

  // Toggle handler that syncs both states
  const handleToggle = useCallback(() => {
    toggleEnabled();
    toggleGlossary();
  }, [toggleEnabled, toggleGlossary]);

  return (
    <Card className="h-fit">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-emerald-600" />
              Glossary Manager
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Enable/Disable toggle */}
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="glossary-toggle"
                  className={`text-xs cursor-pointer ${
                    enabled
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {enabled ? 'On' : 'Off'}
                </Label>
                <Switch
                  id="glossary-toggle"
                  checked={enabled}
                  onCheckedChange={handleToggle}
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
            Define custom term translations for consistency across documents.
            {enabled && (
              <Badge
                variant="outline"
                className="ml-2 text-[10px] border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
              >
                Active
              </Badge>
            )}
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Status banner */}
            <div
              className={`rounded-lg p-3 transition-colors duration-300 ${
                enabled
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30'
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages
                    className={`size-4 ${
                      enabled ? 'text-emerald-600' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="text-xs font-medium">
                    {enabled ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Glossary is applied during translation
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Glossary is disabled — enable to apply custom terms
                      </span>
                    )}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </Badge>
              </div>
            </div>

            {/* Search and filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 dark:border-border/60 dark:bg-background/80"
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
                <SelectTrigger className="h-8 text-xs w-full sm:w-[140px] dark:border-border/60 dark:bg-background/80">
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

            {/* Entries table */}
            <div className="max-h-72 overflow-y-auto rounded-lg border dark:border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider h-8 dark:text-muted-foreground/80">
                      Source
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-8 dark:text-muted-foreground/80">
                      Target
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-8 dark:text-muted-foreground/80">
                      Pair
                    </TableHead>
                    <TableHead className="w-10 h-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-20 text-center text-xs text-muted-foreground"
                        >
                          {searchQuery || filterLang !== 'all'
                            ? 'No matching entries found.'
                            : 'No glossary entries yet. Add one to get started.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.15, delay: index * 0.02 }}
                          className="border-b transition-colors hover:bg-muted/50 dark:hover:bg-muted/30 data-[state=selected]:bg-muted dark:data-[state=selected]:bg-muted/30"
                        >
                          <TableCell className="text-xs font-medium py-2 whitespace-normal dark:text-foreground/90">
                            {entry.sourceTerm}
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-normal text-emerald-700 dark:text-emerald-400">
                            {entry.targetTranslation}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 border-border/50 dark:border-border/40 bg-background/60 dark:bg-background/40"
                            >
                              {getLangFlag(entry.srcLang)}→{getLangFlag(entry.tgtLang)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 hover:text-red-500"
                              onClick={() => removeEntry(entry.id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <AddEntryDialog onAdd={addEntry} />

              <div className="flex-1" />

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
              {entries.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearAll();
                    toast({
                      title: 'Glossary cleared',
                      description: 'All glossary entries have been removed.',
                    });
                  }}
                  className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="size-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
