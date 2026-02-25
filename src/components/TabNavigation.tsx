import { motion } from 'framer-motion';
import { Search, PieChart } from 'lucide-react';
import { cn } from '../utils/cn';

export type AppTab = 'subscriptions' | 'budget';

interface TabNavigationProps {
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    hasData: boolean;
}

const TABS = [
    {
        id: 'subscriptions' as AppTab,
        label: 'Subscriptions',
        icon: Search,
        description: 'Find recurring charges',
    },
    {
        id: 'budget' as AppTab,
        label: 'Budget Breakout',
        icon: PieChart,
        description: 'Where your money goes',
    },
];

export function TabNavigation({ activeTab, onTabChange, hasData }: TabNavigationProps) {
    return (
        <nav className="flex items-center space-x-1 bg-slate-800/60 rounded-2xl p-1.5 border border-white/8 backdrop-blur-sm w-fit">
            {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isNew = tab.id === 'budget';

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            'relative flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                            isActive
                                ? 'text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        )}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                            />
                        )}
                        <Icon className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">{tab.label}</span>
                        {isNew && !hasData && (
                            <span className="relative z-10 ml-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                                NEW
                            </span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
