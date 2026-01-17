import { describe, expect, test } from 'vitest';
import { detectColumns } from '../src/utils/parser';

describe('CSV Auto-Detection (TASK-003)', () => {
    test('should prioritize Transaction Date over Posted Date', () => {
        // Current behavior might be first-come-first-served, let's verify
        const headers = ['Posted Date', 'Transaction Date', 'Description', 'Amount'];
        const map = detectColumns(headers);
        // ideal: index 1 (Transaction Date)
        // actual might be 0
        expect(map?.date).toBe(1);
    });

    test('should NOT confuse Balance with Amount', () => {
        const headers = ['Date', 'Description', 'Amount', 'Running Balance'];
        const map = detectColumns(headers);
        expect(map?.amount).toBe(2);
    });

    test('should ignore "Balance" when searching for Amount', () => {
        // If "Amount" keyword is missing, it should NOT fall back to Balance
        const headers = ['Date', 'Description', 'Details', 'Wallet Balance'];
        const map = detectColumns(headers);
        // Should be null or undefined for amount, definitely not 3
        expect(map?.amount).toBeUndefined();
    });

    test('should handle "Debit" and "Credit" columns', () => {
        const headers = ['Date', 'Description', 'Debit', 'Credit'];
        const map = detectColumns(headers);
        expect(map?.debit).toBe(2);
        expect(map?.credit).toBe(3);
    });

    test('should handle "Cost" as Amount (common in export)', () => {
        const headers = ['Date', 'Item', 'Cost'];
        const map = detectColumns(headers);
        expect(map?.amount).toBe(2);
    });
});
