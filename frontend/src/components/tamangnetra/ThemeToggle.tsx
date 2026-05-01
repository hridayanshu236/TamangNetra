'use client';

import { useTheme } from 'next-themes';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const handleInteraction = useCallback(() => {
    if (!mounted) {
      setMounted(true);
    }
  }, [mounted]);

  const isDark = theme === 'dark';

  // Show a placeholder until we know the theme (avoids hydration mismatch)
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleInteraction}
        className="size-9 overflow-hidden rounded-full border border-border/50 bg-background/50 backdrop-blur-sm"
      >
        <Sun className="size-4 text-amber-400" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="relative size-9 overflow-hidden rounded-full border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent transition-colors duration-300"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: 90, scale: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Sun className="size-4 text-amber-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: -90, scale: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Moon className="size-4 text-emerald-600" />
                </motion.div>
              )}
            </AnimatePresence>
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {isDark ? 'light' : 'dark'} mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
