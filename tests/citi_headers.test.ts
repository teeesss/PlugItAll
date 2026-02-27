import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

describe('Citi Header Detection Diagnostic', () => {
    it('should detect header positions on page 3 in citi.pdf', async () => {
        const pdfPath = path.resolve(process.cwd(), 'pdfs/citi.pdf');
        if (!fs.existsSync(pdfPath)) return;
        const buffer = fs.readFileSync(pdfPath);

        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
            verbosity: 0
        });
        const pdf = await loadingTask.promise;

        const page = await pdf.getPage(3);
        const textContent = await page.getTextContent();

        console.log('--- Page 3 Text Items ---');
        (textContent.items as any[]).forEach(item => {
            const x = Math.round(item.transform[4]);
            const y = Math.round(item.transform[5]);
            console.log(`[X=${x}, Y=${y}] "${item.str}"`);
        });
    });
});
