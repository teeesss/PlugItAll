import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    Plus,
    Trash2,
    CheckCircle,
    AlertTriangle,
    XCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import type { BudgetGoal } from '../../utils/budgetEngine';
import { formatDollar, saveBudgetGoals } from '../../utils/budgetEngine';
import type { BudgetCategory } from '../../utils/categorizer';
import { cn } from '../../utils/cn';

const BUDGET_CATEGORIES: BudgetCategory[] = [
    'Housing',
    'Utilities',
    'Groceries',
    'Dining & Restaurants',
    'Transportation',
    'Fuel & Gas',
    'Healthcare',
    'Insurance',
    'Subscriptions & Streaming',
    'Shopping & Retail',
    'Entertainment',
    'Travel',
    'Education',
    'Savings & Investments',
    'Childcare',
    'Pets',
    'Personal Care',
    'Gifts & Donations',
    'Fees & Interest',
    'Other',
];

interface BudgetGoalsProps {
    goals: BudgetGoal[];
    onUpdate: (goals: BudgetGoal[]) => void;
    categoryActuals: Partial<Record<BudgetCategory, number>>;
}

const STATUS_CONFIG = {
    OK: {
        icon: CheckCircle,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/15 border-emerald-500/25',
        bar: 'bg-emerald-400',
    },
    Warning: {
        icon: AlertTriangle,
        color: 'text-amber-400',
        bg: 'bg-amber-500/15 border-amber-500/25',
        bar: 'bg-amber-400',
    },
    Over: {
        icon: XCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/15 border-red-500/25',
        bar: 'bg-red-400',
    },
};

export function BudgetGoals({ goals, onUpdate, categoryActuals }: BudgetGoalsProps) {
    const [expanded, setExpanded] = useState(true);
    const [newCategory, setNewCategory] = useState<BudgetCategory>('Dining & Restaurants');
    const [newLimit, setNewLimit] = useState('');

    const addGoal = () => {
        if (!newLimit || parseFloat(newLimit) <= 0) return;
        const existing = goals.find(g => g.category === newCategory);
        if (existing) {
            // Update existing
            const updated = goals.map(g =>
                g.category === newCategory ? { ...g, monthlyLimit: parseFloat(newLimit) } : g
            );
            onUpdate(updated);
            saveBudgetGoals(updated);
        } else {
            const updated = [
                ...goals,
                { category: newCategory, monthlyLimit: parseFloat(newLimit) },
            ];
            onUpdate(updated);
            saveBudgetGoals(updated);
        }
        setNewLimit('');
    };

    const removeGoal = (cat: BudgetCategory) => {
        const updated = goals.filter(g => g.category !== cat);
        onUpdate(updated);
        saveBudgetGoals(updated);
    };

    // Compute status for each goal
    const goalsWithStatus = goals.map(g => {
        const actual = categoryActuals[g.category] ?? 0;
        const delta = g.monthlyLimit - actual;
        const percentUsed = g.monthlyLimit > 0 ? (actual / g.monthlyLimit) * 100 : 0;
        let status: 'OK' | 'Warning' | 'Over';
        if (percentUsed >= 100) status = 'Over';
        else if (percentUsed >= 80) status = 'Warning';
        else status = 'OK';
        return { ...g, actual, delta, percentUsed: Math.min(percentUsed, 100), status };
    });

    const availableCategories = BUDGET_CATEGORIES.filter(
        cat => !goals.some(g => g.category === cat)
    );

    return (
        <div className="glass-panel rounded-2xl border border-white/8 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
            >
                <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                        <Target className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-slate-200 text-sm">Budget Goals</h3>
                        <p className="text-xs text-slate-500">
                            {goals.length === 0
                                ? 'Set monthly spending targets per category'
                                : `${goals.length} goal${goals.length !== 1 ? 's' : ''} · ${goalsWithStatus.filter(g => g.status === 'Over').length} over budget`}
                        </p>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-4 border-t border-white/6">
                            {/* Add new goal */}
                            <div className="mt-4 flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Category</label>
                                    <select
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value as BudgetCategory)}
                                        className="w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-slate-100 text-sm
                               focus:outline-none focus:border-indigo-500/50 transition-all appearance-none"
                                    >
                                        {(availableCategories.length > 0 ? availableCategories : BUDGET_CATEGORIES).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-28 space-y-1">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Monthly Limit</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="10"
                                            placeholder="0"
                                            value={newLimit}
                                            onChange={e => setNewLimit(e.target.value)}
                                            className="w-full pl-7 pr-2 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-slate-100 text-sm
                                 focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-600"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={addGoal}
                                    disabled={!newLimit || parseFloat(newLimit) <= 0}
                                    className="flex items-center space-x-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                             disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Set</span>
                                </button>
                            </div>

                            {/* Goals list */}
                            {goalsWithStatus.length === 0 ? (
                                <div className="text-center py-6 text-slate-600 text-sm">
                                    No goals set yet. Add your first budget target above.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {goalsWithStatus.map((g, idx) => {
                                        const cfg = STATUS_CONFIG[g.status];
                                        const Icon = cfg.icon;
                                        return (
                                            <motion.div
                                                key={g.category}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="space-y-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <Icon className={cn('w-4 h-4', cfg.color)} />
                                                        <span className="text-sm text-slate-200">{g.category}</span>
                                                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
                                                            {g.status === 'Over' ? 'Over Budget' : g.status === 'Warning' ? 'Near Limit' : 'On Track'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="text-right">
                                                            <span className={cn('font-mono text-sm', g.status === 'Over' ? 'text-red-400' : 'text-slate-300')}>
                                                                {formatDollar(g.actual)}
                                                            </span>
                                                            <span className="text-slate-600 text-xs">
                                                                {' '}/ {formatDollar(g.monthlyLimit)}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => removeGoal(g.category)}
                                                            className="text-slate-700 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(g.percentUsed, 100)}%` }}
                                                        transition={{ duration: 0.7, ease: 'easeOut', delay: idx * 0.05 }}
                                                        className={cn('h-full rounded-full', cfg.bar)}
                                                    />
                                                </div>
                                                {g.status === 'Over' && (
                                                    <p className="text-xs text-red-400">
                                                        {formatDollar(Math.abs(g.delta))} over your budget this month
                                                    </p>
                                                )}
                                                {g.status === 'Warning' && (
                                                    <p className="text-xs text-amber-400">
                                                        {formatDollar(g.delta)} remaining — approaching your limit
                                                    </p>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
