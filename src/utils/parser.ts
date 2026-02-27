import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { Transaction } from '../mocks/statements';

// Initialize PDF.js worker
// Use unpkg for the worker to avoid local build issues with Vite for now
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

const DATE_PATTERNS = [
  { regex: /^(\d{1,2})[./](\d{1,2})[./](\d{4})(\s+.*)?$/, format: 'MM/DD/YYYY' },
  { regex: /^(\d{1,2})[./](\d{1,2})[./](\d{2})(\s+.*)?$/, format: 'MM/DD/YY' },
  { regex: /^(\d{4})[.-](\d{2})[.-](\d{2})(\s+.*)?$/, format: 'YYYY-MM-DD' },
  { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})(\s+.*)?$/, format: 'MM-DD-YYYY' },
  { regex: /^([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s*(\d{4}))?(\s+.*)?$/, format: 'MMM DD YYYY' },
  { regex: /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})(\s+.*)?$/, format: 'DD MMM YYYY' },
  { regex: /^(\d{1,2})-(\d{3,9})-(\d{4})(\s+.*)?$/, format: 'DD-MMM-YYYY' },
  { regex: /^(\d{1,2})[./](\d{1,2})(\s+.*)?$/, format: 'MM/DD' },
];

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extracts a 4-digit year from a filename string.
 * Supports patterns like:
 *   "2025 March 05 Citi.pdf"   → 2025
 *   "2024-12-31 SoFi.pdf"      → 2024
 *   "statement_2025_03.pdf"    → 2025
 *   "CitiStatement_Jan2023.pdf" → 2023
 * Returns null if no plausible year is found.
 */
export function extractStatementContext(filename: string): { year: number; month: number | null } | null {
  // Use negative lookbehind/lookahead instead of \b because underscore IS a word
  // character, so "statement_2025_03" won't match with \b boundaries.
  // (?<!\d) = not preceded by a digit  |  (?!\d) = not followed by a digit
  const matches = filename.match(/(?<!\d)(20\d{2}|19\d{2})(?!\d)/g);
  if (!matches || matches.length === 0) return null;
  // If multiple years found, pick the earliest (most likely the statement period year,
  // not the download year)
  const years = matches.map(Number);
  const year = Math.min(...years);

  let month: number | null = null;
  const lower = filename.toLowerCase();

  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const shortMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  // 1. Try explicit full/short month names
  let earliestMonthIndex = -1;
  let earliestMonthPos = Infinity;

  for (let i = 0; i < 12; i++) {
    const fullPos = lower.indexOf(monthNames[i]);
    if (fullPos !== -1 && fullPos < earliestMonthPos) {
      earliestMonthPos = fullPos;
      earliestMonthIndex = i;
    }

    // Check short month with word boundaries
    const shortRegex = new RegExp(`(?<![a-z])${shortMonths[i]}(?![a-z])`);
    const shortMatch = lower.match(shortRegex);
    if (shortMatch && shortMatch.index !== undefined && shortMatch.index < earliestMonthPos) {
      earliestMonthPos = shortMatch.index;
      earliestMonthIndex = i;
    }
  }

  if (earliestMonthIndex !== -1) {
    month = earliestMonthIndex + 1;
  }

  // 2. Try YYYY-MM or YYYY_MM or YYYY.MM
  if (!month) {
    const mmMatch = filename.match(/(?<!\d)(?:20\d{2}|19\d{2})[-_.](0[1-9]|1[0-2])(?!\d)/);
    if (mmMatch) {
      month = parseInt(mmMatch[1], 10);
    }
  }

  // 3. Try MM-YYYY or MM_YYYY
  if (!month) {
    const mmMatch2 = filename.match(/(?<!\d)(0[1-9]|1[0-2])[-_.](?:20\d{2}|19\d{2})(?!\d)/);
    if (mmMatch2) {
      month = parseInt(mmMatch2[1], 10);
    }
  }

  return { year, month };
}

/**
 * Robustly parses various date formats.
 *
 * @param dateStr     - The raw date string from the statement
 * @param statementYear - Optional: explicit year from the filename
 * @param statementMonth - Optional: explicit month (1-12) from the filename
 */
