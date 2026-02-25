/**
 * budgetEngine.ts
 * Core budget calculation engine for the Budget Breakout section.
 * Handles: gross-to-net calculation, deduction tracking, budget goal comparisons.
 * 100% client-side.
 */

import type { BudgetCategory, CategorizedTransaction } from './categorizer';
import { aggregateByCategory, getExpenses } from './categorizer';

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually';

export interface Deduction {
    id: string;
    label: string;
    amount: number; // Per-paycheck dollar amount
    type: 'pretax' | 'posttax';
}

export interface IncomeProfile {
    grossPayPerPeriod: number;
    payFrequency: PayFrequency;
    federalWithholding: number;
    stateWithholding: number;
    socialSecurity: number;
    medicare: number;
    deductions: Deduction[];
}

export interface BudgetGoal {
    category: BudgetCategory;
    monthlyLimit: number;
}

export interface BudgetSummary {
    // Income
    annualGross: number;
    monthlyGross: number;
    totalDeductions: number;
    monthlyNetPay: number;
    annualNetPay: number;

    // Taxes (monthly)
    monthlyFederal: number;
    monthlyState: number;
    monthlySocialSecurity: number;
    monthlyMedicare: number;
    monthlyPreTaxDeductions: number;
    monthlyPostTaxDeductions: number;

    // Spending (from transactions)
    monthlyExpenses: number;
    categoryTotals: Partial<Record<BudgetCategory, number>>;

    // Budget vs Actual
    goalComparisons: GoalComparison[];

    // Leaks
    leaks: LeakItem[];

    // Remaining
    monthlyRemaining: number;
    savingsRate: number; // %
}

export interface GoalComparison {
    category: BudgetCategory;
    goal: number;
    actual: number;
    delta: number; // Negative = over budget
    percentUsed: number;
    status: 'OK' | 'Warning' | 'Over';
}

export interface LeakItem {
    category: BudgetCategory;
    amount: number;
    description: string;
    severity: 'Low' | 'Medium' | 'High';
}

const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
    annually: 1,
};

/**
 * Converts a per-paycheck value to a monthly value.
 */
function toMonthly(amountPerPeriod: number, frequency: PayFrequency): number {
    const annualized = amountPerPeriod * PERIODS_PER_YEAR[frequency];
    return annualized / 12;
}

/**
 * Computes the full budget summary from an income profile + categorized transactions.
 * @param profile - User's income setup
 * @param transactions - Categorized transactions (ideally ~3-12 months)
 * @param goals - Optional budget goals per category
 * @param monthsOfData - How many months the transaction data covers (for monthly averaging)
 */
