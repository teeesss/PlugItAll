/**
 * budget_engine.test.ts
 * Unit tests for budgetEngine.ts — covering income/net-pay calculations,
 * category aggregation, goal status logic, and leak detection.
 */

import { describe, it, expect } from 'vitest';
import {
    computeBudgetSummary,
    estimateMonthsOfData,
    defaultIncomeProfile,
    formatDollar,
    formatPercent,
    type IncomeProfile,
    type BudgetGoal,
} from '../src/utils/budgetEngine';
import { categorizeAll } from '../src/utils/categorizer';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<IncomeProfile> = {}): IncomeProfile {
    return {
        ...defaultIncomeProfile(),
        grossPayPerPeriod: 2000, // $2,000 biweekly
        payFrequency: 'biweekly',
        federalWithholding: 200,
        stateWithholding: 50,
        socialSecurity: 124,
        medicare: 29,
        deductions: [],
        ...overrides,
    };
}

function makeTx(date: string, description: string, amount: number) {
    return { date, description, amount };
}

// ── estimateMonthsOfData ──────────────────────────────────────────────────────

describe('estimateMonthsOfData', () => {
    it('returns 1 for empty array', () => {
        expect(estimateMonthsOfData([])).toBe(1);
    });

    it('returns 1 for transactions all in the same month', () => {
        const txs = [
            makeTx('2024-01-05', 'X', -10),
            makeTx('2024-01-15', 'Y', -20),
            makeTx('2024-01-28', 'Z', -30),
        ];
        expect(estimateMonthsOfData(txs)).toBe(1);
    });

    it('counts distinct months across a year', () => {
        // Use mid-month dates (day 15) to avoid UTC midnight timezone shift across month boundary
        const txs = [
            makeTx('2024-01-15', 'A', -10),
            makeTx('2024-02-15', 'B', -10),
            makeTx('2024-03-15', 'C', -10),
            makeTx('2024-03-20', 'D', -10), // same month as above
            makeTx('2024-06-15', 'E', -10),
        ];
        expect(estimateMonthsOfData(txs)).toBe(4);
    });

    it('handles bad date strings gracefully (still returns at least 1)', () => {
        const txs = [makeTx('not-a-date', 'X', -10)];
        expect(estimateMonthsOfData(txs)).toBe(1);
    });
});

// ── computeBudgetSummary — income math ────────────────────────────────────────

describe('computeBudgetSummary — income calculations', () => {
    it('computes annualGross correctly for biweekly payroll', () => {
        const profile = makeProfile(); // $2,000 × 26 = $52,000
        const { annualGross } = computeBudgetSummary(profile, [], [], 1);
        expect(annualGross).toBeCloseTo(52_000, 0);
    });

    it('computes monthlyGross as annualGross / 12', () => {
        const profile = makeProfile();
        const { monthlyGross, annualGross } = computeBudgetSummary(profile, [], [], 1);
        expect(monthlyGross).toBeCloseTo(annualGross / 12, 1);
    });

    it('computes monthlyNetPay after standard deductions', () => {
        // biweekly: $2,000 gross - $200 fed - $50 state - $124 ss - $29 medicare = $1,597/check
        // monthly: $1,597 * 26 / 12 ≈ $3,460.33
        const profile = makeProfile();
        const { monthlyNetPay, monthlyGross, totalDeductions } = computeBudgetSummary(
            profile,
            [],
            [],
            1
        );
        expect(monthlyNetPay).toBeCloseTo(monthlyGross - totalDeductions, 1);
        expect(monthlyNetPay).toBeGreaterThan(0);
    });

    it('handles monthly pay frequency correctly', () => {
        const profile = makeProfile({ grossPayPerPeriod: 5000, payFrequency: 'monthly' });
        const { annualGross, monthlyGross } = computeBudgetSummary(profile, [], [], 1);
        expect(annualGross).toBeCloseTo(60_000, 0);
        expect(monthlyGross).toBeCloseTo(5_000, 0);
    });

    it('handles weekly pay frequency correctly', () => {
        const profile = makeProfile({ grossPayPerPeriod: 1000, payFrequency: 'weekly' });
        const { annualGross } = computeBudgetSummary(profile, [], [], 1);
        expect(annualGross).toBeCloseTo(52_000, 0);
    });

    it('includes pre-tax deductions in totalDeductions', () => {
        const profile = makeProfile({
            deductions: [{ id: '401k', label: '401k', amount: 200, type: 'pretax' }],
        });
        const { totalDeductions, monthlyPreTaxDeductions } = computeBudgetSummary(
            profile,
            [],
            [],
            1
        );
        // 200 * 26 / 12 ≈ 433.33/mo
        expect(monthlyPreTaxDeductions).toBeCloseTo((200 * 26) / 12, 1);
        expect(totalDeductions).toBeGreaterThan(monthlyPreTaxDeductions);
    });

    it('returns zero net pay for zero gross', () => {
        const profile = makeProfile({ grossPayPerPeriod: 0, federalWithholding: 0, stateWithholding: 0, socialSecurity: 0, medicare: 0 });
        const { monthlyNetPay } = computeBudgetSummary(profile, [], [], 1);
        expect(monthlyNetPay).toBe(0);
    });
});

