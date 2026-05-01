'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Eye, ChevronDown, Mountain, Shield, Lock, Share2, ScanLine, BookOpen } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';

const features = [
  { icon: Shield, label: 'PII Shield', color: 'text-emerald-400' },
  { icon: Lock, label: 'AES-256', color: 'text-amber-400' },
  { icon: Share2, label: 'Knowledge Graph', color: 'text-teal-400' },
  { icon: ScanLine, label: 'OCR', color: 'text-orange-400' },
  { icon: BookOpen, label: '3D Book', color: 'text-rose-400' },
];

const taglineWords = ['See', 'Across', 'Languages.', 'Translate', 'with', 'Precision.'];

const greetingCycle = [
  { text: 'Hello', lang: 'English', color: 'text-emerald-300' },
  { text: 'नमस्ते', lang: 'नेपाली', color: 'text-amber-300' },
  { text: 'तामाङ', lang: 'तामाङ', color: 'text-teal-300' },
];

const devanagariChars = ['न', 'म', 'त', 'ा', 'े', 'ि', 'ो', 'ं', 'ृ', 'श'];

// Sparkle particle data for floating twinkle effect
const sparkleData = [...Array(12)].map((_, i) => ({
  id: `sparkle-${i}`,
  left: `${5 + (i * 8.3) % 90}%`,
  top: `${10 + (i * 7.7) % 70}%`,
  duration: 1.5 + (i % 4) * 0.5,
  delay: i * 0.4,
  size: 2 + (i % 3),
}));

// Animated counter component
function AnimatedCounter({ target, duration = 2000, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count}{suffix}</span>;
}