export function parseDate(dateStr: string, statementYear?: number, statementMonth?: number | null): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Determine the baseline year for year-less date strings.
  // Priority: statementYear from filename > today's year (fallback).
  const baseYear = statementYear ?? new Date().getFullYear();
  const hasStatementYear = statementYear !== undefined;

  for (const { regex, format } of DATE_PATTERNS) {
    const match = trimmed.match(regex);
    if (!match) continue;

    try {
      let date: Date | null = null;
      switch (format) {
        case 'MM/DD/YYYY':
        case 'MM/DD/YY':
        case 'MM-DD-YYYY':
        case 'MM/DD': {
          const p1 = +match[1];
          const p2 = +match[2];
          let explicitYear = format.includes('YYYY');
          let y = explicitYear ? +match[3] : 0;

          if (format === 'MM/DD/YY') {
            const yy = +match[3];
            y = yy > 50 ? 1900 + yy : 2000 + yy;
            explicitYear = true;
          } else if (format === 'MM/DD') {
            y = baseYear;
          }

          // Try MM/DD first
          const d1 = new Date(y, p1 - 1, p2);
          if (d1.getFullYear() === y && d1.getMonth() === p1 - 1 && d1.getDate() === p2) {
            date = d1;
          } else {
            // Try DD/MM (European)
            const d2 = new Date(y, p2 - 1, p1);
            if (d2.getFullYear() === y && d2.getMonth() === p2 - 1 && d2.getDate() === p1) {
              date = d2;
            }
          }

          // Year correction logic for year-less formats:
          if (date && !explicitYear) {
            let needsRollback = false;
            // 1. Rigorous cross-year statement window check
            if (hasStatementYear && statementMonth) {
              const txMonth = date.getMonth() + 1;
              if (txMonth > statementMonth + 1) {
                needsRollback = true;
              }
            } else {
              // 2. Fallback: physical future date check
              const now = new Date();
              if (date.getTime() > now.getTime() + 2 * 60 * 60 * 1000) {
                needsRollback = true;
              }
            }

            if (needsRollback) {
              date.setFullYear(y - 1);
            }
          }
          break;
        }
        case 'YYYY-MM-DD':
          date = new Date(+match[1], +match[2] - 1, +match[3]);
          break;
        case 'MMM DD YYYY': {
          const hasYear = !!match[3];
          const year = match[3] ? +match[3] : baseYear;
          date = new Date(`${match[1]} ${match[2]}, ${year}`);
          if (date && !hasYear) {
            let needsRollback = false;
            if (hasStatementYear && statementMonth) {
              const txMonth = date.getMonth() + 1;
              if (txMonth > statementMonth + 1) {
                needsRollback = true;
              }
            } else {
              const now = new Date();
              if (date.getTime() > now.getTime() + 2 * 60 * 60 * 1000) {
                needsRollback = true;
              }
            }
            if (needsRollback) {
              date.setFullYear(year - 1);
            }
          }
          break;
        }
        case 'DD MMM YYYY':
        case 'DD-MMM-YYYY':
          date = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
          break;
        default:
          return null;
      }

      // Final validation to catch overflow from Date constructor.
      // Global safeguard: only apply when NO statementYear was provided
      // (if we have a statementYear, it's intentionally set and should not be rolled back).
      if (date && !isNaN(date.getTime())) {
        if (!hasStatementYear) {
          const now = new Date();
          if (date.getTime() > now.getTime() + 48 * 60 * 60 * 1000) {
            date.setFullYear(date.getFullYear() - 1);
          }
        }
        return date;
      }
      return null;
    } catch {
      continue;
    }
  }

  // Fallback to Date.parse for edge cases
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const date = new Date(parsed);
    if (date.getFullYear() > 2100 || date.getFullYear() < 1900) return null;
    return date;
  }

  return null;
}

/**
 * Robustly parses various amount formats ($1.234,56 or -$1,234.56 or ($50.00)).
 */
