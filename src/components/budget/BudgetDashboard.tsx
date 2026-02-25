import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    PieChart,
    BarChart2,
    RefreshCcw,
    Sparkles,
    Edit3,
} from 'lucide-react';
import type { Transaction } from '../../utils/analyzer';
import { categorizeAll } from '../../utils/categorizer';
import {
    computeBudgetSummary,
    estimateMonthsOfData,
    saveBudgetGoals,
    formatDollar,
} from '../../utils/budgetEngine';
import type { IncomeProfile, BudgetGoal } from '../../utils/budgetEngine';
import type { BudgetCategory } from '../../utils/categorizer';
import { IncomeSetup } from './IncomeSetup';
import { SpendingBreakdown } from './SpendingBreakdown';
import { BudgetGoals } from './BudgetGoals';
import { getCategoryOverrides, saveCategoryOverride } from '../../utils/categoryStorage';

import { CashFlowChart } from './CashFlowChart';
import { FileUpload } from '../FileUpload';
import { PrivacyBanner } from '../PrivacyBanner';
import { parseCSV, parsePDF, isSupportedFile } from '../../utils/parser';
import { cn } from '../../utils/cn';

interface BudgetDashboardProps {
    /** Transactions already loaded in the Subscriptions tab (shared pool) */
    sharedTransactions: Transaction[];
    incomeProfile: IncomeProfile;
    budgetGoals: BudgetGoal[];
    onUpdateIncome: (profile: IncomeProfile) => void;
    onUpdateGoals: (goals: BudgetGoal[]) => void;
    onShowToast: (message: string) => void;
}

type BudgetView = 'overview' | 'spending' | 'reconciliation' | 'goals' | 'setup';

const TAB_VIEWS = [
    { id: 'overview' as BudgetView, label: 'Overview', icon: BarChart2 },
    { id: 'spending' as BudgetView, label: 'Spending', icon: PieChart },
    { id: 'reconciliation' as BudgetView, label: 'Audit / Reconciliation', icon: RefreshCcw },
    { id: 'goals' as BudgetView, label: 'Goals', icon: Edit3 },
    { id: 'setup' as BudgetView, label: 'Setup', icon: Sparkles },
];

