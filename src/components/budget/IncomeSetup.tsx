import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, ChevronDown, ChevronUp, Plus, Trash2, Sparkles } from 'lucide-react';
import type { IncomeProfile, Deduction, PayFrequency } from '../../utils/budgetEngine';
import { saveIncomeProfile } from '../../utils/budgetEngine';
import { cn } from '../../utils/cn';

interface IncomeSetupProps {
    profile: IncomeProfile;
    onUpdate: (profile: IncomeProfile) => void;
}

const FREQUENCY_LABELS: Record<PayFrequency, string> = {
    weekly: 'Weekly (52x/yr)',
    biweekly: 'Bi-Weekly (26x/yr)',
    semimonthly: 'Semi-Monthly (24x/yr)',
    monthly: 'Monthly (12x/yr)',
    annually: 'Annually (1x/yr)',
};

function CurrencyInput({
    label,
    value,
    onChange,
    helper,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    helper?: string;
}) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {label}
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                    type="number"
                    min="0"
                    step="1"
                    value={value === 0 ? '' : value}
                    onChange={e => onChange(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-slate-100 text-sm
                     focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all placeholder-slate-600"
                />
            </div>
            {helper && <p className="text-xs text-slate-600">{helper}</p>}
        </div>
    );
}

export function IncomeSetup({ profile, onUpdate }: IncomeSetupProps) {
    const [expanded, setExpanded] = useState(true);
    const [deductionLabel, setDeductionLabel] = useState('');
    const [deductionAmount, setDeductionAmount] = useState('');
    const [deductionType, setDeductionType] = useState<'pretax' | 'posttax'>('pretax');

    const update = (partial: Partial<IncomeProfile>) => {
        const updated = { ...profile, ...partial };
        onUpdate(updated);
        saveIncomeProfile(updated);
    };

    const addDeduction = () => {
        if (!deductionLabel.trim() || !deductionAmount) return;
        const newDed: Deduction = {
            id: `ded-${Date.now()}`,
            label: deductionLabel.trim(),
            amount: parseFloat(deductionAmount) || 0,
            type: deductionType,
        };
        update({ deductions: [...profile.deductions, newDed] });
        setDeductionLabel('');
        setDeductionAmount('');
    };

    const removeDeduction = (id: string) => {
        update({ deductions: profile.deductions.filter(d => d.id !== id) });
    };

    const isSetup = profile.grossPayPerPeriod > 0;

    return (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/8">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
            >
                <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-slate-200 text-sm">Income & Deductions</h3>
                        <p className="text-xs text-slate-500">
                            {isSetup
                                ? `$${profile.grossPayPerPeriod.toLocaleString()} ${profile.payFrequency} gross · ${profile.deductions.length} deductions`
                                : 'Set up your pay to unlock all budget features'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {isSetup && (
                        <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                            Configured
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                </div>
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
                        <div className="px-5 pb-5 space-y-6 border-t border-white/6">
                            {/* Quick tip */}
                            <div className="mt-4 flex items-start space-x-2 bg-indigo-500/8 border border-indigo-500/20 rounded-xl px-4 py-3">
                                <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-indigo-300/80">
                                    Enter your <strong>per-paycheck</strong> amounts from your pay stub. All calculations stay 100% in your browser.
                                </p>
                            </div>

                            {/* Gross Pay + Frequency */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <CurrencyInput
                                    label="Gross Pay Per Paycheck"
                                    value={profile.grossPayPerPeriod}
                                    onChange={v => update({ grossPayPerPeriod: v })}
                                    helper="Before any deductions"
                                />
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Pay Frequency
                                    </label>
                                    <select
                                        value={profile.payFrequency}
                                        onChange={e => update({ payFrequency: e.target.value as PayFrequency })}
                                        className="w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-slate-100 text-sm
                               focus:outline-none focus:border-indigo-500/50 transition-all appearance-none"
                                    >
                                        {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Tax Withholdings */}
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Tax Withholdings (per paycheck)
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <CurrencyInput
                                        label="Federal"
                                        value={profile.federalWithholding}
                                        onChange={v => update({ federalWithholding: v })}
                                    />
                                    <CurrencyInput
                                        label="State"
                                        value={profile.stateWithholding}
                                        onChange={v => update({ stateWithholding: v })}
                                    />
                                    <CurrencyInput
                                        label="Social Security"
                                        value={profile.socialSecurity}
                                        onChange={v => update({ socialSecurity: v })}
                                    />
                                    <CurrencyInput
                                        label="Medicare"
                                        value={profile.medicare}
                                        onChange={v => update({ medicare: v })}
                                    />
                                </div>
                            </div>

                            {/* Custom Deductions */}
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Other Deductions (per paycheck)
                                </p>

                                {/* Existing deductions */}
                                {profile.deductions.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {profile.deductions.map(d => (
                                            <div
                                                key={d.id}
                                                className="flex items-center justify-between px-3 py-2 bg-slate-800/40 rounded-xl border border-white/6"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <span
                                                        className={cn(
                                                            'text-xs px-2 py-0.5 rounded-full font-medium',
                                                            d.type === 'pretax'
                                                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                                                                : 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                                                        )}
                                                    >
                                                        {d.type === 'pretax' ? 'Pre-Tax' : 'Post-Tax'}
                                                    </span>
                                                    <span className="text-sm text-slate-300">{d.label}</span>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-sm font-mono text-slate-300">
                                                        ${d.amount.toFixed(2)}
                                                    </span>
                                                    <button
                                                        onClick={() => removeDeduction(d.id)}
                                                        className="text-slate-600 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add new deduction */}
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-5">
                                        <input
                                            type="text"
                                            placeholder="e.g. 401(k), Health Insurance, HSA"
                                            value={deductionLabel}
                                            onChange={e => setDeductionLabel(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-slate-100 text-sm
                                 focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-600"
                                        />
                                    </div>
                                    <div className="col-span-2 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            min="0"
                                            value={deductionAmount}
                                            onChange={e => setDeductionAmount(e.target.value)}
                                            className="w-full pl-7 pr-2 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-slate-100 text-sm
                                 focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-600"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <select
                                            value={deductionType}
                                            onChange={e => setDeductionType(e.target.value as 'pretax' | 'posttax')}
                                            className="w-full px-2 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-slate-100 text-xs
                                 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none"
                                        >
                                            <option value="pretax">Pre-Tax</option>
                                            <option value="posttax">Post-Tax</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <button
                                            onClick={addDeduction}
                                            disabled={!deductionLabel.trim() || !deductionAmount}
                                            className="w-full flex items-center justify-center space-x-1 py-2.5 rounded-xl bg-indigo-600
                                 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs
                                 font-medium transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
