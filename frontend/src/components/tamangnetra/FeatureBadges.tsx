'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Shield,
  Lock,
  Share2,
  Type,
  ScanLine,
  BookOpen,
  Video,
  PenTool,
  FileText,
  FileSpreadsheet,
  Volume2,
} from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { useTranslationStore } from './TranslationStore';

interface FeatureBadgeItem {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  color: string;
  tooltip: string;
  gradient: string;
}

export function FeatureBadges() {
  const {
    piiEnabled,
    encryptionEnabled,
    knowledgeGraphEnabled,
    fontAdjustEnabled,
  } = useTranslationStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-50px' });

  const features: FeatureBadgeItem[] = [
    {
      label: 'PII Shield',
      icon: <Shield className="size-4" />,
      active: piiEnabled,
      color: 'emerald',
      tooltip: 'Automatically detect and redact PII before translation',
      gradient: 'from-emerald-500/10 to-emerald-600/5',
    },
    {
      label: 'AES-256',
      icon: <Lock className="size-4" />,
      active: encryptionEnabled,
      color: 'amber',
      tooltip: 'Client-side AES-256 encryption for translated output',
      gradient: 'from-amber-500/10 to-amber-600/5',
    },
    {
      label: 'Knowledge Graph',
      icon: <Share2 className="size-4" />,
      active: knowledgeGraphEnabled,
      color: 'teal',
      tooltip: 'Terminology consistency tracking across documents',
      gradient: 'from-teal-500/10 to-teal-600/5',
    },
    {
      label: 'Font Adjust',
      icon: <Type className="size-4" />,
      active: fontAdjustEnabled,
      color: 'orange',
      tooltip: 'Bounding box font size adjustment for target scripts',
      gradient: 'from-orange-500/10 to-orange-600/5',
    },
    {
      label: 'OCR Ready',
      icon: <ScanLine className="size-4" />,
      active: true,
      color: 'emerald',
      tooltip: 'Image OCR with Tesseract.js and pen tool selection',
      gradient: 'from-emerald-400/10 to-cyan-500/5',
    },
    {
      label: '3D Book',
      icon: <BookOpen className="size-4" />,
      active: true,
      color: 'rose',
      tooltip: 'Interactive 3D book view with original and translated pages',
      gradient: 'from-rose-500/10 to-pink-500/5',
    },
    {
      label: 'YouTube SRT',
      icon: <Video className="size-4" />,
      active: true,
      color: 'red',
      tooltip: 'Extract and translate YouTube subtitles with SRT export',
      gradient: 'from-red-500/10 to-red-600/5',
    },
    {
      label: 'Pen Tool',
      icon: <PenTool className="size-4" />,
      active: true,
      color: 'violet',
      tooltip: 'Draw on images to select regions for OCR',
      gradient: 'from-violet-500/10 to-purple-500/5',
    },
    {
      label: 'PDF/DOCX',
      icon: <FileText className="size-4" />,
      active: true,
      color: 'sky',
      tooltip: 'Upload PDF or DOCX files for batch translation',
      gradient: 'from-sky-500/10 to-blue-500/5',
    },
    {
      label: 'CSV Aware',
      icon: <FileSpreadsheet className="size-4" />,
      active: true,
      color: 'green',
      tooltip: 'Formula-aware CSV/TSV translation that skips numbers',
      gradient: 'from-green-500/10 to-emerald-500/5',
    },
    {
      label: 'Audio TTS',
      icon: <Volume2 className="size-4" />,
      active: true,
      color: 'pink',
      tooltip: 'Text-to-speech narration for translated segments',
      gradient: 'from-pink-500/10 to-rose-500/5',
    },
  ];

  const colorMap: Record<string, { active: string; dot: string; glow: string }> = {
    emerald: {
      active: 'border-emerald-400/60 bg-emerald-100/80 text-emerald-800 dark:border-emerald-600/50 dark:bg-emerald-950/60 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      glow: 'shadow-emerald-500/20',
    },
    amber: {
      active: 'border-amber-400/60 bg-amber-100/80 text-amber-800 dark:border-amber-600/50 dark:bg-amber-950/60 dark:text-amber-300',
      dot: 'bg-amber-500',
      glow: 'shadow-amber-500/20',
    },
    teal: {
      active: 'border-teal-400/60 bg-teal-100/80 text-teal-800 dark:border-teal-600/50 dark:bg-teal-950/60 dark:text-teal-300',
      dot: 'bg-teal-500',
      glow: 'shadow-teal-500/20',
    },
    orange: {
      active: 'border-orange-400/60 bg-orange-100/80 text-orange-800 dark:border-orange-600/50 dark:bg-orange-950/60 dark:text-orange-300',
      dot: 'bg-orange-500',
      glow: 'shadow-orange-500/20',
    },
    rose: {
      active: 'border-rose-400/60 bg-rose-100/80 text-rose-800 dark:border-rose-600/50 dark:bg-rose-950/60 dark:text-rose-300',
      dot: 'bg-rose-500',
      glow: 'shadow-rose-500/20',
    },
    red: {
      active: 'border-red-400/60 bg-red-100/80 text-red-800 dark:border-red-600/50 dark:bg-red-950/60 dark:text-red-300',
      dot: 'bg-red-500',
      glow: 'shadow-red-500/20',
    },
    violet: {
      active: 'border-violet-400/60 bg-violet-100/80 text-violet-800 dark:border-violet-600/50 dark:bg-violet-950/60 dark:text-violet-300',
      dot: 'bg-violet-500',
      glow: 'shadow-violet-500/20',
    },
    sky: {
      active: 'border-sky-400/60 bg-sky-100/80 text-sky-800 dark:border-sky-600/50 dark:bg-sky-950/60 dark:text-sky-300',
      dot: 'bg-sky-500',
      glow: 'shadow-sky-500/20',
    },
    green: {
      active: 'border-green-400/60 bg-green-100/80 text-green-800 dark:border-green-600/50 dark:bg-green-950/60 dark:text-green-300',
      dot: 'bg-green-500',
      glow: 'shadow-green-500/20',
    },
    pink: {
      active: 'border-pink-400/60 bg-pink-100/80 text-pink-800 dark:border-pink-600/50 dark:bg-pink-950/60 dark:text-pink-300',
      dot: 'bg-pink-500',
      glow: 'shadow-pink-500/20',
    },
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground/80">Active Features:</span>
        <span className="text-xs text-muted-foreground">
          ({features.filter((f) => f.active).length}/{features.length} enabled)
        </span>
      </div>

      {/* Gradient background strip with marquee */}
      <div className="relative rounded-xl border border-border/50 dark:border-border/40 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-amber-500/5 dark:from-emerald-500/15 dark:via-teal-500/15 dark:to-amber-500/15 p-3 sm:p-4 overflow-hidden">
        {/* Fade edges for marquee */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 dark:from-background/90 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 dark:from-background/90 to-transparent z-10" />
        <TooltipProvider delayDuration={200}>
          {/* Desktop: marquee scroll */}
          <div className="hidden sm:block">
            <div className="animate-marquee flex items-center gap-2 w-max">
              {/* Duplicate items for seamless loop */}
              {[...features, ...features].map((feature, i) => {
                const colors = colorMap[feature.color] || colorMap.emerald;
                return (
                  <motion.div
                    key={`${feature.label}-${i}`}
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
                    transition={{
                      delay: (i % features.length) * 0.06,
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                    }}
                    whileHover={{ scale: 1.12 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`
                            flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                            transition-all duration-200 cursor-default whitespace-nowrap
                            bg-gradient-to-r ${feature.gradient}
                            ${
                              feature.active
                                ? `${colors.active} ${colors.glow} shadow-sm hover:shadow-md`
                                : 'border-muted bg-muted/30 text-muted-foreground opacity-40'
                            }
                          `}
                        >
                          {feature.icon}
                          {feature.label}
                          {feature.active && (
                            <motion.span
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                              className={`size-2 rounded-full ${colors.dot}`}
                            />
                          )}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px]">
                        <p className="text-xs">{feature.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                );
              })}
            </div>
          </div>
          {/* Mobile: horizontal scroll */}
          <div className="flex sm:hidden overflow-x-auto gap-2 pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none max-w-full">
            {features.map((feature, i) => {
              const colors = colorMap[feature.color] || colorMap.emerald;
              return (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
                  transition={{
                    delay: i * 0.06,
                    type: 'spring',
                    stiffness: 300,
                    damping: 15,
                  }}
                  whileHover={{ scale: 1.12 }}
                  className="snap-start shrink-0"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                          transition-all duration-200 cursor-default whitespace-nowrap
                          bg-gradient-to-r ${feature.gradient}
                          ${
                            feature.active
                              ? `${colors.active} ${colors.glow} shadow-sm hover:shadow-md`
                              : 'border-muted bg-muted/30 text-muted-foreground opacity-40'
                          }
                        `}
                      >
                        {feature.icon}
                        {feature.label}
                        {feature.active && (
                          <motion.span
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                            className={`size-2 rounded-full ${colors.dot}`}
                          />
                        )}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px]">
                      <p className="text-xs">{feature.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Gradient bottom border */}
        <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 dark:via-emerald-400/40 to-transparent" />
      </div>
    </div>
  );
}
