'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  X,
  Languages,
  Loader2,
  Type,
  ShieldCheck,
  Lock,
  LockOpen,
  Trash2,
  Keyboard,
  BookOpen,
  Database,
  Zap,
  FlaskConical,
  Clock,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { Progress } from '@/src/components/ui/progress';
import { Badge } from '@/src/components/ui/badge';
import { useTranslationStore } from './TranslationStore';
import { DemoMode } from './DemoMode';
import { TranslationEmptyState } from './EnhancedEmptyStates';
import { SpeechToText } from './SpeechToText';
import { VoiceInput } from './VoiceInput';
import { useGlossary } from './GlossaryManager';
import { useTranslationMemory } from './TranslationMemory';
import { LiveTranslationPreview } from './LiveTranslationPreview';
import { DualRingSpinner } from './SkeletonLoaders';
import { useNotifications } from './NotificationCenter';
import { useToast } from '@/src/hooks/use-toast';
import { translateWithPII } from '@/src/hooks/use-pii-translation';
import {
  encryptPayload,
  decryptPayload,
  isEncryptionActive,
  generateEncryptionKey,
} from '@/src/hooks/use-encryption';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  file?: File; // Keep reference to the actual File object for API upload
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_TEXT_LENGTH = 10000; // max textarea chars
const RECENT_FILES_KEY = 'tamangnetra-recent-files';

// Word of the Day data
const WORDS_OF_THE_DAY = [
  { en: 'Hello', ne: 'नमस्ते', tm: 'तामाङ नमस्कार' },
  { en: 'Water', ne: 'पानी', tm: 'ल्हो' },
  { en: 'Love', ne: 'माया', tm: 'तामाङ माया' },
  { en: 'Friend', ne: 'साथी', tm: 'तामाङ साथी' },
  { en: 'Food', ne: 'खाना', tm: 'तामाङ खाना' },
  { en: 'House', ne: 'घर', tm: 'तामाङ घर' },
  { en: 'Book', ne: 'किताब', tm: 'तामाङ किताब' },
  { en: 'World', ne: 'विश्व', tm: 'तामाङ विश्व' },
  { en: 'Country', ne: 'देश', tm: 'तामाङ देश' },
  { en: 'Good', ne: 'राम्रो', tm: 'तामाङ राम्रो' },
];

// Pick a consistent word per session (based on date)
function getWordOfTheDay() {
  const dayIndex = new Date().getDate() % WORDS_OF_THE_DAY.length;
  return WORDS_OF_THE_DAY[dayIndex];
}

interface RecentFile {
  name: string;
  size: number;
  type: string;
  timestamp: number;
}

function loadRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentFile[];
  } catch {
    return [];
  }
}

