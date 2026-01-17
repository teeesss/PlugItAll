

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, RefreshCcw, Download } from 'lucide-react';
import { cn } from './utils/cn';

import { parseCSV, parsePDF, isSupportedFile } from './utils/parser';
import { detectSubscriptions } from './utils/analyzer';
import type { Transaction, SubscriptionCandidate } from './utils/analyzer';
import { normalizeDescription } from './utils/normalizer';
import { enrichSubscription } from './utils/matcher';
import type { EnrichedSubscription } from './utils/matcher';
import { getIgnoredItems, ignoreItem } from './utils/persistence';
import { generatePDF } from './utils/pdfGenerator';
import { getManualSubscriptions, addManualSubscription, deleteManualSubscription } from './utils/storage';

import { FileUpload } from './components/FileUpload';
import { SubscriptionCard } from './components/SubscriptionCard';
import { Stats } from './components/Stats';
import { SettingsModal } from './components/SettingsModal';
import { TransactionSearch } from './components/TransactionSearch';
import { TransactionExplorer } from './components/TransactionExplorer';
import { Toast } from './components/Toast';
import { PrivacyBanner } from './components/PrivacyBanner';

function App() {
  const [candidates, setCandidates] = useState<EnrichedSubscription[]>([]);
  const [ignoredList, setIgnoredList] = useState<string[]>(getIgnoredItems());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);

  // Toast State
  const [toastState, setToastState] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const [explorerInitialSearch, setExplorerInitialSearch] = useState('');
  // NEW: Store raw transactions to support cumulative analysis
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [manualSubs, setManualSubs] = useState<EnrichedSubscription[]>(getManualSubscriptions() as EnrichedSubscription[]);
  const [uploadKey, setUploadKey] = useState(0);

  // TASK-078: Track newly discovered subscription IDs
  const [newSubIds, setNewSubIds] = useState<Set<string>>(new Set());

  // TASK-078: Auto-clear highlight after 5 seconds
  useEffect(() => {
    if (newSubIds.size > 0) {
      console.log('Starting 5s timer for', newSubIds.size, 'new subscriptions');
      const timer = setTimeout(() => {
        console.log('Clearing newSubIds after 5 seconds');
        setNewSubIds(new Set());
      }, 5000);

      return () => {
        console.log('Cleaning up timer');
        clearTimeout(timer);
      };
    }
  }, [newSubIds]);


  // Filter candidates based on ignored list and merge with manual subs
  const visibleCandidates = useMemo(() => {
    // 1. Get auto-detected subs that aren't ignored
    const visibleAuto = candidates.filter((c) => !ignoredList.includes(c.id));

    // 2. Filter out auto subs that are overridden by manual subs (matching by ID)
    const manualIds = new Set(manualSubs.map(m => m.id));
    const nonOverriddenAuto = visibleAuto.filter(c => !manualIds.has(c.id));

    // 3. Return combined list (manual subs always visible for now)
    return [...manualSubs, ...nonOverriddenAuto];
  }, [candidates, ignoredList, manualSubs]);

  // Derived Stats (based on VISIBLE candidates only)
  const totals = useMemo(() => {
    const monthly = visibleCandidates.reduce((sum, sub) => sum + sub.averageAmount, 0);
    return {
      monthly,
      yearly: monthly * 12,
    };
  }, [visibleCandidates]);

  const showToast = (message: string) => {
    setToastState({ message, visible: true });
  };

  const handleManualAdd = (t: Transaction) => {
    const normalizedName = normalizeDescription(t.description);
    const sub: SubscriptionCandidate = {
      id: `${normalizedName}-${Math.abs(t.amount).toFixed(2)}`,
      name: normalizedName,
      averageAmount: Math.abs(t.amount),
      frequency: 'Monthly', // Default to monthly for manual adds
      confidence: 'High',
      transactions: [t],
      isManual: true
    };

    addManualSubscription(sub);
    // Refresh local state
    setManualSubs(getManualSubscriptions() as EnrichedSubscription[]);
    showToast(`Added manual subscription: ${normalizedName}`);
  };

  const handleManualDelete = (id: string) => {
    deleteManualSubscription(id);
    setManualSubs(getManualSubscriptions() as EnrichedSubscription[]);
  };

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);
    const previousTxCount = allTransactions.length;
    const previousSubIds = new Set(candidates.map(c => c.id));

    let newTransactions: Transaction[] = [];

    for (const file of files) {
      if (!isSupportedFile(file)) continue;

      try {
        let transactions = [];
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          transactions = await parsePDF(file);
        } else {
          transactions = await parseCSV(file);
        }
        newTransactions = [...newTransactions, ...transactions];
      } catch (e) {
        console.error(`Failed to parse ${file.name}`, e);
      }
    }

    if (newTransactions.length > 0) {
      // Combine with EXISTING transactions (Cumulative)
      const combined = [...allTransactions, ...newTransactions];

      // DEDUPLICATE transactions
      // Key: date + amount + normalized description prefix
      const seen = new Set<string>();
      const dedupedTransactions = combined.filter((t) => {
        // Use first 20 chars of description to handle minor formatting differences
        const descPrefix = t.description.substring(0, 20).toUpperCase().trim();
        const key = `${t.date}-${t.amount.toFixed(2)}-${descPrefix}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort transactions by date (newest first)
      const sortedTransactions = dedupedTransactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      console.log(
        `Deduped: ${combined.length} -> ${sortedTransactions.length} transactions`
      );

      // Update State
      setAllTransactions(sortedTransactions);

      // Re-run detection
      const subs = detectSubscriptions(dedupedTransactions);
      const enriched = subs.map(enrichSubscription);

      // Dedupe candidates
      const generateKey = (sub: EnrichedSubscription) =>
        `${sub.name}-${Math.round(sub.averageAmount)}`;
      const seenSubs = new Set<string>();
      const dedupedEnriched = enriched.filter((e) => {
        const key = generateKey(e);
        if (seenSubs.has(key)) return false;
        seenSubs.add(key);
        return true;
      });

      setCandidates(dedupedEnriched);

      // --- TOAST FEEDBACK LOGIC + TASK-078: Mark New Subs ---
      const addedTxCount = sortedTransactions.length - previousTxCount;
      const newSubs = dedupedEnriched.filter(c => !previousSubIds.has(c.id));
      const newSubsCount = newSubs.length;

      // TASK-078: Track new subscription IDs for highlight animation
      if (newSubsCount > 0) {
        const newIds = new Set(newSubs.map(s => s.id));
        setNewSubIds(newIds);
        // Note: Timer is managed by useEffect hook above
      }

      if (addedTxCount > 0) {
        let msg = `Processed ${addedTxCount} new transactions.`;
        if (newSubsCount > 0) {
          msg += ` Found ${newSubsCount} new subscriptions.`;
        }
        showToast(msg);
      } else if (newTransactions.length > 0 && addedTxCount === 0) {
        showToast('No new transactions found (duplicates skipped).');
      }
      // -----------------------------

    } else {
      showToast('No valid transactions found in uploaded files.');
    }

    setIsProcessing(false);
    // Reset file inputs by incrementing key
    setUploadKey(prev => prev + 1);
  };


  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data?')) {
      setAllTransactions([]);
      setCandidates([]);
      // Force FileUpload reset with a new key
      setUploadKey(prev => prev + 1);
      // Close explorer if open
      setIsExplorerOpen(false);

      showToast('All data cleared.');
    }
  };

  const handleDismiss = (id: string) => {
    ignoreItem(id);
    setIgnoredList(getIgnoredItems());
  };

  const handleSettingsUpdate = () => {
    setIgnoredList(getIgnoredItems()); // Reload list when restored/cleared
  };

  const hasData = visibleCandidates.length > 0 || candidates.length > 0 || allTransactions.length > 0;

  return (
    <div className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto">
      <Toast
        message={toastState.message}
        isVisible={toastState.visible}
        onClose={() => setToastState(prev => ({ ...prev, visible: false }))}
      />

      {/* Header */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            {/* Logo Image */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#0f172a] shadow-lg shadow-blue-500/20 border border-white/10 flex items-center justify-center relative">
              <img
                src="/logo_icon.png"
                alt="Plug It All Logo"
                className={cn(
                  "w-full h-full object-cover transform transition-transform duration-700 scale-125",
                  isProcessing && "animate-pulse"
                )}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-blue-500/20 animate-pulse z-10" />
              )}
            </div>
          </div>
          <div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 drop-shadow-sm">
                Plug It All
              </h1>
              {/* Only show tagline in Header if we are in Dashboard mode (data exists) */}
              {hasData && (
                <p className="text-xs text-slate-400 font-medium mt-0.5">Finding leaks in your bank account</p>
              )}
            </div>

            {/* Show Privacy Engine text always in header */}
            <p className="text-xs text-slate-500 font-mono tracking-wide">
              {isProcessing ? 'SCANNING STATEMENTS...' : 'CLIENT-SIDE PRIVACY ENGINE'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Only show controls if there is data */}
          {allTransactions.length > 0 && (
            <>
              {/* Clear Data Button */}
              <button
                onClick={handleClearData}
                type="button"
                className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                title="Clear All Data"
              >
                <RefreshCcw className="w-6 h-6" />
              </button>

              {/* Transaction Search */}
              <TransactionSearch
                transactions={allTransactions}
                onOpenExplorer={(searchTerm) => {
                  setExplorerInitialSearch(searchTerm);
                  setIsExplorerOpen(true);
                }}
              />

              {/* Settings Toggle */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                title="Manage Hidden Items"
              >
                <Settings className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={handleSettingsUpdate}
      />

      <main className="space-y-12">
        {/* State 1: Empty / Hero */}
        {visibleCandidates.length === 0 && candidates.length === 0 && allTransactions.length === 0 && (
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
                <PrivacyBanner />
              </div>
            </div>

            <div className="glass-panel p-1 rounded-2xl shadow-2xl shadow-indigo-500/10">
              <FileUpload key={uploadKey} onFilesSelected={handleFiles} />
            </div>
          </motion.div>
        )}

        {/* State 2: Dashboard (Using visibleCandidates OR existing transactions) */}
        {(visibleCandidates.length > 0 || candidates.length > 0 || allTransactions.length > 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Privacy Notice Banner */}
            <PrivacyBanner className="mb-4" />

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
                    key={uploadKey}
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
                    {visibleCandidates.length > 0 ? (
                      <span className="ml-3 bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full border border-green-500/30">
                        {visibleCandidates.filter(s => s.confidence === 'High').length} Verified
                      </span>
                    ) : (
                      <span className="ml-3 bg-slate-500/20 text-slate-400 text-xs px-2 py-1 rounded-full border border-slate-500/30">
                        0 Found
                      </span>
                    )}
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
                          isNew={newSubIds.has(sub.id)}
                          onDismiss={(idOrName) => {
                            const sub = visibleCandidates.find(s => s.id === idOrName || s.name === idOrName);
                            if (sub?.isManual) handleManualDelete(idOrName);
                            else handleDismiss(idOrName);
                          }}
                        />
                      ))}
                  </AnimatePresence>
                  {visibleCandidates.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-slate-400 mb-2">No subscriptions detected automatically.</p>
                      <p className="text-sm text-slate-500">
                        Try adding one manually or check 'Items for Review' below.
                      </p>
                    </div>
                  )}
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
                              isNew={newSubIds.has(sub.id)}
                              onDismiss={(idOrName) => {
                                const s = visibleCandidates.find(item => item.id === idOrName || item.name === idOrName);
                                if (s?.isManual) handleManualDelete(idOrName);
                                else handleDismiss(idOrName);
                              }}
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
            System Secure & Encrypted • v1.1.5a
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={handleSettingsUpdate}
      />

      {/* Transaction Explorer */}
      <TransactionExplorer
        key={explorerInitialSearch}
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        transactions={allTransactions}
        initialSearch={explorerInitialSearch}
        onAddSubscription={handleManualAdd}
        onRemoveSubscription={handleManualDelete}
        existingSubscriptionIds={new Set(visibleCandidates.map(c => c.id))}
      />
    </div>
  );
}

export default App;
