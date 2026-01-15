import { describe, it, expect } from 'vitest';
import { enrichSubscription } from '../src/utils/matcher';
import type { SubscriptionCandidate } from '../src/utils/analyzer';

describe('Subscription Matcher Services', () => {
  it('should match known service (Netflix)', () => {
    const candidate: SubscriptionCandidate = {
      id: 'NETFLIX-15.99',
      name: 'NETFLIX',
      averageAmount: 15.99,
      frequency: 'Monthly',
      confidence: 'High',
      transactions: [],
    };

    const result = enrichSubscription(candidate);
    expect(result.displayName).toBe('Netflix');
    expect(result.logo).toBeDefined();
    expect(result.cancelUrl).toContain('netflix.com');
  });

  it('should handle unknown services gracefully', () => {
    const candidate: SubscriptionCandidate = {
      id: 'RANDOM-50.00',
      name: 'RANDOM CLUB',
      averageAmount: 50,
      frequency: 'Monthly',
      confidence: 'High',
      transactions: [],
    };

    const result = enrichSubscription(candidate);
    expect(result.displayName).toBe('RANDOM CLUB'); // Should keep original name
    expect(result.logo).toBeUndefined();
    expect(result.cancelUrl).toBeUndefined();
  });

  it('should key off partial matches (SPOTIFY USA)', () => {
    const candidate: SubscriptionCandidate = {
      id: 'SPOTIFY-10.99',
      name: 'SPOTIFY USA',
      averageAmount: 10.99,
      frequency: 'Monthly',
      confidence: 'High',
      transactions: [],
    };

    const result = enrichSubscription(candidate);
    expect(result.displayName).toBe('Spotify');
  });
});
