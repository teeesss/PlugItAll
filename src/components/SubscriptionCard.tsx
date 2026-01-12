import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, XCircle, History, List } from 'lucide-react';
import { cn } from '../utils/cn';
import type { EnrichedSubscription } from '../utils/matcher';

interface SubscriptionCardProps {
  subscription: EnrichedSubscription;
  index?: number;
  onDismiss?: (name: string) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  index = 0,
  onDismiss,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Safety check for displayName
  const displayName = subscription.displayName || subscription.name || 'Unknown Subscription';
  const firstChar = displayName.charAt(0).toUpperCase();

  // Deterministic color generation for unknown logos
  const getGradient = (str: string) => {
    const hash = str.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-violet-500',
      'from-rose-500 to-orange-400'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="glass-card rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:border-indigo-500/30"
    >
      {/* Transaction History Toggle (Top Left on Hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowHistory(!showHistory);
        }}
        className={cn(
          "absolute top-3 left-3 p-1.5 rounded-lg transition-all z-30",
          showHistory ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white"
        )}
        title="View transaction history"
      >
        <History className="w-4 h-4" />
      </button>

      {/* Dismiss Button (Visible on Hover) */}
      {onDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(subscription.name);
          }}
          className="absolute top-3 right-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-20"
          title="Not a subscription? Hide this."
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-start space-x-4">
        {/* Logo */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 p-2 shadow-inner flex-shrink-0 transition-all duration-500",
          subscription.logo ? "bg-white/5" : `bg-gradient-to-br ${getGradient(displayName)}`
        )}>
          {subscription.logo ? (
            <img
              src={`${import.meta.env.BASE_URL}${subscription.logo?.replace(/^\//, '')}`}
              alt={displayName}
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add(
                  'bg-gradient-to-br',
                  'from-indigo-500',
                  'to-purple-600'
                );
                (e.target as HTMLImageElement).parentElement!.classList.remove('bg-white/5');
              }}
            />
          ) : (
            <span className="text-xl font-bold text-white drop-shadow-md">{firstChar}</span>
          )}

          {/* Transaction Count Badge */}
          <div className="absolute -bottom-1 -right-1 bg-slate-800 text-slate-100 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white/10 shadow-lg z-10">
            {subscription.transactions.length}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base text-slate-100 tracking-tight truncate">
              {displayName}
            </h3>
            {/* Verification Badge */}
            {subscription.confidence === 'High' ? (
              <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider flex-shrink-0">
                Verified
              </span>
            ) : (
              <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider flex-shrink-0">
                Review
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {subscription.frequency === 'Monthly' ? 'Billed Monthly' : 'Billed Yearly'}
          </div>
          <div className="text-2xl font-bold text-slate-100 tracking-tight mt-2">
            ${subscription.averageAmount.toFixed(0)}
            <span className="text-sm text-slate-500 font-medium">
              .{subscription.averageAmount.toFixed(2).split('.')[1]}
            </span>
            <span className="text-xs text-slate-600 ml-1">/mo</span>
          </div>
        </div>
      </div>

      {/* Action Overlay */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: isHovered ? 0 : 50, opacity: isHovered ? 1 : 0 }}
        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent pt-8"
      >
        <a
          href={subscription.cancelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-medium transition-colors',
            subscription.cancelUrl
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40'
              : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
          )}
        >
          {subscription.cancelUrl ? (
            <>
              Cancel Subscription <ExternalLink className="w-4 h-4 ml-2" />
            </>
          ) : (
            'No Cancel Link Found'
          )}
        </a>
      </motion.div>

      {/* Transaction History Overlay */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-0 left-0 right-0 min-h-full z-40 bg-slate-900 border border-indigo-500/30 shadow-2xl rounded-2xl p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center">
                <List className="w-4 h-4 mr-2 text-indigo-400" />
                History
              </h4>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-500 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {subscription.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <div className="text-slate-400 font-mono">
                    {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-slate-100 font-bold">
                    ${t.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {subscription.transactions.length === 1 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] text-yellow-300">
                ⚠️ Only one transaction found. This may not be a recurring subscription.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
