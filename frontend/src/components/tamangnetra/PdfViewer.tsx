"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";

interface PdfViewerProps {
  file: File;
  title?: string;
  onClose: () => void;
}

export function PdfViewer({ file, title, onClose }: PdfViewerProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right");
  const renderQueueRef = useRef<boolean>(false);

  const renderPage = useCallback(
    async (pdfDoc: unknown, pageNum: number, renderScale: number): Promise<string> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = await (pdfDoc as any).getPage(pageNum);
      const viewport = page.getViewport({ scale: renderScale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL("image/png");
    },
    []
  );

  useEffect(() => {
    if (renderQueueRef.current) return;
    renderQueueRef.current = true;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import pdfjs to avoid SSR issues
        const pdfjsLib = await import("pdfjs-dist");
        // Use locally served worker (copied to /public) to avoid CDN failures
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdfDoc.numPages;
        setTotalPages(numPages);

        // Render pages progressively
        const pageImages: string[] = [];
        for (let i = 1; i <= numPages; i++) {
          const img = await renderPage(pdfDoc, i, 1.8);
          pageImages.push(img);
          setPages([...pageImages]);
          if (i === 1) setIsLoading(false);
        }
      } catch (err) {
        console.error("PDF load error:", err);
        setError("Failed to render PDF. The file may be corrupted or protected.");
        setIsLoading(false);
      }
    };

    loadPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const goToPrev = () => {
    if (currentPage <= 0 || isFlipping) return;
    setFlipDirection("left");
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage((p) => p - 1);
      setIsFlipping(false);
    }, 300);
  };

  const goToNext = () => {
    if (currentPage >= pages.length - 1 || isFlipping) return;
    setFlipDirection("right");
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage((p) => p + 1);
      setIsFlipping(false);
    }, 300);
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3.0));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  const flipVariants = {
    enterFromRight: { x: 60, opacity: 0, rotateY: -8, scale: 0.97 },
    enterFromLeft: { x: -60, opacity: 0, rotateY: 8, scale: 0.97 },
    center: { x: 0, opacity: 1, rotateY: 0, scale: 1 },
    exitToLeft: { x: -60, opacity: 0, rotateY: 8, scale: 0.97 },
    exitToRight: { x: 60, opacity: 0, rotateY: -8, scale: 0.97 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-md"
      style={{ perspective: "1200px" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-zinc-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <FileText className="size-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white truncate max-w-[400px]">
              {title ?? file.name}
            </p>
            {!isLoading && (
              <p className="text-xs text-zinc-400">
                Page {currentPage + 1} of {pages.length || totalPages}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
            <button
              onClick={zoomOut}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="text-xs text-zinc-400 w-10 text-center font-mono">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Page area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        {/* Prev button */}
        <button
          onClick={goToPrev}
          disabled={currentPage <= 0 || isLoading}
          className="absolute left-6 z-10 p-3 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>

        {/* PDF page */}
        <div className="relative flex items-center justify-center overflow-auto max-h-full max-w-full px-20 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 text-zinc-400">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              >
                <Loader2 className="size-10 text-emerald-400" />
              </motion.div>
              <p className="text-sm">Rendering PDF...</p>
              {totalPages > 0 && (
                <p className="text-xs text-zinc-500">
                  {pages.length} / {totalPages} pages ready
                </p>
              )}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400 max-w-sm text-center">
              <FileText className="size-12 text-red-400/50" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : pages.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={
                  flipDirection === "right"
                    ? flipVariants.enterFromRight
                    : flipVariants.enterFromLeft
                }
                animate={flipVariants.center}
                exit={
                  flipDirection === "right"
                    ? flipVariants.exitToLeft
                    : flipVariants.exitToRight
                }
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 26,
                }}
                style={{
                  transformStyle: "preserve-3d",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                }}
                className="rounded-md overflow-hidden transition-transform duration-200"
              >
                {/* Page shadow / book spine effect */}
                <div
                  className="absolute inset-y-0 left-0 w-8 pointer-events-none z-10"
                  style={{
                    background: "linear-gradient(to right, rgba(0,0,0,0.3) 0%, transparent 100%)",
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pages[currentPage]}
                  alt={`Page ${currentPage + 1}`}
                  className="block max-h-[78vh] w-auto"
                  style={{ imageRendering: "crisp-edges" }}
                />
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>

        {/* Next button */}
        <button
          onClick={goToNext}
          disabled={currentPage >= pages.length - 1 || isLoading}
          className="absolute right-6 z-10 p-3 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Bottom pagination dots */}
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3 shrink-0">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i === currentPage) return;
                setFlipDirection(i > currentPage ? "right" : "left");
                setCurrentPage(i);
              }}
              className={`rounded-full transition-all duration-200 ${
                i === currentPage
                  ? "w-6 h-2 bg-emerald-400"
                  : "w-2 h-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <p className="text-center text-xs text-zinc-600 pb-2 shrink-0">
        Use ← → arrow keys to navigate · Scroll to pan · Press Esc to close
      </p>
    </motion.div>
  );
}
