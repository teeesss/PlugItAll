/**
 * categorizer.test.ts
 * Unit tests for categorizer.ts — verifying the keyword-based categorization engine,
 * confidence scoring, income/expense separation, and aggregation helpers.
 */

import { describe, it, expect } from 'vitest';
import {
    categorizeTransaction,
    categorizeAll,
    aggregateByCategory,
    getExpenses,
    getIncome,
    totalIncome,
    totalExpenses,
    type BudgetCategory,
} from '../src/utils/categorizer';

// ── categorizeTransaction — positive (income) ─────────────────────────────────

describe('categorizeTransaction — income detection', () => {
    it('identifies direct deposit as Income with High confidence', () => {
        const { category, confidence } = categorizeTransaction('DIRECT DEPOSIT PAYROLL', 3000);
        expect(category).toBe('Income');
        expect(confidence).toBe('High');
    });

    it('identifies ADP payroll as Income', () => {
        const { category } = categorizeTransaction('ADP PAYROLL', 2500);
        expect(category).toBe('Income');
    });

    it('identifies IRS tax refund as Income', () => {
        const { category } = categorizeTransaction('IRS TREAS REFUND', 1200);
        expect(category).toBe('Income');
    });

    it('classifies unknown positive amounts as Transfers with Low confidence', () => {
        const { category, confidence } = categorizeTransaction('MYSTERY CREDIT', 100);
        expect(category).toBe('Transfers');
        expect(confidence).toBe('Low');
    });
});

// ── categorizeTransaction — expense categories ────────────────────────────────

describe('categorizeTransaction — expense categories', () => {
    const cases: [string, string, number, BudgetCategory][] = [
        // Housing
        ['mortgage payment', 'QUICKEN LOANS PMT', -1500, 'Housing'],
        ['rent payment', 'ACH RENT', -1200, 'Housing'],
        // Utilities
        ['internet bill', 'COMCAST INTERNET', -80, 'Utilities'],
        ['electric bill', 'XCEL ENERGY', -120, 'Utilities'],
        ['phone bill', 'TMOBILE WIRELESS', -55, 'Utilities'],
        // Groceries
        ['HEB purchase', 'HEB GROCERIES', -120, 'Groceries'],
        ['Kroger', 'KROGER', -85, 'Groceries'],
        ['Trader Joes', 'TRADER JOE', -95, 'Groceries'],
        // Dining
        ['Starbucks', 'STARBUCKS', -6, 'Dining & Restaurants'],
        ['DoorDash order', 'DOORDASH', -35, 'Dining & Restaurants'],
        ['Chipotle', 'CHIPOTLE MEXICAN', -12, 'Dining & Restaurants'],
        // Fuel
        ['Shell fuel', 'SHELL OIL', -60, 'Fuel & Gas'],
        ['ExxonMobil', 'EXXON MOBIL', -55, 'Fuel & Gas'],
        // Healthcare
        ['Walgreens Rx', 'WALGREENS PHARMACY', -30, 'Healthcare'],
        ['Doctor visit', 'DR SMITH CLINICS', -150, 'Healthcare'],
        // Insurance
        ['GEICO auto', 'GEICO INSURANCE', -140, 'Insurance'],
        ['State Farm', 'STATE FARM INS', -120, 'Insurance'],
        // Subscriptions
        ['Netflix', 'NETFLIX.COM', -16, 'Subscriptions & Streaming'],
        ['Spotify', 'SPOTIFY USA', -10, 'Subscriptions & Streaming'],
        ['Adobe CC', 'ADOBE CREATIVE', -55, 'Subscriptions & Streaming'],
        // Shopping
        ['Amazon order', 'AMAZON MKTPLACE', -50, 'Shopping & Retail'],
        ['Walmart', 'WALMART', -80, 'Shopping & Retail'],
        // Entertainment
        ['Movie tickets', 'AMC THEATER', -30, 'Entertainment'],
        ['Ticketmaster', 'TICKETMASTER', -80, 'Entertainment'],
        // Travel
        ['Delta flight', 'DELTA AIRLINES', -400, 'Travel'],
        ['Airbnb', 'AIRBNB', -200, 'Travel'],
        // Savings
        ['Vanguard invest', 'VANGUARD BROKERAGE', -500, 'Savings & Investments'],
        ['Fidelity', 'FIDELITY INVEST', -200, 'Savings & Investments'],
        // Fees
        ['Overdraft fee', 'OVERDRAFT FEE', -35, 'Fees & Interest'],
        ['ATM fee', 'ATM FEE CHARGE', -3, 'Fees & Interest'],
        // Personal Care
        ['Haircut', 'GREAT CLIPS', -20, 'Personal Care'],
        // Note: 'sephora' keyword added to Personal Care rules (was falsely matching 'pho' via substring)
        ['Sephora', 'SEPHORA', -50, 'Personal Care'],
        ['Ulta Beauty', 'ULTA BEAUTY', -50, 'Personal Care'],
    ];

    it.each(cases)('%s → %s category', (_label, description, amount, expectedCat) => {
        const { category } = categorizeTransaction(description, amount);
        expect(category).toBe(expectedCat);
    });
});

