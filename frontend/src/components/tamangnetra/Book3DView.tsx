'use client';

import { useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { useTranslationStore } from './TranslationStore';

interface Book3DViewProps {
  originalSegments?: string[];
  translatedSegments?: string[];
  srcLang?: string;
  tgtLang?: string;
}

// Page content component for 3D text
function PageContent({
  text,
  position,
  rotation,
  color,
}: {
  text: string;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}) {
  // Truncate text to fit on page
  const displayText = text.length > 200 ? text.substring(0, 200) + '...' : text;

  return (
    <group position={position} rotation={rotation}>
      {/* Page background */}
      <mesh>
        <planeGeometry args={[2.8, 3.8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Text content */}
      <Text
        position={[0, 1.2, 0.01]}
        fontSize={0.12}
        maxWidth={2.4}
        lineHeight={1.4}
        color="#1a1a1a"
        anchorX="center"
        anchorY="top"
        font={undefined}
      >
        {displayText}
      </Text>
    </group>
  );
}

// Book component with page flip
function Book({
  currentPage,
  totalPages,
  leftText,
  rightText,
}: {
  currentPage: number;
  totalPages: number;
  leftText: string;
  rightText: string;
}) {
  const bookRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Gentle floating animation
  useFrame((state) => {
    if (bookRef.current) {
      bookRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      bookRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group ref={bookRef}>
      {/* Book spine */}
      <mesh position={[-0.01, 0, 0]}>
        <boxGeometry args={[0.06, 4, 0.2]} />
        <meshStandardMaterial color="#5a3825" />
      </mesh>

      {/* Left page (Original) */}
      <PageContent
        text={leftText}
        position={[-1.45, 0, 0.05]}
        rotation={[0, -0.15, 0]}
        color="#fef9f0"
      />

      {/* Right page (Translated) */}
      <PageContent
        text={rightText}
        position={[1.45, 0, 0.05]}
        rotation={[0, 0.15, 0]}
        color="#f0fdf4"
      />

      {/* Book cover hint */}
      <mesh position={[0, -2.1, 0]}>
        <boxGeometry args={[5.9, 0.15, 3.8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );
}

// Scene setup
function Scene({
  currentPage,
  totalPages,
  leftText,
  rightText,
}: {
  currentPage: number;
  totalPages: number;
  leftText: string;
  rightText: string;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, 3, 5]} intensity={0.3} color="#f59e0b" />
      <Book
        currentPage={currentPage}
        totalPages={totalPages}
        leftText={leftText}
        rightText={rightText}
      />
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={10}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

function Book3DViewInner({
  originalSegments,
  translatedSegments,
  srcLang,
  tgtLang,
}: Book3DViewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [webglError, setWebglError] = useState(false);

  const store = useTranslationStore();
  const origSegs = originalSegments || store.segments.map((s) => s.original);
  const transSegs = translatedSegments || store.segments.map((s) => s.translated);
  const src = srcLang || store.srcLang;
  const tgt = tgtLang || store.tgtLang;

  const hasResults = origSegs.length > 0;

  // Group segments into pages (4 segments per page)
  const SEGMENTS_PER_PAGE = 4;
  const totalPages = Math.max(
    1,
    Math.ceil(origSegs.length / SEGMENTS_PER_PAGE)
  );

  const pageLeftText = useMemo(() => {
    const start = currentPage * SEGMENTS_PER_PAGE;
    const end = Math.min(start + SEGMENTS_PER_PAGE, origSegs.length);
    return origSegs.slice(start, end).join('\n\n');
  }, [origSegs, currentPage]);

  const pageRightText = useMemo(() => {
    const start = currentPage * SEGMENTS_PER_PAGE;
    const end = Math.min(start + SEGMENTS_PER_PAGE, transSegs.length);
    return transSegs.slice(start, end).join('\n\n');
  }, [transSegs, currentPage]);

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 0));
  const resetPage = () => setCurrentPage(0);

  // Check WebGL support
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) setWebglError(true);
  } catch {
    setWebglError(true);
  }

  if (!hasResults) return null;

  // Fallback: simple side-by-side if WebGL not available
  if (webglError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-amber-600" />
            3D Book View
            <Badge variant="outline" className="text-xs font-normal">
              Fallback Mode
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-amber-50/30 p-4 dark:bg-amber-950/10">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                {src} (Page {currentPage + 1})
              </p>
              <p className="text-sm whitespace-pre-wrap">{pageLeftText}</p>
            </div>
            <div className="rounded-lg border bg-emerald-50/30 p-4 dark:bg-emerald-950/10">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                {tgt} (Page {currentPage + 1})
              </p>
              <p className="text-sm whitespace-pre-wrap">{pageRightText}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-amber-600" />
            3D Book View
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Prev
            </Button>
            <Badge variant="outline" className="text-xs">
              {currentPage + 1} / {totalPages}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={currentPage >= totalPages - 1}
            >
              Next
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={resetPage}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full rounded-lg border bg-gradient-to-b from-slate-50 to-amber-50 dark:from-slate-900 dark:to-slate-800">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <BookOpen className="size-8 text-amber-500 animate-pulse" />
                  <p className="text-sm text-muted-foreground">
                    Loading 3D view...
                  </p>
                </div>
              </div>
            }
          >
            <Canvas
              camera={{ position: [0, 2, 6], fov: 45 }}
              gl={{ antialias: true }}
            >
              <Scene
                currentPage={currentPage}
                totalPages={totalPages}
                leftText={pageLeftText}
                rightText={pageRightText}
              />
            </Canvas>
          </Suspense>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400" />
            {src}
          </span>
          <span>↔</span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-400" />
            {tgt}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Book3DView(props: Book3DViewProps) {
  return <Book3DViewInner {...props} />;
}
