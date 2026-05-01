/**
 * File Processing API — Upload, Parse, PII Detection, Translate
 *
 * Handles file upload via FormData, detects file type, parses content,
 * applies PII detection (split-around approach), splits sentences,
 * translates using the TMT API, and returns structured results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { parsePDF, parsePDFPlainText } from '@/src/lib/file-parsers/pdf';
import { parseDOCX, parseDOCXPlainText } from '@/src/lib/file-parsers/docx';
import { parseCSV, parseTSV, detectCSVType } from '@/src/lib/file-parsers/csv';
import type { ParsedDocument, ParsedTable } from '@/src/lib/file-parsers/index';
import { splitSentences } from '@/src/lib/sentence-splitter';
import { detectPII, reconstructFromFragments } from '@/src/lib/pii-detector';
import type { PIIFragment } from '@/src/lib/pii-detector';
import { acquire } from '@/src/lib/rate-limiter';

// TMT API Configuration (same as translate route)
const TMT_API_URL = 'https://tmt.ilprl.ku.edu.np/lang-translate';
const TMT_API_AUTH = 'Bearer team_ef9410e6b6xxxxxx';

const LANGUAGE_ALIASES: Record<string, string> = {
  'english': 'English', 'en': 'English', 'eng': 'English',
  'nepali': 'Nepali', 'ne': 'Nepali', 'nep': 'Nepali',
  'tamang': 'Tamang', 'tmg': 'Tamang',
};

function normalizeLanguage(lang: string): string | null {
  return LANGUAGE_ALIASES[lang.toLowerCase().trim()] || null;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// Supported file extensions
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx', 'csv', 'tsv']);

interface ProcessFileResponse {
  original: string;
  translated: string;
  segments: Array<{ original: string; translated: string }>;
  knowledgeEntries: Array<{ source: string; translation: string; frequency: number }>;
  fileInfo: {
    name: string;
    type: string;
    size: number;
  };
}

/**
 * Translate a single sentence using the TMT API with rate limiting.
 */
async function translateSentence(
  text: string,
  srcLang: string,
  tgtLang: string
): Promise<string> {
  const normalizedSrc = normalizeLanguage(srcLang);
  const normalizedTgt = normalizeLanguage(tgtLang);

  if (!normalizedSrc) throw new Error(`Unsupported source language: ${srcLang}`);
  if (!normalizedTgt) throw new Error(`Unsupported target language: ${tgtLang}`);

  await acquire();

  const response = await fetch(TMT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': TMT_API_AUTH,
    },
    body: JSON.stringify({
      text,
      src_lang: normalizedSrc,
      tgt_lang: normalizedTgt,
    }),
  });

  if (!response.ok) {
    throw new Error(`TMT API returned HTTP ${response.status}`);
  }

  const data = await response.json() as {
    message_type: string;
    output: string;
  };

  if (data.message_type === 'FAIL') {
    throw new Error('TMT API translation failed');
  }

  return data.output || text;
}

/**
 * Detect file type from filename extension.
 */
function detectFileType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && SUPPORTED_EXTENSIONS.has(ext)) return ext;
  return null;
}

/**
 * Extract text segments from a parsed PDF document.
 */
function extractTextFromPDF(doc: ParsedDocument): string[] {
  const segments: string[] = [];
  if (doc.pages) {
    for (const page of doc.pages) {
      for (const block of page.blocks) {
        if (block.type === 'text' && block.content.trim()) {
          segments.push(block.content.trim());
        }
      }
    }
  }
  return segments;
}

/**
 * Extract text segments from a parsed DOCX document.
 */
function extractTextFromDOCX(doc: ParsedDocument): string[] {
  const segments: string[] = [];
  if (doc.pages) {
    for (const page of doc.pages) {
      for (const block of page.blocks) {
        if (block.type === 'text' && block.content.trim()) {
          segments.push(block.content.trim());
        }
        // Handle table children
        if (block.type === 'table' && block.children) {
          for (const row of block.children) {
            if (row.content && row.content.trim()) {
              segments.push(row.content.trim());
            }
          }
        }
      }
    }
  }
  return segments;
}

