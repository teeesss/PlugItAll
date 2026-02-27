/**
 * transfer_netting.test.ts
 *
 * Tests for zero-net inter-account transfer pair detection.
 *
 * PROBLEM FIXED (2026-02-27):
 *   "Overdraft From Savings - 6536" (+$2,959) and
 *   "Overdraft To Checking  - 7851" (-$2,959) are balance sweeps between
 *   accounts — they net to $0 and should NEVER appear in Fees & Interest.
 *   The keyword "overdraft" previously matched the Fees & Interest rule (weight 9),
 *   inflating that category by $5,918/mo.
 *
 * FIX:
 *   1. 'overdraft from' and 'overdraft to' added to weight-12 Transfers block.
 *   2. netMatchedTransferPairs() post-processes categorized transactions and
 *      re-categorizes any same-date, exact-opposite-amount Fees & Interest pairs
 *      as Transfers (safety net for edge cases).
 */

import { describe, it, expect } from 'vitest';
import {
    categorizeTransaction,
    categorizeAll,
    netMatchedTransferPairs,
    getExpenses,
    totalExpenses,
    type CategorizedTransaction,
} from '../src/utils/categorizer';

// ── 1. Keyword routing — overdraft transfers categorize as Transfers ───────────

describe('Overdraft transfer keyword routing (weight-12 override)', () => {
    it('routes "Overdraft From Savings - XXXX" to Transfers, NOT Fees & Interest', () => {
        const { category } = categorizeTransaction(
            'Overdraft From Savings - 6536 Transaction ID: 1403-143876001',
            2959
        );
        expect(category).toBe('Transfers');
    });

    it('routes "Overdraft To Checking - XXXX" to Transfers, NOT Fees & Interest', () => {
        const { category } = categorizeTransaction(
            'Overdraft To Checking - 7851 Transaction ID: 1157-143876001',
            -2959
        );
        expect(category).toBe('Transfers');
    });

    it('gives High confidence to overdraft transfer', () => {
        const { confidence } = categorizeTransaction(
            'Overdraft From Savings - 6536',
            2959
        );
        // weight-12 match → score 14 with direction bonus → High
        expect(confidence).toBe('High');
    });

    it('routes generic "overdraft from" pattern to Transfers', () => {
        const { category } = categorizeTransaction('OVERDRAFT FROM SAVINGS ACCOUNT', 500);
        expect(category).toBe('Transfers');
    });

    it('routes generic "overdraft to" pattern to Transfers', () => {
        const { category } = categorizeTransaction('OVERDRAFT TO CHECKING ACCOUNT', -500);
        expect(category).toBe('Transfers');
    });

    // Ensure REAL overdraft FEES still categorize correctly
    it('still routes "Overdraft Fee" (actual charge) to Fees & Interest', () => {
        const { category } = categorizeTransaction('OVERDRAFT FEE CHARGED', -35);
        expect(category).toBe('Fees & Interest');
    });

    it('still routes "NSF FEE" to Fees & Interest', () => {
        const { category } = categorizeTransaction('NSF FEE RETURNED ITEM', -35);
        expect(category).toBe('Fees & Interest');
    });
});

// ── 2. categorizeAll — full pipeline with netting ─────────────────────────────

describe('categorizeAll() — overdraft pair excluded from expenses', () => {
    const txs = [
        // Real fee that stays
        { date: '2026-01-05', description: 'INTEREST CHARGED TO STANDARD PURCH', amount: -53 },
        { date: '2026-01-03', description: 'PLAN FEE - CITI FLEX PLAN 04', amount: -45 },
        // Zero-net overdraft sweep pair — should NOT appear in Fees & Interest
        { date: '2026-01-22', description: 'Overdraft From Savings - 6536 Transaction ID: 1403-143876001', amount: 2959 },
        { date: '2026-01-22', description: 'Overdraft To Checking - 7851 Transaction ID: 1157-143876001', amount: -2959 },
        // Interest earned (positive) — income-like, not an expense
        { date: '2026-01-31', description: 'Interest earned Transaction ID: 1169-1', amount: 20 },
    ];

    it('both overdraft pair transactions categorize as Transfers', () => {
        const result = categorizeAll(txs);
        const overdraftTxs = result.filter(tx =>
            tx.description.toLowerCase().includes('overdraft')
        );
        expect(overdraftTxs).toHaveLength(2);
        overdraftTxs.forEach(tx => {
            expect(tx.category).toBe('Transfers');
        });
    });

    it('overdraft pair transactions do NOT appear in getExpenses()', () => {
        const result = categorizeAll(txs);
        const expenses = getExpenses(result);
        const overdraftInExpenses = expenses.filter(tx =>
            tx.description.toLowerCase().includes('overdraft')
        );
        expect(overdraftInExpenses).toHaveLength(0);
    });

    it('total expenses do NOT include the $2,959 overdraft pair', () => {
        const result = categorizeAll(txs);
        const total = totalExpenses(result);
        // Real fees: interest charged ($53) + plan fee ($45) + interest earned ($20) = ~$118
        // The overdraft pair ($2,959 each side = $5,918) must NOT be in this total.
        expect(total).toBeLessThan(200);
        // NOT $5,918 (both sides of $2,959 pair)
        expect(total).toBeLessThan(200);
    });

    it('total expenses match only genuine fees', () => {
        const result = categorizeAll(txs);
        const expenses = getExpenses(result);
        // Should contain interest charge and plan fees, but NOT overdraft pair
        const descriptions = expenses.map(tx => tx.description);
        expect(descriptions.some(d => d.includes('INTEREST CHARGED'))).toBe(true);
        expect(descriptions.some(d => d.includes('PLAN FEE'))).toBe(true);
        expect(descriptions.some(d => d.toLowerCase().includes('overdraft'))).toBe(false);
    });
});

