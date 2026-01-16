import { describe, it, expect } from 'vitest';
import { parsePDFBuffer } from '../src/utils/parser';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

describe('USAA Multi-File Diagnostic', () => {
    const files = [
        'USAA-20251011.pdf',
        'USAA-20251111.pdf',
        'USAA-20251212.pdf'
    ];

    files.forEach(filename => {
        it(`should diagnose ${filename}`, async () => {
            const pdfPath = path.resolve(process.cwd(), 'pdfs', filename);
            if (!fs.existsSync(pdfPath)) {
                console.error(`File not found: ${pdfPath}`);
                return;
            }
            const buffer = fs.readFileSync(pdfPath);

            console.log(`\n--- DIAGNOSTIC: ${filename} ---`);

            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(buffer),
                verbosity: 0
            });
            const pdf = await loadingTask.promise;
            console.log(`Pages: ${pdf.numPages}`);

            let totalItems = 0;
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const textContent = await page.getTextContent();
                totalItems += textContent.items.length;

                const lines: Record<number, string[]> = {};
                (textContent.items as any[]).forEach(item => {
                    const y = Math.round(item.transform[5]);
                    if (!lines[y]) lines[y] = [];
                    lines[y].push(item.str);
                });

                const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a);
                console.log(`Page ${p} - First 10 lines with text:`);
                sortedYs.slice(0, 10).forEach(y => {
                    console.log(`[Y=${y}] ${lines[y].join('|')}`);
                });
            }

            console.log(`Total Text Items: ${totalItems}`);

            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            const transactions = await parsePDFBuffer(arrayBuffer);
            console.log(`Engine Result: ${transactions.length} transactions`);

            if (transactions.length > 0) {
                console.log('Sample:', transactions[0]);
            }
        });
    });

    it('should verify Citi still works', async () => {
        const citiPath = path.resolve(process.cwd(), 'pdfs/citi.pdf');
        if (!fs.existsSync(citiPath)) return;

        const buffer = fs.readFileSync(citiPath);
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const transactions = await parsePDFBuffer(arrayBuffer);
        console.log(`\nCiti Result: ${transactions.length} transactions`);
        expect(transactions.length).toBeGreaterThan(0);
    });
});