function saveRecentFile(file: { name: string; size: number; type: string }) {
  try {
    const existing = loadRecentFiles();
    // Avoid duplicates by name
    const filtered = existing.filter((f) => f.name !== file.name);
    filtered.unshift({ ...file, timestamp: Date.now() });
    // Keep only last 3
    const trimmed = filtered.slice(0, 3);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="size-8 text-red-500" />;
  if (
    type.includes('word') ||
    type.includes('document') ||
    type.includes('docx')
  )
    return <File className="size-8 text-blue-500" />;
  if (type.includes('csv') || type.includes('tsv') || type.includes('sheet'))
    return <FileSpreadsheet className="size-8 text-emerald-500" />;
  return <File className="size-8 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Simple sentence splitter that handles English, Nepali, and Tamang
function splitIntoSentences(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length > 0 ? sentences : [text.trim()];
}

export function FileTranslator() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Recent files state
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Word of the Day (memoized per session)
  const wordOfDay = useMemo(() => getWordOfTheDay(), []);

  // Load recent files on mount
  useEffect(() => {
    setRecentFiles(loadRecentFiles());
  }, []);

  // PII detection state
  const [piiInfo, setPiiInfo] = useState<{
    count: number;
    types: string[];
  } | null>(null);

  // Encryption display state
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [encryptionKeyGenerated, setEncryptionKeyGenerated] = useState(false);

  const {
    srcLang,
    tgtLang,
    isTranslating,
    progress,
    totalSegments,
    completedSegments,
    startTranslation,
    updateProgress,
    setResults,
    addKnowledgeEntries,
    knowledgeGraphEnabled,
    piiEnabled,
    encryptionEnabled,
    encryptionKey,
    setEncryptionKey,
    apiToken,
    demoMode,
    toggleDemoMode,
  } = useTranslationStore();

  const { addNotification } = useNotifications();
  const { applyGlossary, enabled: glossaryEnabled } = useGlossary();
  const { lookup: tmLookup, addEntry: tmAddEntry, enabled: tmEnabled } = useTranslationMemory();
  const [tmHitCount, setTmHitCount] = useState(0);

  const encryptionActive = encryptionEnabled && isEncryptionActive(encryptionKey);

  // Ref for keyboard shortcut to access latest state
  const translateRef = useRef<() => void>(() => {});

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 1MB.',
          variant: 'destructive',
        });
        return;
      }

      // Notification: file uploaded
      addNotification(
        'file_uploaded',
        'File Uploaded',
        `${file.name} (${formatFileSize(file.size)})`,
        { name: file.name, size: file.size }
      );

      // Save to recent files
      saveRecentFile({ name: file.name, size: file.size, type: displayType });
      setRecentFiles(loadRecentFiles());

      // Determine the display type from the file name/extension
      let displayType = file.type || 'application/octet-stream';
      if (file.name.endsWith('.pdf')) displayType = 'application/pdf';
      else if (file.name.endsWith('.docx')) displayType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (file.name.endsWith('.csv')) displayType = 'text/csv';
      else if (file.name.endsWith('.tsv')) displayType = 'text/tab-separated-values';

      // Store the file reference for API upload
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: displayType,
        file,
      });

      // For CSV/TSV we can still show a preview by reading as text
      if (
        file.type.includes('csv') ||
        file.type.includes('tsv') ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.tsv')
      ) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setInputText(content);
        };
        reader.readAsText(file);
      } else {
        // For PDF/DOCX, just show a placeholder - actual parsing happens on the server
        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        setInputText(
          `[${ext} file uploaded: ${file.name}]\n\nThe file will be parsed and translated server-side when you click Translate.\n\nYou can also paste or type text below instead.`
        );
      }
    },
    [toast]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const removeFile = () => {
    setUploadedFile(null);
    setInputText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTranslate = async () => {
    // Reset PII info and decryption state for new translation
    setPiiInfo(null);
    setShowDecrypted(false);
    setTmHitCount(0);

    // If a file is uploaded with a supported type, use the process-file API
    const isFileUpload =
      uploadedFile?.file &&
      /\.(pdf|docx|csv|tsv)$/i.test(uploadedFile.name);

    if (isFileUpload && uploadedFile.file) {
      await handleFileTranslation(uploadedFile.file);
    } else {
      // Text-only translation
      await handleTextTranslation();
    }
  };

  // Update ref for keyboard shortcut
  translateRef.current = handleTranslate;

  // Keyboard shortcut: Ctrl+Enter to translate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        translateRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Speech-to-text event listener
  useEffect(() => {
    const handleSTT = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>;
      const spokenText = customEvent.detail?.text;
      if (spokenText) {
        setInputText((prev) => (prev ? prev + ' ' + spokenText : spokenText));
      }
    };
    window.addEventListener('stt-text', handleSTT);
    return () => window.removeEventListener('stt-text', handleSTT);
  }, []);

  const handleFileTranslation = async (file: File) => {
    if (srcLang === tgtLang) {
      toast({
        title: 'Same language',
        description: 'Source and target languages must be different.',
        variant: 'destructive',
      });
      return;
    }

    startTranslation();

    try {
      // Build FormData for the process-file API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('src_lang', srcLang);
      formData.append('tgt_lang', tgtLang);
      formData.append('pii_enabled', String(piiEnabled));
      formData.append('knowledge_graph_enabled', String(knowledgeGraphEnabled));
      formData.append('demo_mode', String(demoMode));

      // Show progress during upload
      updateProgress(0, 1);

      const response = await fetch('/api/process-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.details || 'File processing failed');
      }

      const data = await response.json();

      updateProgress(1, 1);

      // Store results (potentially encrypted)
      let finalOriginal = data.original;
      let finalTranslated = data.translated;
      let finalSegments = data.segments;

      if (encryptionActive) {
        // Encrypt the stored results - the actual data in the store is encrypted
        finalOriginal = encryptPayload(data.original, encryptionKey);
        finalTranslated = encryptPayload(data.translated, encryptionKey);
        finalSegments = data.segments.map(
          (s: { original: string; translated: string }) => ({
            original: encryptPayload(s.original, encryptionKey),
            translated: encryptPayload(s.translated, encryptionKey),
          })
        );
      }

      // Update results in the store
      setResults(finalOriginal, finalTranslated, finalSegments, encryptionActive);

      // Update knowledge entries if available
      if (knowledgeGraphEnabled && data.knowledgeEntries?.length > 0) {
        addKnowledgeEntries(data.knowledgeEntries);
      }

      toast({
        title: 'Translation complete',
        description: `Translated ${data.segments?.length || 0} segments from ${data.fileInfo?.type?.toUpperCase() || 'file'}.`,
      });

      // Notification: translation complete
      addNotification(
        'translation_complete',
        'Translation Complete',
        `${data.segments?.length || 0} segments • ${srcLang} → ${tgtLang}`,
        { segments: data.segments?.length || 0, srcLang, tgtLang }
      );

      // Success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Translation failed',
        description: message,
        variant: 'destructive',
      });
      addNotification('translation_error', 'Translation Failed', message);
      useTranslationStore.getState().resetResults();
    }
  };

  const handleTextTranslation = async () => {
    const text = inputText.trim();
    if (!text) {
      toast({
        title: 'No text to translate',
        description: 'Please upload a file or enter text.',
        variant: 'destructive',
      });
      return;
    }

    if (srcLang === tgtLang) {
      toast({
        title: 'Same language',
        description: 'Source and target languages must be different.',
        variant: 'destructive',
      });
      return;
    }

    startTranslation();

    try {
      // === PII-aware translation flow ===
      // Step 1: Detect PII and split the text around PII entities
      const piiResult = translateWithPII(text, piiEnabled);

      // Step 2: Update PII info for visual display
      if (piiEnabled && piiResult.piiCount > 0) {
        setPiiInfo({
          count: piiResult.piiCount,
          types: piiResult.piiTypes,
        });
      }

      // Step 3: Get the translatable text segments
      // If PII is enabled, we only translate non-PII segments
      // If PII is disabled, translatableText = the entire text
      const translatableSegments = piiResult.translatableText;

      if (translatableSegments.length === 0) {
        // All text was PII - nothing to translate
        setResults(text, text, [{ original: text, translated: text }], false);
        toast({
          title: 'PII Protection Active',
          description: `${piiResult.piiCount} PII entities detected. No translatable text found.`,
        });
        addNotification(
          'pii_detected',
          'PII Shield Active',
          `${piiResult.piiCount} entities protected: ${piiResult.piiTypes.join(', ')}`,
          { count: piiResult.piiCount, types: piiResult.piiTypes.join(', ') }
        );
        return;
      }

      // Step 4: Split translatable segments into sentences and translate in batches
      const allTranslatableSentences: string[] = [];
      for (const segment of translatableSegments) {
        const sentences = splitIntoSentences(segment);
        allTranslatableSentences.push(...sentences);
      }

      if (allTranslatableSentences.length === 0) {
        toast({
          title: 'No sentences found',
          description: 'Could not extract any sentences from the input.',
          variant: 'destructive',
        });
        return;
      }

      // Step 4b: Apply glossary pre-processing — replace source terms with target translations
      const glossaryApplied = glossaryEnabled
        ? allTranslatableSentences.map((s) => applyGlossary(s, srcLang, tgtLang))
        : allTranslatableSentences;

      // Step 4c: Check Translation Memory for pre-fill matches
      let tmHits = 0;
      const tmPreFilled = new Map<string, string>(); // originalSentence -> TM translation
      const sentencesNeedingAPI: { original: string; glossaryApplied: string; index: number }[] = [];

      for (let i = 0; i < allTranslatableSentences.length; i++) {
        const originalSentence = allTranslatableSentences[i];
        if (tmEnabled) {
          const tmMatch = tmLookup(originalSentence, srcLang, tgtLang);
          if (tmMatch) {
            tmPreFilled.set(originalSentence, tmMatch.target);
            tmHits++;
            continue; // Skip this sentence, use TM result
          }
        }
        sentencesNeedingAPI.push({
          original: originalSentence,
          glossaryApplied: glossaryApplied[i],
          index: i,
        });
      }

      setTmHitCount(tmHits);

      const BATCH_SIZE = 10;
      const sentenceTranslations: Map<string, string> = new Map(tmPreFilled);

      // Only translate sentences not found in TM
      for (let batchStart = 0; batchStart < sentencesNeedingAPI.length; batchStart += BATCH_SIZE) {
        const batch = sentencesNeedingAPI.slice(batchStart, batchStart + BATCH_SIZE);
        updateProgress(
          Math.min(batchStart + BATCH_SIZE, allTranslatableSentences.length),
          allTranslatableSentences.length
        );

        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentences: batch.map((s) => s.glossaryApplied),
            src_lang: srcLang,
            tgt_lang: tgtLang,
            api_token: apiToken || undefined,
            demo_mode: demoMode || undefined,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Translation failed');
        }

        const data = await response.json();

        if (data.translations) {
          // Map by index since glossary may have modified the sentences
          for (let j = 0; j < data.translations.length; j++) {
            const t = data.translations[j] as { original: string; translated: string };
            // Use the index to map back to the original sentence
            const originalSentence = sentencesNeedingAPI[batchStart + j].original;
            let translated = t.translated;
            // Post-process: ensure glossary terms are exactly as specified
            if (glossaryEnabled) {
              translated = applyGlossary(translated, srcLang, tgtLang);
            }
            sentenceTranslations.set(originalSentence, translated);

            // Save to Translation Memory
            if (tmEnabled) {
              tmAddEntry(originalSentence, translated, srcLang, tgtLang);
            }
          }

          // Auto-enable demo mode if API returned is_demo flag (401 fallback)
          if (data.is_demo && !demoMode) {
            toggleDemoMode();
            toast({
              title: 'Demo Mode Auto-Enabled',
              description: 'The TMT API returned an authentication error (401). Demo Mode has been enabled so you can still see translations.',
              duration: 6000,
            });
          }

          // Update knowledge graph if enabled
          if (knowledgeGraphEnabled) {
            const entries = data.translations.map(
              (t: { original: string; translated: string }) => ({
                source: t.original,
                translation: t.translated,
                frequency: 1,
              })
            );
            addKnowledgeEntries(entries);
          }
        }
      }

      // Step 5: Reconstruct the full translation with PII preserved
      // Map each translatable segment to its translated version
      // (combining sentence-level translations for that segment)
      const segmentTranslations: string[] = [];
      for (const segment of translatableSegments) {
        const sentences = splitIntoSentences(segment);
        const translatedSegment = sentences
          .map((s) => sentenceTranslations.get(s) ?? s)
          .join(' ');
        segmentTranslations.push(translatedSegment);
      }

      const fullTranslated = piiResult.reconstruct(segmentTranslations);

      // Build segments for the store (original text split by sentences)
      const allSentences = splitIntoSentences(text);
      const storeSegments = allSentences.map((sentence) => {
        // For PII-aware: each sentence may contain PII that was preserved
        const sentencePiiResult = translateWithPII(sentence, piiEnabled);
        const sentenceTranslatable = sentencePiiResult.translatableText;

        if (sentenceTranslatable.length === 0) {
          return { original: sentence, translated: sentence };
        }

        const translatedParts: string[] = [];
        for (const part of sentenceTranslatable) {
          const partSentences = splitIntoSentences(part);
          const translated = partSentences
            .map((s) => sentenceTranslations.get(s) ?? s)
            .join(' ');
          translatedParts.push(translated);
        }

        return {
          original: sentence,
          translated: sentencePiiResult.reconstruct(translatedParts),
        };
      });

      // Step 6: Apply encryption if enabled
      let finalOriginal = text;
      let finalTranslated = fullTranslated;
      let finalSegments = storeSegments;

      if (encryptionActive) {
        finalOriginal = encryptPayload(text, encryptionKey);
        finalTranslated = encryptPayload(fullTranslated, encryptionKey);
        finalSegments = storeSegments.map((s) => ({
          original: encryptPayload(s.original, encryptionKey),
          translated: encryptPayload(s.translated, encryptionKey),
        }));
      }

      setResults(finalOriginal, finalTranslated, finalSegments, encryptionActive);

      // Build toast message
      let description = `Translated ${storeSegments.length} segments from ${srcLang} to ${tgtLang}.`;
      if (tmHits > 0) {
        description += ` ${tmHits} segment${tmHits === 1 ? '' : 's'} from Translation Memory.`;
      }
      if (piiEnabled && piiResult.piiCount > 0) {
        description += ` ${piiResult.piiCount} PII entities protected.`;
      }
      if (encryptionActive) {
        description += ' Data encrypted with AES-256.';
      }

      toast({
        title: demoMode ? 'Translation complete (Demo)' : 'Translation complete',
        description,
      });

      // Notification: text translation complete
      addNotification(
        'translation_complete',
        demoMode ? 'Translation Complete (Demo)' : 'Translation Complete',
        `${storeSegments.length} segments • ${srcLang} → ${tgtLang}${tmHits > 0 ? ` • ${tmHits} TM hits` : ''}`,
        { segments: storeSegments.length, srcLang, tgtLang, tmHits }
      );

      // Notification: PII detected
      if (piiEnabled && piiResult.piiCount > 0) {
        addNotification(
          'pii_detected',
          'PII Protected',
          `${piiResult.piiCount} entities detected and preserved: ${piiResult.piiTypes.join(', ')}`,
          { count: piiResult.piiCount }
        );
      }

      // Notification: encryption status
      if (encryptionActive) {
        addNotification(
          'encryption_status',
          'Data Encrypted',
          'AES-256 encryption active. Results stored encrypted.',
          { status: 'enabled' }
        );
      }

      // Notification: TM hits
      if (tmHits > 0) {
        addNotification(
          'tm_hit',
          'Translation Memory Match',
          `${tmHits} segment${tmHits === 1 ? '' : 's'} found in Translation Memory`,
          { hits: tmHits }
        );
      }

      // Notification: demo mode
      if (demoMode) {
        addNotification(
          'demo_mode',
          'Demo Mode',
          'Translations generated using built-in dictionary. For real translations, disable Demo Mode and provide a valid API token.',
          { mode: 'demo' }
        );
      }

      // Success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Translation failed',
        description: message,
        variant: 'destructive',
      });
      addNotification('translation_error', 'Translation Failed', message);
      useTranslationStore.getState().resetResults();
    }
  };

  // Handle generating a new encryption key
  const handleGenerateKey = useCallback(() => {
    const newKey = generateEncryptionKey();
    setEncryptionKey(newKey);
    setEncryptionKeyGenerated(true);
    toast({
      title: 'Encryption key generated',
      description: 'A new AES-256 encryption key has been generated. Your data will be encrypted in the store.',
    });
    addNotification('encryption_status', 'Encryption Key Generated', 'A new AES-256 encryption key has been generated for your session.');
  }, [setEncryptionKey, toast, addNotification]);

  // Handle toggling decryption view
  const handleToggleDecrypt = useCallback(() => {
    if (!encryptionActive) return;
    setShowDecrypted((prev) => !prev);
  }, [encryptionActive]);

  // Clear textarea and file upload
  const handleClear = useCallback(() => {
    setInputText('');
    setUploadedFile(null);
    setPiiInfo(null);
    setShowDecrypted(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Handle Ctrl+Enter keyboard shortcut
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (inputText.trim() && !isTranslating) {
          handleTranslate();
        }
      }
    },
    [inputText, isTranslating, handleTranslate]
  );

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  // Simple language detection based on script
  const detectedLanguage = (() => {
    if (!inputText.trim()) return null;
    const devanagariRegex = /[\u0900-\u097F]/g;
    const devanagariMatches = inputText.match(devanagariRegex);
    const latinMatches = inputText.match(/[a-zA-Z]/g);
    const devanagariCount = devanagariMatches?.length || 0;
    const latinCount = latinMatches?.length || 0;
    if (devanagariCount > latinCount) return 'Devanagari';
    if (latinCount > devanagariCount) return 'Latin';
    return 'Mixed';
  })();

  return (
    <div className="group relative rounded-xl p-[2px] animate-rotate-border" style={{
      background: 'conic-gradient(from var(--gradient-angle, 0deg), #10b981, #14b8a6, #f59e0b, #10b981)',
      opacity: 0.6,
      transition: 'opacity 0.5s',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
    >
    <Card className="relative rounded-xl card-hover overflow-hidden">
      {/* Gradient progress bar at top of card */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-20 h-1 bg-muted/30 overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            {/* Shimmer effect on progress bar */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="size-4 text-emerald-600" />
          File Translation
        </CardTitle>
        <CardDescription>
          Upload a file or paste text to translate between English, Nepali, and
          Tamang.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Demo Mode - Quick sample texts */}
        <DemoMode onSelectText={(text) => setInputText(text)} />

        {/* Translation Empty State — shown when no text and no file */}
        {!inputText.trim() && !uploadedFile && (
          <TranslationEmptyState
            onTryDemo={() => {
              const demoText = 'Nepal is a beautiful country nestled in the Himalayas. The capital city is Kathmandu, known for its rich cultural heritage and ancient temples.';
              setInputText(demoText);
            }}
            onUploadFile={() => fileInputRef.current?.click()}
            onPasteText={() => {
              const textarea = document.querySelector('textarea');
              if (textarea) textarea.focus();
            }}
          />
        )}

        {/* File Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative cursor-pointer rounded-xl text-center transition-all duration-300"
        >
          {/* Animated dashed border SVG */}
          <svg className="absolute inset-0 w-full h-full rounded-xl pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <rect
              x="1" y="1" rx="12" ry="12"
              width="calc(100% - 2px)" height="calc(100% - 2px)"
              fill="none"
              stroke={isDragging ? '#10b981' : 'currentColor'}
              strokeWidth="2"
              strokeDasharray="8 6"
              className={isDragging ? 'animate-dash-march' : ''}
              style={{ color: isDragging ? undefined : 'oklch(0.7 0 0 / 25%)' }}
            />
          </svg>
          <div
            className={`relative rounded-xl p-8 transition-all duration-300 overflow-hidden ${
              isDragging
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-emerald-400'
                : 'bg-background hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 border-2 border-transparent'
            }`}
            style={{
              backgroundImage: isDragging ? undefined : 'radial-gradient(circle, oklch(0.7 0 0 / 8%) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.csv,.tsv,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
          <motion.div
            animate={isDragging ? { scale: [1, 1.1, 1], y: [0, -4, 0] } : {}}
            transition={{ duration: 0.8, repeat: isDragging ? Infinity : 0 }}
          >
          <Upload
            className={`mx-auto size-8 mb-2 ${
              isDragging ? 'text-emerald-500' : 'text-muted-foreground'
            }`}
          />
          </motion.div>
          <p className="text-sm font-medium">
            {isDragging
              ? 'Drop your file here'
              : 'Drag & drop a file or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, CSV, TSV — Max 1MB
          </p>
          {isDragging && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-2"
            >
              Drop to upload!
            </motion.p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 rounded bg-red-100/80 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <FileText className="size-2.5" /> PDF
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-blue-100/80 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <File className="size-2.5" /> DOCX
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <FileSpreadsheet className="size-2.5" /> CSV/TSV
            </span>
          </div>
          </div>
        </div>

        {/* Uploaded File Preview */}
        <AnimatePresence>
          {uploadedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
            >
              {getFileIcon(uploadedFile.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.size)}
                  {/\.(pdf|docx|csv|tsv)$/i.test(uploadedFile.name) && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                      • Server-side processing
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                className="size-8 shrink-0"
              >
                <X className="size-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Text to Translate
            </label>
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{inputText.length} chars</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
              {detectedLanguage && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    detectedLanguage === 'Devanagari'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                      : detectedLanguage === 'Latin'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400'
                  }`}>
                    {detectedLanguage === 'Devanagari' ? 'नेपाली/तामाङ' : detectedLanguage === 'Latin' ? 'English' : 'Mixed'}
                  </span>
                </>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Type or paste text here... (नेपाली or तामाङ text supported)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[150px] resize-y font-mono text-sm flex-1"
            />
            <div className="flex flex-col items-center gap-2 pt-1">
              <VoiceInput onTranscription={(text) => setInputText((prev) => (prev ? prev + ' ' + text : text))} />
              <SpeechToText />
            </div>
          </div>

          {/* Live Translation Preview — only show when typing and not translating */}
          {inputText.trim() && !isTranslating && (
            <LiveTranslationPreview inputText={inputText} />
          )}

          {/* Character count progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((inputText.length / MAX_TEXT_LENGTH) * 100, 100)}%`,
                  background:
                    inputText.length > MAX_TEXT_LENGTH * 0.9
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : inputText.length > MAX_TEXT_LENGTH * 0.7
                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : 'linear-gradient(90deg, #10b981, #14b8a6)',
                }}
              />
            </div>
            <span className={`text-[9px] font-medium tabular-nums ${
              inputText.length > MAX_TEXT_LENGTH * 0.9
                ? 'text-red-500'
                : 'text-muted-foreground'
            }`}>
              {inputText.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
        </div>

        {/* Feature indicators row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Type className="size-3.5" />
          <span>
            {srcLang} → {tgtLang}
          </span>
          {piiEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400 glow-badge">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ShieldCheck className="size-3" />
              </motion.span>
              PII Shield
            </span>
          )}
          {encryptionEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900 dark:text-amber-400">
              {encryptionActive ? (
                <Lock className="size-3" />
              ) : (
                <LockOpen className="size-3" />
              )}
              {encryptionActive ? 'AES-256 Encrypted' : 'Encryption (no key)'}
            </span>
          )}
          {uploadedFile?.file && /\.(pdf|docx|csv|tsv)$/i.test(uploadedFile.name) && (
            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700 dark:bg-sky-900 dark:text-sky-400">
              File Mode
            </span>
          )}
          {glossaryEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] text-teal-700 dark:bg-teal-900 dark:text-teal-400">
              <BookOpen className="size-3" />
              Glossary
            </span>
          )}
          {tmEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400">
              <Database className="size-3" />
              TM
            </span>
          )}
          {tmHitCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900 dark:text-amber-400">
              <Zap className="size-3" />
              {tmHitCount} TM Hit{tmHitCount !== 1 ? 's' : ''}
            </span>
          )}
          {demoMode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900 dark:text-amber-400">
              <FlaskConical className="size-3" />
              Demo
            </span>
          )}
        </div>

        {/* Word of the Day mini-card */}
        <div className="rounded-lg border border-teal-200/60 bg-gradient-to-r from-teal-50/50 via-emerald-50/30 to-amber-50/50 dark:from-teal-950/20 dark:via-emerald-950/10 dark:to-amber-950/20 p-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-amber-500 shrink-0" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Word of the Day</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs font-medium text-foreground/90">{wordOfDay.en}</span>
            <span className="text-muted-foreground/40">→</span>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{wordOfDay.ne}</span>
            <span className="text-muted-foreground/40">→</span>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{wordOfDay.tm}</span>
          </div>
        </div>

        {/* Recent Files mini-list */}
        {recentFiles.length > 0 && !uploadedFile && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="size-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Recent Files</span>
            </div>
            <div className="space-y-1">
              {recentFiles.map((rf, idx) => (
                <div
                  key={`${rf.name}-${rf.timestamp}`}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-[9px] text-muted-foreground/60 tabular-nums">{idx + 1}.</span>
                  <span className="text-xs truncate max-w-[180px]">{rf.name}</span>
                  <span className="text-[9px] text-muted-foreground/50 ml-auto shrink-0">{formatFileSize(rf.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PII Detection Info */}
        <AnimatePresence>
          {piiInfo && piiInfo.count > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-3"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  PII Protected
                </p>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {piiInfo.count} PII {piiInfo.count === 1 ? 'entity' : 'entities'} detected and
                preserved: {piiInfo.types.join(', ')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Personal information was not sent to the translation API.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Encryption controls */}
        <AnimatePresence>
          {encryptionEnabled && !encryptionActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LockOpen className="size-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Encryption Key Required
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateKey}
                  className="h-7 text-xs"
                >
                  Generate Key
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Generate an AES-256 encryption key to encrypt your data in the store.
                The key is only stored in your browser session.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Encryption active indicator */}
        <AnimatePresence>
          {encryptionActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    AES-256 Encryption Active
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                  {encryptionKeyGenerated ? 'Generated' : 'Custom'} Key
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Translation results are encrypted in the store. Click the lock icon in
                the output to decrypt and view plaintext.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleDecrypt}
                  className="h-7 text-xs"
                >
                  {showDecrypted ? (
                    <>
                      <LockOpen className="size-3 mr-1" />
                      Hide Plaintext
                    </>
                  ) : (
                    <>
                      <Lock className="size-3 mr-1" />
                      Decrypt & View
                    </>
                  )}
                </Button>
                {!encryptionKeyGenerated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateKey}
                    className="h-7 text-xs"
                  >
                    Use Generated Key
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Translate & Clear Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !inputText.trim()}
            className={`flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all ${
              inputText.trim() && !isTranslating ? 'animate-pulse-glow' : ''
            }`}
            size="lg"
          >
            <span className="relative">
              {isTranslating ? (
                <>
                  <DualRingSpinner size={18} className="mr-2" />
                  Translating... {completedSegments}/{totalSegments}
                </>
              ) : (
                <>
                  <Languages className="mr-2 size-4" />
                  Translate {srcLang} → {tgtLang}
                </>
              )}
              {/* Floating particle dots around button during translation */}
              {isTranslating && (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute size-1.5 rounded-full pointer-events-none"
                      style={{
                        backgroundColor: ['#10b981', '#14b8a6', '#f59e0b', '#10b981', '#14b8a6'][i],
                      }}
                      animate={{
                        x: [
                          Math.cos((i * 72 * Math.PI) / 180) * 20,
                          Math.cos(((i * 72 + 36) * Math.PI) / 180) * 30,
                          Math.cos((i * 72 * Math.PI) / 180) * 20,
                        ],
                        y: [
                          Math.sin((i * 72 * Math.PI) / 180) * 10,
                          Math.sin(((i * 72 + 36) * Math.PI) / 180) * 15,
                          Math.sin((i * 72 * Math.PI) / 180) * 10,
                        ],
                        opacity: [0, 1, 0],
                        scale: [0.5, 1.2, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </>
              )}
            </span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleClear}
            disabled={isTranslating || (!inputText && !uploadedFile)}
            className="shrink-0 hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {/* Keyboard shortcut hint */}
        {inputText.trim() && !isTranslating && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Keyboard className="size-3" />
            <span>Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] border">Ctrl</kbd>+<kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] border">Enter</kbd> to translate</span>
          </div>
        )}

        {/* Success animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="relative flex items-center justify-center gap-3 py-4"
            >
              <motion.div
                className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <svg
                  width="24" height="24" viewBox="0 0 24 24" fill="none"
                  className="text-emerald-600 dark:text-emerald-400 animate-checkmark-burst"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Translation Complete!</span>
              {/* Confetti-like particles */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="absolute size-1.5 rounded-full"
                  style={{
                    backgroundColor: ['#10b981', '#14b8a6', '#f59e0b', '#10b981', '#14b8a6', '#f59e0b'][i],
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos((i * 60 * Math.PI) / 180) * 60,
                    y: Math.sin((i * 60 * Math.PI) / 180) * 60,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        <AnimatePresence>
          {isTranslating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {progress}% complete
                {piiEnabled && piiInfo && piiInfo.count > 0 && (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                    • {piiInfo.count} PII entities protected
                  </span>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
    </div>
  );
}