// ── 3. netMatchedTransferPairs() — unit tests for the safety-net function ─────

describe('netMatchedTransferPairs() — zero-net pair detection', () => {
    function makeFeesTx(date: string, desc: string, amount: number): CategorizedTransaction {
        return { date, description: desc, amount, category: 'Fees & Interest', confidence: 'High' };
    }

    function makeTransferTx(date: string, desc: string, amount: number): CategorizedTransaction {
        return { date, description: desc, amount, category: 'Transfers', confidence: 'High' };
    }

    it('returns input unchanged when there are no zero-net pairs', () => {
        const txs = [
            makeFeesTx('2026-01-05', 'INTEREST CHARGED', -53),
            makeFeesTx('2026-01-03', 'PLAN FEE', -45),
        ];
        const result = netMatchedTransferPairs(txs);
        expect(result[0].category).toBe('Fees & Interest');
        expect(result[1].category).toBe('Fees & Interest');
    });

    it('re-categorizes a zero-net Fees & Interest pair to Transfers', () => {
        const txs = [
            makeFeesTx('2026-01-22', 'Overdraft From Savings - 6536', 2959),
            makeFeesTx('2026-01-22', 'Overdraft To Checking - 7851', -2959),
        ];
        const result = netMatchedTransferPairs(txs);
        expect(result[0].category).toBe('Transfers');
        expect(result[1].category).toBe('Transfers');
    });

    it('sets confidence to High on re-categorized pairs', () => {
        const txs = [
            makeFeesTx('2026-01-22', 'Overdraft From Savings', 2959),
            makeFeesTx('2026-01-22', 'Overdraft To Checking', -2959),
        ];
        const result = netMatchedTransferPairs(txs);
        expect(result[0].confidence).toBe('High');
        expect(result[1].confidence).toBe('High');
    });

    it('does NOT re-categorize pairs on different dates', () => {
        const txs = [
            makeFeesTx('2026-01-21', 'Overdraft From Savings', 2959),
            makeFeesTx('2026-01-22', 'Overdraft To Checking', -2959),
        ];
        const result = netMatchedTransferPairs(txs);
        // Different dates → pair not detected → both remain Fees & Interest
        expect(result[0].category).toBe('Fees & Interest');
        expect(result[1].category).toBe('Fees & Interest');
    });

    it('does NOT re-categorize non-zero-net amounts', () => {
        const txs = [
            makeFeesTx('2026-01-22', 'INTEREST CHARGED', -53),
            makeFeesTx('2026-01-22', 'PLAN FEE', -45),
        ];
        const result = netMatchedTransferPairs(txs);
        // -53 + -45 = -98, not zero
        expect(result[0].category).toBe('Fees & Interest');
        expect(result[1].category).toBe('Fees & Interest');
    });

    it('handles multiple valid pairs on the same date independently', () => {
        const txs = [
            makeFeesTx('2026-01-22', 'Overdraft From Savings - 6536', 2959),
            makeFeesTx('2026-01-22', 'Overdraft To Checking - 7851', -2959),
            makeFeesTx('2026-01-22', 'Sweep From Money Market', 500),
            makeFeesTx('2026-01-22', 'Sweep To Checking', -500),
        ];
        const result = netMatchedTransferPairs(txs);
        expect(result.every(tx => tx.category === 'Transfers')).toBe(true);
    });

    it('only nets matched pairs — leaves unmatched real fees alone', () => {
        const txs = [
            makeFeesTx('2026-01-22', 'Overdraft From Savings - 6536', 2959),
            makeFeesTx('2026-01-22', 'Overdraft To Checking - 7851', -2959),
            makeFeesTx('2026-01-22', 'INTEREST CHARGED TO STANDARD PURCH', -53),
        ];
        const result = netMatchedTransferPairs(txs);
        const transferred = result.filter(tx => tx.category === 'Transfers');
        const fees = result.filter(tx => tx.category === 'Fees & Interest');
        expect(transferred).toHaveLength(2);
        expect(fees).toHaveLength(1);
        expect(fees[0].description).toBe('INTEREST CHARGED TO STANDARD PURCH');
    });

    it('handles mixed Transfers + Fees pairs (already-correct Transfers also checked)', () => {
        const txs = [
            makeTransferTx('2026-01-22', 'Overdraft From Savings', 2959),
            makeFeesTx('2026-01-22', 'Overdraft To Checking', -2959),
        ];
        const result = netMatchedTransferPairs(txs);
        // Both should be Transfers
        expect(result[0].category).toBe('Transfers');
        expect(result[1].category).toBe('Transfers');
    });

    it('uses floating-point tolerance (< $0.01) for matching', () => {
        // e.g. $2959.00 vs -$2959.00 with floating point rounding
        const txs = [
            makeFeesTx('2026-01-22', 'Overdraft From Savings', 2959.001),
            makeFeesTx('2026-01-22', 'Overdraft To Checking', -2959.0),
        ];
        // 0.001 difference — within tolerance
        const result = netMatchedTransferPairs(txs);
        expect(result[0].category).toBe('Transfers');
        expect(result[1].category).toBe('Transfers');
    });
});

