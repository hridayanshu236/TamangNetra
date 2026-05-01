/**
 * PDF Parser — Structured Text Extraction with Position Information
 *
 * Using pdfjs-dist for text extraction and pdf-lib for metadata.
 * Extracts text with position information (bounding boxes).
 * Identifies text blocks and their positions.
 * Stores page dimensions.
 *
 * Note: pdfjs-dist worker needs special handling in Next.js.
 * In the server environment, we use getDocument without a worker.
 */

import type { ParsedDocument, PageBlock, ContentBlock, BoundingBox, PdfTextItem, PdfPageData } from './index';

/**
 * Dynamically import pdfjs-dist to handle server-side usage.
 * We set the worker to disabled since we're running in Node.js.
 */
async function getPdfjs() {
  const pdfjs = await import('pdfjs-dist');

  // Disable the worker for server-side usage
  // In Node.js environment, pdfjs-dist can run without a web worker
  if (typeof window === 'undefined') {
    // Server-side: no worker needed
    try {
      const { getDocument, GlobalWorkerOptions } = pdfjs;
      GlobalWorkerOptions.workerSrc = '';
      return { getDocument, GlobalWorkerOptions };
    } catch {
      // If GlobalWorkerOptions doesn't exist in this version, just proceed
      return pdfjs;
    }
  }

  return pdfjs;
}

/**
 * Merge nearby text items into blocks based on vertical and horizontal proximity.
 *
 * @param items - Text items from a page
 * @param lineHeightThreshold - Multiplier of line height to consider same line (default: 1.5)
 * @param paragraphGapThreshold - Multiplier of line height to consider a paragraph break (default: 2.0)
 */
function mergeTextItemsIntoBlocks(
  items: PdfTextItem[],
  lineHeightThreshold: number = 1.5,
  paragraphGapThreshold: number = 2.0
): Array<{
  text: string;
  boundingBox: BoundingBox;
  items: PdfTextItem[];
}> {
  if (items.length === 0) return [];

  // Sort items by Y position (top to bottom) then X position (left to right)
  // PDF coordinates: Y=0 is at the bottom, so we sort descending by Y
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.y - a.y; // Descending Y (top of page first)
    if (Math.abs(a.y - b.y) > (a.height + b.height) / 2) return yDiff;
    return a.x - b.x; // Left to right within same line
  });

  // Calculate average line height
  const avgHeight = sorted.reduce((sum, item) => sum + item.height, 0) / sorted.length;
  const lineThreshold = avgHeight * lineHeightThreshold;
  const paragraphThreshold = avgHeight * paragraphGapThreshold;

  const blocks: Array<{
    text: string;
    boundingBox: BoundingBox;
    items: PdfTextItem[];
  }> = [];

  let currentBlockItems: PdfTextItem[] = [sorted[0]];
  let lastItem = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];

    // Check vertical distance
    const verticalDistance = Math.abs(lastItem.y - item.y);

    if (verticalDistance > paragraphThreshold) {
      // New paragraph — significant vertical gap
      blocks.push(finalizeBlock(currentBlockItems));
      currentBlockItems = [item];
    } else if (verticalDistance > lineThreshold) {
      // New line within same paragraph
      currentBlockItems.push(item);
    } else {
      // Same line — check horizontal proximity
      const horizontalGap = item.x - (lastItem.x + lastItem.width);
      const spaceThreshold = avgHeight * 0.5; // Rough estimate for a space

      if (horizontalGap > spaceThreshold * 3) {
        // Large horizontal gap — might be a column break
        blocks.push(finalizeBlock(currentBlockItems));
        currentBlockItems = [item];
      } else {
        // Same line, adjacent — add to current block
        currentBlockItems.push(item);
      }
    }

    lastItem = item;
  }

  // Don't forget the last block
  if (currentBlockItems.length > 0) {
    blocks.push(finalizeBlock(currentBlockItems));
  }

  return blocks;
}

/**
 * Finalize a block of text items into a merged block with bounding box.
 */
function finalizeBlock(items: PdfTextItem[]): {
  text: string;
  boundingBox: BoundingBox;
  items: PdfTextItem[];
} {
  // Sort items within the block by position for proper reading order
  const sortedItems = [...items].sort((a, b) => {
    // Group by line (Y position)
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > Math.min(a.height, b.height) * 0.5) return yDiff;
    return a.x - b.x;
  });

  // Build the text with proper line breaks
  let text = '';
  let lastY = sortedItems[0].y;
  let lastX = sortedItems[0].x + sortedItems[0].width;

  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i];

    // Check if we need a line break
    if (i > 0) {
      const yDiff = Math.abs(item.y - lastY);
      if (yDiff > item.height * 0.5) {
        text += '\n';
      } else {
        // Check if we need a space
        const gap = item.x - lastX;
        if (gap > item.height * 0.1) {
          text += ' ';
        }
      }
    }

    text += item.text;
    lastY = item.y;
    lastX = item.x + item.width;
  }

  // Calculate bounding box encompassing all items
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const maxY = Math.max(...items.map((i) => i.y + i.height));

  return {
    text: text.trim(),
    boundingBox: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    items: sortedItems,
  };
}

