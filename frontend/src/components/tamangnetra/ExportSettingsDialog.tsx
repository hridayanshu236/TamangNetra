'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileText,
  Subtitles,
  FileSpreadsheet,
  FileType,
  FileDown,
  Globe,
  Code,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Switch } from '@/src/components/ui/switch';
import { Slider } from '@/src/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { Label } from '@/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { useTranslationStore } from './TranslationStore';
import { useToast } from '@/src/hooks/use-toast';

// ── Types ──

type ExportFormat = 'txt' | 'srt' | 'csv' | 'pdf' | 'docx' | 'tmx' | 'xliff';

interface ExportPreferences {
  format: ExportFormat;
  txt: {
    includeOriginal: boolean;
    separator: 'newline' | 'dash' | 'numbered';
  };
  srt: {
    timestampFormat: 'hh:mm:ss,mmm' | 'hh:mm:ss.mmm';
    includeOriginal: boolean;
  };
  csv: {
    delimiter: 'comma' | 'tab' | 'semicolon';
    includeHeaders: boolean;
    encoding: 'utf-8' | 'utf-16';
  };
  pdf: {
    fontSize: number;
    orientation: 'portrait' | 'landscape';
    includeOriginal: boolean;
  };
  docx: {
    fontSize: number;
    includeComments: boolean;
  };
  tmx: {
    sourceLang: string;
    targetLang: string;
  };
  xliff: {
    version: '1.2' | '2.0';
    includeMetadata: boolean;
  };
}

const STORAGE_KEY = 'tamangnetra-export-prefs';

const DEFAULT_PREFS: ExportPreferences = {
  format: 'txt',
  txt: {
    includeOriginal: true,
    separator: 'newline',
  },
  srt: {
    timestampFormat: 'hh:mm:ss,mmm',
    includeOriginal: false,
  },
  csv: {
    delimiter: 'comma',
    includeHeaders: true,
    encoding: 'utf-8',
  },
  pdf: {
    fontSize: 12,
    orientation: 'portrait',
    includeOriginal: false,
  },
  docx: {
    fontSize: 12,
    includeComments: false,
  },
  tmx: {
    sourceLang: 'English',
    targetLang: 'Nepali',
  },
  xliff: {
    version: '1.2',
    includeMetadata: true,
  },
};

const FORMAT_CONFIG: Record<
  ExportFormat,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  txt: { label: 'TXT', icon: FileText, description: 'Plain text file' },
  srt: { label: 'SRT', icon: Subtitles, description: 'Subtitle format' },
  csv: { label: 'CSV', icon: FileSpreadsheet, description: 'Spreadsheet format' },
  pdf: { label: 'PDF', icon: FileType, description: 'Portable document' },
  docx: { label: 'DOCX', icon: FileDown, description: 'Word document' },
  tmx: { label: 'TMX', icon: Globe, description: 'Translation Memory eXchange' },
  xliff: { label: 'XLIFF', icon: Code, description: 'XML Localization Interchange' },
};

const LANGUAGES = ['English', 'Nepali', 'Tamang'];

// ── Preview Generator ──

