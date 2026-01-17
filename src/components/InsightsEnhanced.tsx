import { useMemo, useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Filter,
    Search,
    X,
    ArrowUpDown,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../utils/cn';
import type { Transaction } from '../utils/analyzer';
import { filterRealTransactions } from '../utils/transactionFilters';

interface InsightsProps {
    transactions: Transaction[];
}

type TransactionType = 'all' | 'purchases' | 'credits';
type SortOption = 'largest' | 'smallest' | 'most-frequent' | 'alphabetical';
type DateRange = '30days' | '3months' | '6months' | 'ytd' | 'all';

interface MerchantDetail {
    merchant: string;
    transactions: Transaction[];
    total: number;
    count: number;
}

export function InsightsEnhanced({ transactions }: InsightsProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
    const [sortBy, setSortBy] = useState<SortOption>('largest');
    const [dateRange, setDateRange] = useState<DateRange>('all');
    const [merchantSearch, setMerchantSearch] = useState('');
    const [selectedMerchant, setSelectedMerchant] = useState<MerchantDetail | null>(null);

    // Calculate dynamic date range options based on data
    const dateRangeOptions = useMemo(() => {
        if (transactions.length === 0) return [];

        const dates = transactions.map((t) => new Date(t.date));
        const oldestDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const newestDate = new Date(Math.max(...dates.map((d) => d.getTime())));
        const daysDiff = Math.floor((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
        const monthsDiff = Math.floor(daysDiff / 30);
        const yearsDiff = Math.floor(daysDiff / 365);

        const options: Array<{ key: DateRange | string; label: string }> = [];

        // Always show common options if data supports them
        if (daysDiff >= 30) options.push({ key: '30days', label: '30 Days' });
        if (monthsDiff >= 3) options.push({ key: '3months', label: '3 Months' });
        if (monthsDiff >= 6) options.push({ key: '6months', label: '6 Months' });

        // Add year options dynamically
        if (yearsDiff >= 1) {
            for (let i = 1; i <= Math.min(yearsDiff, 3); i++) {
                options.push({ key: `${i}year` as DateRange, label: `${i} Year${i > 1 ? 's' : ''}` });
            }
        }

        // Always show YTD and All
        options.push({ key: 'ytd', label: 'YTD' });
        options.push({ key: 'all', label: 'All Time' });

        return options;
    }, [transactions]);

    // Apply date range filter
    const dateFilteredTransactions = useMemo(() => {
        if (dateRange === 'all') return transactions;

        const now = new Date();
        const cutoffDate = new Date();

        if (dateRange.endsWith('year')) {
            const years = parseInt(dateRange.replace('year', ''));
            cutoffDate.setFullYear(now.getFullYear() - years);
        } else {
            switch (dateRange) {
                case '30days':
                    cutoffDate.setDate(now.getDate() - 30);
                    break;
                case '3months':
                    cutoffDate.setMonth(now.getMonth() - 3);
                    break;
                case '6months':
                    cutoffDate.setMonth(now.getMonth() - 6);
                    break;
                case 'ytd':
                    cutoffDate.setMonth(0, 1); // January 1st of current year
                    break;
            }
        }

        return transactions.filter((t) => new Date(t.date) >= cutoffDate);
    }, [transactions, dateRange]);

    // Apply transfer filtering
    const realTransactions = useMemo(
        () => filterRealTransactions(dateFilteredTransactions),
        [dateFilteredTransactions]
    );

    // Apply type filter
    const typeFilteredTransactions = useMemo(() => {
        if (typeFilter === 'all') return realTransactions;
        if (typeFilter === 'purchases') return realTransactions.filter((t) => t.amount < 0);
        return realTransactions.filter((t) => t.amount > 0);
    }, [realTransactions, typeFilter]);

    // Calculate summary
    const summary = useMemo(() => {
        if (typeFilteredTransactions.length === 0) return null;

        const purchases = typeFilteredTransactions.filter((t) => t.amount < 0);
        const credits = typeFilteredTransactions.filter((t) => t.amount > 0);

        const totalSpent = Math.abs(purchases.reduce((sum, t) => sum + t.amount, 0));
        const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
        const netChange = totalCredits - totalSpent;

        const dates = typeFilteredTransactions.map((t) => new Date(t.date));
        const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        return {
            totalSpent,
            totalCredits,
            netChange,
            startDate,
            endDate,
            transactionCount: typeFilteredTransactions.length,
            filteredCount: transactions.length - realTransactions.length,
        };
    }, [typeFilteredTransactions, transactions.length, realTransactions.length]);

    // Calculate monthly data
    const monthlyData = useMemo(() => {
        const monthlyMap = new Map<string, { spent: number; credits: number }>();

        typeFilteredTransactions.forEach((t) => {
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
    }, [typeFilteredTransactions]);

    // Calculate top merchants (purchases)
    const topMerchants = useMemo(() => {
        const merchantMap = new Map<string, MerchantDetail>();

        typeFilteredTransactions
            .filter((t) => t.amount < 0)
            .forEach((t) => {
                const merchant = t.description;
                if (!merchantMap.has(merchant)) {
                    merchantMap.set(merchant, { merchant, total: 0, count: 0, transactions: [] });
                }
                const entry = merchantMap.get(merchant)!;
                entry.total += Math.abs(t.amount);
                entry.count += 1;
                entry.transactions.push(t);
            });

        let merchants = Array.from(merchantMap.values());

        // Apply merchant search filter
        if (merchantSearch.trim()) {
            const search = merchantSearch.toLowerCase();
            merchants = merchants.filter((m) => m.merchant.toLowerCase().includes(search));
        }

        // Apply sort
        switch (sortBy) {
            case 'largest':
                merchants.sort((a, b) => b.total - a.total);
                break;
            case 'smallest':
                merchants.sort((a, b) => a.total - b.total);
                break;
            case 'most-frequent':
                merchants.sort((a, b) => b.count - a.count);
                break;
            case 'alphabetical':
                merchants.sort((a, b) => a.merchant.localeCompare(b.merchant));
                break;
        }

        return merchants.slice(0, 10);
    }, [typeFilteredTransactions, sortBy, merchantSearch]);

    // Calculate top credits
    const topCredits = useMemo(() => {
        const creditMap = new Map<string, MerchantDetail>();

        typeFilteredTransactions
            .filter((t) => t.amount > 0)
            .forEach((t) => {
                const source = t.description;
                if (!creditMap.has(source)) {
                    creditMap.set(source, { merchant: source, total: 0, count: 0, transactions: [] });
                }
                const entry = creditMap.get(source)!;
                entry.total += t.amount;
                entry.count += 1;
                entry.transactions.push(t);
            });

        let credits = Array.from(creditMap.values());

        // Apply merchant search filter
        if (merchantSearch.trim()) {
            const search = merchantSearch.toLowerCase();
            credits = credits.filter((c) => c.merchant.toLowerCase().includes(search));
        }

        // Apply sort
        switch (sortBy) {
            case 'largest':
                credits.sort((a, b) => b.total - a.total);
                break;
            case 'smallest':
                credits.sort((a, b) => a.total - b.total);
                break;
            case 'most-frequent':
                credits.sort((a, b) => b.count - a.count);
                break;
            case 'alphabetical':
                credits.sort((a, b) => a.merchant.localeCompare(b.merchant));
                break;
        }

        return credits.slice(0, 10);
    }, [typeFilteredTransactions, sortBy, merchantSearch]);

    if (!summary) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
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

    const activeFiltersCount = [
        typeFilter !== 'all',
        dateRange !== 'all',
        merchantSearch.trim() !== '',
    ].filter(Boolean).length;

    return (
        <div className="glass-panel rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg font-semibold text-slate-100">Spending Insights</h3>
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
                        {summary.transactionCount} {typeFilter === 'all' ? 'purchases/credits' : typeFilter}
                    </span>
                    {summary.filteredCount > 0 && (
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
                            {summary.filteredCount} transfers filtered
                        </span>
                    )}
                    {activeFiltersCount > 0 && (
                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">
                            {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
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
                    {/* Filter Controls */}
                    <div className="pt-6 space-y-4">
                        {/* Transaction Type Filter */}
                        <div className="flex items-center space-x-3">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-400 uppercase tracking-wide">Type:</span>
                            <div className="flex space-x-2">
                                {(['all', 'purchases', 'credits'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setTypeFilter(type)}
                                        className={cn(
                                            'px-3 py-1 text-xs rounded-full transition-all',
                                            typeFilter === type
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                        )}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range Filter - Dynamic */}
                        <div className="flex items-center space-x-3">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-400 uppercase tracking-wide">Period:</span>
                            <div className="flex space-x-2 flex-wrap gap-2">
                                {dateRangeOptions.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setDateRange(key as DateRange)}
                                        className={cn(
                                            'px-3 py-1 text-xs rounded-full transition-all',
                                            dateRange === key
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort & Search Row */}
                        <div className="flex items-center space-x-4">
                            {/* Sort Options */}
                            <div className="flex items-center space-x-3">
                                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                                <span className="text-xs text-slate-400 uppercase tracking-wide">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="bg-slate-800 text-slate-100 text-xs rounded px-3 py-1.5 border border-slate-600 focus:border-indigo-500 focus:outline-none cursor-pointer hover:bg-slate-750 transition-colors"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="largest">Largest First</option>
                                    <option value="smallest">Smallest First</option>
                                    <option value="most-frequent">Most Frequent</option>
                                    <option value="alphabetical">A-Z</option>
                                </select>
                            </div>

                            {/* Merchant Search */}
                            <div className="flex-1 flex items-center space-x-2">
                                <Search className="w-4 h-4 text-slate-400" />
                                <div className="relative flex-1 max-w-xs">
                                    <input
                                        type="text"
                                        value={merchantSearch}
                                        onChange={(e) => setMerchantSearch(e.target.value)}
                                        placeholder="Search merchants..."
                                        className="w-full bg-slate-700/50 text-slate-300 text-xs rounded px-3 py-1 pr-8 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                                    />
                                    {merchantSearch && (
                                        <button
                                            onClick={() => setMerchantSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                    {/* Charts */}
                    {monthlyData.length > 0 && (
                        <div className="bg-slate-800/30 border border-white/5 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-4">Spending Over Time</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                        }}
                                        labelStyle={{ color: '#cbd5e1' }}
                                        formatter={(value: number | undefined) =>
                                            value !== undefined ? formatCurrency(value) : 'N/A'
                                        }
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

                    {/* Top Merchants (Purchases) */}
                    {topMerchants.length > 0 && (
                        <div className="bg-slate-800/30 border border-white/5 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-4">Top Merchants (by spend)</h4>
                            <div className="space-y-2">
                                {topMerchants.map((merchant, idx) => (
                                    <button
                                        key={merchant.merchant}
                                        onClick={() => setSelectedMerchant(merchant)}
                                        className="w-full flex items-center justify-between py-2 px-3 bg-slate-700/20 rounded-lg hover:bg-slate-700/40 transition-colors cursor-pointer"
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
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Credits */}
                    {topCredits.length > 0 && (
                        <div className="bg-slate-800/30 border border-white/5 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-4">Top Credits (by amount)</h4>
                            <div className="space-y-2">
                                {topCredits.map((credit, idx) => (
                                    <button
                                        key={credit.merchant}
                                        onClick={() => setSelectedMerchant(credit)}
                                        className="w-full flex items-center justify-between py-2 px-3 bg-slate-700/20 rounded-lg hover:bg-slate-700/40 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                                            <span className="text-xs font-mono text-slate-500 w-5">{idx + 1}</span>
                                            <span className="text-sm text-slate-200 truncate">{credit.merchant}</span>
                                            <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
                                                {credit.count}x
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold text-green-300 ml-4">
                                            {formatCurrency(credit.total)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Merchant Detail Modal */}
            {selectedMerchant && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedMerchant(null)}
                >
                    <div
                        className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100">{selectedMerchant.merchant}</h3>
                                <p className="text-sm text-slate-400">
                                    {selectedMerchant.count} transaction{selectedMerchant.count > 1 ? 's' : ''} •{' '}
                                    {formatCurrency(selectedMerchant.total)} total
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedMerchant(null)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Transaction List */}
                        <div className="overflow-y-auto p-4 space-y-2">
                            {selectedMerchant.transactions.map((t, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between py-2 px-3 bg-slate-700/30 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-200">{t.description}</p>
                                        <p className="text-xs text-slate-500">{formatDate(new Date(t.date))}</p>
                                    </div>
                                    <span
                                        className={cn(
                                            'text-sm font-semibold ml-4',
                                            t.amount < 0 ? 'text-red-300' : 'text-green-300'
                                        )}
                                    >
                                        {t.amount < 0 ? '-' : '+'}
                                        {formatCurrency(Math.abs(t.amount))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
