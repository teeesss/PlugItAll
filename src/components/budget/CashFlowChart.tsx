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
    onCategoryClick?: (category: string) => void;
}

const CustomTooltip = ({
    active,
    payload,
}: {
    active?: boolean;
    payload?: { value: number; payload: { full: string } }[];
}) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
                <p className="text-slate-200 font-medium">{item.payload.full}</p>
                <p className="text-emerald-400 font-mono">
                    {formatDollar(item.value)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 italic">Click to view details</p>
            </div>
        );
    }
    return null;
};

export function CashFlowChart({ summary, onCategoryClick }: CashFlowChartProps) {
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
            label: 'Net Take-Home',
            value: formatDollar(monthlyNetPay),
            sub: `${monthlyGross > 0 ? formatPercent(((monthlyNetPay / monthlyGross) * 100)) : '—'} of gross`,
            color: 'text-emerald-400',
            icon: Wallet,
            iconColor: 'text-emerald-400',
        },
        {
            label: 'Total Expenses',
            value: formatDollar(monthlyExpenses),
            sub: `${monthlyNetPay > 0 ? formatPercent((monthlyExpenses / monthlyNetPay) * 100) : '—'} of net`,
            color: 'text-red-400',
            icon: TrendingDown,
            iconColor: 'text-red-400',
        },
        {
            label: 'Savings Rate',
            value: formatPercent(savingsRate),
            sub: 'Of take-home pay',
            color: 'text-indigo-400',
            icon: TrendingUp,
            iconColor: 'text-indigo-400',
        },
        {
            label: 'Carry Over',
            value: formatDollar(Math.max(monthlyRemaining, 0)),
            sub: monthlyRemaining >= 0 ? 'Monthly surplus' : 'Monthly deficit',
            color: monthlyRemaining >= 0 ? 'text-blue-400' : 'text-red-400',
            icon: ArrowRight,
            iconColor: monthlyRemaining >= 0 ? 'text-blue-400' : 'text-red-400',
        },
    ];

    // All categories with spending, sorted
    const categoryBars = useMemo(() => {
        return Object.entries(categoryTotals)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, val]) => ({
                name: cat.length > 20 ? cat.substring(0, 17) + '...' : cat,
                full: cat,
                value: Math.round(val)
            }));
    }, [categoryTotals]);

    const isConfigured = monthlyGross > 0;

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => {
                                if (stat.label === 'Net Take-Home') onCategoryClick?.('Income');
                                else if (stat.label === 'Total Expenses') onCategoryClick?.('expenses');
                                else if (stat.label === 'Carry Over') onCategoryClick?.('Transfers');
                            }}
                            className={cn(
                                "glass-panel rounded-2xl p-5 border border-white/8 bg-slate-800/20 hover:bg-slate-800/30 transition-all group cursor-pointer",
                                (stat.label === 'Savings Rate') && "cursor-default hover:bg-slate-800/20"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{stat.label}</span>
                                <Icon className={cn('w-3.5 h-3.5 transition-transform group-hover:scale-110', stat.iconColor)} />
                            </div>
                            <p className={cn('text-2xl font-bold font-mono', stat.color)}>
                                {stat.value}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">{stat.sub}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Income flow visualization (only if income is set) */}
            {isConfigured && (
                <div className="glass-panel rounded-2xl p-6 border border-white/8 bg-slate-800/10">
                    <h4 className="text-sm font-bold text-slate-300 mb-1 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                        <span>Monthly Money Flow</span>
                    </h4>
                    <p className="text-xs text-slate-500 mb-6">Visualizing where your paycheck is allocated</p>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div
                            onClick={() => onCategoryClick?.('Income')}
                            className="bg-emerald-500/15 border border-emerald-500/25 rounded-xl px-4 py-3 text-emerald-300 font-mono font-bold shadow-sm cursor-pointer hover:bg-emerald-500/25 transition-colors"
                        >
                            {formatDollar(monthlyGross)} Gross
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-700" />

                        <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                            {monthlyFederal > 0 && (
                                <span
                                    onClick={() => onCategoryClick?.('Fees & Interest')}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl cursor-pointer hover:bg-red-500/20 transition-colors"
                                >
                                    −{formatDollar(monthlyFederal)} Fed
                                </span>
                            )}
                            {monthlyState > 0 && (
                                <span
                                    onClick={() => onCategoryClick?.('Fees & Interest')}
                                    className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-2 rounded-xl cursor-pointer hover:bg-orange-500/20 transition-colors"
                                >
                                    −{formatDollar(monthlyState)} State
                                </span>
                            )}
                            {(monthlySocialSecurity + monthlyMedicare) > 0 && (
                                <span
                                    onClick={() => onCategoryClick?.('Fees & Interest')}
                                    className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-2 rounded-xl cursor-pointer hover:bg-yellow-500/20 transition-colors"
                                >
                                    −{formatDollar(monthlySocialSecurity + monthlyMedicare)} FICA
                                </span>
                            )}
                            {monthlyPreTaxDeductions > 0 && (
                                <span
                                    onClick={() => onCategoryClick?.('Savings & Investments')}
                                    className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-xl cursor-pointer hover:bg-blue-500/20 transition-colors"
                                >
                                    −{formatDollar(monthlyPreTaxDeductions)} Pre-Tax
                                </span>
                            )}
                            {monthlyPostTaxDeductions > 0 && (
                                <span
                                    onClick={() => onCategoryClick?.('Other')}
                                    className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-2 rounded-xl cursor-pointer hover:bg-purple-500/20 transition-colors"
                                >
                                    −{formatDollar(monthlyPostTaxDeductions)} Post-Tax
                                </span>
                            )}
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-700" />

                        <div
                            onClick={() => onCategoryClick?.('Income')}
                            className="bg-blue-500/15 border border-blue-500/25 rounded-xl px-4 py-3 text-blue-300 font-mono font-bold shadow-sm cursor-pointer hover:bg-blue-500/25 transition-colors"
                        >
                            {formatDollar(monthlyNetPay)} Net
                        </div>

                        {monthlyExpenses > 0 && (
                            <>
                                <ArrowRight className="w-4 h-4 text-slate-700" />
                                <div
                                    onClick={() => onCategoryClick?.('expenses')}
                                    className="bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 font-mono font-bold cursor-pointer hover:bg-slate-700/70 transition-colors"
                                >
                                    −{formatDollar(monthlyExpenses)} Expenses
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-700" />
                                <div
                                    onClick={() => onCategoryClick?.('Transfers')}
                                    className={cn(
                                        'rounded-xl px-4 py-3 font-mono font-bold border shadow-sm cursor-pointer transition-colors',
                                        monthlyRemaining >= 0
                                            ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30'
                                            : 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30'
                                    )}
                                >
                                    {monthlyRemaining >= 0 ? '+' : ''}{formatDollar(monthlyRemaining)} {monthlyRemaining >= 0 ? 'Left' : 'Deficit'}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Top Expenses Bar Chart */}
            {categoryBars.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-white/8 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-indigo-400" />
                                <span>Categorized Spending</span>
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">Click any category bar to filter the transaction list</p>
                        </div>
                    </div>

                    <div className="h-[450px] min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <BarChart
                                data={categoryBars}
                                layout="vertical"
                                margin={{ top: 0, right: 80, left: 20, bottom: 0 }}
                                onClick={(data) => {
                                    if (data && data.activePayload && data.activePayload.length > 0 && onCategoryClick) {
                                        const payload = data.activePayload[0].payload as { full: string };
                                        onCategoryClick(payload.full);
                                    }
                                }}
                                style={{ outline: 'none' }}
                            >
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={120}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ fill: 'white', opacity: 0.05, radius: 4 }}
                                />
                                <Bar
                                    dataKey="value"
                                    radius={[0, 4, 4, 0]}
                                    maxBarSize={32}
                                    className="cursor-pointer"
                                >
                                    {categoryBars.map((entry, index) => (
                                        <Cell
                                            key={entry.full}
                                            fill={`hsl(${220 + (index % 12) * 20}, 65%, 60%)`}
                                            className="hover:opacity-80 transition-opacity"
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