export function computeBudgetSummary(
    profile: IncomeProfile,
    transactions: CategorizedTransaction[],
    goals: BudgetGoal[] = [],
    monthsOfData: number = 1
): BudgetSummary {
    const freq = profile.payFrequency;

    // --- Income Calculations ---
    const annualGross = profile.grossPayPerPeriod * PERIODS_PER_YEAR[freq];
    const monthlyGross = annualGross / 12;

    const monthlyFederal = toMonthly(profile.federalWithholding, freq);
    const monthlyState = toMonthly(profile.stateWithholding, freq);
    const monthlySocialSecurity = toMonthly(profile.socialSecurity, freq);
    const monthlyMedicare = toMonthly(profile.medicare, freq);

    const monthlyPreTaxDeductions = profile.deductions
        .filter(d => d.type === 'pretax')
        .reduce((sum, d) => sum + toMonthly(d.amount, freq), 0);

    const monthlyPostTaxDeductions = profile.deductions
        .filter(d => d.type === 'posttax')
        .reduce((sum, d) => sum + toMonthly(d.amount, freq), 0);

    const totalDeductions =
        monthlyFederal +
        monthlyState +
        monthlySocialSecurity +
        monthlyMedicare +
        monthlyPreTaxDeductions +
        monthlyPostTaxDeductions;

    const monthlyNetPay = monthlyGross - totalDeductions;
    const annualNetPay = monthlyNetPay * 12;

    // --- Spending from Transactions ---
    const expenses = getExpenses(transactions);

    // Monthly average (divide by months of data)
    const rawCategoryTotals = aggregateByCategory(expenses);
    const categoryTotals: Partial<Record<BudgetCategory, number>> = {};
    let totalExpenseSum = 0;

    for (const [cat, total] of Object.entries(rawCategoryTotals)) {
        const monthly = total / Math.max(monthsOfData, 1);
        categoryTotals[cat as BudgetCategory] = monthly;
        totalExpenseSum += monthly;
    }

    const monthlyExpenses = totalExpenseSum;

    // --- Goal Comparisons ---
    const goalComparisons: GoalComparison[] = goals.map(g => {
        const actual = categoryTotals[g.category] ?? 0;
        const delta = g.monthlyLimit - actual;
        const percentUsed = g.monthlyLimit > 0 ? (actual / g.monthlyLimit) * 100 : 0;

        let status: 'OK' | 'Warning' | 'Over';
        if (percentUsed >= 100) status = 'Over';
        else if (percentUsed >= 80) status = 'Warning';
        else status = 'OK';

        return {
            category: g.category,
            goal: g.monthlyLimit,
            actual,
            delta,
            percentUsed: Math.min(percentUsed, 200), // Cap for display
            status,
        };
    });

    // --- Leak Detection ---
    const leaks: LeakItem[] = detectLeaks(categoryTotals, monthlyNetPay);

    // --- Remaining / Savings Rate ---
    const monthlyRemaining = monthlyNetPay - monthlyExpenses;
    const savingsRate =
        monthlyNetPay > 0
            ? Math.max(0, (monthlyRemaining / monthlyNetPay) * 100)
            : 0;

    return {
        annualGross,
        monthlyGross,
        totalDeductions,
        monthlyNetPay,
        annualNetPay,
        monthlyFederal,
        monthlyState,
        monthlySocialSecurity,
        monthlyMedicare,
        monthlyPreTaxDeductions,
        monthlyPostTaxDeductions,
        monthlyExpenses,
        categoryTotals,
        goalComparisons,
        leaks,
        monthlyRemaining,
        savingsRate,
    };
}

/**
 * Detects spending leaks: categories that are unusually high relative to net pay.
 */
function detectLeaks(
    categoryTotals: Partial<Record<BudgetCategory, number>>,
    monthlyNetPay: number
): LeakItem[] {
    const leaks: LeakItem[] = [];

    // Recommended max % of net pay per category (rough guidelines)
    const THRESHOLDS: Partial<Record<BudgetCategory, { recommended: number; warn: number }>> = {
        'Dining & Restaurants': { recommended: 0.10, warn: 0.15 },
        'Shopping & Retail': { recommended: 0.10, warn: 0.20 },
        'Entertainment': { recommended: 0.05, warn: 0.10 },
        'Subscriptions & Streaming': { recommended: 0.05, warn: 0.08 },
        'Fuel & Gas': { recommended: 0.06, warn: 0.10 },
        'Personal Care': { recommended: 0.03, warn: 0.06 },
        'Gifts & Donations': { recommended: 0.05, warn: 0.10 },
        'Fees & Interest': { recommended: 0.01, warn: 0.03 },
        'Travel': { recommended: 0.08, warn: 0.15 },
        'Pets': { recommended: 0.03, warn: 0.06 },
        'Other': { recommended: 0.05, warn: 0.10 },
    };

    for (const [catKey, threshold] of Object.entries(THRESHOLDS)) {
        const cat = catKey as BudgetCategory;
        const amount = categoryTotals[cat] ?? 0;
        if (amount === 0 || monthlyNetPay === 0) continue;

        const ratio = amount / monthlyNetPay;

        if (ratio >= threshold.warn) {
            leaks.push({
                category: cat,
                amount,
                description: buildLeakDescription(cat, ratio),
                severity: ratio >= threshold.warn * 1.5 ? 'High' : 'Medium',
            });
        } else if (ratio >= threshold.recommended) {
            leaks.push({
                category: cat,
                amount,
                description: buildLeakDescription(cat, ratio),
                severity: 'Low',
            });
        }
    }

    // Sort by severity
    const severityOrder = { High: 0, Medium: 1, Low: 2 };
    leaks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return leaks;
}

