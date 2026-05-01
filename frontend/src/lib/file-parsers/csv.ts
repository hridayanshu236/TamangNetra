/**
 * CSV/TSV Parser — Formula-Aware Tabular Data Parser
 *
 * Using PapaParse for robust CSV/TSV parsing.
 * Detects formulas (cells starting with =), numeric data, and dates.
 * Only marks text cells as translatable.
 */

import Papa from 'papaparse';
import type { ParsedTable, CellData, HeaderCell } from './index';

/**
 * Check if a cell value is a formula (starts with =).
 */
function isFormula(value: string): boolean {
  return value.trimStart().startsWith('=');
}

/**
 * Check if a cell value is numeric.
 * Matches integers, decimals, negative numbers, and numbers with commas.
 */
function isNumeric(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Remove commas and check if it's a valid number
  const withoutCommas = trimmed.replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(withoutCommas);
}

/**
 * Check if a cell value looks like a date.
 * Matches common date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.
 */
function isDate(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // ISO date: YYYY-MM-DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) return true;

  // DD/MM/YYYY or MM/DD/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(trimmed)) return true;

  // Nepali date format: वि.सं. YYYY/MM/DD or BS YYYY-MM-DD
  if (/वि\.सं\.|BS\s/i.test(trimmed)) return true;

  // Date with month name: Jan 15, 2024 or 15 January 2024
  const monthPattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b/i;
  if (monthPattern.test(trimmed) && /\d{1,4}/.test(trimmed)) return true;

  return false;
}

/**
 * Check if a cell value is a boolean.
 */
function isBoolean(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed === 'true' || trimmed === 'false' || trimmed === 'yes' || trimmed === 'no';
}

/**
 * Check if a cell value is a percentage.
 */
function isPercentage(value: string): boolean {
  const trimmed = value.trim();
  return /^-?\d+(\.\d+)?%$/.test(trimmed);
}

/**
 * Determine if a cell value is translatable text.
 * Only text cells should be translated; formulas, numbers, dates, etc. stay untouched.
 */
function isTextCell(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (isFormula(trimmed)) return false;
  if (isNumeric(trimmed)) return false;
  if (isDate(trimmed)) return false;
  if (isBoolean(trimmed)) return false;
  if (isPercentage(trimmed)) return false;
  return true;
}

/**
 * Classify a cell value into a CellData object.
 */
function classifyCell(value: string): CellData {
  return {
    value,
    isFormula: isFormula(value),
    isText: isTextCell(value),
  };
}

/**
 * Auto-detect whether the input is CSV or TSV.
 *
 * @param content - The file content as a string
 * @returns 'csv' or 'tsv'
 */
export function detectCSVType(content: string): 'csv' | 'tsv' {
  const firstLines = content.split('\n').slice(0, 5).join('\n');

  // Count tabs vs commas in the first few lines
  const tabCount = (firstLines.match(/\t/g) ?? []).length;
  const commaCount = (firstLines.match(/,/g) ?? []).length;

  // If significantly more tabs, it's TSV
  if (tabCount > commaCount * 2) return 'tsv';

  // If significantly more commas, it's CSV
  if (commaCount > tabCount * 2) return 'csv';

  // Default to CSV
  return 'csv';
}

/**
 * Parse a CSV string into a structured ParsedTable.
 *
 * @param content - The CSV file content as a string
 * @param hasHeader - Whether the first row is a header row (default: true)
 * @returns ParsedTable with classified cells
 */
