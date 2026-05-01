'use client';

import { motion } from 'framer-motion';
import { GraduationCap, Heart, BookOpen, Users } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';

interface ImpactCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  stat: string;
  statLabel: string;
  color: 'emerald' | 'teal' | 'amber';
}

const impactCards: ImpactCard[] = [
  {
    id: 'education',
    title: 'Education',
    description:
      'Translating textbooks and educational materials for Tamang-speaking students in rural Nepal, enabling access to knowledge in their mother tongue.',
    icon: GraduationCap,
    stat: '1.5M+',
    statLabel: 'speakers served',
    color: 'emerald',
  },
  {
    id: 'healthcare',
    title: 'Healthcare',
    description:
      'Bridging language gaps in medical information between practitioners and Tamang communities, ensuring critical health information reaches everyone.',
    icon: Heart,
    stat: '120+',
    statLabel: 'languages in Nepal',
    color: 'teal',
  },
  {
    id: 'cultural',
    title: 'Cultural Preservation',
    description:
      'Digitizing and translating Tamang cultural texts and oral traditions for future generations, preserving linguistic heritage through technology.',
    icon: BookOpen,
    stat: '3',
    statLabel: 'translation pairs',
    color: 'amber',
  },
];

const colorConfig = {
  emerald: {
    iconBg: 'from-emerald-500 to-emerald-600',
    iconRing: 'ring-emerald-500/20',
    border: 'border-emerald-500/20',
    bg: 'from-emerald-500/5 via-emerald-500/3 to-transparent',
    glow: 'hover:shadow-emerald-500/10',
    stat: 'text-emerald-600 dark:text-emerald-400',
    badge: 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
  },
  teal: {
    iconBg: 'from-teal-500 to-teal-600',
    iconRing: 'ring-teal-500/20',
    border: 'border-teal-500/20',
    bg: 'from-teal-500/5 via-teal-500/3 to-transparent',
    glow: 'hover:shadow-teal-500/10',
    stat: 'text-teal-600 dark:text-teal-400',
    badge: 'border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400',
  },
  amber: {
    iconBg: 'from-amber-500 to-amber-600',
    iconRing: 'ring-amber-500/20',
    border: 'border-amber-500/20',
    bg: 'from-amber-500/5 via-amber-500/3 to-transparent',
    glow: 'hover:shadow-amber-500/10',
    stat: 'text-amber-600 dark:text-amber-400',
    badge: 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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

export function CommunitySection() {
  return (
    <section
      id="community-section"
      className="relative py-16 sm:py-24 overflow-hidden"
    >
      {/* Subtle mesh gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 size-[500px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 size-[400px] bg-teal-500/[0.04] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-amber-500/[0.03] rounded-full blur-[140px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
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
            <Users className="size-5 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Community Impact
            </span>
            <Users className="size-5 text-teal-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              Real-World Impact
            </span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            How TamangNetra is making a difference in education, healthcare, and cultural preservation across Nepal.
          </p>
        </motion.div>

        {/* Impact Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {impactCards.map((card) => {
            const Icon = card.icon;
            const colors = colorConfig[card.color];

            return (
              <motion.div
                key={card.id}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className={`group rounded-2xl border ${colors.border} bg-gradient-to-b ${colors.bg} backdrop-blur-sm p-6 sm:p-8 relative overflow-hidden hover:shadow-xl ${colors.glow} transition-all duration-300`}
              >
                {/* Subtle decorative gradient orb in top-right */}
                <div
                  className={`pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-[0.06] dark:opacity-[0.08] ${
                    card.color === 'emerald'
                      ? 'bg-emerald-500'
                      : card.color === 'teal'
                        ? 'bg-teal-500'
                        : 'bg-amber-500'
                  } blur-3xl group-hover:opacity-[0.1] dark:group-hover:opacity-[0.12] transition-opacity duration-500`}
                />

                {/* Icon circle */}
                <div className="mb-5 relative">
                  <div
                    className={`inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${colors.iconBg} shadow-lg ring-4 ${colors.iconRing} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="size-7 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {card.description}
                </p>

                {/* Stat */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`px-3 py-1 text-sm font-bold ${colors.badge}`}
                  >
                    {card.stat}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {card.statLabel}
                  </span>
                </div>

                {/* Bottom accent bar */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    card.color === 'emerald'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : card.color === 'teal'
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom decorative element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 flex items-center justify-center gap-3 text-muted-foreground"
        >
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-teal-500/40" />
          <span className="text-[10px] uppercase tracking-widest font-medium text-teal-600 dark:text-teal-400">
            Empowering communities through language
          </span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500/40" />
        </motion.div>
      </div>
    </section>
  );
}
