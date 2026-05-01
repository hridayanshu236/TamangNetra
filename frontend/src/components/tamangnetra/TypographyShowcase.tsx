'use client';

import { motion } from 'framer-motion';
import { Languages, Sparkles, BookOpen, Type } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';

// ── Script Data ──
const scripts = [
  {
    id: 'latin',
    name: 'English',
    nativeName: 'Latin',
    signature: 'Hello World',
    signatureSub: 'The universal greeting across the digital world',
    characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    color: 'emerald',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-700',
    bgGradient: 'from-emerald-500/10 to-emerald-700/10',
    textAccent: 'text-emerald-500 dark:text-emerald-400',
    borderAccent: 'border-emerald-500/30',
    bgAccent: 'bg-emerald-500',
    bgAccentLight: 'bg-emerald-500/10',
    bgAccentMedium: 'bg-emerald-500/20',
    watermarkChar: 'A',
    funFact: 'Latin script is used by over 2.6 billion people worldwide',
    icon: Type,
  },
  {
    id: 'devanagari',
    name: 'नेपाली',
    nativeName: 'Devanagari',
    signature: 'नमस्ते विश्व',
    signatureSub: 'A greeting rooted in centuries of South Asian tradition',
    characters: [
      'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ',
      'क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ',
      'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न',
      'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श',
    ],
    color: 'amber',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-amber-700',
    bgGradient: 'from-amber-500/10 to-amber-700/10',
    textAccent: 'text-amber-500 dark:text-amber-400',
    borderAccent: 'border-amber-500/30',
    bgAccent: 'bg-amber-500',
    bgAccentLight: 'bg-amber-500/10',
    bgAccentMedium: 'bg-amber-500/20',
    watermarkChar: 'न',
    funFact: 'Devanagari has 47 primary characters and is written left-to-right',
    icon: BookOpen,
  },
  {
    id: 'tamang',
    name: 'तामाङ',
    nativeName: 'Tamang',
    signature: 'तामाङ भाषा',
    signatureSub: 'Preserving the voice of Nepal\'s largest indigenous group',
    characters: [
      'त', 'ा', 'म', 'ा', 'ङ', 'भ', 'ा', 'ष', 'ा',
      'क', 'ख', 'ग', 'च', 'ज', 'ट', 'ड', 'न', 'प',
      'ब', 'म', 'य', 'र', 'ल', 'व', 'स', 'ह',
      'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ',
    ],
    color: 'teal',
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-teal-700',
    bgGradient: 'from-teal-500/10 to-teal-700/10',
    textAccent: 'text-teal-500 dark:text-teal-400',
    borderAccent: 'border-teal-500/30',
    bgAccent: 'bg-teal-500',
    bgAccentLight: 'bg-teal-500/10',
    bgAccentMedium: 'bg-teal-500/20',
    watermarkChar: 'त',
    funFact: 'Tamang is spoken by over 1.3 million people in Nepal',
    icon: Languages,
  },
];

// ── Character Cell Component ──
function CharacterCell({
  char,
  index,
  color,
}: {
  char: string;
  index: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald:
      'hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-emerald-500/20',
    amber:
      'hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-amber-600 dark:hover:text-amber-400 hover:shadow-amber-500/20',
    teal:
      'hover:bg-teal-500/20 hover:border-teal-400/50 hover:text-teal-600 dark:hover:text-teal-400 hover:shadow-teal-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.02,
        duration: 0.3,
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
      whileHover={{
        scale: 1.15,
        transition: { type: 'spring', stiffness: 400, damping: 10 },
      }}
      className={`flex items-center justify-center rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm
        p-1.5 sm:p-2 text-sm sm:text-base font-medium cursor-default select-none
        transition-all duration-200 hover:shadow-lg ${colorMap[color] ?? ''}`}
    >
      {char}
    </motion.div>
  );
}

// ── Single Script Section ──
function ScriptSection({
  script,
  index,
}: {
  script: (typeof scripts)[0];
  index: number;
}) {
  const Icon = script.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative group overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm"
    >
      {/* Watermark background character */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span
          className={`text-[12rem] sm:text-[16rem] font-black opacity-[0.03] dark:opacity-[0.04] select-none ${script.textAccent}`}
        >
          {script.watermarkChar}
        </span>
      </div>

      {/* Gradient header */}
      <div
        className={`relative bg-gradient-to-r ${script.gradientFrom} ${script.gradientTo} px-4 sm:px-6 py-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <Icon className="size-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{script.name}</h3>
              <p className="text-xs text-white/70">{script.nativeName} Script</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-white/30 bg-white/10 text-white text-[10px] backdrop-blur-sm"
          >
            <Sparkles className="size-3 mr-1" />
            {script.characters.length} chars
          </Badge>
        </div>
      </div>

      <div className="relative p-4 sm:p-6 space-y-4">
        {/* Signature text with character-by-character reveal */}
        <div className="text-center py-3 sm:py-4">
          <motion.p
            className={`text-2xl sm:text-4xl md:text-5xl font-bold ${script.textAccent}`}
          >
            {script.signature.split('').map((char, i) => (
              <motion.span
                key={`${char}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.04 + index * 0.15 + 0.3,
                  duration: 0.3,
                  type: 'spring',
                  stiffness: 150,
                  damping: 12,
                }}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15 + 0.8, duration: 0.5 }}
            className="text-xs sm:text-sm text-muted-foreground mt-2"
          >
            {script.signatureSub}
          </motion.p>
        </div>

        {/* Character grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2">
          {script.characters.map((char, i) => (
            <CharacterCell
              key={`${script.id}-char-${i}`}
              char={char}
              index={i}
              color={script.color}
            />
          ))}
        </div>

        {/* Fun fact badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.15 + 1.2, duration: 0.4 }}
          className="flex items-start gap-2 pt-2"
        >
          <div
            className={`shrink-0 flex size-6 items-center justify-center rounded-full ${script.bgAccentLight}`}
          >
            <Sparkles className={`size-3 ${script.textAccent}`} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className={`font-semibold ${script.textAccent}`}>Fun Fact:</span>{' '}
            {script.funFact}
          </p>
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <div
        className={`h-1 bg-gradient-to-r ${script.gradientFrom} ${script.gradientTo} opacity-60`}
      />
    </motion.div>
  );
}

// ── Main Component ──
export function TypographyShowcase() {
  return (
    <section
      id="typography-section"
      className="relative py-16 sm:py-20 overflow-hidden"
    >
      {/* Section background */}
      <div className="pointer-events-none absolute inset-0 gradient-mesh-bg" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Languages className="size-4 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              <span className="gradient-text">Script Showcase</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Three scripts, one mission — bridging languages through beautiful typography.
            Explore the character sets that power TamangNetra.
          </p>
        </motion.div>

        {/* Script cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {scripts.map((script, i) => (
            <ScriptSection key={script.id} script={script} index={i} />
          ))}
        </div>

        {/* Bottom description */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
            Each script carries centuries of cultural heritage. TamangNetra ensures
            every character is faithfully preserved across translations.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