function generatePreview(
  prefs: ExportPreferences,
  segments: Array<{ original: string; translated: string }>,
  srcLang: string,
  tgtLang: string
): string {
  const previewSegs = segments.slice(0, 3);
  if (previewSegs.length === 0) {
    previewSegs.push(
      { original: 'Hello world', translated: 'नमस्ते संसार' },
      { original: 'This is a test', translated: 'यो एक परीक्षण हो' },
      { original: 'Good morning', translated: 'शुभ प्रभात' }
    );
  }

  switch (prefs.format) {
    case 'txt': {
      const sep = prefs.txt.separator;
      return previewSegs
        .map((s, i) => {
          let line = s.translated;
          if (prefs.txt.includeOriginal) {
            line = `[${srcLang}] ${s.original}\n[${tgtLang}] ${s.translated}`;
          }
          if (sep === 'numbered') return `${i + 1}. ${line}`;
          if (sep === 'dash') return `— ${line}`;
          return line;
        })
        .join('\n\n');
    }

    case 'srt': {
      const fmt = prefs.srt.timestampFormat;
      return previewSegs
        .map((s, i) => {
          const start = i * 5;
          const end = start + 4;
          const formatTime = (secs: number) => {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const sec = secs % 60;
            const sep = fmt === 'hh:mm:ss,mmm' ? ',' : '.';
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(sec)).padStart(2, '0')}${sep}000`;
          };
          let block = `${i + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${s.translated}`;
          if (prefs.srt.includeOriginal) {
            block += `\n${s.original}`;
          }
          return block;
        })
        .join('\n\n');
    }

    case 'csv': {
      const delim = prefs.csv.delimiter === 'comma' ? ',' : prefs.csv.delimiter === 'tab' ? '\t' : ';';
      const lines: string[] = [];
      if (prefs.csv.includeHeaders) {
        lines.push(`"Original (${srcLang})"${delim}"Translation (${tgtLang})"`);
      }
      previewSegs.forEach((s) => {
        lines.push(`"${s.original}"${delim}"${s.translated}"`);
      });
      return lines.join('\n');
    }

    case 'pdf': {
      return previewSegs
        .map((s, i) => {
          let line = `[${tgtLang}] ${s.translated}`;
          if (prefs.pdf.includeOriginal) {
            line = `[${srcLang}] ${s.original}\n[${tgtLang}] ${s.translated}`;
          }
          return `Page ${i + 1}:\n${line}`;
        })
        .join('\n\n');
    }

    case 'docx': {
      return previewSegs
        .map((s, i) => {
          let line = `¶${i + 1} ${s.translated}`;
          if (prefs.docx.includeComments) {
            line += `\n  💬 Comment: Original: "${s.original}"`;
          }
          return line;
        })
        .join('\n\n');
    }

    case 'tmx': {
      return `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <body>
${previewSegs
        .map(
          (s) =>
            `    <tu>\n      <tuv xml:lang="${prefs.tmx.sourceLang.substring(0, 2).toLowerCase()}">\n        <seg>${s.original}</seg>\n      </tuv>\n      <tuv xml:lang="${prefs.tmx.targetLang.substring(0, 2).toLowerCase()}">\n        <seg>${s.translated}</seg>\n      </tuv>\n    </tu>`
        )
        .join('\n')}
  </body>
</tmx>`;
    }

    case 'xliff': {
      const version = prefs.xliff.version;
      if (version === '2.0') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" srcLang="${prefs.tmx.sourceLang.substring(0, 2)}" trgLang="${prefs.tmx.targetLang.substring(0, 2)}">
  <file id="f1">
    <unit id="u1">
${previewSegs
          .map(
            (s, i) =>
              `      <segment id="${i + 1}">\n        <source>${s.original}</source>\n        <target>${s.translated}</target>\n      </segment>`
          )
          .join('\n')}
    </unit>
  </file>
</xliff>`;
      }
      return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2">
  <file source-language="${prefs.tmx.sourceLang.substring(0, 2)}" target-language="${prefs.tmx.targetLang.substring(0, 2)}">
    <body>
${previewSegs
        .map(
          (s, i) =>
            `      <trans-unit id="${i + 1}">\n        <source>${s.original}</source>\n        <target>${s.translated}</target>${prefs.xliff.includeMetadata ? `\n        <note>Segment ${i + 1}</note>` : ''}\n      </trans-unit>`
        )
        .join('\n')}
    </body>
  </file>
</xliff>`;
    }

    default:
      return '';
  }
}

// ── Full Export Generator ──

function generateFullExport(
  prefs: ExportPreferences,
  segments: Array<{ original: string; translated: string }>,
  srcLang: string,
  tgtLang: string
): { content: string; mimeType: string; extension: string } {
  switch (prefs.format) {
    case 'txt': {
      const sep = prefs.txt.separator;
      const content = segments
        .map((s, i) => {
          let line = s.translated;
          if (prefs.txt.includeOriginal) {
            line = `[${srcLang}] ${s.original}\n[${tgtLang}] ${s.translated}`;
          }
          if (sep === 'numbered') return `${i + 1}. ${line}`;
          if (sep === 'dash') return `— ${line}`;
          return line;
        })
        .join('\n\n');
      return { content, mimeType: 'text/plain;charset=utf-8', extension: 'txt' };
    }

    case 'srt': {
      const fmt = prefs.srt.timestampFormat;
      const content = segments
        .map((s, i) => {
          const start = i * 5;
          const end = start + 4;
          const formatTime = (secs: number) => {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const sec = secs % 60;
            const sep = fmt === 'hh:mm:ss,mmm' ? ',' : '.';
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(sec)).padStart(2, '0')}${sep}000`;
          };
          let block = `${i + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${s.translated}`;
          if (prefs.srt.includeOriginal) {
            block += `\n${s.original}`;
          }
          return block;
        })
        .join('\n\n');
      return { content, mimeType: 'text/srt;charset=utf-8', extension: 'srt' };
    }

    case 'csv': {
      const delim = prefs.csv.delimiter === 'comma' ? ',' : prefs.csv.delimiter === 'tab' ? '\t' : ';';
      const lines: string[] = [];
      if (prefs.csv.includeHeaders) {
        lines.push(`"Original (${srcLang})"${delim}"Translation (${tgtLang})"`);
      }
      segments.forEach((s) => {
        lines.push(`"${s.original}"${delim}"${s.translated}"`);
      });
      const content = lines.join('\n');
      const mimeType = prefs.csv.encoding === 'utf-16' ? 'text/csv;charset=utf-16le' : 'text/csv;charset=utf-8';
      return { content, mimeType, extension: 'csv' };
    }

    case 'pdf': {
      // PDF export generates a simplified text representation (actual PDF generation would need pdf-lib)
      const content = segments
        .map((s, i) => {
          let line = s.translated;
          if (prefs.pdf.includeOriginal) {
            line = `[${srcLang}] ${s.original}\n[${tgtLang}] ${s.translated}`;
          }
          return `--- Segment ${i + 1} ---\n${line}`;
        })
        .join('\n\n');
      return { content, mimeType: 'text/plain;charset=utf-8', extension: 'txt' };
    }

    case 'docx': {
      // DOCX export generates a simplified text representation
      const content = segments
        .map((s, i) => {
          let line = s.translated;
          if (prefs.docx.includeComments) {
            line += `\n[Comment: Original: "${s.original}"]`;
          }
          return `¶${i + 1} ${line}`;
        })
        .join('\n\n');
      return { content, mimeType: 'text/plain;charset=utf-8', extension: 'txt' };
    }

    case 'tmx': {
      const srcCode = prefs.tmx.sourceLang.substring(0, 2).toLowerCase();
      const tgtCode = prefs.tmx.targetLang.substring(0, 2).toLowerCase();
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header creationtool="TamangNetra" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="en" srclang="${srcCode}" o-tmf="unknown"/>
  <body>
${segments
        .map(
          (s, i) =>
            `    <tu tuid="${i + 1}">\n      <tuv xml:lang="${srcCode}">\n        <seg>${s.original}</seg>\n      </tuv>\n      <tuv xml:lang="${tgtCode}">\n        <seg>${s.translated}</seg>\n      </tuv>\n    </tu>`
        )
        .join('\n')}
  </body>
</tmx>`;
      return { content, mimeType: 'application/xml;charset=utf-8', extension: 'tmx' };
    }

    case 'xliff': {
      const srcCode = prefs.tmx.sourceLang.substring(0, 2).toLowerCase();
      const tgtCode = prefs.tmx.targetLang.substring(0, 2).toLowerCase();
      let content: string;
      if (prefs.xliff.version === '2.0') {
        content = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" srcLang="${srcCode}" trgLang="${tgtCode}" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="f1">
    <unit id="u1">
${segments
          .map(
            (s, i) =>
              `      <segment id="${i + 1}">\n        <source>${s.original}</source>\n        <target>${s.translated}</target>\n      </segment>`
          )
          .join('\n')}
    </unit>
  </file>
</xliff>`;
      } else {
        content = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="${srcCode}" target-language="${tgtCode}" datatype="plaintext">
    <body>
${segments
          .map(
            (s, i) =>
              `      <trans-unit id="${i + 1}">${prefs.xliff.includeMetadata ? `\n        <note>Segment ${i + 1} of ${segments.length}</note>` : ''}\n        <source>${s.original}</source>\n        <target>${s.translated}</target>\n      </trans-unit>`
          )
          .join('\n')}
    </body>
  </file>
</xliff>`;
      }
      return { content, mimeType: 'application/xml;charset=utf-8', extension: 'xlf' };
    }

    default:
      return { content: '', mimeType: 'text/plain', extension: 'txt' };
  }
}

// ── Component ──

interface ExportSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportSettingsDialog({ open, onOpenChange }: ExportSettingsDialogProps) {
  const { segments, srcLang, tgtLang } = useTranslationStore();
  const { toast } = useToast();

  // Load preferences from localStorage
  const [prefs, setPrefs] = useState<ExportPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_PREFS;
  });

  // Save preferences on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  // Update a nested preference
  const updatePref = useCallback(
    <K extends keyof ExportPreferences>(
      category: K,
      key: keyof ExportPreferences[K],
      value: ExportPreferences[K][keyof ExportPreferences[K]]
    ) => {
      setPrefs((prev) => ({
        ...prev,
        [category]: {
          ...(prev[category] as Record<string, unknown>),
          [key]: value,
        },
      }));
    },
    []
  );

  // Generate preview
  const preview = useMemo(
    () => generatePreview(prefs, segments, srcLang, tgtLang),
    [prefs, segments, srcLang, tgtLang]
  );

  // Handle export
  const handleExport = useCallback(() => {
    if (segments.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Translate some text first before exporting.',
        variant: 'destructive',
      });
      return;
    }

    const { content, mimeType, extension } = generateFullExport(prefs, segments, srcLang, tgtLang);
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation_${srcLang}_to_${tgtLang}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Translation exported as ${FORMAT_CONFIG[prefs.format].label} (${extension.toUpperCase()}).`,
    });

    onOpenChange(false);
  }, [prefs, segments, srcLang, tgtLang, toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-emerald-600" />
            Export Settings
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="px-6 pb-6 space-y-5">
            {/* Format Tabs */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Export Format
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((fmt) => {
                  const config = FORMAT_CONFIG[fmt];
                  const Icon = config.icon;
                  const isActive = prefs.format === fmt;
                  return (
                    <button
                      key={fmt}
                      onClick={() => setPrefs((prev) => ({ ...prev, format: fmt }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700'
                          : 'bg-background text-muted-foreground border-border/50 hover:border-emerald-200 dark:hover:border-emerald-800'
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                {FORMAT_CONFIG[prefs.format].description}
              </p>
            </div>

            <Separator />

            {/* Format-specific Options */}
            <AnimatePresence mode="wait">
              <motion.div
                key={prefs.format}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-3 min-h-[60px]"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ChevronRight className="size-3 text-emerald-500" />
                  {FORMAT_CONFIG[prefs.format].label} Options
                </p>

                {/* TXT Options */}
                {prefs.format === 'txt' && (
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Include original text</Label>
                      <Switch
                        checked={prefs.txt.includeOriginal}
                        onCheckedChange={(v) => updatePref('txt', 'includeOriginal', v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Separator style</Label>
                      <RadioGroup
                        value={prefs.txt.separator}
                        onValueChange={(v) =>
                          updatePref('txt', 'separator', v as 'newline' | 'dash' | 'numbered')
                        }
                        className="flex gap-3"
                      >
                        {[
                          { value: 'newline', label: 'Newline' },
                          { value: 'dash', label: 'Dash (—)' },
                          { value: 'numbered', label: 'Numbered' },
                        ].map((opt) => (
                          <div key={opt.value} className="flex items-center gap-1.5">
                            <RadioGroupItem value={opt.value} id={`txt-sep-${opt.value}`} className="size-3" />
                            <Label htmlFor={`txt-sep-${opt.value}`} className="text-xs cursor-pointer">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* SRT Options */}
                {prefs.format === 'srt' && (
                  <div className="space-y-3 pl-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Timestamp format</Label>
                      <Select
                        value={prefs.srt.timestampFormat}
                        onValueChange={(v) =>
                          updatePref('srt', 'timestampFormat', v as 'hh:mm:ss,mmm' | 'hh:mm:ss.mmm')
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hh:mm:ss,mmm">hh:mm:ss,mmm (SRT standard)</SelectItem>
                          <SelectItem value="hh:mm:ss.mmm">hh:mm:ss.mmm (Alternative)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Include original subtitle</Label>
                      <Switch
                        checked={prefs.srt.includeOriginal}
                        onCheckedChange={(v) => updatePref('srt', 'includeOriginal', v)}
                      />
                    </div>
                  </div>
                )}

                {/* CSV Options */}
                {prefs.format === 'csv' && (
                  <div className="space-y-3 pl-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Delimiter</Label>
                      <RadioGroup
                        value={prefs.csv.delimiter}
                        onValueChange={(v) =>
                          updatePref('csv', 'delimiter', v as 'comma' | 'tab' | 'semicolon')
                        }
                        className="flex gap-3"
                      >
                        {[
                          { value: 'comma', label: 'Comma (,)' },
                          { value: 'tab', label: 'Tab' },
                          { value: 'semicolon', label: 'Semicolon (;)' },
                        ].map((opt) => (
                          <div key={opt.value} className="flex items-center gap-1.5">
                            <RadioGroupItem value={opt.value} id={`csv-delim-${opt.value}`} className="size-3" />
                            <Label htmlFor={`csv-delim-${opt.value}`} className="text-xs cursor-pointer">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Include headers</Label>
                      <Switch
                        checked={prefs.csv.includeHeaders}
                        onCheckedChange={(v) => updatePref('csv', 'includeHeaders', v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Encoding</Label>
                      <Select
                        value={prefs.csv.encoding}
                        onValueChange={(v) =>
                          updatePref('csv', 'encoding', v as 'utf-8' | 'utf-16')
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utf-8">UTF-8</SelectItem>
                          <SelectItem value="utf-16">UTF-16</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* PDF Options */}
                {prefs.format === 'pdf' && (
                  <div className="space-y-3 pl-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Font Size</Label>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                          {prefs.pdf.fontSize}pt
                        </span>
                      </div>
                      <Slider
                        value={[prefs.pdf.fontSize]}
                        onValueChange={([v]) => updatePref('pdf', 'fontSize', v)}
                        min={8}
                        max={24}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Page Orientation</Label>
                      <RadioGroup
                        value={prefs.pdf.orientation}
                        onValueChange={(v) =>
                          updatePref('pdf', 'orientation', v as 'portrait' | 'landscape')
                        }
                        className="flex gap-3"
                      >
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="portrait" id="pdf-portrait" className="size-3" />
                          <Label htmlFor="pdf-portrait" className="text-xs cursor-pointer">Portrait</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="landscape" id="pdf-landscape" className="size-3" />
                          <Label htmlFor="pdf-landscape" className="text-xs cursor-pointer">Landscape</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Include original text</Label>
                      <Switch
                        checked={prefs.pdf.includeOriginal}
                        onCheckedChange={(v) => updatePref('pdf', 'includeOriginal', v)}
                      />
                    </div>
                  </div>
                )}

                {/* DOCX Options */}
                {prefs.format === 'docx' && (
                  <div className="space-y-3 pl-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Font Size</Label>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                          {prefs.docx.fontSize}pt
                        </span>
                      </div>
                      <Slider
                        value={[prefs.docx.fontSize]}
                        onValueChange={([v]) => updatePref('docx', 'fontSize', v)}
                        min={8}
                        max={24}
                        step={1}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Include comments</Label>
                      <Switch
                        checked={prefs.docx.includeComments}
                        onCheckedChange={(v) => updatePref('docx', 'includeComments', v)}
                      />
                    </div>
                  </div>
                )}

                {/* TMX Options */}
                {prefs.format === 'tmx' && (
                  <div className="space-y-3 pl-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Source Language</Label>
                      <Select
                        value={prefs.tmx.sourceLang}
                        onValueChange={(v) => updatePref('tmx', 'sourceLang', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Target Language</Label>
                      <Select
                        value={prefs.tmx.targetLang}
                        onValueChange={(v) => updatePref('tmx', 'targetLang', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* XLIFF Options */}
                {prefs.format === 'xliff' && (
                  <div className="space-y-3 pl-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">XLIFF Version</Label>
                      <RadioGroup
                        value={prefs.xliff.version}
                        onValueChange={(v) =>
                          updatePref('xliff', 'version', v as '1.2' | '2.0')
                        }
                        className="flex gap-3"
                      >
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="1.2" id="xliff-12" className="size-3" />
                          <Label htmlFor="xliff-12" className="text-xs cursor-pointer">1.2</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="2.0" id="xliff-20" className="size-3" />
                          <Label htmlFor="xliff-20" className="text-xs cursor-pointer">2.0</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Include metadata</Label>
                      <Switch
                        checked={prefs.xliff.includeMetadata}
                        onCheckedChange={(v) => updatePref('xliff', 'includeMetadata', v)}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <Separator />

            {/* Preview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Preview
                </p>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                >
                  {FORMAT_CONFIG[prefs.format].label}
                </Badge>
              </div>
              <div className="rounded-lg border bg-muted/30 dark:bg-muted/10 p-3 max-h-48 overflow-y-auto">
                <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
                  {preview}
                </pre>
              </div>
            </div>

            <Separator />

            {/* Export Button */}
            <Button
              onClick={handleExport}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white gap-2"
              disabled={segments.length === 0}
            >
              <Download className="size-4" />
              Export as {FORMAT_CONFIG[prefs.format].label}
            </Button>

            {segments.length === 0 && (
              <p className="text-[10px] text-center text-muted-foreground/50">
                Translate some text first to enable export
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
