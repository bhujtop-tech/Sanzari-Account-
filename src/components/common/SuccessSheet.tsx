import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { CheckCircle2 } from 'lucide-react';

interface SuccessSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  referenceCode?: string;
  amount?: string;
  subtitle?: string;
  autoCloseDelay?: number;
}

export const SuccessSheet: React.FC<SuccessSheetProps> = ({
  isOpen,
  onClose,
  title,
  referenceCode,
  amount,
  subtitle,
  autoCloseDelay = 1800,
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#0284c7', '#f59e0b', '#8b5cf6'],
      });

      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, autoCloseDelay]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-zinc-100"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={36} className="stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{title}</h3>

            {referenceCode && (
              <div className="inline-block mt-2 px-3 py-1 bg-zinc-100 rounded-full font-mono text-sm font-semibold text-zinc-700 tracking-wide">
                {referenceCode}
              </div>
            )}

            {amount && (
              <p className="text-2xl font-black text-zinc-900 mt-3 tracking-tight">
                {amount}
              </p>
            )}

            {subtitle && (
              <p className="text-xs text-zinc-500 mt-2">{subtitle}</p>
            )}

            <button
              onClick={onClose}
              className="mt-5 w-full py-3 bg-zinc-900 hover:bg-black text-white font-semibold rounded-2xl text-sm transition-transform active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
