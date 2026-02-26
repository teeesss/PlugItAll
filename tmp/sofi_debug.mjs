import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'module';
const __dirname = new URL('.', import.meta.url).pathname;

// Use legacy worker bundled in same dir
pdfjsLib.GlobalWorkerOptions.workerSrc = resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

const sofiDir = 'x:\\CancelSubscriptions\\pdfs\\SOFI';
const files = readdirSync(sofiDir).filter(f => f.endsWith('.pdf')).slice(0, 3);

for (const file of files) {
    console.log('\n====', file, '====');
    const buf = readFileSync(join(sofiDir, file));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const pdf = await pdfjsLib.getDocument({ data: ab, verbosity: 0 }).promise;

    // Check page 1 text for bank detection
    const page1 = await pdf.getPage(1);
    const tc1 = await page1.getTextContent();
    const allText = tc1.items.map(i => i.str).join(' ');
    console.log('BANK DETECT TEXT (first 300 chars):', allText.substring(0, 300));

    for (let p = 1; p <= Math.min(pdf.numPages, 2); p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        console.log('\n-- Page', p, '(', tc.items.length, 'items) --');
        tc.items.slice(0, 100).forEach(item => {
            if (item.str && item.str.trim()) {
                console.log(`Y:${Math.round(item.transform[5])} X:${Math.round(item.transform[4])} | "${item.str}"`);
            }
        });
    }
}
