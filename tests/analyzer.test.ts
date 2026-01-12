import { describe, it, expect } from 'vitest';
import { detectSubscriptions } from '../src/utils/analyzer';
import type { Transaction } from '../src/mocks/statements';

// Helper function for generating test data
const generateMonthlyTransactions = (
  description: string,
  amount: number,
  startDate: string,
  count: number
): Transaction[] => {
  const transactions: Transaction[] = [];
  const currentDate = new Date(startDate);
  for (let i = 0; i < count; i++) {
    transactions.push({
      date: currentDate.toISOString().slice(0, 10),
      description: description.toUpperCase(),
      amount: amount,
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  return transactions;
};

describe('Recurring Detection Analyzer', () => {
  it('should detect a standard monthly subscription', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-01', description: 'NETFLIX', amount: 15.99 },
      { date: '2023-02-01', description: 'NETFLIX', amount: 15.99 },
      { date: '2023-03-01', description: 'NETFLIX', amount: 15.99 },
    ];

    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('NETFLIX');
    expect(result[0].frequency).toBe('Monthly');
    expect(result[0].confidence).toBe('High');
  });

  it('should detect SINGLE Netflix subscription', () => {
    const transactions = generateMonthlyTransactions('Netflix', 15.99, '2023-01-01', 12);
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain('NETFLIX');
  });

  it('should detect TWO subscriptions from same vendor if prices differ significantly (Visible Mobile)', () => {
    const transactions: Transaction[] = [
      ...generateMonthlyTransactions('Visible Mobile', 35.0, '2024-01-01', 3), // Plan A
      ...generateMonthlyTransactions('Visible Mobile', 25.0, '2024-01-01', 3), // Plan B
    ];

    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(2);
    // We expect one around $35 and one around $25
    expect(result.some((s) => Math.abs(s.averageAmount - 35) < 1)).toBe(true);
    expect(result.some((s) => Math.abs(s.averageAmount - 25) < 1)).toBe(true);
  });

  it('should detect KNOWN subscriptions even if only occurring ONCE (Single Month Upload)', () => {
    const transactions: Transaction[] = [
      { date: '2024-01-15', description: 'Netflix', amount: 15.49 }, // Known
      { date: '2024-01-15', description: 'Random Coffee Shop', amount: 5.49 }, // Unknown One-off
    ];

    const result = detectSubscriptions(transactions);

    // Netflix should be found because it's in the DB
    expect(result.some((r) => r.name === 'NETFLIX')).toBe(true);

    // Random coffee should be ignored
    expect(result.some((r) => r.name === 'Random Coffee Shop')).toBe(false);
  });

  it('should ignore one-off transactions', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-01', description: 'ONEOFF', amount: 100 },
    ];
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(0);
  });

  it('should ignore irregular frequency', () => {
    const transactions: Transaction[] = [
      { date: '2023-01-01', description: 'RANDOM', amount: 10 },
      { date: '2023-01-05', description: 'RANDOM', amount: 10 },
      { date: '2023-03-01', description: 'RANDOM', amount: 10 },
    ];
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(0);
  });

  it('should detect yearly subscriptions', () => {
    const transactions: Transaction[] = [
      { date: '2022-01-01', description: 'ANNUAL', amount: 100 },
      { date: '2023-01-01', description: 'ANNUAL', amount: 100 },
    ];
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe('Yearly');
  });
});