export function Hero() {
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [typingComplete, setTypingComplete] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [titleHovered, setTitleHovered] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'demo'>('checking');
  const [typingScriptIndex, setTypingScriptIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 3D tilt effect
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springTiltX = useSpring(tiltX, { stiffness: 150, damping: 20 });
  const springTiltY = useSpring(tiltY, { stiffness: 150, damping: 20 });

  const handleTiltMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);
    // Max 3 degrees tilt
    tiltX.set(-percentY * 3);
    tiltY.set(percentX * 3);
  }, [tiltX, tiltY]);

  const handleTiltMouseLeave = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);

  // Parallax scroll effect
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const particleY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const mountainBackY = useTransform(scrollYProgress, [0, 1], [0, -20]);
  const mountainMidY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const mountainFrontY = useTransform(scrollYProgress, [0, 1], [0, -10]);

  // Typing effect for tagline
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < taglineWords.length) {
        setTypedWords((prev) => [...prev, taglineWords[currentIndex]]);
        currentIndex++;
      } else {
        setTypingComplete(true);
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Rotating greeting
  useEffect(() => {
    const timer = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % greetingCycle.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Typing indicator cycling different language scripts
  const typingScripts = [
    'नमस्ते',
    'Hello',
    'तामाङ',
    'Welcome',
    'स्वागतम्',
    'Translate',
    'अनुवाद',
  ];
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingScriptIndex((prev) => (prev + 1) % typingScripts.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [typingScripts.length]);

  // API Status check
  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch('/api/translate', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          setApiStatus('connected');
        } else {
          setApiStatus('demo');
        }
      } catch {
        setApiStatus('demo');
      }
    };
    checkApi();
  }, []);

  const scrollToTool = useCallback(() => {
    const el = document.getElementById('tool-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Generate particle data
  const particles = [...Array(30)].map((_, i) => {
    const isChar = i % 10 < 3; // ~30% characters
    return {
      id: i,
      isChar,
      char: isChar ? devanagariChars[i % devanagariChars.length] : null,
      width: isChar ? 14 + (i % 3) * 4 : 2 + (i % 3),
      height: isChar ? 14 + (i % 3) * 4 : 2 + (i % 3),
      left: `${3 + (i * 3.2) % 94}%`,
      top: `${8 + (i * 2.8) % 75}%`,
      duration: 4 + (i % 5),
      delay: i * 0.2,
      yOffset: 30 + (i % 20),
    };
  });

  return (
    <section id="hero-section" ref={sectionRef} className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden grain-overlay" onMouseMove={handleTiltMouseMove} onMouseLeave={handleTiltMouseLeave}>
      {/* API Status Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md text-xs font-medium transition-all duration-300 ${
            apiStatus === 'checking'
              ? 'border-yellow-300/40 bg-yellow-500/10 text-yellow-300'
              : apiStatus === 'connected'
                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              apiStatus === 'checking'
                ? 'bg-yellow-400 animate-pulse'
                : apiStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-rose-400'
            }`}
          />
          {apiStatus === 'checking' && 'Checking...'}
          {apiStatus === 'connected' && 'Connected'}
          {apiStatus === 'demo' && 'Demo Mode'}
        </div>
      </div>
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <Image
          src="/hero-bg.png"
          alt="Himalayan mountains background"
          fill
          className="object-cover"
          priority
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-emerald-950/70 to-slate-900/90" />
      </div>

      {/* Floating gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 size-80 rounded-full bg-emerald-500/15 blur-[100px] animate-float-slow" />
        <div className="absolute top-1/4 right-10 size-96 rounded-full bg-teal-500/10 blur-[120px] animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 size-72 rounded-full bg-amber-500/10 blur-[90px] animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/2 size-64 rounded-full bg-emerald-400/8 blur-[80px] animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Subtle grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Vignette effect at edges */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
      }} />

      {/* Mountain silhouettes overlay — 3 parallax layers with snow caps and trees */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Back layer — far mountains with snow caps */}
        <motion.svg
          style={{ y: mountainBackY }}
          className="absolute bottom-0 left-0 w-full h-[45%] opacity-[0.04]"
          viewBox="0 0 1440 500"
          preserveAspectRatio="none"
        >
          {/* Mountain bodies */}
          <path
            d="M0,500 L0,350 L80,200 L160,300 L280,120 L400,280 L520,80 L640,220 L760,140 L880,300 L1000,100 L1120,260 L1240,180 L1360,280 L1440,200 L1440,500 Z"
            fill="currentColor"
            className="text-emerald-300"
          />
          {/* Snow caps on peaks */}
          <path
            d="M520,80 L540,130 L500,130 Z M1000,100 L1020,145 L980,145 Z M280,120 L300,165 L260,165 Z M760,140 L778,180 L742,180 Z M1120,180 L1138,220 L1102,220 Z"
            fill="currentColor"
            className="text-white"
          />
        </motion.svg>

        {/* Mid layer — closer mountains with snow and trees */}
        <motion.svg
          style={{ y: mountainMidY }}
          className="absolute bottom-0 left-0 w-full h-[40%] opacity-[0.06]"
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
        >
          <path
            d="M0,400 L0,300 L120,180 L240,280 L360,120 L480,240 L600,80 L720,200 L840,100 L960,260 L1080,150 L1200,220 L1320,110 L1440,180 L1440,400 Z"
            fill="currentColor"
            className="text-emerald-400"
          />
          {/* Snow caps */}
          <path
            d="M600,80 L625,140 L575,140 Z M360,120 L385,175 L335,175 Z M840,100 L860,150 L820,150 Z M1320,110 L1340,155 L1300,155 Z"
            fill="currentColor"
            className="text-white/80"
          />
          {/* Tree silhouettes at base */}
          <path
            d="M60,400 L60,340 L50,340 L70,310 L55,310 L75,280 L60,280 L80,250 L100,280 L85,280 L105,310 L90,310 L110,340 L100,340 L100,400 Z
               M200,400 L200,355 L192,355 L208,330 L195,330 L212,305 L198,305 L218,280 L238,305 L224,305 L240,330 L228,330 L244,355 L236,355 L236,400 Z
               M420,400 L420,360 L413,360 L427,340 L416,340 L430,320 L418,320 L434,298 L450,320 L438,320 L452,340 L441,340 L455,360 L448,360 L448,400 Z
               M700,400 L700,350 L693,350 L707,325 L696,325 L712,300 L700,300 L718,275 L736,300 L724,300 L740,325 L729,325 L743,350 L736,350 L736,400 Z
               M950,400 L950,358 L942,358 L958,335 L946,335 L962,310 L950,310 L968,285 L986,310 L974,310 L990,335 L978,335 L994,358 L986,358 L986,400 Z
               M1150,400 L1150,355 L1142,355 L1158,330 L1146,330 L1162,305 L1150,305 L1168,280 L1186,305 L1174,305 L1190,330 L1178,330 L1194,355 L1186,355 L1186,400 Z
               M1350,400 L1350,362 L1343,362 L1357,340 L1346,340 L1362,315 L1350,315 L1368,290 L1386,315 L1374,315 L1390,340 L1379,340 L1393,362 L1386,362 L1386,400 Z"
            fill="currentColor"
            className="text-emerald-600"
          />
        </motion.svg>

        {/* Front layer — closest hills */}
        <motion.svg
          style={{ y: mountainFrontY }}
          className="absolute bottom-0 left-0 w-full h-[25%] opacity-[0.08]"
          viewBox="0 0 1440 250"
          preserveAspectRatio="none"
        >
          <path
            d="M0,250 L0,180 L180,150 L360,170 L540,130 L720,160 L900,140 L1080,170 L1260,145 L1440,155 L1440,250 Z"
            fill="currentColor"
            className="text-emerald-500"
          />
        </motion.svg>

        {/* Floating particles with parallax - dots and Devanagari characters */}
        <motion.div style={{ y: particleY }} className="absolute inset-0">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className={`absolute ${p.isChar ? 'text-emerald-400/30 font-bold select-none' : 'rounded-full bg-emerald-400/20'}`}
              style={{
                width: p.isChar ? undefined : `${p.width}px`,
                height: p.isChar ? undefined : `${p.height}px`,
                left: p.left,
                top: p.top,
                fontSize: p.isChar ? `${p.width}px` : undefined,
                lineHeight: 1,
              }}
              animate={{
                y: [0, -p.yOffset, 0],
                opacity: p.isChar ? [0.15, 0.45, 0.15] : [0.1, 0.5, 0.1],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: 'easeInOut',
              }}
            >
              {p.isChar ? p.char : null}
            </motion.div>
          ))}
          {/* Floating sparkle particles - small white dots that twinkle */}
          {sparkleData.map((s) => (
            <div
              key={s.id}
              className="absolute rounded-full bg-white animate-sparkle"
              style={{
                width: `${s.size}px`,
                height: `${s.size}px`,
                left: s.left,
                top: s.top,
                '--sparkle-duration': `${s.duration}s`,
                '--sparkle-delay': `${s.delay}s`,
              } as React.CSSProperties}
            />
          ))}
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        ref={contentRef}
        className="relative z-10 flex flex-col items-center gap-5 px-4 text-center"
        style={{
          perspective: 1200,
          rotateX: springTiltX,
          rotateY: springTiltY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="relative"
        >
          <div className="relative flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/40 ring-2 ring-emerald-400/20">
            <Image
              src="/tamangnetra-logo.png"
              alt="TamangNetra Logo"
              width={80}
              height={80}
              className="rounded-xl object-cover"
            />
          </div>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-amber-500 shadow-lg"
          >
            <Mountain className="size-4 text-white" />
          </motion.div>
        </motion.div>

        {/* Title with animated gradient "Netra" and letter-spacing hover */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          onMouseEnter={() => setTitleHovered(true)}
          onMouseLeave={() => setTitleHovered(false)}
        >
          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight text-white transition-[letter-spacing] duration-300"
            style={{ letterSpacing: titleHovered ? '0.04em' : '0em' }}
          >
            Tamang
            <span
              className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent animate-gradient-shift"
              style={{
                backgroundSize: '200% 200%',
                animation: 'gradient-shift 4s ease infinite',
              }}
            >
              Netra
            </span>
          </h1>
          <p className="mt-1 text-lg sm:text-2xl font-light tracking-[0.3em] text-emerald-300/70">
            तामाङनेत्र
          </p>
        </motion.div>

        {/* Tagline with typing effect */}
        <div className="max-w-xl text-base sm:text-xl text-white font-light min-h-[1.75rem] sm:min-h-[2rem]">
          {typedWords.map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={i >= 3 ? 'font-medium text-emerald-300' : ''}
            >
              {word}{' '}
            </motion.span>
          ))}
          {/* Typewriter cursor */}
          {!typingComplete && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-[2px] h-[1.1em] bg-emerald-400 align-middle ml-0.5"
            />
          )}
        </div>

        {/* Language badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-900/40 px-4 py-1.5 text-emerald-300 text-sm backdrop-blur-sm"
          >
            English
          </Badge>
          <span className="text-emerald-500/60 text-lg">↔</span>
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-900/40 px-4 py-1.5 text-amber-300 text-sm backdrop-blur-sm"
          >
            नेपाली
          </Badge>
          <span className="text-emerald-500/60 text-lg">↔</span>
          <Badge
            variant="outline"
            className="border-teal-500/40 bg-teal-900/40 px-4 py-1.5 text-teal-300 text-sm backdrop-blur-sm"
          >
            तामाङ
          </Badge>
        </motion.div>

        {/* Rotating language greeting showcase */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="h-10 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={greetingIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <span className={`text-2xl sm:text-3xl font-bold ${greetingCycle[greetingIndex].color}`}>
                {greetingCycle[greetingIndex].text}
              </span>
              {/* Blinking typing cursor after greeting */}
              <span
                className="inline-block w-[2px] h-[1.2em] bg-emerald-400 align-middle animate-typing-cursor"
              />
              <span className="text-xs text-white/70 uppercase tracking-wider">
                {greetingCycle[greetingIndex].lang}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Typing script indicator - cycling different language scripts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="h-8 flex items-center justify-center"
        >
          <div className="flex items-center gap-2 px-4 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">Typing:</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={typingScriptIndex}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-medium text-emerald-300/80 min-w-[80px] text-center"
              >
                {typingScripts[typingScriptIndex]}
              </motion.span>
            </AnimatePresence>
            <span className="inline-block w-[2px] h-[1em] bg-emerald-400/60 animate-typing-cursor" />
          </div>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-2 mt-1"
        >
          {features.map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur-sm"
            >
              <feat.icon className={`size-3 ${feat.color}`} />
              {feat.label}
            </div>
          ))}
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="max-w-md text-sm text-white/90"
        >
          Trilingual file translation with PII scrubbing, AES-256 encryption,
          knowledge graph consistency, and OCR — powered by the TMT API.
        </motion.p>

        {/* CTA Button with animated gradient border and pulsing ring */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          className="relative"
        >
          {/* Pulsing ring effect behind CTA */}
          <div className="absolute inset-0 rounded-xl pointer-events-none">
            <motion.div
              className="absolute inset-[-6px] rounded-xl border-2 border-emerald-400/40"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-[-6px] rounded-xl border-2 border-teal-400/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
            />
          </div>
          <div className="gradient-border-animated rounded-xl relative">
            <Button
              size="lg"
              onClick={scrollToTool}
              className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 px-10 py-6 text-base font-semibold text-white shadow-xl shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-500/40 transition-all duration-300 rounded-xl shimmer-overlay"
            >
              Start Translating
              <ChevronDown className="ml-2 size-4 transition-transform group-hover:translate-y-1" />
            </Button>
          </div>
        </motion.div>

        {/* Stats counter row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="flex items-center gap-4 sm:gap-6 text-sm text-white/70 mt-2"
        >
          <span className="flex items-center gap-1.5">
            <AnimatedCounter target={3} duration={1500} />
            <span className="text-white/60">Languages</span>
          </span>
          <span className="text-white/40">•</span>
          <span className="flex items-center gap-1.5">
            <AnimatedCounter target={11} duration={1800} />
            <span className="text-white/60">Features</span>
          </span>
          <span className="text-white/40">•</span>
          <span className="flex items-center gap-1.5">
            <AnimatedCounter target={3} duration={1500} />
            <span className="text-white/60">Formats</span>
          </span>
        </motion.div>
      </motion.div>

      {/* Scroll indicator - improved bouncing chevron with label */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <span className="text-[10px] text-white/40 uppercase tracking-widest">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="cursor-pointer"
          onClick={scrollToTool}
        >
          <ChevronDown className="size-5 text-white/50" />
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
