import { describe, it, expect } from 'vitest';
import { detectSubscriptions } from '../src/utils/analyzer';
import type { Transaction } from '../src/mocks/statements';

describe('False Positive Reproduction', () => {
  it('should ignore "Interest Charged" and "Fees"', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-01', description: 'INTEREST CHARGED TO STANDARD PURCH', amount: 70.33 },
      { date: '2023-02-01', description: 'INTEREST CHARGED TO STANDARD PURCH', amount: 65.2 }, // Variable amount
      { date: '2023-03-01', description: 'INTEREST CHARGED TO STANDARD PURCH', amount: 70.33 },
      { date: '2023-01-15', description: 'PLAN FEE CITI FLEX PLAN 04', amount: 4.86 },
      { date: '2023-02-15', description: 'PLAN FEE CITI FLEX PLAN 04', amount: 4.86 },
    ];
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(0); // Should be 0
  });

  it('should ignore "Dominos" (Pizza) if variable or low count', () => {
    const transactions: Transaction[] = [
      // Dominos often varies by order
      { date: '2023-01-05', description: 'DOMINOS PIZZA', amount: 22.08 },
      { date: '2023-02-06', description: 'DOMINOS PIZZA', amount: 35.5 },
    ];
    // 2 transactions, variable amounts -> Should definitely NOT be a sub
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(0);
  });

  it('should ignore "Dominos" EVEN IF amounts are identical (Blacklist Check)', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-05', description: 'DOMINOS PIZZA', amount: 22.08 },
      { date: '2023-02-06', description: 'DOMINOS PIZZA', amount: 22.08 },
    ];
    // Identical amounts would pass the variance check, so we need a Name Blacklist
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(0);
  });

  it('should ignore "DOMINO\'S" with apostrophe', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-05', description: "DOMINO'S FORT WALTON B FL", amount: 22.08 },
      { date: '2023-02-06', description: "DOMINO'S FORT WALTON B FL", amount: 22.08 },
    ];
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(0);
  });

  it('should ignore "Gas Stations" (CEFCO) with variable amounts', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-05', description: 'CEFCO 419', amount: 33.55 },
      { date: '2023-02-05', description: 'CEFCO 419', amount: 40.0 },
      { date: '2023-03-05', description: 'CEFCO 419', amount: 25.0 },
    ];
    // 3 transactions, but highly variable -> Should be rejected or Very Low confidence
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(0);
  });

  it('should ignore "AUTOPAY" general payments', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-01', description: 'AUTOPAY 99999', amount: 0.0 },
      { date: '2023-02-01', description: 'AUTOPAY 99999', amount: 0.0 },
    ];
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(0);
  });

  it('should STILL detect "Netflix" with exact amounts', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-01', description: 'NETFLIX', amount: 15.99 },
      { date: '2023-02-01', description: 'NETFLIX', amount: 15.99 },
    ];
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('NETFLIX');
  });
});