// ── computeBudgetSummary — spending / categories ──────────────────────────────

describe('computeBudgetSummary — spending from transactions', () => {
    it('monthlyExpenses is 0 when no transactions', () => {
        const { monthlyExpenses } = computeBudgetSummary(makeProfile(), [], [], 1);
        expect(monthlyExpenses).toBe(0);
    });

    it('averages spending across months of data', () => {
        const txs = categorizeAll([
            makeTx('2024-01-10', 'KROGER', -200),  // Groceries
            makeTx('2024-02-10', 'KROGER', -200),  // Groceries (month 2)
        ]);
        // 2 months of data → monthly avg = $200
        const { monthlyExpenses } = computeBudgetSummary(makeProfile(), txs, [], 2);
        expect(monthlyExpenses).toBeCloseTo(200, 0);
    });

    it('excludes income transactions from expenses', () => {
        const txs = categorizeAll([
            makeTx('2024-01-01', 'DIRECT DEPOSIT PAYROLL', 3000), // income
            makeTx('2024-01-05', 'KROGER', -150),                 // expense
        ]);
        const { monthlyExpenses } = computeBudgetSummary(makeProfile(), txs, [], 1);
        expect(monthlyExpenses).toBeCloseTo(150, 0);
    });

    it('populates categoryTotals for recognized categories', () => {
        const txs = categorizeAll([
            makeTx('2024-01-05', 'KROGER', -300),           // Groceries
            makeTx('2024-01-10', 'NETFLIX', -15),            // Subscriptions
            makeTx('2024-01-15', 'EXXON', -80),              // Fuel & Gas
        ]);
        const { categoryTotals } = computeBudgetSummary(makeProfile(), txs, [], 1);
        expect(categoryTotals['Groceries']).toBeGreaterThan(0);
        expect(categoryTotals['Subscriptions & Streaming']).toBeGreaterThan(0);
        expect(categoryTotals['Fuel & Gas']).toBeGreaterThan(0);
    });

    it('monthlyRemaining = netPay - expenses', () => {
        const txs = categorizeAll([makeTx('2024-01-10', 'KROGER', -500)]);
        const { monthlyNetPay, monthlyExpenses, monthlyRemaining } = computeBudgetSummary(
            makeProfile(),
            txs,
            [],
            1
        );
        expect(monthlyRemaining).toBeCloseTo(monthlyNetPay - monthlyExpenses, 1);
    });
});

// ── computeBudgetSummary — goal comparisons ───────────────────────────────────

describe('computeBudgetSummary — goal comparisons', () => {
    const goals: BudgetGoal[] = [{ category: 'Groceries', monthlyLimit: 400 }];

    it('returns OK when spending is under 80% of limit', () => {
        // $200/mo vs $400 limit = 50%
        const txs = categorizeAll([makeTx('2024-01-10', 'KROGER', -200)]);
        const { goalComparisons } = computeBudgetSummary(makeProfile(), txs, goals, 1);
        const groceries = goalComparisons.find(g => g.category === 'Groceries');
        expect(groceries?.status).toBe('OK');
        expect(groceries?.percentUsed).toBeCloseTo(50, 0);
    });

    it('returns Warning when spending is between 80–99% of limit', () => {
        // $340/mo vs $400 limit = 85%
        const txs = categorizeAll([makeTx('2024-01-10', 'KROGER', -340)]);
        const { goalComparisons } = computeBudgetSummary(makeProfile(), txs, goals, 1);
        const groceries = goalComparisons.find(g => g.category === 'Groceries');
        expect(groceries?.status).toBe('Warning');
    });

    it('returns Over when spending exceeds limit', () => {
        // $500/mo vs $400 limit = 125%
        const txs = categorizeAll([makeTx('2024-01-10', 'KROGER', -500)]);
        const { goalComparisons } = computeBudgetSummary(makeProfile(), txs, goals, 1);
        const groceries = goalComparisons.find(g => g.category === 'Groceries');
        expect(groceries?.status).toBe('Over');
        expect(groceries?.delta).toBeLessThan(0); // over budget
    });

    it('delta is positive when under budget', () => {
        const txs = categorizeAll([makeTx('2024-01-10', 'KROGER', -100)]);
        const { goalComparisons } = computeBudgetSummary(makeProfile(), txs, goals, 1);
        const groceries = goalComparisons.find(g => g.category === 'Groceries');
        expect(groceries?.delta).toBeGreaterThan(0);
    });
});

