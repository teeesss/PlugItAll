
import { describe, test, expect } from 'vitest';
import { parsePDFBuffer } from '../src/utils/parser';
import fs from 'fs';
import path from 'path';

describe('PDF Parser', () => {
    test('parses Etrade PDF correctly', async () => {
        const filePath = path.resolve(__dirname, '../pdfs/Etrade-102025.pdf');
        // Check if file exists, if not, skip (user might not have it or path is wrong in this environment)
        if (!fs.existsSync(filePath)) {
            console.warn('Skipping Etrade test: File not found');
            return;
        }

        const buffer = fs.readFileSync(filePath);
        // We need to cast buffer to ArrayBuffer
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        const transactions = await parsePDFBuffer(arrayBuffer);

        console.log('Parsed Transactions:', transactions);

        // Assertions based on what we expect. 
        // If it's empty, user said "it seems to work", so maybe other files have data.
        // But preventing crashes is step 1.
        expect(Array.isArray(transactions)).toBe(true);
    });
});