// ── categorizeTransaction — confidence scoring ────────────────────────────────

describe('categorizeTransaction — confidence levels', () => {
    it('gives High confidence for weight-9+ categories (Utilities)', () => {
        const { confidence } = categorizeTransaction('COMCAST INTERNET BILL', -80);
        expect(confidence).toBe('High');
    });

    it('gives High confidence for Housing (weight 10)', () => {
        const { confidence } = categorizeTransaction('MORTGAGE PAYMENT', -1800);
        expect(confidence).toBe('High');
    });

    it('gives Medium or High confidence for Dining (weight 8)', () => {
        const { confidence } = categorizeTransaction('CHIPOTLE', -12);
        expect(['Medium', 'High']).toContain(confidence);
    });

    it('gives Low confidence for unrecognized descriptions', () => {
        const { confidence } = categorizeTransaction('RANDOM VENDOR ABC123', -50);
        expect(confidence).toBe('Low');
    });

    it('returns Other with Low confidence for unknown expenses', () => {
        const { category, confidence } = categorizeTransaction('UNKNOWN XYZ CO', -25);
        expect(category).toBe('Other');
        expect(confidence).toBe('Low');
    });
});

// ── categorizeAll ────────────────────────────────────────────────────────────

describe('categorizeAll', () => {
    it('returns empty array for empty input', () => {
        expect(categorizeAll([])).toHaveLength(0);
    });

    it('preserves all transaction fields and adds category/confidence', () => {
        const txs = [{ date: '2024-01-10', description: 'KROGER', amount: -100 }];
        const result = categorizeAll(txs);
        expect(result).toHaveLength(1);
        expect(result[0].date).toBe('2024-01-10');
        expect(result[0].description).toBe('KROGER');
        expect(result[0].amount).toBe(-100);
        expect(result[0].category).toBeDefined();
        expect(result[0].confidence).toBeDefined();
    });

    it('categorizes a mixed batch of transactions', () => {
        const txs = [
            { date: '2024-01-01', description: 'DIRECT DEPOSIT PAYROLL', amount: 3000 },
            { date: '2024-01-05', description: 'KROGER', amount: -200 },
            { date: '2024-01-10', description: 'NETFLIX.COM', amount: -16 },
            { date: '2024-01-15', description: 'GEICO INSURANCE', amount: -140 },
        ];
        const result = categorizeAll(txs);
        expect(result).toHaveLength(4);
        expect(result[0].category).toBe('Income');
        expect(result[1].category).toBe('Groceries');
        expect(result[2].category).toBe('Subscriptions & Streaming');
        expect(result[3].category).toBe('Insurance');
    });
});