// ── computeBudgetSummary — leak detection ────────────────────────────────────

describe('computeBudgetSummary — leak detection', () => {
    it('returns no leaks when spending is minimal', () => {
        const { leaks } = computeBudgetSummary(makeProfile(), [], [], 1);
        expect(leaks).toHaveLength(0);
    });

    it('flags dining as a leak when over threshold', () => {
        // Monthly net pay ≈ $3,460. Dining > 10% (>$346) triggers leak.
        const txs = categorizeAll([
            makeTx('2024-01-05', 'CHICK-FIL-A', -100),
            makeTx('2024-01-10', 'DOORDASH', -200),
            makeTx('2024-01-15', 'CHIPOTLE', -150),
            makeTx('2024-01-20', 'STARBUCKS', -80),
        ]);
        const { leaks } = computeBudgetSummary(makeProfile(), txs, [], 1);
        const diningLeak = leaks.find(l => l.category === 'Dining & Restaurants');
        expect(diningLeak).toBeDefined();
        expect(diningLeak?.severity).toMatch(/Medium|High/);
    });

    it('leaks are sorted by severity (High first)', () => {
        const txs = categorizeAll([
            // High dining spend
            makeTx('2024-01-05', 'DOORDASH', -800),
            // Subscription spend
            makeTx('2024-01-10', 'NETFLIX', -100),
            makeTx('2024-01-10', 'SPOTIFY', -100),
            makeTx('2024-01-10', 'HULU', -100),
        ]);
        const { leaks } = computeBudgetSummary(makeProfile(), txs, [], 1);
        if (leaks.length >= 2) {
            const severityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
            for (let i = 0; i < leaks.length - 1; i++) {
                expect(severityOrder[leaks[i].severity]).toBeLessThanOrEqual(
                    severityOrder[leaks[i + 1].severity]
                );
            }
        }
    });
});

// ── savingsRate ───────────────────────────────────────────────────────────────

describe('savingsRate', () => {
    it('is 0 when income is not set (grossPay = 0)', () => {
        const profile = makeProfile({ grossPayPerPeriod: 0, federalWithholding: 0, stateWithholding: 0, socialSecurity: 0, medicare: 0 });
        const { savingsRate } = computeBudgetSummary(profile, [], [], 1);
        expect(savingsRate).toBe(0);
    });

    it('is positive when there are no expenses', () => {
        const { savingsRate } = computeBudgetSummary(makeProfile(), [], [], 1);
        expect(savingsRate).toBeGreaterThan(0);
    });

    it('decreases as expenses increase', () => {
        const lowExpense = categorizeAll([makeTx('2024-01-10', 'KROGER', -100)]);
        const highExpense = categorizeAll([makeTx('2024-01-10', 'KROGER', -2000)]);
        const low = computeBudgetSummary(makeProfile(), lowExpense, [], 1);
        const high = computeBudgetSummary(makeProfile(), highExpense, [], 1);
        expect(low.savingsRate).toBeGreaterThan(high.savingsRate);
    });
});

// ── formatDollar / formatPercent ──────────────────────────────────────────────

describe('formatDollar', () => {
    it('formats zero correctly', () => {
        expect(formatDollar(0)).toMatch(/\$0/);
    });

    it('formats positive amount with $ sign', () => {
        expect(formatDollar(1234)).toMatch(/\$1,234/);
    });

    it('formats negative amounts', () => {
        expect(formatDollar(-500)).toMatch(/-?\$500|-500/);
    });
});

describe('formatPercent', () => {
    it('formats with 1 decimal by default', () => {
        expect(formatPercent(12.5)).toBe('12.5%');
    });

    it('respects custom decimals argument', () => {
        expect(formatPercent(33.333, 2)).toBe('33.33%');
        expect(formatPercent(50, 0)).toBe('50%');
    });
});
