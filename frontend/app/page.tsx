'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Mountain,
  Eye,
  Heart,
  Shield,
  Lock,
  Share2,
  Type,
  ScanLine,
  BookOpen,
  Video,
  PenTool,
  Volume2,
  Code,
  FileText,
  Globe,
  ArrowUp,
  Settings,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/src/components/ui/sheet';

import { Navbar } from '@/src/components/tamangnetra/Navbar';
import { TranslationHistory, HistoryButton, useTranslationHistory } from '@/src/components/tamangnetra/TranslationHistory';
import { bindHistorySaver } from '@/src/components/tamangnetra/TranslationStore';
import { Hero } from '@/src/components/tamangnetra/Hero';
import { StatsSection } from '@/src/components/tamangnetra/StatsSection';
import { FeatureBadges } from '@/src/components/tamangnetra/FeatureBadges';
import { TranslationSettings } from '@/src/components/tamangnetra/TranslationSettings';
import { FileTranslator } from '@/src/components/tamangnetra/FileTranslator';
import { YouTubeTranslator } from '@/src/components/tamangnetra/YouTubeTranslator';
import { ImageTranslator } from '@/src/components/tamangnetra/ImageTranslator';
import { InteractiveOutput } from '@/src/components/tamangnetra/InteractiveOutput';
import { KnowledgeGraphPanel } from '@/src/components/tamangnetra/KnowledgeGraphPanel';
import { GlossaryManager } from '@/src/components/tamangnetra/GlossaryManager';
import { BoundingBoxAdjuster } from '@/src/components/tamangnetra/BoundingBoxAdjuster';
import { AboutSection } from '@/src/components/tamangnetra/AboutSection';
import { TestimonialsSection } from '@/src/components/tamangnetra/TestimonialsSection';
import { HowItWorks } from '@/src/components/tamangnetra/HowItWorks';
import { ShortcutPicker } from '@/src/components/tamangnetra/ShortcutPicker';
import { TranslationComparisonTable } from '@/src/components/tamangnetra/TranslationComparisonTable';
import { useTranslationStore } from '@/src/components/tamangnetra/TranslationStore';
import { TranslationDiffView } from '@/src/components/tamangnetra/TranslationDiffView';
import { TranslationComparison } from '@/src/components/tamangnetra/TranslationComparison';
import { TranslationProgressDashboard } from '@/src/components/tamangnetra/TranslationProgressDashboard';
import { TranslationQualityScore } from '@/src/components/tamangnetra/TranslationQualityScore';
import { BatchTranslator } from '@/src/components/tamangnetra/BatchTranslator';
import { TranslationMemory } from '@/src/components/tamangnetra/TranslationMemory';
import { OnboardingTour } from '@/src/components/tamangnetra/OnboardingTour';
import { AccessibilityPanel } from '@/src/components/tamangnetra/AccessibilityPanel';
import { ExportSettingsDialog } from '@/src/components/tamangnetra/ExportSettingsDialog';
import { TranslationAnalytics } from '@/src/components/tamangnetra/TranslationAnalytics';
import { FAQSection } from '@/src/components/tamangnetra/FAQSection';
import { TypographyShowcase } from '@/src/components/tamangnetra/TypographyShowcase';
import { TimelineSection } from '@/src/components/tamangnetra/TimelineSection';
import { CommunitySection } from '@/src/components/tamangnetra/CommunitySection';
import { TranslationAssistant } from '@/src/components/tamangnetra/TranslationAssistant';
import { MobileBottomNav } from '@/src/components/tamangnetra/MobileBottomNav';
import { LanguageMapSection } from '@/src/components/tamangnetra/LanguageMapSection';
import { DocumentPreview } from '@/src/components/tamangnetra/DocumentPreview';
import { WordAlignmentView } from '@/src/components/tamangnetra/WordAlignmentView';
import { ConfidenceHeatmap } from '@/src/components/tamangnetra/ConfidenceHeatmap';
import { TranslationBenchmark } from '@/src/components/tamangnetra/TranslationBenchmark';
import { ShortcutsFloatingButton } from '@/src/components/tamangnetra/ShortcutsHelpPanel';
import {
  TranslationSettingsSkeleton,
  ProgressDashboardSkeleton,
  InteractiveOutputSkeleton,
} from '@/src/components/tamangnetra/SkeletonLoaders';

