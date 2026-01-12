import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Use standard require for legacy build if possible, or dynamic import
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const pdfPath = path.join(projectRoot, 'pdfs', 'test.pdf');

async function dumpText() {
  console.log(`Reading ${pdfPath}...`);
  const buffer = fs.readFileSync(pdfPath);
  const data = new Uint8Array(buffer); // Convert Buffer to Uint8Array/ArrayBuffer view

  try {
    const loadingTask = pdfjsLib.getDocument({
      data,
      standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
      disableFontFace: true,
    });
    const pdf = await loadingTask.promise;
    console.log(`PDF Loaded. Pages: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const lines: { [key: number]: string[] } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      textContent.items.forEach((item: any) => {
        const y = Math.round(item.transform[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push(item.str);
      });

      const reconstructed = Object.keys(lines)
        .sort((a, b) => Number(b) - Number(a))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((y) => lines[y as any].join('|')); // Keep pipes

      const fullText = reconstructed.join('\n');

      if (
        fullText.includes('Date') &&
        (fullText.includes('Description') || fullText.includes('Merchant'))
      ) {
        console.log(`--- Page ${i} Parsing Test ---`);

        reconstructed.forEach((fullLine) => {
          // Regex for Date (MM/DD or MM/DD/YYYY or YYYY-MM-DD or MM/DD/YY)
          // Expanded to catch more formats
          const dateMatch = fullLine.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(\d{4}-\d{2}-\d{2})/);

          // Regex for Amount ($xx.xx or xx.xx) - Looking for dot and two decimals
          const amountMatch = fullLine.match(/-?\$?(\d{1,3}(?:,?\d{3})*\.\d{2})/);

          if (dateMatch && amountMatch) {
            const date = dateMatch[0];
            // Description Extraction Strategy:
            let description = fullLine
              .replace(dateMatch[0], '')
              .replace(amountMatch[0], '')
              .replace(amountMatch[1], '')
              .trim();

            description = description
              .replace(/^\s*-\s*/, '')
              .replace(/\s+/g, ' ')
              .trim();

            if (description.length > 2) {
              console.log(`MATCH: [${date}] [${description}] [${amountMatch[1]}]`);
            }
          }
        });
      }
    }
  } catch (e) {
    console.error('Error dumping text:', e);
  }
}

dumpText();