export function parseAmount(amountStr: string): number | null {
  if (amountStr === undefined || amountStr === null) return null;
  const str = String(amountStr).trim().toUpperCase();
  if (!str) return null;

  let cleaned = str;

  // Handle markers: CR (Credit), DR (Debit)
  const isCredit = cleaned.includes('CR');
  const isDebit = cleaned.includes('DR');
  cleaned = cleaned.replace('CR', '').replace('DR', '').trim();

  // Handle parenthetical negatives: ($50.00) -> -50.00
  const isParenNegative = /^\(.*\)$/.test(cleaned);
  if (isParenNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Handle trailing negative: 50.00- -> -50.00
  const isTrailingNegative = /^[^-].*-$/.test(cleaned);
  if (isTrailingNegative) {
    cleaned = '-' + cleaned.slice(0, -1);
  }

  // Remove currency symbols and non-numeric except , . - and space/' for thousands
  cleaned = cleaned.replace(/[^0-9,.\- ']/g, '');

  // Handle space or apostrophe thousand separators
  cleaned = cleaned.replace(/[ ']/g, '');

  // Handle European format: 1.234,56 -> 1234.56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length === 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(',', '');
    }
  }

  let amount = parseFloat(cleaned);
  if (isNaN(amount)) return null;

  // Sign logic
  // Debits (charges, money leaving account) = NEGATIVE
  // Credits (refunds, money entering account) = POSITIVE
  if (isParenNegative || isTrailingNegative || isDebit) {
    // Parenthetical (50.00), trailing minus 50.00-, or DR marker = debit = negative
    amount = -Math.abs(amount);
  } else if (isCredit) {
    // CR marker = credit = positive
    amount = Math.abs(amount);
  }

  return amount;
}

interface ColumnMap {
  date: number;
  description: number;
  amount?: number;
  debit?: number;
  credit?: number;
}


const COLUMN_PATTERNS: Record<string, { regex: RegExp; score: number }[]> = {
  date: [
    { regex: /^transaction\s*date$/i, score: 100 },
    { regex: /^trans\s*date$/i, score: 95 },
    { regex: /^date$/i, score: 90 },
    { regex: /^posted\s*date$/i, score: 50 }, // Lower priority than Trans Date
    { regex: /date/i, score: 10 },
  ],
  description: [
    { regex: /^description$/i, score: 100 },
    { regex: /^desc$/i, score: 95 },
    { regex: /^payee$/i, score: 95 },
    { regex: /^merchant$/i, score: 95 },
    { regex: /^memo$/i, score: 90 },
    { regex: /^details$/i, score: 80 },
    { regex: /^item$/i, score: 80 },
    { regex: /description/i, score: 50 },
  ],
  amount: [
    { regex: /^amount$/i, score: 100 },
    { regex: /^cost$/i, score: 90 },
    { regex: /^value$/i, score: 80 },
    { regex: /^total$/i, score: 70 },
    { regex: /amount/i, score: 50 },
    // Removed /balance/i to prevent false positives
  ],
  debit: [
    { regex: /^debit$/i, score: 100 },
    { regex: /^withdrawal$/i, score: 90 },
    { regex: /^payment$/i, score: 80 },
  ],
  credit: [
    { regex: /^credit$/i, score: 100 },
    { regex: /^deposit$/i, score: 90 },
    { regex: /^refund$/i, score: 80 },
  ],
};

/**
 * Detects CSV columns based on headers using a scoring system.
 * Prioritizes exact matches and preferred terms (e.g. Transaction Date > Posted Date).
 */
export function detectColumns(headers: string[]): ColumnMap | null {
  const scores: Record<keyof ColumnMap, { index: number; score: number }> = {
    date: { index: -1, score: -1 },
    description: { index: -1, score: -1 },
    amount: { index: -1, score: -1 },
    debit: { index: -1, score: -1 },
    credit: { index: -1, score: -1 },
  };

  headers.forEach((header, index) => {
    if (!header) return;
    const normalized = header.trim(); // Keep case for regex flags

    // Check against all field types
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      const fieldKey = field as keyof ColumnMap;

      for (const { regex, score } of patterns) {
        if (regex.test(normalized)) {
          // If this match is better than what we have, take it
          if (score > scores[fieldKey].score) {
            scores[fieldKey] = { index, score };
          }
        }
      }
    }
  });

  // Construct Result Map
  const map: Partial<ColumnMap> = {};
  if (scores.date.index !== -1) map.date = scores.date.index;
  if (scores.description.index !== -1) map.description = scores.description.index;
  if (scores.amount.index !== -1) map.amount = scores.amount.index;
  if (scores.debit.index !== -1) map.debit = scores.debit.index;
  if (scores.credit.index !== -1) map.credit = scores.credit.index;

  // Validation Logic
  const hasDate = map.date !== undefined;
  const hasDesc = map.description !== undefined;
  const hasAmount = map.amount !== undefined;
  const hasSplitAmount = map.debit !== undefined || (map.debit !== undefined && map.credit !== undefined);

  if (hasDate && hasDesc && (hasAmount || hasSplitAmount)) {
    return map as ColumnMap;
  }

  return null;
}

/**
 * Fallback: Guess columns by looking at the actual data content.
 */
function guessColumnsFromContent(rows: string[][]): ColumnMap | null {
  if (rows.length === 0) return null;
  const numCols = rows[0].length;
  const map: Partial<ColumnMap> = {};

  // Statistical counting for each column across first 5 rows
  const colStats = Array.from({ length: numCols }, () => ({
    dateMatches: 0,
    amountMatches: 0,
    textLength: 0
  }));

  const sampleRows = rows.slice(0, 5);
  sampleRows.forEach(row => {
    row.forEach((cell, i) => {
      if (i >= numCols) return;
      if (parseDate(cell)) colStats[i].dateMatches++;
      if (parseAmount(cell) !== null) colStats[i].amountMatches++;
      colStats[i].textLength += cell.length;
    });
  });

  // Pick best date column
  const dateCol = colStats.findIndex(s => s.dateMatches >= sampleRows.length * 0.6);
  if (dateCol !== -1) map.date = dateCol;

  // Pick best amount column (excluding date column)
  const amountCol = colStats.findIndex((s, i) => i !== dateCol && s.amountMatches >= sampleRows.length * 0.6);
  if (amountCol !== -1) map.amount = amountCol;

  // Pick best description column (longest text, excluding date/amount)
  let bestDescCol = -1;
  let maxText = -1;
  colStats.forEach((s, i) => {
    if (i !== dateCol && i !== amountCol) {
      if (s.textLength > maxText) {
        maxText = s.textLength;
        bestDescCol = i;
      }
    }
  });
  if (bestDescCol !== -1) map.description = bestDescCol;

  if (map.date !== undefined && map.description !== undefined && map.amount !== undefined) {
    return map as ColumnMap;
  }
  return null;
}

export const parseCSVString = (content: string): Transaction[] => {
  const results = Papa.parse(content, {
    header: false,
    skipEmptyLines: true,
  });

  const rows = results.data as string[][];
  if (rows.length < 1) return [];

  let columnMap: ColumnMap | null = null;
  let dataStartIndex = 0;

  // 1. Try to find a header row in the first 10 rows
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const potentialHeaders = rows[i];
    const detected = detectColumns(potentialHeaders);
    if (detected) {
      columnMap = detected;
      dataStartIndex = i + 1;
      break;
    }
  }

  // 2. If no header row found, try guessing from content
  if (!columnMap) {
    columnMap = guessColumnsFromContent(rows);
    dataStartIndex = 0; // Guessing from content means row 0 might be data
  }

  if (!columnMap) return [];

  return rows.slice(dataStartIndex)
    .map((row) => {
      const dateStr = row[columnMap!.date];
      const desc = row[columnMap!.description];

      let amount: number | null = null;
      if (columnMap!.amount !== undefined) {
        amount = parseAmount(row[columnMap!.amount]);
      } else if (columnMap!.debit !== undefined || columnMap!.credit !== undefined) {
        const debit = columnMap!.debit !== undefined ? (parseAmount(row[columnMap!.debit]) || 0) : 0;
        const credit = columnMap!.credit !== undefined ? (parseAmount(row[columnMap!.credit]) || 0) : 0;
        // Standardize: Credits are POSITIVE, Debits/Charges are NEGATIVE
        // If we have separate columns, usually they are both positive strings
        // So amount = credit - debit
        // e.g. debit column has 15.99 -> amount = 0 - 15.99 = -15.99
        // e.g. credit column has 23.29 -> amount = 23.29 - 0 = 23.29
        amount = Math.abs(credit) - Math.abs(debit);
      }

      const dateObj = parseDate(dateStr);
      if (!dateObj || !desc || amount === null) return null;

      return {
        date: formatDateISO(dateObj),
        description: desc,
        amount: amount,
      };
    })
    .filter((t): t is Transaction => t !== null);
};

/**
 * Parses a CSV file into a standardized Transaction array.
 */
export const parseCSV = (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      try {
        const institution = detectBankFromContent(file.name, content);
        const transactions = parseCSVString(content).map(t => ({
          ...t,
          source: file.name,
          institution: institution !== 'Unknown' ? institution : undefined
        }));
        resolve(transactions);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
};

/**
 * Parses a PDF file extracting text line by line.
 * Uses a heuristic to find date/description/amount on the same line.
 */
export const parsePDF = async (file: File): Promise<Transaction[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // parsePDFBuffer now handles both loading and institution detection.
    // Pass the filename so it can extract the statement year from it.
    const transactions = await parsePDFBuffer(arrayBuffer, file.name);

    return transactions.map(t => ({
      ...t,
      source: file.name
    }));
  } catch (e) {
    console.error('PDF Parse Error in Browser', e);
    return [];
  }
};

/**
 * Core PDF Parsing Logic (Buffer-based for easier testing)
 */

/**
 * Detects the bank by scanning keywords on the first page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function detectBank(pdf: any): Promise<string> {
  try {
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const text = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((it: any) => (it.str && it.transform ? it.str : ''))
      .join(' ')
      .toUpperCase();


    if (text.includes('USAA FEDERAL SAVINGS BANK') || text.includes('USAA CLASSIC')) return 'USAA';
    if (text.includes('CITI ') || text.includes('CITIBANK') || text.includes('CITI CARD') || text.includes('COSTCO ANYWHERE')) return 'Citi';
    if (text.includes('E*TRADE') || text.includes('MORGAN STANLEY')) return 'ETrade';
    if (text.includes('SOFI SECURITIES') || text.includes('SOFI MONEY') || text.includes('SOFI BANK') || text.includes('SOFI.COM')) return 'SoFi';
    // Generic keyword matches (lower priority)
    if (text.includes('FIDELITY')) return 'Fidelity';
    if (text.includes('ROBINHOOD')) return 'Robinhood';
  } catch {
    // Bank detection failed, fallback to generic
  }
  return 'Unknown';
}

/**
 * Detects bank from CSV filename or first few lines of content.
 */
function detectBankFromContent(filename: string, content: string): string {
  const f = filename.toUpperCase();
  if (f.includes('CITI')) return 'Citi';
  if (f.includes('SOFI')) return 'SoFi';
  if (f.includes('USAA')) return 'USAA';
  if (f.includes('ETRADE')) return 'ETrade';
  if (f.includes('FIDELITY')) return 'Fidelity';
  if (f.includes('ROBINHOOD')) return 'Robinhood';

  // Check content headers
  const c = content.slice(0, 1000).toUpperCase();
  if (c.includes('CITIBANK') || c.includes('CITI CARD')) return 'Citi';
  if (c.includes('USAA FEDERAL SAVINGS BANK')) return 'USAA';
  if (c.includes('SOFI BANK')) return 'SoFi';
  if (c.includes('E*TRADE')) return 'ETrade';

  return 'Unknown';
}

/**
 * Specialized parser for USAA Bank Statements.
 * Handles multi-column layouts and multi-line descriptions using table-aware logic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseUSAASpecific(pdf: any): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];
  let currentColumnMap: { [key: string]: { xStart: number; xEnd: number } } | null = null;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItem[];
    if (items.length === 0) continue;

    const lineMap: { [key: number]: TextItem[] } = {};
    const jitter = 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.forEach((item: any) => {
      if (!item.transform || typeof item.str !== 'string') return;
      const y = Math.round(item.transform[5]);
      const targetYMatch = Object.keys(lineMap).find(ly => Math.abs(Number(ly) - y) <= jitter);
      const targetY = targetYMatch ? Number(targetYMatch) : y;
      if (!lineMap[targetY]) lineMap[targetY] = [];
      lineMap[targetY].push(item);
    });

    const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
    let pageTransactions: Transaction[] = [];
    let currentTx: Transaction | null = null;

    sortedYs.forEach(y => {
      const lineItems = lineMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
      const fullLine = lineItems.map(it => it.str).join(' ');

      if (/date.*description.*(debit|credit|amount|balance)/i.test(fullLine)) {
        const newMap: Record<string, { xStart: number; xEnd: number }> = {};
        lineItems.forEach((it, idx) => {
          const str = it.str.toLowerCase();
          const x = it.transform[4];
          const nextItem = lineItems[idx + 1];
          const xEnd = nextItem ? nextItem.transform[4] - 2 : x + 100;
          if (str.includes('date')) newMap.date = { xStart: x - 10, xEnd: xEnd };
          else if (str.includes('description')) newMap.desc = { xStart: x - 10, xEnd: xEnd };
          else if (str.includes('debit')) newMap.debit = { xStart: x - 20, xEnd: xEnd };
          else if (str.includes('credit')) newMap.credit = { xStart: x - 10, xEnd: xEnd };
          else if (str.includes('amount')) newMap.amount = { xStart: x - 20, xEnd: xEnd };
          else if (str.includes('balance')) newMap.balance = { xStart: x - 10, xEnd: xEnd + 100 };
        });
        if (newMap.date && newMap.desc) currentColumnMap = newMap;
      }
    });

    sortedYs.forEach(y => {
      const lineItems = lineMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
      const fullLine = lineItems.map(it => it.str).join(' ');
      const dateMatch = fullLine.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(\d{4}-\d{2}-\d{2})|([A-Za-z]{3}\s+\d{1,2})/);

      if (dateMatch) {
        const dateObj = parseDate(dateMatch[0]);
        if (dateObj) {
          const amountRegex = /(-?\$?\d{1,3}(?:,?\d{3})*\.\d{2})|(\(\$?\d{1,3}(?:,?\d{3})*\.\d{2}\))|(\$\d{1,3}(?:,?\d{3})*)/g;
          let amount: number | null = null;

          if (currentColumnMap && (currentColumnMap.debit || currentColumnMap.credit || currentColumnMap.amount)) {
            let debit = 0, credit = 0;
            lineItems.forEach(it => {
              const x = it.transform[4];
              const val = parseAmount(it.str);
              if (val !== null) {
                if (currentColumnMap?.debit && x >= currentColumnMap.debit.xStart - 50 && x < currentColumnMap.debit.xEnd + 10) debit = val;
                if (currentColumnMap?.credit && x >= currentColumnMap.credit.xStart - 10 && x < currentColumnMap.credit.xEnd + 10) credit = val;
                if (currentColumnMap?.amount && x >= currentColumnMap.amount.xStart - 50 && x < currentColumnMap.amount.xEnd + 10) amount = val;
              }
            });
            if (amount === null && (debit !== 0 || credit !== 0)) amount = Math.abs(credit) - Math.abs(debit);
          }
          if (amount === null) { // Fallback if column map didn't yield amount
            const amountMatch = fullLine.match(amountRegex);
            if (amountMatch) amount = parseAmount(amountMatch[0]);
          }


          if (amount !== null) {
            if (currentTx) pageTransactions.push(currentTx);
            let description = fullLine.replace(dateMatch[0], '');
            (fullLine.match(amountRegex) || []).forEach(a => { description = description.replace(a, ''); });
            description = description.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '').trim();
            currentTx = { date: formatDateISO(dateObj), description, amount: amount };
            return;
          }
        }
      }

      if (currentTx && fullLine.length > 2) {
        const hasAmount = /(-?\$?\d{1,3}(?:,?\d{3})*\.\d{2})/.test(fullLine);
        const isHeader = /date|description|amount|debit|credit|balance|statement|account/i.test(fullLine);
        const isSumLine = /ending balance|beginning balance|summary|total|interest paid/i.test(fullLine);
        if (!hasAmount && !isHeader && !isSumLine && currentTx.description.length < 300) {
          const descItems = currentColumnMap ? lineItems.filter(it => it.transform[4] >= (currentColumnMap?.desc.xStart || 0) && it.transform[4] < (currentColumnMap?.desc.xEnd || 350)) : lineItems;
          if (descItems.length > 0) {
            const extra = descItems.map(it => it.str).join(' ').trim();
            if (extra && !currentTx.description.includes(extra)) currentTx.description += ' ' + extra;
          }
        }
      }
    });

    if (currentTx) pageTransactions.push(currentTx);
    pageTransactions = pageTransactions.filter(tx => {
      const d = tx.description.toLowerCase();
      return tx.description.length > 2 &&
        !d.includes('beginning balance') &&
        !d.includes('ending balance') &&
        !d.includes('statement period') &&
        !d.includes('account number') &&
        !d.includes('interest paid');
    });
    allTransactions.push(...pageTransactions);
  }
  return allTransactions;
}

/**
 * Specialized parser for Citibank Credit Card Statements.
 * Handles multi-line descriptions and uses section-based amount sign logic.
 *
 * IMPORTANT: Credit card statements use opposite sign convention from bank statements.
 * On a credit card statement:
 *   - Positive amounts = charges (money you owe / spent) → should be NEGATIVE in our system
 *   - Negative amounts / credits = payments/refunds → should be POSITIVE in our system
 * We negate all amounts so that our standard convention (negative = expense) is maintained.
 *
 * @param pdf           - The loaded PDF.js document
 * @param statementYear - Year extracted from filename (e.g. 2025). When provided,
 *                        year-less dates like "02/27" resolve to that year instead of today.
 * @param statementMonth - Month extracted from filename (e.g. 3 for March). Used for year-less date resolution.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseCitiSpecific(pdf: any, statementYear?: number, statementMonth?: number | null): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const creditStartRegex = /Payments,\s*credits\s*and\s*adjustments/i;
  const standardPurchaseStartRegex = /Standard\s*purchases/i;
  const genericRowRegex = /^(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?\d{1,3}(?:,\d{3})*\.\d{2})(-)?$/;

  let inCreditSection = false;
  let inPurchaseSection = false;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((item: any) => item.str && item.str.trim() !== '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ({
        str: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5],
      }));

    let j = 0;
    while (j < items.length) {
      const text = items[j].str;

      if (creditStartRegex.test(text)) {
        inCreditSection = true;
        inPurchaseSection = false;
        j++;
        continue;
      }

      if (standardPurchaseStartRegex.test(text)) {
        inPurchaseSection = true;
        inCreditSection = false;
        j++;
        continue;
      }

      // ──────────────────────────────────────────────────────────────────
      // FIX: CITI MULTI-LINE ROW RECONSTRUCTION
      // Multi-line descriptions occur when the description wraps.
      // E.g.
      //  [Date] [Date] [Desc Pt 1]
      //  [Desc Pt 2]                      [Amount]
      // ──────────────────────────────────────────────────────────────────
      if (/^\d{2}\/\d{2}$/.test(text)) {
        const dateStr = text;
        let descStr = '';
        let amountStr = '';
        let isNegative = false;

        let k = j + 1;
        // Check if next item is also a date (Post Date)
        if (k < items.length && /^\d{2}\/\d{2}$/.test(items[k].str)) {
          k++;
        }

        // Gather description pieces until we hit an amount
        const amountRegex = /^-?\$?\d{1,3}(?:,\d{3})*\.\d{2}-?$/;
        while (k < items.length) {
          if (amountRegex.test(items[k].str)) {
            amountStr = items[k].str;
            if (k + 1 < items.length && items[k + 1].str === '-') {
              isNegative = true;
              k++;
            } else if (amountStr.endsWith('-') || amountStr.startsWith('-')) {
              isNegative = true;
              amountStr = amountStr.replace('-', '');
            }
            break;
          } else {
            descStr += (descStr ? ' ' : '') + items[k].str;
          }
          k++;
        }

        if (amountStr && descStr) {
          const rawAmount = parseAmount(amountStr);
          if (rawAmount !== null) {
            let finalAmount = isNegative ? -rawAmount : rawAmount;
            if (inCreditSection) {
              finalAmount = Math.abs(rawAmount);
            } else if (inPurchaseSection) {
              finalAmount = -Math.abs(rawAmount);
            } else if (finalAmount > 0) { // Default to negative for charges if no section detected
              finalAmount = -finalAmount;
            }

            const parsedDate = parseDate(dateStr, statementYear, statementMonth);
            if (parsedDate) {
              transactions.push({
                date: formatDateISO(parsedDate),
                description: descStr.replace(/\s+/g, ' ').trim(),
                amount: finalAmount,
              });
            }
          }
          j = k; // Advance past all items consumed for this transaction
          continue;
        }
      }

      // Fallback to single-line regex if multi-line reconstruction fails
      const match = text.match(genericRowRegex);
      if (match) {
        const dateStr = match[1];
        let description = match[2];
        const amountStr = match[3];
        const hasMinusSuffix = match[4] === '-';

        const rawAmount = parseAmount(amountStr);
        if (rawAmount !== null) {
          let finalAmount = rawAmount;
          if (hasMinusSuffix && finalAmount > 0) finalAmount = -finalAmount;

          if (inCreditSection) {
            finalAmount = Math.abs(finalAmount);
          } else if (inPurchaseSection) {
            finalAmount = -Math.abs(finalAmount);
          } else if (finalAmount > 0) { // Default to negative for charges if no section detected
            finalAmount = -finalAmount;
          }

          const parsedDate = parseDate(dateStr, statementYear, statementMonth);
          if (parsedDate) {
            description = description.replace(/\s+/g, ' ').trim();
            if (description.length > 2 &&
              !description.toLowerCase().includes('beginning balance') &&
              !description.toLowerCase().includes('new balance as of') &&
              !description.toLowerCase().includes('payment tracker') &&
              !description.toLowerCase().includes('thankyou points on') &&
              !description.toLowerCase().includes('thankyou points earned')) {
              transactions.push({ date: formatDateISO(parsedDate), description, amount: finalAmount });
            }
          }
        }
      }
      j++;
    }
  }
  return transactions;
}

/**
 * Specialized parser for E*TRADE formatted PDFs.
 * Handles multi-line descriptions and uses section-based amount sign logic.
 *
 * @param pdf           - The loaded PDF.js document
 * @param statementYear - Year extracted from filename (e.g. 2025). When provided,
 *                        year-less dates like "02/27" resolve to that year instead of today.
 * @param statementMonth - Month extracted from filename (e.g. 3 for March). Used for year-less date resolution.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseEtradeSpecific(pdf: any, statementYear?: number, statementMonth?: number | null): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const checkingActivityRegex = /CHECKING\s*ACTIVITY/i;
  const atmDebitRegex = /ATM\s*&\s*Debit\s*Card\s*Withdrawals/i;

  let inCheckingActivity = false;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((item: any) => item.str && item.str.trim() !== '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ({
        str: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5],
      }));

    let j = 0;
    while (j < items.length) {
      const text = items[j].str;

      if (checkingActivityRegex.test(text) || atmDebitRegex.test(text)) {
        inCheckingActivity = true;
        j++;
        continue;
      }

      if (inCheckingActivity) {
        if (/^\d{2}\/\d{2}$/.test(text)) {
          const dateStr = text;
          let descStr = '';
          let amountStr = '';
          let isNegative = false;
          let isIncoming = false;

          let k = j + 1;
          const amountRegex = /^-?\$?(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2}$/;
          while (k < items.length) {
            if (amountRegex.test(items[k].str)) {
              amountStr = items[k].str;
              if (amountStr.startsWith('-')) {
                isNegative = true;
                amountStr = amountStr.replace('-', '');
              }
              break;
            } else {
              descStr += (descStr ? ' ' : '') + items[k].str;
            }
            k++;
          }

          if (descStr.toLowerCase().includes('deposit') || descStr.toLowerCase().includes('credit')) {
            isIncoming = true;
          }

          if (amountStr && descStr) {
            const rawAmount = parseAmount(amountStr);
            if (rawAmount !== null) {
              let finalAmount = isNegative ? -rawAmount : rawAmount;
              if (isIncoming && finalAmount < 0) finalAmount = Math.abs(finalAmount);
              if (!isIncoming && finalAmount > 0) finalAmount = -Math.abs(finalAmount);

              const parsedDate = parseDate(dateStr, statementYear, statementMonth);
              if (parsedDate) {
                transactions.push({
                  date: formatDateISO(parsedDate),
                  description: descStr.replace(/\s+/g, ' ').trim(),
                  amount: finalAmount,
                });
              }
            }
            j = k; // Advance past all items consumed for this transaction
            continue;
          }
        }
      }
      j++;
    }
  }
  return transactions;
}

/**
 * Specialized parser for SOFI Bank / SoFi Money / SoFi Securities Statements.
 * Handles the multi-column table layout unique to SoFi statements with coordinate-based parsing.
 * Skips boilerplate rows/sections (FDIC disclosures, balance sweeps, rewards redemptions).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseSofiSpecific(pdf: any): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];
  // Column map persists across pages (multi-page statements share structure)
  let currentColumnMap: { [key: string]: { xStart: number; xEnd: number } } | null = null;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItem[];
    if (items.length === 0) continue;

    const lineMap: { [key: number]: TextItem[] } = {};
    const jitter = 2;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.forEach((item: any) => {
      if (!item.transform || typeof item.str !== 'string') return;
      const y = Math.round(item.transform[5]);
      const targetYMatch = Object.keys(lineMap).find(ly => Math.abs(Number(ly) - y) <= jitter);
      const targetY = targetYMatch ? Number(targetYMatch) : y;
      if (!lineMap[targetY]) lineMap[targetY] = [];
      lineMap[targetY].push(item);
    });

    const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
    let pageTransactions: Transaction[] = [];
    let currentTx: Transaction | null = null;
    // Track whether we've entered the "Important Information" section within this page
    let inBoilerplateSection = false;

    sortedYs.forEach(y => {
      if (inBoilerplateSection) return; // Skip rest of page once we hit boilerplate

      const lineItems = lineMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
      const fullLine = lineItems.map(it => it.str).join(' ');

      // Detect when we've entered the boilerplate footer section and stop processing
      if (/^(important information|sofi insured deposit program|how to contact us|deposit agreement|for participants in the sofi)/i.test(fullLine.trim())) {
        if (currentTx) { pageTransactions.push(currentTx); currentTx = null; }
        inBoilerplateSection = true;
        return;
      }

      // Detect column header row: "DATE TYPE DESCRIPTION AMOUNT BALANCE"
      if (/date.*description.*(amount|balance)/i.test(fullLine)) {
        const newMap: Record<string, { xStart: number; xEnd: number }> = {};
        lineItems.forEach((it, idx) => {
          const str = it.str.toLowerCase().trim();
          const x = it.transform[4];
          const nextItem = lineItems[idx + 1];
          const xEnd = nextItem ? nextItem.transform[4] - 2 : x + 200;
          if (str === 'date') newMap.date = { xStart: x - 10, xEnd: xEnd };
          else if (str === 'type') newMap.type = { xStart: x - 5, xEnd: xEnd };
          else if (str === 'description') newMap.desc = { xStart: x - 10, xEnd: xEnd };
          else if (str === 'amount') newMap.amount = { xStart: x - 30, xEnd: xEnd + 30 };
          else if (str === 'balance') newMap.balance = { xStart: x - 10, xEnd: xEnd + 100 };
        });
        if (newMap.date && newMap.desc) currentColumnMap = newMap;
        return;
      }

      // Try to parse a date at the start of the line (transaction row detection)
      // NOTE: SoFi PDF text items often have leading spaces; trimStart before matching
      const trimmedLine = fullLine.trimStart();
      const dateMatch = trimmedLine.match(/^([A-Za-z]{3}\s+\d{1,2}(?:,?\s+\d{4})?)/);

      if (dateMatch) {
        const dateObj = parseDate(dateMatch[0]);
        if (dateObj) {
          let amount: number | null = null;

          if (currentColumnMap?.amount) {
            // STRICT: Only accept amounts within the AMOUNT column boundaries
            lineItems.forEach(it => {
              const x = it.transform[4];
              const val = parseAmount(it.str);
              if (val !== null && x >= currentColumnMap!.amount.xStart && x <= currentColumnMap!.amount.xEnd) {
                amount = val;
              }
            });
          } else {
            // No column map yet — use first amount found (older SoFi Money format fallback)
            const amountMatch = fullLine.match(/(-?\$?\d{1,3}(?:,?\d{3})*\.\d{2})|(\(\$?\d{1,3}(?:,?\d{3})*\.\d{2}\))/);
            if (amountMatch) amount = parseAmount(amountMatch[0]);
          }

          if (amount !== null) {
            if (currentTx) pageTransactions.push(currentTx);

            // Build description from TYPE + DESCRIPTION columns (or full line fallback)
            let description = '';
            if (currentColumnMap) {
              let typeStr = '';
              let descStr = '';
              if (currentColumnMap.type) {
                const typeItems = lineItems.filter(it => it.transform[4] >= currentColumnMap!.type.xStart && it.transform[4] < currentColumnMap!.type.xEnd);
                typeStr = typeItems.map(it => it.str).join(' ').trim();
              }
              if (currentColumnMap.desc) {
                const descItems = lineItems.filter(it => it.transform[4] >= currentColumnMap!.desc.xStart && it.transform[4] < currentColumnMap!.desc.xEnd);
                descStr = descItems.map(it => it.str).join(' ').trim();
              }
              if (typeStr && descStr && !descStr.toLowerCase().includes(typeStr.toLowerCase())) {
                description = `${typeStr} ${descStr}`.trim();
              } else {
                description = descStr || typeStr;
              }
            } else {
              // Fallback: strip date and amount from the line
              const amountMatch = fullLine.match(/(-?\$?\d{1,3}(?:,?\d{3})*\.\d{2})|(\(\$?\d{1,3}(?:,?\d{3})*\.\d{2}\))/g);
              description = fullLine.replace(dateMatch[0], '');
              (amountMatch || []).forEach(a => { description = description.replace(a, ''); });
              description = description.trim();
            }

            currentTx = { date: formatDateISO(dateObj), description, amount };
            return;
          }
        }
      }

      // Append continuation lines (e.g. Transaction ID lines)
      if (currentTx && fullLine.length > 2) {
        const hasAmount = /(-?\$?\d{1,3}(?:,?\d{3})*\.\d{2})/.test(fullLine);
        const isHeader = /date.*description/i.test(fullLine);
        const isFooter = /^(sofi (bank|securities|money)|member fdic|page \d+ of|www\.sofi)/i.test(fullLine.trim());
        if (!hasAmount && !isHeader && !isFooter) {
          const descStart = currentColumnMap?.desc.xStart ?? 0;
          const descEnd = currentColumnMap?.desc.xEnd ?? 600;
          const descItems = lineItems.filter(it => it.transform[4] >= descStart && it.transform[4] < descEnd);
          if (descItems.length > 0) {
            const extra = descItems.map(it => it.str).join(' ').trim();
            if (extra && !currentTx.description.includes(extra) && extra.length < 120) {
              currentTx.description += ' ' + extra;
            }
          }
        }
      }
    });

    if (currentTx) pageTransactions.push(currentTx);

    // --- Final SoFi cleanup ---
    pageTransactions.forEach(t => {
      t.description = t.description
        .replace(/Mailing Address SoFi (Securities|Bank).*$/i, '')
        .replace(/^\s*-\s*/, '')
        .replace(/[|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    });

    pageTransactions = pageTransactions.filter(t => {
      const d = t.description.toLowerCase();
      // Filter FDIC balance sweep notices (legal disclosures, not real transactions)
      if (d.includes('we moved balances over') || d.includes('participating banks') || d.includes('breakdown of how those funds')) return false;
      // Filter SoFi Rewards Redemption interest entries
      if (d.includes('sofi rewards redemption')) return false;
      // Filter zero and near-zero amounts
      if (Math.abs(t.amount) < 0.01) return false;
      // Filter very short or empty descriptions
      if (t.description.length < 3) return false;
      return true;
    });

    allTransactions.push(...pageTransactions);
  }
  return allTransactions;
}

