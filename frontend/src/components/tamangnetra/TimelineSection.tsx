'use client';

import { motion } from 'framer-motion';
import {
  Lightbulb,
  Languages,
  FileText,
  Shield,
  ScanEye,
  Brain,
  BookOpen,
  Rocket,
} from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';

interface TimelineMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: 'emerald' | 'teal' | 'amber';
}

const milestones: TimelineMilestone[] = [
  {
    id: 'inception',
    date: 'Jan 2025',
    title: 'Project Inception',
    description: 'Conceived at TMT Hackathon 2025 with the vision of bridging linguistic gaps for Nepal\'s Tamang communities through open-source technology.',
    icon: Lightbulb,
    color: 'emerald',
  },
  {
    id: 'core-engine',
    date: 'Feb 2025',
    title: 'Core Translation Engine',
    description: 'TMT API integration with trilingual support for English, Nepali, and Tamang language pairs with rate limiting and sentence splitting.',
    icon: Languages,
    color: 'teal',
  },
  {
    id: 'doc-processing',
    date: 'Mar 2025',
    title: 'Document Processing',
    description: 'PDF, DOCX, CSV parsing with format preservation, bounding box extraction, and formula-aware translation for spreadsheets.',
    icon: FileText,
    color: 'amber',
  },
  {
    id: 'security',
    date: 'Apr 2025',
    title: 'Security & Privacy',
    description: 'PII scrubbing with split-around approach and client-side AES-256 encryption ensuring data never leaves the browser unprotected.',
    icon: Shield,
    color: 'emerald',
  },
  {
    id: 'visual-intel',
    date: 'May 2025',
    title: 'Visual Intelligence',
    description: 'OCR via Tesseract.js, pen tool for area selection on images, and bounding box reconstruction for precise PDF layout recovery.',
    icon: ScanEye,
    color: 'teal',
  },
  {
    id: 'advanced',
    date: 'Jun 2025',
    title: 'Advanced Features',
    description: 'Knowledge graph for terminological consistency, custom glossary manager, and translation memory with persistent localStorage.',
    icon: Brain,
    color: 'amber',
  },
  {
    id: 'interactive-outputs',
    date: 'Jul 2025',
    title: 'Interactive Outputs',
    description: '3D book view with Three.js, diff view with word-level comparison, bilingual export, and quality scoring dashboard.',
    icon: BookOpen,
    color: 'emerald',
  },
  {
    id: 'launch',
    date: 'Aug 2025',
    title: 'Open Source Launch',
    description: 'Community release with comprehensive documentation, batch translation, accessibility features, and ongoing collaborative development.',
    icon: Rocket,
    color: 'teal',
  },
];

