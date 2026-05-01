'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Keyboard,
  Languages,
  ArrowLeftRight,
  History,
  Moon,
  Sun,
  FileText,
  Video,
  Image,
  Search,
  X,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/src/components/ui/command';
import { useTheme } from 'next-themes';
import { useTranslationStore } from './TranslationStore';

interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  icon: React.ElementType;
  action?: () => void;
}

const shortcuts: Shortcut[] = [
  {
    id: 'translate',
    keys: ['Ctrl', 'Enter'],
    description: 'Translate text',
    category: 'Translation',
    icon: Languages,
  },
  {
    id: 'swap',
    keys: ['Ctrl', 'Shift', 'S'],
    description: 'Swap languages',
    category: 'Translation',
    icon: ArrowLeftRight,
  },
  {
    id: 'shortcut-picker',
    keys: ['Ctrl', 'K'],
    description: 'Open shortcut picker',
    category: 'General',
    icon: Keyboard,
  },
  {
    id: 'history',
    keys: ['Ctrl', 'H'],
    description: 'Toggle history',
    category: 'General',
    icon: History,
  },
  {
    id: 'dark-mode',
    keys: ['Ctrl', 'D'],
    description: 'Toggle dark mode',
    category: 'General',
    icon: Moon,
  },
  {
    id: 'tab-file',
    keys: ['Ctrl', '1'],
    description: 'Switch to File Translation tab',
    category: 'Navigation',
    icon: FileText,
  },
  {
    id: 'tab-youtube',
    keys: ['Ctrl', '2'],
    description: 'Switch to YouTube tab',
    category: 'Navigation',
    icon: Video,
  },
  {
    id: 'tab-image',
    keys: ['Ctrl', '3'],
    description: 'Switch to Image OCR tab',
    category: 'Navigation',
    icon: Image,
  },
  {
    id: 'escape',
    keys: ['Esc'],
    description: 'Close modal / dialog',
    category: 'Navigation',
    icon: X,
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-[0_1px_0_1px_rgba(0,0,0,0.05)]">
      {children}
    </kbd>
  );
}

export function ShortcutPicker() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toggleHistory, swapLanguages } = useTranslationStore();
  const isTypingRef = useRef(false);

  // Track if user is typing in an input/textarea
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      isTypingRef.current =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
    };
    const handleBlur = () => {
      isTypingRef.current = false;
    };
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // Execute shortcut action
  const executeAction = useCallback(
    (id: string) => {
      switch (id) {
        case 'swap':
          swapLanguages();
          break;
        case 'history':
          toggleHistory();
          break;
        case 'dark-mode':
          setTheme(theme === 'dark' ? 'light' : 'dark');
          break;
        case 'tab-file':
          document.querySelector('[data-value="file"]')?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
          );
          break;
        case 'tab-youtube':
          document.querySelector('[data-value="youtube"]')?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
          );
          break;
        case 'tab-image':
          document.querySelector('[data-value="image"]')?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
          );
          break;
        case 'shortcut-picker':
          setOpen(true);
          break;
      }
    },
    [swapLanguages, toggleHistory, setTheme, theme]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ctrl+K always works (opens shortcut picker)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // If typing in input, only allow specific shortcuts
      if (isTyping) return;

      // Ctrl+Enter: translate (handled by FileTranslator, but also register globally)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        // Already handled by FileTranslator, don't double-fire
        return;
      }

      // Ctrl+Shift+S: swap languages
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        swapLanguages();
        return;
      }

      // Ctrl+H: toggle history
      if ((e.ctrlKey || e.metaKey) && (e.key === 'H' || e.key === 'h')) {
        e.preventDefault();
        toggleHistory();
        return;
      }

      // Ctrl+D: toggle dark mode
      if ((e.ctrlKey || e.metaKey) && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
        return;
      }

      // Ctrl+1/2/3: switch tabs
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        document.querySelector('[data-value="file"]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        document.querySelector('[data-value="youtube"]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        document.querySelector('[data-value="image"]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swapLanguages, toggleHistory, setTheme, theme]);

  // Close on Escape (handled by Dialog already, but ensure state sync)
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  const categories = ['General', 'Translation', 'Navigation'];

  return (
    <>
      {/* Floating shortcut hint button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm hover:bg-background hover:text-foreground transition-colors shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Keyboard className="size-3.5" />
        <span className="hidden sm:inline">Shortcuts</span>
        <span className="flex items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </motion.button>

      {/* Command Dialog */}
      <AnimatePresence>
        {open && (
          <CommandDialog
            open={open}
            onOpenChange={setOpen}
            title="Keyboard Shortcuts"
            description="Search and execute keyboard shortcuts"
          >
            <CommandInput placeholder="Search shortcuts..." />
            <CommandList>
              <CommandEmpty>No shortcuts found.</CommandEmpty>
              {categories.map((category) => {
                const categoryShortcuts = shortcuts.filter(
                  (s) => s.category === category
                );
                if (categoryShortcuts.length === 0) return null;
                return (
                  <CommandGroup key={category} heading={category}>
                    {categoryShortcuts.map((shortcut) => (
                      <CommandItem
                        key={shortcut.id}
                        value={`${shortcut.description} ${shortcut.keys.join(' ')} ${shortcut.category}`}
                        onSelect={() => {
                          executeAction(shortcut.id);
                          if (shortcut.id !== 'shortcut-picker') {
                            setOpen(false);
                          }
                        }}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <shortcut.icon className="size-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm">
                          {shortcut.description}
                        </span>
                        <span className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <Kbd>{key}</Kbd>
                              {i < shortcut.keys.length - 1 && (
                                <span className="text-muted-foreground/40 text-[10px]">
                                  +
                                </span>
                              )}
                            </span>
                          ))}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
            {/* Footer hint */}
            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
              <span>Navigate with ↑↓ • Select with Enter</span>
              <span className="flex items-center gap-1">
                <Kbd>Esc</Kbd> to close
              </span>
            </div>
          </CommandDialog>
        )}
      </AnimatePresence>
    </>
  );
}
