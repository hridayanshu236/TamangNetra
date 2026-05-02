"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Table,
  Loader2,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DocViewerFileType = "docx" | "csv" | "tsv" | "xlsx" | "xls";

interface TranslatedDocViewerProps {
  blob: Blob;
  fileType: DocViewerFileType;
  fileName: string;
  onClose: () => void;
}

// ─── DOCX Viewer (via mammoth) ───────────────────────────────────────────────

function DocxViewer({ blob }: { blob: Blob }) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const render = async () => {
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(result.value);
      } catch (e) {
        setError(`Failed to render document: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    };
    render();
  }, [blob]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-zinc-400">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
          <Loader2 className="size-10 text-emerald-400" />
        </motion.div>
        <p className="text-sm">Rendering document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 text-zinc-400 p-8 text-center">
        <FileText className="size-12 text-red-400/50" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="prose prose-invert prose-sm max-w-none p-8 leading-relaxed"
      style={{
        fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif",
        color: "#e4e4e7",
        lineHeight: 1.9,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── CSV / TSV Viewer ────────────────────────────────────────────────────────

interface TableRow {
  [key: string]: string;
}

function SpreadsheetViewer({ blob, fileType }: { blob: Blob; fileType: DocViewerFileType }) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const parse = async () => {
      try {
        if (fileType === "csv" || fileType === "tsv") {
          const Papa = await import("papaparse");
          const text = await blob.text();
          const result = Papa.default.parse<TableRow>(text, {
            header: true,
            delimiter: fileType === "tsv" ? "\t" : ",",
            skipEmptyLines: true,
          });
          setHeaders(result.meta.fields ?? []);
          setRows(result.data);
        } else if (fileType === "xlsx" || fileType === "xls") {
          const XLSX = await import("xlsx");
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer);
          const firstSheetName = workbook.SheetNames[0];
          if (firstSheetName) {
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet!, { header: 1 });
            if (jsonData.length > 0) {
              const [headerRow, ...dataRows] = jsonData as unknown as any[][];
              setHeaders(headerRow.map(String));
              setRows(dataRows.map(row => {
                const obj: TableRow = {};
                headerRow.forEach((h: any, i: number) => {
                  obj[String(h)] = String(row[i] ?? "");
                });
                return obj;
              }));
            }
          }
        }
      } catch (e) {
        console.error("Spreadsheet parse error", e);
      } finally {
        setLoading(false);
      }
    };
    parse();
  }, [blob, fileType]);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const filtered = rows.filter((row) =>
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(filter.toLowerCase())
    )
  );

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const av = String(a[sortCol] ?? "").toLowerCase();
        const bv = String(b[sortCol] ?? "").toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filtered;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-zinc-400">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
          <Loader2 className="size-10 text-emerald-400" />
        </motion.div>
        <p className="text-sm">Parsing spreadsheet...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-zinc-900/80 backdrop-blur-sm border-b border-white/10 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter rows..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-zinc-800 border border-white/10 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <p className="text-xs text-zinc-600 mt-1">
          {sorted.length} of {rows.length} rows · {headers.length} columns
        </p>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  onClick={() => toggleSort(h)}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-emerald-300 bg-zinc-800/90 border-b border-white/10 cursor-pointer hover:bg-zinc-700/80 whitespace-nowrap select-none"
                >
                  <span className="flex items-center gap-1.5">
                    {h}
                    {sortCol === h ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr
                key={ri}
                className={ri % 2 === 0 ? "bg-zinc-900/50" : "bg-zinc-800/30"}
              >
                {headers.map((h) => (
                  <td
                    key={h}
                    className="px-4 py-2 text-zinc-300 border-b border-white/5 max-w-[300px] truncate"
                    title={String(row[h] ?? "")}
                    style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}
                  >
                    {String(row[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="text-center py-8 text-zinc-600 text-sm">
                  No rows match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Viewer ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  docx: <FileText className="size-4 text-blue-400" />,
  csv: <Table className="size-4 text-emerald-400" />,
  tsv: <Table className="size-4 text-emerald-400" />,
  xlsx: <Table className="size-4 text-emerald-400" />,
  xls: <Table className="size-4 text-emerald-400" />,
};

const TYPE_LABELS: Record<string, string> = {
  docx: "DOCX Document",
  csv: "CSV Spreadsheet",
  tsv: "TSV Spreadsheet",
  xlsx: "Excel Spreadsheet",
  xls: "Excel Spreadsheet",
};

export function TranslatedDocViewer({
  blob,
  fileType,
  fileName,
  onClose,
}: TranslatedDocViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const isCsv = fileType === "csv" || fileType === "tsv" || fileType === "xlsx" || fileType === "xls";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/97 backdrop-blur-md"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-zinc-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            {TYPE_ICONS[fileType] ?? <FileText className="size-4 text-zinc-400" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white truncate max-w-[500px]">{fileName}</p>
            <p className="text-xs text-zinc-500">{TYPE_LABELS[fileType] ?? fileType.toUpperCase()} — Translated</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={fileType}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {fileType === "docx" ? (
              <DocxViewer blob={blob} />
            ) : isCsv ? (
              <SpreadsheetViewer
                blob={blob}
                fileType={fileType}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-500">
                <FileText className="size-10" />
                <p className="text-sm">Preview not available for this file type.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
