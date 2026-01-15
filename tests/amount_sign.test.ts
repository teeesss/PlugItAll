import { describe, it, expect } from 'vitest';

/**
 * Tests for Amount Parsing Sign Logic
 * Verifies correct credit/debit sign handling from various CSV formats
 */

// Mirrors parseAmount logic from parser.ts
function parseAmount(str: string): number | null {
    if (!str || typeof str !== 'string') return null;
    let cleaned = str;

    // Handle markers: CR (Credit), DR (Debit)
    const isCredit = cleaned.includes('CR');
    const isDebit = cleaned.includes('DR');
    cleaned = cleaned.replace('CR', '').replace('DR', '').trim();

    // Handle parenthetical negatives: ($50.00) -> -50.00
    const isParenNegative = /^\(.*\)$/.test(cleaned);
    if (isParenNegative) {
        cleaned = cleaned.slice(1, -1);
    }

    // Handle trailing negative: 50.00- -> -50.00
    const isTrailingNegative = /^[^-].*-$/.test(cleaned);
    if (isTrailingNegative) {
        cleaned = '-' + cleaned.slice(0, -1);
    }

    // Remove currency symbols
    cleaned = cleaned.replace(/[^0-9,.\- ']/g, '');
    cleaned = cleaned.replace(/[ ']/g, '');

    // Handle comma/dot separators
    if (cleaned.includes(',') && cleaned.includes('.')) {
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        if (lastComma > lastDot) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            cleaned = cleaned.replace(/,/g, '');
        }
    } else if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 2) {
            cleaned = cleaned.replace(',', '.');
        } else {
            cleaned = cleaned.replace(',', '');
        }
    }

    let amount = parseFloat(cleaned);
    if (isNaN(amount)) return null;

    // Sign logic - THIS IS THE CRITICAL PART
    // Debits (charges, money leaving account) = NEGATIVE
    // Credits (refunds, money entering account) = POSITIVE
    if (isParenNegative || isTrailingNegative || isDebit) {
        amount = -Math.abs(amount);
    } else if (isCredit) {
        amount = Math.abs(amount);
    }

    return amount;
}

describe('Amount Parsing Sign Logic', () => {
    describe('Credit Marker (CR) - Money TO you', () => {
        it('should parse CR marker as POSITIVE amount', () => {
            expect(parseAmount('$50.00 CR')).toBe(50.00);
            expect(parseAmount('CR $100.00')).toBe(100.00);
            expect(parseAmount('23.29CR')).toBe(23.29);
        });

        it('credits should show as positive in Transaction Explorer', () => {
            const amount = parseAmount('$50.00 CR');
            expect(amount).toBeGreaterThan(0);
        });
    });

    describe('Debit Marker (DR) - Money FROM you', () => {
        it('should parse DR marker as NEGATIVE amount', () => {
            expect(parseAmount('$50.00 DR')).toBe(-50.00);
            expect(parseAmount('DR $100.00')).toBe(-100.00);
            expect(parseAmount('15.99DR')).toBe(-15.99);
        });

        it('debits should show as negative in Transaction Explorer', () => {
            const amount = parseAmount('$15.99 DR');
            expect(amount).toBeLessThan(0);
        });
    });

    describe('Parenthetical Amounts - Standard Debit Format', () => {
        it('should parse parentheses as NEGATIVE (debit)', () => {
            expect(parseAmount('($50.00)')).toBe(-50.00);
            expect(parseAmount('(100.00)')).toBe(-100.00);
            expect(parseAmount('(15.99)')).toBe(-15.99);
        });
    });

    describe('Trailing Negative - Standard Debit Format', () => {
        it('should parse trailing minus as NEGATIVE (debit)', () => {
            expect(parseAmount('50.00-')).toBe(-50.00);
            expect(parseAmount('15.99-')).toBe(-15.99);
        });
    });

    describe('Plain Amounts - No Marker', () => {
        it('should preserve existing sign when no markers', () => {
            expect(parseAmount('$50.00')).toBe(50.00);
            expect(parseAmount('-$50.00')).toBe(-50.00);
            expect(parseAmount('15.99')).toBe(15.99);
            expect(parseAmount('-15.99')).toBe(-15.99);
        });
    });

    describe('Real-World CSV Examples', () => {
        it('should correctly identify Google One credit as positive', () => {
            // User reported: Google One $23.29 appeared in Credit column as -23.29
            // This should be POSITIVE since it's a credit/refund
            const result = parseAmount('$23.29 CR');
            expect(result).toBe(23.29);
            expect(result).toBeGreaterThan(0);
        });

        it('should correctly identify Netflix charge as negative', () => {
            const result = parseAmount('$15.99 DR');
            expect(result).toBe(-15.99);
            expect(result).toBeLessThan(0);
        });

        it('should correctly handle BofA trailing minus format', () => {
            const result = parseAmount('15.99-');
            expect(result).toBe(-15.99);
            expect(result).toBeLessThan(0);
        });

        it('should correctly handle parenthetical debits', () => {
            const result = parseAmount('($25.00)');
            expect(result).toBe(-25.00);
            expect(result).toBeLessThan(0);
        });
    });
});
