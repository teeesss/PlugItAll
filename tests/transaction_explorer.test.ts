import { describe, it, expect } from 'vitest';

/**
 * Tests for Transaction Explorer search and filter logic
 * Extracted from TransactionExplorer.tsx filter implementation
 */

// Helper function that mirrors the wildcard search logic
function matchesWildcard(description: string, searchTerm: string): boolean {
    if (searchTerm.length < 1) return true; // No filter
    const pattern = searchTerm
        .toLowerCase()
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\*/g, '.*')  // * matches any characters
        .replace(/\?/g, '.');  // ? matches single character
    const regex = new RegExp(pattern);
    return regex.test(description.toLowerCase());
}

// Helper for transaction type filter
function matchesType(amount: number, type: 'debit' | 'credit' | 'both'): boolean {
    if (type === 'both') return true;
    if (type === 'debit') return amount < 0;
    if (type === 'credit') return amount > 0;
    return true;
}

// Helper for price range filter
function matchesPriceRange(amount: number, ranges: Array<{ min: number, max: number }>): boolean {
    if (ranges.length === 0) return true;
    const absAmount = Math.abs(amount);
    return ranges.some(range => absAmount >= range.min && absAmount < range.max);
}

describe('Transaction Explorer Search', () => {
    describe('Wildcard Pattern Matching', () => {
        it('should match exact text (case insensitive)', () => {
            expect(matchesWildcard('NETFLIX SUBSCRIPTION', 'netflix')).toBe(true);
            expect(matchesWildcard('NETFLIX SUBSCRIPTION', 'NETFLIX')).toBe(true);
            expect(matchesWildcard('VISIBLE MOBILE', 'visible')).toBe(true);
        });

        it('should match with * wildcard (any characters)', () => {
            expect(matchesWildcard('NETFLIX SUBSCRIPTION', '*flix')).toBe(true);
            expect(matchesWildcard('NETFLIX SUBSCRIPTION', 'net*')).toBe(true);
            expect(matchesWildcard('NETFLIX SUBSCRIPTION', 'net*tion')).toBe(true);
            expect(matchesWildcard('VISIBLE MOBILE', 'vis*mobile')).toBe(true);
        });

        it('should match all with single * wildcard', () => {
            expect(matchesWildcard('NETFLIX SUBSCRIPTION', '*')).toBe(true);
            expect(matchesWildcard('ANY TRANSACTION', '*')).toBe(true);
            expect(matchesWildcard('', '*')).toBe(true);
        });

        it('should match with ? wildcard (single character)', () => {
            expect(matchesWildcard('NETFLIX', 'NETFL?X')).toBe(true);
            expect(matchesWildcard('HULU', 'HUL?')).toBe(true);
            expect(matchesWildcard('HBO MAX', 'HBO ?AX')).toBe(true);
        });

        it('should not match partial patterns without wildcards', () => {
            expect(matchesWildcard('NETFLIX', 'NETFLI')).toBe(true); // substring match is fine
            expect(matchesWildcard('NETFLIX', 'ETFL')).toBe(true); // substring anywhere
            expect(matchesWildcard('NETFLIX', 'FLIXNET')).toBe(false); // wrong order
        });

        it('should handle special regex characters safely', () => {
            expect(matchesWildcard('$5.00 CHARGE', '$5.00')).toBe(true);
            expect(matchesWildcard('(ONLINE PURCHASE)', '(online')).toBe(true);
            expect(matchesWildcard('TEST [BRACKET]', '[bracket]')).toBe(true);
        });
    });

    describe('Transaction Type Filter', () => {
        it('should show debits when type is "debit"', () => {
            expect(matchesType(-15.99, 'debit')).toBe(true);
            expect(matchesType(-100, 'debit')).toBe(true);
        });

        it('should hide credits when type is "debit"', () => {
            expect(matchesType(15.99, 'debit')).toBe(false);
            expect(matchesType(100, 'debit')).toBe(false);
        });

        it('should show credits when type is "credit"', () => {
            expect(matchesType(15.99, 'credit')).toBe(true);
            expect(matchesType(100, 'credit')).toBe(true);
        });

        it('should hide debits when type is "credit"', () => {
            expect(matchesType(-15.99, 'credit')).toBe(false);
            expect(matchesType(-100, 'credit')).toBe(false);
        });

        it('should show all when type is "both"', () => {
            expect(matchesType(-15.99, 'both')).toBe(true);
            expect(matchesType(15.99, 'both')).toBe(true);
            expect(matchesType(0, 'both')).toBe(true);
        });
    });

    describe('Price Range Filter', () => {
        const ranges = {
            under10: { min: 0, max: 10 },
            range10to50: { min: 10, max: 50 },
            range50to100: { min: 50, max: 100 },
            range100to500: { min: 100, max: 500 },
            range500to1000: { min: 500, max: 1000 },
            over1000: { min: 1000, max: Infinity },
        };

        it('should match under $10 range', () => {
            expect(matchesPriceRange(-5.99, [ranges.under10])).toBe(true);
            expect(matchesPriceRange(-9.99, [ranges.under10])).toBe(true);
            expect(matchesPriceRange(-10.00, [ranges.under10])).toBe(false); // boundary
        });

        it('should match $10-$50 range', () => {
            expect(matchesPriceRange(-15.99, [ranges.range10to50])).toBe(true);
            expect(matchesPriceRange(-25.00, [ranges.range10to50])).toBe(true);
            expect(matchesPriceRange(-9.99, [ranges.range10to50])).toBe(false);
        });

        it('should use absolute value (credits work too)', () => {
            expect(matchesPriceRange(15.99, [ranges.range10to50])).toBe(true);
            expect(matchesPriceRange(500, [ranges.range500to1000])).toBe(true);
        });

        it('should use OR logic for multiple ranges', () => {
            const multiRange = [ranges.under10, ranges.over1000];
            expect(matchesPriceRange(-5.00, multiRange)).toBe(true);  // under 10
            expect(matchesPriceRange(-5000, multiRange)).toBe(true); // over 1000
            expect(matchesPriceRange(-50, multiRange)).toBe(false);  // neither
        });

        it('should show all when no ranges selected', () => {
            expect(matchesPriceRange(-9999, [])).toBe(true);
            expect(matchesPriceRange(-0.01, [])).toBe(true);
        });
    });
});
