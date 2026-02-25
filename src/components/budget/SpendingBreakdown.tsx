import { useMemo, useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
    List,
    ChevronLeft,
    Search,
    Filter,
    AlertCircle,
    ChevronRight,
    CheckSquare,
    Square,
    Zap
} from 'lucide-react';
import type { BudgetCategory, CategorizedTransaction } from '../../utils/categorizer';
import { aggregateByCategory, getExpenses, ALL_CATEGORIES, CATEGORY_COLORS } from '../../utils/categorizer';
import { formatDollar } from '../../utils/budgetEngine';
import type { BudgetGoal } from '../../utils/budgetEngine';

interface SpendingBreakdownProps {
    transactions: CategorizedTransaction[];
    monthsOfData: number;
    budgetGoals?: BudgetGoal[];
    onCategoryChange?: (description: string, category: BudgetCategory) => void;
    onBulkCategoryChange?: (descriptions: string[], category: BudgetCategory) => void;
    defaultShowList?: boolean;
}

const DEFAULT_COLOR = '#475569';

function getColor(cat: string): string {
    return CATEGORY_COLORS[cat as BudgetCategory] ?? DEFAULT_COLOR;
}

interface TooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        payload: {
            color: string;
        };
    }>;
}

// Custom tooltip for pie chart
const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm shadow-2xl">
                <p className="text-slate-200 font-bold mb-1">{item.name}</p>
                <p className="text-slate-400">
                    <span className="text-emerald-400 font-mono font-medium">{formatDollar(item.value)}</span>
                    <span className="text-slate-600 text-xs ml-1">avg / month</span>
                </p>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full"
                        style={{ width: '100%', backgroundColor: item.payload?.color ?? DEFAULT_COLOR }}
                    />
                </div>
            </div>
        );
    }
    return null;
};

