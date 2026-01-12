import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSVString, parsePDFBuffer } from '../src/utils/parser';
import { detectSubscriptions } from '../src/utils/analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface Transaction {
    date: string;
    description: string;
    amount: number;
}

const csvDir = path.join(projectRoot, 'csvs');
const pdfDir = path.join(projectRoot, 'pdfs');
const snapshotPath = path.join(__dirname, 'baseline.json');

describe('Baseline Regression Test', () => {
    let allTransactions: Transaction[] = [];

    beforeAll(async () => {
        // 1. Gather all CSV Transactions
        if (fs.existsSync(csvDir)) {
            const csvFiles = fs.readdirSync(csvDir).filter((f) => f.toLowerCase().endsWith('.csv'));
            for (const file of csvFiles) {
                const content = fs.readFileSync(path.join(csvDir, file), 'utf-8');
                const txs = parseCSVString(content);
                allTransactions = [...allTransactions, ...txs];
            }
        }

        // 2. Gather all PDF Transactions
        const pdfPath = path.join(pdfDir, 'test.pdf');
        if (fs.existsSync(pdfPath)) {
            const buffer = fs.readFileSync(pdfPath);
            const arrayBuffer = buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength
            );
            // NOTE: This might fail if pdfjs-dist in node requires legacy build
            // If it fails, we will adjust src/utils/parser.ts or this test
            const txs = await parsePDFBuffer(arrayBuffer);
            allTransactions = [...allTransactions, ...txs];
        }

        // 3. Simple deduplication logic (replicated from App.tsx/Combined test)
        const seen = new Set<string>();
        allTransactions = allTransactions.filter((t) => {
            // Use prefix + amount + date as key
            const descPrefix = t.description.substring(0, 20).toUpperCase().trim();
            const key = `${t.date}-${t.amount.toFixed(2)}-${descPrefix}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    });

    it('should match the baseline snapshot', () => {
        const subs = detectSubscriptions(allTransactions);

        // Sort and simplify for comparative stability
        const results = subs
            .map(s => ({
                name: s.name,
                amount: Math.round(s.averageAmount),
                frequency: s.frequency,
                confidence: s.confidence
            }))
            .sort((a, b) => a.name.localeCompare(b.name) || a.amount - b.amount);

        if (!fs.existsSync(snapshotPath)) {
            console.log('Generating new baseline snapshot...');
            fs.writeFileSync(snapshotPath, JSON.stringify(results, null, 2));
        }

        const baseline = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

        // This will fail if the results differ from the baseline
        // Use deep equal to catch any logic changes
        expect(results).toEqual(baseline);
    });
});
