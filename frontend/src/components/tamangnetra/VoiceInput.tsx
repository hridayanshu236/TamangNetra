'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  AlertCircle,
  Loader2,
  Timer,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useTranslationStore } from './TranslationStore';

// Language map for ASR
const LANG_MAP: Record<string, string> = {
  English: 'en',
  Nepali: 'ne',
  Tamang: 'ne', // Closest available
};

interface VoiceInputProps {
  onTranscription?: (text: string) => void;
  className?: string;
}

export function VoiceInput({ onTranscription, className }: VoiceInputProps) {
  const { srcLang } = useTranslationStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscription, setLastTranscription] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const langCode = LANG_MAP[srcLang] || 'en';

  // Format duration as mm:ss
  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Start recording audio from the user's microphone
  const startRecording = useCallback(async () => {
    setError(null);
    setLastTranscription(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks on the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Clear the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setIsRecording(false);

        // Process the recorded audio
        const audioBlob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        });

        await transcribeAudio(audioBlob);
      };

      mediaRecorder.onerror = () => {
        setError('Recording failed. Please try again.');
        stopRecording();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone.');
        } else {
          setError('Could not access microphone. Please check permissions.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  // Send audio to ASR API for transcription
  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
            const base64 = result.split(',')[1];
            if (base64) {
              resolve(base64);
            } else {
              reject(new Error('Failed to convert audio to base64'));
            }
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(audioBlob);
        const base64Audio = await base64Promise;

        // Send to ASR API
        const response = await fetch('/api/asr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: base64Audio,
            language: langCode,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'ASR failed' }));
          throw new Error(errData.error || 'Speech recognition failed');
        }

        const data = await response.json();

        if (data.text && data.text.trim()) {
          const transcribedText = data.text.trim();
          setLastTranscription(transcribedText);

          // Notify parent component
          if (onTranscription) {
            onTranscription(transcribedText);
          }

          // Also dispatch a custom event for backward compatibility
          const customEvent = new CustomEvent('stt-text', {
            detail: { text: transcribedText },
          });
          window.dispatchEvent(customEvent);
        } else {
          setError('No speech detected. Please try again.');
        }
      } catch (err) {
        console.error('ASR error:', err);
        const message =
          err instanceof Error ? err.message : 'Speech recognition failed';
        setError(message);
      } finally {
        setIsProcessing(false);
        setRecordingDuration(0);
      }
    },
    [langCode, onTranscription]
  );

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear last transcription after 3 seconds
  useEffect(() => {
    if (lastTranscription) {
      const timer = setTimeout(() => setLastTranscription(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastTranscription]);

  return (
    <div className={`relative ${className || ''}`}>
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400 whitespace-nowrap"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcription success indicator */}
      <AnimatePresence>
        {lastTranscription && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/95 dark:border-emerald-800 dark:bg-emerald-950/90 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 backdrop-blur-sm max-w-[250px]"
          >
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
            <span className="line-clamp-2">&ldquo;{lastTranscription}&rdquo;</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator with timer */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/95 dark:border-rose-800 dark:bg-rose-950/90 px-3 py-2 text-xs backdrop-blur-sm whitespace-nowrap"
          >
            {/* Pulsing red dot */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="size-2.5 rounded-full bg-red-500 shrink-0"
            />
            <span className="text-red-600 dark:text-red-400 font-medium">
              REC
            </span>
            <Timer className="size-3 text-red-500 shrink-0" />
            <span className="text-red-600 dark:text-red-400 font-mono tabular-nums">
              {formatDuration(recordingDuration)}
            </span>
            <span className="text-muted-foreground">({srcLang})</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Microphone button */}
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleRecording}
          disabled={isProcessing}
          aria-label={
            isRecording
              ? 'Stop recording'
              : isProcessing
                ? 'Processing speech...'
                : 'Start voice input'
          }
          className={`relative size-10 rounded-full transition-all duration-300 ${
            isRecording
              ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400 dark:bg-red-950/40 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/60 shadow-lg shadow-red-500/20'
              : isProcessing
                ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-400'
                : 'bg-emerald-50/50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
          }`}
        >
          {isRecording ? (
            <>
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-400 dark:border-red-500"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 0, 0.6],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <MicOff className="size-4 relative z-10" />
            </>
          ) : isProcessing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mic className="size-4" />
          )}
        </Button>
      </motion.div>

      {/* Waveform visualization when recording */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-2 -right-2 flex items-end gap-[2px]"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-[2px] bg-red-500 rounded-full"
                animate={{
                  height: ['3px', `${6 + Math.random() * 8}px`, '3px'],
                }}
                transition={{
                  duration: 0.4 + Math.random() * 0.3,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
