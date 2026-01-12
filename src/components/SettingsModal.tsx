import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, Trash2, Eye } from 'lucide-react';
import { getIgnoredItems, restoreItem, clearCache } from '../utils/persistence';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Trigger parent refresh
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const [ignoredItems, setIgnoredItems] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIgnoredItems(getIgnoredItems());
    }
  }, [isOpen]);

  const handleRestore = (name: string) => {
    restoreItem(name);
    setIgnoredItems((prev) => prev.filter((i) => i !== name));
    onUpdate();
  };

  const handleClearAll = () => {
    if (confirm('Are you sure? This will un-hide all previously dismissed subscriptions.')) {
      clearCache();
      setIgnoredItems([]);
      onUpdate();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                <h2 className="text-xl font-bold text-slate-100 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-indigo-400" />
                  Hidden Items
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {ignoredItems.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <p>No hidden subscriptions.</p>
                    <p className="text-sm mt-2">
                      Dismiss items from the dashboard to see them here.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {ignoredItems.map((item) => (
                      <li
                        key={item}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700/50"
                      >
                        <span className="text-slate-200 font-medium truncate max-w-[200px]">
                          {item}
                        </span>
                        <button
                          onClick={() => handleRestore(item)}
                          className="flex items-center text-xs ml-3 px-3 py-1.5 rounded bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                        >
                          <RefreshCcw className="w-3 h-3 mr-1.5" /> Restore
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end">
                {ignoredItems.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" /> Clear All Hidden Items
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
