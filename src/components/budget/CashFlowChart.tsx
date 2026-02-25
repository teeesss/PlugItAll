import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import type { BudgetSummary } from '../../utils/budgetEngine';
import { formatDollar, formatPercent } from '../../utils/budgetEngine';
import { cn } from '../../utils/cn';

interface CashFlowChartProps {
    summary: BudgetSummary;
}

const CustomTooltip = ({
    active,
    payload,
}: {
    active?: boolean;
    payload?: { name: string; value: number; payload: { positive: boolean } }[];
}) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        const isPositive = item.payload.positive;
        return (
            <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
                <p className="text-slate-200 font-medium">{item.name}</p>
                <p className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
                    {isPositive ? '+' : '-'}{formatDollar(item.value)}
                </p>
            </div>
        );
    }
    return null;
};

export function CashFlowChart({ summary }: CashFlowChartProps) {
    const {
        monthlyGross,
        monthlyFederal,
        monthlyState,
        monthlySocialSecurity,
        monthlyMedicare,
        monthlyPreTaxDeductions,
        monthlyPostTaxDeductions,
        monthlyNetPay,
        monthlyExpenses,
        monthlyRemaining,
        savingsRate,
        categoryTotals,
    } = summary;

    // Key stat cards
    const stats = [
        {
            label: 'Monthly Gross',
            value: formatDollar(monthlyGross),
            sub: 'Before deductions',
            color: 'text-slate-200',
            icon: TrendingUp,
            iconColor: 'text-emerald-400',
        },
        {
            label: 'Take-Home Pay',
            value: formatDollar(monthlyNetPay),
            sub: `${monthlyGross > 0 ? formatPercent(((monthlyNetPay / monthlyGross) * 100)) : '—'} of gross`,
            color: 'text-emerald-400',
            icon: Wallet,
            iconColor: 'text-emerald-400',
        },
        {
            label: 'Monthly Expenses',
            value: formatDollar(monthlyExpenses),
            sub: `${monthlyNetPay > 0 ? formatPercent((monthlyExpenses / monthlyNetPay) * 100) : '—'} of take-home`,
            color: 'text-red-400',
            icon: TrendingDown,
            iconColor: 'text-red-400',
        },
        {
            label: 'Monthly Remaining',
            value: formatDollar(Math.max(monthlyRemaining, 0)),
            sub: `${formatPercent(savingsRate)} savings rate`,
            color: monthlyRemaining >= 0 ? 'text-blue-400' : 'text-red-400',
            icon: ArrowRight,
            iconColor: monthlyRemaining >= 0 ? 'text-blue-400' : 'text-red-400',
        },
    ];

    // Top expense categories for bar chart
    const topExpenses = useMemo(() => {
        return Object.entries(categoryTotals)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([cat, val]) => ({ name: cat.split(' & ')[0].split(' ')[0], full: cat, value: Math.round(val) }));
    }, [categoryTotals]);

    const isConfigured = monthlyGross > 0;

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    const dimmed = !isConfigured && stat.label !== 'Monthly Expenses';
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07 }}
                            className={cn(
                                'glass-panel rounded-2xl p-4 border border-white/8',
                                dimmed && 'opacity-40'
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</span>
                                <Icon className={cn('w-4 h-4', stat.iconColor)} />
                            </div>
                            <p className={cn('text-2xl font-bold font-mono', stat.color)}>
                                {dimmed ? '—' : stat.value}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">{dimmed ? 'Set up income to unlock' : stat.sub}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Income flow visualization (only if income is set) */}
            {isConfigured && (
                <div className="glass-panel rounded-2xl p-5 border border-white/8">
                    <h4 className="text-sm font-semibold text-slate-300 mb-1">Monthly Money Flow</h4>
                    <p className="text-xs text-slate-500 mb-4">Where each dollar of your paycheck goes</p>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        {/* Gross */}
                        <div className="bg-emerald-500/15 border border-emerald-500/25 rounded-xl px-4 py-2.5 text-emerald-300 font-mono font-semibold">
                            {formatDollar(monthlyGross)} Gross
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-600" />

                        {/* Deductions block */}
                        <div className="flex flex-wrap gap-1.5">
                            {monthlyFederal > 0 && (
                                <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1.5 rounded-lg">
                                    −{formatDollar(monthlyFederal)} Fed
                                </span>
                            )}
                            {monthlyState > 0 && (
                                <span className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2.5 py-1.5 rounded-lg">
                                    −{formatDollar(monthlyState)} State
                                </span>
                            )}
                            {(monthlySocialSecurity + monthlyMedicare) > 0 && (
                                <span className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2.5 py-1.5 rounded-lg">
                                    −{formatDollar(monthlySocialSecurity + monthlyMedicare)} FICA
                                </span>
                            )}
                            {monthlyPreTaxDeductions > 0 && (
                                <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1.5 rounded-lg">
                                    −{formatDollar(monthlyPreTaxDeductions)} Pre-Tax
                                </span>
                            )}
                            {monthlyPostTaxDeductions > 0 && (
                                <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2.5 py-1.5 rounded-lg">
                                    −{formatDollar(monthlyPostTaxDeductions)} Post-Tax
                                </span>
                            )}
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-600" />

                        {/* Take-home */}
                        <div className="bg-blue-500/15 border border-blue-500/25 rounded-xl px-4 py-2.5 text-blue-300 font-mono font-semibold">
                            {formatDollar(monthlyNetPay)} Take-Home
                        </div>

                        {monthlyExpenses > 0 && (
                            <>
                                <ArrowRight className="w-4 h-4 text-slate-600" />
                                <div className="bg-slate-700/50 border border-white/8 rounded-xl px-4 py-2.5 text-slate-300 font-mono font-semibold">
                                    −{formatDollar(monthlyExpenses)} Expenses
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-600" />
                                <div className={cn(
                                    'rounded-xl px-4 py-2.5 font-mono font-semibold border',
                                    monthlyRemaining >= 0
                                        ? 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300'
                                        : 'bg-red-500/15 border-red-500/25 text-red-300'
                                )}>
                                    {monthlyRemaining >= 0 ? '+' : ''}{formatDollar(monthlyRemaining)} {monthlyRemaining >= 0 ? 'Left' : 'Deficit'}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Top Expenses Bar Chart */}
            {topExpenses.length > 0 && (
                <div className="glass-panel rounded-2xl p-5 border border-white/8">
                    <h4 className="text-sm font-semibold text-slate-300 mb-1">Top Spending Categories</h4>
                    <p className="text-xs text-slate-500 mb-4">Monthly average spend</p>
                    <div className="h-52 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={200} debounce={50}>
                            <BarChart data={topExpenses} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                                <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                    {topExpenses.map((entry, index) => (
                                        <Cell
                                            key={entry.full}
                                            fill={`hsl(${220 + index * 20}, 70%, 60%)`}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
