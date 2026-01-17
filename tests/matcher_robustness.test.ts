import { describe, expect, test } from 'vitest';
import { matchSubscription, enrichSubscription } from '../src/utils/matcher';

describe('Matcher Robustness (TASK-004)', () => {

    describe('Core Matching Logic', () => {
        test('matches known high-profile services exactly', () => {
            expect(matchSubscription('NETFLIX')).toEqual(expect.objectContaining({ id: 'netflix' }));
            expect(matchSubscription('SPOTIFY')).toEqual(expect.objectContaining({ id: 'spotify' }));
            expect(matchSubscription('Adobe Creative Cloud')).toEqual(expect.objectContaining({ id: 'adobe' }));
        });

        test('matches variations and noisy descriptions', () => {
            expect(matchSubscription('NETFLIX.COM')).toEqual(expect.objectContaining({ id: 'netflix' }));
            expect(matchSubscription('PAYPAL *NETFLIX')).toEqual(expect.objectContaining({ id: 'netflix' }));
            expect(matchSubscription('TST* SPOTIFY USA')).toEqual(expect.objectContaining({ id: 'spotify' }));
            expect(matchSubscription('AMZN MKT PLACE')).toEqual(expect.objectContaining({ id: 'amazon_prime' }));
        });

        test('handles case insensitivity', () => {
            expect(matchSubscription('netflix')).toEqual(expect.objectContaining({ id: 'netflix' }));
            expect(matchSubscription('Spotify')).toEqual(expect.objectContaining({ id: 'spotify' }));
        });
    });

    describe('Short Keyword Safety (Boundary Checks)', () => {
        // This is the CRITICAL part of the fix.
        // 'SXM' is a keyword for SiriusXM. 'SXSW' should NOT match if SXM is simple substring match.
        // But SXM is 3 chars, so we enforce boundaries.

        test('matches short keywords when isolated', () => {
            expect(matchSubscription('SXM RADIO')).toEqual(expect.objectContaining({ id: 'siriusxm' }));
            expect(matchSubscription('PAYPAL *SXM')).toEqual(expect.objectContaining({ id: 'siriusxm' }));
        });

        // We need to simulate a case where a short keyword would falsely match if boundaries weren't enforced.
        // Use a fake entry if needed, or rely on real ones.
        // ADOBE is 5 chars. Borderline.
        // "ADOBE SYSTEMS" matches.
        // "ADOBE" matches.

        // Testing specific known short keywords from database:
        // "HULU" (4 chars)

        test('matches 4-char keywords', () => {
            expect(matchSubscription('HULU')).toEqual(expect.objectContaining({ id: 'hulu' }));
        });

        test('does NOT match short keywords when embedded in other words', () => {
            // Imaginary scenario: If "CAT" was a keyword for Caterpillar.
            // "APPLICATION" should not match "CAT".

            // Real scenario: "UBER" (4 chars) -> Uber.
            // "PUBERTY" should NOT match Uber.
            // Let's assume UBER is in our DB (it likely is or should be).

            // Let's use "HULU".
            // "CHULU" (imaginary word) should not match HULU.
            expect(matchSubscription('CHULU')).toBeNull();

            // "NETFLIX" is > 5 chars, so it uses includes().
            // "NETFLIXING" *will* match Netflix. This is acceptable behavior for long keywords.
            expect(matchSubscription('NETFLIXING')).toEqual(expect.objectContaining({ id: 'netflix' }));
        });
    });

    describe('Enrichment', () => {
        test('enriches candidate with logo and details', () => {
            const candidate = {
                name: 'Disney Plus',
                amount: 10,
                confidence: 'High' as const,
                frequency: 'Monthly' as const,
                date: '2023-01-01',
                id: 'test',
                averageAmount: 10,
                transactions: []
            };
            const enriched = enrichSubscription(candidate);

            expect(enriched.displayName).toBe('Disney+'); // Pretty name from DB
            expect(enriched.logo).toBe('/logos/disney_.png');
            expect(enriched.cancelUrl).toBeDefined();
        });

        test('provides fallback for unknown services', () => {
            const candidate = {
                name: 'Unknown Gym',
                amount: 50,
                confidence: 'High' as const,
                frequency: 'Monthly' as const,
                date: '2023-01-01',
                id: 'test',
                averageAmount: 50,
                transactions: []
            };
            const enriched = enrichSubscription(candidate);

            expect(enriched.displayName).toBe('Unknown Gym');
            expect(enriched.logo).toBeUndefined();
            expect(enriched.instructions).toContain('Try searching Google');
        });
    });

});
