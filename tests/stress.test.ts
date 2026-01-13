import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSVString } from '../src/utils/parser';
import { detectSubscriptions } from '../src/utils/analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Stress Test: Multi-Bank CSV Formats', () => {
    const stressBanksDir = path.join(__dirname, 'fixtures', 'stress_banks');

    it('should not crash on any bank format', () => {
        if (!fs.existsSync(stressBanksDir)) return;

        const files = fs.readdirSync(stressBanksDir);
        files.forEach(file => {
            const content = fs.readFileSync(path.join(stressBanksDir, file), 'utf-8');
            expect(() => parseCSVString(content)).not.toThrow();
            expect(() => detectSubscriptions(parseCSVString(content))).not.toThrow();
        });
    });

    it('should NOT detect false positives', () => {
        if (!fs.existsSync(stressBanksDir)) return;

        const files = fs.readdirSync(stressBanksDir);
        files.forEach(file => {
            const content = fs.readFileSync(path.join(stressBanksDir, file), 'utf-8');
            const transactions = parseCSVString(content);
            const subs = detectSubscriptions(transactions);

            // One-time $67.43 Amazon should NOT be subscription
            const falsePositive = subs.find(s =>
                s.name.toUpperCase().includes('AMAZON') &&
                Math.abs(s.averageAmount - 67.43) < 1
            );
            expect(falsePositive).toBeUndefined();
        });
    });
});
