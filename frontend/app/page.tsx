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

const LANGUAGE_OPTIONS = ["English", "Nepali", "Tamang"] as const;

type Language = (typeof LANGUAGE_OPTIONS)[number];
type DocumentFileType = "pdf" | "docx" | "csv" | "tsv" | "xlsx" | "xls";

type ProcessFileSegment = {
  original: string;
  translated: string;
};

type ProcessFileResult = {
  original: string;
  translated: string;
  segments: ProcessFileSegment[];
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
  if (
    extension === "pdf" ||
    extension === "docx" ||
    extension === "csv" ||
    extension === "tsv"
  ) {
    return extension;
  }
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

  const translateDocument = async () => {
    if (!documentFile || !documentFileType) {
      return;
    }

    setDocumentStatus("loading");
    setDocumentProgress(0);
    setDocumentProgressMessage("Uploading document...");
    
    try {
      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("src_lang", sourceLanguage);
      formData.append("tgt_lang", targetLanguage);
      formData.append("pii_enabled", "true");
      formData.append("knowledge_graph_enabled", "true");

      const response = await fetch("/api/process-file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Document translation failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partial = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        partial += decoder.decode(value, { stream: true });
        const lines = partial.split("\n");
        partial = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.type === "status") {
              setDocumentProgressMessage(data.message);
            } else if (data.type === "progress") {
              const progress = Math.round((data.current / data.total) * 100);
              setDocumentProgress(progress);
              setDocumentProgressMessage(`Translating sentences (${data.current}/${data.total})...`);
            } else if (data.type === "result") {
              const resultData = data.data;
              
              // Build knowledge entries
              const termMap = new Map<string, { translation: string; frequency: number }>();
              for (const seg of (resultData.segments || [])) {
                const key = seg.original.trim().toLowerCase();
                if (!key) continue;
                const existing = termMap.get(key);
                if (existing) {
                  existing.frequency += 1;
                } else {
                  termMap.set(key, { translation: seg.translated, frequency: 1 });
                }
              }
              const knowledgeEntries = Array.from(termMap.entries())
                .map(([source, info]) => ({
                  source,
                  translation: info.translation,
                  frequency: info.frequency,
                }))
                .filter(entry => entry.frequency > 1)
                .sort((a, b) => b.frequency - a.frequency);
              
              setDocumentResult({
                original: resultData.original || "",
                translated: resultData.translated || "",
                segments: resultData.segments || [],
                knowledgeEntries,
                fileInfo: resultData.fileInfo || {
                  name: documentFile.name,
                  type: documentFileType,
                  size: documentFile.size,
                }
              });
              setDocumentStatus("success");
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error("Failed to parse stream chunk or stream error", e);
            if (e instanceof Error) {
              setDocumentProgressMessage(e.message);
            }
            throw e; // Rethrow to be caught by the outer catch
          }
        }
      }
      
      // If we exit the loop without success or error, it might have ended abruptly
      if (documentStatus === "loading") {
        // Just in case it never received "result"
      }
    } catch (error) {
      console.error("Translation failed:", error);
      setDocumentStatus("error");
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

    const response = await fetch("http://localhost:8000/document/reconstruct", {
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

  const fetchYoutubeSubtitles = async () => {
    if (!youtubeUrl.trim()) {
      return;
    }

    setYoutubeStatus("loading");
    setYoutubeTranslateStatus("idle");
    setTranslatedYoutubeSubtitles([]);

    try {
      const response = await fetch("/api/youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          src_lang: sourceLanguage,
        }),
      });
      const payload = (await response.json()) as {
        subtitles?: SubtitleRow[];
        title?: string;
        videoId?: string;
        isDemo?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "YouTube fetch failed");
      }

      setYoutubeTitle(payload.title || "");
      setYoutubeVideoId(payload.videoId || "");
      setYoutubeIsDemo(Boolean(payload.isDemo));
      setYoutubeSubtitles(payload.subtitles || []);
      setYoutubeStatus("success");
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
              <Badge variant="secondary" className="w-fit gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                <ArrowRightLeft className="size-3.5" /> Core translation engine
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                TamangNetra Studio
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Professional translation across English, Nepali, and Tamang. Features robust API rate-limiting, sentence-level PII preservation, and multi-format document reconstruction.
              </p>
            </div>

            <Card className="w-full max-w-sm border-dashed bg-gradient-to-br from-background to-muted/30 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-3 p-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2 text-emerald-600 dark:text-emerald-400"
                >
                  {healthStatus === "loading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                </motion.div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {healthStatus === "success"
                      ? "Neural API Connected"
                      : healthStatus === "error"
                        ? "API Offline"
                        : "Initializing Engine..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {health
                      ? `Latency: ${health.status === 'ok' ? '< 50ms' : 'Unknown'} • Ready`
                      : "Awaiting heartbeat..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button variant="outline" size="sm" asChild className="w-fit hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 transition-colors">
            <a
              href="http://localhost:8000/docs"
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
        >
          <Tabs defaultValue="translate" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-2">
            <TabsTrigger value="translate">Translate</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
          </TabsList>

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
            <Card>
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
                  className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all duration-300 ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-lg shadow-emerald-500/20"
                      : "border-border hover:border-emerald-500/50 hover:bg-muted/50"
                  }`}
                >
                  <Input
                    type="file"
                    accept=".pdf,.docx,.csv,.tsv,.xlsx,.xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processSelectedFile(file);
                    }}
                  />
                  <div className="flex flex-col items-center gap-4 text-center pointer-events-none">
                    <motion.div
                      animate={isDragging ? { y: [0, -10, 0] } : {}}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="p-4 rounded-full bg-background/50 backdrop-blur-sm shadow-sm border border-border"
                    >
                      <UploadCloud className={`size-8 ${isDragging ? "text-emerald-500" : "text-muted-foreground"}`} />
                    </motion.div>
                    <div>
                      <p className="text-base font-medium">Click or drag document here</p>
                      <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, CSV, Excel</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={translateDocument}
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
                        const fakeProgress = documentProgress;
                        const mins = Math.floor(documentElapsedSeconds / 60);
                        const secs = documentElapsedSeconds % 60;
                        return (
                          <div className="flex flex-col gap-5 py-4 px-2">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                  className="size-4 rounded-full border-2 border-emerald-500 border-t-transparent"
                                />
                                <span className="text-sm font-medium text-foreground">
                                  {documentProgressMessage}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                {fakeProgress}%
                              </span>
                            </div>

                            {/* Progress track */}
                            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                              <motion.div
                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                initial={{ width: "0%" }}
                                animate={{ width: `${fakeProgress}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              />
                              {/* Shimmer overlay */}
                              <motion.div
                                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                                animate={{ x: ["-100%", "500%"] }}
                                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                              />
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                ⏱ <span className="font-mono font-medium">{mins}m {secs}s</span> elapsed
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ✓ Stream connected
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
            <Card>
              <CardHeader>
                <CardTitle>YouTube subtitles</CardTitle>
                <CardDescription>
                  Fetch captions, translate them, and export an SRT file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">YouTube URL</label>
                    <Input
                      value={youtubeUrl}
                      onChange={(event) => setYoutubeUrl(event.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
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

                {youtubeTitle ? (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {youtubeTitle}
                    </p>
                    {youtubeVideoId ? (
                      <p className="text-xs">Video ID: {youtubeVideoId}</p>
                    ) : null}
                  </div>
                ) : null}

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
    </div>
  );
}
