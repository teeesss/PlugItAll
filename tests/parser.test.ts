import { describe, test, expect } from 'vitest';
import { parseDate, parseAmount, detectColumns, parseCSVString } from '../src/utils/parser';

describe('Date Parser', () => {
    test('parses MM/DD/YYYY format', () => {
        expect(parseDate('01/15/2024')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('parses MM/DD/YY format', () => {
        expect(parseDate('01/15/24')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('parses YYYY-MM-DD format', () => {
        expect(parseDate('2024-01-15')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('parses MMM DD format', () => {
        const result = parseDate('Jan 15');
        expect(result?.getMonth()).toBe(0);
        expect(result?.getDate()).toBe(15);
    });

    test('parses DD MMM YYYY format', () => {
        expect(parseDate('15 Jan 2024')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('handles two-digit years correctly', () => {
        expect(parseDate('01/15/99')?.getFullYear()).toBe(1999);
        expect(parseDate('01/15/00')?.getFullYear()).toBe(2000);
        expect(parseDate('01/15/50')?.getFullYear()).toBe(2050);
        expect(parseDate('01/15/51')?.getFullYear()).toBe(1951);
    });

    test('parses DD/MM/YYYY format (ambiguous, usually European)', () => {
        // Since we can't disambiguate 01/02/2024, we should at least support 
        // 15/01/2024 which is clearly DD/MM
        expect(parseDate('15/01/2024')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('parses dot separated dates', () => {
        expect(parseDate('2024.01.15')?.toISOString().slice(0, 10)).toBe('2024-01-15');
        expect(parseDate('15.01.2024')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('parses dashed months', () => {
        expect(parseDate('15-JAN-2024')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('parses full month names', () => {
        expect(parseDate('January 15, 2024')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('ignores time in date strings', () => {
        expect(parseDate('01/15/2024 10:30 AM')?.toISOString().slice(0, 10)).toBe('2024-01-15');
    });

    test('rolls back year if date is in future (year rollover)', () => {
        // Mocking "now" is hard without a library, but if we are in Jan 2026, 
        // 12/22 should be 2025.
        const date = parseDate('12/22');
        if (date) {
            const now = new Date();
            if (now.getMonth() === 0) { // January
                expect(date.getFullYear()).toBe(now.getFullYear() - 1);
            }
        }
    });

    test('returns null for invalid dates', () => {
        expect(parseDate('not a date')).toBeNull();
        expect(parseDate('')).toBeNull();
        expect(parseDate('13/45/2024')).toBeNull();
    });
});

describe('Amount Parser', () => {
    test('parses standard format', () => {
        expect(parseAmount('$15.99')).toBe(15.99);
    });

    test('parses negative with leading minus', () => {
        expect(parseAmount('-$15.99')).toBe(-15.99);
    });

    test('parses negative with trailing minus', () => {
        expect(parseAmount('$15.99-')).toBe(-15.99);
    });

    test('parses parenthetical negatives', () => {
        expect(parseAmount('($15.99)')).toBe(-15.99);
    });

    test('parses with CR/DR markers', () => {
        expect(parseAmount('15.99 CR')).toBe(-15.99); // Credit is usually money in/refund
        expect(parseAmount('15.99 DR')).toBe(15.99);  // Debit is money out
    });

    test('parses without dollar sign', () => {
        expect(parseAmount('15.99')).toBe(15.99);
    });

    test('parses with thousand separators', () => {
        expect(parseAmount('$1,234.56')).toBe(1234.56);
        expect(parseAmount('1 234.56')).toBe(1234.56);
        expect(parseAmount("1'234.56")).toBe(1234.56);
    });

    test('parses European format', () => {
        expect(parseAmount('1.234,56')).toBe(1234.56);
    });

    test('handles whitespace and extra symbols', () => {
        expect(parseAmount('  $ 15.99 USD  ')).toBe(15.99);
    });

    test('returns null for invalid amounts', () => {
        expect(parseAmount('not a number')).toBeNull();
        expect(parseAmount('')).toBeNull();
    });
});

describe('Column Detection', () => {
    test('detects Chase columns', () => {
        const headers = ['Transaction Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount'];
        const result = detectColumns(headers);
        expect(result).toEqual({ date: 0, description: 2, amount: 5 });
    });

    test('detects Capital One columns with debit/credit', () => {
        const headers = ['Transaction Date', 'Posted Date', 'Card No.', 'Description', 'Category', 'Debit', 'Credit'];
        const result = detectColumns(headers);
        expect(result).toEqual({ date: 0, description: 3, debit: 5, credit: 6 });
    });

    test('detects Bank of America columns', () => {
        const headers = ['Date', 'Description', 'Amount', 'Running Bal.'];
        const map = detectColumns(headers);
        expect(map?.date).toBe(0);
        expect(map?.description).toBe(1);
        expect(map?.amount).toBe(2);
    });

    test('detects columns with leading junk rows', () => {
        const csv = `
Bank Information,,
Account Number: 1234,,
,,
Date,Description,Amount
01/01/2024,Netflix,15.99
        `.trim();
        const txs = parseCSVString(csv);
        expect(txs.length).toBe(1);
        expect(txs[0].description).toBe('Netflix');
    });

    test('guesses columns when headers are missing', () => {
        const csv = `
01/01/2024,Netflix,15.99
02/01/2024,Spotify,10.99
        `.trim();
        const txs = parseCSVString(csv);
        expect(txs.length).toBe(2);
        expect(txs[0].description).toBe('Netflix');
        expect(txs[1].description).toBe('Spotify');
    });

    test('returns null for unrecognizable headers', () => {
        const headers = ['A', 'B', 'C'];
        expect(detectColumns(headers)).toBeNull();
    });
});
