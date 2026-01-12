import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp } from 'lucide-react';

interface StatsProps {
  totalMonthly: number;
  totalYearly: number;
}

export const Stats: React.FC<StatsProps> = ({ totalMonthly, totalYearly }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel rounded-2xl p-6 flex flex-col justify-between h-32 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <DollarSign className="w-24 h-24 text-blue-400" />
        </div>
        <h3 className="text-slate-400 font-medium z-10">Total Monthly Spend</h3>
        <div className="text-4xl font-bold text-slate-100 z-10">${totalMonthly.toFixed(2)}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-2xl p-6 flex flex-col justify-between h-32 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <TrendingUp className="w-24 h-24 text-green-400" />
        </div>
        <h3 className="text-slate-400 font-medium z-10">Potential Yearly Savings</h3>
        <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent z-10">
          ${totalYearly.toFixed(2)}
        </div>
      </motion.div>
    </div>
  );
};
