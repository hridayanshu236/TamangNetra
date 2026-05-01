'use client';

import { create } from 'zustand';
import { useTranslationHistory } from './TranslationHistory';

export interface TranslationSegment {
  original: string;
  translated: string;
}

export interface KnowledgeEntry {
  source: string;
  translation: string;
  frequency: number;
}

// Auto-save hook bridge — set after store creation to avoid circular deps
let _saveToHistory: ((entry: {
  srcLang: string;
  tgtLang: string;
  originalText: string;
  translatedText: string;
  segmentCount: number;
}) => void) | null = null;

export function bindHistorySaver(
  saver: (entry: {
    srcLang: string;
    tgtLang: string;
    originalText: string;
    translatedText: string;
    segmentCount: number;
  }) => void
) {
  _saveToHistory = saver;
}

interface TranslationState {
  // Settings
  srcLang: string;
  tgtLang: string;
  piiEnabled: boolean;
  encryptionEnabled: boolean;
  knowledgeGraphEnabled: boolean;
  fontAdjustEnabled: boolean;
  encryptionKey: string;
  apiToken: string;

  // State
  isTranslating: boolean;
  progress: number;
  totalSegments: number;
  completedSegments: number;

  // Results
  originalText: string;
  translatedText: string;
  segments: TranslationSegment[];
  knowledgeEntries: KnowledgeEntry[];
  isEncrypted: boolean;

  // File download support
  originalFileContent: string;
  originalFileType: string;
  originalFileName: string;

  // Glossary
  glossaryEnabled: boolean;

  // Translation Memory
  translationMemoryEnabled: boolean;

  // Live Preview
  livePreviewEnabled: boolean;

  // Demo Mode
  demoMode: boolean;

  // History
  historyOpen: boolean;

  // Actions
  setSrcLang: (lang: string) => void;
  setTgtLang: (lang: string) => void;
  swapLanguages: () => void;
  togglePII: () => void;
  toggleEncryption: () => void;
  toggleKnowledgeGraph: () => void;
  toggleFontAdjust: () => void;
  setEncryptionKey: (key: string) => void;
  setApiToken: (token: string) => void;
  startTranslation: () => void;
  updateProgress: (completed: number, total: number) => void;
  setResults: (
    original: string,
    translated: string,
    segments: TranslationSegment[]
  ) => void;
  addKnowledgeEntries: (entries: KnowledgeEntry[]) => void;
  setOriginalFile: (content: string, type: string, name: string) => void;
  toggleGlossary: () => void;
  toggleTranslationMemory: () => void;
  toggleLivePreview: () => void;
  toggleDemoMode: () => void;
  toggleHistory: () => void;
  setHistoryOpen: (open: boolean) => void;
  reset: () => void;
  resetResults: () => void;
}

const initialState = {
  srcLang: 'English',
  tgtLang: 'Nepali',
  piiEnabled: true,
  encryptionEnabled: false,
  knowledgeGraphEnabled: true,
  fontAdjustEnabled: false,
  encryptionKey: '',
  apiToken: '',
  isTranslating: false,
  progress: 0,
  totalSegments: 0,
  completedSegments: 0,
  originalText: '',
  translatedText: '',
  segments: [] as TranslationSegment[],
  knowledgeEntries: [] as KnowledgeEntry[],
  isEncrypted: false,
  originalFileContent: '',
  originalFileType: '',
  originalFileName: '',
  glossaryEnabled: true,
  translationMemoryEnabled: true,
  livePreviewEnabled: true,
  demoMode: true,
  historyOpen: false,
};

export const useTranslationStore = create<TranslationState>((set) => ({
  ...initialState,

  setSrcLang: (lang: string) =>
    set((state) => ({
      srcLang: lang,
      tgtLang: lang === state.tgtLang
        ? lang === 'English' ? 'Nepali' : 'English'
        : state.tgtLang,
    })),

  setTgtLang: (lang: string) =>
    set((state) => ({
      tgtLang: lang,
      srcLang: lang === state.srcLang
        ? lang === 'English' ? 'Nepali' : 'English'
        : state.srcLang,
    })),

  swapLanguages: () =>
    set((state) => ({
      srcLang: state.tgtLang,
      tgtLang: state.srcLang,
    })),

  togglePII: () => set((state) => ({ piiEnabled: !state.piiEnabled })),
  toggleEncryption: () =>
    set((state) => ({ encryptionEnabled: !state.encryptionEnabled })),
  toggleKnowledgeGraph: () =>
    set((state) => ({ knowledgeGraphEnabled: !state.knowledgeGraphEnabled })),
  toggleFontAdjust: () =>
    set((state) => ({ fontAdjustEnabled: !state.fontAdjustEnabled })),
  setEncryptionKey: (key: string) => set({ encryptionKey: key }),
  setApiToken: (token: string) => set({ apiToken: token }),
  setOriginalFile: (content: string, type: string, name: string) =>
    set({ originalFileContent: content, originalFileType: type, originalFileName: name }),

  toggleGlossary: () => set((state) => ({ glossaryEnabled: !state.glossaryEnabled })),
  toggleTranslationMemory: () => set((state) => ({ translationMemoryEnabled: !state.translationMemoryEnabled })),
  toggleLivePreview: () => set((state) => ({ livePreviewEnabled: !state.livePreviewEnabled })),
  toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
  toggleHistory: () => set((state) => ({ historyOpen: !state.historyOpen })),
  setHistoryOpen: (open: boolean) => set({ historyOpen: open }),

  startTranslation: () =>
    set({
      isTranslating: true,
      progress: 0,
      totalSegments: 0,
      completedSegments: 0,
    }),

  updateProgress: (completed: number, total: number) =>
    set({
      completedSegments: completed,
      totalSegments: total,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    }),

  setResults: (
    original: string,
    translated: string,
    segments: TranslationSegment[],
    encrypted?: boolean
  ) => {
    // Get current state for language pair
    const state = useTranslationStore.getState();

    // Auto-save to history
    if (_saveToHistory && original.trim()) {
      _saveToHistory({
        srcLang: state.srcLang,
        tgtLang: state.tgtLang,
        originalText: original.slice(0, 100),
        translatedText: translated.slice(0, 100),
        segmentCount: segments.length,
      });
    }

    set({
      originalText: original,
      translatedText: translated,
      segments,
      isEncrypted: encrypted ?? false,
      isTranslating: false,
      progress: 100,
      completedSegments: segments.length,
      totalSegments: segments.length,
    });
  },

  addKnowledgeEntries: (entries: KnowledgeEntry[]) =>
    set((state) => {
      const existing = new Map(
        state.knowledgeEntries.map((e) => [e.source.toLowerCase(), e])
      );
      for (const entry of entries) {
        const key = entry.source.toLowerCase();
        const prev = existing.get(key);
        if (prev) {
          existing.set(key, {
            ...prev,
            frequency: prev.frequency + entry.frequency,
          });
        } else {
          existing.set(key, entry);
        }
      }
      return {
        knowledgeEntries: Array.from(existing.values()).sort(
          (a, b) => b.frequency - a.frequency
        ),
      };
    }),

  reset: () => set({ ...initialState, historyOpen: false, livePreviewEnabled: initialState.livePreviewEnabled, translationMemoryEnabled: initialState.translationMemoryEnabled }),
  resetResults: () =>
    set({
      isTranslating: false,
      progress: 0,
      totalSegments: 0,
      completedSegments: 0,
      originalText: '',
      translatedText: '',
      segments: [],
      isEncrypted: false,
      originalFileContent: '',
      originalFileType: '',
      originalFileName: '',
    }),
}));
