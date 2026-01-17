import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../utils/cn';
import type { Transaction } from '../utils/analyzer';
import { filterRealTransactions } from '../utils/transactionFilters';

interface InsightsProps {
    transactions: Transaction[];
}

export function Insights({ transactions }: InsightsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate spending summary (with transfer filtering)
    const summary = useMemo(() => {
        if (transactions.length === 0) return null;

        // Filter out transfers/payments to avoid double-counting
        const realTransactions = filterRealTransactions(transactions);
        const filteredCount = transactions.length - realTransactions.length;

        const purchases = realTransactions.filter(t => t.amount < 0);
        const credits = realTransactions.filter(t => t.amount > 0);

        const totalSpent = Math.abs(purchases.reduce((sum, t) => sum + t.amount, 0));
        const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
        const netChange = totalCredits - totalSpent;

        const dates = realTransactions.map(t => new Date(t.date));
        const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

        return {
            totalSpent,
            totalCredits,
            netChange,
            startDate,
            endDate,
            transactionCount: realTransactions.length,
            filteredCount,
        };
    }, [transactions]);

    // Calculate monthly spending trend (also filtered)
    const monthlyData = useMemo(() => {
        if (transactions.length === 0) return [];

        const realTransactions = filterRealTransactions(transactions);
        const monthlyMap = new Map<string, { spent: number; credits: number }>();

        realTransactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, { spent: 0, credits: 0 });
            }

            const entry = monthlyMap.get(monthKey)!;
            if (t.amount < 0) {
                entry.spent += Math.abs(t.amount);
            } else {
                entry.credits += t.amount;
            }
        });

        return Array.from(monthlyMap.entries())
            .map(([month, data]) => ({
                month,
                spent: parseFloat(data.spent.toFixed(2)),
                credits: parseFloat(data.credits.toFixed(2)),
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }, [transactions]);

    // Calculate top merchants
    const topMerchants = useMemo(() => {
        if (transactions.length === 0) return [];

        const merchantMap = new Map<string, { total: number; count: number }>();

        const realTransactions = filterRealTransactions(transactions);
        realTransactions
            .filter(t => t.amount < 0) // Only purchases
            .forEach(t => {
                const merchant = t.description;
                if (!merchantMap.has(merchant)) {
                    merchantMap.set(merchant, { total: 0, count: 0 });
                }
                const entry = merchantMap.get(merchant)!;
                entry.total += Math.abs(t.amount);
                entry.count += 1;
            });

        return Array.from(merchantMap.entries())
            .map(([merchant, data]) => ({
                merchant,
                total: data.total,
                count: data.count,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }, [transactions]);

    if (!summary) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    };

    const formatMonthLabel = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return (
        <div className="glass-panel rounded-xl overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg font-semibold text-slate-100">Spending Insights</h3>
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
                        {summary.transactionCount} purchases/credits
                    </span>
                    {summary.filteredCount > 0 && (
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
                            {summary.filteredCount} transfers filtered
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="px-6 pb-6 space-y-6 border-t border-white/5">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
                        {/* Total Spent */}
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-red-300 uppercase tracking-wide">Total Spent</span>
                                <TrendingDown className="w-4 h-4 text-red-400" />
                            </div>
                            <p className="text-2xl font-bold text-red-200">{formatCurrency(summary.totalSpent)}</p>
                        </div>

                        {/* Credits/Refunds */}
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-green-300 uppercase tracking-wide">Credits/Refunds</span>
                                <TrendingUp className="w-4 h-4 text-green-400" />
                            </div>
                            <p className="text-2xl font-bold text-green-200">{formatCurrency(summary.totalCredits)}</p>
                        </div>

                        {/* Net Change */}
                        <div
                            className={cn(
                                'border rounded-lg p-4',
                                summary.netChange >= 0
                                    ? 'bg-blue-500/10 border-blue-500/20'
                                    : 'bg-orange-500/10 border-orange-500/20'
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span
                                    className={cn(
                                        'text-xs uppercase tracking-wide',
                                        summary.netChange >= 0 ? 'text-blue-300' : 'text-orange-300'
                                    )}
                                >
                                    Net Change
                                </span>
                                <DollarSign
                                    className={cn('w-4 h-4', summary.netChange >= 0 ? 'text-blue-400' : 'text-orange-400')}
                                />
                            </div>
                            <p
                                className={cn(
                                    'text-2xl font-bold',
                                    summary.netChange >= 0 ? 'text-blue-200' : 'text-orange-200'
                                )}
                            >
                                {summary.netChange >= 0 ? '+' : ''}
                                {formatCurrency(Math.abs(summary.netChange))}
                            </p>
                        </div>

                        {/* Date Range */}
                        <div className="bg-slate-700/30 border border-slate-600/20 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-300 uppercase tracking-wide">Date Range</span>
                                <Calendar className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {formatDate(summary.startDate)}
                                <br />
                                to {formatDate(summary.endDate)}
                            </p>
                        </div>
                    </div>

                    {/* Spending Over Time Chart */}
                    {monthlyData.length > 0 && (
                        <div className="bg-slate-800/30 border border-white/5 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-4">Spending Over Time</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={formatMonthLabel}
                                        stroke="#94a3b8"
                                        fontSize={12}
                                    />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                        }}
                                        labelStyle={{ color: '#cbd5e1' }}
                                        formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : 'N/A'}
                                        labelFormatter={formatMonthLabel}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="spent"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        name="Spent"
                                        dot={{ fill: '#ef4444', r: 4 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="credits"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        name="Credits"
                                        dot={{ fill: '#22c55e', r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Top Merchants */}
                    {topMerchants.length > 0 && (
                        <div className="bg-slate-800/30 border border-white/5 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-4">Top Merchants (by spend)</h4>
                            <div className="space-y-2">
                                {topMerchants.map((merchant, idx) => (
                                    <div
                                        key={merchant.merchant}
                                        className="flex items-center justify-between py-2 px-3 bg-slate-700/20 rounded-lg hover:bg-slate-700/40 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                                            <span className="text-xs font-mono text-slate-500 w-5">{idx + 1}</span>
                                            <span className="text-sm text-slate-200 truncate">{merchant.merchant}</span>
                                            <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
                                                {merchant.count}x
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold text-red-300 ml-4">
                                            {formatCurrency(merchant.total)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
