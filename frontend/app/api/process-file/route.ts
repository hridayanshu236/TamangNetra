/**
 * File Processing API — Proxy to Backend Document Processor
 *
 * Forwards the uploaded file to the backend's `/document/process` endpoint
 * which now handles OCR, PDF parsing, CSV/Excel parsing, DOCX parsing,
 * and translation.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow 5 minutes just in case

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const LANGUAGE_ALIASES: Record<string, string> = {
  'english': 'English', 'en': 'English', 'eng': 'English',
  'nepali': 'Nepali', 'ne': 'Nepali', 'nep': 'Nepali',
  'tamang': 'Tamang', 'tmg': 'Tamang',
};

function normalizeLanguage(lang: string): string | null {
  return LANGUAGE_ALIASES[lang.toLowerCase().trim()] || null;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB to comply with hackathon rules

// Supported file extensions
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx', 'csv', 'tsv', 'xlsx', 'xls', 'png', 'jpg', 'jpeg']);

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
 * Detect file type from filename extension.
 */
function detectFileType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && SUPPORTED_EXTENSIONS.has(ext)) return ext;
  return null;
}

/**
 * Build knowledge entries from translation segments.
 */
function buildKnowledgeEntries(
  segments: Array<{ original: string; translated: string }>
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
    let srcLang = formData.get('src_lang') as string | null;
    let tgtLang = formData.get('tgt_lang') as string | null;
    const knowledgeGraphEnabledStr = formData.get('knowledge_graph_enabled') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!srcLang || !tgtLang) {
      return NextResponse.json({ error: 'src_lang and tgt_lang are required' }, { status: 400 });
    }

    srcLang = normalizeLanguage(srcLang);
    tgtLang = normalizeLanguage(tgtLang);

    if (!srcLang || !tgtLang) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    if (srcLang === tgtLang) {
      return NextResponse.json({ error: 'src_lang and tgt_lang must be different' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds limit' }, { status: 400 });
    }

    const fileType = detectFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${Array.from(SUPPORTED_EXTENSIONS).join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare FormData for the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    backendFormData.append('src_lang', srcLang);
    backendFormData.append('tgt_lang', tgtLang);

    // Call the new backend endpoint which now streams NDJSON
    const backendResponse = await fetch(`${BACKEND_API_URL}/document/process`, {
      method: 'POST',
      body: backendFormData as any, // Cast needed for Next.js fetch with FormData
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      let errorMsg = 'Backend document processing failed';
      try {
          const errObj = JSON.parse(errorText);
          if (errObj.detail) errorMsg = errObj.detail;
      } catch (e) {}
      
      console.error('Backend document processing error:', errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: backendResponse.status }
      );
    }

    // Stream the NDJSON response directly to the client with headers that disable buffering
    return new NextResponse(backendResponse.body, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disables buffering in Nginx if applicable
      },
    });
  } catch (error) {
    console.error('File processing error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { type: 'error', message: 'File processing failed', details: message },
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
    service: 'File Processing API Proxy',
    supportedTypes: Array.from(SUPPORTED_EXTENSIONS),
    maxFileSize: '10MB',
  });
}
