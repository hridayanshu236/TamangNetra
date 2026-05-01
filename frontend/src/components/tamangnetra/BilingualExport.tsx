'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  File,
  Code,
  Download,
  Clock,
  Type,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';
import { useTranslationStore } from './TranslationStore';
import { useToast } from '@/src/hooks/use-toast';

type ExportFormat = 'pdf' | 'docx' | 'html';

interface BilingualExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  icon: typeof FileText;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  note?: string;
}> = [
  {
    value: 'pdf',
    label: 'PDF',
    icon: FileText,
    description: 'Two-column layout with headers and page numbers',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    note: 'Devanagari text may not render (uses Helvetica)',
  },
  {
    value: 'docx',
    label: 'DOCX',
    icon: File,
    description: 'Table layout with styled columns and rows',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    note: 'Best Unicode/Devanagari support',
  },
  {
    value: 'html',
    label: 'HTML',
    icon: Code,
    description: 'Print-friendly with CSS grid, responsive design',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    note: 'Open in browser, then Print to PDF',
  },
];

export function BilingualExport({ open, onOpenChange }: BilingualExportProps) {
  const [format, setFormat] = useState<ExportFormat>('docx');
  const [title, setTitle] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const store = useTranslationStore();
  const { toast } = useToast();

  const segments = store.segments;
  const originalText = store.originalText;
  const translatedText = store.translatedText;
  const srcLang = store.srcLang;
  const tgtLang = store.tgtLang;

  const hasData = originalText.length > 0 || translatedText.length > 0 || segments.length > 0;

  const handleExport = useCallback(async () => {
    if (!hasData) {
      toast({
        title: 'No data to export',
        description: 'Please translate some text first.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const body = {
        original: originalText,
        translated: translatedText,
        segments: segments.map((s) => ({ original: s.original, translated: s.translated })),
        src_lang: srcLang,
        tgt_lang: tgtLang,
        format,
        title: title || undefined,
        include_timestamp: includeTimestamp,
      };

      const response = await fetch('/api/export-bilingual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+?)"/);
      const safeTitle = (title || 'bilingual_document').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fallbackFilename = `${safeTitle}.${format}`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameMatch?.[1] || fallbackFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      toast({
        title: 'Export successful',
        description: `Bilingual ${format.toUpperCase()} document downloaded.`,
      });

      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Export failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [hasData, originalText, translatedText, segments, srcLang, tgtLang, format, title, includeTimestamp, toast]);

  // Preview mockup data
  const previewSegments = segments.length > 0
    ? segments.slice(0, 3)
    : [
        { original: 'Sample original text', translated: 'अनुवादित पाठ' },
        { original: 'Another sentence here', translated: 'अर्को वाक्य यहाँ' },
        { original: 'Third example line', translated: 'तेस्रो उदाहरण लाइन' },
      ];

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.value === format)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-emerald-600" />
            Export Bilingual Document
          </DialogTitle>
          <DialogDescription>
            Generate a side-by-side bilingual document with original and translated text.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Language Pair Info */}
          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              {srcLang}
            </Badge>
            <ChevronRight className="size-4 text-muted-foreground" />
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800">
              {tgtLang}
            </Badge>
            <span className="text-muted-foreground text-xs">
              ({segments.length || 0} segments)
            </span>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = format === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormat(opt.value)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all ${
                      isSelected
                        ? `${opt.borderColor} ${opt.bgColor} shadow-sm`
                        : 'border-muted bg-background hover:border-muted-foreground/30'
                    }`}
                  >
                    <Icon className={`size-5 ${isSelected ? opt.color : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-semibold ${isSelected ? opt.color : 'text-muted-foreground'}`}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <motion.div
                        layoutId="format-indicator"
                        className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{selectedFormat.description}</p>
            {selectedFormat.note && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" />
                {selectedFormat.note}
              </p>
            )}
          </div>

          {/* Document Title */}
          <div className="space-y-2">
            <Label htmlFor="export-title" className="text-sm font-medium flex items-center gap-1.5">
              <Type className="size-3.5 text-muted-foreground" />
              Document Title <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="export-title"
              placeholder="My Bilingual Document"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Include Timestamp Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Include timestamp</p>
                <p className="text-xs text-muted-foreground">Add export date/time to the document</p>
              </div>
            </div>
            <Switch
              checked={includeTimestamp}
              onCheckedChange={setIncludeTimestamp}
            />
          </div>

          <Separator />

          {/* Preview Mockup */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Eye className="size-3.5 text-muted-foreground" />
              Preview
            </Label>
            <div className="rounded-lg border bg-muted/30 p-3">
              {/* Mini document header */}
              <div className="mb-2 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                  {title || 'Bilingual Document'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{srcLang}</span>
                  <span className="text-[10px] text-muted-foreground">→</span>
                  <span className="text-[10px] text-muted-foreground">{tgtLang}</span>
                  {includeTimestamp && (
                    <span className="text-[10px] text-muted-foreground ml-1">• Just now</span>
                  )}
                </div>
              </div>

              {/* Mini column headers */}
              <div className="grid grid-cols-2 gap-0 mb-1">
                <div className="text-[10px] font-semibold text-white bg-emerald-700 dark:bg-emerald-800 px-1.5 py-0.5 rounded-l">
                  {srcLang}
                </div>
                <div className="text-[10px] font-semibold text-white bg-emerald-700 dark:bg-emerald-800 px-1.5 py-0.5 rounded-r border-l border-emerald-600">
                  {tgtLang}
                </div>
              </div>

              {/* Mini segments */}
              <div className="space-y-0">
                {previewSegments.map((seg, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-2 gap-0 text-[10px] ${
                      i % 2 === 1 ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    <div className="px-1.5 py-1 border-r border-muted-foreground/10 truncate">
                      <span className="text-muted-foreground/50 mr-0.5">{i + 1}.</span>
                      {seg.original.slice(0, 30)}
                    </div>
                    <div className="px-1.5 py-1 truncate text-emerald-700 dark:text-emerald-400">
                      <span className="text-emerald-500/50 mr-0.5">{i + 1}.</span>
                      {seg.translated.slice(0, 30)}
                    </div>
                  </div>
                ))}
                {segments.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">
                    + {segments.length - 3} more segments...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Export Button */}
          <AnimatePresence mode="wait">
            <motion.div
              key={exportSuccess ? 'success' : isExporting ? 'loading' : 'idle'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                onClick={handleExport}
                disabled={isExporting || !hasData}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Exporting...
                  </>
                ) : exportSuccess ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Export as {format.toUpperCase()}
                  </>
                )}
              </Button>
            </motion.div>
          </AnimatePresence>

          {!hasData && (
            <p className="text-xs text-center text-muted-foreground">
              No translation data available. Translate some text first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
