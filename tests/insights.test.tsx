// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Insights } from '../src/components/Insights';
import type { Transaction } from '../src/utils/analyzer';

describe('Insights Component', () => {
    it('renders nothing when there are no transactions', () => {
        const { container } = render(<Insights transactions={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders summary cards with correct data', async () => {
        const transactions: Transaction[] = [
            {
                date: '2024-01-15',
                description: 'AMAZON PURCHASE',
                amount: -125.50,
            },
            {
                date: '2024-01-20',
                description: 'SALARY DEPOSIT',
                amount: 2500.00,
            },
            {
                date: '2024-02-10',
                description: 'GROCERY STORE',
                amount: -85.75,
            },
        ];

        render(<Insights transactions={transactions} />);

        // Check for header
        expect(screen.getByText('Spending Insights')).toBeDefined();
        expect(screen.getByText(/3/)).toBeDefined();
        expect(screen.getByText(/purchases\/credits/)).toBeDefined();

        // Expand insights
        const expandButton = screen.getByRole('button', { name: /Spending Insights/i });
        fireEvent.click(expandButton);

        // Check summary cards (after expansion)
        expect(screen.getByText('Total Spent')).toBeDefined();
        expect(screen.getByText('Credits/Refunds')).toBeDefined();
        expect(screen.getByText('Net Change')).toBeDefined();
        expect(screen.getByText('Date Range')).toBeDefined();
    });

    it('calculates spending totals correctly', async () => {
        const transactions: Transaction[] = [
            { date: '2024-01-01', description: 'PURCHASE 1', amount: -100 },
            { date: '2024-01-02', description: 'PURCHASE 2', amount: -50 },
            { date: '2024-01-03', description: 'INCOME', amount: 1000 },
        ];

        render(<Insights transactions={transactions} />);

        const expandButton = screen.getByRole('button', { name: /Spending Insights/i });
        fireEvent.click(expandButton);

        // Total spent should be $150
        expect(await screen.findByText(/\$150/)).toBeDefined();

        // Credits/Refunds should be $1,000
        expect(screen.getByText(/\$1,000/)).toBeDefined();

        // Net change should be $850 ($1000 - $150)
        expect(screen.getByText(/\+\$850/)).toBeDefined();
    });

    it('groups transactions by month correctly', async () => {
        const transactions: Transaction[] = [
            { date: '2024-01-15', description: 'JAN PURCHASE 1', amount: -100 },
            { date: '2024-01-20', description: 'JAN PURCHASE 2', amount: -50 },
            { date: '2024-02-10', description: 'FEB PURCHASE', amount: -75 },
            { date: '2024-02-15', description: 'FEB INCOME', amount: 500 },
        ];

        render(<Insights transactions={transactions} />);

        const expandButton = screen.getByRole('button', { name: /Spending Insights/i });
        fireEvent.click(expandButton);

        // Check if chart title is present
        expect(screen.getByText('Spending Over Time')).toBeDefined();
    });

    it('displays top merchants correctly', async () => {
        const transactions: Transaction[] = [
            { date: '2024-01-01', description: 'AMAZON', amount: -200 },
            { date: '2024-01-05', description: 'AMAZON', amount: -150 },
            { date: '2024-01-10', description: 'STARBUCKS', amount: -25 },
            { date: '2024-01-15', description: 'WALMART', amount: -100 },
        ];

        render(<Insights transactions={transactions} />);

        const expandButton = screen.getByRole('button', { name: /Spending Insights/i });
        fireEvent.click(expandButton);

        // Check if top merchants section is present
        expect(screen.getByText('Top Merchants (by spend)')).toBeDefined();

        // Amazon should be #1 with total $350 (2 transactions)
        expect(screen.getByText('AMAZON')).toBeDefined();
        expect(screen.getByText('2x')).toBeDefined(); // 2 transactions

        // Check for other merchants
        expect(screen.getByText('WALMART')).toBeDefined();
        expect(screen.getByText('STARBUCKS')).toBeDefined();
    });

    it('handles mixed positive and negative amounts correctly', async () => {
        const transactions: Transaction[] = [
            { date: '2024-01-01', description: 'REFUND', amount: 50 },
            { date: '2024-01-02', description: 'PURCHASE', amount: -100 },
            { date: '2024-01-03', description: 'SALARY', amount: 2000 },
            { date: '2024-01-04', description: 'EXPENSE', amount: -200 },
        ];

        render(<Insights transactions={transactions} />);

        const expandButton = screen.getByRole('button', { name: /Spending Insights/i });
        fireEvent.click(expandButton);

        // Total spent: $300
        expect(await screen.findByText(/\$300/)).toBeDefined();

        // Credits/Refunds: $2,050 (refund + salary)
        expect(screen.getByText(/\$2,050/)).toBeDefined();
    });

    it('handles negative net change correctly', async () => {
        const transactions: Transaction[] = [
            { date: '2024-01-01', description: 'EXPENSE 1', amount: -500 },
            { date: '2024-01-02', description: 'EXPENSE 2', amount: -300 },
            { date: '2024-01-03', description: 'INCOME', amount: 100 },
        ];

        render(<Insights transactions={transactions} />);

        const expandButton = screen.getByRole('button', { name: /Spending Insights/i });
        fireEvent.click(expandButton);

        // Net should be negative: $100 - $800 = -$700
        expect(await screen.findByText(/\$700/)).toBeDefined(); // Displays absolute value
    });
});
