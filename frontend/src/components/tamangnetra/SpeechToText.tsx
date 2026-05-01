'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useTranslationStore } from './TranslationStore';

// Web Speech API types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const langMap: Record<string, string> = {
  English: 'en-US',
  Nepali: 'ne-NP',
  Tamang: 'ne-NP', // Tamang falls back to Nepali locale for speech recognition
};

export function SpeechToText() {
  const { srcLang } = useTranslationStore();
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!(window as unknown as Record<string, unknown>).SpeechRecognition || !!(window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });
  const [showUnsupported, setShowUnsupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // isSupported is checked lazily via useState initializer above

  const startRecording = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setShowUnsupported(true);
      setTimeout(() => setShowUnsupported(false), 3000);
      return;
    }

    const recognition = new SR();
    recognition.lang = langMap[srcLang] || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Final result - dispatch event for FileTranslator to pick up
          const transcript = result[0].transcript.trim();
          if (transcript) {
            const customEvent = new CustomEvent('stt-text', {
              detail: { text: transcript },
            });
            window.dispatchEvent(customEvent);
          }
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setInterimText('');
  }, [srcLang]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
  }, []);

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
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Unsupported browser message */}
      <AnimatePresence>
        {showUnsupported && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-12 left-0 z-10 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400 whitespace-nowrap"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            Speech recognition not supported in this browser
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interim transcription display */}
      <AnimatePresence>
        {isRecording && interimText && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-12 left-0 right-0 z-10 rounded-lg border border-emerald-200 bg-emerald-50/95 dark:border-emerald-800 dark:bg-emerald-950/90 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 backdrop-blur-sm max-w-[250px]"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="size-2 rounded-full bg-red-500"
              />
              <span className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
                Listening ({srcLang})
              </span>
            </div>
            <p className="line-clamp-3">&ldquo;{interimText}&rdquo;</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Microphone button */}
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          className={`relative size-9 rounded-full transition-all duration-300 ${
            isRecording
              ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400 dark:bg-red-950/40 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/60'
              : 'bg-emerald-50/50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
          }`}
        >
          {isRecording ? (
            <>
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-400 dark:border-red-500"
                animate={{
                  scale: [1, 1.4, 1],
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
            className="absolute -top-1 -right-1 flex items-end gap-[2px] size-3"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-[2px] bg-red-500 rounded-full"
                animate={{
                  height: ['3px', '8px', '3px'],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.15,
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
