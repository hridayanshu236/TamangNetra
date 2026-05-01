'use client';

import { useState, useCallback, useMemo, useEffect, useRef, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  Download,
  Copy,
  Check,
  FileText,
  MessageSquare,
  Lock,
  LockOpen,
  FileDown,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileType,
  Subtitles,
  Trash2,
  ArrowUpFromLine,
  Pin,
  PinOff,
  ArrowUp,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { useTranslationStore } from './TranslationStore';
import { useToast } from '@/src/hooks/use-toast';
import { decryptPayload, isEncryptionActive } from '@/src/hooks/use-encryption';
import { BilingualExport } from './BilingualExport';
import { InteractiveOutputSkeleton } from './SkeletonLoaders';
import { TTSPlayer, SegmentTTSButton } from './TTSPlayer';
import { ShareTranslation } from './ShareTranslation';

interface InteractiveOutputProps {
  originalText?: string;
  translatedText?: string;
  srcLang?: string;
  tgtLang?: string;
  segments?: Array<{ original: string; translated: string }>;
  fileType?: 'pdf' | 'docx' | 'csv' | 'tsv' | 'srt';
}

/* ── Empty State SVG illustration ── */
function EmptyStateIllustration() {
  return (
    <svg
      width="160"
      height="140"
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto opacity-70"
    >
      {/* Left document (source) */}
      <rect x="10" y="15" width="55" height="75" rx="5" className="stroke-current text-emerald-500/30" strokeWidth="1.5" fill="none" />
      <path d="M50 15 L65 30 L50 30 Z" className="fill-current text-emerald-500/10" />
      <line x1="18" y1="38" x2="50" y2="38" className="stroke-current text-emerald-500/30" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="46" x2="42" y2="46" className="stroke-current text-emerald-500/25" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="54" x2="48" y2="54" className="stroke-current text-emerald-500/20" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="62" x2="38" y2="62" className="stroke-current text-emerald-500/15" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right document (translated) */}
      <rect x="95" y="15" width="55" height="75" rx="5" className="stroke-current text-teal-500/30" strokeWidth="1.5" fill="none" />
      <path d="M135 15 L150 30 L135 30 Z" className="fill-current text-teal-500/10" />
      <line x1="103" y1="38" x2="135" y2="38" className="stroke-current text-teal-500/30" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="103" y1="46" x2="128" y2="46" className="stroke-current text-teal-500/25" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="103" y1="54" x2="132" y2="54" className="stroke-current text-teal-500/20" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="103" y1="62" x2="122" y2="62" className="stroke-current text-teal-500/15" strokeWidth="1.5" strokeLinecap="round" />
      {/* Central translation arrow */}
      <path d="M68 48 L88 48" className="stroke-current text-amber-500/50" strokeWidth="2" strokeLinecap="round" />
      <path d="M85 44 L91 48 L85 52" className="stroke-current text-amber-500/50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Pulsing connection dots */}
      <circle cx="78" cy="48" r="2" className="fill-current text-amber-500/40">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Language labels */}
      <text x="37" y="105" textAnchor="middle" className="fill-current text-emerald-500/40" fontSize="8" fontFamily="sans-serif">Source</text>
      <text x="122" y="105" textAnchor="middle" className="fill-current text-teal-500/40" fontSize="8" fontFamily="sans-serif">Target</text>
      {/* Sparkle decorations */}
      <circle cx="80" cy="30" r="1.5" className="fill-current text-emerald-500/40">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="80" cy="68" r="1" className="fill-current text-teal-500/30">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="80" cy="80" r="1.5" className="fill-current text-amber-500/30">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.2s" repeatCount="indefinite" />
      </circle>
      {/* Bracket connectors */}
      <path d="M65 35 Q78 35 78 42" className="stroke-current text-emerald-400/20" strokeWidth="1" fill="none" />
      <path d="M95 35 Q82 35 82 42" className="stroke-current text-teal-400/20" strokeWidth="1" fill="none" />
    </svg>
  );
}

/* ── Sound Wave Bars Animation for TTS ── */
function SoundWaveBars({ active = true }: { active?: boolean }) {
  const barCount = 4;
  return (
    <div className="flex items-end gap-[2px] h-3.5" role="status" aria-label="Speaking">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-emerald-500"
          animate={active ? {
            height: [3, 12, 5, 10, 3],
          } : { height: 3 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
          style={{ height: 3 }}
        />
      ))}
    </div>
  );
}

