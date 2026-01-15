import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { Transaction } from '../utils/analyzer';

interface TransactionSearchProps {
    transactions: Transaction[];
    onOpenExplorer: (searchTerm: string) => void;
}

export function TransactionSearch({ transactions, onOpenExplorer }: TransactionSearchProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [showResults, setShowResults] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce search term (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowResults(false);
                if (searchTerm === '') setIsExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchTerm]);

    // Filter transactions based on search
    const filteredTransactions = useMemo(() => {
        if (debouncedTerm.length < 2) return [];
        return transactions.filter((t) =>
            t.description.toLowerCase().includes(debouncedTerm.toLowerCase())
        );
    }, [transactions, debouncedTerm]);

    const quickResults = filteredTransactions.slice(0, 5);
    const hasMoreResults = filteredTransactions.length > 5;

    const handleExpand = useCallback(() => {
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleClear = useCallback(() => {
        setSearchTerm('');
        setDebouncedTerm('');
        setShowResults(false);
        inputRef.current?.focus();
    }, []);

    const handleSeeAll = useCallback(() => {
        onOpenExplorer(searchTerm);
        setShowResults(false);
    }, [searchTerm, onOpenExplorer]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && filteredTransactions.length > 0) {
            handleSeeAll();
        } else if (e.key === 'Escape') {
            setShowResults(false);
            setIsExpanded(false);
            setSearchTerm('');
        }
    }, [filteredTransactions.length, handleSeeAll]);

    const formatAmount = (amount: number) => {
        const isCredit = amount > 0;
        const absAmount = Math.abs(amount);
        return (
            <span className={isCredit ? 'text-green-400' : 'text-slate-300'}>
                {isCredit ? '+' : '-'}${absAmount.toFixed(2)}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Don't show if no transactions
    if (transactions.length === 0) return null;

    return (
        <div ref={containerRef} className="relative">
            {/* Collapsed: Just icon */}
            {!isExpanded && (
                <button
                    onClick={handleExpand}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Search transactions"
                >
                    <Search className="w-5 h-5" />
                </button>
            )}

            {/* Expanded: Search input */}
            {isExpanded && (
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => setShowResults(true)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search transactions..."
                            className="w-64 pl-9 pr-8 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        {searchTerm && (
                            <button
                                onClick={handleClear}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                            >
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Results Dropdown */}
            {showResults && debouncedTerm.length >= 2 && isExpanded && (
                <div className="absolute top-full mt-2 w-80 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {quickResults.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500 text-center">
                            No transactions match "{debouncedTerm}"
                        </div>
                    ) : (
                        <>
                            <div className="max-h-64 overflow-y-auto">
                                {quickResults.map((t, idx) => (
                                    <div
                                        key={`${t.date}-${t.amount}-${idx}`}
                                        className="px-4 py-2 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50 last:border-0"
                                        onClick={handleSeeAll}
                                    >
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-slate-500 w-16 shrink-0">
                                                {formatDate(t.date)}
                                            </span>
                                            <span className="text-white truncate flex-1">
                                                {t.description}
                                            </span>
                                            <span className="shrink-0 font-mono">
                                                {formatAmount(t.amount)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {hasMoreResults && (
                                <button
                                    onClick={handleSeeAll}
                                    className="w-full px-4 py-2 text-sm text-indigo-400 hover:bg-indigo-500/10 text-center font-medium border-t border-slate-700"
                                >
                                    See all {filteredTransactions.length} results →
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
