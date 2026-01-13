import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Plus, Settings, RefreshCcw, Download } from 'lucide-react';

import { parseCSV, parsePDF, isSupportedFile } from './utils/parser';
import { detectSubscriptions } from './utils/analyzer';
import type { Transaction } from './utils/analyzer';
import { enrichSubscription } from './utils/matcher';
import type { EnrichedSubscription } from './utils/matcher';
import { getIgnoredItems, ignoreItem } from './utils/persistence';
import { generatePDF } from './utils/pdfGenerator';

import { FileUpload } from './components/FileUpload';
import { SubscriptionCard } from './components/SubscriptionCard';
import { Stats } from './components/Stats';
import { SettingsModal } from './components/SettingsModal';

function App() {
  const [candidates, setCandidates] = useState<EnrichedSubscription[]>([]);
  const [ignoredList, setIgnoredList] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load ignored list on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIgnoredList(getIgnoredItems());
  }, []);

  // Filter candidates based on ignored list
  const visibleCandidates = useMemo(() => {
    return candidates.filter((c) => !ignoredList.includes(c.name));
  }, [candidates, ignoredList]);

  // Derived Stats (based on VISIBLE candidates only)
  const totals = useMemo(() => {
    const monthly = visibleCandidates.reduce((sum, sub) => sum + sub.averageAmount, 0);
    return {
      monthly,
      yearly: monthly * 12,
    };
  }, [visibleCandidates]);

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);
    let allTransactions: Transaction[] = [];

    for (const file of files) {
      if (!isSupportedFile(file)) continue;

      try {
        let transactions = [];
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          transactions = await parsePDF(file);
        } else {
          transactions = await parseCSV(file);
        }
        allTransactions = [...allTransactions, ...transactions];
      } catch (e) {
        console.error(`Failed to parse ${file.name}`, e);
      }
    }

    if (allTransactions.length > 0) {
      // DEDUPLICATE transactions (in case same statement uploaded as CSV and PDF)
      // Key: date + amount + normalized description prefix
      const seen = new Set<string>();
      const dedupedTransactions = allTransactions.filter((t) => {
        // Use first 20 chars of description to handle minor formatting differences
        const descPrefix = t.description.substring(0, 20).toUpperCase().trim();
        const key = `${t.date}-${t.amount.toFixed(2)}-${descPrefix}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      console.log(
        `Deduped: ${allTransactions.length} -> ${dedupedTransactions.length} transactions`
      );

      const subs = detectSubscriptions(dedupedTransactions);
      const enriched = subs.map(enrichSubscription);

      // REPLACE all candidates (instead of merging with old stale data)
      // Dedupe only within current batch by Name + approx Amount
      const generateKey = (sub: EnrichedSubscription) =>
        `${sub.name}-${Math.round(sub.averageAmount)}`;
      const seenSubs = new Set<string>();
      const dedupedEnriched = enriched.filter((e) => {
        const key = generateKey(e);
        if (seenSubs.has(key)) return false;
        seenSubs.add(key);
        return true;
      });

      setCandidates(dedupedEnriched); // REPLACE, not merge
    }
    setIsProcessing(false);
  };

  const handleDismiss = (name: string) => {
    ignoreItem(name);
    setIgnoredList(getIgnoredItems()); // Refresh list
  };

  const handleSettingsUpdate = () => {
    setIgnoredList(getIgnoredItems()); // Reload list when restored/cleared
  };

  return (
    <div className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/20">
            {isProcessing ? (
              <RefreshCcw className="w-8 h-8 text-white animate-spin" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-purple-200">
                Plug It All
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Finding leaks in your bank account</p>
            </div>
            <p className="text-xs text-slate-500 font-mono tracking-wide">
              {isProcessing ? 'SCANNING STATEMENTS...' : 'CLIENT-SIDE PRIVACY ENGINE'}
            </p>
          </div>
        </div>

        {/* Settings Toggle */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          title="Manage Hidden Items"
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={handleSettingsUpdate}
      />

      <main className="space-y-12">
        {/* State 1: Empty / Hero */}
        {visibleCandidates.length === 0 && candidates.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center space-y-8 mt-20"
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight">
                Find the leaks in <br />
                <span className="gradient-text">your bank account.</span>
              </h2>
              <div className="text-lg text-slate-400 space-y-2">
                <p>
                  Securely identify recurring subscriptions from your bank statements.
                </p>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300 max-w-md mx-auto">
                  <span className="font-semibold">🔒 Privacy First:</span> Your files are processed entirely in your browser.
                  No transaction data is <strong>ever</strong> uploaded to any server.
                </div>
              </div>
            </div>

            <div className="glass-panel p-1 rounded-2xl shadow-2xl shadow-indigo-500/10">
              <FileUpload onFilesSelected={handleFiles} />
            </div>
          </motion.div>
        )}

        {/* State 2: Dashboard (Using visibleCandidates) */}
        {(visibleCandidates.length > 0 || candidates.length > 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Privacy Notice Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300 max-w-2xl mx-auto text-center">
              <span className="font-semibold">🔒 Privacy First:</span> Your files are processed entirely in your browser.
              No transaction data is <strong>ever</strong> uploaded to any server.
            </div>
            {/* Stats Banner */}
            <Stats totalMonthly={totals.monthly} totalYearly={totals.yearly} />

            {/* Grid & Sidebar Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left: Input (Collapsed) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass-panel rounded-xl p-6">
                  <h3 className="font-semibold text-slate-200 mb-4 flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Add More Data
                  </h3>
                  <FileUpload
                    onFilesSelected={handleFiles}
                    className="opacity-80 hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="p-6 rounded-xl border border-white/5 bg-white/5 text-sm text-slate-400">
                  <p>
                    Tip: You can drag multiple CSV or PDF files at once to analyze your entire
                    financial year.
                  </p>
                </div>
              </div>

              {/* Right: subscriptions Grid */}
              <div className="lg:col-span-3 space-y-12">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    Active Subscriptions
                    <span className="ml-3 bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full border border-green-500/30">
                      {visibleCandidates.filter(s => s.confidence === 'High').length} Verified
                    </span>
                  </h2>
                  <button
                    onClick={() => generatePDF(visibleCandidates)}
                    className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Report</span>
                  </button>
                </div>

                {/* VERIFIED SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {visibleCandidates
                      .filter(s => s.confidence === 'High')
                      .map((sub, i) => (
                        <SubscriptionCard
                          key={`${sub.name}-${i}`}
                          subscription={sub}
                          index={i}
                          onDismiss={handleDismiss}
                        />
                      ))}
                  </AnimatePresence>
                </div>

                {/* REVIEW SECTION */}
                {visibleCandidates.some(s => s.confidence !== 'High') && (
                  <div className="space-y-6 pt-8 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-medium text-slate-300">Items for Review</h3>
                        <p className="text-sm text-slate-500">
                          These items appeared only once or have uncertain frequencies.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          visibleCandidates
                            .filter(s => s.confidence !== 'High')
                            .forEach(s => handleDismiss(s.name));
                        }}
                        className="text-xs font-medium text-slate-400 hover:text-red-400 transition-colors uppercase tracking-wider"
                      >
                        Ignore All
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-80">
                      <AnimatePresence>
                        {visibleCandidates
                          .filter(s => s.confidence !== 'High')
                          .map((sub, i) => (
                            <SubscriptionCard
                              key={`${sub.name}-${i}-review`}
                              subscription={sub}
                              index={i}
                              onDismiss={handleDismiss}
                            />
                          ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {visibleCandidates.length === 0 && candidates.length > 0 && (
                  <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl">
                    <p className="text-slate-500">All detected items have been hidden.</p>
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-indigo-400 hover:underline mt-2 text-sm"
                    >
                      Review Hidden Items
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer / Version Marker */}
        <div className="mt-20 text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-800/50 border border-white/5 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse" />
            System Secure & Encrypted • v1.1.0-h
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