export function SpendingBreakdown({
    transactions,
    monthsOfData,
    budgetGoals = [],
    onCategoryChange,
    onBulkCategoryChange,
    defaultShowList = false
}: SpendingBreakdownProps) {
    const [showList, setShowList] = useState(defaultShowList);
    const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

    const expenses = useMemo(() => getExpenses(transactions), [transactions]);

    const monthlyByCategory = useMemo(() => {
        const raw = aggregateByCategory(expenses);
        const result: { name: string; value: number; color: string; goal?: number }[] = [];
        for (const [cat, total] of Object.entries(raw)) {
            const monthly = total / Math.max(monthsOfData, 1);
            if (monthly >= 0.01) {
                const goal = budgetGoals.find(g => g.category === cat)?.monthlyLimit;
                result.push({
                    name: cat,
                    value: Math.round(monthly),
                    color: getColor(cat),
                    goal
                });
            }
        }
        return result.sort((a, b) => b.value - a.value);
    }, [expenses, monthsOfData, budgetGoals]);

    const totalMonthly = monthlyByCategory.reduce((s, c) => s + c.value, 0);

    const categoryTransactions = useMemo(() => {
        if (!selectedCategory) return [];
        return expenses.filter(tx => tx.category === selectedCategory)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, selectedCategory]);

    const filteredCategoryTxs = useMemo(() => {
        if (!searchQuery) return categoryTransactions;
        const q = searchQuery.toLowerCase();
        return categoryTransactions.filter(tx =>
            tx.description.toLowerCase().includes(q) ||
            tx.amount.toString().includes(q)
        );
    }, [categoryTransactions, searchQuery]);

    const toggleSelect = (desc: string) => {
        const next = new Set(selectedTransactions);
        if (next.has(desc)) next.delete(desc);
        else next.add(desc);
        setSelectedTransactions(next);
    };

    const toggleSelectAll = () => {
        if (selectedTransactions.size === filteredCategoryTxs.length) {
            setSelectedTransactions(new Set());
        } else {
            setSelectedTransactions(new Set(filteredCategoryTxs.map(tx => tx.description)));
        }
    };

    const handleBulkApply = (category: BudgetCategory) => {
        if (onBulkCategoryChange) {
            onBulkCategoryChange(Array.from(selectedTransactions), category);
            setSelectedTransactions(new Set());
        } else if (onCategoryChange) {
            // Fallback to individual updates if bulk not available
            Array.from(selectedTransactions).forEach(desc => onCategoryChange(desc, category));
            setSelectedTransactions(new Set());
        }
    };

    if (monthlyByCategory.length === 0 && !selectedCategory) {
        return (
            <div className="glass-panel rounded-2xl p-6 border border-white/8 text-center py-16">
                <p className="text-slate-500">No expense data available yet.</p>
                <p className="text-slate-600 text-sm mt-1">Drop in bank or credit card statements to see your spending breakdown.</p>
            </div>
        );
    }

    const RADIAN = Math.PI / 180;
    const renderCustomLabel = ({
        cx, cy, midAngle, innerRadius, outerRadius, percent,
    }: PieLabelRenderProps) => {
        if ((percent ?? 0) < 0.05) return null;
        const r = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.5;
        const x = (cx ?? 0) + r * Math.cos(-(midAngle ?? 0) * RADIAN);
        const y = (cy ?? 0) + r * Math.sin(-(midAngle ?? 0) * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">
                {`${((percent ?? 0) * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="glass-panel rounded-2xl border border-white/8 overflow-hidden">
            <div className="p-5 border-b border-white/6 bg-slate-800/20 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {selectedCategory && (
                            <button
                                onClick={() => {
                                    setSelectedCategory(null);
                                    setSelectedTransactions(new Set());
                                }}
                                className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h3 className="font-bold text-slate-100 flex items-center space-x-2">
                                <span>{selectedCategory ? `${selectedCategory} Detail` : 'Spending Breakdown'}</span>
                                {selectedCategory && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 font-normal">
                                        Drill-down
                                    </span>
                                )}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {selectedCategory
                                    ? `Reviewing ${categoryTransactions.length} transactions`
                                    : `Monthly average · ${monthsOfData} month${monthsOfData !== 1 ? 's' : ''} data`}
                                {' · '}
                                <span className="text-indigo-400 font-mono">{formatDollar(selectedCategory ? (categoryTransactions.reduce((s, tx) => s + Math.abs(tx.amount), 0) / monthsOfData) : totalMonthly)}/mo</span>
                            </p>
                        </div>
                    </div>

                    {!selectedCategory && (
                        <button
                            onClick={() => setShowList(!showList)}
                            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-all px-3 py-1.5 rounded-xl bg-slate-800/60 border border-white/8 hover:border-white/20"
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>{showList ? 'Chart View' : 'List View'}</span>
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {selectedCategory ? (
                    <motion.div
                        key="drilldown"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col h-[450px]"
                    >
                        {/* Search & Stats Bar */}
                        <div className="px-5 py-3 bg-slate-900/40 border-b border-white/4 flex items-center justify-between gap-4">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search description or amount..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/6 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 whitespace-nowrap">
                                <Filter className="w-3 h-3" />
                                <span>Sorted by Date</span>
                            </div>
                        </div>

                        {/* Transaction Table */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md text-[10px] text-slate-500 uppercase tracking-wider z-10">
                                    <tr>
                                        <th className="px-5 py-2.5 font-semibold w-12">
                                            <button onClick={toggleSelectAll} className="p-1 hover:text-indigo-400">
                                                {selectedTransactions.size === filteredCategoryTxs.length && filteredCategoryTxs.length > 0 ? (
                                                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                                                ) : (
                                                    <Square className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="px-2 py-2.5 font-semibold w-24">Date</th>
                                        <th className="px-2 py-2.5 font-semibold">Description</th>
                                        <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                                        <th className="px-5 py-2.5 font-semibold w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {filteredCategoryTxs.map((tx, i) => (
                                        <tr
                                            key={`${tx.date}-${i}`}
                                            className={`border-b border-white/[0.03] hover:bg-white/[0.02] group transition-colors ${selectedTransactions.has(tx.description) ? 'bg-indigo-500/5' : ''}`}
                                        >
                                            <td className="px-5 py-3">
                                                <button onClick={() => toggleSelect(tx.description)} className="p-1 text-slate-600 group-hover:text-slate-400 hover:text-indigo-400">
                                                    {selectedTransactions.has(tx.description) ? (
                                                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                                                    ) : (
                                                        <Square className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-2 py-3 text-slate-500 font-mono">{tx.date}</td>
                                            <td className="px-2 py-3">
                                                <div className="text-slate-200 truncate max-w-xs group-hover:max-w-none transition-all" title={tx.description}>
                                                    {tx.description}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono font-medium text-slate-200">
                                                {formatDollar(tx.amount)}
                                            </td>
                                            <td className="px-5 py-3">
                                                <select
                                                    className="appearance-none bg-slate-800/0 border border-transparent group-hover:bg-slate-800 group-hover:border-white/10 rounded px-2 py-1 text-[10px] text-slate-500 group-hover:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all cursor-pointer"
                                                    value={tx.category}
                                                    onChange={(e) => onCategoryChange?.(tx.description, e.target.value as BudgetCategory)}
                                                >
                                                    {ALL_CATEGORIES.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCategoryTxs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-600 italic">
                                                No transactions matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Bulk Action Footer */}
                        {selectedTransactions.size > 0 && (
                            <motion.div
                                initial={{ y: 50 }}
                                animate={{ y: 0 }}
                                className="px-5 py-3 bg-indigo-600/90 backdrop-blur-md flex items-center justify-between border-t border-indigo-400/30"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-sm text-white font-medium">{selectedTransactions.size} items selected</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-[10px] text-indigo-100 uppercase tracking-wider font-bold">Categorize as:</span>
                                    <select
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer"
                                        onChange={(e) => handleBulkApply(e.target.value as BudgetCategory)}
                                        value=""
                                    >
                                        <option value="" disabled>Select category...</option>
                                        {ALL_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat} className="text-slate-900">{cat}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setSelectedTransactions(new Set())}
                                        className="text-white/60 hover:text-white text-[10px] font-bold uppercase"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ) : !showList ? (
                    <motion.div
                        key="chart"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="p-5"
                    >
                        <div className="flex flex-col lg:flex-row gap-8 items-center">
                            {/* Pie Chart */}
                            <div className="w-full lg:w-80 h-72 min-h-[280px] relative">
                                <ResponsiveContainer width="100%" height="100%" minHeight={280} debounce={50}>
                                    <PieChart>
                                        <Pie
                                            data={monthlyByCategory}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={115}
                                            paddingAngle={3}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderCustomLabel}
                                            stroke="rgba(0,0,0,0.1)"
                                            className="cursor-pointer"
                                            onClick={(data) => setSelectedCategory(data.name as BudgetCategory)}
                                        >
                                            {monthlyByCategory.map(entry => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={entry.color}
                                                    className="hover:opacity-80 transition-opacity"
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Monthly</p>
                                    <p className="text-lg font-bold text-slate-100">{formatDollar(totalMonthly)}</p>
                                </div>
                            </div>

                            {/* Legend - Responsive Grid */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 w-full">
                                {monthlyByCategory.map(item => {
                                    const pct = totalMonthly > 0 ? ((item.value / totalMonthly) * 100).toFixed(1) : '0';
                                    const isOver = item.goal && item.value > item.goal;

                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => setSelectedCategory(item.name as BudgetCategory)}
                                            className="flex flex-col group p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] hover:border-white/10 transition-all text-left overflow-hidden relative"
                                        >
                                            {isOver && (
                                                <div className="absolute top-0 right-0 p-1.5 opacity-40">
                                                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2.5 min-w-0">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-lg"
                                                        style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }}
                                                    />
                                                    <span className="text-[11px] font-semibold text-slate-300 truncate tracking-tight uppercase">{item.name}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <span className="text-[11px] font-mono font-bold text-slate-100">{formatDollar(item.value)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000"
                                                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-600 font-mono w-8 text-right">{pct}%</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-5 space-y-4"
                    >
                        {monthlyByCategory.map((item, idx) => {
                            const pct = totalMonthly > 0 ? (item.value / totalMonthly) * 100 : 0;
                            const isOver = item.goal && item.value > item.goal;
                            const overPct = item.goal ? (item.value / item.goal) * 100 : 0;

                            return (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    onClick={() => setSelectedCategory(item.name as BudgetCategory)}
                                    className="group cursor-pointer"
                                >
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <div className="flex items-center space-x-3">
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="text-slate-200 font-medium group-hover:text-white transition-colors uppercase text-xs tracking-wider">{item.name}</span>
                                            {isOver && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold border border-red-500/20">
                                                    {(overPct - 100).toFixed(0)}% OVER BUDGET
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-xs font-mono text-slate-200 font-bold">{formatDollar(item.value)}</p>
                                                <p className="text-[10px] text-slate-600 uppercase font-bold tracking-tighter">PER MONTH</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>

                                    <div className="relative h-2.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                                        {/* Main distribution bar */}
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, ease: 'circOut', delay: idx * 0.05 }}
                                            className="absolute inset-y-0 left-0 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />

                                        {/* Goal marker if exists */}
                                        {item.goal && (
                                            <div
                                                className="absolute inset-y-0 w-0.5 bg-white/40 z-10 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                                style={{ left: `${Math.min((item.goal / item.value) * pct, 100)}%` }}
                                                title={`Budget Goal: ${formatDollar(item.goal)}`}
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Footer Info */}
            {!selectedCategory && (
                <div className="px-5 py-4 bg-slate-900/30 border-t border-white/4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            <span className="w-2 h-2 rounded-full border border-white/20" />
                            <span>Click any category to drill down</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SpendingBreakdown;
