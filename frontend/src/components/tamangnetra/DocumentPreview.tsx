'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FileSpreadsheet,
  File,
  Download,
  ArrowRight,
  Languages,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Progress } from '@/src/components/ui/progress';
import { useTranslationStore } from '@/src/components/tamangnetra/TranslationStore';

type FileType = 'pdf' | 'docx' | 'csv' | 'txt' | 'unknown';

function getFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'txt' || ext === 'srt') return 'txt';
  return 'unknown';
}

function getFileTypeConfig(type: FileType) {
  switch (type) {
    case 'pdf':
      return {
        icon: FileText,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-900/30',
        label: 'PDF Document',
      };
    case 'docx':
      return {
        icon: FileText,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        borderColor: 'border-blue-200 dark:border-blue-900/30',
        label: 'Word Document',
      };
    case 'csv':
      return {
        icon: FileSpreadsheet,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
        borderColor: 'border-emerald-200 dark:border-emerald-900/30',
        label: 'Spreadsheet',
      };
    case 'txt':
      return {
        icon: File,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50 dark:bg-amber-950/20',
        borderColor: 'border-amber-200 dark:border-amber-900/30',
        label: 'Text File',
      };
    default:
      return {
        icon: File,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        borderColor: 'border-border',
        label: 'Document',
      };
  }
}

function DocumentIcon({ type, className = '' }: { type: FileType; className?: string }) {
  const config = getFileTypeConfig(type);
  const Icon = config.icon;

  if (type === 'pdf') {
    return (
      <div className={`relative ${className}`}>
        <div className="w-12 h-16 rounded-sm bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex flex-col items-center justify-center shadow-sm">
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-200 dark:bg-red-900/60 rounded-sm rotate-12" />
          <span className="text-[8px] font-bold text-red-600 dark:text-red-400">PDF</span>
        </div>
      </div>
    );
  }

  if (type === 'docx') {
    return (
      <div className={`relative ${className}`}>
        <div className="w-12 h-16 rounded-sm bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex flex-col items-center justify-center shadow-sm">
          <div className="space-y-0.5 mb-1">
            <div className="w-6 h-0.5 bg-blue-300 dark:bg-blue-700 rounded" />
            <div className="w-5 h-0.5 bg-blue-300 dark:bg-blue-700 rounded" />
            <div className="w-6 h-0.5 bg-blue-300 dark:bg-blue-700 rounded" />
          </div>
          <span className="text-[7px] font-bold text-blue-600 dark:text-blue-400">DOC</span>
        </div>
      </div>
    );
  }

  if (type === 'csv') {
    return (
      <div className={`relative ${className}`}>
        <div className="w-12 h-16 rounded-sm bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex flex-col items-center justify-center shadow-sm">
          <div className="grid grid-cols-3 gap-px mb-1">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className="w-1.5 h-1.5 bg-emerald-300 dark:bg-emerald-700 rounded-[1px]"
              />
            ))}
          </div>
          <span className="text-[7px] font-bold text-emerald-600 dark:text-emerald-400">CSV</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="w-12 h-16 rounded-sm bg-muted/50 border border-border flex flex-col items-center justify-center shadow-sm">
        <Icon className="size-5 text-muted-foreground" />
      </div>
    </div>
  );
}