// ── getExpenses / getIncome ───────────────────────────────────────────────────

describe('getExpenses', () => {
    it('returns only negative-amount, non-income, non-transfer transactions', () => {
        const txs = categorizeAll([
            { date: '2024-01-01', description: 'DIRECT DEPOSIT PAYROLL', amount: 3000 },
            { date: '2024-01-05', description: 'KROGER', amount: -200 },
            { date: '2024-01-10', description: 'NETFLIX', amount: -16 },
            { date: '2024-01-15', description: 'ZELLE PAYMENT', amount: -100 }, // Transfers
        ]);
        const expenses = getExpenses(txs);
        expect(expenses.every(t => t.amount < 0)).toBe(true);
        expect(expenses.every(t => t.category !== 'Income')).toBe(true);
        expect(expenses.every(t => t.category !== 'Transfers')).toBe(true);
    });
});

describe('getIncome', () => {
    it('returns only Income-categorized transactions', () => {
        const txs = categorizeAll([
            { date: '2024-01-01', description: 'DIRECT DEPOSIT PAYROLL', amount: 3000 },
            { date: '2024-01-05', description: 'KROGER', amount: -200 },
        ]);
        const income = getIncome(txs);
        expect(income).toHaveLength(1);
        expect(income[0].category).toBe('Income');
    });
});

// ── aggregateByCategory ───────────────────────────────────────────────────────

describe('aggregateByCategory', () => {
    it('returns empty record for empty input', () => {
        expect(aggregateByCategory([])).toEqual({});
    });

    it('sums amounts by category using absolute values', () => {
        const txs = categorizeAll([
            { date: '2024-01-05', description: 'KROGER', amount: -200 },
            { date: '2024-01-10', description: 'HEB GROCERIES', amount: -150 },
        ]);
        const result = aggregateByCategory(txs);
        expect(result['Groceries']).toBeCloseTo(350, 0);
    });

    it('handles multiple categories independently', () => {
        const txs = categorizeAll([
            { date: '2024-01-05', description: 'KROGER', amount: -200 },
            { date: '2024-01-10', description: 'NETFLIX', amount: -16 },
            { date: '2024-01-15', description: 'SHELL OIL', amount: -60 },
        ]);
        const result = aggregateByCategory(txs);
        expect(result['Groceries']).toBeCloseTo(200, 0);
        expect(result['Subscriptions & Streaming']).toBeCloseTo(16, 0);
        expect(result['Fuel & Gas']).toBeCloseTo(60, 0);
    });
});

// ── totalIncome / totalExpenses ───────────────────────────────────────────────

describe('totalIncome', () => {
    it('returns 0 for no transactions', () => {
        expect(totalIncome([])).toBe(0);
    });

    it('sums income transaction amounts (absolute values)', () => {
        const txs = categorizeAll([
            { date: '2024-01-01', description: 'DIRECT DEPOSIT PAYROLL', amount: 3000 },
            { date: '2024-01-15', description: 'DIRECT DEPOSIT PAYROLL', amount: 3000 },
            { date: '2024-01-05', description: 'KROGER', amount: -200 },
        ]);
        expect(totalIncome(txs)).toBeCloseTo(6000, 0);
    });
});

describe('totalExpenses', () => {
    it('returns 0 for no transactions', () => {
        expect(totalExpenses([])).toBe(0);
    });

    it('sums expense transaction amounts (absolute values)', () => {
        const txs = categorizeAll([
            { date: '2024-01-01', description: 'DIRECT DEPOSIT PAYROLL', amount: 3000 },
            { date: '2024-01-05', description: 'KROGER', amount: -200 },
            { date: '2024-01-10', description: 'NETFLIX', amount: -16 },
        ]);
        // Transfers and Income excluded → only Groceries ($200) + Subscriptions ($16)
        expect(totalExpenses(txs)).toBeCloseTo(216, 0);
    });
});