/**
 * Generic PDF parser for unrecognized bank formats.
 * Uses a simpler regex-based logic to maintain stability for existing formats.
 *
 * @param pdf           - The loaded PDF.js document
 * @param statementYear - Year extracted from filename (e.g. 2025). When provided,
 *                        year-less dates like "02/27" resolve to that year instead of today.
 * @param statementMonth - Month extracted from filename (e.g. 3 for March). Used for year-less date resolution.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseGenericSpecific(pdf: any, statementYear?: number, statementMonth?: number | null): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const genericRowRegex = /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+(-?\$?\d{1,3}(?:,\d{3})*\.\d{2})(-)?$/;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = textContent.items.map((item: any) => item.str).join(' ').split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const match = trimmedLine.match(genericRowRegex);
      if (match) {
        const dateStr = match[1];
        let description = match[2];
        const amountStr = match[3];
        const hasMinusSuffix = match[4] === '-';

        const rawAmount = parseAmount(amountStr);
        if (rawAmount !== null && rawAmount !== 0) {
          let finalAmount = rawAmount;
          if (hasMinusSuffix && finalAmount > 0) finalAmount = -finalAmount;
          if (description.toLowerCase().includes('refund') || description.toLowerCase().includes('credit')) {
            if (finalAmount < 0) finalAmount = Math.abs(finalAmount);
          } else {
            if (finalAmount > 0) finalAmount = -Math.abs(finalAmount);
          }

          const parsedDate = parseDate(dateStr, statementYear, statementMonth);
          if (parsedDate) {
            description = description.replace(/\s+/g, ' ').trim();
            transactions.push({ date: formatDateISO(parsedDate), description, amount: finalAmount });
          }
        }
      }
    }
  }
  return transactions;
}

/**
 * Core PDF Parsing Logic (Buffer-based for easier testing)
 *
 * @param arrayBuffer  - Raw PDF bytes
 * @param filename     - Optional: the original filename (e.g. "2025 March 05 Citi.pdf").
 *                       Used to extract the statement year so that year-less dates in
 *                       the PDF resolve to the correct year instead of today's year.
 */
