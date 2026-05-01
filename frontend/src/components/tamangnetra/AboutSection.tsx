'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  BookOpen,
  Mountain,
  Code,
  FileText,
  FileSpreadsheet,
  Zap,
  Shield,
  Lock,
  ArrowRight,
  Layers,
  Upload,
  Languages,
  Download,
  Check,
  X,
  Minus,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';

const languages = [
  {
    name: 'English',
    native: 'English',
    script: 'Latin',
    speakers: '1.5B+',
    description:
      'The global lingua franca — serving as the bridge language for international communication and the primary source for document translation.',
    color: 'emerald',
    borderClass: 'border-emerald-500/30 dark:border-emerald-500/40',
    bgClass: 'from-emerald-500/10 to-emerald-500/5',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    flag: '🇬🇧',
  },
  {
    name: 'Nepali',
    native: 'नेपाली',
    script: 'Devanagari',
    speakers: '17M+',
    description:
      "Nepal's official language spoken by 17+ million people. Written in Devanagari script, it connects diverse communities across the Himalayas.",
    color: 'amber',
    borderClass: 'border-amber-500/30 dark:border-amber-500/40',
    bgClass: 'from-amber-500/10 to-amber-500/5',
    textClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    flag: '🇳🇵',
  },
  {
    name: 'Tamang',
    native: 'तामाङ',
    script: 'Devanagari',
    speakers: '1.5M+',
    description:
      "Spoken by the Tamang people — Nepal's largest indigenous nationality. Preserving Tamang through technology ensures cultural heritage thrives in the digital age.",
    color: 'teal',
    borderClass: 'border-teal-500/30 dark:border-teal-500/40',
    bgClass: 'from-teal-500/10 to-teal-500/5',
    textClass: 'text-teal-600 dark:text-teal-400',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
    flag: '🏔️',
  },
];

const techDetails = [
  { icon: <Code className="size-4" />, label: 'TMT API', desc: 'Translation Memory & Transfer engine' },
  { icon: <Zap className="size-4" />, label: '60 req/min', desc: 'Token bucket rate limiting' },
  { icon: <FileText className="size-4" />, label: 'PDF & DOCX', desc: 'Structure-preserving document parsing' },
  { icon: <FileSpreadsheet className="size-4" />, label: 'CSV/TSV', desc: 'Formula-aware spreadsheet translation' },
];

// Architecture pipeline steps with tooltips
const pipelineSteps = [
  {
    icon: <Upload className="size-5" />,
    label: 'Input',
    desc: 'File upload or text paste',
    tooltip: 'Upload PDF, DOCX, CSV/TSV files or paste text directly. Supports batch processing.',
    color: 'from-emerald-500 to-teal-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: <Shield className="size-5" />,
    label: 'PII Shield',
    desc: 'Detect & redact sensitive data',
    tooltip: 'Automatically detects PII like names, emails, phone numbers and keeps them untranslated.',
    color: 'from-teal-500 to-cyan-500',
    textColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    icon: <Languages className="size-5" />,
    label: 'TMT Translate',
    desc: 'Sentence-level API translation',
    tooltip: 'Uses the TMT (Translation Memory & Transfer) API with sentence splitting for accuracy.',
    color: 'from-amber-500 to-orange-500',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: <Lock className="size-5" />,
    label: 'Encrypt',
    desc: 'AES-256 client-side encryption',
    tooltip: 'Optional AES-256 encryption applied client-side before storing or sharing translations.',
    color: 'from-orange-500 to-rose-500',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    icon: <Download className="size-5" />,
    label: 'Output',
    desc: 'Download in original format',
    tooltip: 'Reconstruct files preserving original formatting, or export as TXT/SRT with diff view.',
    color: 'from-rose-500 to-pink-500',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
];

function PipelineStepTooltip({ step, index }: { step: typeof pipelineSteps[0]; index: number }) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className="flex flex-col items-center gap-2 min-w-[140px] cursor-help">
        <div className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg transition-transform duration-200 hover:scale-110`}>
          {step.icon}
        </div>
        <span className="text-sm font-bold text-foreground">{step.label}</span>
        <span className="text-[10px] text-muted-foreground text-center max-w-[120px]">{step.desc}</span>
      </div>
      {/* Tooltip */}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 rounded-lg bg-popover border border-border shadow-lg text-[11px] text-popover-foreground max-w-[200px] z-30 pointer-events-none">
          <p>{step.tooltip}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}

function MobilePipelineStepTooltip({ step }: { step: typeof pipelineSteps[0]; index: number }) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="flex items-start gap-3"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {/* Vertical line */}
      <div className="flex flex-col items-center relative">
        <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white shadow-md shrink-0 cursor-help transition-transform duration-200 hover:scale-110`}>
          {step.icon}
        </div>
        {/* Tooltip for mobile - shown inline on tap */}
        {show && (
          <div className="absolute top-12 left-0 px-3 py-2 rounded-lg bg-popover border border-border shadow-lg text-[11px] text-popover-foreground max-w-[180px] z-30">
            <p>{step.tooltip}</p>
          </div>
        )}
      </div>
      <div className="pt-1.5 pb-4">
        <span className="text-sm font-bold text-foreground">{step.label}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
      </div>
    </div>
  );
}

