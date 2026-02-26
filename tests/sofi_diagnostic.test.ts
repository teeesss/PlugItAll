import { describe, test } from 'vitest';
import { parsePDFBuffer } from '../src/utils/parser';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

describe('SOFI Diagnostic', () => {
    test('dump SOFI to text', async () => {
        const sofiDir = path.resolve(__dirname, '../pdfs/SOFI');
        if (!fs.existsSync(sofiDir)) return;
        const files = fs.readdirSync(sofiDir);
        for (const file of files) {
            if (file.endsWith('.pdf')) {
                const filePath = path.join(sofiDir, file);
                const buffer = fs.readFileSync(filePath);
                const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;

                let out = "";
                for (let p = 1; p <= Math.min(3, pdf.numPages); p++) {
                    const page = await pdf.getPage(p);
                    const content = await page.getTextContent();
                    out += `\n--- PAGE ${p} ---\n`;
                    content.items.forEach((item: any) => {
                        out += `Y: ${item.transform[5].toFixed(2)} | X: ${item.transform[4].toFixed(2)} | Text: "${item.str}"\n`;
                    });
                }

                fs.writeFileSync(path.resolve(__dirname, '../tmp/sofi_dump.txt'), out);
                break;
            }
        }
    });
});
