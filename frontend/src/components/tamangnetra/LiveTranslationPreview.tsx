'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Languages } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useTranslationStore } from './TranslationStore';

// ============ Dictionaries for offline preview ============

const enToNe: Record<string, string> = {
  hello: 'नमस्ते',
  how: 'कसरी',
  are: 'हुनुहुन्छ',
  you: 'तपाईं',
  good: 'राम्रो',
  morning: 'बिहान',
  night: 'रात',
  thank: 'धन्यवाद',
  the: 'यो',
  is: 'हो',
  a: 'एक',
  book: 'किताब',
  water: 'पानी',
  food: 'खाना',
  house: 'घर',
  love: 'माया',
  friend: 'साथी',
  world: 'विश्व',
  country: 'देश',
  people: 'मानिस',
};

const neToEn: Record<string, string> = Object.fromEntries(
  Object.entries(enToNe).map(([en, ne]) => [ne, en])
);

const enToTm: Record<string, string> = {
  hello: 'तामाङ नमस्कार',
  thank: 'तामाङ धन्यवाद',
  good: 'तामाङ राम्रो',
};

const neToTm: Record<string, string> = {
  नमस्ते: 'तामाङ नमस्कार',
  धन्यवाद: 'तामाङ धन्यवाद',
  राम्रो: 'तामाङ राम्रो',
};

const tmToEn: Record<string, string> = Object.fromEntries(
  Object.entries(enToTm).map(([en, tm]) => [tm, en])
);

const tmToNe: Record<string, string> = Object.fromEntries(
  Object.entries(neToTm).map(([ne, tm]) => [tm, ne])
);

function getDictionary(srcLang: string, tgtLang: string): Record<string, string> | null {
  if (srcLang === 'English' && tgtLang === 'Nepali') return enToNe;
  if (srcLang === 'Nepali' && tgtLang === 'English') return neToEn;
  if (srcLang === 'English' && tgtLang === 'Tamang') return enToTm;
  if (srcLang === 'Nepali' && tgtLang === 'Tamang') return neToTm;
  if (srcLang === 'Tamang' && tgtLang === 'English') return tmToEn;
  if (srcLang === 'Tamang' && tgtLang === 'Nepali') return tmToNe;
  return null;
}

interface DictResult {
  translated: string;
  matched: number;
  total: number;
}

function dictionaryTranslate(text: string, srcLang: string, tgtLang: string): DictResult | null {
  const dict = getDictionary(srcLang, tgtLang);
  if (!dict) return null;

  const words = text.trim().split(/\s+/);
  if (words.length === 0) return null;

  let matched = 0;
  const translated = words.map((word) => {
    const lower = word.toLowerCase().replace(/[.,!?;:।]/g, '');
    if (dict[lower]) {
      matched++;
      return dict[lower];
    }
    return `[${word}]`;
  }).join(' ');

  return { translated, matched, total: words.length };
}

// ============ Custom debounce hook (avoids setState in effect) ============

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============ Live Translation Preview Component ============

interface LiveTranslationPreviewProps {
  inputText: string;
}

export function LiveTranslationPreview({ inputText }: LiveTranslationPreviewProps) {
  const { srcLang, tgtLang, isTranslating } = useTranslationStore();

  const [isDismissed, setIsDismissed] = useState(false);

  // Debounce input text by 500ms
  const debouncedText = useDebouncedValue(inputText, 500);

  // Compute preview from debounced text (pure derivation via useMemo)
  const previewResult = useMemo(() => {
    if (!debouncedText.trim() || srcLang === tgtLang) return null;
    return dictionaryTranslate(debouncedText, srcLang, tgtLang);
  }, [debouncedText, srcLang, tgtLang]);

  // Determine if user is actively typing (debouncedText lags behind inputText)
  const isTyping = inputText !== debouncedText && inputText.trim().length > 0;

  // Language pair label
  const langPair = useMemo(() => {
    const flags: Record<string, string> = { English: '🇬🇧', Nepali: '🇳🇵', Tamang: '🏔️' };
    return `${flags[srcLang] || ''} ${srcLang} → ${flags[tgtLang] || ''} ${tgtLang}`;
  }, [srcLang, tgtLang]);

  // Confidence percent
  const confidencePercent = previewResult
    ? Math.round((previewResult.matched / previewResult.total) * 100)
    : 0;

  const showPanel = isTyping && previewResult && !isDismissed && !isTranslating;

  return (
    <AnimatePresence>
      {showPanel && (
        <motion.div
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 4, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          {/* Gradient border wrapper */}
          <div className="rounded-lg p-[1.5px]" style={{
            background: 'linear-gradient(135deg, #10b981, #14b8a6, #f59e0b)',
          }}>
            <div className="rounded-[6px] bg-background/95 dark:bg-card/95 backdrop-blur-md p-3 space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Pulsing live dot */}
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                  <Languages className="size-3 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Live Preview
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 shrink-0">
                    {langPair}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0"
                  onClick={() => setIsDismissed(true)}
                >
                  <X className="size-3 text-muted-foreground" />
                </Button>
              </div>

              {/* Preview text — max 3-4 lines */}
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-foreground/80 leading-relaxed py-0.5 pl-2 border-l-2 border-teal-400/50 dark:border-teal-600/50 line-clamp-3"
              >
                {previewResult.translated}
              </motion.p>

              {/* Confidence bar */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  Dictionary match: {previewResult.matched}/{previewResult.total} words
                </span>
                <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: confidencePercent >= 70
                        ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                        : confidencePercent >= 40
                          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                          : 'linear-gradient(90deg, #ef4444, #f87171)',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${confidencePercent}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[9px] font-medium text-muted-foreground tabular-nums">
                  {confidencePercent}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