export function BudgetDashboard({
    sharedTransactions,
    incomeProfile,
    budgetGoals,
    onUpdateIncome,
    onUpdateGoals,
    onShowToast
}: BudgetDashboardProps) {
    // Budget-specific transactions (in addition to shared)
    const [budgetTransactions, setBudgetTransactions] = useState<Transaction[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadKey, setUploadKey] = useState(0);
    const [activeView, setActiveView] = useState<BudgetView>('overview');
    const [overrides, setOverrides] = useState(() => getCategoryOverrides());
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [auditFilter, setAuditFilter] = useState<'all' | 'expenses' | 'transfers' | 'income'>('all');
    const [auditCategory, setAuditCategory] = useState<string | null>(null);

    // FORCE REBUILD: 2026-02-25-1720
    const handleCategoryDrilldown = (category: string) => {
        console.log('[DEBUG] Drilling down to:', category);
        if (category === 'Income') {
            setAuditFilter('income');
            setAuditCategory(null);
        } else if (category === 'Transfers') {
            setAuditFilter('transfers');
            setAuditCategory(null);
        } else if (category === 'expenses') {
            setAuditFilter('expenses');
            setAuditCategory(null);
        } else {
            setAuditFilter('expenses');
            setAuditCategory(category);
        }
        setActiveView('reconciliation');

        // Use a slight delay to allow the tab to switch before scrolling
        setTimeout(() => {
            document.getElementById('cash-flow-audit')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Merge shared + budget-specific transactions, deduplicate
    const allTransactions = useMemo(() => {
        const combined = [...sharedTransactions, ...budgetTransactions];
        const seen = new Set<string>();
        return combined.filter(tx => {
            // Highly specific key: Date, Amount, First 40 chars of Desc, and a unique hash
            const key = `${tx.date}-${tx.amount.toFixed(2)}-${tx.description.substring(0, 40).toUpperCase().trim()}`;

            // To allow legitimate duplicates (e.g. 2 x $5 coffee), we'd need a way to distinguish them.
            // Since banks don't always provide IDs, if we see the EXACT same key twice, 
            // it's likely a duplicate from DIFFERENT files, BUT it could be a real double purchase.
            // For budget tracking, we use the seen set to prevent multi-file overlap.
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [sharedTransactions, budgetTransactions]);

    // Categorize all transactions
    const categorized = useMemo(() => categorizeAll(allTransactions, overrides), [allTransactions, overrides]);

    // Available months for filtering
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        categorized.forEach(tx => {
            const date = new Date(tx.date);
            if (!isNaN(date.getTime())) {
                months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
            }
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [categorized]);

    // Apply monthly filtering
    const displayTransactions = useMemo(() => {
        if (selectedMonth === 'all') return categorized;
        return categorized.filter(tx => {
            try {
                const date = new Date(tx.date);
                if (isNaN(date.getTime())) return false;
                // Use a consistent format: YYYY-MM
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                return `${y}-${m}` === selectedMonth;
            } catch {
                return false;
            }
        });
    }, [categorized, selectedMonth]);

    // Estimate months of data (based on filtered view)
    const monthsOfData = useMemo(() => {
        if (selectedMonth !== 'all') return 1;
        return estimateMonthsOfData(allTransactions);
    }, [allTransactions, selectedMonth]);

    // Compute budget summary (based on filtered view)
    const summary = useMemo(
        () => computeBudgetSummary(incomeProfile, displayTransactions, budgetGoals, monthsOfData),
        [incomeProfile, displayTransactions, budgetGoals, monthsOfData]
    );

    // Handle file uploads specific to Budget tab
    const handleBudgetFiles = useCallback(async (files: File[]) => {
        setIsUploading(true);
        let newTxs: Transaction[] = [];

        for (const file of files) {
            if (!isSupportedFile(file)) continue;
            try {
                let txs: Transaction[] = [];
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    txs = await parsePDF(file);
                } else {
                    txs = await parseCSV(file);
                }
                newTxs = [...newTxs, ...txs];
            } catch (e) {
                console.error(`Budget: Failed to parse ${file.name}`, e);
            }
        }

        if (newTxs.length > 0) {
            setBudgetTransactions(prev => {
                const combined = [...prev, ...newTxs];
                // Deduplicate
                const seen = new Set<string>();
                return combined.filter(tx => {
                    const key = `${tx.date}-${tx.amount.toFixed(2)}-${tx.description.substring(0, 20).toUpperCase().trim()}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            });
            onShowToast(`Budget: Loaded ${newTxs.length} transactions from ${files.length} file${files.length !== 1 ? 's' : ''}`);
        } else {
            onShowToast('No transactions found in the uploaded files.');
        }

        setIsUploading(false);
        setUploadKey(prev => prev + 1);
    }, [onShowToast]);

    const handleClearBudgetData = () => {
        if (confirm('Clear all budget-specific uploaded data? (Income setup and goals are preserved.)')) {
            setBudgetTransactions([]);
            setUploadKey(prev => prev + 1);
            onShowToast('Budget transaction data cleared.');
        }
    };

    const handleOverride = useCallback((description: string, category: BudgetCategory) => {
        saveCategoryOverride(description, category);
        setOverrides(getCategoryOverrides());
        onShowToast(`Updated category for ${description}`);
    }, [onShowToast]);

    const handleBulkOverride = useCallback((descriptions: string[], category: BudgetCategory) => {
        descriptions.forEach(desc => saveCategoryOverride(desc, category));
        setOverrides(getCategoryOverrides());
        onShowToast(`Updated ${descriptions.length} transactions to ${category}`);
    }, [onShowToast]);

    const hasTransactions = allTransactions.length > 0;
    const isIncomeSetup = incomeProfile.grossPayPerPeriod > 0;

    return (
        <motion.div
            key="budget-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
        >
            {/* Privacy Banner */}
            <PrivacyBanner className="mb-2" />

            {/* Budget Hero (no transactions yet) */}
            {!hasTransactions && (
                <div className="max-w-2xl mx-auto text-center space-y-6 mt-8">
                    <div className="space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-100">
                            Where is your{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                                money going?
                            </span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Drop in your bank statements, credit card statements, and pay stubs.
                            We'll automatically categorize every transaction and show you exactly where
                            your budget is leaking.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-500">
                            <span className="bg-slate-800/60 border border-white/8 rounded-full px-3 py-1">✓ Bank statements (CSV / PDF)</span>
                            <span className="bg-slate-800/60 border border-white/8 rounded-full px-3 py-1">✓ Credit card statements</span>
                            <span className="bg-slate-800/60 border border-white/8 rounded-full px-3 py-1">✓ Multiple months supported</span>
                        </div>
                    </div>

                    <div className="glass-panel rounded-2xl p-1 border border-white/8">
                        <FileUpload key={uploadKey} onFilesSelected={handleBudgetFiles} />
                    </div>

                    <p className="text-xs text-slate-600">
                        Already loaded statements in the Subscriptions tab? They are automatically shared here.
                    </p>
                </div>
            )}

            {/* Dashboard (has transactions) */}
            {hasTransactions && (
                <div className="space-y-6">
                    {/* Dashboard Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-100">Budget Breakout</h2>
                            <p className="text-sm text-slate-500">
                                {allTransactions.length.toLocaleString()} transactions ·{' '}
                                {monthsOfData} month{monthsOfData !== 1 ? 's' : ''} of data
                                {sharedTransactions.length > 0 && (
                                    <span className="text-indigo-400 ml-1">
                                        · {sharedTransactions.length.toLocaleString()} from Subscriptions tab
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            {/* Add More Data */}
                            <div className="relative">
                                <FileUpload
                                    key={`budget-mini-${uploadKey}`}
                                    onFilesSelected={handleBudgetFiles}
                                    compact
                                />
                            </div>
                            {budgetTransactions.length > 0 && (
                                <button
                                    onClick={handleClearBudgetData}
                                    title="Clear budget-specific transactions"
                                    className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-red-400 transition-colors border border-white/8"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Income Setup prompt if not configured */}
                    {!isIncomeSetup && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/25 rounded-2xl px-5 py-4"
                        >
                            <div className="flex items-center space-x-3">
                                <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-indigo-300">Set up your income for the full picture</p>
                                    <p className="text-xs text-indigo-400/70">Add your paycheck details to see gross-to-net flow and savings rate</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveView('setup')}
                                className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                                <Sparkles className="w-3 h-3" />
                                <span>Set Up Now</span>
                            </button>
                        </motion.div>
                    )}

                    {/* Sub-tab Navigation */}
                    <div className="flex items-center space-x-1 bg-slate-800/40 rounded-xl p-1 border border-white/6 w-fit">
                        {TAB_VIEWS.map(view => {
                            const Icon = view.icon;
                            const isActive = activeView === view.id;
                            return (
                                <button
                                    key={view.id}
                                    onClick={() => setActiveView(view.id)}
                                    className={cn(
                                        'relative flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                                        isActive ? 'bg-slate-700 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-300'
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{view.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Month Selector */}
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/5">
                        <button
                            onClick={() => setSelectedMonth('all')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                selectedMonth === 'all'
                                    ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                                    : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
                            )}
                        >
                            All Time
                        </button>
                        {availableMonths.map(month => {
                            const [year, mm] = month.split('-');
                            const monthDate = new Date(parseInt(year), parseInt(mm) - 1);
                            const monthName = monthDate.toLocaleString('default', { month: 'short' });
                            return (
                                <button
                                    key={month}
                                    onClick={() => setSelectedMonth(month)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                                        selectedMonth === month
                                            ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                                            : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    {monthName} {year}
                                </button>
                            );
                        })}
                    </div>

                    {/* View Panels */}
                    <AnimatePresence mode="wait">
                        {activeView === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <CashFlowChart
                                    summary={summary}
                                    onCategoryClick={handleCategoryDrilldown}
                                />
                                <SpendingBreakdown
                                    transactions={displayTransactions}
                                    monthsOfData={monthsOfData}
                                    budgetGoals={budgetGoals}
                                    onCategoryChange={handleOverride}
                                    onBulkCategoryChange={handleBulkOverride}
                                />
                            </motion.div>
                        )}

                        {activeView === 'spending' && (
                            <motion.div
                                key="spending"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <SpendingBreakdown
                                    transactions={displayTransactions}
                                    monthsOfData={monthsOfData}
                                    budgetGoals={budgetGoals}
                                    onCategoryChange={handleOverride}
                                    onBulkCategoryChange={handleBulkOverride}
                                    defaultShowList={true}
                                />
                            </motion.div>
                        )}

                        {activeView === 'reconciliation' && (
                            <motion.div
                                key="reconciliation"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <button
                                        onClick={() => setAuditFilter('all')}
                                        className={cn(
                                            "glass-panel p-5 rounded-2xl border transition-all text-left",
                                            auditFilter === 'all' ? "border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20" : "border-white/8 bg-slate-900/40 hover:border-white/20"
                                        )}
                                    >
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Volume</p>
                                        <p className="text-2xl font-bold text-slate-100 font-mono">
                                            {formatDollar(displayTransactions.reduce((s, tx) => s + Math.abs(tx.amount), 0))}
                                        </p>
                                        <p className="text-[10px] text-slate-600 mt-1">Total activity</p>
                                    </button>

                                    <button
                                        onClick={() => setAuditFilter('expenses')}
                                        className={cn(
                                            "glass-panel p-5 rounded-2xl border transition-all text-left",
                                            auditFilter === 'expenses' ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "border-white/8 bg-slate-900/40 hover:border-white/20"
                                        )}
                                    >
                                        <p className="text-[10px] text-emerald-500/70 uppercase font-bold mb-1">Expenses</p>
                                        <p className="text-2xl font-bold text-emerald-400 font-mono">
                                            {formatDollar(displayTransactions.filter(tx => tx.category !== 'Transfers' && tx.category !== 'Income').reduce((s, tx) => s + Math.abs(tx.amount), 0))}
                                        </p>
                                        <p className="text-[10px] text-slate-600 mt-1">Real spending</p>
                                    </button>

                                    <button
                                        onClick={() => setAuditFilter('transfers')}
                                        className={cn(
                                            "glass-panel p-5 rounded-2xl border transition-all text-left",
                                            auditFilter === 'transfers' ? "border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20" : "border-white/8 bg-slate-900/40 hover:border-white/20"
                                        )}
                                    >
                                        <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Transfers</p>
                                        <p className="text-2xl font-bold text-indigo-300 font-mono">
                                            {formatDollar(displayTransactions.filter(tx => tx.category === 'Transfers').reduce((s, tx) => s + Math.abs(tx.amount), 0))}
                                        </p>
                                        <p className="text-[10px] text-slate-600 mt-1">Internal moves</p>
                                    </button>

                                    <button
                                        onClick={() => setAuditFilter('income')}
                                        className={cn(
                                            "glass-panel p-5 rounded-2xl border transition-all text-left",
                                            auditFilter === 'income' ? "border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20" : "border-white/8 bg-slate-900/40 hover:border-white/20"
                                        )}
                                    >
                                        <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Income</p>
                                        <p className="text-2xl font-bold text-emerald-300 font-mono">
                                            {formatDollar(displayTransactions.filter(tx => tx.category === 'Income').reduce((s, tx) => s + Math.abs(tx.amount), 0))}
                                        </p>
                                        <p className="text-[10px] text-slate-600 mt-1">Deposits</p>
                                    </button>
                                </div>

                                <div id="cash-flow-audit" className="glass-panel rounded-2xl border border-white/8 overflow-hidden">
                                    <div className="p-5 border-b border-white/6 bg-slate-800/20 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-100 flex items-center gap-2">
                                                <span>Cash Flow Audit</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-bold">
                                                    Showing: {auditCategory || auditFilter}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                                                Reviewing {selectedMonth === 'all' ? 'All Time' : selectedMonth} transactions
                                            </p>
                                        </div>
                                        {(auditFilter !== 'all' || auditCategory) && (
                                            <button
                                                onClick={() => {
                                                    setAuditFilter('all');
                                                    setAuditCategory(null);
                                                }}
                                                className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all uppercase font-bold"
                                            >
                                                Reset Filters
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md text-[10px] text-slate-500 uppercase tracking-wider z-10 transition-colors shadow-sm">
                                                <tr>
                                                    <th className="px-5 py-3 font-semibold">Date</th>
                                                    <th className="px-5 py-3 font-semibold">Description</th>
                                                    <th className="px-5 py-3 font-semibold">Category</th>
                                                    <th className="px-5 py-3 font-semibold text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[11px]">
                                                {displayTransactions
                                                    .filter(tx => {
                                                        if (auditCategory) return tx.category === auditCategory;
                                                        if (auditFilter === 'all') return true;
                                                        if (auditFilter === 'expenses') return tx.category !== 'Transfers' && tx.category !== 'Income';
                                                        if (auditFilter === 'transfers') return tx.category === 'Transfers';
                                                        if (auditFilter === 'income') return tx.category === 'Income';
                                                        return true;
                                                    })
                                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                    .map((tx, i) => (
                                                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors group">
                                                            <td className="px-5 py-3 text-slate-500 font-mono">{tx.date}</td>
                                                            <td className="px-5 py-3 text-slate-200 group-hover:text-white transition-colors">{tx.description}</td>
                                                            <td className="px-5 py-3">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                                                    tx.category === 'Transfers' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                                                        tx.category === 'Income' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                                            "bg-slate-500/10 text-slate-400 border border-white/5"
                                                                )}>
                                                                    {tx.category}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3 text-right font-mono font-bold text-slate-200">
                                                                {formatDollar(tx.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Rule Management Persistence Section */}
                                <div className="glass-panel p-6 rounded-2xl border border-white/8 bg-slate-800/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-100 flex items-center space-x-2">
                                                <RefreshCcw className="w-4 h-4 text-indigo-400" />
                                                <span>Rule Persistence</span>
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                You have {Object.keys(overrides).length} manual overrides saved for this browser.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const snippet = JSON.stringify(overrides, null, 2);
                                                navigator.clipboard.writeText(snippet);
                                                onShowToast('Override snippet copied to clipboard!');
                                            }}
                                            className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-400 hover:bg-indigo-500/30 transition-all font-bold"
                                        >
                                            Export Rules for Permanent Integration
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-600 mt-4 leading-relaxed italic">
                                        Manual categorizations are currently stored in your browser's local storage. To make them part of the permanent
                                        system code (surviving cache clears or updates), use the Export button above and share the snippet with the development team.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {activeView === 'goals' && (
                            <motion.div
                                key="goals"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <BudgetGoals
                                    goals={budgetGoals}
                                    onUpdate={(updated) => {
                                        onUpdateGoals(updated);
                                        saveBudgetGoals(updated);
                                    }}
                                    categoryActuals={summary.categoryTotals as Partial<Record<BudgetCategory, number>>}
                                />
                            </motion.div>
                        )}

                        {activeView === 'setup' && (
                            <motion.div
                                key="setup"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <IncomeSetup profile={incomeProfile} onUpdate={onUpdateIncome} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Loading overlay */}
            {isUploading && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="glass-panel rounded-2xl p-8 border border-white/10 flex flex-col items-center space-y-4">
                        <Upload className="w-8 h-8 text-indigo-400 animate-bounce" />
                        <p className="text-slate-200 font-medium">Parsing your statements…</p>
                        <p className="text-slate-500 text-sm">Staying 100% in your browser</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
