'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  ArrowRightLeft,
  Upload,
  CloudUpload,
  FileSpreadsheet,
  Play,
  Camera,
  ScanLine,
  ClipboardPaste,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';

// ── Shared animation variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// ── Floating particle dots for subtle background ──
function ParticleBackground() {
  const particles = [
    { size: 4, x: '10%', y: '20%', color: 'bg-emerald-400/20', delay: 0 },
    { size: 3, x: '80%', y: '15%', color: 'bg-teal-400/20', delay: 0.5 },
    { size: 5, x: '70%', y: '75%', color: 'bg-amber-400/20', delay: 1 },
    { size: 3, x: '20%', y: '80%', color: 'bg-emerald-400/15', delay: 1.5 },
    { size: 4, x: '50%', y: '10%', color: 'bg-teal-400/15', delay: 2 },
    { size: 3, x: '90%', y: '50%', color: 'bg-amber-400/15', delay: 0.8 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${p.color}`}
          style={{
            width: p.size,
            height: p.size,
            left: p.x,
            top: p.y,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ── 1. TranslationEmptyState ──
interface TranslationEmptyStateProps {
  onTryDemo?: () => void;
  onUploadFile?: () => void;
  onPasteText?: () => void;
}

export function TranslationEmptyState({
  onTryDemo,
  onUploadFile,
  onPasteText,
}: TranslationEmptyStateProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative flex flex-col items-center justify-center py-10 px-4 text-center overflow-hidden rounded-xl bg-gradient-to-b from-emerald-50/50 via-transparent to-transparent dark:from-emerald-950/20"
    >
      <ParticleBackground />

      {/* Animated document icon with floating arrows */}
      <motion.div variants={itemVariants} className="relative mb-4">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border border-emerald-200/60 dark:border-emerald-700/40">
            <FileText className="size-9 text-emerald-600 dark:text-emerald-400" />
          </div>
        </motion.div>

        {/* Floating translation arrows */}
        <motion.div
          className="absolute -right-3 -top-2"
          animate={{ x: [0, 4, 0], y: [0, -3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40 border border-teal-200/60 dark:border-teal-700/40">
            <ArrowRightLeft className="size-3.5 text-teal-600 dark:text-teal-400" />
          </div>
        </motion.div>

        <motion.div
          className="absolute -left-3 -bottom-1"
          animate={{ x: [0, -3, 0], y: [0, 3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200/60 dark:border-amber-700/40">
            <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" />
          </div>
        </motion.div>
      </motion.div>

      <motion.h3
        variants={itemVariants}
        className="text-base font-semibold text-foreground mb-1"
      >
        Start by typing or uploading a document
      </motion.h3>
      <motion.p
        variants={itemVariants}
        className="text-sm text-muted-foreground mb-5 max-w-xs"
      >
        Translate between English, Nepali, and Tamang with PII protection and encryption.
      </motion.p>

      {/* Quick-action buttons */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        <Button
          variant="default"
          size="sm"
          onClick={onTryDemo}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 gap-1.5"
        >
          <Sparkles className="size-3.5" />
          Try Demo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onUploadFile}
          className="gap-1.5 hover:border-teal-300 hover:text-teal-600 dark:hover:border-teal-700 dark:hover:text-teal-400"
        >
          <Upload className="size-3.5" />
          Upload File
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPasteText}
          className="gap-1.5 hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-700 dark:hover:text-amber-400"
        >
          <ClipboardPaste className="size-3.5" />
          Paste Text
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ── 2. FileUploadEmptyState ──
interface FileUploadEmptyStateProps {
  onClick?: () => void;
}

export function FileUploadEmptyState({ onClick }: FileUploadEmptyStateProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative flex flex-col items-center justify-center py-10 px-4 text-center cursor-pointer"
      onClick={onClick}
    >
      {/* Animated cloud/upload icon */}
      <motion.div variants={itemVariants} className="relative mb-4">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200/50 dark:border-emerald-700/30">
            <CloudUpload className="size-9 text-emerald-500 dark:text-emerald-400" />
          </div>
        </motion.div>
      </motion.div>

      <motion.h3
        variants={itemVariants}
        className="text-sm font-semibold text-foreground mb-1"
      >
        Drop your file here or click to browse
      </motion.h3>
      <motion.p
        variants={itemVariants}
        className="text-xs text-muted-foreground mb-3"
      >
        Upload a document to extract and translate its content
      </motion.p>

      {/* Supported format badges */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-center gap-1.5 mb-2"
      >
        <span className="inline-flex items-center gap-1 rounded bg-red-100/80 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
          <FileText className="size-2.5" /> PDF
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-blue-100/80 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
          <FileText className="size-2.5" /> DOCX
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <FileSpreadsheet className="size-2.5" /> CSV/TSV
        </span>
      </motion.div>

      <motion.p
        variants={itemVariants}
        className="text-[10px] text-muted-foreground/60"
      >
        Max 1MB
      </motion.p>
    </motion.div>
  );
}

// ── 3. YouTubeEmptyState ──
export function YouTubeEmptyState() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative flex flex-col items-center justify-center py-10 px-4 text-center overflow-hidden rounded-xl bg-gradient-to-b from-red-50/30 via-transparent to-transparent dark:from-red-950/10"
    >
      {/* Animated play button icon */}
      <motion.div variants={itemVariants} className="relative mb-4">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border border-red-200/50 dark:border-red-700/30">
            <Play className="size-9 text-red-500 dark:text-red-400 ml-1" />
          </div>
        </motion.div>

        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-red-300/40 dark:border-red-600/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.div>

      <motion.h3
        variants={itemVariants}
        className="text-base font-semibold text-foreground mb-1"
      >
        Paste a YouTube URL to translate subtitles
      </motion.h3>
      <motion.p
        variants={itemVariants}
        className="text-sm text-muted-foreground mb-3 max-w-xs"
      >
        Extract captions from any YouTube video and translate them into your target language.
      </motion.p>
      <motion.div
        variants={itemVariants}
        className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/20 px-3 py-1.5"
      >
        <p className="text-xs font-mono text-muted-foreground">
          https://youtube.com/watch?v=dQw4w9WgXcQ
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── 4. ImageOCREmptyState ──
export function ImageOCREmptyState() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative flex flex-col items-center justify-center py-10 px-4 text-center overflow-hidden rounded-xl bg-gradient-to-b from-amber-50/30 via-transparent to-transparent dark:from-amber-950/10"
    >
      {/* Animated camera/scan icon */}
      <motion.div variants={itemVariants} className="relative mb-4">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/50 dark:border-amber-700/30">
            <Camera className="size-9 text-amber-600 dark:text-amber-400" />
          </div>
        </motion.div>

        {/* Scan line animation */}
        <motion.div
          className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent dark:via-amber-500/60"
          animate={{ top: ['20%', '80%', '20%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.h3
        variants={itemVariants}
        className="text-base font-semibold text-foreground mb-1"
      >
        Upload an image to extract and translate text
      </motion.h3>
      <motion.p
        variants={itemVariants}
        className="text-sm text-muted-foreground mb-3 max-w-xs"
      >
        Use OCR to detect text in images, then translate it with the pen tool for area selection.
      </motion.p>
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        <span className="rounded bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          PNG
        </span>
        <span className="rounded bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          JPG
        </span>
        <span className="rounded bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          WEBP
        </span>
        <span className="text-[10px] text-muted-foreground/50 mx-1">•</span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <ScanLine className="size-2.5" /> Tesseract.js OCR
        </span>
      </motion.div>
    </motion.div>
  );
}
