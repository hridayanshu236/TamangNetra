'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Volume1,
  SkipForward,
  SkipBack,
  AlertTriangle,
  X,
  Loader2,
  Repeat,
  Gauge,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Slider } from '@/src/components/ui/slider';
import { Badge } from '@/src/components/ui/badge';
import { useTranslationStore } from './TranslationStore';
import { decryptPayload, isEncryptionActive } from '@/src/hooks/use-encryption';

// Language to short code mapping for the TTS API
const LANG_MAP: Record<string, string> = {
  English: 'en',
  Nepali: 'ne',
  Tamang: 'ne', // Closest available voice
};

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

interface TTSPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TTSPlayer({ open, onOpenChange }: TTSPlayerProps) {
  const store = useTranslationStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [selectedLang, setSelectedLang] = useState<'source' | 'target'>('target');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [loop, setLoop] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Use refs for callbacks to avoid circular dependency issues
  const speakSegmentRef = useRef<(index: number) => void>(() => {});
  const fallbackBrowserTTSRef = useRef<(text: string, index: number) => void>(() => {});
  const stopPlaybackRef = useRef<() => void>(() => {});

  const srcLang = store.srcLang;
  const tgtLang = store.tgtLang;
  const isEncrypted = store.isEncrypted && isEncryptionActive(store.encryptionKey);

  // Decrypt segments if needed
  const segments = useMemo(() => {
    if (isEncrypted) {
      return store.segments.map((s) => ({
        original: decryptPayload(s.original, store.encryptionKey),
        translated: decryptPayload(s.translated, store.encryptionKey),
      }));
    }
    return store.segments;
  }, [isEncrypted, store.segments, store.encryptionKey]);