/**
 * Extract translatable text cells from a parsed CSV/TSV table.
 */
function extractTextFromTable(table: ParsedTable): { segments: string[]; cellMap: Map<string, string> } {
  const segments: string[] = [];
  const cellMap = new Map<string, string>(); // original value -> cell reference

  // Header cells that are text
  for (const header of table.headers) {
    if (header.isText && header.value.trim()) {
      segments.push(header.value.trim());
      cellMap.set(header.value.trim(), 'header');
    }
  }

  // Data cells that are text
  for (const row of table.rows) {
    for (const cell of row) {
      if (cell.isText && cell.value.trim()) {
        segments.push(cell.value.trim());
        cellMap.set(cell.value.trim(), 'data');
      }
    }
  }

  return { segments, cellMap };
}

/**
 * Parse a PDF file with fallback for server-side issues.
 */
async function parsePDFWithFallback(buffer: Buffer): Promise<{ segments: string[]; fullText: string }> {
  try {
    // Try using the existing parser first
    const doc = await parsePDF(buffer);
    const segments = extractTextFromPDF(doc);
    const fullText = segments.join('\n\n');

    if (segments.length > 0) {
      return { segments, fullText };
    }
  } catch (error) {
    console.warn('Primary PDF parser failed, trying fallback:', error instanceof Error ? error.message : 'Unknown error');
  }

  try {
    // Fallback: try plain text extraction
    const fullText = await parsePDFPlainText(buffer);
    if (fullText.trim()) {
      const segments = fullText.split('\n\n').filter(s => s.trim().length > 0);
      return { segments, fullText };
    }
  } catch (error) {
    console.warn('PDF plain text fallback failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Last resort: basic text extraction from buffer
  try {
    const text = extractBasicTextFromPDFBuffer(buffer);
    if (text.trim()) {
      const segments = text.split('\n').filter(s => s.trim().length > 0);
      return { segments, fullText: text };
    }
  } catch (error) {
    console.warn('PDF basic text extraction failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  return { segments: [], fullText: '' };
}

/**
 * Basic text extraction from PDF buffer - finds text streams.
 * This is a last-resort fallback when pdfjs-dist fails.
 */
function extractBasicTextFromPDFBuffer(buffer: Buffer): string {
  const text = buffer.toString('latin1');
  const texts: string[] = [];

  // Look for text objects in PDF stream: BT ... ET blocks
  const btEtPattern = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  btEtPattern.lastIndex = 0;

  while ((match = btEtPattern.exec(text)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    tjPattern.lastIndex = 0;

    while ((tjMatch = tjPattern.exec(block)) !== null) {
      const decoded = tjMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (decoded.trim()) {
        texts.push(decoded);
      }
    }

    // Handle array text (TJ operator)
    const tjArrayPattern = /\[(.*?)\]\s*TJ/g;
    let arrMatch: RegExpExecArray | null;
    tjArrayPattern.lastIndex = 0;

    while ((arrMatch = tjArrayPattern.exec(block)) !== null) {
      const arrContent = arrMatch[1];
      const strParts = arrContent.match(/\(([^)]*)\)/g);
      if (strParts) {
        const combined = strParts
          .map(s => s.slice(1, -1))
          .join('');
        if (combined.trim()) {
          texts.push(combined);
        }
      }
    }
  }

  return texts.join(' ');
}

/**
 * Apply PII detection and translate with split-around approach.
 * Returns both the translated text and the individual segment translations.
 */
async function translateWithPIIProtection(
  text: string,
  srcLang: string,
  tgtLang: string,
  piiEnabled: boolean
): Promise<{ translatedText: string; segmentTranslation: string }> {
  if (!text.trim()) {
    return { translatedText: '', segmentTranslation: '' };
  }

  if (piiEnabled) {
    // Split around PII
    const fragments = detectPII(text);
    const textFragments = fragments.filter(f => f.type === 'text' && f.value.trim());

    if (textFragments.length === 0) {
      // All PII - nothing to translate
      return { translatedText: text, segmentTranslation: text };
    }

    // Translate only text fragments
    const translationMap = new Map<string, string>();
    for (const fragment of textFragments) {
      try {
        const translated = await translateSentence(fragment.value, srcLang, tgtLang);
        translationMap.set(fragment.value, translated);
      } catch {
        translationMap.set(fragment.value, fragment.value);
      }
    }

    // Reconstruct with PII preserved
    const fullTranslated = reconstructFromFragments(fragments, translationMap);
    const segmentTranslation = textFragments
      .map(f => translationMap.get(f.value) || f.value)
      .join(' ');

    return { translatedText: fullTranslated, segmentTranslation };
  } else {
    // No PII protection - translate directly
    try {
      const translated = await translateSentence(text, srcLang, tgtLang);
      return { translatedText: translated, segmentTranslation: translated };
    } catch {
      return { translatedText: text, segmentTranslation: text };
    }
  }
}

/**
 * Split text into sentences and translate them in batches.
 */
async function translateSegments(
  textSegments: string[],
  srcLang: string,
  tgtLang: string,
  piiEnabled: boolean
): Promise<Array<{ original: string; translated: string }>> {
  // First, split each text segment into sentences
  const allSentences: string[] = [];
  for (const segment of textSegments) {
    const split = splitSentences(segment);
    for (const s of split) {
      if (s.sentence.trim()) {
        allSentences.push(s.sentence.trim());
      }
    }
  }

  if (allSentences.length === 0) {
    return [];
  }

  const results: Array<{ original: string; translated: string }> = [];

  // Translate each sentence with PII protection
  for (const sentence of allSentences) {
    try {
      const { translatedText } = await translateWithPIIProtection(
        sentence,
        srcLang,
        tgtLang,
        piiEnabled
      );
      results.push({
        original: sentence,
        translated: translatedText || sentence,
      });
    } catch (error) {
      console.error(`Failed to translate: "${sentence.substring(0, 50)}..."`, error);
      results.push({
        original: sentence,
        translated: sentence, // Fallback to original
      });
    }
  }

  return results;
}

/**
 * Build knowledge entries from translation segments.
 */
function buildKnowledgeEntries(
  segments: Array<{ original: string; translated: string }>,
  langPair: string
): Array<{ source: string; translation: string; frequency: number }> {
  const termMap = new Map<string, { translation: string; frequency: number }>();

  for (const seg of segments) {
    const key = seg.original.trim().toLowerCase();
    const existing = termMap.get(key);
    if (existing) {
      existing.frequency += 1;
    } else {
      termMap.set(key, {
        translation: seg.translated.trim(),
        frequency: 1,
      });
    }
  }

  return Array.from(termMap.entries()).map(([source, data]) => ({
    source,
    translation: data.translation,
    frequency: data.frequency,
  }));
}

/**
 * POST /api/process-file
 *
 * Accepts multipart/form-data with:
 * - file: File (required)
 * - src_lang: string (required)
 * - tgt_lang: string (required)
 * - pii_enabled: string "true"/"false" (optional, default "true")
 * - knowledge_graph_enabled: string "true"/"false" (optional, default "true")
 */
export async function POST(request: NextRequest) {
  try {
    // Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid multipart form data' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const srcLang = formData.get('src_lang') as string | null;
    const tgtLang = formData.get('tgt_lang') as string | null;
    const piiEnabledStr = formData.get('pii_enabled') as string | null;
    const knowledgeGraphEnabledStr = formData.get('knowledge_graph_enabled') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!srcLang || !tgtLang) {
      return NextResponse.json(
        { error: 'src_lang and tgt_lang are required' },
        { status: 400 }
      );
    }

    if (srcLang === tgtLang) {
      return NextResponse.json(
        { error: 'src_lang and tgt_lang must be different' },
        { status: 400 }
      );
    }

    // Validate language support
    if (!normalizeLanguage(srcLang)) {
      return NextResponse.json(
        { error: `Unsupported source language: ${srcLang}` },
        { status: 400 }
      );
    }

    if (!normalizeLanguage(tgtLang)) {
      return NextResponse.json(
        { error: `Unsupported target language: ${tgtLang}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 1MB limit' },
        { status: 400 }
      );
    }

    const piiEnabled = piiEnabledStr !== 'false';
    const knowledgeGraphEnabled = knowledgeGraphEnabledStr !== 'false';

    // Detect file type
    const fileType = detectFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${Array.from(SUPPORTED_EXTENSIONS).join(', ')}` },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the file and extract text segments
    let textSegments: string[] = [];
    let fullOriginalText = '';

    switch (fileType) {
      case 'pdf': {
        const result = await parsePDFWithFallback(buffer);
        textSegments = result.segments;
        fullOriginalText = result.fullText;
        break;
      }

      case 'docx': {
        try {
          const doc = await parseDOCX(buffer);
          textSegments = extractTextFromDOCX(doc);
          fullOriginalText = textSegments.join('\n\n');
        } catch {
          // Fallback to plain text
          try {
            fullOriginalText = await parseDOCXPlainText(buffer);
            textSegments = fullOriginalText.split('\n\n').filter(s => s.trim());
          } catch {
            return NextResponse.json(
              { error: 'Failed to parse DOCX file' },
              { status: 500 }
            );
          }
        }
        break;
      }

      case 'csv': {
        const content = buffer.toString('utf-8');
        try {
          const table = parseCSV(content);
          const result = extractTextFromTable(table);
          textSegments = result.segments;
          fullOriginalText = textSegments.join('\n');
        } catch {
          return NextResponse.json(
            { error: 'Failed to parse CSV file' },
            { status: 500 }
          );
        }
        break;
      }

      case 'tsv': {
        const content = buffer.toString('utf-8');
        try {
          const table = parseTSV(content);
          const result = extractTextFromTable(table);
          textSegments = result.segments;
          fullOriginalText = textSegments.join('\n');
        } catch {
          // Try auto-detect
          try {
            const type = detectCSVType(content);
            const table = type === 'tsv' ? parseTSV(content) : parseCSV(content);
            const result = extractTextFromTable(table);
            textSegments = result.segments;
            fullOriginalText = textSegments.join('\n');
          } catch {
            return NextResponse.json(
              { error: 'Failed to parse TSV file' },
              { status: 500 }
            );
          }
        }
        break;
      }
    }

    if (textSegments.length === 0) {
      return NextResponse.json(
        { error: 'No translatable text found in the file' },
        { status: 400 }
      );
    }

    // Translate segments
    const segments = await translateSegments(
      textSegments,
      srcLang,
      tgtLang,
      piiEnabled
    );

    // Build full translated text
    const fullTranslatedText = segments.map(s => s.translated).join(' ');

    // Build knowledge entries
    const langPair = `${srcLang}-${tgtLang}`;
    const knowledgeEntries = knowledgeGraphEnabled
      ? buildKnowledgeEntries(segments, langPair)
      : [];

    const response: ProcessFileResponse = {
      original: fullOriginalText,
      translated: fullTranslatedText,
      segments,
      knowledgeEntries,
      fileInfo: {
        name: file.name,
        type: fileType,
        size: file.size,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('File processing error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'File processing failed', details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/process-file — Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'File Processing API',
    supportedTypes: Array.from(SUPPORTED_EXTENSIONS),
    maxFileSize: '1MB',
  });
}
