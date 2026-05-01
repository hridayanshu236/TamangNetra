'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Languages, Zap, Layers, FileText, ArrowRight } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  description: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
  delay: number;
  learnMoreHref: string;
  ringColor: string;
}

function AnimatedCounter({
  value,
  suffix,
  duration = 2,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = value;
    const incrementTime = (duration * 1000) / end;
    const step = Math.max(1, Math.floor(end / 60));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className="tabular-nums counter-glow">
      {count}
      {suffix}
    </span>
  );
}

function StatCard({
  icon,
  value,
  suffix,
  label,
  description,
  gradient,
  borderColor,
  glowColor,
  delay,
  learnMoreHref,
  ringColor,
}: StatItemProps) {
  const [isInView, setIsInView] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      onViewportEnter={() => setIsInView(true)}
      whileHover={{ scale: 1.03, y: -4, rotateX: -2, rotateY: 2 }}
      style={{ perspective: 800, transformStyle: 'preserve-3d' }}
      className={`relative group rounded-2xl border ${borderColor} bg-card/70 dark:bg-card/80 backdrop-blur-xl p-6 overflow-hidden transition-shadow duration-300 hover:shadow-lg ${glowColor} stat-card-gradient-border dark:stat-card-gradient-border`}
    >
      {/* Diagonal stripe pattern behind card */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 8px,
            currentColor 8px,
            currentColor 9px
          )`,
        }}
      />

      {/* Gradient border glow effect */}
      <div
        className={`absolute inset-0 rounded-2xl ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
      />

      {/* Pulsing dot indicator */}
      <div className="absolute top-4 right-4">
        <span className="relative flex size-2.5">
          <span className={`absolute inline-flex size-full animate-ping rounded-full ${gradient} opacity-30 dark:opacity-20`} />
          <span className={`relative inline-flex size-2.5 rounded-full ${gradient}`} />
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon with animated ring behind it */}
        <div className="mb-3 relative flex size-12 items-center justify-center">
          {/* Animated ring/circle behind icon */}
          <div className="absolute inset-0">
            <motion.div
              className={`absolute inset-[-4px] rounded-full border-2 ${ringColor} opacity-0`}
              animate={isInView ? { opacity: [0, 0.4, 0.15, 0.3, 0], scale: [0.8, 1.1, 1, 1.05, 1.2] } : {}}
              transition={{ duration: 2.5, delay: delay + 0.3, repeat: Infinity, repeatDelay: 3 }}
            />
            <motion.div
              className={`absolute inset-[-8px] rounded-full border ${ringColor} opacity-0`}
              animate={isInView ? { opacity: [0, 0.2, 0.1, 0.15, 0], scale: [0.8, 1.15, 1, 1.1, 1.3] } : {}}
              transition={{ duration: 2.5, delay: delay + 0.5, repeat: Infinity, repeatDelay: 3 }}
            />
          </div>
          <div className="relative flex size-12 items-center justify-center rounded-xl bg-background/80 dark:bg-background/70 backdrop-blur-sm border border-border/50 dark:border-border/50">
            {icon}
          </div>
        </div>

        <div className="text-4xl font-extrabold tracking-tight text-foreground mb-1">
          <AnimatedCounter value={value} suffix={suffix} />
        </div>
        <p className="text-sm font-semibold text-foreground/80 dark:text-foreground/90 mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>

        {/* Learn More link */}
        <a
          href={learnMoreHref}
          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors group/link"
        >
          Learn More
          <ArrowRight className="size-3 transition-transform group-hover/link:translate-x-0.5" />
        </a>
      </div>

      {/* Decorative corner accent */}
      <div
        className={`absolute -bottom-4 -right-4 size-24 rounded-full ${gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`}
      />
    </motion.div>
  );
}

const stats: StatItemProps[] = [
  {
    icon: <Languages className="size-6 text-emerald-500" />,
    value: 3,
    label: 'Languages Supported',
    description: 'English, नेपाली (Nepali), तामाङ (Tamang)',
    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500/20 dark:border-emerald-500/30',
    glowColor: 'hover:shadow-emerald-500/10',
    delay: 0,
    learnMoreHref: '#about-section',
    ringColor: 'border-emerald-400/30',
  },
  {
    icon: <Zap className="size-6 text-amber-500" />,
    value: 60,
    suffix: '+',
    label: 'Requests/Min',
    description: 'API rate limit with token bucket throttling',
    gradient: 'bg-gradient-to-br from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/20 dark:border-amber-500/30',
    glowColor: 'hover:shadow-amber-500/10',
    delay: 0.15,
    learnMoreHref: '#about-section',
    ringColor: 'border-amber-400/30',
  },
  {
    icon: <Layers className="size-6 text-teal-500" />,
    value: 11,
    label: 'Features Built',
    description: 'PII scrubbing, encryption, OCR, knowledge graph & more',
    gradient: 'bg-gradient-to-br from-teal-500 to-cyan-500',
    borderColor: 'border-teal-500/20 dark:border-teal-500/30',
    glowColor: 'hover:shadow-teal-500/10',
    delay: 0.3,
    learnMoreHref: '#features',
    ringColor: 'border-teal-400/30',
  },
  {
    icon: <FileText className="size-6 text-rose-500" />,
    value: 3,
    suffix: '',
    label: 'File Formats',
    description: 'PDF, DOCX, CSV/TSV with formula awareness',
    gradient: 'bg-gradient-to-br from-rose-500 to-pink-500',
    borderColor: 'border-rose-500/20 dark:border-rose-500/30',
    glowColor: 'hover:shadow-rose-500/10',
    delay: 0.45,
    learnMoreHref: '#tool-section',
    ringColor: 'border-rose-400/30',
  },
];

export function StatsSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Powered by{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              Innovation
            </span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Built for the TMT Hackathon 2025 — Nepal&apos;s linguistic bridge
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Connecting dotted lines between cards (desktop only) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none z-20">
            <div className="flex items-center justify-between px-[25%]">
              <div className="border-t-2 border-dashed border-emerald-300/25 dark:border-emerald-400/30 w-full" />
              <div className="border-t-2 border-dashed border-teal-300/25 dark:border-teal-400/30 w-full" />
              <div className="border-t-2 border-dashed border-amber-300/25 dark:border-amber-400/30 w-full" />
            </div>
          </div>
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