/**
 * Parse a PDF file buffer into a structured ParsedDocument.
 *
 * @param buffer - The PDF file as an ArrayBuffer or Buffer
 * @returns ParsedDocument with page-level text extraction
 */
export async function parsePDF(buffer: ArrayBuffer | Buffer): Promise<ParsedDocument> {
  const arrayBuffer = buffer instanceof Buffer
    ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    : buffer;

  const pdfjs = await getPdfjs();
  const getDocument = pdfjs.getDocument ?? (pdfjs as any).default?.getDocument;

  if (!getDocument) {
    throw new Error('Failed to load pdfjs-dist: getDocument not available');
  }

  // Load the PDF document without a worker
  const loadingTask = getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: PageBlock[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    // Extract text content
    const textContent = await page.getTextContent();
    const textItems: PdfTextItem[] = [];

    for (const item of textContent.items) {
      const textItem = item as any;
      if (!textItem.str || textItem.str.trim().length === 0) continue;

      // Get the transform matrix to calculate position
      const tx = textItem.transform;
      // transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const x = tx[4];
      const y = viewport.height - tx[5]; // Flip Y coordinate (PDF: bottom=0, we want top=0)
      const width = textItem.width ?? (textItem.str.length * (tx[0] || 12) * 0.6);
      const height = Math.abs(tx[3]) || 12;

      textItems.push({
        text: textItem.str,
        x,
        y,
        width,
        height,
        fontName: textItem.fontName,
        fontSize: Math.abs(tx[3]) || undefined,
      });
    }

    // Merge text items into logical blocks
    const mergedBlocks = mergeTextItemsIntoBlocks(textItems);

    // Convert to ContentBlock format
    const blocks: ContentBlock[] = mergedBlocks
      .filter((b) => b.text.trim().length > 0)
      .map((block) => ({
        type: 'text' as const,
        content: block.text,
        boundingBox: block.boundingBox,
        style: {
          fontSize: block.items[0]?.fontSize,
          fontName: block.items[0]?.fontName,
        },
      }));

    pages.push({
      pageNumber: pageNum,
      blocks,
    });
  }

  return {
    type: 'pdf',
    pages,
  };
}

/**
 * Parse a PDF file and return raw page data with text items.
 * Useful for custom processing of text positions.
 *
 * @param buffer - The PDF file as an ArrayBuffer or Buffer
 * @returns Array of PdfPageData with text items and page dimensions
 */
export async function parsePDFRaw(buffer: ArrayBuffer | Buffer): Promise<PdfPageData[]> {
  const arrayBuffer = buffer instanceof Buffer
    ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    : buffer;

  const pdfjs = await getPdfjs();
  const getDocument = pdfjs.getDocument ?? (pdfjs as any).default?.getDocument;

  if (!getDocument) {
    throw new Error('Failed to load pdfjs-dist: getDocument not available');
  }

  const loadingTask = getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pageData: PdfPageData[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const textItems: PdfTextItem[] = [];
    for (const item of textContent.items) {
      const textItem = item as any;
      if (!textItem.str || textItem.str.trim().length === 0) continue;

      const tx = textItem.transform;
      textItems.push({
        text: textItem.str,
        x: tx[4],
        y: viewport.height - tx[5],
        width: textItem.width ?? (textItem.str.length * (tx[0] || 12) * 0.6),
        height: Math.abs(tx[3]) || 12,
        fontName: textItem.fontName,
        fontSize: Math.abs(tx[3]) || undefined,
      });
    }

    pageData.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      textItems,
    });
  }

  return pageData;
}

/**
 * Get the number of pages in a PDF file.
 *
 * @param buffer - The PDF file as an ArrayBuffer or Buffer
 * @returns Number of pages
 */
export async function getPDFPageCount(buffer: ArrayBuffer | Buffer): Promise<number> {
  const arrayBuffer = buffer instanceof Buffer
    ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    : buffer;

  const pdfjs = await getPdfjs();
  const getDocument = pdfjs.getDocument ?? (pdfjs as any).default?.getDocument;

  if (!getDocument) {
    throw new Error('Failed to load pdfjs-dist: getDocument not available');
  }

  const loadingTask = getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  return pdfDoc.numPages;
}

/**
 * Extract plain text from a PDF file (no position info).
 *
 * @param buffer - The PDF file as an ArrayBuffer or Buffer
 * @returns Plain text string with page separators
 */
export async function parsePDFPlainText(buffer: ArrayBuffer | Buffer): Promise<string> {
  const doc = await parsePDF(buffer);

  if (!doc.pages) return '';

  return doc.pages
    .map((page) =>
      page.blocks
        .filter((b) => b.type === 'text')
        .map((b) => b.content)
        .join('\n')
    )
    .join('\n\n--- Page Break ---\n\n');
}
