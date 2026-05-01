'use client';

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accessibility,
  Type,
  Contrast,
  Eye,
  Minimize2,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Switch } from '@/src/components/ui/switch';
import { Slider } from '@/src/components/ui/slider';
import { Button } from '@/src/components/ui/button';
import { Separator } from '@/src/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/src/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';

// ── localStorage keys ──
const KEYS = {
  fontSize: 'tamangnetra-a11y-fontSize',
  highContrast: 'tamangnetra-a11y-highContrast',
  dyslexiaFont: 'tamangnetra-a11y-dyslexiaFont',
  reducedMotion: 'tamangnetra-a11y-reducedMotion',
  lineHeight: 'tamangnetra-a11y-lineHeight',
} as const;

// ── Defaults ──
const DEFAULTS = {
  fontSize: 16,
  highContrast: false,
  dyslexiaFont: false,
  reducedMotion: false,
  lineHeight: 1.5,
} as const;

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(KEYS.reducedMotion);
  if (stored !== null) return JSON.parse(stored) as boolean;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── Main Component ──

export function AccessibilityPanel() {
  const [isOpen, setIsOpen] = useState(false);

  // Hydration-safe mount detection
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Settings state with lazy initialization from localStorage
  const [fontSize, setFontSize] = useState(() => getStoredValue(KEYS.fontSize, DEFAULTS.fontSize));
  const [highContrast, setHighContrast] = useState(() => getStoredValue(KEYS.highContrast, DEFAULTS.highContrast));
  const [dyslexiaFont, setDyslexiaFont] = useState(() => getStoredValue(KEYS.dyslexiaFont, DEFAULTS.dyslexiaFont));
  const [reducedMotion, setReducedMotion] = useState(() => getInitialReducedMotion());
  const [lineHeight, setLineHeight] = useState(() => getStoredValue(KEYS.lineHeight, DEFAULTS.lineHeight));

  // Apply CSS variable for font size
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    localStorage.setItem(KEYS.fontSize, JSON.stringify(fontSize));
  }, [fontSize, mounted]);

  // Apply high contrast class
  useEffect(() => {
    if (!mounted) return;
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    localStorage.setItem(KEYS.highContrast, JSON.stringify(highContrast));
  }, [highContrast, mounted]);

  // Apply dyslexia font class
  useEffect(() => {
    if (!mounted) return;
    if (dyslexiaFont) {
      document.documentElement.classList.add('dyslexia-font');
    } else {
      document.documentElement.classList.remove('dyslexia-font');
    }
    localStorage.setItem(KEYS.dyslexiaFont, JSON.stringify(dyslexiaFont));
  }, [dyslexiaFont, mounted]);

  // Apply reduced motion class
  useEffect(() => {
    if (!mounted) return;
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
    localStorage.setItem(KEYS.reducedMotion, JSON.stringify(reducedMotion));
  }, [reducedMotion, mounted]);

  // Apply line height via CSS variable
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.setProperty('--base-line-height', String(lineHeight));
    localStorage.setItem(KEYS.lineHeight, JSON.stringify(lineHeight));
  }, [lineHeight, mounted]);

  // Count active customizations
  const activeCount = useMemo(() => {
    let count = 0;
    if (fontSize !== DEFAULTS.fontSize) count++;
    if (highContrast !== DEFAULTS.highContrast) count++;
    if (dyslexiaFont !== DEFAULTS.dyslexiaFont) count++;
    if (reducedMotion !== DEFAULTS.reducedMotion) count++;
    if (lineHeight !== DEFAULTS.lineHeight) count++;
    return count;
  }, [fontSize, highContrast, dyslexiaFont, reducedMotion, lineHeight]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setFontSize(DEFAULTS.fontSize);
    setHighContrast(DEFAULTS.highContrast);
    setDyslexiaFont(DEFAULTS.dyslexiaFont);
    setReducedMotion(DEFAULTS.reducedMotion);
    setLineHeight(DEFAULTS.lineHeight);
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  }, []);

  if (!mounted) {
    return (
      <Card className="h-fit backdrop-blur-md bg-card/80 dark:bg-card/60 border-border/50 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Accessibility className="size-4 text-amber-600" />
            Accessibility
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="skeleton-emerald h-4 w-24 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="h-fit backdrop-blur-md bg-card/80 dark:bg-card/60 border-border/50 shadow-lg card-hover">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Accessibility className="size-4 text-amber-600" />
                  Accessibility
                  {activeCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                    >
                      {activeCount} active
                    </Badge>
                  )}
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="size-4 text-muted-foreground" />
                </motion.div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <CardContent className="space-y-4 pt-0">
                    {/* Font Size Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-help">
                                <Type className="size-3.5 text-emerald-600" />
                                <span className="text-xs font-medium">Font Size</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Adjust the base font size across the app</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                          {fontSize}px
                        </span>
                      </div>
                      <Slider
                        value={[fontSize]}
                        onValueChange={([v]) => setFontSize(v)}
                        min={12}
                        max={24}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground/50">
                        <span>12px</span>
                        <span>24px</span>
                      </div>
                    </div>

                    <Separator />

                    {/* High Contrast Mode */}
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-help">
                              <Contrast className="size-3.5 text-teal-600" />
                              <span className="text-xs font-medium">High Contrast</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Increase color contrast for better readability</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch
                        checked={highContrast}
                        onCheckedChange={setHighContrast}
                        aria-label="Toggle high contrast mode"
                      />
                    </div>

                    <Separator />

                    {/* Dyslexia-Friendly Font */}
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-help">
                              <Eye className="size-3.5 text-amber-600" />
                              <span className="text-xs font-medium">Dyslexia Font</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Use OpenDyslexic or similar font for easier reading</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch
                        checked={dyslexiaFont}
                        onCheckedChange={setDyslexiaFont}
                        aria-label="Toggle dyslexia-friendly font"
                      />
                    </div>

                    <Separator />

                    {/* Reduced Motion */}
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-help">
                              <Minimize2 className="size-3.5 text-emerald-600" />
                              <span className="text-xs font-medium">Reduced Motion</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Disable animations and transitions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch
                        checked={reducedMotion}
                        onCheckedChange={setReducedMotion}
                        aria-label="Toggle reduced motion"
                      />
                    </div>

                    <Separator />

                    {/* Line Height Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-help">
                                <Minimize2 className="size-3.5 text-teal-600" />
                                <span className="text-xs font-medium">Line Height</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Adjust line spacing for readability</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                          {lineHeight.toFixed(1)}
                        </span>
                      </div>
                      <Slider
                        value={[lineHeight]}
                        onValueChange={([v]) => setLineHeight(v)}
                        min={1.2}
                        max={2.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground/50">
                        <span>1.2</span>
                        <span>2.0</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Reset to Defaults */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5 hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-700 dark:hover:text-amber-400"
                      onClick={handleReset}
                    >
                      <RotateCcw className="size-3" />
                      Reset to Defaults
                    </Button>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}
