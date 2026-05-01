'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  Copy,
  Check,
  Languages,
  ArrowDown,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
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
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { useTranslationStore } from './TranslationStore';
import { useToast } from '@/src/hooks/use-toast';

/* ── Types ── */
interface WordAlignment {
  sourceIndex: number;
  targetIndex: number;
  confidence: number; // 0-1
}

interface AlignedWord {
  text: string;
  index: number;
}

/* ── Simulated alignment algorithm ── */
function computeAlignments(
  sourceWords: string[],
  targetWords: string[]
): WordAlignment[] {
  const alignments: WordAlignment[] = [];
  const maxLen = Math.max(sourceWords.length, targetWords.length);

  for (let i = 0; i < maxLen; i++) {
    const si = Math.min(i, sourceWords.length - 1);
    const ti = Math.min(i, targetWords.length - 1);

    // Simulated confidence based on word characteristics
    const srcWord = sourceWords[si] || '';
    const tgtWord = targetWords[ti] || '';
    let conf = 0.9;

    // Shorter common words get higher confidence
    if (srcWord.length <= 3) conf = 0.95;
    // Technical/longer terms get lower confidence
    if (srcWord.length > 8) conf = 0.5 + Math.random() * 0.2;
    // Medium words
    if (srcWord.length > 4 && srcWord.length <= 8) conf = 0.65 + Math.random() * 0.15;
    // Numbers/punctuation very high confidence
    if (/^[\d,.\-+%]+$/.test(srcWord)) conf = 0.98;

    alignments.push({
      sourceIndex: si,
      targetIndex: ti,
      confidence: Math.min(conf, 1),
    });
  }

  // If more source than target, extra source words align to last target
  if (sourceWords.length > targetWords.length) {
    for (let i = targetWords.length; i < sourceWords.length; i++) {
      alignments.push({
        sourceIndex: i,
        targetIndex: targetWords.length - 1,
        confidence: 0.3 + Math.random() * 0.2,
      });
    }
  }

  return alignments;
}

function getConfidenceColor(confidence: number): string {
  if (confidence > 0.8) return 'emerald';
  if (confidence >= 0.5) return 'amber';
  return 'rose';
}

function getConfidenceStroke(confidence: number, isDark: boolean): string {
  if (confidence > 0.8) return isDark ? '#34d399' : '#10b981';
  if (confidence >= 0.5) return isDark ? '#fbbf24' : '#f59e0b';
  return isDark ? '#fb7185' : '#f43f5e';
}

function getConfidenceBg(confidence: number): string {
  if (confidence > 0.8) return 'bg-emerald-100 dark:bg-emerald-950/30';
  if (confidence >= 0.5) return 'bg-amber-100 dark:bg-amber-950/30';
  return 'bg-rose-100 dark:bg-rose-950/30';
}

function getConfidenceBorder(confidence: number): string {
  if (confidence > 0.8) return 'border-emerald-300 dark:border-emerald-700';
  if (confidence >= 0.5) return 'border-amber-300 dark:border-amber-700';
  return 'border-rose-300 dark:border-rose-700';
}

function getConfidenceText(confidence: number): string {
  if (confidence > 0.8) return 'text-emerald-700 dark:text-emerald-400';
  if (confidence >= 0.5) return 'text-amber-700 dark:text-amber-400';
  return 'text-rose-700 dark:text-rose-400';
}

