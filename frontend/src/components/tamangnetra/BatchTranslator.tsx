'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Languages,
  Loader2,
  Copy,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  TableProperties,
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
import { Progress } from '@/src/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { useTranslationStore } from './TranslationStore';
import { useGlossary } from './GlossaryManager';
import { translateWithPII } from '@/src/hooks/use-pii-translation';
import { useToast } from '@/src/hooks/use-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

type RowStatus = 'pending' | 'translating' | 'done' | 'error';

interface BatchRow {
  id: string;
  source: string;
  target: string;
  status: RowStatus;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRow(source = ''): BatchRow {
  return {
    id: crypto.randomUUID(),
    source,
    target: '',
    status: 'pending',
  };
}

function getStatusBadge(status: RowStatus, error?: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground"
        >
          <Clock className="size-2.5 mr-0.5" />
          Pending
        </Badge>
      );
    case 'translating':
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
        >
          <Loader2 className="size-2.5 mr-0.5 animate-spin" />
          Working
        </Badge>
      );
    case 'done':
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="size-2.5 mr-0.5" />
          Done
        </Badge>
      );
    case 'error':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 cursor-help"
            >
              <AlertCircle className="size-2.5 mr-0.5" />
              Error
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {error || 'Translation failed'}
          </TooltipContent>
        </Tooltip>
      );
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BatchTranslator() {
  const [rows, setRows] = useState<BatchRow[]>([createRow(), createRow(), createRow()]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [totalToTranslate, setTotalToTranslate] = useState(0);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    srcLang,
    tgtLang,
    piiEnabled,
    apiToken,
    setResults,
    startTranslation,
    updateProgress,
    addKnowledgeEntries,
    knowledgeGraphEnabled,
  } = useTranslationStore();

  const { applyGlossary, enabled: glossaryEnabled } = useGlossary();

  // ─── Row operations ──────────────────────────────────────────────────

  const addRows = useCallback((count: number) => {
    setRows((prev) => [...prev, ...Array.from({ length: count }, () => createRow())]);
  }, []);

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRowSource = useCallback((id: string, source: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, source, status: r.target ? 'done' : 'pending', target: source === r.source ? r.target : '' } : r
      )
    );
  }, []);

  const moveRow = useCallback((id: string, direction: 'up' | 'down') => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const newRows = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newRows[idx], newRows[swapIdx]] = [newRows[swapIdx], newRows[idx]];
      return newRows;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRows([createRow()]);
    setIsTranslating(false);
    setTranslatedCount(0);
    setTotalToTranslate(0);
    toast({ title: 'Cleared', description: 'All rows have been reset.' });
  }, [toast]);

  // ─── CSV Import ──────────────────────────────────────────────────────

  const handleCSVImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split(/\r?\n/).filter((l) => l.trim());

          if (lines.length === 0) {
            toast({ title: 'Empty file', description: 'No data found in the CSV.', variant: 'destructive' });
            return;
          }

          // Auto-detect delimiter
          const firstLine = lines[0];
          const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : ',';

          // Parse: use first column as source text, skip header if it looks like one
          const newRows: BatchRow[] = [];
          const startIdx = /^(source|text|input|original|src)/i.test(firstLine.split(delimiter)[0]?.trim() || '')
            ? 1
            : 0;

          for (let i = startIdx; i < lines.length; i++) {
            const cols = lines[i].split(delimiter);
            const sourceText = cols[0]?.trim() || '';
            if (sourceText) {
              newRows.push(createRow(sourceText));
            }
          }

          if (newRows.length === 0) {
            toast({ title: 'No data', description: 'Could not extract text from the CSV.', variant: 'destructive' });
            return;
          }

          setRows((prev) => [...prev, ...newRows]);
          toast({
            title: 'CSV imported',
            description: `${newRows.length} rows added from CSV.`,
          });
        } catch {
          toast({ title: 'Import failed', description: 'Could not parse the CSV file.', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
      if (csvInputRef.current) csvInputRef.current.value = '';
    },
    [toast]
  );

  // ─── Copy & Export ──────────────────────────────────────────────────

  const copyAllResults = useCallback(() => {
    const completedRows = rows.filter((r) => r.status === 'done' && r.target);
    if (completedRows.length === 0) {
      toast({ title: 'Nothing to copy', description: 'No translated results available.', variant: 'destructive' });
      return;
    }
    const text = completedRows.map((r) => `${r.source}\t${r.target}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied', description: `${completedRows.length} results copied as tab-separated text.` });
    });
  }, [rows, toast]);

  const exportCSV = useCallback(
    (format: 'csv' | 'tsv') => {
      const delimiter = format === 'tsv' ? '\t' : ',';
      const completedRows = rows.filter((r) => r.source.trim());
      if (completedRows.length === 0) {
        toast({ title: 'Nothing to export', description: 'No data to export.', variant: 'destructive' });
        return;
      }
      const header = `Source${delimiter}Translation${delimiter}Status`;
      const body = completedRows
        .map((r) => {
          const src = `"${r.source.replace(/"/g, '""')}"`;
          const tgt = `"${r.target.replace(/"/g, '""')}"`;
          return `${src}${delimiter}${tgt}${delimiter}${r.status}`;
        })
        .join('\n');
      const content = `${header}\n${body}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-translation.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Exported', description: `File saved as batch-translation.${format}` });
    },
    [rows, toast]
  );

  // ─── Batch Translation ───────────────────────────────────────────────

  const translateAll = useCallback(async () => {
    const rowsToTranslate = rows.filter((r) => r.source.trim() && r.status !== 'done');
    if (rowsToTranslate.length === 0) {
      toast({ title: 'Nothing to translate', description: 'All rows are empty or already translated.', variant: 'destructive' });
      return;
    }

    if (srcLang === tgtLang) {
      toast({ title: 'Same language', description: 'Source and target languages must be different.', variant: 'destructive' });
      return;
    }

    setIsTranslating(true);
    setTranslatedCount(0);
    setTotalToTranslate(rowsToTranslate.length);
    startTranslation();

    // Mark all as translating
    const rowIdToIndex = new Map<string, number>();
    rowsToTranslate.forEach((r, i) => {
      rowIdToIndex.set(r.id, i);
    });

    setRows((prev) =>
      prev.map((r) =>
        rowIdToIndex.has(r.id) ? { ...r, status: 'translating' as RowStatus, error: undefined } : r
      )
    );

    try {
      const BATCH_SIZE = 10;
      let completed = 0;

      for (let i = 0; i < rowsToTranslate.length; i += BATCH_SIZE) {
        const batchRows = rowsToTranslate.slice(i, i + BATCH_SIZE);
        const batchSentences = batchRows.map((r) => r.source.trim());

        // Apply PII and Glossary pre-processing
        const processedSentences = batchSentences.map((sentence) => {
          // PII protection
          const piiResult = translateWithPII(sentence, piiEnabled);
          const translatableText = piiResult.translatableText.join(' ');

          // Glossary pre-processing
          if (glossaryEnabled) {
            return applyGlossary(translatableText, srcLang, tgtLang);
          }
          return translatableText;
        });

        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sentences: processedSentences,
              src_lang: srcLang,
              tgt_lang: tgtLang,
              api_token: apiToken || undefined,
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Translation API error');
          }

          const data = await response.json();

          if (data.translations && Array.isArray(data.translations)) {
            // Update each row with its translation
            setRows((prev) =>
              prev.map((r) => {
                const batchIdx = batchRows.findIndex((br) => br.id === r.id);
                if (batchIdx === -1) return r;

                const translation = data.translations[batchIdx] as { original: string; translated: string } | undefined;
                if (!translation) {
                  return { ...r, status: 'error' as RowStatus, error: 'No translation returned' };
                }

                let translated = translation.translated;
                // Glossary post-processing
                if (glossaryEnabled) {
                  translated = applyGlossary(translated, srcLang, tgtLang);
                }

                return { ...r, target: translated, status: 'done' as RowStatus, error: undefined };
              })
            );

            // Update knowledge graph
            if (knowledgeGraphEnabled) {
              const entries = data.translations.map(
                (t: { original: string; translated: string }) => ({
                  source: t.original,
                  translation: t.translated,
                  frequency: 1,
                })
              );
              addKnowledgeEntries(entries);
            }
          }

          completed += batchRows.length;
          setTranslatedCount(completed);
          updateProgress(completed, rowsToTranslate.length);
        } catch (batchError) {
          // Mark this batch as error
          const errMsg = batchError instanceof Error ? batchError.message : 'Translation failed';
          setRows((prev) =>
            prev.map((r) => {
              const batchIdx = batchRows.findIndex((br) => br.id === r.id);
              if (batchIdx === -1) return r;
              return { ...r, status: 'error' as RowStatus, error: errMsg };
            })
          );
          completed += batchRows.length;
          setTranslatedCount(completed);
          updateProgress(completed, rowsToTranslate.length);
        }
      }

      // Update the global store with the latest batch results
      const finalRows = rows.filter((r) => r.status === 'done' || rowIdToIndex.has(r.id));
      const doneRows = finalRows.filter((r) => r.status === 'done');
      if (doneRows.length > 0) {
        const originalText = doneRows.map((r) => r.source).join('\n');
        const translatedText = doneRows.map((r) => r.target).join('\n');
        const segments = doneRows.map((r) => ({
          original: r.source,
          translated: r.target,
        }));
        setResults(originalText, translatedText, segments, false);
      }

      const errorCount = rowsToTranslate.length - doneRows.length;
      const description = errorCount > 0
        ? `Translated ${doneRows.length} of ${rowsToTranslate.length} rows. ${errorCount} failed.`
        : `Successfully translated ${doneRows.length} rows from ${srcLang} to ${tgtLang}.`;

      toast({
        title: errorCount > 0 ? 'Batch translation partially complete' : 'Batch translation complete',
        description,
        variant: errorCount > 0 ? 'destructive' : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Batch translation failed', description: message, variant: 'destructive' });
    } finally {
      setIsTranslating(false);
    }
  }, [
    rows,
    srcLang,
    tgtLang,
    piiEnabled,
    apiToken,
    glossaryEnabled,
    applyGlossary,
    knowledgeGraphEnabled,
    startTranslation,
    updateProgress,
    setResults,
    addKnowledgeEntries,
    toast,
  ]);

  // ─── Computed values ──────────────────────────────────────────────────

  const filledCount = rows.filter((r) => r.source.trim()).length;
  const doneCount = rows.filter((r) => r.status === 'done').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const progressPercent = totalToTranslate > 0 ? Math.round((translatedCount / totalToTranslate) * 100) : 0;

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="group relative rounded-xl p-[1px] bg-gradient-to-br from-emerald-500/0 via-teal-500/0 to-amber-500/0 hover:from-emerald-500/40 hover:via-teal-500/30 hover:to-amber-500/40 transition-all duration-500">
      <Card className="relative rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TableProperties className="size-4 text-emerald-600" />
            Batch Translation
          </CardTitle>
          <CardDescription>
            Translate multiple texts at once in a spreadsheet-style interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addRows(1)}
              disabled={isTranslating}
              className="text-xs"
            >
              <Plus className="size-3 mr-1" />
              Add Row
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addRows(5)}
              disabled={isTranslating}
              className="text-xs"
            >
              <Plus className="size-3 mr-1" />
              Add 5 Rows
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              disabled={isTranslating}
              className="text-xs hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400"
            >
              <Trash2 className="size-3 mr-1" />
              Clear All
            </Button>

            <div className="flex-1" />

            {/* Row count */}
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border/50">
              {rows.length} row{rows.length !== 1 ? 's' : ''} &bull; {filledCount} filled
            </Badge>

            {/* CSV import */}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleCSVImport}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => csvInputRef.current?.click()}
              disabled={isTranslating}
              className="text-xs"
            >
              <Upload className="size-3 mr-1" />
              Import CSV
            </Button>
          </div>

          {/* Translate All + Export Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={translateAll}
              disabled={isTranslating || filledCount === 0}
              className={`bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all ${
                filledCount > 0 && !isTranslating ? 'animate-pulse-glow' : ''
              }`}
              size="sm"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Translating... {translatedCount}/{totalToTranslate}
                </>
              ) : (
                <>
                  <Languages className="mr-1.5 size-3.5" />
                  Translate All ({srcLang} → {tgtLang})
                </>
              )}
            </Button>

            <div className="flex-1" />

            {/* Feature indicators */}
            {piiEnabled && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
              >
                PII Shield
              </Badge>
            )}
            {glossaryEnabled && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-teal-300 text-teal-600 dark:border-teal-700 dark:text-teal-400"
              >
                Glossary
              </Badge>
            )}

            {/* Copy & Export */}
            {doneCount > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllResults}
                  disabled={isTranslating}
                  className="text-xs"
                >
                  <Copy className="size-3 mr-1" />
                  Copy All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV('csv')}
                  disabled={isTranslating}
                  className="text-xs"
                >
                  <Download className="size-3 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV('tsv')}
                  disabled={isTranslating}
                  className="text-xs"
                >
                  <FileSpreadsheet className="size-3 mr-1" />
                  TSV
                </Button>
              </>
            )}
          </div>

          {/* Progress Bar */}
          <AnimatePresence>
            {isTranslating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {progressPercent}% complete — {translatedCount}/{totalToTranslate} rows translated
                  {errorCount > 0 && (
                    <span className="ml-1 text-red-500 dark:text-red-400">
                      &bull; {errorCount} error{errorCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary row when done */}
          <AnimatePresence>
            {!isTranslating && doneCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-3"
              >
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {doneCount} of {rows.length} rows translated
                </span>
                {errorCount > 0 && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spreadsheet Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-12 text-center text-[10px] uppercase tracking-wider">
                      #
                    </TableHead>
                    <TableHead className="min-w-[250px] text-[10px] uppercase tracking-wider">
                      Source Text
                    </TableHead>
                    <TableHead className="min-w-[250px] text-[10px] uppercase tracking-wider">
                      Translation
                    </TableHead>
                    <TableHead className="w-24 text-center text-[10px] uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="w-28 text-center text-[10px] uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-xs text-muted-foreground"
                        >
                          No rows. Click &quot;Add Row&quot; to start.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, index) => (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10, height: 0 }}
                          transition={{ duration: 0.15, delay: index * 0.01 }}
                          className={`border-b transition-colors ${
                            row.status === 'done'
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                              : row.status === 'error'
                                ? 'bg-red-50/30 dark:bg-red-950/10'
                                : row.status === 'translating'
                                  ? 'bg-amber-50/30 dark:bg-amber-950/10'
                                  : 'hover:bg-muted/50'
                          }`}
                        >
                          {/* Row number */}
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">
                            {index + 1}
                          </TableCell>

                          {/* Source text input */}
                          <TableCell className="p-1.5">
                            <Input
                              value={row.source}
                              onChange={(e) => updateRowSource(row.id, e.target.value)}
                              placeholder="Enter text to translate..."
                              disabled={isTranslating}
                              className="h-8 text-xs border-dashed focus:border-solid focus:border-emerald-400 dark:focus:border-emerald-600"
                            />
                          </TableCell>

                          {/* Target translation output */}
                          <TableCell className="p-1.5">
                            <div
                              className={`flex items-center h-8 px-3 rounded-md text-xs ${
                                row.target
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                                  : 'bg-muted/30 text-muted-foreground border border-dashed border-muted-foreground/20'
                              }`}
                            >
                              <span className="truncate flex-1">
                                {row.target || (row.source.trim() ? '—' : 'No input')}
                              </span>
                              {row.target && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(row.target);
                                    toast({ title: 'Copied', description: 'Translation copied to clipboard.' });
                                  }}
                                  className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                                  aria-label="Copy translation"
                                >
                                  <Copy className="size-3 text-muted-foreground hover:text-foreground" />
                                </button>
                              )}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            {getStatusBadge(row.status, row.error)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={() => moveRow(row.id, 'up')}
                                    disabled={isTranslating || index === 0}
                                  >
                                    <ArrowUp className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Move up
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={() => moveRow(row.id, 'down')}
                                    disabled={isTranslating || index === rows.length - 1}
                                  >
                                    <ArrowDown className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Move down
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 hover:text-red-500"
                                    onClick={() => deleteRow(row.id)}
                                    disabled={isTranslating}
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Delete row
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bottom info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {srcLang} → {tgtLang}
              {piiEnabled && ' • PII Shield active'}
              {glossaryEnabled && ' • Glossary active'}
            </span>
            <span>
              Batch API: up to 100 sentences per request, 60 req/min
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