export const parsePDFBuffer = async (arrayBuffer: ArrayBuffer, filename?: string): Promise<Transaction[]> => {
  try {
    // Wrap in Uint8Array to prevent PDF.js from detaching/transferring the raw ArrayBuffer
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), verbosity: 0 }).promise;
    let transactions: Transaction[] = [];

    const bank = await detectBank(pdf);

    // Extract year and month context from filename if provided (e.g. "2025 March 05 Citi.pdf")
    const context = filename ? extractStatementContext(filename) : null;
    const stmtYear = context?.year;
    const stmtMonth = context?.month;

    if (bank.toUpperCase() === 'USAA') { // Use .toUpperCase() for consistency
      transactions = await parseUSAASpecific(pdf);
    } else if (bank.toUpperCase() === 'CITI') {
      transactions = await parseCitiSpecific(pdf, stmtYear, stmtMonth);
    } else if (bank.toUpperCase() === 'ETRADE') {
      transactions = await parseEtradeSpecific(pdf, stmtYear, stmtMonth);
    } else if (bank.toUpperCase() === 'SOFI') {
      transactions = await parseSofiSpecific(pdf);
    } else {
      transactions = await parseGenericSpecific(pdf, stmtYear, stmtMonth);
    }

    // Attach institution to each transaction
    return transactions.map(t => ({
      ...t,
      institution: bank !== 'Unknown' ? bank : undefined
    }));
  } catch (e) {
    console.error('PDF Parse Error Internal', e);
    return [];
  }
};


/**
 * Validates if the uploaded file is a supported CSV or PDF.
 */
export const isSupportedFile = (file: File) =>
  file.type === 'text/csv' ||
  file.name.endsWith('.csv') ||
  file.type === 'application/pdf' ||
  file.name.endsWith('.pdf');
