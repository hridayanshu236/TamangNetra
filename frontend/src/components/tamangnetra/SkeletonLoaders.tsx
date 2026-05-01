'use client';

import { Skeleton } from '@/src/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';

/**
 * TranslationSettingsSkeleton - Mimics the settings card layout
 * (2 dropdowns, swap button, 5 toggles, API token input, language pair display)
 */
export function TranslationSettingsSkeleton() {
  return (
    <Card className="h-fit relative overflow-hidden">
      {/* Left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500/30 via-teal-500/30 to-amber-500/30 rounded-l-lg" />
      <CardHeader className="pb-4 pl-5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded skeleton-emerald" />
          <Skeleton className="h-4 w-36 rounded skeleton-emerald" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pl-5">
        {/* Source Language Dropdown */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded skeleton-emerald" />
          <Skeleton className="h-9 w-full rounded-md skeleton-emerald" />
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Skeleton className="size-9 rounded-full skeleton-emerald" />
        </div>

        {/* Target Language Dropdown */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded skeleton-emerald" />
          <Skeleton className="h-9 w-full rounded-md skeleton-emerald" />
        </div>

        {/* Advanced Divider */}
        <div className="relative">
          <Skeleton className="h-px w-full skeleton-emerald" />
        </div>

        {/* Feature Toggles (5 toggles) */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-20 rounded skeleton-emerald" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded skeleton-emerald" />
                <Skeleton className="h-4 w-24 rounded skeleton-emerald" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full skeleton-emerald" />
            </div>
          ))}
        </div>

        {/* API Token */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-3.5 rounded skeleton-emerald" />
            <Skeleton className="h-3 w-24 rounded skeleton-emerald" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 flex-1 rounded-md skeleton-emerald" />
            <Skeleton className="h-8 w-14 rounded-md skeleton-emerald" />
          </div>
        </div>

        {/* Language pair display */}
        <Skeleton className="h-14 w-full rounded-lg skeleton-emerald" />
      </CardContent>
    </Card>
  );
}

/**
 * FileTranslatorSkeleton - Mimics the file upload area + textarea + buttons
 */
export function FileTranslatorSkeleton() {
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded skeleton-emerald" />
          <Skeleton className="h-5 w-32 rounded skeleton-emerald" />
        </div>
        <Skeleton className="h-4 w-72 rounded skeleton-emerald mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Demo mode skeleton */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full skeleton-emerald" />
          ))}
        </div>

        {/* File upload zone */}
        <div className="rounded-xl border-2 border-dashed border-muted/30 p-8 text-center">
          <Skeleton className="size-8 mx-auto rounded skeleton-emerald mb-2" />
          <Skeleton className="h-4 w-48 mx-auto rounded skeleton-emerald mb-1" />
          <Skeleton className="h-3 w-32 mx-auto rounded skeleton-emerald" />
          <div className="flex justify-center gap-1.5 mt-2">
            <Skeleton className="h-5 w-12 rounded skeleton-emerald" />
            <Skeleton className="h-5 w-14 rounded skeleton-emerald" />
            <Skeleton className="h-5 w-16 rounded skeleton-emerald" />
          </div>
        </div>

        {/* Text area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28 rounded skeleton-emerald" />
            <Skeleton className="h-3 w-36 rounded skeleton-emerald" />
          </div>
          <Skeleton className="h-[150px] w-full rounded-md skeleton-emerald" />
        </div>

        {/* Feature indicators */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded skeleton-emerald" />
          <Skeleton className="h-3 w-20 rounded skeleton-emerald" />
          <Skeleton className="h-5 w-16 rounded-full skeleton-emerald" />
          <Skeleton className="h-5 w-20 rounded-full skeleton-emerald" />
        </div>

        {/* Translate button */}
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-md skeleton-emerald" />
          <Skeleton className="h-11 w-11 rounded-md skeleton-emerald" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * InteractiveOutputSkeleton - Mimics the output tabs and segment list
 */
export function InteractiveOutputSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded skeleton-emerald" />
            <Skeleton className="h-5 w-28 rounded skeleton-emerald" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-16 rounded-md skeleton-emerald" />
            <Skeleton className="h-7 w-16 rounded-md skeleton-emerald" />
            <Skeleton className="h-7 w-7 rounded skeleton-emerald" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Side by side view skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded skeleton-emerald" />
              <div className="flex gap-1">
                <Skeleton className="size-7 rounded skeleton-emerald" />
                <Skeleton className="size-7 rounded skeleton-emerald" />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="h-3 w-4 rounded skeleton-emerald shrink-0" />
                  <Skeleton className={`h-3 rounded skeleton-emerald ${i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
                </div>
              ))}
            </div>
          </div>
          {/* Translated column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded skeleton-emerald" />
              <div className="flex gap-1">
                <Skeleton className="size-7 rounded skeleton-emerald" />
                <Skeleton className="size-7 rounded skeleton-emerald" />
              </div>
            </div>
            <div className="rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/10 p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="h-3 w-4 rounded skeleton-emerald shrink-0" />
                  <Skeleton className={`h-3 rounded skeleton-emerald ${i % 2 === 0 ? 'w-4/5' : 'w-full'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Segment count */}
        <div className="flex items-center gap-2">
          <Skeleton className="size-3.5 rounded skeleton-emerald" />
          <Skeleton className="h-3 w-28 rounded skeleton-emerald" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ProgressDashboardSkeleton - Mimics the progress ring and stats
 */
export function ProgressDashboardSkeleton() {
  return (
    <Card className="h-fit backdrop-blur-md bg-card/80 dark:bg-card/60 border-border/50 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded skeleton-emerald" />
          <Skeleton className="h-4 w-32 rounded skeleton-emerald" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress ring + stats */}
        <div className="flex items-center gap-4">
          <Skeleton className="size-[72px] rounded-full skeleton-emerald" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-7 w-20 rounded skeleton-emerald" />
            <Skeleton className="h-3 w-24 rounded skeleton-emerald" />
            <Skeleton className="h-3 w-28 rounded skeleton-emerald" />
          </div>
        </div>

        {/* Language pair */}
        <Skeleton className="h-9 w-full rounded-lg skeleton-emerald" />

        {/* Feature statuses */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded skeleton-emerald" />
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded skeleton-emerald" />
                <Skeleton className="h-3 w-20 rounded skeleton-emerald" />
              </div>
            ))}
          </div>
        </div>

        {/* Empty state indicator */}
        <div className="flex flex-col items-center py-4">
          <Skeleton className="size-6 rounded-full skeleton-emerald mb-2" />
          <Skeleton className="h-3 w-40 rounded skeleton-emerald" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * DualRingSpinner - Premium loading spinner with outer emerald ring and inner amber ring
 */
export function DualRingSpinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Outer ring - emerald */}
      <svg
        className="animate-spin-dual-ring absolute inset-0"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          opacity="0.8"
        />
      </svg>
      {/* Inner ring - amber */}
      <svg
        className="animate-spin-dual-ring-inner absolute inset-0"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="6"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="18.8 18.8"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}
