'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImageIcon,
  Loader2,
  Languages,
  ScanLine,
  Pencil,
  Square,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { useTranslationStore } from './TranslationStore';
import { ImageOCREmptyState } from './EnhancedEmptyStates';
import { useToast } from '@/src/hooks/use-toast';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface OcrResult {
  text: string;
  confidence: number;
  rect: Rect;
  translated?: string;
}

export function ImageTranslator() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawRect, setDrawRect] = useState<Rect | null>(null);
  const [selections, setSelections] = useState<Rect[]>([]);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [penMode, setPenMode] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [zoomLevel, setZoomLevel] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { srcLang, tgtLang, startTranslation, updateProgress, setResults, addKnowledgeEntries, knowledgeGraphEnabled, apiToken } =
    useTranslationStore();

  // Handle image upload
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setImageSrc(src);
        setSelections([]);
        setOcrResults([]);
        setDrawRect(null);

        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [toast]
  );

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageSrc || !imageRef.current) return;

    const img = imageRef.current;
    const containerWidth = canvas.parentElement?.clientWidth || 600;
    const scale = containerWidth / img.width;
    const displayWidth = containerWidth;
    const displayHeight = img.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

    // Draw existing selections
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    for (const sel of selections) {
      ctx.strokeRect(
        sel.x * scale,
        sel.y * scale,
        sel.w * scale,
        sel.h * scale
      );
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.fillRect(sel.x * scale, sel.y * scale, sel.w * scale, sel.h * scale);
    }

    // Draw current selection
    if (drawRect) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        drawRect.x * scale,
        drawRect.y * scale,
        drawRect.w * scale,
        drawRect.h * scale
      );
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
      ctx.fillRect(
        drawRect.x * scale,
        drawRect.y * scale,
        drawRect.w * scale,
        drawRect.h * scale
      );
    }

    // Draw OCR result overlays
    for (const result of ocrResults) {
      if (result.translated) {
        const sel = result.rect;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
        ctx.fillRect(sel.x * scale, sel.y * scale, sel.w * scale, sel.h * scale);
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(12, sel.h * scale * 0.5)}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(result.translated, sel.x * scale + 4, sel.y * scale + 4, sel.w * scale - 8);
      }
    }
  }, [imageSrc, selections, drawRect, ocrResults]);

  // Mouse handlers for pen tool
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!penMode || !imageRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / imageRef.current.width;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    drawStartRef.current = { x, y };
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStartRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / imageRef.current.width;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setDrawRect({
      x: Math.min(drawStartRef.current.x, x),
      y: Math.min(drawStartRef.current.y, y),
      w: Math.abs(x - drawStartRef.current.x),
      h: Math.abs(y - drawStartRef.current.y),
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && drawRect && drawRect.w > 10 && drawRect.h > 10) {
      setSelections((prev) => [...prev, drawRect]);
    }
    setIsDrawing(false);
    drawStartRef.current = null;
    setDrawRect(null);
  };

  // Run OCR using Tesseract.js (lazy loaded)
  const handleOcr = async () => {
    if (selections.length === 0 && !imageSrc) {
      toast({
        title: 'No selections',
        description: 'Draw rectangles on the image to select areas for OCR.',
        variant: 'destructive',
      });
      return;
    }

    setIsOcrRunning(true);

    try {
      // Dynamic import of Tesseract.js
      const Tesseract = await import('tesseract.js');

      const results: OcrResult[] = [];

      // If no selections, OCR the full image
      const areas = selections.length > 0 ? selections : [
        { x: 0, y: 0, w: imageDimensions.width, h: imageDimensions.height },
      ];

      for (const area of areas) {
        // Create a canvas to crop the selected area
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx || !imageRef.current) continue;

        cropCanvas.width = area.w;
        cropCanvas.height = area.h;
        cropCtx.drawImage(
          imageRef.current,
          area.x,
          area.y,
          area.w,
          area.h,
          0,
          0,
          area.w,
          area.h
        );

        const dataUrl = cropCanvas.toDataURL('image/png');

        const result = await Tesseract.recognize(dataUrl, 'eng+nep', {
          logger: () => {},
        });

        if (result.data && result.data.text) {
          results.push({
            text: result.data.text.trim(),
            confidence: result.data.confidence,
            rect: area,
          });
        }
      }

      setOcrResults(results);

      if (results.length > 0) {
        toast({
          title: 'OCR Complete',
          description: `Extracted text from ${results.length} area(s).`,
        });
      } else {
        toast({
          title: 'No text found',
          description: 'OCR could not detect any text in the selected areas.',
        });
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast({
        title: 'OCR Failed',
        description: 'Could not perform OCR. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Translate OCR results
  const handleTranslateOcr = async () => {
    if (ocrResults.length === 0) return;

    setIsTranslating(true);
    startTranslation();

    try {
      const sentences = ocrResults
        .map((r) => r.text)
        .filter((t) => t.length > 0);

      if (sentences.length === 0) {
        toast({
          title: 'No text to translate',
          description: 'Run OCR first to extract text.',
          variant: 'destructive',
        });
        return;
      }

      updateProgress(0, sentences.length);

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentences,
          src_lang: srcLang,
          tgt_lang: tgtLang,
          api_token: apiToken || undefined,
        }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const data = await response.json();

      const updatedResults = ocrResults.map((r, i) => ({
        ...r,
        translated: data.translations[i]?.translated || r.text,
      }));

      setOcrResults(updatedResults);
      updateProgress(sentences.length, sentences.length);

      // Update store results
      const origText = ocrResults.map((r) => r.text).join('\n');
      const transText = updatedResults.map((r) => r.translated || r.text).join('\n');
      setResults(origText, transText, ocrResults.map((r, i) => ({
        original: r.text,
        translated: updatedResults[i]?.translated || r.text,
      })));

      if (knowledgeGraphEnabled) {
        addKnowledgeEntries(
          data.translations.map((t: { original: string; translated: string }) => ({
            source: t.original,
            translation: t.translated,
            frequency: 1,
          }))
        );
      }

      toast({
        title: 'Translation complete',
        description: `Translated ${sentences.length} text regions.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Translation failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const resetCanvas = () => {
    setSelections([]);
    setOcrResults([]);
    setDrawRect(null);
  };

  const handleSelectAll = useCallback(() => {
    if (!imageRef.current) return;
    setSelections([{
      x: 0,
      y: 0,
      w: imageDimensions.width,
      h: imageDimensions.height,
    }]);
    setOcrResults([]);
  }, [imageDimensions]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const clearAll = () => {
    setImageSrc(null);
    setSelections([]);
    setOcrResults([]);
    setDrawRect(null);
    setPenMode(false);
    imageRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanLine className="size-4 text-amber-600" />
          Image OCR Translation
        </CardTitle>
        <CardDescription>
          Upload an image, select text areas with the pen tool, OCR and
          translate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar with grouped buttons */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          {/* File group */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 gap-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <ImageIcon className="size-3.5" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Selection group */}
          <Button
            variant={penMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPenMode(!penMode)}
            disabled={!imageSrc}
            className="h-8 gap-1.5 text-xs"
          >
            <Pencil className="size-3.5" />
            {penMode ? 'Drawing' : 'Pen'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={!imageSrc}
            className="h-8 gap-1.5 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <Maximize2 className="size-3.5" />
            Select All
          </Button>

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Processing group */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOcr}
            disabled={isOcrRunning || !imageSrc}
            className="h-8 gap-1.5 text-xs hover:bg-teal-50 dark:hover:bg-teal-950/30"
          >
            {isOcrRunning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ZoomIn className="size-3.5" />
            )}
            OCR
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTranslateOcr}
            disabled={isTranslating || ocrResults.length === 0}
            className="h-8 gap-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            {isTranslating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Languages className="size-3.5" />
            )}
            Translate
          </Button>

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={!imageSrc || zoomLevel <= 0.5}
            className="h-8 text-xs px-2"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <button
            onClick={handleZoomReset}
            className="h-8 min-w-[3rem] text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={!imageSrc || zoomLevel >= 3}
            className="h-8 text-xs px-2"
          >
            <ZoomIn className="size-3.5" />
          </Button>

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetCanvas}
            disabled={!imageSrc}
            className="h-8 gap-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>

        {/* Canvas area */}
        <div className="relative rounded-lg border overflow-hidden bg-muted/20 min-h-[200px]" style={{ overflow: zoomLevel > 1 ? 'auto' : 'hidden' }}>
          {imageSrc ? (
            <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', transition: 'transform 0.2s ease' }}>
              <canvas
                ref={canvasRef}
                className={`w-full ${penMode ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          ) : (
            <ImageOCREmptyState />
          )}
        </div>

        {/* Selection & OCR Status */}
        <div className="flex flex-wrap items-center gap-2">
          {selections.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <Square className="mr-1 size-3" />
              {selections.length} selection(s)
            </Badge>
          )}
          {ocrResults.length > 0 && (
            <Badge
              variant="outline"
              className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
            >
              <ScanLine className="mr-1 size-3" />
              {ocrResults.length} text region(s)
            </Badge>
          )}
        </div>

        {/* OCR Results Text */}
        <AnimatePresence>
          {ocrResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Extracted Text
              </p>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 max-h-40 overflow-y-auto">
                {ocrResults.map((result, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground font-mono shrink-0">
                      [{i + 1}]
                    </span>
                    <span className="flex-1">{result.text}</span>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        result.confidence >= 80
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400'
                          : result.confidence >= 50
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'
                      }`}
                    >
                      {Math.round(result.confidence)}%
                    </span>
                    {result.translated && (
                      <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
                        → {result.translated}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear all button */}
        {imageSrc && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="w-full text-muted-foreground"
          >
            Clear Image
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
