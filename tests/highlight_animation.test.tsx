/**
 * @vitest-environment jsdom
 */
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { SubscriptionCard } from '../src/components/SubscriptionCard';
import type { EnrichedSubscription } from '../src/utils/matcher';

// Mock framer-motion to avoid animation complications in tests
vi.mock('framer-motion', () => ({
    motion: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('New Subscription Highlight (TASK-078)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const mockSubscription: EnrichedSubscription = {
        id: 'netflix-15.99',
        name: 'Netflix',
        displayName: 'Netflix',
        averageAmount: 15.99,
        frequency: 'Monthly' as const,
        confidence: 'High' as const,
        transactions: [],
        logo: '/logos/netflix.png'
    };

    test('highlights new subscription with green border and shadow', () => {
        const { container } = render(
            <SubscriptionCard
                subscription={mockSubscription}
                index={0}
                onDismiss={() => { }}
                isNew={true}
            />
        );

        const card = container.querySelector('.glass-panel');
        expect(card).toBeTruthy();
        expect(card?.className).toContain('ring-2');
        expect(card?.className).toContain('ring-green-500/50');
        expect(card?.className).toContain('shadow-green-500/30');
        expect(card?.className).toContain('animate-pulse-slow');
    });

    test('does not highlight when isNew is false', () => {
        const { container } = render(
            <SubscriptionCard
                subscription={mockSubscription}
                index={0}
                onDismiss={() => { }}
                isNew={false}
            />
        );

        const card = container.querySelector('.glass-panel');
        expect(card).toBeTruthy();
        expect(card?.className).not.toContain('ring-green-500');
        expect(card?.className).not.toContain('animate-pulse-slow');
    });

    test('removes highlight when isNew prop changes to false', async () => {
        const { container, rerender } = render(
            <SubscriptionCard
                subscription={mockSubscription}
                index={0}
                onDismiss={() => { }}
                isNew={true}
            />
        );

        // Initially highlighted
        let card = container.querySelector('.glass-panel');
        expect(card?.className).toContain('ring-green-500');

        // Re-render with isNew=false (simulating parent clearing newSubIds)
        rerender(
            <SubscriptionCard
                subscription={mockSubscription}
                index={0}
                onDismiss={() => { }}
                isNew={false}
            />
        );

        // Should no longer be highlighted
        card = container.querySelector('.glass-panel');
        expect(card?.className).not.toContain('ring-green-500');
    });
});
