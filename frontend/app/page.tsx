"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileUp,
  Loader2,
  ShieldCheck,
  Video,
  UploadCloud,
  FileText,
  X,
  Plus,
} from "lucide-react";
import { Navbar } from "@/src/components/tamangnetra/Navbar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { Textarea } from "@/src/components/ui/textarea";
import { Skeleton } from "@/src/components/ui/skeleton";
import { apiClient, type HealthResponse } from "@/src/lib/api-client";
import { translateWithPII } from "@/src/hooks/use-pii-translation";
import { TypewriterEffect } from "@/src/components/tamangnetra/TypewriterEffect";
import { PdfViewer } from "@/src/components/tamangnetra/PdfViewer";
import { TranslatedDocViewer, type DocViewerFileType } from "@/src/components/tamangnetra/TranslatedDocViewer";
import YouTube, { type YouTubePlayer } from "react-youtube";

const LANGUAGE_OPTIONS = ["English", "Nepali", "Tamang"] as const;

function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
    /v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

type Language = (typeof LANGUAGE_OPTIONS)[number];
type DocumentFileType = "pdf" | "docx" | "csv" | "tsv" | "xlsx" | "xls" | "image" | "jpg" | "jpeg" | "png";

type ProcessFileSegment = {
  original: string;
  translated: string;
};

type ProcessFileResult = {
  original: string;
  translated: string;
  segments: ProcessFileSegment[];
  knowledgeEntries?: Array<{
    source: string;
    translation: string;
    frequency: number;
  }>;
  fileInfo: {
    name: string;
    type: DocumentFileType;
    size: number;
  };
};

type SubtitleRow = {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
};

type TranslatedSubtitleRow = SubtitleRow & {
  translated: string;
};

function StatusPill({
  status,
  label,
}: {
  status: "idle" | "loading" | "success" | "error";
  label: string;
}) {
  const styles = {
    idle: "bg-muted text-muted-foreground",
    loading: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    error: "bg-red-500/15 text-red-700 dark:text-red-300",
  } as const;

  return <Badge className={styles[status]}>{label}</Badge>;
}

