import { describe, test, expect } from 'vitest';
import { parsePDFBuffer } from '../src/utils/parser';
import fs from 'fs';
import path from 'path';

describe('SOFI Parser', () => {
    test('parses SoFi PDF correctly', async () => {
        const sofiDir = path.resolve(__dirname, '../pdfs/SOFI');
        if (!fs.existsSync(sofiDir)) {
            console.warn('Skipping SoFi test: Directory not found');
            return;
        }

        const files = fs.readdirSync(sofiDir).filter(f => f.endsWith('.pdf'));
        if (files.length === 0) return;

        const filePath = path.join(sofiDir, files[0]);
        console.log(`Testing with file: ${files[0]}`);
        const buffer = fs.readFileSync(filePath);
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        const transactions = await parsePDFBuffer(arrayBuffer);

        console.log(`Parsed ${transactions.length} Transactions.`);
        if (transactions.length > 0) {
            console.log('Sample: ', transactions.slice(0, 5));
        }

        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBeGreaterThan(0);

        // Ensure transactions have the correct properties
        const tx = transactions[0];
        expect(tx).toHaveProperty('date');
        expect(tx).toHaveProperty('description');
        expect(tx).toHaveProperty('amount');
        expect(typeof tx.amount).toBe('number');
    });
});
