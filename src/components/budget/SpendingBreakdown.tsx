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
import { ChevronDown, ChevronUp, List } from 'lucide-react';
import type { BudgetCategory, CategorizedTransaction } from '../../utils/categorizer';
import { aggregateByCategory, getExpenses } from '../../utils/categorizer';
import { formatDollar } from '../../utils/budgetEngine';

interface SpendingBreakdownProps {
    transactions: CategorizedTransaction[];
    monthsOfData: number;
}

// Curated color palette for categories
const CATEGORY_COLORS: Partial<Record<BudgetCategory, string>> = {
    Housing: '#6366f1',
    Utilities: '#8b5cf6',
    Groceries: '#22c55e',
    'Dining & Restaurants': '#f59e0b',
    Transportation: '#3b82f6',
    'Fuel & Gas': '#ef4444',
    Healthcare: '#ec4899',
    Insurance: '#14b8a6',
    'Subscriptions & Streaming': '#a855f7',
    'Shopping & Retail': '#f97316',
    Entertainment: '#eab308',
    Travel: '#06b6d4',
    Education: '#84cc16',
    'Savings & Investments': '#10b981',
    'Fees & Interest': '#dc2626',
    Childcare: '#fb7185',
    Pets: '#fbbf24',
    'Personal Care': '#c084fc',
    'Gifts & Donations': '#34d399',
    Transfers: '#64748b',
    Income: '#4ade80',
    Other: '#475569',
};

const DEFAULT_COLOR = '#475569';

function getColor(cat: string): string {
    return CATEGORY_COLORS[cat as BudgetCategory] ?? DEFAULT_COLOR;
}

// Custom tooltip for pie chart
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
                <p className="text-slate-200 font-medium">{item.name}</p>
                <p className="text-slate-400">{formatDollar(item.value)}<span className="text-slate-600 text-xs">/mo</span></p>
            </div>
        );
    }
    return null;
};

export function SpendingBreakdown({ transactions, monthsOfData }: SpendingBreakdownProps) {
    const [showList, setShowList] = useState(false);

    const expenses = useMemo(() => getExpenses(transactions), [transactions]);

    const monthlyByCategory = useMemo(() => {
        const raw = aggregateByCategory(expenses);
        const result: { name: string; value: number; color: string }[] = [];
        for (const [cat, total] of Object.entries(raw)) {
            const monthly = total / Math.max(monthsOfData, 1);
            if (monthly >= 1) {
                result.push({ name: cat, value: Math.round(monthly), color: getColor(cat) });
            }
        }
        return result.sort((a, b) => b.value - a.value);
    }, [expenses, monthsOfData]);

    const totalMonthly = monthlyByCategory.reduce((s, c) => s + c.value, 0);

    if (monthlyByCategory.length === 0) {
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
        if ((percent ?? 0) < 0.04) return null;
        const safeR = RADIAN;
        const r = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.5;
        const x = (cx ?? 0) + r * Math.cos(-(midAngle ?? 0) * safeR);
        const y = (cy ?? 0) + r * Math.sin(-(midAngle ?? 0) * safeR);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
                {`${((percent ?? 0) * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="glass-panel rounded-2xl border border-white/8 overflow-hidden">
            <div className="p-5 border-b border-white/6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-200">Spending Breakdown</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Monthly average over {monthsOfData} month{monthsOfData !== 1 ? 's' : ''}
                            {' · '}
                            <span className="text-slate-400 font-medium">{formatDollar(totalMonthly)}/mo total</span>
                        </p>
                    </div>
                    <button
                        onClick={() => setShowList(!showList)}
                        className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/8"
                    >
                        <List className="w-3.5 h-3.5" />
                        <span>{showList ? 'Chart' : 'List'}</span>
                        {showList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!showList ? (
                    <motion.div
                        key="chart"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-5"
                    >
                        <div className="flex flex-col lg:flex-row gap-6 items-center">
                            {/* Pie Chart */}
                            <div className="w-full lg:w-80 h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={monthlyByCategory}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={110}
                                            paddingAngle={2}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderCustomLabel}
                                        >
                                            {monthlyByCategory.map(entry => (
                                                <Cell key={entry.name} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {monthlyByCategory.map(item => {
                                    const pct = totalMonthly > 0 ? ((item.value / totalMonthly) * 100).toFixed(1) : '0';
                                    return (
                                        <div key={item.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <span
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="text-xs text-slate-300 truncate">{item.name}</span>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-2">
                                                <span className="text-xs font-mono text-slate-300">{formatDollar(item.value)}</span>
                                                <span className="text-xs text-slate-600 ml-1">({pct}%)</span>
                                            </div>
                                        </div>
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
                        className="p-5 space-y-2"
                    >
                        {monthlyByCategory.map((item, idx) => {
                            const pct = totalMonthly > 0 ? (item.value / totalMonthly) * 100 : 0;
                            return (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="space-y-1"
                                >
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="text-slate-300">{item.name}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                                            <span className="font-mono text-slate-200 text-xs">{formatDollar(item.value)}/mo</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.04 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
