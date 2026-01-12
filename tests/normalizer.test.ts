import { describe, it, expect } from 'vitest';
import { normalizeDescription } from '../src/utils/normalizer';

describe('Normalization Engine', () => {
  it('should normalize standard merchant names', () => {
    expect(normalizeDescription('NETFLIX.COM')).toBe('NETFLIX');
    expect(normalizeDescription('SPOTIFY USA')).toBe('SPOTIFY');
  });

  it('should remove "POS DEBIT" and "ACH" noise', () => {
    expect(normalizeDescription('POS DEBIT STARBUCKS')).toBe('STARBUCKS');
    expect(normalizeDescription('ACH WITHDRAWAL GYM')).toBe('GYM');
  });

  it('should remove dates and random numbers', () => {
    expect(normalizeDescription('UBER *12903 OCT24')).toBe('UBER');
    expect(normalizeDescription('AMZN MKTP US *29382')).toBe('AMAZON');
  });

  it('should handle special case overrides', () => {
    // e.g. "NFLX" -> "NETFLIX" if we had that rule,
    // currently standard rules just uppercase and clean.
    expect(normalizeDescription('netflix.com')).toBe('NETFLIX');
  });

  it('should return original string if already clean', () => {
    expect(normalizeDescription('TARGET')).toBe('TARGET');
  });
});
