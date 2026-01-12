import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { Transaction } from '../mocks/statements';

// Initialize PDF.js worker
// Use unpkg for the worker to avoid local build issues with Vite for now
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Parses a CSV file into a standardized Transaction array.
 */
export const parseCSV = (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions: Transaction[] = (results.data as unknown[])
          .map((row) => {
            const r = row as Record<string, string>;
            // Normalize keys to handle different bank formats
            const keys = Object.keys(r);
            const dateKey = keys.find((k) => k.toLowerCase().includes('date'));
            const descKey = keys.find(
              (k) =>
                k.toLowerCase().includes('description') ||
                k.toLowerCase().includes('merchant') ||
                k.toLowerCase().includes('name')
            );
            const amountKey = keys.find(
              (k) => k.toLowerCase().includes('amount') || k.toLowerCase().includes('debit')
            );

            const date = dateKey ? r[dateKey] : null;
            const desc = descKey ? r[descKey] : null;
            const amountRaw = amountKey ? r[amountKey] : '0';
            const amount = parseFloat(
              typeof amountRaw === 'string' ? amountRaw.replace(/[^0-9.-]+/g, '') : amountRaw
            );

            if (!date || !desc || isNaN(amount)) {
              return null; // Skip invalid rows
            }

            return {
              date,
              description: desc,
              amount: Math.abs(amount), // Ensure positive number
            };
          })
          .filter((t): t is Transaction => t !== null);

        resolve(transactions);
      },
      error: (error) => {
        reject(error);
      },
    });
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
export const parsePDFBuffer = async (arrayBuffer: ArrayBuffer): Promise<Transaction[]> => {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const transactions: Transaction[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as TextItem[];

      // Group items by Y coordinate (same line)
      // Note: PDF coordinates often have small floating point differences
      const lines: { [key: number]: string[] } = {};
      items.forEach((item) => {
        const y = Math.round(item.transform[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push(item.str);
      });

      Object.values(lines).forEach((lineParts) => {
        const fullLine = lineParts.join(' ');

        // Regex for Date (MM/DD or MM/DD/YYYY or YYYY-MM-DD or MM/DD/YY)
        // Expanded to catch more formats
        const dateMatch = fullLine.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(\d{4}-\d{2}-\d{2})/);

        // Regex for Amount ($xx.xx or xx.xx) - Looking for dot and two decimals
        const amountMatch = fullLine.match(/-?\$?(\d{1,3}(?:,?\d{3})*\.\d{2})/);

        if (dateMatch && amountMatch) {
          let date = dateMatch[0];
          // If date is MM/DD, append current year to make it valid for Date constructor
          if (date.match(/^\d{1,2}\/\d{1,2}$/)) {
            const currentYear = new Date().getFullYear();
            date = `${date}/${currentYear}`;
          }

          // Clean amount string to number
          const amountStr = amountMatch[1].replace(/,/g, '');
          const amount = parseFloat(amountStr);

          if (isNaN(amount)) return;

          // Description Extraction Strategy:
          // Remove Date and Amount match from line.
          let description = fullLine
            .replace(dateMatch[0], '') // Remove first date
            .replace(amountMatch[0], '') // Remove '$10.00'
            .replace(amountMatch[1], '') // Remove '10.00' Just in case
            .trim();

          // Remove any remaining date-like patterns (MM/DD or MM/DD/YYYY) from description
          // This handles cases where Trans Date and Post Date are both present
          description = description.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '');

          // Cleanup common garbage and special chars
          description = description
            .replace(/^\s*-\s*/, '') // Leading dash
            .replace(/[|]/g, ' ') // Remove pipes if any (though unlikely with join(' '))
            .replace(/\s+/g, ' ') // Multiple spaces to single
            .trim();

          if (description.length > 2) {
            // Allow shorter but valid names
            transactions.push({
              date,
              description,
              amount: Math.abs(amount),
            });
          }
        }
      });
    }
    return transactions;
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
