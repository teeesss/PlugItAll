import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

async function main() {
    const sofiDir = path.resolve(__dirname, 'pdfs/SOFI');
    if (!fs.existsSync(sofiDir)) return;
    const files = fs.readdirSync(sofiDir);
    const file = files[0];
    const filePath = path.join(sofiDir, file);

    console.log(`Analyzing ${file}...`);
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;

    let output = "";

    for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        output += `\n--- PAGE ${i} ---\n`;
        content.items.forEach((item: any) => {
            output += `Y: ${Math.round(item.transform[5])} | X: ${Math.round(item.transform[4])} | Text: "${item.str}"\n`;
        });
    }

    fs.writeFileSync(path.resolve(__dirname, 'tmp/sofi_dump.txt'), output);
    console.log('Dump saved to tmp/sofi_dump.txt');
}

main().catch(console.error);
