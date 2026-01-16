import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, Trash2, Eye, Download, Upload } from 'lucide-react';
import { getIgnoredItems, restoreItem, clearCache } from '../utils/persistence';
import { exportManualSubscriptions, importManualSubscriptions, getManualSubscriptions } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Trigger parent refresh
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const [ignoredItems, setIgnoredItems] = useState<string[]>([]);
  const [manualSubsCount, setManualSubsCount] = useState(0);
  const [importStatus, setImportStatus] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIgnoredItems(getIgnoredItems());
      setManualSubsCount(getManualSubscriptions().length);
      setImportStatus(null); // Clear import status when modal opens
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

  const handleExport = () => {
    try {
      const jsonData = exportManualSubscriptions();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plugitall-manual-subscriptions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export subscriptions');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = importManualSubscriptions(text);

      if (result.success) {
        setImportStatus({
          show: true,
          success: true,
          message: `✅ Imported ${result.imported} subscription(s)${result.skipped > 0 ? `, skipped ${result.skipped} duplicate(s)` : ''}`
        });
        setManualSubsCount(getManualSubscriptions().length);
        onUpdate(); // Refresh parent to show new subscriptions
      } else {
        setImportStatus({
          show: true,
          success: false,
          message: `❌ Import failed: ${result.error}`
        });
      }
    } catch (error) {
      setImportStatus({
        show: true,
        success: false,
        message: `❌ Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
                  Settings
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Import/Export Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    Manual Subscriptions
                  </h3>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-3">
                      You have <span className="font-semibold text-slate-200">{manualSubsCount}</span> manually added subscription(s).
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={handleExport}
                        disabled={manualSubsCount === 0}
                        className="flex-1 flex items-center justify-center text-xs px-3 py-2 rounded bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export manual subscriptions as JSON"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export JSON
                      </button>

                      <button
                        onClick={handleImportClick}
                        className="flex-1 flex items-center justify center text-xs px-3 py-2 rounded bg-green-500/10 text-green-300 hover:bg-green-500/20 border border-green-500/20 transition-colors"
                        title="Import manual subscriptions from JSON"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> Import JSON
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    {/* Import Status Message */}
                    {importStatus?.show && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-3 p-2 rounded text-xs ${importStatus.success
                            ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                            : 'bg-red-500/10 text-red-300 border border-red-500/20'
                          }`}
                      >
                        {importStatus.message}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Hidden Items Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    Hidden Items ({ignoredItems.length})
                  </h3>

                  {ignoredItems.length === 0 ? (
                    <div className="text-center text-slate-500 py-6 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      <p className="text-sm">No hidden subscriptions.</p>
                      <p className="text-xs mt-1">
                        Dismiss items from the dashboard to see them here.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {ignoredItems.map((item) => (
                        <li
                          key={item}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700/50"
                        >
                          <span className="text-slate-200 font-medium truncate max-w-[200px] text-sm">
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
