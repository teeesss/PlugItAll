/**
 * Real-World CSV+PDF Combination Test
 *
 * This test uses the user's actual CSV and PDF files to:
 * 1. Reproduce the false positive issue
 * 2. Ensure the fix works
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { detectSubscriptions } from '../src/utils/analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface Transaction {
  date: string;
  description: string;
  amount: number;
}

const csvTransactions: Transaction[] = [];
const pdfTransactions: Transaction[] = [];
let dedupedCombined: Transaction[] = [];

describe('Real User Data: CSV + PDF Combined', () => {
  beforeAll(async () => {
    // Parse all CSVs
    const csvDir = path.join(projectRoot, 'csvs');
    const files = fs.readdirSync(csvDir).filter((f) => f.endsWith('.CSV') || f.endsWith('.csv'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(csvDir, file), 'utf-8');
      const result = Papa.parse(content, { header: true, skipEmptyLines: true });

      result.data.forEach((row) => {
        const r = row as Record<string, string>;
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

        if (date && desc && !isNaN(amount) && amount !== 0) {
          csvTransactions.push({ date, description: desc, amount: Math.abs(amount) });
        }
      });
    }

    // Parse PDF
    const pdfPath = path.join(projectRoot, 'pdfs', 'test.pdf');
    if (fs.existsSync(pdfPath)) {
      const buffer = fs.readFileSync(pdfPath);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = textContent.items as any[];

        const lines: { [key: number]: string[] } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items.forEach((item: any) => {
          if (!item.str) return;
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push(item.str);
        });

        Object.values(lines).forEach((lineParts) => {
          const fullLine = lineParts.join(' ');
          const dateMatch = fullLine.match(/(\d{1,2}\/\d{1,2}(\/\d{2,4})?)|(\d{4}-\d{2}-\d{2})/);
          const amountMatch = fullLine.match(/-?\$?(\d{1,3}(?:,?\d{3})*\.\d{2})/);

          if (dateMatch && amountMatch) {
            let date = dateMatch[0];
            if (date.match(/^\d{1,2}\/\d{1,2}$/)) {
              date = `${date}/2026`;
            }
            const amountStr = amountMatch[1].replace(/,/g, '');
            const amount = parseFloat(amountStr);
            if (isNaN(amount)) return;

            const description = fullLine
              .replace(dateMatch[0], '')
              .replace(amountMatch[0], '')
              .replace(amountMatch[1], '')
              .trim()
              .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '')
              .replace(/^\s*-\s*/, '')
              .replace(/\s+/g, ' ')
              .trim();

            if (description.length > 2) {
              pdfTransactions.push({ date, description, amount: Math.abs(amount) });
            }
          }
        });
      }
    }

    // Deduplicate combined (same logic as App.tsx)
    const allTransactions = [...csvTransactions, ...pdfTransactions];
    const seen = new Set<string>();
    dedupedCombined = allTransactions.filter((t) => {
      const descPrefix = t.description.substring(0, 20).toUpperCase().trim();
      const key = `${t.date}-${t.amount.toFixed(2)}-${descPrefix}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(
      `CSV: ${csvTransactions.length}, PDF: ${pdfTransactions.length}, Combined Deduped: ${dedupedCombined.length}`
    );
  });

  it('should detect VALID subscriptions from combined data', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const names = subs.map((s) => s.name.toUpperCase());

    // Real subscriptions should be detected
    expect(names).toContain('VISIBLE');
    expect(names.some((n) => n.includes('YOUTUBE TV') || n.includes('YOUTUBETV'))).toBe(true);
    expect(names.some((n) => n.includes('SIRIUSXM'))).toBe(true);
    expect(names.some((n) => n.includes('LIVEOAK'))).toBe(true);

    // Confidence checks
    const visibleSubs = subs.filter((s) => s.name === 'VISIBLE');
    expect(visibleSubs.some((s) => s.confidence === 'High')).toBe(true);

    const nyt = subs.find((s) => s.name.toUpperCase().includes('NYT'));
    if (nyt) {
      expect(nyt.confidence).toBe('High'); // Consistently charged unknown merchant promoted to High
    }

    const ebay = subs.find((s) => s.name.toUpperCase().includes('EBAY'));
    expect(ebay).toBeUndefined(); // Should be rejected by blacklist or shopping pattern logic
  });

  it('should NOT detect DOLLARTREE as subscription (variable prices)', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const dollarTree = subs.filter((s) => s.name.toUpperCase().includes('DOLLARTREE'));
    expect(dollarTree.length).toBe(0);
  });

  it('should NOT detect GPS SARAZONA as subscription (one-off travel)', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const sarazona = subs.filter((s) => s.name.toUpperCase().includes('SARAZONA'));
    expect(sarazona.length).toBe(0);
  });

  it('should NOT detect THE HUDSON as subscription (one-off)', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const hudson = subs.filter((s) => s.name.toUpperCase().includes('HUDSON'));
    expect(hudson.length).toBe(0);
  });

  it('should NOT detect TST MARIPOSA as subscription (restaurant)', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const mariposa = subs.filter((s) => s.name.toUpperCase().includes('MARIPOSA'));
    expect(mariposa.length).toBe(0);
  });

  it('should NOT detect WWW G2G COM as subscription', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const g2g = subs.filter((s) => s.name.toUpperCase().includes('G2G'));
    expect(g2g.length).toBe(0);
  });

  it('should NOT detect CVS as subscription (pharmacy visits)', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const cvs = subs.filter((s) => s.name.toUpperCase().includes('CVS'));
    expect(cvs.length).toBe(0);
  });

  it('should detect BOTH Visible plans ($35 and $25)', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const visible = subs.filter((s) => s.name.toUpperCase().includes('VISIBLE'));
    expect(visible.length).toBeGreaterThanOrEqual(2);

    const amounts = visible.map((v) => Math.round(v.averageAmount));
    expect(amounts).toContain(35);
    expect(amounts).toContain(25);
  });

  it('should detect Netflix', () => {
    const subs = detectSubscriptions(dedupedCombined);
    const netflix = subs.filter((s) => s.name.toUpperCase().includes('NETFLIX'));
    expect(netflix.length).toBeGreaterThanOrEqual(1);
  });
});
