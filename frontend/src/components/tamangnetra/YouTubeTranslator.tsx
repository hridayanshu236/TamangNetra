'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Youtube,
  Loader2,
  Languages,
  Download,
  Play,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Link,
  Subtitles,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { useTranslationStore } from './TranslationStore';
import { YouTubeEmptyState } from './EnhancedEmptyStates';
import { useToast } from '@/src/hooks/use-toast';

interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

// Sample YouTube URLs for quick testing
const SAMPLE_URLS = [
  { label: 'Nepal Documentary', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { label: 'Tech Talk', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
];

function formatSRT(entries: SubtitleEntry[]): string {
  return entries
    .map(
      (e) =>
        `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}\n`
    )
    .join('\n');
}

function downloadSRT(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/srt;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function YouTubeTranslator() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [translatedSubs, setTranslatedSubs] = useState<SubtitleEntry[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [translationProgress, setTranslationProgress] = useState(0);
  const [srtCopied, setSrtCopied] = useState(false);
  const { toast } = useToast();

  const { srcLang, tgtLang, startTranslation, updateProgress, setResults, addKnowledgeEntries, knowledgeGraphEnabled, apiToken } =
    useTranslationStore();

  // Extract video ID from YouTube URL
  const videoId = useMemo(() => {
    if (!url.trim()) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }, [url]);

  const handleFetchSubtitles = async () => {
    if (!url.trim()) {
      toast({
        title: 'No URL provided',
        description: 'Please enter a YouTube video URL.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setSubtitles([]);
    setTranslatedSubs([]);
    setIsDemo(false);
    setVideoTitle('');

    try {
      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          src_lang: srcLang,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch subtitles');
      }

      const data = await response.json();

      if (!data.subtitles || data.subtitles.length === 0) {
        throw new Error('No subtitles found for this video');
      }

      setSubtitles(data.subtitles);
      setIsDemo(data.isDemo || false);
      setVideoTitle(data.title || 'YouTube Video');

      toast({
        title: data.isDemo ? 'Demo subtitles loaded' : 'Subtitles fetched',
        description: data.isDemo
          ? `Could not extract live captions. ${data.subtitles.length} demo subtitle entries loaded.`
          : `Found ${data.subtitles.length} subtitle entries for "${data.title}".`,
        variant: data.isDemo ? 'default' : 'default',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Failed to fetch subtitles',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (subtitles.length === 0) return;

    setIsTranslating(true);
    startTranslation();
    setTranslationProgress(0);

    try {
      const translated: SubtitleEntry[] = [];
      const BATCH_SIZE = 5;

      for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
        const batch = subtitles.slice(i, i + BATCH_SIZE);
        const currentProgress = Math.round(((Math.min(i + BATCH_SIZE, subtitles.length)) / subtitles.length) * 100);
        setTranslationProgress(currentProgress);
        updateProgress(Math.min(i + BATCH_SIZE, subtitles.length), subtitles.length);

        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentences: batch.map((s) => s.text),
            src_lang: srcLang,
            tgt_lang: tgtLang,
            api_token: apiToken || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Translation request failed');
        }

        const data = await response.json();

        if (data.translations) {
          for (let j = 0; j < batch.length; j++) {
            translated.push({
              ...batch[j],
              text: data.translations[j]?.translated || batch[j].text,
            });
          }

          if (knowledgeGraphEnabled) {
            addKnowledgeEntries(
              data.translations.map((t: { original: string; translated: string }) => ({
                source: t.original,
                translation: t.translated,
                frequency: 1,
              }))
            );
          }
        }
      }

      setTranslatedSubs(translated);
      setTranslationProgress(100);

      // Also set results in the store for the output panel
      const origText = subtitles.map((s) => s.text).join('\n');
      const transText = translated.map((s) => s.text).join('\n');
      setResults(
        origText,
        transText,
        subtitles.map((s, i) => ({
          original: s.text,
          translated: translated[i]?.text || s.text,
        }))
      );

      toast({
        title: 'Subtitles translated',
        description: `Translated ${translated.length} subtitle entries.`,
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
      setTranslationProgress(0);
    }
  };

  const handleExportSRT = useCallback(() => {
    if (translatedSubs.length === 0) return;
    const srtContent = formatSRT(translatedSubs);
    downloadSRT(srtContent, `translated_subtitles_${tgtLang.toLowerCase()}.srt`);
    toast({
      title: 'SRT exported',
      description: 'Translated subtitles downloaded as SRT file.',
    });
  }, [translatedSubs, tgtLang, toast]);

  const handleCopySRT = useCallback(() => {
    if (translatedSubs.length === 0) return;
    const srtContent = formatSRT(translatedSubs);
    navigator.clipboard.writeText(srtContent).then(() => {
      setSrtCopied(true);
      toast({
        title: 'SRT copied',
        description: 'Translated SRT content copied to clipboard.',
      });
      setTimeout(() => setSrtCopied(false), 2000);
    });
  }, [translatedSubs, toast]);

  const handleSampleURL = useCallback((sampleUrl: string) => {
    setUrl(sampleUrl);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Youtube className="size-4 text-red-500" />
          YouTube Subtitle Translation
        </CardTitle>
        <CardDescription>
          Fetch and translate YouTube video subtitles into your target language.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-10"
            />
          </div>
          <Button
            onClick={handleFetchSubtitles}
            disabled={isLoading || !url.trim()}
            variant="outline"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Fetch</span>
          </Button>
        </div>

        {/* Sample URL buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Try:</span>
          {SAMPLE_URLS.map((sample) => (
            <Button
              key={sample.url}
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20"
              onClick={() => handleSampleURL(sample.url)}
            >
              <Link className="size-2.5 mr-1" />
              {sample.label}
            </Button>
          ))}
        </div>

        {/* Video preview */}
        <AnimatePresence>
          {videoId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-lg border bg-muted/20"
            >
              <div className="flex items-center gap-3 p-3">
                {/* Thumbnail with loading skeleton */}
                <div className="relative shrink-0 size-20 rounded-md overflow-hidden bg-black">
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onLoad={(e) => {
                      // Remove skeleton when loaded
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const skeleton = parent.querySelector('.thumb-skeleton');
                        if (skeleton) skeleton.remove();
                      }
                    }}
                  />
                  {/* Loading skeleton */}
                  <div className="thumb-skeleton absolute inset-0 bg-gradient-to-r from-muted/60 via-muted/80 to-muted/60 animate-shimmer" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-black/70 p-1.5">
                      <Play className="size-3 text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">YouTube Video</p>
                  <p className="text-sm font-medium truncate mt-0.5">{videoTitle || 'Video detected'}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {videoId}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo notice */}
        <AnimatePresence>
          {isDemo && subtitles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
            >
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Demo subtitles loaded
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Could not extract live captions from this video. Showing demo subtitles for translation testing.
                  This may happen due to CORS restrictions, disabled captions, or video privacy settings.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video title */}
        {videoTitle && !isDemo && (
          <p className="text-xs text-muted-foreground truncate">
            <span className="font-medium">Video:</span> {videoTitle}
          </p>
        )}

        {/* Subtitles Display */}
        <AnimatePresence>
          {subtitles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <FileText className="mr-1 size-3" />
                    {subtitles.length} subtitle entries
                  </Badge>
                  {/* Subtitle line count badge */}
                  <Badge className="text-[10px] bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800">
                    <Subtitles className="mr-1 size-2.5" />
                    {subtitles.reduce((acc, s) => acc + s.text.split(/\n/).length, 0)} lines
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    size="sm"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="mr-1 size-3 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="mr-1 size-3" />
                        Translate
                      </>
                    )}
                  </Button>
                  {translatedSubs.length > 0 && (
                    <>
                      <Button
                        onClick={handleCopySRT}
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                      >
                        {srtCopied ? (
                          <Check className="mr-1 size-3 text-emerald-500" />
                        ) : (
                          <Copy className="mr-1 size-3" />
                        )}
                        <span className="hidden sm:inline">Copy SRT</span>
                      </Button>
                      <Button
                        onClick={handleExportSRT}
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                      >
                        <Download className="mr-1 size-3" />
                        <span className="hidden sm:inline">Download SRT</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Translation progress bar with gradient and shimmer */}
              <AnimatePresence>
                {isTranslating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1"
                  >
                    <div className="relative h-2.5 rounded-full bg-muted/40 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${translationProgress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                      {/* Shimmer overlay */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {translationProgress}% complete
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Side by side view */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Original */}
                <div className="rounded-lg border border-muted-foreground/10 p-3 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    Original ({srcLang})
                  </p>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-1.5">
                      {subtitles.map((sub, idx) => (
                        <div
                          key={sub.index}
                          className={`rounded p-2 ${idx % 2 === 0 ? 'bg-muted/50' : 'bg-muted/30'}`}
                        >
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {sub.startTime}
                          </span>
                          <p className="text-xs mt-0.5">{sub.text}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Translated */}
                <div className="rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 p-3 shadow-sm bg-emerald-50/20 dark:bg-emerald-950/10">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    Translated ({tgtLang})
                  </p>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-1.5">
                      {translatedSubs.length > 0
                        ? translatedSubs.map((sub, idx) => (
                            <div
                              key={sub.index}
                              className={`rounded p-2 ${idx % 2 === 0 ? 'bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900' : 'bg-emerald-100/30 border border-emerald-100/50 dark:bg-emerald-950/10 dark:border-emerald-900/50'}`}
                            >
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {sub.startTime}
                              </span>
                              <p className="text-xs mt-0.5">{sub.text}</p>
                            </div>
                          ))
                        : subtitles.map((sub, idx) => (
                            <div
                              key={sub.index}
                              className={`rounded p-2 animate-pulse ${idx % 2 === 0 ? 'bg-muted/30' : 'bg-muted/20'}`}
                            >
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {sub.startTime}
                              </span>
                              <p className="text-xs mt-0.5 text-muted-foreground">
                                Waiting for translation...
                              </p>
                            </div>
                          ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {subtitles.length === 0 && !url.trim() && (
          <YouTubeEmptyState />
        )}
        {subtitles.length === 0 && url.trim() && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Youtube className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Click Fetch to load subtitles
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
