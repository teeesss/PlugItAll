import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import type { LeakItem } from '../../utils/budgetEngine';
import { formatDollar } from '../../utils/budgetEngine';
import { cn } from '../../utils/cn';

interface LeakDetectorProps {
    leaks: LeakItem[];
    monthlyNetPay: number;
}

const SEVERITY_CONFIG = {
    High: {
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/25',
        dot: 'bg-red-500',
        label: 'High Priority',
        icon: Zap,
    },
    Medium: {
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/25',
        dot: 'bg-amber-500',
        label: 'Worth Reviewing',
        icon: AlertTriangle,
    },
    Low: {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/25',
        dot: 'bg-blue-500',
        label: 'Keep an Eye On',
        icon: TrendingUp,
    },
};

export function LeakDetector({ leaks, monthlyNetPay }: LeakDetectorProps) {
    if (leaks.length === 0) {
        return (
            <div className="glass-panel rounded-2xl p-6 border border-white/8">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-200 text-sm">Leak Detector</h3>
                        <p className="text-xs text-slate-500">Spending patterns that may be draining your budget</p>
                    </div>
                </div>
                <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-3">
                        <Zap className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">No significant leaks detected!</p>
                    <p className="text-slate-600 text-xs mt-1">
                        {monthlyNetPay > 0
                            ? 'Your spending looks well-balanced.'
                            : 'Add your income profile to activate leak detection.'}
                    </p>
                </div>
            </div>
        );
    }

    const highLeaks = leaks.filter(l => l.severity === 'High');
    const potentialSavings = highLeaks.reduce((sum, l) => sum + l.amount * 0.3, 0); // Rough 30% savings estimate on high leaks

    return (
        <div className="glass-panel rounded-2xl border border-white/8 overflow-hidden">
            <div className="p-5 border-b border-white/6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-200 text-sm">Leak Detector</h3>
                            <p className="text-xs text-slate-500">
                                {leaks.length} pattern{leaks.length !== 1 ? 's' : ''} detected
                            </p>
                        </div>
                    </div>
                    {potentialSavings > 0 && (
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Potential monthly savings</p>
                            <p className="text-emerald-400 font-semibold text-sm">{formatDollar(potentialSavings)}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-3">
                {leaks.map((leak, idx) => {
                    const cfg = SEVERITY_CONFIG[leak.severity];
                    const Icon = cfg.icon;
                    return (
                        <motion.div
                            key={`${leak.category}-${idx}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className={cn(
                                'flex items-start space-x-3 p-4 rounded-xl border',
                                cfg.bg
                            )}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                <Icon className={cn('w-4 h-4', cfg.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className={cn('text-xs font-semibold uppercase tracking-wider', cfg.color)}>
                                        {cfg.label}
                                    </span>
                                    <span className="font-mono text-sm text-slate-200 flex-shrink-0">
                                        {formatDollar(leak.amount)}<span className="text-slate-600 text-xs">/mo</span>
                                    </span>
                                </div>
                                <p className="text-sm text-slate-300">{leak.category}</p>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{leak.description}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
