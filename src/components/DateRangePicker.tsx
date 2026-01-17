import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface DateRangePickerProps {
    startDate: string | null;
    endDate: string | null;
    onRangeChange: (start: string | null, end: string | null) => void;
    onClose: () => void;
}

export function DateRangePicker({ startDate, endDate, onRangeChange, onClose }: DateRangePickerProps) {
    const [tempStart, setTempStart] = useState(startDate || '');
    const [tempEnd, setTempEnd] = useState(endDate || '');

    const handleApply = () => {
        if (tempStart && tempEnd) {
            // Validate that start <= end
            if (new Date(tempStart) <= new Date(tempEnd)) {
                onRangeChange(tempStart, tempEnd);
                onClose();
            }
        }
    };

    const handleClear = () => {
        setTempStart('');
        setTempEnd('');
        onRangeChange(null, null);
        onClose();
    };

    const maxDate = new Date().toISOString().split('T')[0]; // Today

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-lg font-semibold text-slate-100">Custom Date Range</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Date Inputs */}
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={tempStart}
                            onChange={(e) => setTempStart(e.target.value)}
                            max={tempEnd || maxDate}
                            className="w-full bg-slate-700 text-slate-100 rounded px-3 py-2 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-2">End Date</label>
                        <input
                            type="date"
                            value={tempEnd}
                            onChange={(e) => setTempEnd(e.target.value)}
                            min={tempStart}
                            max={maxDate}
                            className="w-full bg-slate-700 text-slate-100 rounded px-3 py-2 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>

                    {/* Quick Presets */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Quick Presets</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: 'Last 7 Days', days: 7 },
                                { label: 'Last 14 Days', days: 14 },
                                { label: 'Last 30 Days', days: 30 },
                                { label: 'Last 60 Days', days: 60 },
                            ].map(({ label, days }) => (
                                <button
                                    key={label}
                                    onClick={() => {
                                        const end = new Date();
                                        const start = new Date();
                                        start.setDate(start.getDate() - days);
                                        setTempStart(start.toISOString().split('T')[0]);
                                        setTempEnd(end.toISOString().split('T')[0]);
                                    }}
                                    className="px-3 py-1 text-xs rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Validation Message */}
                {tempStart && tempEnd && new Date(tempStart) > new Date(tempEnd) && (
                    <p className="text-sm text-red-400 mb-4">Start date must be before end date</p>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                    <button
                        onClick={handleClear}
                        className="flex-1 px-4 py-2 text-sm rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={!tempStart || !tempEnd || new Date(tempStart) > new Date(tempEnd)}
                        className={cn(
                            'flex-1 px-4 py-2 text-sm rounded-lg transition-colors',
                            !tempStart || !tempEnd || new Date(tempStart) > new Date(tempEnd)
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-500 text-white hover:bg-indigo-600'
                        )}
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
