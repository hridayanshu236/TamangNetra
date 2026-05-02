/**
 * File Download / Reconstruction API
 *
 * Takes translated segments and reconstructs them into the original file format.
 * Supports CSV, TSV, DOCX, PDF, and SRT output.
 */

import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx';

interface DownloadRequest {
  originalContent?: string; // base64 encoded original file
  translatedSegments: Array<{ original: string; translated: string }>;
  fileType: 'pdf' | 'docx' | 'csv' | 'tsv' | 'srt' | 'txt';
  fileName: string;
  srcLang: string;
  tgtLang: string;
}

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  srt: 'text/srt',
  txt: 'text/plain',
};

/**
 * Reconstruct a CSV file with translated text cells.
 * Parses the original CSV, replaces text cells with translations,
 * keeps formulas and numbers intact.
 */
function reconstructCSV(
  originalContent: string,
  translatedSegments: Array<{ original: string; translated: string }>,
  delimiter: string
): string {
  // Build translation lookup
  const translationMap = new Map<string, string>();
  for (const seg of translatedSegments) {
    translationMap.set(seg.original.trim(), seg.translated);
  }

  // Parse original CSV
  const parseResult = Papa.parse(originalContent, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    delimiter: delimiter === '\t' ? '\t' : undefined,
  });

  const rows = parseResult.data as string[][];

  // Check if a value is formula, numeric, or date (should not be translated)
  function isNonTranslatable(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.startsWith('=')) return true;
    if (/^-?\d+(\.\d+)?$/.test(trimmed.replace(/,/g, ''))) return true;
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) return true;
    return false;
  }

  // Replace translatable cells with translations
  const translatedRows = rows.map((row) =>
    row.map((cell) => {
      if (isNonTranslatable(cell)) return cell;
      const trimmed = cell.trim();
      const translated = translationMap.get(trimmed);
      return translated ?? cell;
    })
  );

  return Papa.unparse(translatedRows, {
    delimiter: delimiter === '\t' ? '\t' : ',',
    header: false,
  });
}

/**
 * Reconstruct a DOCX file with translated paragraphs.
 * Creates a new document with translated text, applying basic formatting.
 */
async function reconstructDOCX(
  translatedSegments: Array<{ original: string; translated: string }>,
  srcLang: string,
  tgtLang: string
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Add title
  children.push(
    new Paragraph({
      text: `Translated Document: ${srcLang} → ${tgtLang}`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  );

  // Add each translated segment as a paragraph
  for (const seg of translatedSegments) {
    // Split by newlines to handle multi-line segments
    const lines = seg.translated.split('\n').filter((l) => l.trim().length > 0);
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt
              font: 'Calibri',
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }

  // Add separator and original text
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '--- Original Text ---',
          bold: true,
          size: 24,
          color: '888888',
        }),
      ],
      spacing: { before: 400, after: 200 },
    })
  );

  for (const seg of translatedSegments) {
    const lines = seg.original.split('\n').filter((l) => l.trim().length > 0);
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24,
              font: 'Calibri',
              color: '888888',
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

/**
 * Reconstruct a PDF file with translated text using pdf-lib.
 * Creates a text-based PDF with the translated text laid out on pages.
 */
async function reconstructPDF(
  translatedSegments: Array<{ original: string; translated: string }>,
  srcLang: string,
  tgtLang: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Fetch a font that supports the required characters.
  // Use Noto Sans Devanagari for Nepali and Tamang, and a general Noto Sans for others.
  const isDevanagari = tgtLang.toLowerCase() === 'nepali' || tgtLang.toLowerCase() === 'ne' || tgtLang.toLowerCase() === 'tamang' || tgtLang.toLowerCase() === 'tam';

  let fontUrl: string;
  if (isDevanagari) {
    // Noto Sans Devanagari for Nepali and Tamang
    fontUrl = 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf';
  } else {
    // Generic fallback for other languages
    fontUrl = 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
  }

  try {
    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) {
      throw new Error(`Failed to fetch font: ${fontResponse.statusText}`);
    }
    const fontBytes = await fontResponse.arrayBuffer();
    const customFont = await pdfDoc.embedFont(fontBytes);

    const PAGE_WIDTH = 595.28; // A4 width in points
    const PAGE_HEIGHT = 841.89; // A4 height in points
    const MARGIN = 50;
    const LINE_HEIGHT = 16;
    const FONT_SIZE = 11;
    const MAX_CHARS_PER_LINE = Math.floor((PAGE_WIDTH - 2 * MARGIN) / (FONT_SIZE * 0.6));

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // Title
    const title = `Translated: ${srcLang} to ${tgtLang}`;
    page.drawText(title, {
      x: MARGIN,
      y,
      size: 16,
      font: customFont,
      color: rgb(0.1, 0.5, 0.4),
    });
    y -= 30;

    // Helper: wrap text to fit page width
    function wrapText(text: string): string[] {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length > MAX_CHARS_PER_LINE) {
          if (currentLine) lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine += ' ' + word;
        }
      }
      if (currentLine.trim()) lines.push(currentLine.trim());
      return lines;
    }

    // Draw translated segments
    for (const seg of translatedSegments) {
      const lines = wrapText(seg.translated);

      for (const line of lines) {
        if (y < MARGIN + LINE_HEIGHT) {
          // New page
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }

        try {
          page.drawText(line, {
            x: MARGIN,
            y,
            size: FONT_SIZE,
            font: customFont,
            color: rgb(0.2, 0.2, 0.2),
          });
        } catch {
          // If character encoding fails, skip the line
        }
        y -= LINE_HEIGHT;
      }

      y -= LINE_HEIGHT / 2; // Extra spacing between segments
    }

    // Separator page with original text
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;

    page.drawText('--- Original Text ---', {
      x: MARGIN,
      y,
      size: 14,
      font: customFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 30;

    // Original text
    for (const seg of translatedSegments) {
      const lines = wrapText(seg.original);

      for (const line of lines) {
        if (y < MARGIN + LINE_HEIGHT) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }

        try {
          page.drawText(line, {
            x: MARGIN,
            y,
            size: FONT_SIZE,
            font: customFont,
            color: rgb(0.5, 0.5, 0.5),
          });
        } catch {
          // If character encoding fails, skip the line
        }
        y -= LINE_HEIGHT;
      }

      y -= LINE_HEIGHT / 2;
    }

    return pdfDoc.save();
  } catch (fontError) {
    console.error('Font loading or embedding failed:', fontError);
    // Fallback to a simple text file if font loading fails
    throw new Error('Failed to load or embed the required font for PDF generation.');
  }
}

