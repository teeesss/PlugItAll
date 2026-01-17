
import { describe, expect, test } from 'vitest';
import { normalizeDescription } from '../src/utils/normalizer';

describe('Normalizer Improvements (TASK-006, TASK-008)', () => {
    test('strips phone numbers', () => {
        expect(normalizeDescription('MCDONALDS 800-555-1234')).toBe('MCDONALDS');
        expect(normalizeDescription('MCDONALDS 800 555 1234')).toBe('MCDONALDS');
        expect(normalizeDescription('MCDONALDS 800.555.1234')).toBe('MCDONALDS');
        expect(normalizeDescription('MCDONALDS 8005551234')).toBe('MCDONALDS');
        expect(normalizeDescription('SUPPORT 888-444-2222 CA')).toBe('SUPPORT');
    });

    test('strips payment processor prefixes', () => {
        expect(normalizeDescription('SQ *COFFEE SHOP')).toBe('COFFEE SHOP');
        expect(normalizeDescription('SQ*COFFEE SHOP')).toBe('COFFEE SHOP');
        expect(normalizeDescription('TST* TOAST CAFE')).toBe('TOAST CAFE');
        expect(normalizeDescription('PAYPAL *SPOTIFY')).toBe('SPOTIFY');
        expect(normalizeDescription('PAYPAL*SPOTIFY')).toBe('SPOTIFY');
        expect(normalizeDescription('PYPL PAYPAL *NETFLIX')).toBe('NETFLIX');
    });

    test('strips city/state suffixes', () => {
        expect(normalizeDescription('UBER EATS SAN FRANCISCO CA')).toBe('UBER EATS');
        expect(normalizeDescription('SHELL OIL 12345 HOUSTON TX')).toBe('SHELL OIL');
        expect(normalizeDescription('TARGET 0001 MINNEAPOLIS MN')).toBe('TARGET');
    });

    test('strips mixed junk', () => {
        expect(normalizeDescription('SQ *BISTRO 555-123-4567 NY')).toBe('BISTRO');
    });
});
