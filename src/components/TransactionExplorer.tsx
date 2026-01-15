import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transaction } from '../utils/analyzer';

interface TransactionExplorerProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    initialSearch?: string;
}

type SortField = 'date' | 'description' | 'amount';
type SortDirection = 'asc' | 'desc';

interface PriceRange {
    label: string;
    min: number;
    max: number;
}

const PRICE_RANGES: PriceRange[] = [
    { label: 'Under $10', min: 0, max: 10 },
    { label: '$10-$50', min: 10, max: 50 },
    { label: '$50-$100', min: 50, max: 100 },
    { label: '$100-$500', min: 100, max: 500 },
    { label: '$500-$1K', min: 500, max: 1000 },
    { label: 'Over $1K', min: 1000, max: Infinity },
];

const DATE_PRESETS = [
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 3 months', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'All time', days: Infinity },
];

type TransactionType = 'debit' | 'credit' | 'both';

// SortIcon component defined outside to avoid recreating during render
function SortIcon({
    field,
    sortField,
    sortDirection,
}: {
    field: SortField;
    sortField: SortField;
    sortDirection: SortDirection;
}) {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-500" />;
    return sortDirection === 'asc'
        ? <ArrowUp className="w-4 h-4 text-indigo-400" />
        : <ArrowDown className="w-4 h-4 text-indigo-400" />;
}

export function TransactionExplorer({
    isOpen,
    onClose,
    transactions,
    initialSearch = '',
}: TransactionExplorerProps) {
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>([]);
    const [transactionType, setTransactionType] = useState<TransactionType>('both');
    const [datePreset, setDatePreset] = useState(3); // All time by default
    const overlayRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    }, [onClose]);

    // ESC to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
        let result = [...transactions];

        // Search filter with wildcard support
        if (searchTerm.length >= 1) {
            // Convert wildcard pattern to regex: * -> .*, ? -> .
            const pattern = searchTerm
                .toLowerCase()
                .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
                .replace(/\*/g, '.*')  // * matches any characters
                .replace(/\?/g, '.');  // ? matches single character
            const regex = new RegExp(pattern);
            result = result.filter((t) =>
                regex.test(t.description.toLowerCase())
            );
        }

        // Transaction type filter
        if (transactionType === 'debit') {
            result = result.filter((t) => t.amount < 0);
        } else if (transactionType === 'credit') {
            result = result.filter((t) => t.amount > 0);
        }

        // Price range filter (OR logic within ranges)
        if (selectedPriceRanges.length > 0) {
            result = result.filter((t) => {
                const absAmount = Math.abs(t.amount);
                return selectedPriceRanges.some((idx) => {
                    const range = PRICE_RANGES[idx];
                    return absAmount >= range.min && absAmount < range.max;
                });
            });
        }

        // Date filter
        if (datePreset < 3) {
            const days = DATE_PRESETS[datePreset].days;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            result = result.filter((t) => new Date(t.date) >= cutoff);
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'date':
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'description':
                    comparison = a.description.localeCompare(b.description);
                    break;
                case 'amount':
                    comparison = a.amount - b.amount;
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [transactions, searchTerm, transactionType, selectedPriceRanges, datePreset, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const togglePriceRange = (idx: number) => {
        setSelectedPriceRanges((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
        );
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setSelectedPriceRanges([]);
        setTransactionType('debit');
        setDatePreset(3);
    };

    const hasActiveFilters =
        searchTerm.length > 0 ||
        selectedPriceRanges.length > 0 ||
        transactionType !== 'both' ||
        datePreset !== 3;

    const formatAmount = (amount: number) => {
        const isCredit = amount > 0;
        const absAmount = Math.abs(amount);
        return (
            <span className={isCredit ? 'text-green-400' : 'text-red-400'}>
                {isCredit ? '+' : '-'}${absAmount.toFixed(2)}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={overlayRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleBackdropClick}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-6xl h-[90vh] bg-slate-900 rounded-t-2xl border border-slate-700 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-xl font-semibold text-white">
                                Transaction Explorer
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="p-4 border-b border-slate-700 space-y-3">
                            {/* Search + Clear */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search transactions..."
                                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {/* Filter Row */}
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Transaction Type Toggle */}
                                <div className="flex rounded-lg overflow-hidden border border-slate-700">
                                    {(['debit', 'credit', 'both'] as TransactionType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setTransactionType(type)}
                                            className={`px-3 py-1.5 text-sm capitalize transition-colors ${transactionType === type
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {type === 'both' ? 'All' : type + 's'}
                                        </button>
                                    ))}
                                </div>

                                <div className="w-px h-6 bg-slate-700" />

                                {/* Date Presets */}
                                <div className="flex gap-1">
                                    {DATE_PRESETS.map((preset, idx) => (
                                        <button
                                            key={preset.label}
                                            onClick={() => setDatePreset(idx)}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${datePreset === idx
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="w-px h-6 bg-slate-700" />

                                {/* Price Range Chips */}
                                <div className="flex flex-wrap gap-1">
                                    {PRICE_RANGES.map((range, idx) => (
                                        <button
                                            key={range.label}
                                            onClick={() => togglePriceRange(idx)}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${selectedPriceRanges.includes(idx)
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                                }`}
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="px-4 py-2 text-sm text-slate-500 border-b border-slate-700/50">
                            Showing {filteredTransactions.length} of {transactions.length} transactions
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm">
                                    <tr>
                                        <th
                                            onClick={() => handleSort('date')}
                                            className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                                        >
                                            <div className="flex items-center gap-1">
                                                Date <SortIcon field="date" sortField={sortField} sortDirection={sortDirection} />
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('description')}
                                            className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                                        >
                                            <div className="flex items-center gap-1">
                                                Description <SortIcon field="description" sortField={sortField} sortDirection={sortDirection} />
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('amount')}
                                            className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Amount <SortIcon field="amount" sortField={sortField} sortDirection={sortDirection} />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">
                                            Type
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                                No transactions match your filters
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map((t, idx) => (
                                            <tr
                                                key={`${t.date}-${t.amount}-${idx}`}
                                                className={`border-b border-slate-700/50 hover:bg-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-900/50'
                                                    }`}
                                            >
                                                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                                                    {formatDate(t.date)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-white">
                                                    {t.description}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-mono">
                                                    {formatAmount(t.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded ${t.amount > 0
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                            }`}
                                                    >
                                                        {t.amount > 0 ? 'Credit' : 'Debit'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
