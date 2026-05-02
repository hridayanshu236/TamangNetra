/**
 * Bilingual Document Export API
 *
 * Generates bilingual (side-by-side) documents where original and translated
 * text appear side by side. Supports PDF, DOCX, and HTML formats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';

interface BilingualExportRequest {
  original: string;
  translated: string;
  segments: Array<{ original: string; translated: string }>;
  src_lang: string;
  tgt_lang: string;
  format: 'pdf' | 'docx' | 'html';
  title?: string;
  include_timestamp?: boolean;
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

async function generatePDF(data: BilingualExportRequest): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = PageSizes.A4[0]; // 595.28
  const PAGE_HEIGHT = PageSizes.A4[1]; // 841.89
  const MARGIN = 45;
  const HEADER_HEIGHT = 40;
  const FOOTER_HEIGHT = 25;
  const COLUMN_GAP = 15;
  const USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN;
  const COLUMN_WIDTH = (USABLE_WIDTH - COLUMN_GAP) / 2;
  const LINE_HEIGHT = 13;
  const FONT_SIZE = 9;
  const SEGMENT_SPACING = 10;

  const segments = data.segments && data.segments.length > 0
    ? data.segments
    : [{ original: data.original, translated: data.translated }];

  const docTitle = data.title || `Bilingual Document`;
  const timestamp = data.include_timestamp
    ? new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const langPair = `${data.src_lang} → ${data.tgt_lang}`;

  // Helper: wrap text to fit within a given width
  function wrapText(text: string, maxWidth: number): string[] {
    if (!text.trim()) return [''];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      try {
        const width = font.widthOfTextAtSize(testLine, FONT_SIZE);
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      } catch {
        // Character not in Helvetica — approximate
        if (currentLine.length + word.length + 1 > Math.floor(maxWidth / (FONT_SIZE * 0.5))) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  }

  // Helper: safe draw text (fallback for non-Latin characters)
  function safeDrawText(
    page: ReturnType<PDFDocument['addPage']>,
    text: string,
    x: number,
    y: number,
    options: { size?: number; font?: typeof font; color?: { type: 'RGB'; red: number; green: number; blue: number } }
  ) {
    const drawFont = options.font || font;
    const drawSize = options.size || FONT_SIZE;
    const drawColor = options.color || rgb(0.15, 0.15, 0.15);
    try {
      page.drawText(text, { x, y, size: drawSize, font: drawFont, color: drawColor });
    } catch {
      // Transliterate fallback: replace non-Latin chars with '?'
      const fallback = text.replace(/[^\x00-\x7F]/g, '?');
      try {
        page.drawText(fallback || '[non-Latin text]', { x, y, size: drawSize, font: drawFont, color: rgb(0.5, 0.5, 0.5) });
      } catch {
        // absolute fallback
        page.drawText('[text could not be rendered]', { x, y, size: drawSize, font: drawFont, color: rgb(0.6, 0.6, 0.6) });
      }
    }
  }

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT;
  let pageNum = 1;

  // Draw header
  function drawHeader(p: ReturnType<PDFDocument['addPage']>) {
    // Header background
    p.drawRectangle({
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - 28,
      width: USABLE_WIDTH,
      height: 28,
      color: rgb(0.06, 0.55, 0.44), // emerald-700
    });

    // Title
    safeDrawText(p, docTitle, MARGIN + 8, PAGE_HEIGHT - MARGIN - 20, {
      size: 11, font: fontBold, color: rgb(1, 1, 1),
    });

    // Language pair
    safeDrawText(p, langPair, MARGIN + USABLE_WIDTH - 140, PAGE_HEIGHT - MARGIN - 20, {
      size: 9, font: fontBold, color: rgb(0.9, 0.95, 0.9),
    });

    // Timestamp
    if (timestamp) {
      safeDrawText(p, timestamp, MARGIN + 8, PAGE_HEIGHT - MARGIN - 38, {
        size: 7, color: rgb(0.45, 0.45, 0.45),
      });
    }
  }

  // Draw footer with page number
  function drawFooter(p: ReturnType<PDFDocument['addPage']>, num: number) {
    safeDrawText(p, `Page ${num}`, PAGE_WIDTH / 2 - 20, MARGIN - 15, {
      size: 8, color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Draw column headers
  function drawColumnHeaders(p: ReturnType<PDFDocument['addPage']>, yPos: number) {
    // Column header backgrounds
    p.drawRectangle({
      x: MARGIN,
      y: yPos - 2,
      width: COLUMN_WIDTH,
      height: 16,
      color: rgb(0.94, 0.97, 0.96),
    });
    p.drawRectangle({
      x: MARGIN + COLUMN_WIDTH + COLUMN_GAP,
      y: yPos - 2,
      width: COLUMN_WIDTH,
      height: 16,
      color: rgb(0.94, 0.97, 0.96),
    });

    // Column header text
    safeDrawText(p, data.src_lang, MARGIN + 6, yPos + 2, {
      size: 8, font: fontBold, color: rgb(0.06, 0.55, 0.44),
    });
    safeDrawText(p, data.tgt_lang, MARGIN + COLUMN_WIDTH + COLUMN_GAP + 6, yPos + 2, {
      size: 8, font: fontBold, color: rgb(0.06, 0.55, 0.44),
    });

    return yPos - 22;
  }

  // Draw center divider
  function drawDivider(p: ReturnType<PDFDocument['addPage']>, topY: number, bottomY: number) {
    const midX = MARGIN + COLUMN_WIDTH + COLUMN_GAP / 2;
    p.drawLine({
      start: { x: midX, y: topY },
      end: { x: midX, y: bottomY },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  drawHeader(page);

  // Column headers on first page
  y = drawColumnHeaders(page, y);
  const contentTop = y + 4;

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];

    const leftLines = wrapText(seg.original, COLUMN_WIDTH - 12);
    const rightLines = wrapText(seg.translated, COLUMN_WIDTH - 12);
    const maxLines = Math.max(leftLines.length, rightLines.length);
    const segmentHeight = maxLines * LINE_HEIGHT + SEGMENT_SPACING;

    // Check if we need a new page
    if (y - segmentHeight < MARGIN + FOOTER_HEIGHT) {
      drawDivider(page, contentTop, y);
      drawFooter(page, pageNum);

      // New page
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageNum++;
      drawHeader(page);
      y = drawColumnHeaders(page, PAGE_HEIGHT - MARGIN - HEADER_HEIGHT - 10);
    }

    // Segment number
    safeDrawText(page, `${si + 1}.`, MARGIN + 2, y, {
      size: 7, color: rgb(0.5, 0.5, 0.5),
    });
    safeDrawText(page, `${si + 1}.`, MARGIN + COLUMN_WIDTH + COLUMN_GAP + 2, y, {
      size: 7, color: rgb(0.5, 0.5, 0.5),
    });

    // Draw left column (original)
    for (let li = 0; li < leftLines.length; li++) {
      const lineY = y - li * LINE_HEIGHT;
      if (lineY > MARGIN + FOOTER_HEIGHT) {
        safeDrawText(page, leftLines[li], MARGIN + 14, lineY, {
          size: FONT_SIZE, color: rgb(0.15, 0.15, 0.15),
        });
      }
    }

    // Draw right column (translated)
    for (let li = 0; li < rightLines.length; li++) {
      const lineY = y - li * LINE_HEIGHT;
      if (lineY > MARGIN + FOOTER_HEIGHT) {
        safeDrawText(page, rightLines[li], MARGIN + COLUMN_WIDTH + COLUMN_GAP + 14, lineY, {
          size: FONT_SIZE, color: rgb(0.06, 0.45, 0.36),
        });
      }
    }

    y -= segmentHeight;

    // Draw segment separator
    if (si < segments.length - 1) {
      page.drawLine({
        start: { x: MARGIN, y: y + SEGMENT_SPACING / 2 },
        end: { x: MARGIN + USABLE_WIDTH, y: y + SEGMENT_SPACING / 2 },
        thickness: 0.3,
        color: rgb(0.9, 0.9, 0.9),
        dashArray: [3, 3],
      });
    }
  }

  // Final divider and footer
  drawDivider(page, contentTop, y);
  drawFooter(page, pageNum);

  return pdfDoc.save();
}

// ─── DOCX Generation ─────────────────────────────────────────────────────────

async function generateDOCX(data: BilingualExportRequest): Promise<Buffer> {
  const segments = data.segments && data.segments.length > 0
    ? data.segments
    : [{ original: data.original, translated: data.translated }];

  const docTitle = data.title || 'Bilingual Document';
  const timestamp = data.include_timestamp
    ? new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: '065F46' }, // emerald-800
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: data.src_lang,
                bold: true,
                size: 22,
                color: 'FFFFFF',
                font: 'Calibri',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
          }),
        ],
        verticalAlign: 'center',
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: '065F46' },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: data.tgt_lang,
                bold: true,
                size: 22,
                color: 'FFFFFF',
                font: 'Calibri',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
          }),
        ],
        verticalAlign: 'center',
      }),
    ],
  });

  const dataRows = segments.map((seg, i) => {
    const isOdd = i % 2 === 1;
    const rowFill = isOdd ? 'ECFDF5' : undefined; // emerald-50 for odd rows

    return new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: rowFill ? { fill: rowFill } : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${i + 1}. `,
                  bold: true,
                  size: 18,
                  color: '6B7280',
                  font: 'Calibri',
                }),
                new TextRun({
                  text: seg.original,
                  size: 20,
                  font: 'Calibri',
                }),
              ],
              spacing: { before: 40, after: 40 },
            }),
          ],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: rowFill ? { fill: rowFill } : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${i + 1}. `,
                  bold: true,
                  size: 18,
                  color: '059669',
                  font: 'Calibri',
                }),
                new TextRun({
                  text: seg.translated,
                  size: 20,
                  color: '065F46',
                  font: 'Calibri',
                }),
              ],
              spacing: { before: 40, after: 40 },
            }),
          ],
        }),
      ],
    });
  });

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: docTitle,
          bold: true,
          size: 32,
          color: '065F46',
          font: 'Calibri',
        }),
      ],
      spacing: { after: 80 },
    })
  );

  // Subtitle with language pair
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.src_lang} → ${data.tgt_lang}`,
          size: 22,
          color: '059669',
          font: 'Calibri',
        }),
        ...(timestamp
          ? [
              new TextRun({
                text: `  •  ${timestamp}`,
                size: 20,
                color: '9CA3AF',
                font: 'Calibri',
              }),
            ]
          : []),
      ],
      spacing: { after: 200 },
    })
  );

  // Bilingual table
  children.push(
    new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        insideVertical: { style: BorderStyle.SINGLE, size: 2, color: '065F46' },
      },
    })
  );

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated by TamangNetra — ${segments.length} segment${segments.length !== 1 ? 's' : ''}`,
          size: 16,
          color: '9CA3AF',
          italics: true,
          font: 'Calibri',
        }),
      ],
      spacing: { before: 200 },
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ─── HTML Generation ─────────────────────────────────────────────────────────

function generateHTML(data: BilingualExportRequest): string {
  const segments = data.segments && data.segments.length > 0
    ? data.segments
    : [{ original: data.original, translated: data.translated }];

  const docTitle = data.title || 'Bilingual Document';
  const timestamp = data.include_timestamp
    ? new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  const rowsHtml = segments.map((seg, i) => {
    const bgColor = i % 2 === 1 ? 'background-color: #ECFDF5;' : '';
    return `
      <div class="segment-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #E5E7EB; ${bgColor}">
        <div class="segment-cell original" style="padding: 12px 16px; border-right: 2px solid #065F46;">
          <span class="seg-num" style="color: #9CA3AF; font-size: 11px; font-weight: 600;">${i + 1}.</span>
          <span style="color: #1F2937;">${escapeHtml(seg.original)}</span>
        </div>
        <div class="segment-cell translated" style="padding: 12px 16px;">
          <span class="seg-num" style="color: #059669; font-size: 11px; font-weight: 600;">${i + 1}.</span>
          <span style="color: #065F46;">${escapeHtml(seg.translated)}</span>
        </div>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
    .header {
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 3px solid #065F46;
    }
    .header h1 {
      font-size: 24px;
      color: #065F46;
      margin-bottom: 8px;
    }
    .header .meta {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    .lang-pair {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ECFDF5;
      color: #065F46;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
    }
    .lang-pair .arrow { color: #059669; }
    .timestamp { color: #9CA3AF; font-size: 13px; }
    .column-headers {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      background: #065F46;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 8px 8px 0 0;
      overflow: hidden;
    }
    .column-headers > div { padding: 10px 16px; }
    .column-headers > div:last-child { border-left: 2px solid #047857; }
    .segments { border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; }
    .segment-cell { font-size: 14px; line-height: 1.6; }
    .segment-cell .seg-num { margin-right: 6px; }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      color: #9CA3AF;
      font-size: 12px;
      font-style: italic;
      text-align: center;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .container { max-width: 100%; padding: 20px 0; }
      .segment-row { break-inside: avoid; }
      .header { border-bottom-width: 2px; }
    }
    @media (max-width: 640px) {
      .segment-row { grid-template-columns: 1fr !important; }
      .segment-cell.original { border-right: none !important; border-bottom: 2px solid #065F46; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(docTitle)}</h1>
      <div class="meta">
        <span class="lang-pair">
          ${escapeHtml(data.src_lang)} <span class="arrow">→</span> ${escapeHtml(data.tgt_lang)}
        </span>
        ${timestamp ? `<span class="timestamp">${escapeHtml(timestamp)}</span>` : ''}
      </div>
    </div>

    <div class="column-headers">
      <div>${escapeHtml(data.src_lang)}</div>
      <div>${escapeHtml(data.tgt_lang)}</div>
    </div>

    <div class="segments">
      ${rowsHtml}
    </div>

    <div class="footer">
      Generated by TamangNetra — ${segments.length} segment${segments.length !== 1 ? 's' : ''}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

// ─── API Handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    let body: BilingualExportRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { original, translated, segments, src_lang, tgt_lang, format, title, include_timestamp } = body;

    // Validation
    if (!original && !translated && (!segments || segments.length === 0)) {
      return NextResponse.json(
        { error: 'At least one of original, translated, or segments must be provided' },
        { status: 400 }
      );
    }

    if (!src_lang || !tgt_lang) {
      return NextResponse.json(
        { error: 'src_lang and tgt_lang are required' },
        { status: 400 }
      );
    }

    if (!format || !['pdf', 'docx', 'html'].includes(format)) {
      return NextResponse.json(
        { error: 'format must be one of: pdf, docx, html' },
        { status: 400 }
      );
    }

    const requestData: BilingualExportRequest = {
      original: original || '',
      translated: translated || '',
      segments: segments || [],
      src_lang,
      tgt_lang,
      format,
      title,
      include_timestamp: include_timestamp ?? false,
    };

    // Build filename
    const safeTitle = (title || 'bilingual_document').replace(/[^a-zA-Z0-9_-]/g, '_');
    const extensions: Record<string, string> = { pdf: 'pdf', docx: 'docx', html: 'html' };
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      html: 'text/html',
    };

    const filename = `${safeTitle}.${extensions[format]}`;
    let fileBuffer: Buffer | Uint8Array;

    switch (format) {
      case 'pdf': {
        const pdfBytes = await generatePDF(requestData);
        fileBuffer = pdfBytes;
        break;
      }
      case 'docx': {
        fileBuffer = await generateDOCX(requestData);
        break;
      }
      case 'html': {
        const htmlContent = generateHTML(requestData);
        fileBuffer = Buffer.from(htmlContent, 'utf-8');
        break;
      }
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': mimeTypes[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Bilingual export error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Bilingual document export failed', details: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Bilingual Document Export API',
    supportedFormats: ['pdf', 'docx', 'html'],
    note: 'PDF format uses Helvetica font which cannot render Devanagari characters. Use DOCX or HTML for full Unicode support.',
  });
}