/**
 * Reconstruct SRT subtitle file with translations.
 */
function reconstructSRT(
  translatedSegments: Array<{ original: string; translated: string }>
): string {
  const lines: string[] = [];

  for (let i = 0; i < translatedSegments.length; i++) {
    const seg = translatedSegments[i];
    // Parse original for timestamp info if available (SRT format: index, timestamp, text)
    const originalLines = seg.original.split('\n');

    if (originalLines.length >= 3) {
      // Likely SRT format: index, timestamp, text
      const index = originalLines[0].trim();
      const timestamp = originalLines[1].trim();
      lines.push(index);
      lines.push(timestamp);
      lines.push(seg.translated);
      lines.push('');
    } else {
      // Simple text, create SRT entries with estimated timing
      const startSeconds = i * 5;
      const endSeconds = startSeconds + 4;
      const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(sec)).padStart(2, '0')},000`;
      };
      lines.push(String(i + 1));
      lines.push(`${formatTime(startSeconds)} --> ${formatTime(endSeconds)}`);
      lines.push(seg.translated);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * POST /api/download
 *
 * Request body:
 * {
 *   originalContent?: string (base64),
 *   translatedSegments: Array<{ original: string, translated: string }>,
 *   fileType: string,
 *   fileName: string,
 *   srcLang: string,
 *   tgtLang: string
 * }
 *
 * Response: Binary file download with appropriate Content-Type and Content-Disposition headers.
 */
export async function POST(request: NextRequest) {
  try {
    let body: DownloadRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { translatedSegments, fileType, fileName, srcLang, tgtLang } = body;

    if (!translatedSegments || !Array.isArray(translatedSegments) || translatedSegments.length === 0) {
      return NextResponse.json(
        { error: 'translatedSegments is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!fileType) {
      return NextResponse.json(
        { error: 'fileType is required' },
        { status: 400 }
      );
    }

    // Determine output filename
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'document';
    const outputFileName = `translated_${baseName}.${fileType}`;

    let fileBuffer: Buffer | Uint8Array;
    let contentType = MIME_TYPES[fileType] || 'application/octet-stream';

    switch (fileType) {
      case 'csv': {
        // Decode original content or use segments to build CSV
        let originalText = '';
        if (body.originalContent) {
          originalText = Buffer.from(body.originalContent, 'base64').toString('utf-8');
        } else {
          originalText = translatedSegments.map((s) => s.original).join('\n');
        }
        const csvContent = reconstructCSV(originalText, translatedSegments, ',');
        fileBuffer = Buffer.from(csvContent, 'utf-8');
        break;
      }

      case 'tsv': {
        let originalText = '';
        if (body.originalContent) {
          originalText = Buffer.from(body.originalContent, 'base64').toString('utf-8');
        } else {
          originalText = translatedSegments.map((s) => s.original).join('\n');
        }
        const tsvContent = reconstructCSV(originalText, translatedSegments, '\t');
        fileBuffer = Buffer.from(tsvContent, 'utf-8');
        break;
      }

      case 'docx': {
        fileBuffer = await reconstructDOCX(translatedSegments, srcLang, tgtLang);
        break;
      }

      case 'pdf': {
        const pdfBytes = await reconstructPDF(translatedSegments, srcLang, tgtLang);
        fileBuffer = pdfBytes;
        break;
      }

      case 'srt': {
        const srtContent = reconstructSRT(translatedSegments);
        fileBuffer = Buffer.from(srtContent, 'utf-8');
        break;
      }

      case 'txt':
      default: {
        // Plain text: show both original and translated
        const txtLines: string[] = [];
        txtLines.push(`=== TRANSLATION: ${srcLang} → ${tgtLang} ===\n`);

        // Full translated text
        txtLines.push('--- Translated Text ---');
        txtLines.push(translatedSegments.map((s) => s.translated).join('\n\n'));
        txtLines.push('');
        txtLines.push('--- Original Text ---');
        txtLines.push(translatedSegments.map((s) => s.original).join('\n\n'));

        const txtContent = txtLines.join('\n');
        fileBuffer = Buffer.from(txtContent, 'utf-8');
        contentType = 'text/plain';
        break;
      }
    }

    // Return the file as a binary download
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Download API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'File reconstruction failed', details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/download — Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'File Download / Reconstruction API',
    supportedTypes: ['pdf', 'docx', 'csv', 'tsv', 'srt', 'txt'],
  });
}