// ── 4. Real-world scenario: the exact user-reported data ──────────────────────

describe('Real-world: Fees & Interest Jan 2026 data (user-reported)', () => {
    const jan2026Fees = [
        { date: '2026-01-31', description: 'Interest earned Transaction ID: 1169-1', amount: 20 },
        { date: '2026-01-31', description: 'Interest earned Transaction ID: 17-1', amount: 0 },
        { date: '2026-01-31', description: 'INTEREST 6,196.69', amount: -0 },
        { date: '2026-01-22', description: 'Overdraft From Savings - 6536 Transaction ID: 1403-143876001', amount: 2959 },
        { date: '2026-01-22', description: 'Overdraft To Checking - 7851 Transaction ID: 1157-143876001', amount: -2959 },
        { date: '2026-01-05', description: 'FOREIGN TRANSACTION FEE', amount: -1 },
        { date: '2026-01-05', description: 'INTEREST CHARGED TO STANDARD PURCH', amount: -53 },
        { date: '2026-01-03', description: 'PLAN FEE - CITI FLEX PLAN 06', amount: -12 },
        { date: '2026-01-03', description: 'PLAN FEE - CITI FLEX PLAN 05', amount: -17 },
        { date: '2026-01-03', description: 'PLAN FEE - CITI FLEX PLAN 04', amount: -45 },
    ];

    it('overdraft pair ($2,959 each) does NOT appear in Fees & Interest expenses', () => {
        const result = categorizeAll(jan2026Fees);
        const feesExpenses = getExpenses(result).filter(
            tx => tx.category === 'Fees & Interest'
        );
        const hasOverdraft = feesExpenses.some(tx =>
            tx.description.toLowerCase().includes('overdraft')
        );
        expect(hasOverdraft).toBe(false);
    });

    it('genuine fees still appear in Fees & Interest expenses', () => {
        const result = categorizeAll(jan2026Fees);
        const feesExpenses = getExpenses(result).filter(
            tx => tx.category === 'Fees & Interest'
        );
        // Foreign fee, interest charged, 3 plan fees, interest earned (positive but same category)
        expect(feesExpenses.length).toBeGreaterThanOrEqual(4);
    });

    it('total Fees & Interest expenses are significantly less than $6,107 (old inflated figure)', () => {
        const result = categorizeAll(jan2026Fees);
        const feesTotal = getExpenses(result)
            .filter(tx => tx.category === 'Fees & Interest')
            .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        // Real fees: foreign($1) + interest charged($53) + plan06($12) + plan05($17) + plan04($45)
        // + interest earned($20 positive but same category) = ~$148
        // Previously inflated by $5,918 from the overdraft pair — now $0 from that pair.
        expect(feesTotal).toBeLessThan(200); // Far less than the previously inflated $6,107
        expect(feesTotal).toBeGreaterThan(50); // But still has real fees
    });

    it('the $2,959 overdraft pair is categorized as Transfers', () => {
        const result = categorizeAll(jan2026Fees);
        const overdraftTxs = result.filter(tx =>
            tx.description.toLowerCase().includes('overdraft')
        );
        expect(overdraftTxs).toHaveLength(2);
        overdraftTxs.forEach(tx => {
            expect(tx.category).toBe('Transfers');
        });
    });
});
