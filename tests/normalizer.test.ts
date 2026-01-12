import { describe, test, expect } from 'vitest';
import { normalizeDescription } from '../src/utils/normalizer';

describe('Description Normalizer', () => {
  test('strips category prefixes', () => {
    expect(normalizeDescription('ENTERTAINMENT - NETFLIX')).toBe('NETFLIX');
    expect(normalizeDescription('UTILITIES: GOOGLE STORAGE')).toBe('GOOGLE STORAGE');
  });

  test('strips phone numbers', () => {
    expect(normalizeDescription('NETFLIX 866-555-0199 CA')).toBe('NETFLIX');
    expect(normalizeDescription('SIRIUSXM 8005550199')).toBe('SIRIUSXM');
  });

  test('handles pending transaction markers', () => {
    expect(normalizeDescription('PENDING: NETFLIX')).toBe('NETFLIX');
    expect(normalizeDescription('*NETFLIX.COM')).toBe('NETFLIX');
  });

  test('strips city/state suffixes', () => {
    expect(normalizeDescription('NETFLIX.COM LOS GATOS CA')).toBe('NETFLIX');
    expect(normalizeDescription('SIRIUSXM NEW YORK NY')).toBe('SIRIUSXM');
    expect(normalizeDescription('GOOGLE *STORAGE MOUNTAIN VIEW CA')).toBe('GOOGLE STORAGE');
  });

  test('strips random transaction IDs', () => {
    expect(normalizeDescription('NETFLIX *92837482')).toBe('NETFLIX');
    expect(normalizeDescription('SXM#123456789')).toBe('SIRIUSXM');
  });

  test('handles merchant special cases', () => {
    expect(normalizeDescription('AMZN PRIME MEMBER')).toBe('AMAZON PRIME');
    expect(normalizeDescription('VISIBLESERV 4029357733')).toBe('VISIBLE');
  });
});
