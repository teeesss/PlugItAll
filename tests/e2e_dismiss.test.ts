
import { describe, it, expect } from 'vitest';
import { detectSubscriptions } from '../src/utils/analyzer';
import { enrichSubscription } from '../src/utils/matcher';
import type { Transaction } from '../src/utils/analyzer';

describe('End-to-End Dismiss Flow', () => {
    it('should filter by specific ID without collateral damage', () => {
        // Exact reproduction of user's SiriusXM data
        const transactions: Transaction[] = [
            { date: '2025-12-01', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT NEW YORK NY' },
            { date: '2026-01-01', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT NEW YORK NY' },
            { date: '2025-11-02', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT NEW YORK NY' },
            { date: '2025-10-01', amount: 4.62, description: 'SXM*SIRIUSXM.COM/ACCT 888-635-5144 NY' },
            { date: '2025-09-13', amount: 7.71, description: 'SXM*SIRIUSXM.COM/ACCT 888-635-5144 NY' },
        ];

        // Step 1: Detect
        const candidates = detectSubscriptions(transactions);
        console.log('Raw candidates:', candidates.map(c => c.id));

        // Step 2: Enrich
        const enriched = candidates.map(enrichSubscription);
        console.log('Enriched:', enriched.map(c => ({ id: c.id, displayName: c.displayName })));

        // Step 3: Simulate ignore list (user hides SIRIUSXM-7.71)
        const ignoredList = ['SIRIUSXM-7.71'];

        // Step 4: Filter (App.tsx logic)
        const visible = enriched.filter((c) => !ignoredList.includes(c.id));

        console.log('Visible after hiding SIRIUSXM-7.71:', visible.map(c => c.id));

        // Assert: SIRIUSXM-4.62 should STILL be visible
        const has462 = visible.some(c => c.id === 'SIRIUSXM-4.62');
        expect(has462).toBe(true);

        // Assert: SIRIUSXM-7.71 should be hidden
        const has771 = visible.some(c => c.id === 'SIRIUSXM-7.71');
        expect(has771).toBe(false);
    });
});
