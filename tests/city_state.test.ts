import { describe, expect, test } from 'vitest';
import { normalizeDescription } from '../src/utils/normalizer';

describe('City/State Suffix Stripping (TASK-008)', () => {
    test('strips basic state codes', () => {
        expect(normalizeDescription('UBER CA')).toBe('UBER');
        expect(normalizeDescription('TARGET TX')).toBe('TARGET');
        expect(normalizeDescription('STARBUCKS NY')).toBe('STARBUCKS');
    });

    test('strips city + state combinations', () => {
        expect(normalizeDescription('AMAZON SEATTLE WA')).toBe('AMAZON');
        expect(normalizeDescription('STARBUCKS NEW YORK NY')).toBe('STARBUCKS');
        expect(normalizeDescription('TARGET MINNEAPOLIS MN')).toBe('TARGET');
        expect(normalizeDescription('SHELL HOUSTON TX')).toBe('SHELL');
        expect(normalizeDescription('WALMART SAN FRANCISCO CA')).toBe('WALMART');
    });

    test('handles multi-word cities', () => {
        expect(normalizeDescription('DOORDASH SAN DIEGO CA')).toBe('DOORDASH');
        expect(normalizeDescription('LYFT LOS ANGELES CA')).toBe('LYFT');
        expect(normalizeDescription('POSTMATES SALT LAKE CITY UT')).toBe('POSTMATES');
    });

    test('does not break on state-like abbreviations in brand names', () => {
        // "IN" is Indiana, but "Pay In" should be preserved if it's part of the merchant name
        // Our logic only strips at the END, so this should be safe
        expect(normalizeDescription('HOTEL IN CALIFORNIA')).not.toBe('HOTEL');
    });

    test('combined with other normalizations', () => {
        expect(normalizeDescription('SQ *BISTRO 555-123-4567 SAN JOSE CA')).toBe('BISTRO');
        expect(normalizeDescription('PAYPAL *GYM #1234 AUSTIN TX')).toBe('GYM');
    });
});
