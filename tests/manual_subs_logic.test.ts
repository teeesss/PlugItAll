import { describe, it, expect } from 'vitest';
import { normalizeDescription } from '../src/utils/normalizer';

describe('Manual Subscription Logic', () => {
    describe('ID Generation Consistency', () => {
        it('should generate same ID for raw and normalized descriptions', () => {
            const raw = "NETFLIX.COM* 12345";
            const normalized = normalizeDescription(raw);
            const amount = 15.99;

            const idFromRaw = `${normalizeDescription(raw)}-${amount.toFixed(2)}`;
            const idFromNormalized = `${normalized}-${amount.toFixed(2)}`;

            expect(idFromRaw).toBe(idFromNormalized);
            expect(idFromRaw).toBe("NETFLIX-15.99");
        });

        it('should handle special characters in ID generation', () => {
            const desc = "APPLE.COM/BILL $5.99";
            const amount = 5.99;
            const id = `${normalizeDescription(desc)}-${amount.toFixed(2)}`;

            // normalizeDescription currently preserves currency symbols and ignores / as separator
            expect(id).toBe("APPLE COM/BILL $5 99-5.99");
        });
    });

    describe('Merging Logic (App.tsx Simulation)', () => {
        const mockAuto = [
            { id: 'netflix-15.99', name: 'netflix', averageAmount: 15.99, isManual: false },
            { id: 'hulu-12.99', name: 'hulu', averageAmount: 12.99, isManual: false }
        ];

        const mockManual = [
            { id: 'netflix-15.99', name: 'netflix', averageAmount: 15.99, isManual: true },
            { id: 'custom-50.00', name: 'custom', averageAmount: 50.00, isManual: true }
        ];

        it('should filter out overridden auto-detected subscriptions', () => {
            const manualIds = new Set(mockManual.map(m => m.id));
            const nonOverriddenAuto = mockAuto.filter(c => !manualIds.has(c.id));

            expect(nonOverriddenAuto).toHaveLength(1);
            expect(nonOverriddenAuto[0].id).toBe('hulu-12.99');
        });

        it('should combine manual and non-overridden auto correctly', () => {
            const manualIds = new Set(mockManual.map(m => m.id));
            const nonOverriddenAuto = mockAuto.filter(c => !manualIds.has(c.id));
            const combined = [...mockManual, ...nonOverriddenAuto];

            expect(combined).toHaveLength(3);
            expect(combined.map(c => c.id)).toContain('netflix-15.99');
            expect(combined.map(c => c.id)).toContain('custom-50.00');
            expect(combined.map(c => c.id)).toContain('hulu-12.99');

            // Check that netflix is the manual one
            const netflix = combined.find(c => c.id === 'netflix-15.99');
            expect(netflix?.isManual).toBe(true);
        });
    });
});
