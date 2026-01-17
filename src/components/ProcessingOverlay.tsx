import { useRef, useEffect } from 'react';
import { CheckCircle2, FileText, Scan, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface ProcessingStep {
    id: string;
    label: string;
    icon: React.ReactNode;
    complete: boolean;
}

interface ProcessingOverlayProps {
    isProcessing: boolean;
    fileCount: number;
    transactionCount: number;
    subscriptionCount: number;
    currentStep: 'parsing' | 'analyzing' | 'detecting' | 'complete';
    onComplete?: () => void;
}

export function ProcessingOverlay({
    isProcessing,
    fileCount,
    transactionCount,
    subscriptionCount,
    currentStep,
    onComplete,
}: ProcessingOverlayProps) {
    const displayTimeRef = useRef(0);
    const MIN_DISPLAY_MS = 2000;

    useEffect(() => {
        if (isProcessing) {
            displayTimeRef.current = Date.now();
        } else if (displayTimeRef.current > 0 && currentStep === 'complete') {
            // Calculate remaining time to show
            const elapsed = Date.now() - displayTimeRef.current;
            const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

            const timer = setTimeout(() => {
                onComplete?.();
                displayTimeRef.current = 0;
            }, remaining);

            return () => clearTimeout(timer);
        }
    }, [isProcessing, currentStep, onComplete]);

    const steps: ProcessingStep[] = [
        {
            id: 'parsing',
            label: `Parsing ${fileCount} file${fileCount > 1 ? 's' : ''}...`,
            icon: <FileText className="w-5 h-5" />,
            complete: ['analyzing', 'detecting', 'complete'].includes(currentStep),
        },
        {
            id: 'analyzing',
            label: `Found ${transactionCount.toLocaleString()} transactions...`,
            icon: <Scan className="w-5 h-5" />,
            complete: ['detecting', 'complete'].includes(currentStep),
        },
        {
            id: 'detecting',
            label: 'Detecting subscriptions...',
            icon: <Search className="w-5 h-5" />,
            complete: currentStep === 'complete',
        },
    ];

    if (!isProcessing && currentStep !== 'complete') return null;

    return (
        <AnimatePresence>
            {(isProcessing || currentStep === 'complete') && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="bg-slate-800/90 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl"
                    >
                        {/* Logo/Icon */}
                        <div className="flex justify-center mb-6">
                            {currentStep === 'complete' ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                >
                                    <CheckCircle2 className="w-16 h-16 text-green-400" />
                                </motion.div>
                            ) : (
                                <div className="relative">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                        className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Header */}
                        <h3 className="text-2xl font-bold text-center text-slate-100 mb-6">
                            {currentStep === 'complete' ? 'Processing Complete!' : 'Processing Statements...'}
                        </h3>

                        {/* Steps */}
                        <div className="space-y-4 mb-6">
                            {steps.map((step, index) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.2 }}
                                    className={cn(
                                        'flex items-center space-x-3 p-3 rounded-lg transition-all',
                                        step.complete
                                            ? 'bg-green-500/10 border border-green-500/20'
                                            : step.id === currentStep
                                                ? 'bg-indigo-500/10 border border-indigo-500/20'
                                                : 'bg-slate-700/30 border border-slate-600/20'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'flex-shrink-0',
                                            step.complete
                                                ? 'text-green-400'
                                                : step.id === currentStep
                                                    ? 'text-indigo-400'
                                                    : 'text-slate-500'
                                        )}
                                    >
                                        {step.complete ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                                    </div>
                                    <span
                                        className={cn(
                                            'flex-1 text-sm font-medium',
                                            step.complete
                                                ? 'text-green-300'
                                                : step.id === currentStep
                                                    ? 'text-indigo-300'
                                                    : 'text-slate-400'
                                        )}
                                    >
                                        {step.label}
                                    </span>
                                    {step.id === currentStep && !step.complete && (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full"
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Success Message */}
                        {currentStep === 'complete' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-center"
                            >
                                <p className="text-lg font-semibold text-green-300 mb-2">
                                    Found {subscriptionCount} subscription{subscriptionCount !== 1 ? 's' : ''}!
                                </p>
                                <p className="text-sm text-slate-400">
                                    Analyzed {transactionCount.toLocaleString()} transactions from {fileCount} file
                                    {fileCount > 1 ? 's' : ''}
                                </p>
                            </motion.div>
                        )}

                        {/* Progress Bar */}
                        {currentStep !== 'complete' && (
                            <div className="mt-6">
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                        initial={{ width: '0%' }}
                                        animate={{
                                            width:
                                                currentStep === 'parsing'
                                                    ? '33%'
                                                    : currentStep === 'analyzing'
                                                        ? '66%'
                                                        : '100%',
                                        }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
