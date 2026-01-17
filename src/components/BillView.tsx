import React from 'react';
import { Trash2, X, ExternalLink } from 'lucide-react';
import { cn } from '../utils/cn';
import type { EnrichedSubscription } from '../utils/matcher';

interface BillViewProps {
    subscriptions: EnrichedSubscription[];
    onDismiss: (id: string) => void;
}

export const BillView: React.FC<BillViewProps> = ({ subscriptions, onDismiss }) => {
    const getConfidenceColor = (level: string) => {
        switch (level) {
            case 'High':
                return 'text-green-400';
            case 'Medium':
                return 'text-yellow-400';
            case 'Low':
                return 'text-red-400';
            default:
                return 'text-slate-400';
        }
    };

    return (
        <div className="glass-panel rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-800/50 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="col-span-4">Service</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2 text-center">Frequency</div>
                <div className="col-span-2 text-center">Confidence</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/5">
                {subscriptions.length === 0 ? (
                    <div className="px-6 py-8 text-center text-slate-400">
                        No subscriptions to display
                    </div>
                ) : (
                    subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/5 transition-colors items-center"
                        >
                            {/* Service Name + Logo */}
                            <div className="col-span-4 flex items-center space-x-3 min-w-0">
                                {sub.logo ? (
                                    <img
                                        src={sub.logo}
                                        alt={sub.name}
                                        className="w-8 h-8 rounded object-contain bg-white p-1 flex-shrink-0"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {sub.name.charAt(0)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-100 truncate">
                                        {sub.displayName || sub.name}
                                    </div>
                                    {sub.isManual && (
                                        <span className="text-xs text-blue-400">Manual</span>
                                    )}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="col-span-2 text-right">
                                <span className="text-lg font-bold text-white">
                                    ${sub.averageAmount.toFixed(2)}
                                </span>
                            </div>

                            {/* Frequency */}
                            <div className="col-span-2 text-center">
                                <span className="text-xs text-slate-300 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5 inline-block">
                                    {sub.frequency}
                                </span>
                            </div>

                            {/* Confidence */}
                            <div className="col-span-2 text-center">
                                <span className={cn('text-sm font-medium', getConfidenceColor(sub.confidence))}>
                                    {sub.confidence}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="col-span-2 flex items-center justify-end space-x-2">
                                {sub.cancelUrl && (
                                    <a
                                        href={sub.cancelUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                        title="Cancel subscription"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                                <button
                                    onClick={() => onDismiss(sub.id)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors"
                                    title={sub.isManual ? "Delete" : "Hide"}
                                >
                                    {sub.isManual ? <Trash2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Summary Footer */}
            {subscriptions.length > 0 && (
                <div className="px-6 py-3 bg-slate-800/30 border-t border-white/10 flex justify-between items-center text-sm">
                    <span className="text-slate-400">
                        Total: {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-white font-semibold">
                        ${subscriptions.reduce((sum, sub) => sum + sub.averageAmount, 0).toFixed(2)}/mo
                    </span>
                </div>
            )}
        </div>
    );
};
