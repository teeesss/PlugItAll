import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use legacy build for Node.js
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Resolve project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pdfPath = path.join(projectRoot, 'pdfs', 'test.pdf');

console.log(`\n${'='.repeat(60)}`);
console.log(`  PDF DEBUG ANALYSIS: ${pdfPath}`);
console.log(`${'='.repeat(60)}\n`);

if (!fs.existsSync(pdfPath)) {
  console.error('Error: pdfs/test.pdf not found!');
  process.exit(1);
}

const buffer = fs.readFileSync(pdfPath);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

// Inline parsing logic (same as parser.ts but without browser-specific worker)
async function parsePDFLocal(arrayBuffer: ArrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const transactions: { date: string; description: string; amount: number }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = textContent.items as any[];

    // Group items by Y coordinate (same line)
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
          const currentYear = new Date().getFullYear();
          date = `${date}/${currentYear}`;
        }

        const amountStr = amountMatch[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);

        if (isNaN(amount)) return;

        let description = fullLine
          .replace(dateMatch[0], '')
          .replace(amountMatch[0], '')
          .replace(amountMatch[1], '')
          .trim();

        description = description.replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '');
        description = description
          .replace(/^\s*-\s*/, '')
          .replace(/[|]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (description.length > 2) {
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
}

// Normalizer (copy from src to avoid import issues)
function normalizeDescription(raw: string): string {
  let clean = raw.toUpperCase();
  clean = clean.replace(/\b(POS|ACH|DEBIT|CREDIT|RECURRING|PAYMENT|WITHDRAWAL)\b/g, ' ');
  clean = clean.replace(/\b\d{1,2}[/-]\d{1,2}\b/g, ' ');
  clean = clean.replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}\b/g, ' ');
  clean = clean.replace(/[*#]\s*\d+/g, ' ');
  clean = clean.replace(/\b\d{4,}\b/g, ' ');
  clean = clean.replace(/[*-.#]/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  if (clean.includes('NETFLIX')) return 'NETFLIX';
  if (clean.includes('SPOTIFY')) return 'SPOTIFY';
  if (clean.includes('AMZN') || clean.includes('AMAZON')) return 'AMAZON';
  return clean;
}

parsePDFLocal(arrayBuffer)
  .then((transactions) => {
    console.log(`\n📄 PARSED ${transactions.length} TRANSACTIONS\n`);

    if (transactions.length === 0) {
      console.log('❌ WARNING: No transactions found. The regex/heuristic might be failing.');
      return;
    }

    // Print ALL transactions
    console.log(`--- ALL PARSED TRANSACTIONS ---`);
    transactions.forEach((t, i) => {
      const normalized = normalizeDescription(t.description);
      console.log(
        `${(i + 1).toString().padStart(3)}: ${t.date.padEnd(12)} | $${t.amount.toFixed(2).padStart(8)} | ${t.description.substring(0, 50).padEnd(50)} => "${normalized}"`
      );
    });

    // Look for specific keywords
    console.log(`\n--- KEYWORD SEARCH ---`);
    const keywords = ['VISIBLE', 'GOOGLE', 'NETFLIX', 'SIRIUS', 'LIVEOAK', 'FIBER'];
    keywords.forEach((kw) => {
      const matches = transactions.filter((t) => t.description.toUpperCase().includes(kw));
      console.log(`  "${kw}": ${matches.length} matches`);
      matches.forEach((m) => console.log(`      -> ${m.date} | $${m.amount} | ${m.description}`));
    });

    console.log(`\n--- DONE ---\n`);
  })
  .catch((err) => {
    console.error('FATAL ERROR:', err);
  });
