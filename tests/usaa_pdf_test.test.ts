import { describe, it, expect } from 'vitest';
import { parsePDFBuffer } from '../src/utils/parser';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

describe('USAA Diagnostic Test', () => {
    it('should diagnose USAA1.pdf parsing', async () => {
        const rootDir = process.cwd();
        const pdfPath = path.resolve(rootDir, 'pdfs/USAA1.pdf');

        if (!fs.existsSync(pdfPath)) {
            console.error(`ERROR: File not found at ${pdfPath}`);
            return;
        }

        const buffer = fs.readFileSync(pdfPath);

        console.log('--- DIAGNOSTIC DATA FOR USAA1.pdf ---');

        // 1. Manually extract text to see what's happening
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
            verbosity: 0
        });
        const pdf = await loadingTask.promise;
        console.log(`PDF Loaded: ${pdf.numPages} pages`);

        for (let p = 1; p <= pdf.numPages; p++) {
            console.log(`\n--- Page ${p} Content ---`);
            const page = await pdf.getPage(p);
            const textContent = await page.getTextContent();

            const lines: Record<number, string[]> = {};
            textContent.items.forEach((item: unknown) => {
                const i = item as { str: string; transform: number[] };
                const y = Math.round(i.transform[5]);
                if (!lines[y]) lines[y] = [];
                lines[y].push(i.str);
            });

            const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a);
            if (sortedYs.length === 0) {
                console.log('No text items found on this page.');
            } else {
                sortedYs.forEach(y => {
                    const content = lines[y].join('|');
                    console.log(`[P${p} Y=${y}] | ${content}`);
                });
            }

            // Check for images
            console.log(`Checking for images on page ${p}...`);
            const opList = await page.getOperatorList();
            const imageOps = opList.fnArray.filter(fn =>
                fn === pdfjsLib.OPS.paintImageXObject ||
                fn === pdfjsLib.OPS.paintInlineImageXObject
            );
            console.log(`Found ${imageOps.length} image operations on page ${p}`);
        }

        // 2. Run the engine
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const transactions = await parsePDFBuffer(arrayBuffer);

        console.log(`\nENGINE_RESULT: ${transactions.length} transactions found.`);

        expect(transactions).toBeDefined();
    });
});
