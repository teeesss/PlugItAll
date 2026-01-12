import { describe, it, expect } from 'vitest';
import { detectSubscriptions } from '../src/utils/analyzer';
import type { Transaction } from '../src/mocks/statements';

describe('Real-World User Data Tests', () => {
  describe('Single-Month PDF Upload', () => {
    it('should detect BOTH Visible plans even with single occurrence each', () => {
      // User uploads ONE MONTH of data
      // They have two Visible lines appearing once each at different prices
      const txs: Transaction[] = [
        { date: '2023-01-01', amount: 35.0, description: 'VISIBLE 8663313527 CO' },
        { date: '2023-01-05', amount: 25.0, description: 'PAYPAL *VISIBLESERV 4029357733 CO' },
      ];

      const subs = detectSubscriptions(txs);
      console.log('Visible Subs:', subs);

      // MUST detect BOTH as "known" subscriptions
      expect(subs.length).toBe(2);

      const amounts = subs.map((s) => Math.round(s.averageAmount)).sort((a, b) => a - b);
      expect(amounts).toEqual([25, 35]);
    });

    it('should detect YouTube TV at non-standard price ($94.92)', () => {
      // User pays $94.92 (base + add-ons), not the standard $72.99
      const txs: Transaction[] = [
        { date: '2023-12-07', amount: 94.92, description: 'GOOGLE *YouTube TV MOUNTAIN VIEW CA' },
      ];

      const subs = detectSubscriptions(txs);
      console.log('YouTube TV Sub:', subs);

      expect(subs.length).toBe(1);
      expect(subs[0].name).toContain('YOUTUBE');
      expect(subs[0].averageAmount).toBe(94.92);
    });

    it('should detect SiriusXM from single occurrence', () => {
      const txs: Transaction[] = [
        { date: '2023-01-01', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT NEW YORK NY' },
      ];

      const subs = detectSubscriptions(txs);
      console.log('SiriusXM Sub:', subs);

      expect(subs.length).toBe(1);
      expect(subs[0].averageAmount).toBe(7.71);
    });
  });

  describe('Still Reject True False Positives', () => {
    it('should reject random Walmart purchases (HIGH risk, wrong price)', () => {
      const txs: Transaction[] = [
        { date: '2023-01-05', amount: 54.2, description: 'WALMART SUPERCENTER' },
        { date: '2023-02-05', amount: 54.2, description: 'WALMART SUPERCENTER' }, // recurring but wrong price
      ];

      const subs = detectSubscriptions(txs);
      expect(subs.length).toBe(0); // Should still reject because $54.20 != Walmart+ prices
    });

    it('should reject random Amazon purchases (HIGH risk, wrong price)', () => {
      const txs: Transaction[] = [
        { date: '2023-01-05', amount: 35.0, description: 'AMAZON MKTPLACE' },
        { date: '2023-02-05', amount: 35.0, description: 'AMAZON MKTPLACE' },
      ];

      const subs = detectSubscriptions(txs);
      expect(subs.length).toBe(0); // $35 != Amazon Prime prices
    });
  });
});