function buildLeakDescription(cat: BudgetCategory, ratio: number): string {
    const pct = (ratio * 100).toFixed(0);
    const descriptions: Partial<Record<BudgetCategory, string>> = {
        'Dining & Restaurants': `You're spending ${pct}% of your take-home on dining out. Experts recommend under 10%.`,
        'Shopping & Retail': `Retail spending is at ${pct}% of take-home. Consider auditing for impulse purchases.`,
        'Entertainment': `Entertainment at ${pct}% of take-home — look for free or cheaper alternatives.`,
        'Subscriptions & Streaming': `Subscriptions are consuming ${pct}% of your net pay. Cut unused services.`,
        'Fuel & Gas': `Fuel costs are at ${pct}% of take-home — consider carpooling or reducing trips.`,
        'Personal Care': `Personal care at ${pct}% of net pay — look for lower-cost alternatives.`,
        'Gifts & Donations': `Gifts/donations at ${pct}% — ensure this aligns with your giving budget.`,
        'Fees & Interest': `You're paying ${pct}% of take-home in fees/interest — prioritize paying down debt.`,
        'Travel': `Travel spending at ${pct}% of take-home this period.`,
        'Pets': `Pet expenses at ${pct}% of net pay.`,
        'Other': `Uncategorized spending at ${pct}% — review these transactions.`,
    };
    return descriptions[cat] ?? `${cat} spending is at ${pct}% of take-home pay.`;
}

/**
 * Estimates months of data from a transaction array.
 * Returns the number of unique months represented.
 */
export function estimateMonthsOfData(
    transactions: Array<{ date: string }>
): number {
    const monthSet = new Set<string>();
    for (const tx of transactions) {
        try {
            const d = new Date(tx.date);
            if (!isNaN(d.getTime())) {
                monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
            }
        } catch {
            // Skip unparseable dates
        }
    }
    return Math.max(monthSet.size, 1);
}

/**
 * Persists income profile to localStorage.
 */
export function saveIncomeProfile(profile: IncomeProfile): void {
    localStorage.setItem('budget_income_profile', JSON.stringify(profile));
}

/**
 * Loads income profile from localStorage.
 */
export function loadIncomeProfile(): IncomeProfile | null {
    try {
        const raw = localStorage.getItem('budget_income_profile');
        if (!raw) return null;
        return JSON.parse(raw) as IncomeProfile;
    } catch {
        return null;
    }
}

/**
 * Persists budget goals to localStorage.
 */
export function saveBudgetGoals(goals: BudgetGoal[]): void {
    localStorage.setItem('budget_goals', JSON.stringify(goals));
}

/**
 * Loads budget goals from localStorage.
 */
export function loadBudgetGoals(): BudgetGoal[] {
    try {
        const raw = localStorage.getItem('budget_goals');
        if (!raw) return [];
        return JSON.parse(raw) as BudgetGoal[];
    } catch {
        return [];
    }
}

/**
 * Default income profile (blank slate).
 */
export function defaultIncomeProfile(): IncomeProfile {
    return {
        grossPayPerPeriod: 0,
        payFrequency: 'biweekly',
        federalWithholding: 0,
        stateWithholding: 0,
        socialSecurity: 0,
        medicare: 0,
        deductions: [],
    };
}

/**
 * Formats a dollar number for display.
 */
export function formatDollar(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

/**
 * Formats a percentage for display.
 */
export function formatPercent(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
}
