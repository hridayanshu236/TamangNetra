'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Languages,
  Youtube,
  ScanLine,
  Settings,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/src/components/ui/sheet';
import { Button } from '@/src/components/ui/button';
import { TranslationSettings } from './TranslationSettings';
import { TranslationProgressDashboard } from './TranslationProgressDashboard';
import { AccessibilityPanel } from './AccessibilityPanel';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  targetId?: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, targetId: 'hero' },
  { id: 'translate', label: 'Translate', icon: Languages, targetId: 'tool-section' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, targetId: 'tool-section' },
  { id: 'ocr', label: 'OCR', icon: ScanLine, targetId: 'tool-section' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function MobileBottomNav() {
  const [activeId, setActiveId] = useState('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Hide nav when virtual keyboard is open (visual viewport API)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const handleResize = () => {
      // If the viewport is significantly smaller than the layout viewport,
      // a keyboard is likely open
      if (viewport) {
        const isKeyboardOpen = viewport.height < window.innerHeight * 0.75;
        setIsVisible(!isKeyboardOpen);
      }
    };

    viewport?.addEventListener('resize', handleResize);
    viewport?.addEventListener('scroll', handleResize);
    return () => {
      viewport?.removeEventListener('resize', handleResize);
      viewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Determine which section is most visible
      if (scrollY < windowHeight * 0.4) {
        setActiveId('home');
      } else {
        // Check if tool-section is in view
        const toolSection = document.getElementById('tool-section');
        if (toolSection) {
          const rect = toolSection.getBoundingClientRect();
          if (rect.top < windowHeight * 0.5 && rect.bottom > 0) {
            setActiveId('translate');
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = useCallback(
    (item: NavItem) => {
      if (item.id === 'settings') {
        setSettingsOpen(true);
        setActiveId(item.id);
        return;
      }

      if (item.id === 'youtube') {
        // Click the YouTube tab trigger
        const youtubeTab = document.querySelector('[data-value="youtube"]') as HTMLElement;
        if (youtubeTab) youtubeTab.click();

        // Scroll to tool section
        const target = document.getElementById('tool-section');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setActiveId(item.id);
        return;
      }

      if (item.id === 'ocr') {
        // Click the Image OCR tab trigger
        const imageTab = document.querySelector('[data-value="image"]') as HTMLElement;
        if (imageTab) imageTab.click();

        // Scroll to tool section
        const target = document.getElementById('tool-section');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setActiveId(item.id);
        return;
      }

      if (item.targetId) {
        const target = document.getElementById(item.targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      if (item.id === 'translate') {
        // Ensure file tab is active
        const fileTab = document.querySelector('[data-value="file"]') as HTMLElement;
        if (fileTab) fileTab.click();
      }

      setActiveId(item.id);
    },
    []
  );

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Glassmorphism background */}
            <div className="relative">
              <div className="absolute inset-0 bg-background/70 backdrop-blur-xl border-t border-border/30" />
              <div className="relative flex items-center justify-around px-2 pt-1 pb-1">
                {navItems.map((item) => {
                  const isActive = activeId === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      className="flex flex-col items-center justify-center gap-0.5 min-w-[3rem] py-1.5 px-1 rounded-lg transition-colors relative"
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {/* Active indicator dot */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            className="absolute -top-0.5 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-emerald-500"
                          />
                        )}
                      </AnimatePresence>

                      {/* Icon with scale bounce on active */}
                      <motion.div
                        animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        <Icon
                          className={`size-5 transition-colors duration-200 ${
                            isActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </motion.div>

                      {/* Label */}
                      <span
                        className={`text-[10px] font-medium transition-colors duration-200 ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
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
    </>
  );
}