/* ── Alternative words popover for a given word ── */
function AlternativeWordsPopover({
  word,
  confidence,
  isSource,
  language,
}: {
  word: string;
  confidence: number;
  isSource: boolean;
  language: string;
}) {
  const alternatives = useMemo(() => {
    const seed = word.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const altCount = 2 + (seed % 3);
    const result = [];

    if (isSource) {
      if (language === 'English') {
        result.push(word + ' (literal)');
        result.push('[' + word + '] (contextual)');
      } else {
        result.push(word + ' (direct)');
        result.push('~' + word + '~ (idiomatic)');
      }
    } else {
      result.push(word + ' (primary)');
      result.push(word + '* (secondary)');
    }

    for (let i = result.length; i < altCount; i++) {
      result.push(word + '{' + i + '}');
    }
    return result;
  }, [word, isSource, language]);

  return (
    <PopoverContent className="w-56 p-3" side="bottom">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Alternatives</p>
          <Badge
            variant="outline"
            className={`text-[10px] ${getConfidenceBorder(confidence)} ${getConfidenceText(confidence)}`}
          >
            {Math.round(confidence * 100)}%
          </Badge>
        </div>
        <div className="space-y-1">
          {alternatives.map((alt, i) => (
            <button
              key={i}
              className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted/80 transition-colors"
            >
              {alt}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Click to select an alternative translation
        </p>
      </div>
    </PopoverContent>
  );
}

/* ── Main Component ── */
export function WordAlignmentView() {
  const store = useTranslationStore();
  const { toast } = useToast();
  const [hoveredWord, setHoveredWord] = useState<{ type: 'source' | 'target'; index: number } | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const segments = store.segments;
  const srcLang = store.srcLang;
  const tgtLang = store.tgtLang;

  // Check dark mode and responsive
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkDark();
    checkMobile();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', checkMobile);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Compute word alignments per segment
  const segmentAlignments = useMemo(() => {
    return segments.map((seg) => {
      const sourceWords = seg.original.trim().split(/\s+/).filter(Boolean);
      const targetWords = seg.translated.trim().split(/\s+/).filter(Boolean);
      const alignments = computeAlignments(sourceWords, targetWords);
      return { sourceWords, targetWords, alignments };
    });
  }, [segments]);

  // Get active alignments for hovered word
  const activeAlignments = useMemo(() => {
    if (!hoveredWord) return new Set<string>();
    const key = `${hoveredWord.type}-${hoveredWord.index}`;
    return new Set([key]);
  }, [hoveredWord]);

  const handleCopyAll = useCallback(async () => {
    const text = segments.map((seg, i) => {
      const al = segmentAlignments[i];
      const srcLine = al.sourceWords.join(' ');
      const tgtLine = al.targetWords.join(' ');
      return `[Segment ${i + 1}]\nSource: ${srcLine}\nTarget: ${tgtLine}`;
    }).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast({ title: 'Copied', description: 'Alignment data copied to clipboard.' });
  }, [segments, segmentAlignments, toast]);

  if (segments.length === 0) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center gap-4"
          >
            <div className="relative">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
                <Link2 className="size-8 text-emerald-500/60" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 size-3 rounded-full bg-teal-400"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No Alignment Data</p>
              <p className="text-xs text-muted-foreground mt-1">
                Translate text to see word-by-word alignment visualization
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden">
        {/* Gradient header accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

        <CardHeader className="pb-3 p-4 sm:p-6 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-4 text-emerald-600" />
              Word Alignment
              <Badge variant="outline" className="text-xs font-normal border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                {segments.length} segments
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  High
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Medium
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-rose-500" />
                  Low
                </span>
              </div>
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
                {copiedAll ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="max-h-[600px]">
            <div ref={containerRef} className="space-y-8">
              {segmentAlignments.map((segAlign, segIdx) => {
                const { sourceWords, targetWords, alignments } = segAlign;

                return (
                  <motion.div
                    key={segIdx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: segIdx * 0.05 }}
                    className="relative"
                  >
                    {/* Segment header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`shrink-0 flex size-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${segIdx % 3 === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : segIdx % 3 === 1 ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>
                        {segIdx + 1}
                      </span>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>

                    {isMobile ? (
                      /* ── Mobile: Vertical layout ── */
                      <div className="space-y-2">
                        {/* Source words */}
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Languages className="size-3" />
                            {srcLang}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {sourceWords.map((word, wi) => {
                              const alignment = alignments.find(a => a.sourceIndex === wi);
                              const confColor = alignment ? getConfidenceColor(alignment.confidence) : 'emerald';
                              const isHovered = hoveredWord?.type === 'source' && hoveredWord.index === wi;
                              const isConnected = hoveredWord && alignments.some(a => {
                                if (hoveredWord.type === 'source') return a.sourceIndex === hoveredWord.index && a.targetIndex === wi;
                                return a.targetIndex === hoveredWord.index && a.sourceIndex === wi;
                              });

                              return (
                                <Popover key={wi}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: wi * 0.03 }}
                                            onMouseEnter={() => setHoveredWord({ type: 'source', index: wi })}
                                            onMouseLeave={() => setHoveredWord(null)}
                                            className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 cursor-pointer
                                              ${getConfidenceBg(alignment?.confidence ?? 0.9)}
                                              ${getConfidenceBorder(alignment?.confidence ?? 0.9)}
                                              ${isHovered || isConnected ? 'ring-2 ring-offset-1' : ''}
                                              ${isHovered || isConnected ? confColor === 'emerald' ? 'ring-emerald-400' : confColor === 'amber' ? 'ring-amber-400' : 'ring-rose-400' : ''}
                                              hover:shadow-sm`}
                                          >
                                            {word}
                                          </motion.button>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{alignment ? `${Math.round(alignment.confidence * 100)}% confidence` : 'No alignment'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <AlternativeWordsPopover
                                    word={word}
                                    confidence={alignment?.confidence ?? 0.5}
                                    isSource={true}
                                    language={srcLang}
                                  />
                                </Popover>
                              );
                            })}
                          </div>
                        </div>

                        {/* Connecting arrows (vertical) */}
                        <div className="flex justify-center py-1">
                          <motion.div
                            initial={{ opacity: 0, scaleY: 0 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          >
                            <ArrowDown className="size-4 text-emerald-500/50" />
                          </motion.div>
                        </div>

                        {/* Target words */}
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Languages className="size-3" />
                            {tgtLang}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {targetWords.map((word, wi) => {
                              const alignment = alignments.find(a => a.targetIndex === wi);
                              const confColor = alignment ? getConfidenceColor(alignment.confidence) : 'emerald';
                              const isHovered = hoveredWord?.type === 'target' && hoveredWord.index === wi;
                              const isConnected = hoveredWord && alignments.some(a => {
                                if (hoveredWord.type === 'target') return a.targetIndex === hoveredWord.index && a.sourceIndex === wi;
                                return a.sourceIndex === hoveredWord.index && a.targetIndex === wi;
                              });

                              return (
                                <Popover key={wi}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: wi * 0.03 + 0.15 }}
                                            onMouseEnter={() => setHoveredWord({ type: 'target', index: wi })}
                                            onMouseLeave={() => setHoveredWord(null)}
                                            className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 cursor-pointer
                                              ${getConfidenceBg(alignment?.confidence ?? 0.9)}
                                              ${getConfidenceBorder(alignment?.confidence ?? 0.9)}
                                              ${isHovered || isConnected ? 'ring-2 ring-offset-1' : ''}
                                              ${isHovered || isConnected ? confColor === 'emerald' ? 'ring-emerald-400' : confColor === 'amber' ? 'ring-amber-400' : 'ring-rose-400' : ''}
                                              hover:shadow-sm`}
                                          >
                                            {word}
                                          </motion.button>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{alignment ? `${Math.round(alignment.confidence * 100)}% confidence` : 'No alignment'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <AlternativeWordsPopover
                                    word={word}
                                    confidence={alignment?.confidence ?? 0.5}
                                    isSource={false}
                                    language={tgtLang}
                                  />
                                </Popover>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Desktop: Horizontal layout with SVG lines ── */
                      <div className="relative">
                        {/* Source words row */}
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Languages className="size-3" />
                            {srcLang}
                          </p>
                          <div className="flex flex-wrap gap-1.5" id={`source-row-${segIdx}`}>
                            {sourceWords.map((word, wi) => {
                              const alignment = alignments.find(a => a.sourceIndex === wi);
                              const confColor = alignment ? getConfidenceColor(alignment.confidence) : 'emerald';
                              const isHovered = hoveredWord?.type === 'source' && hoveredWord.index === wi;
                              const connectedTargetIndices = alignments
                                .filter(a => a.sourceIndex === wi)
                                .map(a => a.targetIndex);
                              const isConnected = hoveredWord && hoveredWord.type === 'target' && connectedTargetIndices.includes(hoveredWord.index);

                              return (
                                <Popover key={wi}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <motion.button
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: wi * 0.04 }}
                                            data-source-idx={wi}
                                            data-seg-idx={segIdx}
                                            onMouseEnter={() => setHoveredWord({ type: 'source', index: wi })}
                                            onMouseLeave={() => setHoveredWord(null)}
                                            className={`source-word px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 cursor-pointer
                                              ${getConfidenceBg(alignment?.confidence ?? 0.9)}
                                              ${getConfidenceBorder(alignment?.confidence ?? 0.9)}
                                              ${isHovered || isConnected ? 'ring-2 ring-offset-1 scale-110' : ''}
                                              ${isHovered || isConnected ? confColor === 'emerald' ? 'ring-emerald-400' : confColor === 'amber' ? 'ring-amber-400' : 'ring-rose-400' : ''}
                                              hover:shadow-sm hover:scale-105`}
                                          >
                                            {word}
                                          </motion.button>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{alignment ? `${Math.round(alignment.confidence * 100)}% confidence` : 'No alignment'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <AlternativeWordsPopover
                                    word={word}
                                    confidence={alignment?.confidence ?? 0.5}
                                    isSource={true}
                                    language={srcLang}
                                  />
                                </Popover>
                              );
                            })}
                          </div>
                        </div>

                        {/* SVG alignment lines */}
                        <div className="relative h-16 my-1">
                          <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            preserveAspectRatio="none"
                          >
                            {alignments.map((alignment, ai) => {
                              const strokeColor = getConfidenceStroke(alignment.confidence, isDark);
                              const isHighlighted =
                                (hoveredWord?.type === 'source' && hoveredWord.index === alignment.sourceIndex) ||
                                (hoveredWord?.type === 'target' && hoveredWord.index === alignment.targetIndex);
                              const opacity = hoveredWord ? (isHighlighted ? 0.9 : 0.1) : 0.4;
                              const strokeWidth = isHighlighted ? 2.5 : 1.5;

                              // Calculate positions based on word index proportions
                              const srcX = sourceWords.length > 1
                                ? (alignment.sourceIndex / (sourceWords.length - 1)) * 100
                                : 50;
                              const tgtX = targetWords.length > 1
                                ? (alignment.targetIndex / (targetWords.length - 1)) * 100
                                : 50;

                              return (
                                <motion.line
                                  key={ai}
                                  x1={`${srcX}%`}
                                  y1="0"
                                  x2={`${tgtX}%`}
                                  y2="100%"
                                  stroke={strokeColor}
                                  strokeWidth={strokeWidth}
                                  strokeOpacity={opacity}
                                  strokeLinecap="round"
                                  initial={{ pathLength: 0, opacity: 0 }}
                                  animate={{ pathLength: 1, opacity: 1 }}
                                  transition={{ duration: 0.6, delay: ai * 0.06, ease: 'easeOut' }}
                                />
                              );
                            })}
                          </svg>
                        </div>

                        {/* Target words row */}
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Languages className="size-3" />
                            {tgtLang}
                          </p>
                          <div className="flex flex-wrap gap-1.5" id={`target-row-${segIdx}`}>
                            {targetWords.map((word, wi) => {
                              const alignment = alignments.find(a => a.targetIndex === wi);
                              const confColor = alignment ? getConfidenceColor(alignment.confidence) : 'emerald';
                              const isHovered = hoveredWord?.type === 'target' && hoveredWord.index === wi;
                              const connectedSourceIndices = alignments
                                .filter(a => a.targetIndex === wi)
                                .map(a => a.sourceIndex);
                              const isConnected = hoveredWord && hoveredWord.type === 'source' && connectedSourceIndices.includes(hoveredWord.index);

                              return (
                                <Popover key={wi}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: wi * 0.04 + 0.2 }}
                                            data-target-idx={wi}
                                            data-seg-idx={segIdx}
                                            onMouseEnter={() => setHoveredWord({ type: 'target', index: wi })}
                                            onMouseLeave={() => setHoveredWord(null)}
                                            className={`target-word px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 cursor-pointer
                                              ${getConfidenceBg(alignment?.confidence ?? 0.9)}
                                              ${getConfidenceBorder(alignment?.confidence ?? 0.9)}
                                              ${isHovered || isConnected ? 'ring-2 ring-offset-1 scale-110' : ''}
                                              ${isHovered || isConnected ? confColor === 'emerald' ? 'ring-emerald-400' : confColor === 'amber' ? 'ring-amber-400' : 'ring-rose-400' : ''}
                                              hover:shadow-sm hover:scale-105`}
                                          >
                                            {word}
                                          </motion.button>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{alignment ? `${Math.round(alignment.confidence * 100)}% confidence` : 'No alignment'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <AlternativeWordsPopover
                                    word={word}
                                    confidence={alignment?.confidence ?? 0.5}
                                    isSource={false}
                                    language={tgtLang}
                                  />
                                </Popover>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
