import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Calendar,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { EnrichedSubscription } from '../utils/matcher';

interface SubscriptionCardProps {
  subscription: EnrichedSubscription;
  index: number;
  onDismiss: (name: string) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  index,
  onDismiss,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'High':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'Medium':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'Low':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getConfidenceTooltip = (level: string) => {
    switch (level) {
      case 'High':
        return 'Verified by price match or known pattern.';
      case 'Medium':
        return 'Recurring pattern detected, but varies.';
      case 'Low':
        return 'Single transaction or irregular pattern.';
      default:
        return '';
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.05 }}
        className="glass-panel rounded-xl p-5 group hover:border-indigo-500/30 transition-all duration-300 relative"
      >
        <button
          onClick={() => onDismiss(subscription.name)}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
          title="Not a subscription? Hide this."
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-4">
          <div className="relative">
            {subscription.logo ? (
              <img
                src={subscription.logo}
                alt={subscription.name}
                className="w-12 h-12 rounded-lg object-contain bg-white p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div
              className={cn(
                'w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20',
                subscription.logo ? 'hidden' : ''
              )}
            >
              {subscription.name.charAt(0)}
            </div>
            {subscription.confidence === 'High' && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-[#0f172a]">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-semibold text-lg text-slate-100 truncate">
              {subscription.displayName || subscription.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-2xl font-bold text-white">
                ${subscription.averageAmount.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-full border border-white/5">
                /{subscription.frequency.toLowerCase().replace('ly', '')}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 relative group/tooltip">
            <span
              className={cn(
                'text-xs font-medium px-2 py-1 rounded-md border flex items-center cursor-help',
                getConfidenceColor(subscription.confidence)
              )}
            >
              {subscription.confidence} Confidence
              <HelpCircle className="w-3 h-3 ml-1.5 opacity-70" />
            </span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
              {getConfidenceTooltip(subscription.confidence)}
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center transition-colors"
          >
            History ({subscription.transactions?.length || 0})
          </button>
        </div>

        {subscription.cancelUrl && (
          <a
            href={subscription.cancelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-sm font-medium text-slate-200 transition-all group/btn"
          >
            <span>Cancel Subscription</span>
            <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
          </a>
        )}
      </motion.div>

      {/* Transaction History Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-800/50">
                <h3 className="font-semibold text-slate-100">Transaction History</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                {subscription.transactions?.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                  >
                    <div className="flex-1">
                      <div className="flex items-center text-xs text-slate-400 mb-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(t.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-slate-200 font-medium truncate max-w-[280px]">
                        {t.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-100">
                        ${Math.abs(t.amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
