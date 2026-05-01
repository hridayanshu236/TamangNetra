'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Upload,
  Settings,
  Sparkles,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';

interface StepData {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
  iconBg: string;
  animatedIcon: React.ReactNode;
}

const steps: StepData[] = [
  {
    number: 1,
    icon: <Upload className="size-6" />,
    title: 'Upload or Paste',
    description:
      'Upload PDF, DOCX, or CSV files — or simply paste your text directly. Drag & drop supported for a seamless experience.',
    gradient: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    animatedIcon: <UploadArrowAnimation />,
  },
  {
    number: 2,
    icon: <Settings className="size-6" />,
    title: 'Configure',
    description:
      'Choose your language pair (English ↔ Nepali ↔ Tamang). Enable PII scrubbing, encryption, or knowledge graph features.',
    gradient: 'from-teal-500 to-cyan-500',
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    animatedIcon: <SettingsGearAnimation />,
  },
  {
    number: 3,
    icon: <Sparkles className="size-6" />,
    title: 'Translate',
    description:
      'Text is split into sentences, PII is scrubbed, and the TMT API translates each segment. Knowledge graph ensures term consistency.',
    gradient: 'from-amber-500 to-orange-500',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    animatedIcon: <TranslateSparkleAnimation />,
  },
  {
    number: 4,
    icon: <BookOpen className="size-6" />,
    title: 'Review & Download',
    description:
      'Interactive output with side-by-side view, 3D book preview, and download in original format — PDF, DOCX, CSV, SRT, or TXT.',
    gradient: 'from-rose-500 to-pink-500',
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    animatedIcon: <BookFlipAnimation />,
  },
  {
    number: 5,
    icon: <ShieldCheck className="size-6" />,
    title: 'Secure',
    description:
      'AES-256 encryption protects your data. PII is never sent to the API — it stays local and is re-inserted after translation.',
    gradient: 'from-violet-500 to-purple-500',
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    animatedIcon: <LockShieldAnimation />,
  },
];

/* ── Animated Icon Components ── */