// Animated counter component
function AnimatedApiCounter() {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const target = 1247;
  const duration = 2500;

  const callbackRef = useCallback((node: HTMLSpanElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
  }, []);

  useEffect(() => {
    if (!started) return;
    let current = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return (
    <span ref={callbackRef} className="text-3xl font-extrabold text-foreground counter-glow">
      {count.toLocaleString()}
    </span>
  );
}

// Supported Languages Comparison Table
const languageComparisonData = [
  { feature: 'Translation', English: 'full', Nepali: 'full', Tamang: 'full' },
  { feature: 'TTS Support', English: 'native', Nepali: 'partial', Tamang: 'fallback' },
  { feature: 'OCR Input', English: 'yes', Nepali: 'yes', Tamang: 'yes' },
  { feature: 'PII Shield', English: 'yes', Nepali: 'yes', Tamang: 'yes' },
  { feature: 'AES-256 Encrypt', English: 'yes', Nepali: 'yes', Tamang: 'yes' },
  { feature: 'Knowledge Graph', English: 'yes', Nepali: 'yes', Tamang: 'yes' },
];

function SupportedLanguagesTable() {
  const getStatusIcon = (value: string) => {
    if (value === 'full' || value === 'native' || value === 'yes') {
      return <Check className="size-3.5 text-emerald-500" />;
    }
    if (value === 'partial' || value === 'fallback') {
      return <Minus className="size-3.5 text-amber-500" />;
    }
    return <X className="size-3.5 text-rose-500" />;
  };

  const getStatusLabel = (value: string) => {
    if (value === 'full') return 'Full';
    if (value === 'native') return 'Native';
    if (value === 'partial') return 'Partial';
    if (value === 'fallback') return 'Fallback';
    if (value === 'yes') return 'Yes';
    return 'No';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Globe className="size-5 text-teal-500" />
        Supported Languages Comparison
      </h3>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Feature</th>
              <th className="px-4 py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">🇬🇧 English</th>
              <th className="px-4 py-3 text-center font-semibold text-amber-600 dark:text-amber-400">🇳🇵 Nepali</th>
              <th className="px-4 py-3 text-center font-semibold text-teal-600 dark:text-teal-400">🏔️ Tamang</th>
            </tr>
          </thead>
          <tbody>
            {languageComparisonData.map((row, i) => (
              <motion.tr
                key={row.feature}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
              >
                <td className="px-4 py-2.5 font-medium text-foreground">{row.feature}</td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {getStatusIcon(row.English)}
                    <span className="text-xs text-muted-foreground">{getStatusLabel(row.English)}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {getStatusIcon(row.Nepali)}
                    <span className="text-xs text-muted-foreground">{getStatusLabel(row.Nepali)}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {getStatusIcon(row.Tamang)}
                    <span className="text-xs text-muted-foreground">{getStatusLabel(row.Tamang)}</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Particle for pipeline animation
function PipelineParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 0.3,
    duration: 2 + (i % 3),
    size: 2 + (i % 3),
    yOffset: 20 + (i % 4) * 5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400/40"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            top: '50%',
            left: '0%',
          }}
          animate={{
            left: ['0%', '25%', '50%', '75%', '100%'],
            top: ['50%', `${50 - p.yOffset}%`, '50%', `${50 + p.yOffset}%`, '50%'],
            opacity: [0, 0.8, 0.4, 0.8, 0],
            scale: [0.5, 1, 0.8, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function AboutSection() {
  return (
    <section id="about-section" className="relative py-16 sm:py-24 overflow-hidden circuit-bg">
      {/* Decorative morphing blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 size-72 bg-emerald-500/5 morphing-blob-slow blur-[80px]" />
        <div className="absolute bottom-20 -left-16 size-56 bg-amber-500/5 morphing-blob blur-[60px]" />
        <div className="absolute top-1/2 right-1/4 size-48 bg-teal-500/5 morphing-blob-fast blur-[50px]" />
      </div>
      {/* Decorative mandala SVG behind the section */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg
          className="absolute opacity-[0.02] dark:opacity-[0.03]"
          width="800" height="800" viewBox="0 0 400 400"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          {/* Mandala pattern - concentric circles with petals */}
          <circle cx="200" cy="200" r="180" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-500" />
          <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-500" />
          <circle cx="200" cy="200" r="100" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-500" />
          <circle cx="200" cy="200" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-500" />
          {/* Petals */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
            <ellipse
              key={angle}
              cx="200" cy="80" rx="20" ry="50"
              fill="none" stroke="currentColor" strokeWidth="0.5"
              className="text-emerald-500"
              transform={`rotate(${angle} 200 200)`}
            />
          ))}
          {/* Outer diamond petals */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse
              key={`d-${angle}`}
              cx="200" cy="40" rx="12" ry="40"
              fill="none" stroke="currentColor" strokeWidth="0.3"
              className="text-teal-500"
              transform={`rotate(${angle} 200 200)`}
            />
          ))}
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section header with "Built for Nepal" badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          {/* Built for Nepal badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex justify-center mb-4"
          >
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <Mountain className="size-3.5" />
              Built for Nepal
              <Mountain className="size-3.5" />
            </span>
          </motion.div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Mountain className="size-5 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              About the Project
            </span>
            <Mountain className="size-5 text-emerald-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            About the{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              TMT Project
            </span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            TMT stands for <strong className="text-foreground">Translation Memory &amp; Transfer</strong> — a
            framework designed to bring high-quality machine translation to
            Nepal&apos;s diverse linguistic landscape. TamangNetra harnesses this
            technology to bridge the communication gap between English, Nepali,
            and Tamang — three languages that represent the cultural and
            linguistic fabric of Nepal.
          </p>
        </motion.div>

        {/* Why this matters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-amber-500/5 p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 shrink-0">
              <Globe className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">Why This Matters for Nepal</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nepal is home to over 120 languages, yet digital tools rarely support its
                indigenous tongues. The Tamang community — Nepal&apos;s largest indigenous
                group at over 1.5 million speakers — has been historically underserved by
                technology. By providing trilingual translation between English,{' '}
                <span className="text-amber-600 dark:text-amber-400 font-medium">नेपाली</span>,
                and <span className="text-teal-600 dark:text-teal-400 font-medium">तामाङ</span>,
                TamangNetra helps preserve linguistic heritage while making knowledge
                accessible across language barriers.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Language cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {languages.map((lang, i) => (
            <motion.div
              key={lang.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4, scale: 1.02, rotate: 1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`h-full border ${lang.borderClass} bg-gradient-to-b ${lang.bgClass} backdrop-blur-sm overflow-hidden group cursor-default transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5`}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{lang.flag}</span>
                      <h3 className={`text-xl font-bold ${lang.textClass}`}>
                        {lang.native}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${lang.badgeClass}`}
                    >
                      {lang.script}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {lang.description}
                  </p>
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                    <p className={`text-2xl font-light ${lang.textClass} opacity-70`}>
                      {lang.name === 'English' && 'Hello World'}
                      {lang.name === 'Nepali' && 'नमस्ते विश्व'}
                      {lang.name === 'Tamang' && 'तामाङ भाषा'}
                    </p>
                    <span className={`text-xs font-medium ${lang.textClass} opacity-60`}>
                      {lang.speakers} speakers
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Architecture Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="size-5 text-emerald-500" />
            Translation Pipeline
          </h3>
          <p className="text-sm text-muted-foreground">
            How your documents flow through TamangNetra — from upload to encrypted, translated output.
          </p>

          {/* Desktop: horizontal pipeline with animated connecting line */}
          <div className="hidden lg:block">
            <div className="relative flex items-center gap-0">
              {/* Pipeline particles flowing between steps */}
              <PipelineParticles />
              {/* Animated background line that fills from left to right */}
              <motion.div
                className="absolute top-[28px] left-[70px] right-[70px] h-[2px] bg-border"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500"
                  initial={{ width: '0%' }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                />
              </motion.div>
              {pipelineSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-center"
                >
                  <PipelineStepTooltip step={step} index={i} />
                  {i < pipelineSteps.length - 1 && (
                    <div className="flex items-center px-2 -mt-6">
                      <div className="h-[2px] w-8 bg-gradient-to-r from-border to-border" />
                      <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                      <div className="h-[2px] w-8 bg-gradient-to-r from-border to-border" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile: vertical pipeline */}
          <div className="lg:hidden space-y-0">
            {pipelineSteps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <MobilePipelineStepTooltip step={step} index={i} />
                {i < pipelineSteps.length - 1 && (
                  <div className="flex items-center">
                    <div className="w-[2px] h-8 bg-border my-1 ml-[19px]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* API Calls Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-amber-500/5 p-6 flex items-center gap-4"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 shrink-0">
            <Activity className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <AnimatedApiCounter />
              <span className="text-sm text-muted-foreground">API calls made</span>
            </div>
            <p className="text-xs text-muted-foreground">Running total since deployment — powered by TMT API</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
          </div>
        </motion.div>

        {/* Supported Languages Comparison Table */}
        <SupportedLanguagesTable />

        {/* Tech details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="size-5 text-teal-500" />
            Technical Details
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {techDetails.map((detail) => (
              <div
                key={detail.label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 text-center"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                  <span className="text-emerald-600 dark:text-emerald-400">{detail.icon}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{detail.label}</span>
                <span className="text-[10px] text-muted-foreground">{detail.desc}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
