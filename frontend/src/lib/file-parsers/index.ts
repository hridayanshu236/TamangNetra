/**
 * File Parsers — Unified Interface
 *
 * Provides a common ParsedDocument interface and re-exports
 * all file parser modules.
 */

export interface ParsedDocument {
  /** The type of the source document */
  type: 'pdf' | 'docx' | 'csv' | 'tsv';
  /** Pages extracted from the document (for PDF/DOCX) */
  pages?: Array<PageBlock>;
  /** Raw content (for CSV/TSV tabular data) */
  rawContent?: any;
}

export interface PageBlock {
  /** Page number (1-based) */
  pageNumber: number;
  /** Content blocks on this page */
  blocks: Array<ContentBlock>;
}

export interface ContentBlock {
  /** Type of content block */
  type: 'text' | 'image' | 'table';
  /** Text content of the block */
  content: string;
  /** Bounding box for positioning (mainly for PDF) */
  boundingBox?: BoundingBox;
  /** Style information (font, size, bold, italic, etc.) */
  style?: Record<string, any>;
  /** Child blocks (for nested structures like table cells) */
  children?: ContentBlock[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Cell data for tabular formats (CSV/TSV) */
export interface CellData {
  /** The cell value as a string */
  value: string;
  /** Whether this cell contains a formula (starts with =) */
  isFormula: boolean;
  /** Whether this cell is text (translatable) */
  isText: boolean;
}

/** Header cell data for CSV/TSV — same as CellData but semantically a header */
export type HeaderCell = CellData;

/** Row data for CSV/TSV */
export interface ParsedTable {
  /** Header row */
  headers: HeaderCell[];
  /** Data rows */
  rows: CellData[][];
  /** Delimiter used */
  delimiter: ',' | '\t' | string;
}

/** DOCX paragraph style information */
export interface DocxParagraphStyle {
  /** Heading level (0 = normal paragraph, 1-6 = heading levels) */
  headingLevel?: number;
  /** Whether the text is bold */
  bold?: boolean;
  /** Whether the text is italic */
  italic?: boolean;
  /** Whether the text is underlined */
  underline?: boolean;
  /** Font size in points */
  fontSize?: number;
  /** Font family name */
  fontFamily?: string;
  /** Text alignment */
  alignment?: 'left' | 'center' | 'right' | 'justify';
  /** Whether this is a list item */
  isListItem?: boolean;
  /** List item level (0 = top level) */
  listLevel?: number;
}

/** PDF text item with position information */
export interface PdfTextItem {
  /** The text content */
  text: string;
  /** X position on the page */
  x: number;
  /** Y position on the page */
  y: number;
  /** Width of the text */
  width: number;
  /** Height of the text */
  height: number;
  /** Font name */
  fontName?: string;
  /** Font size */
  fontSize?: number;
}

/** PDF page data */
export interface PdfPageData {
  /** Page number (1-based) */
  pageNumber: number;
  /** Page width in points */
  width: number;
  /** Page height in points */
  height: number;
  /** Text items on this page */
  textItems: PdfTextItem[];
}

// Re-export parsers
export { parseCSV, parseTSV, detectCSVType } from './csv';
export { parseDOCX } from './docx';
export { parsePDF } from './pdf';
