import { describe, it, expect } from 'vitest';
import { detectSubscriptions } from '../src/utils/analyzer';
import { matchSubscription } from '../src/utils/matcher';
import type { Transaction } from '../src/utils/analyzer';

describe('User Complaints False Positives', () => {
  it('should NOT identify McDonalds as a subscription', () => {
    const txs: Transaction[] = [
      { date: '2023-01-01', amount: 12.5, description: 'MCDONALDS F31602' },
      { date: '2023-02-01', amount: 15.2, description: 'MCDONALDS F31602' },
    ];

    // Check matcher first
    const match = matchSubscription('MCDONALDS F31602');
    console.log('McDonalds Match:', match);
    expect(match).toBe(false);

    const subs = detectSubscriptions(txs);
    const mcd = subs.find((s) => s.name.toUpperCase().includes('MCDONALDS'));
    expect(mcd).toBeUndefined();
  });

  it('should NOT identify Target as a subscription (Retail Purchases)', () => {
    const txs: Transaction[] = [
      { date: '2023-01-05', amount: 45.0, description: 'TARGET MARY ESTHER FL' },
      { date: '2023-02-05', amount: 23.5, description: 'TARGET MARY ESTHER FL' },
    ];

    // Target IS now a known subscription provider (Target Circle), so this matches.
    const match = matchSubscription('TARGET MARY ESTHER FL');
    console.log('Target Match:', match);
    expect(match).toBe(true);

    // BUT, the detector should reject it because the prices ($45, $23.5) don't match the plan ($49, $99).
    const subs = detectSubscriptions(txs);
    const target = subs.find((s) => s.name.toUpperCase().includes('TARGET'));
    expect(target).toBeUndefined();
  });

  it('should REJECT Fabletics if it looks like a shopping pattern (3+ price points)', () => {
    const txs: Transaction[] = [
      { date: '2023-01-15', amount: 49.95, description: 'FABLETICS' }, // Sub price
      { date: '2023-02-15', amount: 75.0, description: 'FABLETICS' }, // Purchase
      { date: '2023-03-15', amount: 22.5, description: 'FABLETICS' }, // Purchase
    ];

    // Even though Fabletics is known, 3 different prices = shopping pattern.
    // My current logic doesn't reject known subs for shopping patterns.
    // Let's adjust the detector to be EVEN stricter.

    const subs = detectSubscriptions(txs);
    expect(subs.length).toBe(0);
  });

  it('should REJECT SiriusXM if variable amounts (3 times)', () => {
    const txs: Transaction[] = [
      { date: '2023-01-20', amount: 8.0, description: 'SIRIUSXM' },
      { date: '2023-02-20', amount: 12.0, description: 'SIRIUSXM' },
      { date: '2023-03-20', amount: 5.0, description: 'SIRIUSXM' },
    ];
    // 3 different prices = shopping pattern.
    const subs = detectSubscriptions(txs);
    expect(subs.length).toBe(0);
  });

  it('should IDENTIFY legitimate Walmart+ subscription', () => {
    const txs: Transaction[] = [
      { date: '2023-01-10', amount: 12.95, description: 'WALMART.COM' },
      { date: '2023-02-10', amount: 12.95, description: 'WALMART.COM' },
    ];
    // 12.95 is valid Walmart+ price
    const subs = detectSubscriptions(txs);
    expect(subs.length).toBe(1);
    expect(subs[0].name).toContain('WALMART');
    expect(subs[0].confidence).toBe('High');
  });

  it('should REJECT random Walmart purchases', () => {
    const txs: Transaction[] = [
      { date: '2023-01-10', amount: 54.2, description: 'WALMART SUPERCENTER' },
      { date: '2023-02-12', amount: 23.1, description: 'WALMART SUPERCENTER' },
    ];
    const subs = detectSubscriptions(txs);
    expect(subs.length).toBe(0);
  });

  it('should REJECT Amazon random purchases but ACCEPT Prime', () => {
    const txs: Transaction[] = [
      { date: '2023-01-01', amount: 14.99, description: 'AMAZON PRIME' }, // Valid
      { date: '2023-01-05', amount: 25.0, description: 'AMAZON' }, // Invalid (Marketplace)
      { date: '2023-02-01', amount: 14.99, description: 'AMAZON PRIME' }, // Valid
    ];
    const subs = detectSubscriptions(txs);
    // Should find Prime (14.99) but ignore the 25.00
    expect(subs.length).toBe(1);
    expect(subs[0].confidence).toBe('High');
    expect(subs[0].averageAmount).toBeCloseTo(14.99);
  });
});
