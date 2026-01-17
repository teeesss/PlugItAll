
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
    type?: 'success' | 'info';
}

export const Toast: React.FC<ToastProps> = ({
    message,
    isVisible,
    onClose,
    duration = 4000,
    type = 'success'
}) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className="fixed bottom-8 right-8 z-50"
                >
                    <div className={cn(
                        "flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border",
                        type === 'success'
                            ? "bg-slate-900/90 border-green-500/30 text-slate-100"
                            : "bg-slate-900/90 border-blue-500/30 text-slate-100"
                    )}>
                        {type === 'success' ? (
                            <div className="p-1 rounded-full bg-green-500/20">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                            </div>
                        ) : (
                            <div className="p-1 rounded-full bg-blue-500/20">
                                <Info className="w-5 h-5 text-blue-400" />
                            </div>
                        )}

                        <div className="flex flex-col">
                            <span className="font-medium text-sm">{message}</span>
                        </div>

                        <button
                            onClick={onClose}
                            className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
