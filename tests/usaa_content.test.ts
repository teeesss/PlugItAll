import { describe, it, expect } from 'vitest';
import { parsePDFBuffer } from '../src/utils/parser';
import * as fs from 'fs';
import * as path from 'path';

describe('USAA Detailed Content Check', () => {
    it('should have merged multi-line descriptions for USAA-20251011.pdf', async () => {
        const pdfPath = path.resolve(process.cwd(), 'pdfs/USAA-20251011.pdf');
        if (!fs.existsSync(pdfPath)) return;
        const buffer = fs.readFileSync(pdfPath);
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        const transactions = await parsePDFBuffer(arrayBuffer);

        // Find the SCIENCE APPLICAT transaction
        const scienceTx = transactions.find(t => t.description.includes('SCIENCE APPLICAT'));

        console.log('Detected Science Tx:', scienceTx);

        expect(scienceTx).toBeDefined();
        // Check if it merged subsequent lines
        expect(scienceTx?.description).toContain('PAYROLL');
        // Accept either 3DAC or 4DAC as they vary by month
        expect(scienceTx?.description).toMatch(/[34]DAC/);
    });

    it('should have correct signs for Debits and Credits', async () => {
        const pdfPath = path.resolve(process.cwd(), 'pdfs/USAA-20251011.pdf');
        if (!fs.existsSync(pdfPath)) return;
        const buffer = fs.readFileSync(pdfPath);
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const transactions = await parsePDFBuffer(arrayBuffer);

        // ACH DEP 100325 is $800 Credit -> should be +800
        const creditTx = transactions.find(t => t.description.includes('ACH DEP 100325'));
        console.log('Credit Tx:', creditTx);
        expect(creditTx?.amount).toBe(800);

        // USAA FUNDS TRANSFER DB $600 -> should be -600
        const debitTx = transactions.find(t => t.description.includes('FUNDS TRANSFER DB'));
        console.log('Debit Tx:', debitTx);
        expect(debitTx?.amount).toBe(-600);
    });
});