  const activeLang = selectedLang === 'source' ? srcLang : tgtLang;
  const langCode = LANG_MAP[activeLang] || 'en';

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop current playback and clean up
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    setCurrentSegmentIndex(-1);
  }, []);

  // Keep stopPlayback ref up to date
  useEffect(() => {
    stopPlaybackRef.current = stopPlayback;
  }, [stopPlayback]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopPlaybackRef.current();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [open]);

  // Fallback to browser's built-in speech synthesis
  const fallbackBrowserTTS = useCallback(
    (text: string, index: number) => {
      if (!('speechSynthesis' in window)) {
        stopPlaybackRef.current();
        return;
      }

      setIsLoading(false);
      setIsPlaying(true);

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode === 'ne' ? 'ne-NP' : 'en-US';
      utterance.rate = speed;
      utterance.volume = volume;

      utterance.onend = () => {
        if (index < segments.length - 1) {
          speakSegmentRef.current(index + 1);
        } else if (loop) {
          speakSegmentRef.current(0);
        } else {
          stopPlaybackRef.current();
        }
      };

      utterance.onerror = () => {
        stopPlaybackRef.current();
      };

      window.speechSynthesis.speak(utterance);
    },
    [langCode, speed, volume, segments.length, loop]
  );

  // Keep fallbackBrowserTTS ref up to date
  useEffect(() => {
    fallbackBrowserTTSRef.current = fallbackBrowserTTS;
  }, [fallbackBrowserTTS]);

  // Synthesize and play a segment using the TTS API
  const speakSegment = useCallback(
    async (index: number) => {
      if (segments.length === 0) return;

      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      const seg = segments[index];
      const text = selectedLang === 'source' ? seg.original : seg.translated;

      if (!text.trim()) {
        // Skip empty segments
        if (index < segments.length - 1) {
          speakSegmentRef.current(index + 1);
        } else if (loop) {
          speakSegmentRef.current(0);
        } else {
          stopPlaybackRef.current();
        }
        return;
      }

      setCurrentSegmentIndex(index);
      setIsLoading(true);

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            lang: langCode,
            speed,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          console.error('TTS API error:', err);
          // Fallback: try browser speech synthesis
          fallbackBrowserTTSRef.current(text, index);
          return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audio.volume = volume;
        audioRef.current = audio;

        setIsLoading(false);
        setIsPlaying(true);

        audio.onended = () => {
          if (index < segments.length - 1) {
            speakSegmentRef.current(index + 1);
          } else if (loop) {
            speakSegmentRef.current(0);
          } else {
            stopPlaybackRef.current();
          }
        };

        audio.onerror = () => {
          console.error('Audio playback error, falling back to browser TTS');
          fallbackBrowserTTSRef.current(text, index);
        };

        await audio.play();
      } catch (error) {
        console.error('TTS fetch error:', error);
        // Fallback to browser TTS
        fallbackBrowserTTSRef.current(text, index);
      }
    },
    [segments, selectedLang, langCode, speed, volume, loop]
  );

  // Keep speakSegment ref up to date
  useEffect(() => {
    speakSegmentRef.current = speakSegment;
  }, [speakSegment]);

  const handlePlay = useCallback(() => {
    if (isEncrypted) return;

    if (isPaused && audioRef.current) {
      audioRef.current.play();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    if (isPaused && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // Start fresh
    speakSegmentRef.current(0);
  }, [isEncrypted, isPaused]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  }, []);

  const handleStop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopPlaybackRef.current();
  }, []);

  const handleSkipForward = useCallback(() => {
    if (segments.length === 0) return;
    if (currentSegmentIndex < segments.length - 1) {
      speakSegmentRef.current(currentSegmentIndex + 1);
    }
  }, [currentSegmentIndex, segments.length]);

  const handleSkipBack = useCallback(() => {
    if (segments.length === 0) return;
    if (currentSegmentIndex > 0) {
      speakSegmentRef.current(currentSegmentIndex - 1);
    } else {
      speakSegmentRef.current(0);
    }
  }, [currentSegmentIndex, segments.length]);

  // Update volume on the audio element in real-time
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const progressPercent =
    segments.length > 0 && currentSegmentIndex >= 0
      ? ((currentSegmentIndex + 1) / segments.length) * 100
      : 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-lg shadow-emerald-500/5"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Volume2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">TTS Player</span>
              {(isPlaying || isLoading) && <WaveformAnimation />}
              {isLoading && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400 gap-1"
                >
                  <Loader2 className="size-2.5 animate-spin" />
                  Loading
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`size-7 ${loop ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'}`}
                onClick={() => setLoop((l) => !l)}
                aria-label={loop ? 'Disable loop' : 'Enable loop'}
              >
                <Repeat className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Waveform visualization */}
          {isPlaying && (
            <div className="px-4 pt-3">
              <AudioWaveform />
            </div>
          )}

          {/* Progress bar */}
          <div className="px-4 pt-3">
            <div
              className="relative h-1.5 rounded-full bg-muted overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pct = x / rect.width;
                const idx = Math.floor(pct * segments.length);
                if (idx >= 0 && idx < segments.length) {
                  speakSegmentRef.current(idx);
                }
              }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">
                {currentSegmentIndex >= 0
                  ? `Segment ${currentSegmentIndex + 1} of ${segments.length}`
                  : segments.length > 0
                    ? `${segments.length} segments`
                    : 'No segments'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 px-4 py-3">
            {/* Skip back */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
              onClick={handleSkipBack}
              disabled={currentSegmentIndex <= 0}
            >
              <SkipBack className="size-4" />
            </Button>

            {/* Play / Pause */}
            <Button
              variant="ghost"
              size="icon"
              className={`size-12 rounded-full transition-all ${
                isPlaying
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shadow-md shadow-emerald-500/20'
                  : isLoading
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400'
              }`}
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isEncrypted || segments.length === 0 || isLoading}
            >
              {isLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5 ml-0.5" />
              )}
            </Button>

            {/* Stop */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused && !isLoading}
            >
              <Square className="size-4" />
            </Button>

            {/* Skip forward */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
              onClick={handleSkipForward}
              disabled={currentSegmentIndex < 0 || currentSegmentIndex >= segments.length - 1}
            >
              <SkipForward className="size-4" />
            </Button>
          </div>

          {/* Settings row */}
          <div className="px-4 pb-3 space-y-3">
            {/* Language selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider min-w-[50px]">
                Listen to
              </span>
              <div className="flex items-center gap-1">
                {(['source', 'target'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      handleStop();
                      setSelectedLang(mode);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                      selectedLang === mode
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {mode === 'source' ? srcLang : tgtLang}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed control */}
            <div className="flex items-center gap-2">
              <Gauge className="size-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider min-w-[36px]">
                Speed
              </span>
              <div className="flex items-center gap-1">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSpeed(s);
                      if (isPlaying || isPaused) {
                        const idx = currentSegmentIndex;
                        handleStop();
                        speakSegmentRef.current(idx >= 0 ? idx : 0);
                      }
                    }}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-all ${
                      speed === s
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-2">
              {volume === 0 ? (
                <VolumeX className="size-3 text-muted-foreground shrink-0" />
              ) : volume < 0.5 ? (
                <Volume1 className="size-3 text-muted-foreground shrink-0" />
              ) : (
                <Volume2 className="size-3 text-muted-foreground shrink-0" />
              )}
              <Slider
                value={[volume * 100]}
                onValueChange={([v]) => setVolume(v / 100)}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground min-w-[28px] text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Encryption warning */}
          {isEncrypted && (
            <div className="px-4 pb-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-2">
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  Decrypt the text first to use text-to-speech playback.
                </p>
              </div>
            </div>
          )}

          {/* Segment list */}
          {segments.length > 0 && !isEncrypted && (
            <div className="border-t border-border/30 max-h-48 overflow-y-auto custom-scrollbar">
              {segments.map((seg, i) => {
                const text = selectedLang === 'source' ? seg.original : seg.translated;
                const isCurrent = i === currentSegmentIndex;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      handleStop();
                      speakSegmentRef.current(i);
                    }}
                    className={`w-full flex items-start gap-2 px-4 py-2 text-left transition-colors ${
                      isCurrent
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
                        : 'hover:bg-muted/50'
                    } ${i % 2 === 1 && !isCurrent ? 'bg-muted/20' : ''}`}
                  >
                    <span
                      className={`text-[10px] font-mono mt-0.5 shrink-0 min-w-[1.5rem] text-right ${
                        isCurrent
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-muted-foreground/50'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <p
                      className={`text-xs leading-relaxed line-clamp-1 ${
                        isCurrent
                          ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {text}
                    </p>
                    {isCurrent && isPlaying && <WaveformAnimation small />}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Animated waveform bars indicator
function WaveformAnimation({ small = false }: { small?: boolean }) {
  const barCount = small ? 3 : 5;
  return (
    <div className="flex items-end gap-[2px]" role="status" aria-label="Speaking">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={`rounded-full bg-emerald-500 dark:bg-emerald-400 ${
            small ? 'w-[2px]' : 'w-[3px]'
          }`}
          animate={{
            height: small ? [4, 10, 4] : [6, 14, 6],
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            delay: i * 0.08,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Full-width audio waveform visualization
function AudioWaveform() {
  const barCount = 40;
  return (
    <div className="flex items-center justify-center gap-[2px] h-8">
      {Array.from({ length: barCount }).map((_, i) => {
        // Create a wave-like pattern
        const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
        const maxHeight = (1 - distFromCenter * 0.6) * 24;
        return (
          <motion.div
            key={i}
            className="w-[2px] rounded-full bg-gradient-to-t from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300"
            animate={{
              height: [4, maxHeight, 4],
            }}
            transition={{
              duration: 0.6 + Math.random() * 0.4,
              repeat: Infinity,
              delay: i * 0.03,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}

// Per-segment TTS button for use in InteractiveOutput
export function SegmentTTSButton({
  text,
  lang,
  isSpeaking,
  onSpeak,
  disabled,
}: {
  text: string;
  lang: string;
  isSpeaking: boolean;
  onSpeak: (text: string, lang: string) => void;
  disabled?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const audioObjRef = useRef<HTMLAudioElement | null>(null);
  const audioObjUrlRef = useRef<string | null>(null);

  const handleClick = useCallback(async () => {
    if (isSpeaking) {
      // Stop speaking
      if (audioObjRef.current) {
        audioObjRef.current.pause();
        audioObjRef.current = null;
      }
      if (audioObjUrlRef.current) {
        URL.revokeObjectURL(audioObjUrlRef.current);
        audioObjUrlRef.current = null;
      }
      onSpeak('', lang);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang, speed: 1.0 }),
      });

      if (!response.ok) {
        // Fallback to browser TTS
        onSpeak(text, lang);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioObjUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audio.volume = 1;
      audioObjRef.current = audio;

      audio.onended = () => {
        if (audioObjUrlRef.current) {
          URL.revokeObjectURL(audioObjUrlRef.current);
          audioObjUrlRef.current = null;
        }
        audioObjRef.current = null;
        onSpeak('', lang);
      };

      audio.onerror = () => {
        if (audioObjUrlRef.current) {
          URL.revokeObjectURL(audioObjUrlRef.current);
          audioObjUrlRef.current = null;
        }
        audioObjRef.current = null;
        onSpeak(text, lang); // Fallback to browser TTS
      };

      onSpeak(text, lang); // Mark as speaking
      await audio.play();
    } catch {
      onSpeak(text, lang); // Fallback to browser TTS
    } finally {
      setIsLoading(false);
    }
  }, [text, lang, isSpeaking, onSpeak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioObjRef.current) {
        audioObjRef.current.pause();
      }
      if (audioObjUrlRef.current) {
        URL.revokeObjectURL(audioObjUrlRef.current);
      }
    };
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-6 shrink-0"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={isSpeaking ? 'Stop speaking' : 'Listen to segment'}
    >
      {isLoading ? (
        <Loader2 className="size-3 animate-spin text-emerald-600 dark:text-emerald-400" />
      ) : isSpeaking ? (
        <WaveformAnimation small />
      ) : (
        <Volume2 className="size-3 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400" />
      )}
    </Button>
  );
}
