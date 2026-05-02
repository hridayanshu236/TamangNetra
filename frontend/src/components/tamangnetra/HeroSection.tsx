'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { ChevronDown, Mountain, Shield, Lock, Share2, ScanLine, BookOpen } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';


const taglineWords = ['See', 'Across', 'Languages.', 'Translate', 'with', 'Precision.'];

const greetingCycle = [
  { text: 'Hello', lang: 'English', color: 'text-emerald-300' },
  { text: 'नमस्ते', lang: 'नेपाली', color: 'text-amber-300' },
  { text: 'फ्याफुल्ला', lang: 'तामाङ', color: 'text-teal-300' },
];

const devanagariChars = ['न', 'म', 'त', 'ा', 'े', 'ि', 'ो', 'ं', 'ृ', 'श'];

const sparkleData = [...Array(12)].map((_, i) => ({
  id: `sparkle-${i}`,
  left: `${5 + (i * 8.3) % 90}%`,
  top: `${10 + (i * 7.7) % 70}%`,
  duration: 1.5 + (i % 4) * 0.5,
  delay: i * 0.4,
  size: 2 + (i % 3),
}));

export function HeroSection() {
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [typingComplete, setTypingComplete] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [titleHovered, setTitleHovered] = useState(false);
  const [typingScriptIndex, setTypingScriptIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springTiltX = useSpring(tiltX, { stiffness: 150, damping: 20 });
  const springTiltY = useSpring(tiltY, { stiffness: 150, damping: 20 });

  const handleTiltMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const percentX = (e.clientX - centerX) / (rect.width / 2);
      const percentY = (e.clientY - centerY) / (rect.height / 2);
      tiltX.set(-percentY * 3);
      tiltY.set(percentX * 3);
    },
    [tiltX, tiltY]
  );

  const handleTiltMouseLeave = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const particleY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const mountainBackY = useTransform(scrollYProgress, [0, 1], [0, -20]);
  const mountainMidY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const mountainFrontY = useTransform(scrollYProgress, [0, 1], [0, -10]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % greetingCycle.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const typingScripts = ['नमस्ते', 'Hello', 'लास्सो', 'Welcome','फ्याफुल्ला', 'स्वागतम्',  'थुजेछे'];
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingScriptIndex((prev) => (prev + 1) % typingScripts.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [typingScripts.length]);

  const scrollToContent = useCallback(() => {
    const mainContent = document.getElementById('main-processing-section');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const particles = [...Array(30)].map((_, i) => {
    const isChar = i % 10 < 3;
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
    <section
      id="hero-section"
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grain-overlay"
      onMouseMove={handleTiltMouseMove}
      onMouseLeave={handleTiltMouseLeave}
    >
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

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 size-80 rounded-full bg-emerald-500/15 blur-[100px] animate-float-slow" />
        <div className="absolute top-1/4 right-10 size-96 rounded-full bg-teal-500/10 blur-[120px] animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 size-72 rounded-full bg-amber-500/10 blur-[90px] animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/2 size-64 rounded-full bg-emerald-400/8 blur-[80px] animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
          linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)
        `,
          backgroundSize: '60px 60px',
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.svg
          style={{ y: mountainBackY }}
          className="absolute bottom-0 left-0 w-full h-[45%] opacity-[0.04]"
          viewBox="0 0 1440 500"
          preserveAspectRatio="none"
        >
          <path
            d="M0,500 L0,350 L80,200 L160,300 L280,120 L400,280 L520,80 L640,220 L760,140 L880,300 L1000,100 L1120,260 L1240,180 L1360,280 L1440,200 L1440,500 Z"
            fill="currentColor"
            className="text-emerald-300"
          />
          <path
            d="M520,80 L540,130 L500,130 Z M1000,100 L1020,145 L980,145 Z M280,120 L300,165 L260,165 Z M760,140 L778,180 L742,180 Z M1120,180 L1138,220 L1102,220 Z"
            fill="currentColor"
            className="text-white"
          />
        </motion.svg>

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
          <path
            d="M600,80 L625,140 L575,140 Z M360,120 L385,175 L335,175 Z M840,100 L860,150 L820,150 Z M1320,110 L1340,155 L1300,155 Z"
            fill="currentColor"
            className="text-white/80"
          />
        </motion.svg>

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
          {sparkleData.map((s) => (
            <div
              key={s.id}
              className="absolute rounded-full bg-white animate-sparkle"
              style={
                {
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  left: s.left,
                  top: s.top,
                  '--sparkle-duration': `${s.duration}s`,
                  '--sparkle-delay': `${s.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 px-4 py-20 text-center"
        style={{
          perspective: 1200,
          rotateX: springTiltX,
          rotateY: springTiltY,
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-2"
        >
          <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1">
            <Shield className="size-3.5" /> Google TMT Hackathon
          </Badge>
        </motion.div>

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
          <p className="mt-1 text-lg sm:text-2xl font-light tracking-[0.3em] text-emerald-300/70">तामाङनेत्र</p>
        </motion.div>

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
          {!typingComplete && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-[2px] h-[1.1em] bg-emerald-400 align-middle ml-0.5"
            />
          )}
        </div>

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
              <span className="inline-block w-[2px] h-[1.2em] bg-emerald-400 align-middle animate-typing-cursor" />
              <span className="text-xs text-white/70 uppercase tracking-wider">
                {greetingCycle[greetingIndex].lang}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>

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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="max-w-2xl space-y-4"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/80">
            Bridging cultures with digital precision.
          </p>
          <p className="text-sm sm:text-base text-white/80 leading-relaxed">
            An advanced translation ecosystem for English, Nepali, and Tamang languages. 
            Experience <strong>pixel-perfect layout reconstruction</strong> for PDF, DOCX, CSV, and TSV files.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          className="relative"
        >
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
          <motion.div 
            className="gradient-border-animated rounded-xl relative w-full max-w-[280px] sm:w-auto sm:max-w-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              onClick={scrollToContent}
              className="group relative w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 px-10 py-6 text-base font-semibold text-white shadow-xl shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-500/40 transition-all duration-300 rounded-xl shimmer-overlay cursor-pointer"
            >
              Start Translating
              <ChevronDown className="ml-2 size-4 transition-transform group-hover:translate-y-1" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
