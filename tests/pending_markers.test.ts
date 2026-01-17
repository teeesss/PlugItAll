
import { describe, expect, test } from 'vitest';
import { normalizeDescription } from '../src/utils/normalizer';

describe('Normalizer - Pending Markers (TASK-007)', () => {
    test('strips leading PENDING markers', () => {
        expect(normalizeDescription('PENDING - AMAZON')).toBe('AMAZON');
        expect(normalizeDescription('PENDING: NETFLIX')).toBe('NETFLIX');
        expect(normalizeDescription('PENDING AMAZON')).toBe('AMAZON');
    });

    test('strips asterisk/punctuation pending markers', () => {
        expect(normalizeDescription('* PENDING AMAZON')).toBe('AMAZON');
        expect(normalizeDescription('*** PENDING *** AMAZON')).toBe('AMAZON');
    });

    test('strips common bank pending suffixes/prefixes', () => {
        expect(normalizeDescription('AMAZON - PENDING')).toBe('AMAZON'); // Suffix style
        expect(normalizeDescription('AMAZON (PENDING)')).toBe('AMAZON');
        expect(normalizeDescription('CHECKCARD POSTING PENDING AMAZON')).toBe('AMAZON'); // USAA style
    });

    test('handles mixed status garbage', () => {
        expect(normalizeDescription('Auth Hold: UBER EATS')).toBe('UBER EATS');
        expect(normalizeDescription('Temp Auth - STARBUCKS')).toBe('STARBUCKS');
    });
});