export function InteractiveOutput({
  originalText: propOriginal,
  translatedText: propTranslated,
  srcLang: propSrcLang,
  tgtLang: propTgtLang,
  segments: propSegments,
  fileType,
}: InteractiveOutputProps) {
  const [viewMode, setViewMode] = useState<'side' | 'original' | 'translated'>(
    'side'
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [typingIndex, setTypingIndex] = useState(-1);
  const [ttsOpen, setTtsOpen] = useState(false);
  const [ttsSegmentSpeaking, setTtsSegmentSpeaking] = useState<number | null>(null);
  const [readAloudActive, setReadAloudActive] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [readAloudLang, setReadAloudLang] = useState<'source' | 'target'>('target');
  const [pinnedSegments, setPinnedSegments] = useState<Set<number>>(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const [rippleIndex, setRippleIndex] = useState<number | null>(null);
  const [copiedSegIndex, setCopiedSegIndex] = useState<number | null>(null);
  const originalScrollRef = useRef<HTMLDivElement>(null);
  const translatedScrollRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const store = useTranslationStore();
  const rawOriginalText = propOriginal || store.originalText;
  const rawTranslatedText = propTranslated || store.translatedText;
  const srcLang = propSrcLang || store.srcLang;
  const tgtLang = propTgtLang || store.tgtLang;
  const rawSegments = propSegments || store.segments;
  const effectiveFileType = fileType || (store.originalFileType as 'pdf' | 'docx' | 'csv' | 'tsv' | 'srt' | undefined);
  const isEncrypted = store.isEncrypted && isEncryptionActive(store.encryptionKey);

  // Decrypt data if encrypted and user wants to see decrypted text
  const originalText = useMemo(() => {
    if (isEncrypted && showDecrypted) {
      return decryptPayload(rawOriginalText, store.encryptionKey);
    }
    return rawOriginalText;
  }, [isEncrypted, showDecrypted, rawOriginalText, store.encryptionKey]);

  const translatedText = useMemo(() => {
    if (isEncrypted && showDecrypted) {
      return decryptPayload(rawTranslatedText, store.encryptionKey);
    }
    return rawTranslatedText;
  }, [isEncrypted, showDecrypted, rawTranslatedText, store.encryptionKey]);

  const segments = useMemo(() => {
    if (isEncrypted && showDecrypted) {
      return rawSegments.map((s) => ({
        original: decryptPayload(s.original, store.encryptionKey),
        translated: decryptPayload(s.translated, store.encryptionKey),
      }));
    }
    return rawSegments;
  }, [isEncrypted, showDecrypted, rawSegments, store.encryptionKey]);

  const hasResults = rawOriginalText.length > 0 || rawTranslatedText.length > 0;

  // Word count for the translated text
  const translatedWordCount = useMemo(() => {
    if (!translatedText) return 0;
    return translatedText.trim().split(/\s+/).filter(Boolean).length;
  }, [translatedText]);

  // Determine if a segment text is "long" (more than 3 lines when rendered)
  const isLongSegment = useCallback((text: string) => {
    const lineCount = text.split('\n').length;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    return lineCount > 3 || wordCount > 40;
  }, []);

  const toggleExpand = useCallback((index: number) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSegmentClick = useCallback((index: number) => {
    setRippleIndex(index);
    setTimeout(() => setRippleIndex(null), 600);
  }, []);

  // Typing effect when results first appear
  useEffect(() => {
    if (hasResults && segments.length > 0) {
      setTypingIndex(0);
      const timer = setInterval(() => {
        setTypingIndex((prev) => {
          if (prev >= segments.length - 1) {
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 80);
      return () => clearInterval(timer);
    } else {
      setTypingIndex(-1);
    }
  }, [hasResults, segments.length]);

  // Scroll-to-top detection within output area
  useEffect(() => {
    const checkScroll = () => {
      const el = translatedScrollRef.current || originalScrollRef.current;
      if (el) {
        const scrollEl = el.querySelector('[data-radix-scroll-area-viewport]') || el;
        setShowScrollTop((scrollEl as HTMLElement).scrollTop > 200);
      }
    };
    const el = translatedScrollRef.current || originalScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [hasResults]);

  const togglePin = useCallback((index: number) => {
    setPinnedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const scrollToTop = useCallback(() => {
    const el = translatedScrollRef.current || originalScrollRef.current;
    if (el) {
      const viewport = el.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, []);

  const handleCopy = useCallback(
    async (text: string, index: number) => {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: 'Copied',
        description: isEncrypted && !showDecrypted
          ? 'Encrypted text copied to clipboard.'
          : 'Text copied to clipboard.',
      });
    },
    [toast, isEncrypted, showDecrypted]
  );

  const handleSpeak = useCallback(
    (text: string, lang: string, index: number) => {
      if (isEncrypted && !showDecrypted) {
        toast({
          title: 'Cannot speak encrypted text',
          description: 'Decrypt the text first to use text-to-speech.',
          variant: 'destructive',
        });
        return;
      }

      if (!('speechSynthesis' in window)) {
        toast({
          title: 'Not supported',
          description: 'Speech synthesis is not available in this browser.',
          variant: 'destructive',
        });
        return;
      }

      if (speakingIndex === index) {
        window.speechSynthesis.cancel();
        setSpeakingIndex(null);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      const langMap: Record<string, string> = {
        English: 'en-US',
        Nepali: 'ne-NP',
        Tamang: 'ne-NP',
      };
      utterance.lang = langMap[lang] || 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);

      setSpeakingIndex(index);
      window.speechSynthesis.speak(utterance);
    },
    [speakingIndex, toast, isEncrypted, showDecrypted]
  );

  const handleDownloadTXT = useCallback(() => {
    const content =
      viewMode === 'original'
        ? originalText
        : viewMode === 'translated'
          ? translatedText
          : `=== ORIGINAL (${srcLang}) ===\n${originalText}\n\n=== TRANSLATION (${tgtLang}) ===\n${translatedText}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation_${srcLang}_to_${tgtLang}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: isEncrypted && !showDecrypted
        ? 'Encrypted translation file downloaded.'
        : 'Translation file downloaded as TXT.',
    });
  }, [viewMode, originalText, translatedText, srcLang, tgtLang, toast, isEncrypted, showDecrypted]);

  const handleDownloadSRT = useCallback(() => {
    const srtLines: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const startSeconds = i * 5;
      const endSeconds = startSeconds + 4;
      const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(sec)).padStart(2, '0')},000`;
      };
      srtLines.push(String(i + 1));
      srtLines.push(`${formatTime(startSeconds)} --> ${formatTime(endSeconds)}`);
      srtLines.push(seg.translated);
      srtLines.push('');
    }

    const srtContent = srtLines.join('\n');
    const blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation_${srcLang}_to_${tgtLang}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'SRT Downloaded',
      description: `${segments.length} subtitle segments exported.`,
    });
  }, [segments, srcLang, tgtLang, toast]);

  const handleDownloadReconstructed = useCallback(async () => {
    if (!effectiveFileType || effectiveFileType === 'txt') {
      handleDownloadTXT();
      return;
    }

    setIsDownloading(true);
    try {
      const body = {
        originalContent: store.originalFileContent || undefined,
        translatedSegments: segments.map((s) => ({
          original: s.original,
          translated: s.translated,
        })),
        fileType: effectiveFileType,
        fileName: store.originalFileName || `document.${effectiveFileType}`,
        srcLang,
        tgtLang,
      };

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+?)"/);
      a.download = filenameMatch?.[1] || `translated_document.${effectiveFileType}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Reconstructed File Downloaded',
        description: `Translated ${effectiveFileType.toUpperCase()} file has been downloaded.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Download Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  }, [effectiveFileType, segments, store.originalFileContent, store.originalFileName, srcLang, tgtLang, toast, handleDownloadTXT]);

  const handleCopyAll = useCallback(async () => {
    const content = viewMode === 'original'
      ? originalText
      : viewMode === 'translated'
        ? translatedText
        : `Original (${srcLang}):
${originalText}

Translation (${tgtLang}):
${translatedText}`;
    await navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast({
      title: 'Copied All',
      description: 'Full text copied to clipboard.',
    });
  }, [viewMode, originalText, translatedText, srcLang, tgtLang, toast]);

  const handleResetResults = useCallback(() => {
    store.resetResults();
    setPinnedSegments(new Set());
    toast({
      title: 'Results cleared',
      description: 'Translation results have been reset.',
    });
  }, [store, toast]);

  const handleToggleDecrypt = useCallback(() => {
    setShowDecrypted((prev) => !prev);
  }, []);

  // Per-segment TTS speak handler
  const handleSegmentSpeak = useCallback(
    (text: string, lang: string, segmentIndex?: number) => {
      if (isEncrypted && !showDecrypted) return;

      if (!('speechSynthesis' in window)) return;

      if (ttsSegmentSpeaking !== null && (segmentIndex === undefined || ttsSegmentSpeaking === segmentIndex)) {
        window.speechSynthesis.cancel();
        setTtsSegmentSpeaking(null);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<string, string> = {
        English: 'en-US',
        Nepali: 'ne-NP',
        Tamang: 'ne-NP',
      };
      utterance.lang = langMap[lang] || 'en-US';
      utterance.rate = ttsSpeed;
      utterance.onend = () => setTtsSegmentSpeaking(null);
      utterance.onerror = () => setTtsSegmentSpeaking(null);
      if (segmentIndex !== undefined) setTtsSegmentSpeaking(segmentIndex);
      window.speechSynthesis.speak(utterance);
    },
    [isEncrypted, showDecrypted, ttsSegmentSpeaking, ttsSpeed]
  );

  // Read Aloud: reads all translated text with speed control
  const readAloudRef = useRef<number>(0);
  const handleReadAloud = useCallback(() => {
    if (isEncrypted && !showDecrypted) {
      toast({ title: 'Cannot read encrypted text', description: 'Decrypt the text first.', variant: 'destructive' });
      return;
    }
    if (!('speechSynthesis' in window)) {
      toast({ title: 'Not supported', description: 'Speech synthesis is not available.', variant: 'destructive' });
      return;
    }

    if (readAloudActive) {
      window.speechSynthesis.cancel();
      setReadAloudActive(false);
      readAloudRef.current = 0;
      return;
    }

    setReadAloudActive(true);
    const textToRead = readAloudLang === 'source' ? originalText : translatedText;
    const langForRead = readAloudLang === 'source' ? srcLang : tgtLang;

    if (!textToRead.trim()) {
      setReadAloudActive(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    const langMap: Record<string, string> = {
      English: 'en-US',
      Nepali: 'ne-NP',
      Tamang: 'ne-NP',
    };
    utterance.lang = langMap[langForRead] || 'en-US';
    utterance.rate = ttsSpeed;
    utterance.onend = () => {
      setReadAloudActive(false);
      readAloudRef.current = 0;
    };
    utterance.onerror = () => {
      setReadAloudActive(false);
      readAloudRef.current = 0;
    };
    window.speechSynthesis.speak(utterance);
  }, [readAloudActive, readAloudLang, originalText, translatedText, srcLang, tgtLang, ttsSpeed, isEncrypted, showDecrypted, toast]);

  // Cleanup read aloud on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Scroll into view when results appear
  useEffect(() => {
    if (hasResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [hasResults]);

  // Copy individual segment
  const handleCopySegment = useCallback(async (text: string, segIndex: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedSegIndex(segIndex);
    setTimeout(() => setCopiedSegIndex(null), 2000);
    toast({ title: 'Segment Copied', description: 'Segment text copied to clipboard.' });
  }, [toast]);

  if (!hasResults) {
    return null;
  }

  return (
    <motion.div
      ref={resultsRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="card-hover relative overflow-hidden">
        {/* Gradient top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />
        <CardHeader className="pb-3 p-4 sm:p-6 bg-gradient-to-b from-emerald-50/60 to-transparent dark:from-emerald-950/20 dark:to-transparent shadow-sm shadow-muted-foreground/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-emerald-600" />
              Interactive Output
              {translatedWordCount > 0 && (
                <Badge variant="outline" className="text-xs font-normal border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                  {translatedWordCount} words
                </Badge>
              )}
              {fileType && (
                <Badge variant="outline" className="text-xs font-normal">
                  .{fileType}
                </Badge>
              )}
              {isEncrypted && (
                <Badge variant="outline" className="text-xs font-normal border-amber-300 text-amber-600">
                  {showDecrypted ? (
                    <LockOpen className="size-3 mr-1" />
                  ) : (
                    <Lock className="size-3 mr-1" />
                  )}
                  {showDecrypted ? 'Decrypted' : 'AES-256 Encrypted'}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Encryption toggle */}
              {isEncrypted && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleToggleDecrypt}
                >
                  {showDecrypted ? (
                    <>
                      <Lock className="size-3" />
                      Re-encrypt
                    </>
                  ) : (
                    <>
                      <LockOpen className="size-3" />
                      Decrypt
                    </>
                  )}
                </Button>
              )}
              {/* Read Aloud button with speaking animation */}
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs gap-1 transition-all ${readAloudActive ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400'}`}
                onClick={handleReadAloud}
              >
                {readAloudActive ? (
                  <SoundWaveBars active />
                ) : (
                  <Volume2 className="size-3" />
                )}
                {readAloudActive ? '🔊 Playing...' : 'Read Aloud'}
              </Button>
              {/* Speed control for TTS */}
              <div className="flex items-center gap-1.5 h-7">
                <span className="text-[10px] text-muted-foreground">Speed:</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.25}
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                  className="w-16 h-1 accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-muted-foreground min-w-[2rem]">{ttsSpeed}x</span>
              </div>
              {/* Listen / TTS Player button */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                onClick={() => setTtsOpen(!ttsOpen)}
              >
                <Volume2 className="size-3" />
                {ttsOpen ? 'Close Player' : 'Listen'}
              </Button>
              {/* Export Bilingual button */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                onClick={() => setExportOpen(true)}
              >
                <ArrowUpFromLine className="size-3" />
                Export
              </Button>
              {/* Copy All button */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleCopyAll}
              >
                {copiedAll ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copiedAll ? 'Copied' : 'Copy All'}
              </Button>
              {/* Share Translation button */}
              <ShareTranslation
                originalText={originalText}
                translatedText={translatedText}
                srcLang={srcLang}
                tgtLang={tgtLang}
                segments={segments}
              />
              {/* Reset Results button */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400"
                onClick={handleResetResults}
              >
                <Trash2 className="size-3" />
                Reset
              </Button>
              {/* View mode toggles */}
              <div className="flex items-center rounded-lg border bg-muted p-0.5">
                {(['side', 'original', 'translated'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      viewMode === mode
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode === 'side'
                      ? 'Side by Side'
                      : mode === 'original'
                        ? srcLang
                        : tgtLang}
                  </button>
                ))}
              </div>
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <Download className="size-3.5 animate-pulse" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Download options</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleDownloadTXT}>
                    <FileText className="size-4 mr-2" />
                    Download as TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadSRT} disabled={segments.length === 0}>
                    <Subtitles className="size-4 mr-2" />
                    Download as SRT
                  </DropdownMenuItem>
                  {effectiveFileType && effectiveFileType !== 'txt' && effectiveFileType !== 'srt' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDownloadReconstructed} disabled={isDownloading}>
                        {effectiveFileType === 'csv' || effectiveFileType === 'tsv' ? (
                          <FileSpreadsheet className="size-4 mr-2" />
                        ) : effectiveFileType === 'pdf' ? (
                          <FileType className="size-4 mr-2" />
                        ) : (
                          <FileDown className="size-4 mr-2" />
                        )}
                        Download Reconstructed .{effectiveFileType.toUpperCase()}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Encryption notice */}
          <AnimatePresence>
            {isEncrypted && !showDecrypted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-3"
              >
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Data is encrypted with AES-256
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Click &quot;Decrypt&quot; above to view plaintext. Data is stored encrypted and only decrypted on-demand.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Side by Side View */}
          <div
            className={`grid gap-4 ${
              viewMode === 'side'
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1'
            }`}
          >
            {/* Original */}
            {(viewMode === 'side' || viewMode === 'original') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Original ({srcLang})
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleSpeak(originalText, srcLang, -1)}
                    >
                      <Volume2
                        className={`size-3.5 ${
                          speakingIndex === -1
                            ? 'text-emerald-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleCopy(originalText, -1)}
                    >
                      {copiedIndex === -1 ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                <ScrollArea ref={originalScrollRef} className="max-h-96 rounded-lg border bg-muted/20 p-4">
                  {segments.length > 0 && !(isEncrypted && !showDecrypted) ? (
                    <div className="space-y-1">
                      {segments.map((seg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: typingIndex >= i ? 1 : 0, x: typingIndex >= i ? 0 : -20 }}
                          transition={{ duration: 0.3 }}
                          whileHover={{ scale: 1.01 }}
                          className="relative"
                        >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`group flex items-start gap-2 rounded px-1.5 py-1 transition-all duration-200 cursor-default hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] dark:hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] border-l-2 hover:border-emerald-400 dark:hover:border-emerald-500 ${i % 2 === 1 ? 'bg-muted/30' : ''} ${pinnedSegments.has(i) ? 'pin-highlight border-l-emerald-500 dark:border-l-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/10' : 'border-l-transparent'}`}
                                onClick={() => handleSegmentClick(i)}
                              >
                                {/* Ripple effect */}
                                {rippleIndex === i && (
                                  <motion.span
                                    className="absolute inset-0 rounded bg-emerald-400/20 dark:bg-emerald-400/10 pointer-events-none"
                                    initial={{ scale: 0, opacity: 0.6 }}
                                    animate={{ scale: 2.5, opacity: 0 }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    style={{ originX: '50%', originY: '50%' }}
                                  />
                                )}
                                {/* Gradient number badge */}
                                <span className={`shrink-0 mt-0.5 flex size-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${i % 3 === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : i % 3 === 1 ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm leading-relaxed ${isLongSegment(seg.original) && !expandedSegments.has(i) ? 'line-clamp-3' : ''}`}>
                                    {seg.original}
                                  </p>
                                  {isLongSegment(seg.original) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleExpand(i); }}
                                      className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                    >
                                      {expandedSegments.has(i) ? <><ChevronUp className="size-3" />Show less</> : <><ChevronDown className="size-3" />Show more</>}
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCopySegment(seg.original, i + 2000); }}
                                    className="p-0.5 rounded transition-colors text-muted-foreground/40 hover:text-emerald-600 dark:hover:text-emerald-400"
                                    title="Copy segment"
                                  >
                                    {copiedSegIndex === i + 2000 ? (
                                      <Check className="size-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="size-3" />
                                    )}
                                  </button>
                                  <SegmentTTSButton
                                    text={seg.original}
                                    lang={srcLang}
                                    isSpeaking={ttsSegmentSpeaking === i}
                                    onSpeak={() => {
                                      setTtsSegmentSpeaking(i);
                                      handleSegmentSpeak(seg.original, srcLang, i);
                                    }}
                                    disabled={isEncrypted && !showDecrypted}
                                  />
                                  <button
                                    onClick={() => togglePin(i)}
                                    className={`p-0.5 rounded transition-colors ${pinnedSegments.has(i) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                                    title={pinnedSegments.has(i) ? 'Unpin segment' : 'Pin segment'}
                                  >
                                    <Pin className="size-3" />
                                  </button>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm">
                              <p className="text-xs font-medium">
                                {tgtLang} translation:
                              </p>
                              <p className="text-xs">{seg.translated}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm whitespace-pre-wrap ${isEncrypted && !showDecrypted ? 'font-mono text-xs break-all' : ''}`}>
                      {originalText}
                    </p>
                  )}
                </ScrollArea>
                {/* Scroll to top button */}
                <AnimatePresence>
                  {showScrollTop && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={scrollToTop}
                      className="absolute bottom-2 right-2 z-10 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors"
                      aria-label="Scroll to top"
                    >
                      <ArrowUp className="size-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
                </div>
              </div>
            )}

            {/* Translated */}
            {(viewMode === 'side' || viewMode === 'translated') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Translated ({tgtLang})
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleSpeak(translatedText, tgtLang, -2)}
                    >
                      <Volume2
                        className={`size-3.5 ${
                          speakingIndex === -2
                            ? 'text-emerald-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleCopy(translatedText, -2)}
                    >
                      {copiedIndex === -2 ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                <ScrollArea ref={translatedScrollRef} className="max-h-96 rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/10 p-4">
                  {segments.length > 0 && !(isEncrypted && !showDecrypted) ? (
                    <div className="space-y-1">
                      {segments.map((seg, i) => (
                        <motion.div
                          key={`t-${i}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: typingIndex >= i ? 1 : 0, x: typingIndex >= i ? 0 : 20 }}
                          transition={{ duration: 0.3 }}
                          whileHover={{ scale: 1.01 }}
                          className="relative"
                        >
                        <Popover>
                          <PopoverTrigger asChild>
                            <div
                              className={`group flex items-start gap-2 rounded px-1.5 py-1 transition-all duration-200 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 hover:shadow-[0_0_12px_rgba(16,185,129,0.25)] dark:hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] border-l-2 hover:border-emerald-400 dark:hover:border-emerald-500 ${i % 2 === 1 ? 'bg-emerald-50/20 dark:bg-emerald-950/5' : ''} ${pinnedSegments.has(i) ? 'pin-highlight border-l-emerald-500 dark:border-l-emerald-400 bg-emerald-100/40 dark:bg-emerald-950/15' : 'border-l-transparent'} animate-segment-flip`}
                              onClick={() => handleSegmentClick(i)}
                            >
                              {/* Ripple effect */}
                              {rippleIndex === i && (
                                <motion.span
                                  className="absolute inset-0 rounded bg-emerald-400/20 dark:bg-emerald-400/10 pointer-events-none"
                                  initial={{ scale: 0, opacity: 0.6 }}
                                  animate={{ scale: 2.5, opacity: 0 }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                  style={{ originX: '50%', originY: '50%' }}
                                />
                              )}
                              {/* Gradient number badge */}
                              <span className={`shrink-0 mt-0.5 flex size-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${i % 3 === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : i % 3 === 1 ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-relaxed ${isLongSegment(seg.translated) && !expandedSegments.has(i) ? 'line-clamp-3' : ''}`}>
                                  {seg.translated}
                                </p>
                                {isLongSegment(seg.translated) && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(i); }}
                                    className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                  >
                                    {expandedSegments.has(i) ? <><ChevronUp className="size-3" />Show less</> : <><ChevronDown className="size-3" />Show more</>}
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopySegment(seg.translated, i + 3000); }}
                                  className="p-0.5 rounded transition-colors text-muted-foreground/40 hover:text-emerald-600 dark:hover:text-emerald-400"
                                  title="Copy translated segment"
                                >
                                  {copiedSegIndex === i + 3000 ? (
                                    <Check className="size-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                                <SegmentTTSButton
                                  text={seg.translated}
                                  lang={tgtLang}
                                  isSpeaking={ttsSegmentSpeaking === i + 1000}
                                  onSpeak={() => {
                                    setTtsSegmentSpeaking(i + 1000);
                                    handleSegmentSpeak(seg.translated, tgtLang, i + 1000);
                                  }}
                                  disabled={isEncrypted && !showDecrypted}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePin(i);
                                  }}
                                  className={`p-0.5 rounded transition-colors ${pinnedSegments.has(i) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                                  title={pinnedSegments.has(i) ? 'Unpin segment' : 'Pin segment'}
                                >
                                  {pinnedSegments.has(i) ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                                </button>
                              </div>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" side="bottom">
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  Original ({srcLang})
                                </p>
                                <p className="text-sm">{seg.original}</p>
                              </div>
                              <Separator />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  Translation ({tgtLang})
                                </p>
                                <p className="text-sm">{seg.translated}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() =>
                                    handleSpeak(seg.translated, tgtLang, i)
                                  }
                                >
                                  <Volume2 className="size-3 mr-1" />
                                  Listen
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() =>
                                    handleCopy(seg.translated, i)
                                  }
                                >
                                  {copiedIndex === i ? (
                                    <Check className="size-3 mr-1" />
                                  ) : (
                                    <Copy className="size-3 mr-1" />
                                  )}
                                  Copy
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm whitespace-pre-wrap ${isEncrypted && !showDecrypted ? 'font-mono text-xs break-all' : ''}`}>
                      {translatedText}
                    </p>
                  )}
                </ScrollArea>

                {/* Scroll to top button */}
                <AnimatePresence>
                  {showScrollTop && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={scrollToTop}
                      className="absolute bottom-2 right-2 z-10 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors"
                      aria-label="Scroll to top"
                    >
                      <ArrowUp className="size-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              </div>
            )}
          </div>

          {/* Segment count + pinned count */}
          {segments.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {segments.length} segments translated
                  {isEncrypted && !showDecrypted && ' (encrypted)'}
                </p>
              </div>
              {pinnedSegments.size > 0 && (
                <div className="flex items-center gap-1.5">
                  <Pin className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {pinnedSegments.size} pinned
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TTS Player */}
      <div className="mt-4">
        <TTSPlayer open={ttsOpen} onOpenChange={setTtsOpen} />
      </div>

      {/* Bilingual Export Dialog */}
      <BilingualExport open={exportOpen} onOpenChange={setExportOpen} />
    </motion.div>
  );
}
