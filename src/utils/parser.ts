import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// @ts-ignore
import type { TextItem, PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
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

/**
 * Robustly parses various date formats.
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

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
            y = new Date().getFullYear();
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

          // Handle Year Rollover: If no explicit year was provided and the date is > 1 month 
          // in the future relative to "now", it's likely from last year (e.g. Dec in Jan).
          if (date && !explicitYear) {
            const now = new Date();
            const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (date > oneMonthFromNow) {
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
          const year = match[3] ? +match[3] : new Date().getFullYear();
          date = new Date(`${match[1]} ${match[2]}, ${year}`);
          if (date && !hasYear) {
            const now = new Date();
            const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (date > oneMonthFromNow) {
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

      // Final validation to catch overflow from Date constructor
      if (date && !isNaN(date.getTime())) {
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

const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  date: [/date/i, /posted/i, /trans.*date/i, /when/i],
  description: [/description/i, /payee/i, /merchant/i, /name/i, /memo/i, /details/i],
  amount: [/amount/i, /sum/i, /total/i, /value/i, /balance/i],
  debit: [/debit/i, /withdrawal/i, /payment/i],
  credit: [/credit/i, /deposit/i, /refund/i],
};

/**
 * Detects CSV columns based on headers.
 */
export function detectColumns(headers: string[]): ColumnMap | null {
  const map: Partial<ColumnMap> = {};

  headers.forEach((header, index) => {
    if (!header) return;
    const normalized = header.toLowerCase().trim();
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (patterns.some((p) => p.test(normalized))) {
        if (!(field in map)) {
          (map as Record<string, number>)[field] = index;
        }
      }
    }
  });

  // Valid if we have Date, Description, AND some form of Amount
  if (map.date !== undefined && map.description !== undefined &&
    (map.amount !== undefined || (map.debit !== undefined && map.credit !== undefined) || map.debit !== undefined)) {
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
        date: dateObj.toLocaleDateString(),
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
        const transactions = parseCSVString(content);
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
    return await parsePDFBuffer(arrayBuffer);
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
    if (text.includes('CITI ') || text.includes('CITIBANK') || text.includes('CITI CARD')) return 'CITI';
    if (text.includes('E*TRADE') || text.includes('MORGAN STANLEY')) return 'ETRADE';
  } catch (_e) {
    // Bank detection failed, fallback to generic
  }
  return 'GENERIC';
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
      const lineText = lineItems.map(it => it.str).join(' ');

      if (/date.*description.*(debit|credit|amount|balance)/i.test(lineText)) {
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
          const amountMatch = fullLine.match(amountRegex);
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
          if (amount === null && amountMatch) amount = parseAmount(amountMatch[0]);

          if (amount !== null) {
            if (currentTx) pageTransactions.push(currentTx);
            let description = fullLine.replace(dateMatch[0], '');
            (amountMatch || []).forEach(a => { description = description.replace(a, ''); });
            description = description.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '').trim();
            currentTx = { date: dateObj.toLocaleDateString(), description, amount: amount };
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
 * Specialized parser for Citibank Statements.
 * Uses a simpler regex-based logic to maintain stability for existing formats.
 * "Never touched" by USAA specific changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseCitiSpecific(pdf: any): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItem[];
    const lines: { [key: number]: string[] } = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.forEach((item: any) => {
      if (!item.transform || typeof item.str !== 'string') return;
      const y = Math.round(item.transform[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push(item.str);
    });

    Object.values(lines).forEach((lineParts) => {
      const fullLine = lineParts.join(' ');
      const dateMatch = fullLine.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(\d{4}-\d{2}-\d{2})|([A-Za-z]{3}\s+\d{1,2})/);
      const amountMatch = fullLine.match(/(-?\$?\d{1,3}(?:,?\d{3})*\.\d{2})|(\(\$?\d{1,3}(?:,?\d{3})*\.\d{2}\))|(\$\d{1,3}(?:,?\d{3})*)/);

      if (dateMatch && amountMatch) {
        const dateObj = parseDate(dateMatch[0]);
        const amount = parseAmount(amountMatch[0]);
        if (dateObj && amount !== null) {
          let description = fullLine.replace(dateMatch[0], '').replace(amountMatch[0], '').trim();
          description = description.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '');
          description = description.replace(/^\s*-\s*/, '').replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
          if (description.length > 2 && !description.toLowerCase().includes('beginning balance')) {
            transactions.push({ date: dateObj.toLocaleDateString(), description, amount: amount });
          }
        }
      }
    });
  }
  return transactions;
}

/**
 * Specialized parser for E*TRADE formatted PDFs.
 * Currently reuses the robust Citi/Generic regex logic which works well for line-by-line statements.
 * Added to support future specific tweaks for Etrade garbage removal.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseEtradeSpecific(pdf: any): Promise<Transaction[]> {
  // Reuse the regex-based line parser as it effectively handles Etrade's standard statements
  return parseCitiSpecific(pdf);
}

/**
 * Generic PDF parser for unrecognized bank formats.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseGenericSpecific(pdf: any): Promise<Transaction[]> {
  return parseCitiSpecific(pdf); // Fallback to classic regex-based parser
}

/**
 * Core PDF Parsing Logic (Buffer-based for easier testing)
 */
export const parsePDFBuffer = async (arrayBuffer: ArrayBuffer): Promise<Transaction[]> => {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
    const bank = await detectBank(pdf);

    if (bank === 'USAA') return await parseUSAASpecific(pdf);
    if (bank === 'CITI') return await parseCitiSpecific(pdf);
    if (bank === 'ETRADE') return await parseEtradeSpecific(pdf);
    return await parseGenericSpecific(pdf);
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