function getDocumentType(fileName: string): DocumentFileType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const docs: DocumentFileType[] = ["pdf", "docx", "csv", "tsv", "xlsx", "xls"];
  if (docs.includes(extension as any)) return extension as DocumentFileType;
  
  const images = ["jpg", "jpeg", "png"];
  if (images.includes(extension as any)) return "image";
  
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [isDragging, setIsDragging] = useState(false);

  const [sourceLanguage, setSourceLanguage] = useState<Language>("English");
  const [targetLanguage, setTargetLanguage] = useState<Language>("Nepali");

  const [text, setText] = useState("Hello, how are you?");
  const [translatedText, setTranslatedText] = useState("");
  const [translateStatus, setTranslateStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [piiCount, setPiiCount] = useState(0);
  const [piiTypes, setPiiTypes] = useState<string[]>([]);

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentFileType, setDocumentFileType] =
    useState<DocumentFileType | null>(null);
  const [documentFileBase64, setDocumentFileBase64] = useState("");
  const [documentResult, setDocumentResult] =
    useState<ProcessFileResult | null>(null);
  const [documentStatus, setDocumentStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [documentElapsedSeconds, setDocumentElapsedSeconds] = useState(0);
  const [documentProgress, setDocumentProgress] = useState(0);
  const [documentProgressMessage, setDocumentProgressMessage] = useState("Uploading document...");
  const [incrementalSegments, setIncrementalSegments] = useState<Array<{ original: string; translated: string }>>([]);

  useEffect(() => {
    if (documentStatus !== "loading") {
      setDocumentElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setDocumentElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [documentStatus]);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [youtubeIsDemo, setYoutubeIsDemo] = useState(false);
  const [youtubeSubtitles, setYoutubeSubtitles] = useState<SubtitleRow[]>([]);
  const [translatedYoutubeSubtitles, setTranslatedYoutubeSubtitles] = useState<
    TranslatedSubtitleRow[]
  >([]);
  const [youtubeStatus, setYoutubeStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [youtubeTranslateStatus, setYoutubeTranslateStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<File | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState(false);
  // Cached translated PDF blob — fetched once, reused for both download and view
  const [translatedDocBlob, setTranslatedDocBlob] = useState<Blob | null>(null);
  const [youtubePlayerTime, setYoutubePlayerTime] = useState(0);
  const [youtubePlayerReady, setYoutubePlayerReady] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    let active = true;

    const checkBackend = async () => {
      setHealthStatus("loading");
      try {
        const result = await apiClient.healthCheck();
        if (!active) return;
        setHealth(result);
        setHealthStatus("success");
      } catch {
        if (!active) return;
        setHealthStatus("error");
      }
    };

    checkBackend();

    return () => {
      active = false;
    };
  }, []);

  // Keyboard navigation for PDF viewer
  useEffect(() => {
    if (!showPdfViewer) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPdfViewer(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPdfViewer]);

  const translatePlainText = async () => {
    setTranslateStatus("loading");
    try {
      const analysis = translateWithPII(text, true);
      const translatedSegments: string[] = [];

      for (const fragment of analysis.translatableText) {
        const response = await apiClient.translate({
          text: fragment,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          include_confidence: false,
        });
        translatedSegments.push(response.translated_text);
      }

      setTranslatedText(analysis.reconstruct(translatedSegments));
      setPiiCount(analysis.piiCount);
      setPiiTypes(analysis.piiTypes);
      setTranslateStatus("success");
    } catch {
      setTranslateStatus("error");
    }
  };

  const processSelectedFile = async (file: File | null) => {
    setDocumentResult(null);
    setDocumentStatus("idle");
    setDocumentFile(file);
    setDocumentFileType(file ? getDocumentType(file.name) : null);
    setDocumentFileBase64("");
    setTranslatedDocBlob(null); // Reset cached blob on new file

    if (!file) return;

    const type = getDocumentType(file.name);
    if (!type) {
      setDocumentFile(null);
      return;
    }

    const base64 = await readFileAsBase64(file);
    setDocumentFileBase64(base64);
  };

  const handleDocumentFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    await processSelectedFile(file);
  };

  const translateDocument = async (isRetry = false) => {
    if (!documentFile || !documentFileType) {
      return;
    }

    if (!isRetry) {
      setDocumentStatus("loading");
      setDocumentProgress(0);
      setDocumentProgressMessage("Translating document...");
      setIncrementalSegments([]);
    } else {
      setDocumentProgressMessage("Finalizing results...");
    }
    
    try {
      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("src_lang", sourceLanguage);
      formData.append("tgt_lang", targetLanguage);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/document/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to start translation task");
      }

      const { task_id } = await response.json();
      console.log(`[Document] Started task: ${task_id}`);

      // Polling function
      const pollTask = async () => {
        try {
          const statusRes = await fetch(`${apiUrl}/document/task/${task_id}`);
          if (!statusRes.ok) {
            throw new Error("Failed to poll task status");
          }
          
          const data = await statusRes.json();
          setDocumentProgress(data.progress);
          setDocumentProgressMessage(data.message);
          
          if (data.status === "success") {
            const resultData = data.result;
            const knowledgeEntries = generateKnowledgeEntries(resultData.segments || []);
            
            const finalResult: ProcessFileResult = {
              original: resultData.original || "",
              translated: resultData.translated || "",
              segments: resultData.segments || [],
              knowledgeEntries,
              fileInfo: resultData.fileInfo || {
                name: documentFile?.name || "document",
                type: documentFileType || "pdf",
                size: documentFile?.size || 0,
              }
            };
            
            setDocumentResult(finalResult);
            setDocumentStatus("success");
            setDocumentProgress(100);
            return; // Done!
          } else if (data.status === "error") {
            throw new Error(data.error || "Background task failed");
          }
          
          // Still processing, poll again in 3 seconds
          setTimeout(pollTask, 3000);
        } catch (err) {
          console.error("Polling error:", err);
          setDocumentStatus("error");
        }
      };

      pollTask();
    } catch (error) {
      console.error("Translation failed:", error);
      setDocumentStatus("error");
    }
  };

  /** Helper to process a single NDJSON line from the stream */
  const processLine = (line: string) => {
    try {
      const data = JSON.parse(line);
      
      if (data.type === "status") {
        setDocumentProgressMessage(data.message);
      } else if (data.type === "progress") {
        const progress = Math.round((data.current / data.total) * 100);
        setDocumentProgress(progress);
        setDocumentProgressMessage(`Translating sentences (${data.current}/${data.total})...`);
        
        // HANDLE INCREMENTAL SEGMENTS
        if (data.segment) {
          setIncrementalSegments(prev => {
            // Check if segment already exists to avoid duplicates
            const exists = prev.some(s => s.original === data.segment.original);
            if (exists) return prev;
            return [...prev, data.segment];
          });
        }
      } else if (data.type === "result") {
        const resultData = data.data;
        
  const generateKnowledgeEntries = (segments: Array<{ original: string; translated: string }>) => {
    const termMap = new Map<string, { translation: string; frequency: number }>();
    for (const seg of (segments || [])) {
      const key = (seg.original || "").trim().toLowerCase();
      if (!key) continue;
      const existing = termMap.get(key);
      if (existing) {
        existing.frequency += 1;
      } else {
        termMap.set(key, { translation: seg.translated || "", frequency: 1 });
      }
    }
    return Array.from(termMap.entries())
      .map(([source, info]) => ({
        source,
        translation: info.translation,
        frequency: info.frequency,
      }))
      .filter(entry => entry.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency);
  };
        
        const finalResult: ProcessFileResult = {
          original: resultData.original || "",
          translated: resultData.translated || "",
          segments: resultData.segments || [],
          knowledgeEntries,
          fileInfo: resultData.fileInfo || {
            name: documentFile?.name || "document",
            type: documentFileType || "pdf",
            size: documentFile?.size || 0,
          }
        };
        setDocumentResult(finalResult);
        setDocumentStatus("success");
      } else if (data.type === "error") {
        throw new Error(data.message);
      }
    } catch (e) {
      console.error("Failed to parse stream line:", line, e);
    }
  };

  /** Fetch (or return cached) translated document blob from the backend reconstruct endpoint. */
  const getTranslatedDocBlob = async (): Promise<Blob | null> => {
    if (translatedDocBlob) return translatedDocBlob;
    if (!documentFile || !documentFileType || !documentResult) return null;

    // Plain text / images — reconstruct inline, no backend call needed
    if (["txt", "image", "jpg", "jpeg", "png"].includes(documentFileType)) {
      const blob = new Blob([documentResult.translated], { type: "text/plain;charset=utf-8" });
      setTranslatedDocBlob(blob);
      return blob;
    }

    const formData = new FormData();
    formData.append("file", documentFile);
    formData.append("src_lang", sourceLanguage);
    formData.append("tgt_lang", targetLanguage);

    const response = await fetch("/api/reconstruct", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("Document reconstruction failed:", await response.text());
      return null;
    }

    const blob = await response.blob();
    setTranslatedDocBlob(blob);
    return blob;
  };

  const downloadTranslatedDocument = async () => {
    if (!documentFile || !documentFileType || !documentResult) return;
    setDownloadingDoc(true);
    try {
      const blob = await getTranslatedDocBlob();
      if (!blob) {
        // Fallback: download raw translated text
        const textBlob = new Blob([documentResult.translated], { type: "text/plain;charset=utf-8" });
        downloadBlob(textBlob, `translated_${documentFile.name.replace(/\.[^.]+$/, "")}.txt`);
        return;
      }
      const ext = ["txt", "image", "jpg", "jpeg", "png"].includes(documentFileType)
        ? "txt"
        : documentFileType;
      downloadBlob(blob, `translated_${documentFile.name.replace(/\.[^.]+$/, "")}.${ext}`);
    } finally {
      setDownloadingDoc(false);
    }
  };

  const openTranslatedDocumentViewer = async () => {
    if (!documentFile || !documentResult || !documentFileType) return;
    setDownloadingDoc(true);
    try {
      const blob = await getTranslatedDocBlob();
      if (!blob) return;
      
      if (documentFileType === "pdf") {
        const file = new File([blob], `translated_${documentFile.name}`, { type: "application/pdf" });
        setViewingFile(file);
        setShowPdfViewer(true);
      } else {
        setTranslatedDocBlob(blob);
        setShowDocViewer(true);
      }
    } finally {
      setDownloadingDoc(false);
    }
  };

  const parseSrtTimeToSeconds = (timeStr: string): number => {
    try {
      const [hms, ms] = timeStr.replace(".", ",").split(",");
      const parts = hms.split(":");
      let h = 0, m = 0, s = 0;
      if (parts.length === 3) {
        [h, m, s] = parts.map(Number);
      } else if (parts.length === 2) {
        [m, s] = parts.map(Number);
      } else {
        s = Number(parts[0]);
      }
      return h * 3600 + m * 60 + s + (Number(ms || 0) / 1000);
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (youtubeStatus !== "success" || !youtubePlayerReady || !playerRef.current) return;

    const interval = setInterval(() => {
      if (playerRef.current) {
        try {
          setYoutubePlayerTime(playerRef.current.getCurrentTime());
        } catch (e) {
          // Player might be unmounted or in error state
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [youtubeStatus, youtubePlayerReady]);

  const activeSubtitle = translatedYoutubeSubtitles.find(sub => {
    const start = parseSrtTimeToSeconds(sub.startTime);
    const end = parseSrtTimeToSeconds(sub.endTime);
    return youtubePlayerTime >= start && youtubePlayerTime <= end;
  });

  const fetchYoutubeSubtitles = async () => {
    if (!youtubeUrl.trim()) {
      return;
    }

    setYoutubeStatus("loading");
    setYoutubeTranslateStatus("idle");
    setTranslatedYoutubeSubtitles([]);

    try {
      const videoId = extractVideoId(youtubeUrl.trim());
      if (!videoId) throw new Error("Invalid YouTube URL");

      // Use our OWN Internal Backend Proxy (The 100% Reliable Fix)
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const proxyUrl = `${backendUrl}/youtube/transcript?v=${videoId}`;
      console.log(`[YouTube] Fetching via Internal Backend Proxy: ${proxyUrl}`);
      
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Failed to fetch transcript" }));
        throw new Error(errData.detail || "Failed to fetch transcript");
      }
      
      const transcriptData = await response.json();

      // 4. Format the segments
      const formattedSubtitles = transcriptData.events
        .filter((e: any) => e.segs && e.segs.length > 0)
        .map((event: any, i: number) => {
          const text = event.segs.map((s: any) => s.utf8).join("").trim();
          const formatTime = (seconds: number) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            const ms = Math.floor((seconds % 1) * 1000);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
          };

          return {
            index: i + 1,
            startTime: formatTime(event.tStartMs / 1000),
            endTime: formatTime((event.tStartMs + (event.dDurationMs || 0)) / 1000),
            text
          };
        })
        .filter((s: any) => s.text.length > 0);

      setYoutubeTitle("YouTube Video");
      setYoutubeVideoId(videoId);
      setYoutubeIsDemo(false);
      setYoutubeSubtitles(formattedSubtitles);
      setTranslatedYoutubeSubtitles([]);
      setYoutubeStatus("success");
      
      console.log(`[YouTube] Successfully fetched ${formattedSubtitles.length} segments via Internal Proxy.`);
    } catch {
      setYoutubeStatus("error");
    }
  };

  const translateYoutubeSubtitles = async () => {
    if (!youtubeSubtitles.length) {
      return;
    }

    setYoutubeTranslateStatus("loading");
    try {
      const textsToTranslate = youtubeSubtitles.map((row) => row.text);
      const response = await apiClient.batchTranslate(
        textsToTranslate,
        sourceLanguage,
        targetLanguage
      );

      const translated = youtubeSubtitles.map((row, index) => ({
        ...row,
        translated: response.translations[index] || row.text,
      }));
      
      setTranslatedYoutubeSubtitles(translated);
      setYoutubeTranslateStatus("success");
    } catch (e) {
      console.error("Batch translation failed:", e);
      setYoutubeTranslateStatus("error");
    }
  };

  const downloadYoutubeSrt = async () => {
    if (!translatedYoutubeSubtitles.length) {
      return;
    }

    const response = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        translatedSegments: translatedYoutubeSubtitles.map((row) => ({
          original: `${row.index}\n${row.startTime} --> ${row.endTime}\n${row.text}`,
          translated: row.translated,
        })),
        fileType: "srt",
        fileName: youtubeVideoId
          ? `${youtubeVideoId}.srt`
          : "youtube_subtitles.srt",
        srcLang: sourceLanguage,
        tgtLang: targetLanguage,
      }),
    });

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    downloadBlob(
      blob,
      youtubeVideoId ? `${youtubeVideoId}.srt` : "youtube_subtitles.srt",
    );
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated Mesh Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.2, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.1, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-teal-500/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[10%] left-[20%] w-[60%] h-[40%] rounded-full bg-emerald-700/20 blur-[100px]"
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 px-3 py-1">
                <ShieldCheck className="size-3.5" /> Google TMT Hackathon
              </Badge>
              <div className="flex flex-col gap-1 mt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">
                  Bridging cultures with digital precision.
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                  TamangNetra
                </h1>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                An advanced neural translation ecosystem for English, Nepali, and Tamang. 
                Experience <strong>pixel-perfect layout reconstruction</strong> for PDF, DOCX, CSV, and TSV files, 
                along with <strong>synchronized interactive translation</strong> for YouTube media.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="w-fit hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 transition-colors">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
              target="_blank"
              rel="noreferrer"
            >
              Developer API <ExternalLink className="ml-1.5 size-3.5" />
            </a>
          </Button>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          suppressHydrationWarning
        >
          <Tabs defaultValue="documents" className="space-y-4">
          <div className="flex justify-center mb-8">
            <TabsList className="h-12 inline-flex items-center justify-center rounded-full bg-muted/50 p-1 backdrop-blur-md border border-border/50 shadow-sm">
              <TabsTrigger value="translate" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
                Text
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
                Document
              </TabsTrigger>
              <TabsTrigger value="youtube" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
                YouTube
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="translate" id="translate">
            <Card className="backdrop-blur-xl bg-background/60 border-white/10 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle>Text translation</CardTitle>
                <CardDescription>
                  PII, email addresses, and phone numbers stay in place.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
                  {/* Left Column: Input */}
                  <div className="p-6 space-y-4 bg-muted/5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Source</label>
                      <select
                        className="h-8 w-32 rounded-md border bg-background/50 backdrop-blur-sm px-2 text-xs"
                        value={sourceLanguage}
                        onChange={(event) =>
                          setSourceLanguage(event.target.value as Language)
                        }
                      >
                        {LANGUAGE_OPTIONS.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      rows={10}
                      className="resize-none bg-background/50 backdrop-blur-sm border-white/5 focus-visible:ring-emerald-500/50 text-base"
                      placeholder="Enter text to translate..."
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <Button
                        onClick={translatePlainText}
                        disabled={translateStatus === "loading"}
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 text-white"
                      >
                        {translateStatus === "loading" ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : null}
                        Translate
                      </Button>
                      <div className="flex items-center gap-2">
                        <StatusPill status={translateStatus} label={translateStatus === "success" ? "Translated" : translateStatus === "error" ? "Failed" : "Ready"} />
                        <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
                          {piiCount > 0 ? `${piiCount} protected` : "PII safe"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Output */}
                  <div className="p-6 space-y-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Target</label>
                      <select
                        className="h-8 w-32 rounded-md border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/20 px-2 text-xs text-emerald-900 dark:text-emerald-100"
                        value={targetLanguage}
                        onChange={(event) =>
                          setTargetLanguage(event.target.value as Language)
                        }
                      >
                        {LANGUAGE_OPTIONS.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="min-h-[240px] rounded-md border border-emerald-100/50 dark:border-emerald-900/30 bg-background/40 backdrop-blur-md p-4 shadow-inner relative z-10">
                      <AnimatePresence mode="wait">
                        {translateStatus === "loading" ? (
                          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                            <Skeleton className="h-4 w-full bg-emerald-500/10" />
                            <Skeleton className="h-4 w-[90%] bg-emerald-500/10" />
                            <Skeleton className="h-4 w-[95%] bg-emerald-500/10" />
                            <Skeleton className="h-4 w-[80%] bg-emerald-500/10" />
                          </motion.div>
                        ) : translatedText ? (
                          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <p className="whitespace-pre-wrap text-base text-foreground leading-relaxed">
                              <TypewriterEffect text={translatedText} />
                            </p>
                            {piiTypes.length > 0 ? (
                              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300 shadow-sm mt-4">
                                <ShieldCheck className="size-3.5" />
                                <span>Protected: {piiTypes.join(", ")}</span>
                              </motion.div>
                            ) : null}
                          </motion.div>
                        ) : (
                          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full items-center justify-center text-muted-foreground/50 mt-16">
                            <p className="text-sm">Translation will appear here...</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" id="documents">
            <Card className="backdrop-blur-xl bg-background/60 border-white/10 shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle>Document upload</CardTitle>
                <CardDescription>
                  Upload a file, translate it, then download the translated file
                  in the same format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Source language
                    </label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={sourceLanguage}
                      onChange={(event) =>
                        setSourceLanguage(event.target.value as Language)
                      }
                    >
                      {LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Target language
                    </label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={targetLanguage}
                      onChange={(event) =>
                        setTargetLanguage(event.target.value as Language)
                      }
                    >
                      {LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processSelectedFile(file);
                  }}
                  className={`relative group flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-2xl transition-all duration-500 ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/5 scale-[1.01] shadow-2xl shadow-emerald-500/10"
                      : "border-muted-foreground/20 bg-muted/5 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                  }`}
                >
                  <Input
                    type="file"
                    accept=".pdf,.docx,.csv,.tsv,.xlsx,.xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processSelectedFile(file);
                    }}
                  />
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div className="relative">
                      <motion.div
                        animate={isDragging ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl"
                      >
                        <UploadCloud className="size-10" />
                      </motion.div>
                      <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        {documentFile ? documentFile.name : "Drop your document here"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                        Supports PDF, DOCX, CSV, Excel. <br/>Precision layout preservation enabled.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => translateDocument()}
                    disabled={documentStatus === "loading" || !documentFileType}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
                  >
                    {documentStatus === "loading" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Translate document
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadTranslatedDocument}
                    disabled={!documentResult || downloadingDoc}
                  >
                    {downloadingDoc ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 size-4" />
                    )}
                    {downloadingDoc ? "Building..." : "Download translated"}
                  </Button>
                  {documentResult && (
                    <Button
                      variant="outline"
                      onClick={openTranslatedDocumentViewer}
                      disabled={downloadingDoc || (!["pdf", "docx", "csv", "tsv", "xlsx", "xls"].includes(documentFileType || ""))}
                    >
                      {downloadingDoc ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 size-4" />
                      )}
                      View translated {documentFileType?.toUpperCase()}
                    </Button>
                  )}
                  <StatusPill
                    status={documentStatus}
                    label={
                      documentStatus === "success"
                        ? "Ready"
                        : documentStatus === "error"
                          ? "Failed"
                          : "Idle"
                    }
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="border-dashed bg-background/50 backdrop-blur-sm">
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      {documentFile ? (
                        <div className="flex flex-col items-center text-center space-y-2 py-4">
                          <FileText className="size-10 text-emerald-500/70" />
                          <div>
                            <p className="font-medium text-foreground line-clamp-1">
                              {documentFile.name}
                            </p>
                            <p className="text-xs uppercase mt-1">{documentFileType || "Unsupported"}</p>
                            <p className="text-xs">{(documentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center py-8">
                          No document selected.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-dashed md:col-span-2 bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/20">
                    <CardContent className="p-4 text-sm text-muted-foreground h-full relative">
                      {documentStatus === "loading" ? (() => {
                        const mins = Math.floor(documentElapsedSeconds / 60);
                        const secs = documentElapsedSeconds % 60;
                        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                        return (
                          <div className="flex flex-col items-center justify-center gap-6 py-12 px-4 text-center">
                            {/* Animated Activity Ring */}
                            <div className="relative">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="size-20 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="size-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                {documentProgressMessage}
                              </h3>
                              <p className="text-3xl font-mono tracking-tighter text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {timeStr}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                              <span className="flex items-center gap-1.5">
                                <span className="size-1 rounded-full bg-emerald-500" /> Neural API Active
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="size-1 rounded-full bg-teal-500" /> Preserving Layout
                              </span>
                            </div>
                          </div>
                        );
                      })() : documentResult ? (
                        <div className="space-y-2 h-full">
                          <p className="font-medium text-emerald-800 dark:text-emerald-300">
                            Translation preview
                          </p>
                          <div className="whitespace-pre-wrap text-foreground overflow-y-auto max-h-[150px] pr-2">
                            <TypewriterEffect text={documentResult.translated} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center py-8">
                          Translated document preview appears here.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="youtube" id="youtube">
            <Card className="backdrop-blur-xl bg-background/60 border-white/10 shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle>YouTube subtitles</CardTitle>
                <CardDescription>
                  Fetch captions, translate them, and export an SRT file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-8 max-w-3xl mx-auto py-4">
                  <div className="space-y-4 text-center">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-focus-within:duration-200"></div>
                      <div className="relative flex items-center bg-background rounded-full border border-border/50 px-6 h-14 shadow-sm">
                        <Video className="size-5 text-muted-foreground mr-4" />
                        <input
                          value={youtubeUrl}
                          onChange={(event) => setYoutubeUrl(event.target.value)}
                          placeholder="Paste YouTube video link here..."
                          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/60"
                        />
                        {youtubeUrl && (
                          <button 
                            onClick={() => setYoutubeUrl("")}
                            className="p-1 hover:bg-muted rounded-full transition-colors"
                          >
                            <X className="size-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Supported: Captions • Auto-Sync • SRT Export
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="group relative overflow-hidden rounded-2xl border bg-background/50 p-4 transition-all hover:border-emerald-500/50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">From</label>
                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <select
                        className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer"
                        value={sourceLanguage}
                        onChange={(event) => setSourceLanguage(event.target.value as Language)}
                      >
                        {LANGUAGE_OPTIONS.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </div>

                    <div className="group relative overflow-hidden rounded-2xl border bg-background/50 p-4 transition-all hover:border-teal-500/50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">To</label>
                        <div className="size-1.5 rounded-full bg-teal-500 animate-pulse" />
                      </div>
                      <select
                        className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer"
                        value={targetLanguage}
                        onChange={(event) => setTargetLanguage(event.target.value as Language)}
                      >
                        {LANGUAGE_OPTIONS.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={fetchYoutubeSubtitles}
                    disabled={youtubeStatus === "loading"}
                  >
                    {youtubeStatus === "loading" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Fetch subtitles
                  </Button>
                  <Button
                    onClick={translateYoutubeSubtitles}
                    disabled={
                      !youtubeSubtitles.length ||
                      youtubeTranslateStatus === "loading"
                    }
                  >
                    {youtubeTranslateStatus === "loading" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Translate subtitles
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadYoutubeSrt}
                    disabled={!translatedYoutubeSubtitles.length}
                  >
                    <Download className="mr-2 size-4" />
                    Download SRT
                  </Button>
                  <StatusPill
                    status={youtubeStatus}
                    label={
                      youtubeStatus === "success"
                        ? youtubeIsDemo
                          ? "Demo captions"
                          : "Fetched"
                        : youtubeStatus === "error"
                          ? "Failed"
                          : "Idle"
                    }
                  />
                </div>

                {youtubeVideoId && (
                  <div className="space-y-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl group">
                      <YouTube
                        videoId={youtubeVideoId}
                        onReady={(event) => { 
                          playerRef.current = event.target; 
                          setYoutubePlayerReady(true);
                        }}
                        className="absolute inset-0 w-full h-full"
                        opts={{
                          width: "100%",
                          height: "100%",
                          playerVars: {
                            autoplay: 0,
                            modestbranding: 1,
                            rel: 0,
                            enablejsapi: 1,
                            origin: typeof window !== 'undefined' ? window.location.origin : '',
                          },
                        }}
                      />
                      
                      {/* Subtitle Overlay */}
                      <AnimatePresence>
                        {activeSubtitle && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute bottom-10 left-0 right-0 px-8 text-center pointer-events-none z-10"
                          >
                            <span 
                              className="inline-block px-4 py-2 rounded-lg bg-black/70 backdrop-blur-md text-white text-lg sm:text-xl md:text-2xl font-medium shadow-lg border border-white/10"
                              style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                            >
                              {activeSubtitle.translated}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Playback Progress Indicator (Subtle) */}
                      <div className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-100 ease-linear z-20" 
                           style={{ width: `${playerRef.current ? (youtubePlayerTime / playerRef.current.getDuration()) * 100 : 0}%` }} />
                    </div>

                    {youtubeTitle ? (
                      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{youtubeTitle}</p>
                          <p className="text-xs">Video ID: {youtubeVideoId}</p>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          {translatedYoutubeSubtitles.length} Translated Segments
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="border-dashed">
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Fetched subtitles
                      </p>
                      <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                        {youtubeSubtitles.length > 0 ? (
                          youtubeSubtitles.slice(0, 8).map((row) => (
                            <div
                              key={row.index}
                              className="rounded-md border p-2"
                            >
                              <p className="text-xs text-muted-foreground">
                                {row.startTime} → {row.endTime}
                              </p>
                              <p>{row.text}</p>
                            </div>
                          ))
                        ) : (
                          <p>No subtitles loaded.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Translated subtitles
                      </p>
                      <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                        {translatedYoutubeSubtitles.length > 0 ? (
                          translatedYoutubeSubtitles.slice(0, 8).map((row) => (
                            <div
                              key={row.index}
                              className="rounded-md border p-2"
                            >
                              <p className="text-xs text-muted-foreground">
                                {row.startTime} → {row.endTime}
                              </p>
                              <p>{row.translated}</p>
                            </div>
                          ))
                        ) : (
                          <p>Translated subtitles appear here.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </motion.div>
      </main>
      </div>

      {/* PDF Viewer Overlay */}
      <AnimatePresence>
        {showPdfViewer && viewingFile && (
          <PdfViewer
            file={viewingFile}
            title={viewingFile.name}
            onClose={() => setShowPdfViewer(false)}
          />
        )}
      </AnimatePresence>
      {/* Doc Viewer Overlay */}
      <AnimatePresence>
        {showDocViewer && translatedDocBlob && documentFileType && (
          <TranslatedDocViewer
            blob={translatedDocBlob}
            fileType={documentFileType as DocViewerFileType}
            fileName={documentFile?.name || "translated_document"}
            onClose={() => setShowDocViewer(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Backend Status Bubble */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-500 ${
          healthStatus === "success" 
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" 
            : healthStatus === "error"
              ? "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
              : "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400"
        }`}>
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
              healthStatus === "success" ? "bg-emerald-400" : healthStatus === "error" ? "bg-red-400" : "bg-amber-400"
            }`}></span>
            <span className={`relative inline-flex h-2 w-2 rounded-full ${
              healthStatus === "success" ? "bg-emerald-500" : healthStatus === "error" ? "bg-red-500" : "bg-amber-500"
            }`}></span>
          </span>
          {healthStatus === "success" ? "Backend Connected" : healthStatus === "error" ? "Backend Offline" : "Checking Connection..."}
        </div>
      </motion.div>
    </div>
  );
}
