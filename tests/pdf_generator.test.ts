/**
 * PDF Generator Test
 * 
 * This test verifies that the PDF generation works correctly
 * by creating a mock subscription list and generating a PDF.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePDF } from '../src/utils/pdfGenerator';
import type { EnrichedSubscription } from '../src/utils/matcher';

// Mock document for Node.js environment
const mockLink = {
    href: '',
    download: '',
    click: vi.fn(),
};

const mockCreateElement = vi.fn(() => mockLink);
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

describe('PDF Generator', () => {
    beforeEach(() => {
        // Setup DOM mocks
        vi.stubGlobal('document', {
            createElement: mockCreateElement,
            body: {
                appendChild: mockAppendChild,
                removeChild: mockRemoveChild,
            },
        });
        vi.stubGlobal('URL', {
            createObjectURL: mockCreateObjectURL,
            revokeObjectURL: mockRevokeObjectURL,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('should generate PDF with valid subscriptions', () => {
        const mockSubscriptions: EnrichedSubscription[] = [
            {
                name: 'Netflix',
                displayName: 'Netflix',
                averageAmount: 15.99,
                frequency: 'Monthly',
                confidence: 'High',
                cancelUrl: 'https://netflix.com/cancel',
                transactions: [
                    { date: '2024-01-01', description: 'NETFLIX', amount: 15.99 },
                    { date: '2024-02-01', description: 'NETFLIX', amount: 15.99 },
                ],
            },
            {
                name: 'Spotify',
                displayName: 'Spotify',
                averageAmount: 9.99,
                frequency: 'Monthly',
                confidence: 'Medium',
                cancelUrl: 'https://spotify.com/cancel',
                transactions: [
                    { date: '2024-01-05', description: 'SPOTIFY', amount: 9.99 },
                ],
            },
            {
                name: 'Unknown Sub',
                displayName: 'Unknown Sub',
                averageAmount: 5.99,
                frequency: 'Monthly',
                confidence: 'Low',
                transactions: [
                    { date: '2024-01-10', description: 'UNKNOWN', amount: 5.99 },
                ],
            },
        ];

        // Should not throw
        expect(() => generatePDF(mockSubscriptions)).not.toThrow();
    });

    it('should generate PDF with empty subscriptions', () => {
        const emptySubscriptions: EnrichedSubscription[] = [];

        // Should not throw even with empty data
        expect(() => generatePDF(emptySubscriptions)).not.toThrow();
    });

    it('should handle subscriptions without cancelUrl', () => {
        const subscriptions: EnrichedSubscription[] = [
            {
                name: 'Unknown Service',
                displayName: 'Unknown Service',
                averageAmount: 19.99,
                frequency: 'Monthly',
                confidence: 'Low',
                transactions: [],
            },
        ];

        expect(() => generatePDF(subscriptions)).not.toThrow();
    });

    it('should handle subscriptions with special characters in names', () => {
        const subscriptions: EnrichedSubscription[] = [
            {
                name: 'Test & Co. "Special" <Service>',
                displayName: 'Test & Co. "Special" <Service>',
                averageAmount: 12.99,
                frequency: 'Monthly',
                confidence: 'High',
                transactions: [],
            },
        ];

        expect(() => generatePDF(subscriptions)).not.toThrow();
    });
});