function UploadArrowAnimation() {
  return (
    <motion.div className="relative flex items-center justify-center size-12">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Upload className="size-6 text-emerald-500" />
      </motion.div>
      {/* Document shape behind */}
      <motion.div
        className="absolute bottom-0 size-5 rounded-sm border-2 border-emerald-400/40 dark:border-emerald-400/30"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function SettingsGearAnimation() {
  return (
    <motion.div className="relative flex items-center justify-center size-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <Settings className="size-6 text-teal-500" />
      </motion.div>
      {/* Small orbiting dot */}
      <motion.div
        className="absolute size-2 rounded-full bg-teal-400"
        animate={{
          rotate: 360,
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '16px', originY: '0px' }}
      />
    </motion.div>
  );
}

function TranslateSparkleAnimation() {
  return (
    <motion.div className="relative flex items-center justify-center size-12">
      <motion.div
        animate={{ scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles className="size-6 text-amber-500" />
      </motion.div>
      {/* Small sparkle particles */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute size-1.5 rounded-full bg-amber-400"
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
            x: [0, (i - 1) * 12],
            y: [0, -8 - i * 4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}

function BookFlipAnimation() {
  return (
    <motion.div className="relative flex items-center justify-center size-12">
      <motion.div
        animate={{ rotateY: [0, 15, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ perspective: 200 }}
      >
        <BookOpen className="size-6 text-rose-500" />
      </motion.div>
      {/* Page lines animation */}
      <motion.div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="size-0.5 rounded-full bg-rose-400" />
        <div className="size-0.5 rounded-full bg-rose-400" />
        <div className="size-0.5 rounded-full bg-rose-400" />
      </motion.div>
    </motion.div>
  );
}

function LockShieldAnimation() {
  return (
    <motion.div className="relative flex items-center justify-center size-12">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ShieldCheck className="size-6 text-violet-500" />
      </motion.div>
      {/* Radiating rings */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-violet-400/30"
        animate={{ scale: [0.6, 1.2], opacity: [0.6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-violet-400/20"
        animate={{ scale: [0.6, 1.3], opacity: [0.4, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 0.5,
        }}
      />
    </motion.div>
  );
}

/* ── Connecting Line (Desktop) with animated dashes ── */

function ConnectingLine({ index, total }: { index: number; total: number }) {
  if (index >= total - 1) return null;
  return (
    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 z-10">
      <svg width="24" height="2" className="overflow-visible">
        <motion.line
          x1="0"
          y1="1"
          x2="24"
          y2="1"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="text-emerald-400/50 dark:text-emerald-400/40"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
        />
        {/* Animated marching ants */}
        <motion.line
          x1="0"
          y1="1"
          x2="24"
          y2="1"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="2 6"
          className="text-emerald-500/60 dark:text-emerald-400/50"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.6 + index * 0.15 }}
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
        </motion.line>
      </svg>
    </div>
  );
}

/* ── Vertical Connecting Dots (Mobile) ── */

function VerticalDots({ index, total }: { index: number; total: number }) {
  if (index >= total - 1) return null;
  return (
    <div className="flex lg:hidden flex-col items-center gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="size-1.5 rounded-full bg-emerald-400/70 dark:bg-emerald-400/50"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + index * 0.15 + i * 0.08 }}
        />
      ))}
    </div>
  );
}

/* ── Step Card ── */

function StepCard({ step, index }: { step: StepData; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="relative group"
    >
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.25 }}
        className="relative rounded-2xl border border-border/50 dark:border-border/40 bg-card/70 dark:bg-card/80 backdrop-blur-xl p-6 overflow-hidden transition-shadow duration-300 hover:shadow-lg"
      >
        {/* Gradient background glow on hover */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-500`}
        />

        {/* Numbered circle with gradient fill */}
        <div className="relative z-10 flex items-start gap-4">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
          >
            <span className="text-lg font-bold text-white">{step.number}</span>
          </div>

          {/* Animated icon with pulse/glow */}
          <div
            className={`relative flex size-12 shrink-0 items-center justify-center rounded-xl ${step.iconBg} border border-border/30 dark:border-border/40`}
          >
            {/* Glow behind icon */}
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-500`} />
            {step.animatedIcon}
          </div>
        </div>

        {/* Title & Description */}
        <div className="relative z-10 mt-4">
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            {step.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground/90">
            {step.description}
          </p>
        </div>

        {/* Decorative corner accent */}
        <div
          className={`absolute -bottom-6 -right-6 size-28 rounded-full bg-gradient-to-br ${step.gradient} opacity-[0.06] blur-2xl group-hover:opacity-[0.12] transition-opacity duration-500`}
        />
      </motion.div>

      {/* Connecting line (desktop) */}
      <ConnectingLine index={index} total={steps.length} />
    </motion.div>
  );
}

/* ── Main Component ── */

export function HowItWorks() {
  const titleRef = useRef<HTMLDivElement>(null);
  const titleInView = useInView(titleRef, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              How it Works
            </span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Five simple steps from input to secure, translated output — powered
            by the TMT API and built for Nepal&apos;s linguistic diversity.
          </p>
        </motion.div>

        {/* Desktop: Horizontal steps with connecting lines */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-4 items-start">
          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} />
          ))}
        </div>

        {/* Mobile/Tablet: Vertical steps with connecting dots */}
        <div className="flex lg:hidden flex-col items-center">
          {steps.map((step, index) => (
            <div key={step.number} className="w-full max-w-sm">
              <StepCard step={step} index={index} />
              <VerticalDots index={index} total={steps.length} />
            </div>
          ))}
        </div>

        {/* Bottom accent bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 h-1 w-48 mx-auto rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 origin-center"
        />
      </div>
    </section>
  );
}
