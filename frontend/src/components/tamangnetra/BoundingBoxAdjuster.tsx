'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Type,
  Ratio,
  Minimize2,
  Maximize2,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Slider } from '@/src/components/ui/slider';
import { Separator } from '@/src/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { useTranslationStore } from './TranslationStore';
import { decryptPayload, isEncryptionActive } from '@/src/hooks/use-encryption';

interface BoundingBoxAdjusterProps {
  originalText?: string;
  translatedText?: string;
  srcLang?: string;
  tgtLang?: string;
  segments?: Array<{ original: string; translated: string }>;
}

/**
 * Language expansion factors (approximate ratio of target to source text length).
 * When translating from English to Nepali/Tamang, text typically expands ~30%.
 */
const EXPANSION_FACTORS: Record<string, Record<string, number>> = {
  English: { Nepali: 1.3, Tamang: 1.35 },
  Nepali: { English: 0.77, Tamang: 1.05 },
  Tamang: { English: 0.74, Nepali: 0.95 },
};

const BASE_FONT_SIZE = 16; // px

export function BoundingBoxAdjuster({
  originalText: propOriginal,
  translatedText: propTranslated,
  srcLang: propSrcLang,
  tgtLang: propTgtLang,
  segments: propSegments,
}: BoundingBoxAdjusterProps) {
  const [manualScale, setManualScale] = useState<number | null>(null);
  const store = useTranslationStore();

  const isEncrypted = store.isEncrypted && isEncryptionActive(store.encryptionKey);

  // Decrypt data if encrypted for proper font size calculation
  const rawOriginal = propOriginal || store.originalText;
  const rawTranslated = propTranslated || store.translatedText;
  const rawSegments = propSegments || store.segments;

  const originalText = useMemo(() => {
    if (isEncrypted) return decryptPayload(rawOriginal, store.encryptionKey);
    return rawOriginal;
  }, [isEncrypted, rawOriginal, store.encryptionKey]);

  const translatedText = useMemo(() => {
    if (isEncrypted) return decryptPayload(rawTranslated, store.encryptionKey);
    return rawTranslated;
  }, [isEncrypted, rawTranslated, store.encryptionKey]);

  const srcLang = propSrcLang || store.srcLang;
  const tgtLang = propTgtLang || store.tgtLang;

  const segments = useMemo(() => {
    if (isEncrypted) {
      return rawSegments.map((s) => ({
        original: decryptPayload(s.original, store.encryptionKey),
        translated: decryptPayload(s.translated, store.encryptionKey),
      }));
    }
    return rawSegments;
  }, [isEncrypted, rawSegments, store.encryptionKey]);

  const hasResults = originalText.length > 0 && translatedText.length > 0;

  // Calculate the actual length ratio between original and translated text
  const lengthRatio = useMemo(() => {
    if (!originalText || !translatedText) return 1;
    return translatedText.length / originalText.length;
  }, [originalText, translatedText]);

  // Calculate the recommended font scale factor
  // Formula: newFontSize = originalFontSize * (originalLength / translatedLength)
  // Or equivalently: scaleFactor = originalLength / translatedLength
  const recommendedScale = useMemo(() => {
    if (!originalText || !translatedText || lengthRatio <= 0) return 1;
    const calculated = 1 / lengthRatio;
    // Clamp between 0.5 and 1.5 to avoid extreme values
    return Math.max(0.5, Math.min(1.5, calculated));
  }, [originalText, translatedText, lengthRatio]);

  // Get the expected expansion factor for this language pair
  const expectedExpansion = EXPANSION_FACTORS[srcLang]?.[tgtLang] ?? 1;

  // The effective scale is either manual or recommended
  const effectiveScale = manualScale ?? recommendedScale;

  // Calculate pixel sizes
  const originalFontSize = BASE_FONT_SIZE;
  const adjustedFontSize = Math.round(BASE_FONT_SIZE * effectiveScale * 10) / 10;

  // Determine if adjustment is needed (more than 5% difference)
  const needsAdjustment = Math.abs(effectiveScale - 1) > 0.05;

  // Calculate per-segment adjustments for the table
  const segmentAdjustments = useMemo(() => {
    if (!segments || segments.length === 0) return [];
    return segments.map((seg) => {
      const origLen = seg.original.length;
      const transLen = seg.translated.length;
      const ratio = origLen > 0 ? transLen / origLen : 1;
      const scale = origLen > 0 ? Math.max(0.5, Math.min(1.5, 1 / ratio)) : 1;
      const fontSize = Math.round(BASE_FONT_SIZE * scale * 10) / 10;
      return {
        original: seg.original,
        translated: seg.translated,
        lengthRatio: ratio.toFixed(2),
        scale: scale.toFixed(2),
        fontSize,
      };
    });
  }, [segments]);

  if (!hasResults) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Type className="mx-auto size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Translate some text first to see font adjustment analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ratio className="size-4 text-emerald-600" />
                Bounding Box Font Adjustment
              </CardTitle>
              <CardDescription className="mt-1">
                Adjust font sizes when translated text doesn&apos;t fit the original bounding box
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={needsAdjustment ? 'default' : 'outline'}
                    className={needsAdjustment ? 'bg-amber-500' : ''}
                  >
                    {needsAdjustment ? 'Adjustment Needed' : 'No Adjustment'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    When translating between languages with different text expansion
                    rates, the translated text may not fit within the original
                    bounding box. Font size adjustment helps maintain layout integrity.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Language Pair & Expansion Factor */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{srcLang}</Badge>
            <span className="text-xs text-muted-foreground">→</span>
            <Badge variant="outline">{tgtLang}</Badge>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-xs text-muted-foreground">
              Expected expansion:
            </span>
            <Badge variant="secondary" className="text-xs">
              {(expectedExpansion * 100 - 100).toFixed(0)}%
              {expectedExpansion > 1 ? ' larger' : expectedExpansion < 1 ? ' smaller' : ' same'}
            </Badge>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-xs text-muted-foreground">
              Actual ratio:
            </span>
            <Badge variant="secondary" className="text-xs">
              {lengthRatio.toFixed(2)}x ({originalText.length} → {translatedText.length} chars)
            </Badge>
          </div>

          {/* Formula Display */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="size-4 text-amber-500" />
              <p className="text-sm font-medium">Adjustment Formula</p>
            </div>
            <code className="text-xs font-mono block bg-background rounded p-2 border">
              newFontSize = originalFontSize × (originalLength / translatedLength)
            </code>
            <code className="text-xs font-mono block bg-background rounded p-2 border mt-1">
              {adjustedFontSize}px = {originalFontSize}px × ({originalText.length} / {translatedText.length}) = {effectiveScale.toFixed(3)}
            </code>
          </div>

          {/* Visual Comparison */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Visual Comparison
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Text - Baseline */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Original ({srcLang})
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    <Maximize2 className="size-3 mr-1" />
                    {originalFontSize}px
                  </Badge>
                </div>
                <div
                  className="rounded bg-muted/30 p-3 overflow-hidden"
                  style={{
                    fontSize: `${originalFontSize}px`,
                    lineHeight: 1.5,
                    maxHeight: '120px',
                  }}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {originalText.slice(0, 200)}
                    {originalText.length > 200 ? '...' : ''}
                  </p>
                </div>
              </div>

              {/* Translated Text - Adjusted */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Translated ({tgtLang})
                  </p>
                  <Badge
                    variant={needsAdjustment ? 'default' : 'outline'}
                    className={`text-[10px] ${needsAdjustment ? 'bg-amber-500' : ''}`}
                  >
                    <Minimize2 className="size-3 mr-1" />
                    {adjustedFontSize}px
                  </Badge>
                </div>
                <div
                  className="rounded bg-emerald-50/50 dark:bg-emerald-950/20 p-3 overflow-hidden"
                  style={{
                    fontSize: `${adjustedFontSize}px`,
                    lineHeight: 1.5,
                    maxHeight: '120px',
                  }}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {translatedText.slice(0, 200)}
                    {translatedText.length > 200 ? '...' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Override Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Manual Override
              </p>
              {manualScale !== null && (
                <button
                  onClick={() => setManualScale(null)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                >
                  Reset to recommended ({recommendedScale.toFixed(2)})
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-12">0.5x</span>
              <Slider
                value={[manualScale ?? recommendedScale]}
                onValueChange={([val]) => setManualScale(val)}
                min={0.5}
                max={1.5}
                step={0.01}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-12 text-right">1.5x</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">
                Scale factor:{' '}
                <span className="font-mono font-semibold">
                  {effectiveScale.toFixed(2)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Resulting font size:{' '}
                <span className="font-mono font-semibold">
                  {adjustedFontSize}px
                </span>
              </p>
            </div>
          </div>

          {/* Per-Segment Analysis */}
          {segmentAdjustments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Per-Segment Analysis
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Original</th>
                        <th className="text-left p-2 font-medium">Translated</th>
                        <th className="text-center p-2 font-medium">Ratio</th>
                        <th className="text-center p-2 font-medium">Scale</th>
                        <th className="text-center p-2 font-medium">Font</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segmentAdjustments.map((row, i) => (
                        <tr
                          key={i}
                          className="border-t hover:bg-muted/20 transition-colors"
                        >
                          <td className="p-2 max-w-[120px] truncate" title={row.original}>
                            {row.original}
                          </td>
                          <td className="p-2 max-w-[120px] truncate" title={row.translated}>
                            {row.translated}
                          </td>
                          <td className="p-2 text-center">
                            <Badge
                              variant={
                                parseFloat(row.lengthRatio) > 1.2
                                  ? 'default'
                                  : 'outline'
                              }
                              className={`text-[10px] ${
                                parseFloat(row.lengthRatio) > 1.2
                                  ? 'bg-amber-500'
                                  : ''
                              }`}
                            >
                              {row.lengthRatio}x
                            </Badge>
                          </td>
                          <td className="p-2 text-center font-mono">
                            {row.scale}
                          </td>
                          <td className="p-2 text-center font-mono">
                            {row.fontSize}px
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
