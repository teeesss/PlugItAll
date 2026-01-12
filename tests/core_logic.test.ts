import { describe, it, expect } from 'vitest';
import { detectSubscriptions } from '../src/utils/analyzer';
import { enrichSubscription } from '../src/utils/matcher';
import type { EnrichedSubscription } from '../src/utils/matcher';
import type { Transaction } from '../src/mocks/statements';

describe('Core Logic Regression Tests', () => {
  describe('Multiple Subscriptions from Same Vendor', () => {
    it('should detect TWO Visible plans at different price points', () => {
      // User has two phone lines: $35/mo and $25/mo
      const txs: Transaction[] = [
        // Line 1: $35
        { date: '2023-01-05', amount: 35.0, description: 'VISIBLE WIRELESS' },
        { date: '2023-02-05', amount: 35.0, description: 'VISIBLE WIRELESS' },
        { date: '2023-03-05', amount: 35.0, description: 'VISIBLE WIRELESS' },
        // Line 2: $25
        { date: '2023-01-05', amount: 25.0, description: 'VISIBLE WIRELESS' },
        { date: '2023-02-05', amount: 25.0, description: 'VISIBLE WIRELESS' },
        { date: '2023-03-05', amount: 25.0, description: 'VISIBLE WIRELESS' },
      ];

      const subs = detectSubscriptions(txs);

      // CRITICAL DEBUG
      console.log('=== VISIBLE TEST DEBUG ===');
      console.log('Number of subs:', subs.length);
      subs.forEach((s, i) => {
        console.log(`Sub ${i + 1}: ${s.name} @ $${s.averageAmount} (${s.confidence})`);
      });

      // MUST detect BOTH
      expect(subs.length).toBe(2);

      const amounts = subs.map((s) => Math.round(s.averageAmount)).sort((a, b) => a - b);
      console.log('Amounts:', amounts);
      expect(amounts).toEqual([25, 35]);
    });

    it('should NOT deduplicate in App.tsx style merge', () => {
      // Simulate what App.tsx does
      const sub1 = {
        name: 'VISIBLE WIRELESS',
        averageAmount: 35,
        frequency: 'Monthly' as const,
        confidence: 'High' as const,
        transactions: [],
      };
      const sub2 = {
        name: 'VISIBLE WIRELESS',
        averageAmount: 25,
        frequency: 'Monthly' as const,
        confidence: 'High' as const,
        transactions: [],
      };

      const enriched = [enrichSubscription(sub1), enrichSubscription(sub2)];

      // App.tsx deduplication logic
      const generateKey = (sub: EnrichedSubscription) =>
        `${sub.name}-${Math.round(sub.averageAmount ?? 0)}`;
      const existingKeys = new Set<string>();
      const uniqueNew: EnrichedSubscription[] = [];

      enriched.forEach((e) => {
        const key = generateKey(e);
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          uniqueNew.push(e);
        }
      });

      console.log('=== DEDUP TEST DEBUG ===');
      console.log('Unique after dedup:', uniqueNew.length);
      uniqueNew.forEach((s, i) => {
        console.log(`Sub ${i + 1}: ${s.name} @ $${s.averageAmount}`);
      });

      expect(uniqueNew.length).toBe(2);
    });
  });

  describe('Known Subscriptions Should Always Detect', () => {
    it('should detect YouTube TV with recurring monthly payments', () => {
      const txs: Transaction[] = [
        { date: '2023-01-10', amount: 72.99, description: 'GOOGLE *YOUTUBE TV' },
        { date: '2023-02-10', amount: 72.99, description: 'GOOGLE *YOUTUBE TV' },
        { date: '2023-03-10', amount: 72.99, description: 'GOOGLE *YOUTUBE TV' },
      ];

      const subs = detectSubscriptions(txs);
      console.log('=== YOUTUBE TV TEST DEBUG ===');
      console.log('Number of subs:', subs.length);
      subs.forEach((s, i) => {
        console.log(`Sub ${i + 1}: ${s.name} @ $${s.averageAmount} (${s.confidence})`);
      });

      expect(subs.length).toBe(1);
      expect(subs[0].confidence).toBe('High');
    });

    it('should detect Netflix with recurring monthly payments', () => {
      const txs: Transaction[] = [
        { date: '2023-01-15', amount: 15.49, description: 'NETFLIX.COM' },
        { date: '2023-02-15', amount: 15.49, description: 'NETFLIX.COM' },
      ];

      const subs = detectSubscriptions(txs);
      expect(subs.length).toBe(1);
      expect(subs[0].confidence).toBe('High');
    });
  });
});
