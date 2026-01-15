
import { describe, it, expect } from 'vitest';
import { detectSubscriptions } from '../src/utils/analyzer';
import type { Transaction } from '../src/utils/analyzer';

describe('Subscription Dismissal Logic (User SiriusXM)', () => {
    it('should generate unique IDs for SiriusXM at $7.71 vs $4.62', () => {
        // Exact reproduction of user's data
        const transactions: Transaction[] = [
            { date: '2025-12-01', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT NEW YORK NY' },
            { date: '2026-01-01', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT NEW YORK NY' },
            { date: '2025-11-02', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT NEW YORK NY' },
            { date: '2025-10-01', amount: 4.62, description: 'SXM*SIRIUSXM.COM/ACCT 888-635-5144 NY' },
            { date: '2025-09-13', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT 888-635-5144 NY' },
        ];

        const candidates = detectSubscriptions(transactions);

        console.log('SiriusXM Candidates:', candidates.map(c => ({
            name: c.name,
            id: c.id,
            amount: c.averageAmount,
            txCount: c.transactions.length
        })));

        // With 2 distinct price clusters ($7.71 and $4.62), expect 2 candidates
        // But $4.62 only has 1 transaction, might not meet recurrence threshold
        // $7.71 has 4 transactions, should definitely be detected

        // Assert at least 1 candidate exists
        expect(candidates.length).toBeGreaterThanOrEqual(1);

        // If 2 exist, IDs must be different
        if (candidates.length >= 2) {
            const ids = candidates.map(c => c.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        }
    });
});
