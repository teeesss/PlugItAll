import { describe, it, expect, beforeEach } from 'vitest';
import {
    getManualSubscriptions,
    saveManualSubscriptions,
    addManualSubscription,
    exportManualSubscriptions,
    importManualSubscriptions
} from '../src/utils/storage';
import type { SubscriptionCandidate } from '../src/utils/analyzer';

describe('Manual Subscription Export/Import', () => {
    beforeEach(() => {
        // Clear manual subscriptions before each test
        saveManualSubscriptions([]);
    });

    const mockSubscription: SubscriptionCandidate = {
        id: 'TEST-SUB-15.99',
        name: 'TEST SUB',
        averageAmount: 15.99,
        frequency: 'Monthly',
        confidence: 'High',
        transactions: [],
        isManual: true
    };

    describe('exportManualSubscriptions', () => {
        it('should export empty array when no subscriptions', () => {
            const exported = exportManualSubscriptions();
            const data = JSON.parse(exported);

            expect(data.version).toBe('1.0');
            expect(data.count).toBe(0);
            expect(data.subscriptions).toEqual([]);
            expect(data.exportDate).toBeDefined();
        });

        it('should export subscriptions with metadata', () => {
            addManualSubscription(mockSubscription);

            const exported = exportManualSubscriptions();
            const data = JSON.parse(exported);

            expect(data.version).toBe('1.0');
            expect(data.count).toBe(1);
            expect(data.subscriptions).toHaveLength(1);
            expect(data.subscriptions[0].id).toBe('TEST-SUB-15.99');
            expect(data.subscriptions[0].name).toBe('TEST SUB');
            expect(data.subscriptions[0].averageAmount).toBe(15.99);
        });

        it('should export multiple subscriptions', () => {
            const sub1 = { ...mockSubscription, id: 'SUB1-10.00', name: 'SUB1', averageAmount: 10 };
            const sub2 = { ...mockSubscription, id: 'SUB2-20.00', name: 'SUB2', averageAmount: 20 };

            addManualSubscription(sub1);
            addManualSubscription(sub2);

            const exported = exportManualSubscriptions();
            const data = JSON.parse(exported);

            expect(data.count).toBe(2);
            expect(data.subscriptions).toHaveLength(2);
        });
    });

    describe('importManualSubscriptions', () => {
        it('should import valid subscriptions', () => {
            const importData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                count: 1,
                subscriptions: [mockSubscription]
            };

            const result = importManualSubscriptions(JSON.stringify(importData));

            expect(result.success).toBe(true);
            expect(result.imported).toBe(1);
            expect(result.skipped).toBe(0);
            expect(result.error).toBeUndefined();

            const subs = getManualSubscriptions();
            expect(subs).toHaveLength(1);
            expect(subs[0].id).toBe('TEST-SUB-15.99');
        });

        it('should reject invalid JSON', () => {
            const result = importManualSubscriptions('invalid json');

            expect(result.success).toBe(false);
            expect(result.imported).toBe(0);
            expect(result.error).toContain('Unexpected token'); // Updated assertion
        });

        it('should reject missing subscriptions array', () => {
            const result = importManualSubscriptions(JSON.stringify({ version: '1.0' }));

            expect(result.success).toBe(false);
            expect(result.error).toContain('missing subscriptions array');
        });

        it('should filter invalid subscriptions (missing fields)', () => {
            const importData = {
                subscriptions: [
                    { id: 'VALID-10.00', name: 'VALID', averageAmount: 10 },
                    { id: 'INVALID' }, // Missing name and amount
                    { name: 'INVALID2' } // Missing id and amount
                ]
            };

            const result = importManualSubscriptions(JSON.stringify(importData));

            expect(result.success).toBe(true);
            expect(result.imported).toBe(1);
            expect(getManualSubscriptions()).toHaveLength(1);
            expect(getManualSubscriptions()[0].id).toBe('VALID-10.00');
        });

        it('should skip duplicate subscriptions by ID', () => {
            // Add existing subscription
            addManualSubscription(mockSubscription);

            // Try to import the same subscription again
            const importData = {
                subscriptions: [
                    mockSubscription,
                    { ...mockSubscription, id: 'NEW-SUB-25.00', name: 'NEW', averageAmount: 25 }
                ]
            };

            const result = importManualSubscriptions(JSON.stringify(importData));

            expect(result.success).toBe(true);
            expect(result.imported).toBe(1); // Only NEW-SUB should be imported
            expect(result.skipped).toBe(1); // TEST-SUB should be skipped

            const subs = getManualSubscriptions();
            expect(subs).toHaveLength(2); // Original + new
            expect(subs.find(s => s.id === 'NEW-SUB-25.00')).toBeDefined();
        });

        it('should merge with existing subscriptions', () => {
            const existing = { ...mockSubscription, id: 'EXISTING-5.00', name: 'EXISTING', averageAmount: 5 };
            addManualSubscription(existing);

            const importData = {
                subscriptions: [
                    { ...mockSubscription, id: 'IMPORTED-10.00', name: 'IMPORTED', averageAmount: 10 }
                ]
            };

            const result = importManualSubscriptions(JSON.stringify(importData));

            expect(result.success).toBe(true);
            expect(result.imported).toBe(1);

            const subs = getManualSubscriptions();
            expect(subs).toHaveLength(2);
            expect(subs.find(s => s.id === 'EXISTING-5.00')).toBeDefined();
            expect(subs.find(s => s.id === 'IMPORTED-10.00')).toBeDefined();
        });

        it('should set isManual flag on imported subscriptions', () => {
            const importData = {
                subscriptions: [
                    { ...mockSubscription, isManual: false } // Even if false in export
                ]
            };

            importManualSubscriptions(JSON.stringify(importData));

            const subs = getManualSubscriptions();
            expect(subs[0].isManual).toBe(true);
        });

        it('should return error when no valid subscriptions found', () => {
            const importData = {
                subscriptions: [
                    { invalid: 'data' },
                    { id: 'NO_AMOUNT' }
                ]
            };

            const result = importManualSubscriptions(JSON.stringify(importData));

            expect(result.success).toBe(false);
            expect(result.error).toContain('No valid subscriptions found');
        });
    });

    describe('Round-trip Export/Import', () => {
        it('should maintain data integrity through export and import', () => {
            const subs = [
                { ...mockSubscription, id: 'SUB1-10.00', name: 'NETFLIX', averageAmount: 10.99 },
                { ...mockSubscription, id: 'SUB2-15.00', name: 'SPOTIFY', averageAmount: 15.99 },
                { ...mockSubscription, id: 'SUB3-20.00', name: 'YOUTUBE TV', averageAmount: 72.99 }
            ];

            subs.forEach(sub => addManualSubscription(sub));

            // Export
            const exported = exportManualSubscriptions();

            // Clear and Import
            saveManualSubscriptions([]);
            const result = importManualSubscriptions(exported);

            expect(result.success).toBe(true);
            expect(result.imported).toBe(3);

            // Verify data
            const imported = getManualSubscriptions();
            expect(imported).toHaveLength(3);
            expect(imported.find(s => s.name === 'NETFLIX')).toBeDefined();
            expect(imported.find(s => s.name === 'SPOTIFY')).toBeDefined();
            expect(imported.find(s => s.name === 'YOUTUBE TV')).toBeDefined();
        });
    });
});