export function parseCSV(content: string, hasHeader: boolean = true): ParsedTable {
  const result = Papa.parse(content, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false, // Keep everything as strings for classification
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`CSV parsing failed: ${result.errors.map((e) => e.message).join(', ')}`);
  }

  const allRows = result.data as string[][];

  if (allRows.length === 0) {
    return { headers: [], rows: [], delimiter: ',' };
  }

  let headers: HeaderCell[];
  let dataRows: string[][];

  if (hasHeader && allRows.length > 0) {
    headers = allRows[0].map((val) => classifyCell(val) as HeaderCell);
    dataRows = allRows.slice(1);
  } else {
    // Generate default headers
    const colCount = allRows[0]?.length ?? 0;
    headers = Array.from({ length: colCount }, (_, i) => ({
      value: `Column ${i + 1}`,
      isFormula: false,
      isText: true,
    }));
    dataRows = allRows;
  }

  const rows = dataRows.map((row) => row.map((val) => classifyCell(val)));

  return {
    headers,
    rows,
    delimiter: ',',
  };
}

/**
 * Parse a TSV string into a structured ParsedTable.
 *
 * @param content - The TSV file content as a string
 * @param hasHeader - Whether the first row is a header row (default: true)
 * @returns ParsedTable with classified cells
 */
export function parseTSV(content: string, hasHeader: boolean = true): ParsedTable {
  const result = Papa.parse(content, {
    header: false,
    delimiter: '\t',
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`TSV parsing failed: ${result.errors.map((e) => e.message).join(', ')}`);
  }

  const allRows = result.data as string[][];

  if (allRows.length === 0) {
    return { headers: [], rows: [], delimiter: '\t' };
  }

  let headers: HeaderCell[];
  let dataRows: string[][];

  if (hasHeader && allRows.length > 0) {
    headers = allRows[0].map((val) => classifyCell(val) as HeaderCell);
    dataRows = allRows.slice(1);
  } else {
    const colCount = allRows[0]?.length ?? 0;
    headers = Array.from({ length: colCount }, (_, i) => ({
      value: `Column ${i + 1}`,
      isFormula: false,
      isText: true,
    }));
    dataRows = allRows;
  }

  const rows = dataRows.map((row) => row.map((val) => classifyCell(val)));

  return {
    headers,
    rows,
    delimiter: '\t',
  };
}

/**
 * Parse CSV or TSV auto-detecting the format.
 *
 * @param content - The file content as a string
 * @param hasHeader - Whether the first row is a header row
 * @returns ParsedTable with classified cells
 */
export function parseCSVAuto(content: string, hasHeader: boolean = true): ParsedTable {
  const type = detectCSVType(content);
  return type === 'tsv'
    ? parseTSV(content, hasHeader)
    : parseCSV(content, hasHeader);
}

/**
 * Get statistics about translatable vs non-translatable cells.
 */
export function getCellStats(table: ParsedTable): {
  totalCells: number;
  textCells: number;
  formulaCells: number;
  numericCells: number;
  dateCells: number;
  emptyCells: number;
  translatablePercentage: number;
} {
  let totalCells = 0;
  let textCells = 0;
  let formulaCells = 0;
  let numericCells = 0;
  let dateCells = 0;
  let emptyCells = 0;

  // Count header cells
  for (const header of table.headers) {
    totalCells++;
    const val = header.value.trim();
    if (val.length === 0) { emptyCells++; continue; }
    if (header.isFormula) { formulaCells++; continue; }
    if (header.isText) { textCells++; continue; }
    if (isNumeric(val)) { numericCells++; continue; }
    if (isDate(val)) { dateCells++; continue; }
  }

  // Count data cells
  for (const row of table.rows) {
    for (const cell of row) {
      totalCells++;
      const val = cell.value.trim();
      if (val.length === 0) { emptyCells++; continue; }
      if (cell.isFormula) { formulaCells++; continue; }
      if (cell.isText) { textCells++; continue; }
      if (isNumeric(val)) { numericCells++; continue; }
      if (isDate(val)) { dateCells++; continue; }
    }
  }

  return {
    totalCells,
    textCells,
    formulaCells,
    numericCells,
    dateCells,
    emptyCells,
    translatablePercentage: totalCells > 0
      ? Math.round((textCells / totalCells) * 100)
      : 0,
  };
}