function DocumentFrame({
  title,
  text,
  type,
  lang,
  side,
}: {
  title: string;
  text: string;
  type: FileType;
  lang: string;
  side: 'left' | 'right';
}) {
  const lines = text.split('\n').filter(Boolean);
  const displayLines = lines.slice(0, 20);

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      transition={{ duration: 0.4 }}
      className="flex-1 min-w-0"
    >
      <div
        className={`rounded-xl border bg-card/80 dark:bg-card/60 backdrop-blur-sm overflow-hidden ${
          side === 'left'
            ? 'border-emerald-200/50 dark:border-emerald-900/30'
            : 'border-teal-200/50 dark:border-teal-900/30'
        }`}
      >
        {/* Header bar */}
        <div
          className={`flex items-center gap-2 px-3 py-2 border-b ${
            side === 'left'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30'
              : 'bg-teal-50/80 dark:bg-teal-950/20 border-teal-200/50 dark:border-teal-900/30'
          }`}
        >
          <DocumentIcon type={type} className="scale-75 origin-left" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{title}</p>
            <p className="text-[10px] text-muted-foreground">
              {lang} • {lines.length} line{lines.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-[9px] shrink-0 ${
              side === 'left'
                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'border-teal-500/30 text-teal-600 dark:text-teal-400'
            }`}
          >
            {side === 'left' ? 'Original' : 'Translated'}
          </Badge>
        </div>

        {/* Document body */}
        <div className="p-3 max-h-64 overflow-y-auto custom-scrollbar">
          {displayLines.length > 0 ? (
            <div className="space-y-1.5">
              {displayLines.map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="text-xs leading-relaxed text-foreground/90 font-mono whitespace-pre-wrap break-words"
                >
                  <span className="text-muted-foreground/40 mr-2 select-none text-[10px]">
                    {idx + 1}
                  </span>
                  {line}
                </motion.div>
              ))}
              {lines.length > 20 && (
                <p className="text-[10px] text-muted-foreground/50 italic text-center pt-2">
                  ... {lines.length - 20} more lines
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground/40">
              <p className="text-xs">No content</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function DocumentPreview() {
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'original' | 'translated'>('split');

  const {
    originalText,
    translatedText,
    segments,
    srcLang,
    tgtLang,
    originalFileName,
    originalFileType,
    completedSegments,
    totalSegments,
    isTranslating,
  } = useTranslationStore();

  const fileType = useMemo<FileType>(() => {
    if (originalFileType) {
      const ext = originalFileType.split('/').pop()?.toLowerCase() ?? '';
      if (ext === 'pdf') return 'pdf';
      if (ext.includes('word') || ext.includes('docx')) return 'docx';
      if (ext.includes('csv') || ext.includes('spreadsheet')) return 'csv';
      if (ext.includes('text')) return 'txt';
    }
    if (originalFileName) return getFileType(originalFileName);
    return 'txt';
  }, [originalFileType, originalFileName]);

  const fileName = originalFileName || 'document.txt';
  const hasContent = originalText.length > 0 || translatedText.length > 0;
  const translatedCount = segments.filter((s) => s.translated.trim().length > 0).length;
  const segmentTotal = segments.length || totalSegments || 0;
  const segmentProgress = segmentTotal > 0 ? translatedCount : completedSegments;
  const progressPercent =
    segmentTotal > 0 ? Math.round((segmentProgress / segmentTotal) * 100) : 0;

  // Calculate file size approximation
  const fileSizeKB = useMemo(() => {
    const totalBytes = new Blob([originalText + translatedText]).size;
    if (totalBytes < 1024) return `${totalBytes} B`;
    return `${(totalBytes / 1024).toFixed(1)} KB`;
  }, [originalText, translatedText]);

  // Pagination for segments
  const segmentsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(segments.length / segmentsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);

  if (!hasContent && !isTranslating) {
    return (
      <Card className="border-border/50 bg-card/50 dark:bg-card/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="size-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center mb-4">
              <FileText className="size-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-sm font-semibold text-foreground/70">No Document Preview</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Upload a document and translate it to see a visual split preview of the original and
              translated content.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* File metadata bar */}
      <Card className="border-border/50 bg-card/50 dark:bg-card/30 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <DocumentIcon type={fileType} className="scale-90" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{fileSizeKB}</span>
                <span className="text-[10px] text-muted-foreground">
                  {getFileTypeConfig(fileType).label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {segmentTotal} segment{segmentTotal !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Languages className="size-3" />
                  {srcLang} → {tgtLang}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* View mode toggle */}
              <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/30">
                {(['split', 'original', 'translated'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      viewMode === mode
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode === 'split' ? 'Split' : mode === 'original' ? 'Source' : 'Target'}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                asChild
              >
                <a
                  href={`/api/download?format=txt&XTransformPort=3000`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="size-3" />
                  Download
                </a>
              </Button>
            </div>
          </div>

          {/* Segment progress */}
          {segmentTotal > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {isTranslating ? 'Translating...' : 'Translation Progress'}
                </span>
                <span className="text-[10px] font-medium text-foreground">
                  {segmentProgress}/{segmentTotal} segments ({progressPercent}%)
                </span>
              </div>
              <Progress
                value={progressPercent}
                className="h-1.5 bg-muted/50"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document split view */}
      <div className="space-y-4">
        {/* Mobile view mode toggle */}
        <div className="flex sm:hidden items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/30 w-fit">
          {(['split', 'original', 'translated'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                viewMode === mode
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'split' ? 'Split' : mode === 'original' ? 'Source' : 'Target'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'split' ? (
            <div
              key="split"
              className="flex flex-col sm:flex-row gap-4 items-stretch"
            >
              <DocumentFrame
                title="Original Document"
                text={originalText}
                type={fileType}
                lang={srcLang}
                side="left"
              />

              {/* Animated arrow */}
              <div className="hidden sm:flex items-center justify-center shrink-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="size-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <ArrowRight className="size-4 text-white" />
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {srcLang} → {tgtLang}
                  </span>
                </motion.div>
              </div>

              {/* Mobile arrow */}
              <div className="flex sm:hidden items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <div className="size-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 rotate-90">
                    <ArrowRight className="size-3.5 text-white" />
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {srcLang} → {tgtLang}
                  </span>
                </motion.div>
              </div>

              <DocumentFrame
                title="Translated Document"
                text={translatedText}
                type={fileType}
                lang={tgtLang}
                side="right"
              />
            </div>
          ) : viewMode === 'original' ? (
            <DocumentFrame
              key="original"
              title="Original Document"
              text={originalText}
              type={fileType}
              lang={srcLang}
              side="left"
            />
          ) : (
            <DocumentFrame
              key="translated"
              title="Translated Document"
              text={translatedText}
              type={fileType}
              lang={tgtLang}
              side="right"
            />
          )}
        </AnimatePresence>

        {/* Segment-level view */}
        {segments.length > 0 && (
          <Card className="border-border/50 bg-card/50 dark:bg-card/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-teal-500" />
                  <h4 className="text-sm font-semibold text-foreground">Segment View</h4>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setCurrentPage(Math.max(0, safeCurrentPage - 1))}
                      disabled={safeCurrentPage === 0}
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground min-w-[60px] text-center">
                      {safeCurrentPage + 1} / {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, safeCurrentPage + 1))}
                      disabled={safeCurrentPage === totalPages - 1}
                    >
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {segments
                  .slice(safeCurrentPage * segmentsPerPage, (safeCurrentPage + 1) * segmentsPerPage)
                  .map((segment, idx) => {
                    const globalIdx = safeCurrentPage * segmentsPerPage + idx;
                    const isTranslated = segment.translated.trim().length > 0;
                    return (
                      <motion.div
                        key={globalIdx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`rounded-lg border p-2.5 transition-colors ${
                          isTranslated
                            ? 'border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10'
                            : 'border-border/50 bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="shrink-0 mt-0.5">
                            <div
                              className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                isTranslated
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-muted border border-border text-muted-foreground'
                              }`}
                            >
                              {globalIdx + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs text-foreground/80 leading-relaxed break-words">
                              {segment.original}
                            </p>
                            {isTranslated && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.3 }}
                                className="flex items-start gap-1.5"
                              >
                                <ArrowRight className="size-3 text-teal-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-teal-600 dark:text-teal-400 leading-relaxed break-words">
                                  {segment.translated}
                                </p>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
