'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

// ─── Tour step definition ──────────────────────────────────────────────────

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '#hero-section',
    title: 'Welcome to TamangNetra!',
    description:
      'A trilingual translation tool that bridges English, Nepali, and Tamang languages. See across languages and translate with precision!',
    icon: '🏔️',
  },
  {
    target: '#translation-settings',
    title: 'Choose Your Languages',
    description:
      'Select your source and target languages here. You can translate between English, Nepali (नेपाली), and Tamang (तामाङ). Use the swap button to reverse the direction!',
    icon: '🌐',
  },
  {
    target: '#file-translator',
    title: 'Enter Your Text',
    description:
      'Type or paste text here, or upload files (PDF, DOCX, CSV). You can also try the demo samples to see how translation works!',
    icon: '📝',
  },
  {
    target: '#feature-toggles',
    title: 'Explore Advanced Features',
    description:
      'Toggle powerful features like PII Shield (protect personal data), AES-256 Encryption, Knowledge Graph (term consistency), Glossary (custom terms), and Translation Memory (reuse past translations).',
    icon: '⚡',
  },
  {
    target: '#output-section',
    title: 'View Results',
    description:
      'Your translations appear here! Explore interactive views, diff comparisons, 3D book format, knowledge graphs, glossary, and quality scores.',
    icon: '✨',
  },
];

const STORAGE_KEY = 'tamangnetra-onboarding-complete';

// ─── Spotlight dimensions ──────────────────────────────────────────────────

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── OnboardingTour Component ──────────────────────────────────────────────

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>(TOUR_STEPS);
  const overlayRef = useRef<HTMLDivElement>(null);

  const startTour = useCallback(() => {
    // Filter out steps whose targets don't exist
    const availableSteps = TOUR_STEPS.filter((step) => {
      // We can't check during SSR
      if (typeof window === 'undefined') return true;
      return document.querySelector(step.target) !== null;
    });

    if (availableSteps.length === 0) {
      // If no targets found, use all steps (they'll be skipped dynamically)
      setVisibleSteps(TOUR_STEPS);
    } else {
      setVisibleSteps(availableSteps);
    }

    setCurrentStep(0);
    setIsActive(true);
  }, []);

  // Auto-start on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        startTour();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  // Update spotlight position when step changes
  useEffect(() => {
    if (!isActive) return;

    const updateSpotlight = () => {
      const step = visibleSteps[currentStep];
      if (!step) return;

      const element = document.querySelector(step.target);
      if (!element) {
        // Skip this step if element not found
        if (currentStep < visibleSteps.length - 1) {
          setCurrentStep((prev) => prev + 1);
        }
        return;
      }

      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Wait for scroll to finish
      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        const padding = 12;
        setSpotlight({
          x: rect.left - padding,
          y: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      }, 400);
    };

    updateSpotlight();

    // Update on resize/scroll
    const handleUpdate = () => {
      const step = visibleSteps[currentStep];
      if (!step) return;
      const element = document.querySelector(step.target);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const padding = 12;
      setSpotlight({
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isActive, currentStep, visibleSteps]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setSpotlight(null);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < visibleSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, visibleSteps.length, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        endTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, endTour]);

  // Expose startTour for external use
  useEffect(() => {
    // Register a global event for restarting the tour
    const handleRestart = () => {
      localStorage.removeItem(STORAGE_KEY);
      startTour();
    };
    window.addEventListener('tamangnetra-restart-tour', handleRestart);
    return () => {
      window.removeEventListener('tamangnetra-restart-tour', handleRestart);
    };
  }, [startTour]);

  if (!isActive) return null;

  const step = visibleSteps[currentStep];
  if (!step) return null;

  // Calculate tooltip position
  const tooltipPosition = (() => {
    if (!spotlight) return { top: '50%', left: '50%' };

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Prefer showing below the spotlight
    const spaceBelow = viewportHeight - (spotlight.y + spotlight.height);
    const spaceAbove = spotlight.y;
    const spaceRight = viewportWidth - (spotlight.x + spotlight.width);
    const spaceLeft = spotlight.x;

    let top: number | undefined;
    let left: number | undefined;
    let transform = '';

    if (spaceBelow > 200) {
      // Below
      top = spotlight.y + spotlight.height + 16;
      left = spotlight.x + spotlight.width / 2;
      transform = 'translateX(-50%)';
    } else if (spaceAbove > 200) {
      // Above
      top = spotlight.y - 16;
      left = spotlight.x + spotlight.width / 2;
      transform = 'translate(-50%, -100%)';
    } else if (spaceRight > 300) {
      // Right
      top = spotlight.y + spotlight.height / 2;
      left = spotlight.x + spotlight.width + 16;
      transform = 'translateY(-50%)';
    } else {
      // Left
      top = spotlight.y + spotlight.height / 2;
      left = spotlight.x - 16;
      transform = 'translate(-100%, -50%)';
    }

    return { top, left, transform };
  })();

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100]"
        >
          {/* Dark overlay with spotlight cutout */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="tour-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlight && (
                  <rect
                    x={spotlight.x}
                    y={spotlight.y}
                    width={spotlight.width}
                    height={spotlight.height}
                    rx="12"
                    ry="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.6)"
              mask="url(#tour-spotlight-mask)"
            />
          </svg>

          {/* Spotlight border glow */}
          {spotlight && (
            <motion.div
              initial={false}
              animate={{
                x: spotlight.x,
                y: spotlight.y,
                width: spotlight.width,
                height: spotlight.height,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute rounded-xl border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] pointer-events-none"
            />
          )}

          {/* Tooltip card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute max-w-sm"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              transform: tooltipPosition.transform,
            }}
          >
            <div className="relative rounded-2xl bg-background/90 backdrop-blur-xl border border-border/50 shadow-2xl p-5">
              {/* Step number and icon */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                  <span className="text-lg">{step.icon}</span>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Step {currentStep + 1} of {visibleSteps.length}
                  </p>
                  <h3 className="text-sm font-bold text-foreground">
                    {step.title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Step indicator dots */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {visibleSteps.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'bg-emerald-500 w-6 h-1.5'
                        : i < currentStep
                          ? 'bg-emerald-500/50 w-1.5 h-1.5'
                          : 'bg-border w-1.5 h-1.5'
                    }`}
                    animate={{
                      scale: i === currentStep ? 1.1 : 1,
                    }}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={prevStep}
                      className="h-8 text-xs gap-1"
                    >
                      <ChevronLeft className="size-3.5" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={endTour}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    onClick={nextStep}
                    className="h-8 text-xs gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
                  >
                    {currentStep === visibleSteps.length - 1 ? (
                      <>
                        <Sparkles className="size-3.5" />
                        Get Started!
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="size-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={endTour}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close tour"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Helper to restart tour from anywhere ──────────────────────────────────

export function restartTour() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tamangnetra-restart-tour'));
  }
}
