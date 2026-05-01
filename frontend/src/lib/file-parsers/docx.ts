/**
 * DOCX Parser — Structured Document Extraction
 *
 * Using mammoth to convert DOCX to structured format.
 * Preserves paragraphs, headings, lists, tables.
 * Tracks text styling (bold, italic, underline).
 * Returns structured data that can be reconstructed after translation.
 */

import mammoth from 'mammoth';
import type {
  ParsedDocument,
  PageBlock,
  ContentBlock,
  DocxParagraphStyle,
} from './index';

/**
 * Parse run-level HTML from mammoth to extract styling information.
 */
interface ParsedRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

/**
 * Extract styled runs from an HTML string produced by mammoth.
 */
function extractRunsFromHTML(html: string): ParsedRun[] {
  const runs: ParsedRun[] = [];

  // Simple HTML parsing for style information
  // Match <strong>, <em>, <u>, <s> tags and their content
  const tagPattern = /<(strong|em|u|s)>(.*?)<\/\1>/g;
  const selfClosingPattern = /<br\s*\/?>/g;

  // Clean up the HTML
  let cleaned = html.replace(selfClosingPattern, '\n');

  // Track current style context
  let remaining = cleaned;
  let lastIndex = 0;

  // Simple state machine approach
  const textParts: { text: string; bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean }[] = [];

  // Process the HTML to extract styled text
  const fullPattern = /<(\/?)(strong|em|u|s)>([^<]*)/g;
  const styleStack: Map<string, boolean> = new Map();
  let matchResult: RegExpExecArray | null;

  // Reset lastIndex
  fullPattern.lastIndex = 0;

  // Use a different approach: extract text with inline style markers
  const segments: Array<{ text: string; styles: Set<string> }> = [];
  let currentText = '';
  const activeStyles = new Set<string>();

  // Tokenize the HTML
  const tokenPattern = /<(\/?)(strong|em|u|s)>|([^<]+)/g;
  let tokenMatch: RegExpExecArray | null;
  tokenPattern.lastIndex = 0;

  while ((tokenMatch = tokenPattern.exec(cleaned)) !== null) {
    if (tokenMatch[3] !== undefined) {
      // Text content
      currentText += tokenMatch[3];
    } else if (tokenMatch[1] === '') {
      // Opening tag
      if (currentText) {
        segments.push({ text: currentText, styles: new Set(activeStyles) });
        currentText = '';
      }
      activeStyles.add(tokenMatch[2]);
    } else {
      // Closing tag
      if (currentText) {
        segments.push({ text: currentText, styles: new Set(activeStyles) });
        currentText = '';
      }
      activeStyles.delete(tokenMatch[2]);
    }
  }

  // Don't forget remaining text
  if (currentText) {
    segments.push({ text: currentText, styles: new Set(activeStyles) });
  }

  for (const seg of segments) {
    runs.push({
      text: seg.text,
      bold: seg.styles.has('strong'),
      italic: seg.styles.has('em'),
      underline: seg.styles.has('u'),
      strikethrough: seg.styles.has('s'),
    });
  }

  return runs;
}

/**
 * Detect heading level from HTML class names.
 * Mammoth uses class names like "Heading1", "Heading2", etc.
 */
function detectHeadingLevel(html: string): number {
  const headingMatch = html.match(/class="[^"]*Heading(\d)[^"]*"/i);
  if (headingMatch) {
    return parseInt(headingMatch[1], 10);
  }
  return 0;
}

/**
 * Detect list items from HTML.
 */
function isListItem(html: string): boolean {
  return /<li[^>]*>/.test(html);
}

/**
 * Detect list level from HTML nesting.
 */
function detectListLevel(html: string): number {
  const ulMatches = html.match(/<ul[^>]*>/g);
  const olMatches = html.match(/<ol[^>]*>/g);
  const count = (ulMatches?.length ?? 0) + (olMatches?.length ?? 0);
  return Math.max(0, count - 1);
}

/**
 * Extract text content from HTML, stripping tags.
 */
function stripHTMLTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Parse a DOCX file buffer into a structured ParsedDocument.
 *
 * @param buffer - The DOCX file as an ArrayBuffer or Buffer
 * @returns ParsedDocument with structured content blocks
 */
export async function parseDOCX(buffer: ArrayBuffer | Buffer): Promise<ParsedDocument> {
  // Convert Buffer to ArrayBuffer if needed
  const arrayBuffer = buffer instanceof Buffer
    ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    : buffer;

  // Extract HTML with mammoth
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      // Include styling information
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
      ],
    }
  );

  const html = result.value;
  const warnings = result.messages.filter((m) => m.type === 'warning');

  if (warnings.length > 0) {
    console.warn('DOCX parse warnings:', warnings.map((w) => w.message).join('; '));
  }

  // Parse the HTML into structured blocks
  const blocks = parseHTMLToBlocks(html);

  // DOCX doesn't have true pages, but we represent it as a single page
  const page: PageBlock = {
    pageNumber: 1,
    blocks,
  };

  return {
    type: 'docx',
    pages: [page],
  };
}

/**
 * Parse mammoth-generated HTML into ContentBlock array.
 */
function parseHTMLToBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  if (!html || html.trim().length === 0) {
    return blocks;
  }

  // Split by block-level elements
  // Match headings, paragraphs, list items, tables
  const blockPattern = /<(h[1-6]|p|li|tr)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  blockPattern.lastIndex = 0;

  // First, extract tables separately
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables: Array<{ fullMatch: string; index: number }> = [];
  let tableMatch: RegExpExecArray | null;
  tablePattern.lastIndex = 0;

  while ((tableMatch = tablePattern.exec(html)) !== null) {
    tables.push({
      fullMatch: tableMatch[0],
      index: tableMatch.index,
    });
  }

  // Process the HTML block by block
  // Use a simpler approach: split by double newlines and process each block
  const htmlBlocks = html.split(/(?=<(?:h[1-6]|p|ul|ol|table)[^>]*>)/i);

  for (const block of htmlBlocks) {
    if (!block.trim()) continue;

    // Handle headings
    const headingMatch = block.match(/^<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/i);
    if (headingMatch) {
      const level = parseInt(headingMatch[1][1], 10);
      const content = stripHTMLTags(headingMatch[2]);
      const runs = extractRunsFromHTML(headingMatch[2]);

      if (content.trim()) {
        const style: DocxParagraphStyle = {
          headingLevel: level,
          bold: runs.some((r) => r.bold),
          italic: runs.some((r) => r.italic),
          underline: runs.some((r) => r.underline),
        };

        blocks.push({
          type: 'text',
          content,
          style,
        });
      }
      continue;
    }

    // Handle tables
    if (block.toLowerCase().startsWith('<table')) {
      const tableContent = parseTableHTML(block);
      if (tableContent) {
        blocks.push(tableContent);
      }
      continue;
    }

    // Handle lists
    if (block.toLowerCase().startsWith('<ul') || block.toLowerCase().startsWith('<ol')) {
      const listItems = parseListHTML(block);
      for (const item of listItems) {
        blocks.push(item);
      }
      continue;
    }

    // Handle paragraphs
    const pMatch = block.match(/^<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      const content = stripHTMLTags(pMatch[1]);
      const runs = extractRunsFromHTML(pMatch[1]);

      if (content.trim()) {
        const style: DocxParagraphStyle = {
          headingLevel: 0,
          bold: runs.some((r) => r.bold),
          italic: runs.some((r) => r.italic),
          underline: runs.some((r) => r.underline),
        };

        blocks.push({
          type: 'text',
          content,
          style,
        });
      }
      continue;
    }

    // Fallback: treat as plain text
    const text = stripHTMLTags(block);
    if (text.trim()) {
      blocks.push({
        type: 'text',
        content: text,
      });
    }
  }

  return blocks;
}

/**
 * Parse a table HTML element into a ContentBlock.
 */
function parseTableHTML(tableHTML: string): ContentBlock | null {
  const rows: ContentBlock[] = [];

  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  rowPattern.lastIndex = 0;

  while ((rowMatch = rowPattern.exec(tableHTML)) !== null) {
    const cells: ContentBlock[] = [];
    const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    cellPattern.lastIndex = 0;

    while ((cellMatch = cellPattern.exec(rowMatch[1])!) !== null) {
      const cellContent = stripHTMLTags(cellMatch[1]);
      cells.push({
        type: 'text',
        content: cellContent,
      });
    }

    if (cells.length > 0) {
      rows.push({
        type: 'text',
        content: cells.map((c) => c.content).join(' | '),
        children: cells,
      });
    }
  }

  if (rows.length === 0) return null;

  return {
    type: 'table',
    content: rows.map((r) => r.content).join('\n'),
    children: rows,
  };
}

/**
 * Parse list HTML into ContentBlock array.
 */
function parseListHTML(listHTML: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let listLevel = 0;

  // Detect nesting
  const ulCount = (listHTML.match(/<ul/gi) ?? []).length;
  const olCount = (listHTML.match(/<ol/gi) ?? []).length;
  listLevel = ulCount + olCount - 1;

  const itemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let itemMatch: RegExpExecArray | null;
  itemPattern.lastIndex = 0;

  while ((itemMatch = itemPattern.exec(listHTML)!) !== null) {
    const content = stripHTMLTags(itemMatch[1]);
    if (content.trim()) {
      const runs = extractRunsFromHTML(itemMatch[1]);
      const style: DocxParagraphStyle = {
        headingLevel: 0,
        isListItem: true,
        listLevel,
        bold: runs.some((r) => r.bold),
        italic: runs.some((r) => r.italic),
        underline: runs.some((r) => r.underline),
      };

      blocks.push({
        type: 'text',
        content,
        style,
      });
    }
  }

  return blocks;
}

/**
 * Parse a DOCX file and return just the plain text content.
 * Useful for quick previews without structure.
 *
 * @param buffer - The DOCX file as an ArrayBuffer or Buffer
 * @returns Plain text string
 */
export async function parseDOCXPlainText(buffer: ArrayBuffer | Buffer): Promise<string> {
  const arrayBuffer = buffer instanceof Buffer
    ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    : buffer;

  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