// Dynamic import for Book3DView (Three.js is heavy)
const Book3DView = dynamic(
  () =>
    import('@/src/components/tamangnetra/Book3DView').then(
      (mod) => mod.Book3DView
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-lg border bg-muted/10">
        <div className="flex flex-col items-center gap-2">
          <Eye className="size-8 text-amber-500 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading 3D view...</p>
        </div>
      </div>
    ),
  }
);

const featureList = [
  { icon: Shield, label: 'PII Shield' },
  { icon: Lock, label: 'AES-256' },
  { icon: Share2, label: 'Knowledge Graph' },
  { icon: Type, label: 'Font Adjust' },
  { icon: ScanLine, label: 'OCR' },
  { icon: BookOpen, label: '3D Book' },
  { icon: Video, label: 'YouTube SRT' },
  { icon: PenTool, label: 'Pen Tool' },
  { icon: FileText, label: 'PDF/DOCX' },
  { icon: Volume2, label: 'Audio TTS' },
  { icon: Code, label: 'CSV Aware' },
];

const techBadges = [
  'Next.js 16',
  'TypeScript',
  'Tailwind CSS',
  'shadcn/ui',
  'Three.js',
  'Tesseract.js',
  'Zustand',
  'Framer Motion',
];

function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailInvalid(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailInvalid(!emailRegex.test(value));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailInvalid) validateEmail(value);
  };

  const handleEmailBlur = () => {
    validateEmail(email);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInvalid) return;
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setEmailInvalid(false);
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="mt-auto relative bg-muted/20">
      {/* Gradient top border */}
      <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

      {/* Diagonal line background pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            currentColor 10px,
            currentColor 11px
          )`,
        }}
      />

      {/* Newsletter/Subscribe Section */}
      <div className="relative border-b border-border/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-semibold text-foreground">Stay Updated</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Get notified about new features and language additions</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="your@email.com"
                className={`h-9 px-3 rounded-lg border bg-background/80 backdrop-blur-sm text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 transition-all w-full sm:w-56 ${
                  emailInvalid
                    ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20'
                }`}
                required
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shrink-0 transition-all duration-300 relative overflow-hidden group"
              >
                {/* Animated gradient overlay on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {subscribed ? (
                  <motion.span
                    className="relative flex items-center gap-1"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <motion.svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                      <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
                    </motion.svg>
                    Subscribed!
                  </motion.span>
                ) : (
                  <span className="relative">Stay Updated</span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Eye className="size-4 text-white" />
              </div>
              <div>
                <span className="font-bold gradient-text">TamangNetra</span>
                <span className="ml-1.5 text-xs text-muted-foreground">तामाङनेत्र</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              See Across Languages. Translate with Precision. A trilingual
              translation tool preserving Nepal&apos;s linguistic heritage.
            </p>
            {/* Social media icons with hover effects */}
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/tamangnetra/tamangnetra"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex size-8 items-center justify-center rounded-lg border border-border/50 bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-white hover:border-emerald-500/60 hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-500/20 transition-all duration-300 hover:scale-110"
                aria-label="GitHub"
              >
                <svg className="size-4 transition-transform duration-300 group-hover:rotate-12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex size-8 items-center justify-center rounded-lg border border-border/50 bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-white hover:border-teal-500/60 hover:bg-teal-600 hover:shadow-md hover:shadow-teal-500/20 transition-all duration-300 hover:scale-110"
                aria-label="Twitter / X"
              >
                <svg className="size-3.5 transition-transform duration-300 group-hover:rotate-12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex size-8 items-center justify-center rounded-lg border border-border/50 bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-white hover:border-amber-500/60 hover:bg-amber-600 hover:shadow-md hover:shadow-amber-500/20 transition-all duration-300 hover:scale-110"
                aria-label="Discord"
              >
                <svg className="size-4 transition-transform duration-300 group-hover:rotate-12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground hover-underline inline-block cursor-default">Features</h4>
            <div className="flex flex-wrap gap-1.5">
              {featureList.map((feat) => (
                <Badge
                  key={feat.label}
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 border-border/50 bg-background/60"
                >
                  <feat.icon className="size-2.5 mr-1 text-emerald-500" />
                  {feat.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground hover-underline inline-block cursor-default">Tech Stack</h4>
            <div className="flex flex-wrap gap-1.5">
              {techBadges.map((tech) => (
                <Badge
                  key={tech}
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 border-border/50 bg-background/60"
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </div>

          {/* Languages & Hackathon */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground hover-underline inline-block cursor-default">Languages</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Globe className="size-3 text-emerald-500" />
                <span className="text-foreground">English</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Globe className="size-3 text-amber-500" />
                <span className="text-foreground">नेपाली (Nepali)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Globe className="size-3 text-teal-500" />
                <span className="text-foreground">तामाङ (Tamang)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section-divider my-8" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge className="glow-badge bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 text-[10px] px-3 py-0.5 font-semibold">
              🏔️ Built for TMT Hackathon 2025
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            >
              🇳🇵 Nepal
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            {/* Back to top link */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-xs text-foreground/70 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <ArrowUp className="size-3" />
              Back to top
            </button>
            <p className="text-xs text-foreground/70 text-center flex items-center gap-1">
              Made with <Heart className="size-3 text-red-400 animate-heart-pulse" /> in Nepal —{' '}
              <Mountain className="size-3 text-emerald-500" />
              TamangNetra 2025
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function HistoryBridge() {
  // Bridge component that binds the history saver once on mount
  const { saveTranslation } = useTranslationHistory();
  const boundRef = useRef(false);

  useEffect(() => {
    if (!boundRef.current) {
      bindHistorySaver(saveTranslation);
      boundRef.current = true;
    }
  }, [saveTranslation]);

  return null;
}

// ── Scroll Progress Indicator ──
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, #10b981, #14b8a6)',
      }}
    />
  );
}

// ── Back to Top Button (desktop only, lg+) ──
function BackToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="hidden lg:flex fixed bottom-4 left-4 z-40 size-10 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all duration-300 hover:shadow-xl"
          aria-label="Back to top"
        >
          <ArrowUp className="size-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ── Wave Section Divider with Parallax ──
function WaveDivider({ flip = false }: { flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <div ref={ref} className={`relative w-full overflow-hidden h-12 -my-1 ${flip ? 'rotate-180' : ''}`}>
      <motion.div style={{ y }} className="absolute inset-0">
      <svg
        viewBox="0 0 1440 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <path
          d="M0 24C240 48 480 0 720 24C960 48 1200 0 1440 24V48H0V24Z"
          fill="url(#wave-gradient)"
          fillOpacity="0.08"
        />
        <path
          d="M0 32C240 8 480 48 720 32C960 8 1200 48 1440 32V48H0V32Z"
          fill="url(#wave-gradient)"
          fillOpacity="0.05"
        />
        <defs>
          <linearGradient id="wave-gradient" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" />
            <stop offset="0.5" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      </motion.div>
    </div>
  );
}

// ── Mobile Settings Sheet ──
function MobileSettingsSheet() {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="lg:hidden fixed bottom-4 left-4 z-40">
      <AnimatePresence>
        {show && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="absolute bottom-14 left-0 flex size-9 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all duration-300"
            aria-label="Back to top"
          >
            <ArrowUp className="size-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 size-10"
          >
            <Settings className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="size-4 text-emerald-600" />
              Settings
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 px-1">
            <TranslationSettings />
            <TranslationProgressDashboard />
            <AccessibilityPanel />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function Home() {
  const [outputTab, setOutputTab] = useState('interactive');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportSettingsOpen, setExportSettingsOpen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { originalText, translatedText, isTranslating } = useTranslationStore();
  const hasResults = originalText.length > 0 || translatedText.length > 0;

  // Simulate initial settings load
  useEffect(() => {
    const timer = setTimeout(() => setSettingsLoaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* History Bridge — binds saveTranslation to store */}
      <HistoryBridge />

      {/* Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Navbar with History button */}
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>

      {/* Floating History Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <HistoryButton onClick={() => setHistoryOpen(true)} />
      </div>

      {/* Back to Top Button (desktop only - mobile uses settings sheet) */}
      <BackToTopButton />

      {/* Mobile Settings Sheet (shown on < lg screens) */}
      <MobileSettingsSheet />

      {/* Translation History Sheet */}
      <TranslationHistory open={historyOpen} onOpenChange={setHistoryOpen} />

      {/* Keyboard Shortcut Picker (Ctrl+K) */}
      <ShortcutPicker />

      {/* AI Translation Assistant Chatbot */}
      <TranslationAssistant />

      {/* Mobile Bottom Navigation (visible on < lg screens) */}
      <MobileBottomNav />

      {/* Shortcuts Floating Help Button (bottom-center, above mobile nav) */}
      <ShortcutsFloatingButton />

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Export Settings Dialog */}
      <ExportSettingsDialog open={exportSettingsOpen} onOpenChange={setExportSettingsOpen} />

      {/* Hero Section - stagger 0 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Hero />
      </motion.div>

      {/* Wave divider after Hero */}
      <WaveDivider />

      {/* Stats Section - stagger 1 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <StatsSection />
      </motion.div>

      {/* How it Works Section - stagger 2 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <HowItWorks />
      </motion.div>

      {/* Wave divider after HowItWorks */}
      <WaveDivider flip />

      {/* Main Tool Section - stagger 3, fade-in-up on mount */}
      <main id="tool-section" className="flex-1 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6"
        >
          {/* Feature Badges */}
          <motion.div
            id="features"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <FeatureBadges />
          </motion.div>

          {/* Main Grid: Settings + Translation Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar - Translation Settings (hidden on mobile, shown on lg+) */}
            <aside id="translation-settings" className="hidden lg:block lg:col-span-1 space-y-4">
              {settingsLoaded ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card-hover"
                  >
                    <TranslationSettings />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card-hover"
                  >
                    <TranslationProgressDashboard />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card-hover"
                  >
                    <AccessibilityPanel />
                  </motion.div>
                </>
              ) : (
                <>
                  <TranslationSettingsSkeleton />
                  <ProgressDashboardSkeleton />
                </>
              )}
            </aside>

            {/* Main Content - Translation Tabs */}
            <div className="md:col-span-2 lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Tabs defaultValue="file" className="space-y-4">
                  <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="file" className="flex-1 sm:flex-none">
                      📄 File Translation
                    </TabsTrigger>
                    <TabsTrigger value="batch" className="flex-1 sm:flex-none">
                      📊 Batch
                    </TabsTrigger>
                    <TabsTrigger value="youtube" className="flex-1 sm:flex-none">
                      🎬 YouTube
                    </TabsTrigger>
                    <TabsTrigger value="image" className="flex-1 sm:flex-none">
                      🖼️ Image OCR
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="file">
                    <div id="file-translator">
                      <FileTranslator />
                    </div>
                  </TabsContent>

                  <TabsContent value="batch">
                    <BatchTranslator />
                  </TabsContent>

                  <TabsContent value="youtube">
                    <YouTubeTranslator />
                  </TabsContent>

                  <TabsContent value="image">
                    <ImageTranslator />
                  </TabsContent>
                </Tabs>
              </motion.div>
            </div>
          </div>

          {/* Output Section */}
          <AnimatePresence>
            {hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <Separator className="my-8" />

                <div id="output-section" className="flex items-center gap-2">
                  <Eye className="size-5 text-emerald-600" />
                  <h2 className="text-xl font-semibold">Translation Results</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 ml-auto hover:border-teal-300 hover:text-teal-600 dark:hover:border-teal-700 dark:hover:text-teal-400"
                    onClick={() => setExportSettingsOpen(true)}
                  >
                    <Settings className="size-3" />
                    Export Settings
                  </Button>
                </div>

                <Tabs
                  value={outputTab}
                  onValueChange={setOutputTab}
                  className="space-y-4"
                >
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <TabsList className="flex-nowrap min-w-max">
                      <TabsTrigger value="interactive">
                        📝 Interactive View
                      </TabsTrigger>
                      <TabsTrigger value="diff">
                        🔍 Diff View
                      </TabsTrigger>
                      <TabsTrigger value="compare">
                        🔄 Compare
                      </TabsTrigger>
                      <TabsTrigger value="3dbook">
                        📖 3D Book View
                      </TabsTrigger>
                      <TabsTrigger value="font">
                        🔤 Font Adjust
                      </TabsTrigger>
                      <TabsTrigger value="graph">
                        🔗 Knowledge Graph
                      </TabsTrigger>
                      <TabsTrigger value="glossary">
                        📚 Glossary
                      </TabsTrigger>
                      <TabsTrigger value="tm">
                        💾 Translation Memory
                      </TabsTrigger>
                      <TabsTrigger value="quality">
                        📊 Quality
                      </TabsTrigger>
                      <TabsTrigger value="analytics">
                        📈 Analytics
                      </TabsTrigger>
                      <TabsTrigger value="feature-compare">
                        📊 Compare
                      </TabsTrigger>
                      <TabsTrigger value="doc-preview">
                        👁️ Doc Preview
                      </TabsTrigger>
                      <TabsTrigger value="alignment">
                        🔗 Alignment
                      </TabsTrigger>
                      <TabsTrigger value="heatmap">
                        🌡️ Heatmap
                      </TabsTrigger>
                      <TabsTrigger value="benchmark">
                        ⚡ Benchmark
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="interactive">
                    {isTranslating ? (
                      <InteractiveOutputSkeleton />
                    ) : (
                      <InteractiveOutput />
                    )}
                  </TabsContent>

                  <TabsContent value="diff">
                    <TranslationDiffView />
                  </TabsContent>

                  <TabsContent value="compare">
                    <TranslationComparison />
                  </TabsContent>

                  <TabsContent value="3dbook">
                    <Book3DView />
                  </TabsContent>

                  <TabsContent value="font">
                    <BoundingBoxAdjuster />
                  </TabsContent>

                  <TabsContent value="graph">
                    <KnowledgeGraphPanel />
                  </TabsContent>

                  <TabsContent value="glossary">
                    <GlossaryManager />
                  </TabsContent>

                  <TabsContent value="tm">
                    <TranslationMemory />
                  </TabsContent>

                  <TabsContent value="quality">
                    <TranslationQualityScore />
                  </TabsContent>

                  <TabsContent value="analytics">
                    <TranslationAnalytics />
                  </TabsContent>

                  <TabsContent value="feature-compare">
                    <TranslationComparisonTable />
                  </TabsContent>

                  <TabsContent value="doc-preview">
                    <DocumentPreview />
                  </TabsContent>

                  <TabsContent value="alignment">
                    <WordAlignmentView />
                  </TabsContent>

                  <TabsContent value="heatmap">
                    <ConfidenceHeatmap />
                  </TabsContent>

                  <TabsContent value="benchmark">
                    <TranslationBenchmark />
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Wave divider before About */}
      <WaveDivider />

      {/* About Section - stagger 4 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <AboutSection />
      </motion.div>

      {/* Wave divider before Typography Showcase */}
      <WaveDivider />

      {/* Typography Showcase Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <TypographyShowcase />
      </motion.div>

      {/* Wave divider before Timeline */}
      <WaveDivider />

      {/* Timeline Section */}
      <TimelineSection />

      {/* Wave divider between Timeline and Community */}
      <WaveDivider flip />

      {/* Community Impact Section */}
      <CommunitySection />

      {/* Wave divider before Language Map */}
      <WaveDivider />

      {/* Language Map Section */}
      <LanguageMapSection />

      {/* Wave divider before FAQ */}
      <WaveDivider />

      <FAQSection />

      {/* Wave divider before Testimonials */}
      <WaveDivider />

      {/* Testimonials Section - stagger 5 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <TestimonialsSection />
      </motion.div>

      {/* Footer - slide-in from bottom */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <Footer />
      </motion.div>
    </div>
  );
}