const colorConfig = {
  emerald: {
    dot: 'bg-emerald-500',
    dotRing: 'ring-emerald-500/30',
    iconBg: 'from-emerald-500 to-emerald-600',
    cardBorder: 'border-emerald-500/20',
    cardBg: 'from-emerald-500/5 to-transparent',
    line: '#10b981',
  },
  teal: {
    dot: 'bg-teal-500',
    dotRing: 'ring-teal-500/30',
    iconBg: 'from-teal-500 to-teal-600',
    cardBorder: 'border-teal-500/20',
    cardBg: 'from-teal-500/5 to-transparent',
    line: '#14b8a6',
  },
  amber: {
    dot: 'bg-amber-500',
    dotRing: 'ring-amber-500/30',
    iconBg: 'from-amber-500 to-amber-600',
    cardBorder: 'border-amber-500/20',
    cardBg: 'from-amber-500/5 to-transparent',
    line: '#f59e0b',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export function TimelineSection() {
  return (
    <section
      id="timeline-section"
      className="relative py-16 sm:py-24 overflow-hidden"
    >
      {/* Background decorative blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 size-96 bg-emerald-500/5 morphing-blob-slow blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 size-80 bg-teal-500/5 morphing-blob blur-[100px]" />
        <div className="absolute top-1/2 left-1/3 size-64 bg-amber-500/5 morphing-blob-fast blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Rocket className="size-5 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Roadmap
            </span>
            <Rocket className="size-5 text-teal-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              Our Journey
            </span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            From hackathon idea to open-source platform — tracing the milestones that shaped TamangNetra.
          </p>
        </motion.div>

        {/* ── Desktop: Horizontal timeline with alternating top/bottom cards ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="hidden lg:block"
        >
          {/* Central horizontal line */}
          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 opacity-20" />
            {/* Animated gradient fill */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 origin-left"
            />
          </div>

          <div className="relative grid grid-cols-4 gap-x-6">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon;
              const colors = colorConfig[milestone.color];
              const isTop = index % 2 === 0;

              return (
                <motion.div
                  key={milestone.id}
                  variants={itemVariants}
                  className="relative flex flex-col items-center"
                >
                  {/* Top card */}
                  {isTop ? (
                    <div className="w-full pb-8 flex flex-col items-center">
                      {/* Card */}
                      <div
                        className={`w-full rounded-xl border ${colors.cardBorder} bg-gradient-to-b ${colors.cardBg} backdrop-blur-sm p-4 text-center group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300`}
                      >
                        <div className={`inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${colors.iconBg} shadow-md mb-2 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="size-5 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">
                          {milestone.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {milestone.description}
                        </p>
                        <Badge
                          variant="outline"
                          className={`mt-2 text-[10px] ${colors.cardBorder} ${milestone.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : milestone.color === 'teal' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}
                        >
                          {milestone.date}
                        </Badge>
                      </div>
                      {/* Connector line from card to dot */}
                      <div className="w-[2px] h-6 bg-gradient-to-b from-border/50 to-transparent" />
                    </div>
                  ) : (
                    /* Spacer for bottom cards */
                    <div className="w-full pb-8 h-0" />
                  )}

                  {/* Timeline dot */}
                  <div className="relative z-10 -my-1">
                    <div
                      className={`size-5 rounded-full ${colors.dot} ring-4 ${colors.dotRing} ring-offset-2 ring-offset-background shadow-lg transition-transform duration-300 hover:scale-125`}
                    />
                  </div>

                  {/* Bottom card */}
                  {!isTop ? (
                    <div className="w-full pt-8 flex flex-col items-center">
                      {/* Connector line from dot to card */}
                      <div className="w-[2px] h-6 bg-gradient-to-b from-transparent to-border/50" />
                      {/* Card */}
                      <div
                        className={`w-full rounded-xl border ${colors.cardBorder} bg-gradient-to-b ${colors.cardBg} backdrop-blur-sm p-4 text-center group hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300`}
                      >
                        <div className={`inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${colors.iconBg} shadow-md mb-2 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="size-5 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">
                          {milestone.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {milestone.description}
                        </p>
                        <Badge
                          variant="outline"
                          className={`mt-2 text-[10px] ${colors.cardBorder} ${milestone.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : milestone.color === 'teal' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}
                        >
                          {milestone.date}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    /* Spacer for top cards */
                    <div className="w-full pt-8 h-0" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Tablet: Vertical timeline (md only) ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="hidden md:block lg:hidden relative"
        >
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500 via-teal-500 to-amber-500 opacity-20" />
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute left-6 top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500 via-teal-500 to-amber-500 origin-top"
          />

          <div className="space-y-8">
            {milestones.map((milestone) => {
              const Icon = milestone.icon;
              const colors = colorConfig[milestone.color];

              return (
                <motion.div
                  key={milestone.id}
                  variants={itemVariants}
                  className="relative flex items-start gap-6 pl-2"
                >
                  {/* Dot */}
                  <div className="relative z-10 shrink-0 mt-4">
                    <div
                      className={`size-5 rounded-full ${colors.dot} ring-4 ${colors.dotRing} ring-offset-2 ring-offset-background shadow-lg`}
                    />
                  </div>

                  {/* Card */}
                  <div
                    className={`flex-1 rounded-xl border ${colors.cardBorder} bg-gradient-to-b ${colors.cardBg} backdrop-blur-sm p-5 group hover:shadow-lg transition-all duration-300`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${colors.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="size-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {milestone.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${colors.cardBorder} ${milestone.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : milestone.color === 'teal' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}
                        >
                          {milestone.date}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Mobile: Vertical timeline (below md) ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
          className="md:hidden relative"
        >
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500 via-teal-500 to-amber-500 opacity-20" />
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute left-4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500 via-teal-500 to-amber-500 origin-top"
          />

          <div className="space-y-6">
            {milestones.map((milestone) => {
              const Icon = milestone.icon;
              const colors = colorConfig[milestone.color];

              return (
                <motion.div
                  key={milestone.id}
                  variants={itemVariants}
                  className="relative flex items-start gap-4 pl-1"
                >
                  {/* Dot */}
                  <div className="relative z-10 shrink-0 mt-4">
                    <div
                      className={`size-4 rounded-full ${colors.dot} ring-3 ${colors.dotRing} ring-offset-1 ring-offset-background shadow-md`}
                    />
                  </div>

                  {/* Card */}
                  <div
                    className={`flex-1 rounded-xl border ${colors.cardBorder} bg-gradient-to-b ${colors.cardBg} backdrop-blur-sm p-4 group hover:shadow-md transition-all duration-300`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${colors.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="size-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-foreground truncate">
                          {milestone.title}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 ${colors.cardBorder} ${milestone.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : milestone.color === 'teal' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}
                      >
                        {milestone.date}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Bottom decorative element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 flex items-center justify-center gap-3 text-muted-foreground"
        >
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
          <span className="text-[10px] uppercase tracking-widest font-medium text-emerald-600 dark:text-emerald-400">
            Built with purpose
          </span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500/40" />
        </motion.div>
      </div>
    </section>
  );
}
