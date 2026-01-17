// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProcessingOverlay } from '../src/components/ProcessingOverlay';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>
    },
    // eslint-disable-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('ProcessingOverlay (TASK-089)', () => {
    it('renders overlay when isProcessing is true', () => {
        const { container } = render(
            <ProcessingOverlay
                isProcessing={true}
                fileCount={3}
                transactionCount={247}
                subscriptionCount={12}
                currentStep="parsing"
            />
        );

        expect(container.querySelector('.fixed')).toBeTruthy();
        expect(screen.getByText('Processing Statements...')).toBeTruthy();
    });

    it('does not render when isProcessing is false and not complete', () => {
        const { container } = render(
            <ProcessingOverlay
                isProcessing={false}
                fileCount={0}
                transactionCount={0}
                subscriptionCount={0}
                currentStep="parsing"
            />
        );

        expect(container.querySelector('.fixed')).toBeNull();
    });

    it('displays correct file count', () => {
        render(
            <ProcessingOverlay
                isProcessing={true}
                fileCount={5}
                transactionCount={0}
                subscriptionCount={0}
                currentStep="parsing"
            />
        );

        expect(screen.getByText(/Parsing 5 files/i)).toBeTruthy();
    });

    it('shows analyzing step with transaction count', () => {
        render(
            <ProcessingOverlay
                isProcessing={true}
                fileCount={3}
                transactionCount={247}
                subscriptionCount={0}
                currentStep="analyzing"
            />
        );

        expect(screen.getByText(/Found 247 transactions/i)).toBeTruthy();
    });

    it('shows complete state with subscription count', () => {
        render(
            <ProcessingOverlay
                isProcessing={false}
                fileCount={3}
                transactionCount={247}
                subscriptionCount={12}
                currentStep="complete"
            />
        );

        expect(screen.getByText('Processing Complete!')).toBeTruthy();
        expect(screen.getByText(/Found 12 subscriptions/i)).toBeTruthy();
    });

    it('calls onComplete callback after minimum display time', () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();

        const { rerender } = render(
            <ProcessingOverlay
                isProcessing={true}
                fileCount={3}
                transactionCount={247}
                subscriptionCount={12}
                currentStep="parsing"
                onComplete={onComplete}
            />
        );

        // Move to complete step
        rerender(
            <ProcessingOverlay
                isProcessing={false}
                fileCount={3}
                transactionCount={247}
                subscriptionCount={12}
                currentStep="complete"
                onComplete={onComplete}
            />
        );

        // Should not call immediately
        expect(onComplete).not.toHaveBeenCalled();

        // Fast-forward past 4 seconds (minimum display time)
        vi.advanceTimersByTime(4100);

        expect(onComplete).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('shows all processing steps in correct order', () => {
        const { container } = render(
            <ProcessingOverlay
                isProcessing={true}
                fileCount={3}
                transactionCount={247}
                subscriptionCount={12}
                currentStep="detecting"
            />
        );

        // All steps should be visible
        expect(screen.getByText(/Parsing 3 files/i)).toBeTruthy();
        expect(screen.getByText(/Found 247 transactions/i)).toBeTruthy();
        expect(screen.getByText(/Detecting subscriptions/i)).toBeTruthy();

        // Visual indicator that we're on detecting step
        const steps = container.querySelectorAll('[class*="bg-indigo-500"]');
        expect(steps.length).toBeGreaterThan(0);
    });

    it('handles singular file count correctly', () => {
        render(
            <ProcessingOverlay
                isProcessing={true}
                fileCount={1}
                transactionCount={0}
                subscriptionCount={0}
                currentStep="parsing"
            />
        );

        // Should say "file" not "files"
        expect(screen.getByText(/Parsing 1 file[^s]/i)).toBeTruthy();
    });

    it('handles singular subscription count correctly', () => {
        render(
            <ProcessingOverlay
                isProcessing={false}
                fileCount={1}
                transactionCount={100}
                subscriptionCount={1}
                currentStep="complete"
            />
        );

        // Should say "subscription" not "subscriptions"
        expect(screen.getByText(/Found 1 subscription[^s]/i)).toBeTruthy();
    });
});
