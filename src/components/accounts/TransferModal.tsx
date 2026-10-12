import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { SuccessSheet } from '../common/SuccessSheet';
import { createTransfer, getCurrentDateString } from '../../services/db';
import { ArrowRightLeft } from 'lucide-react';

export const TransferModal: React.FC = () => {
  const { isTransferOpen, setIsTransferOpen, businessMode, dryfruitWallets, tourWallets, formatCurrency } = useData();
  const { user } = useAuth();

  const isTourism = businessMode === 'tourism';
  const activeWallets = isTourism ? tourWallets : dryfruitWallets;

  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getCurrentDateString());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ amount: string; from: string; to: string } | null>(null);

  useEffect(() => {
    if (isTransferOpen) {
      setAmount('');
      setNotes('');
      setDate(getCurrentDateString());
      setFormError(null);

      if (activeWallets.length >= 2) {
        setFromWalletId(activeWallets[0].id);
        setToWalletId(activeWallets[1].id);
      } else if (activeWallets.length === 1) {
        setFromWalletId(activeWallets[0].id);
        setToWalletId('');
      }
    }
  }, [isTransferOpen, activeWallets]);

  const fromWallet = activeWallets.find((w) => w.id === fromWalletId);
  const toWallet = activeWallets.find((w) => w.id === toWalletId);

  const handleSaveTransfer = async () => {
    try {
      setFormError(null);

      if (!fromWallet || !toWallet) {
        setFormError('Please select both From and To wallets');
        return;
      }

      if (fromWallet.id === toWallet.id) {
        setFormError('Source and destination wallets must be different');
        return;
      }

      const parsedAmount = Number(amount);
      if (!parsedAmount || parsedAmount <= 0) {
        setFormError('Please enter a valid transfer amount');
        return;
      }

      setIsSubmitting(true);

      await createTransfer({
        transfer: {
          fromWalletId: fromWallet.id,
          fromWalletName: fromWallet.name,
          toWalletId: toWallet.id,
          toWalletName: toWallet.name,
          amount: parsedAmount,
          date,
          notes: notes.trim(),
        },
        userEmail: user?.email || 'sanzaritourism@gmail.com',
      });

      setIsTransferOpen(false);
      setSuccessInfo({
        amount: formatCurrency(parsedAmount),
        from: fromWallet.name,
        to: toWallet.name,
      });
    } catch (err: any) {
      setFormError(err?.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Between Wallets"
        subtitle="Internal transfer (Total business balance unchanged)"
      >
        <div className="space-y-4 pb-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Transfer Visual Selectors */}
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* From Wallet */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                From Wallet *
              </label>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
              >
                <optgroup label={isTourism ? '🚌 Sanzari Tour Wallets' : '🛒 Dry Fruit Wallets'}>
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.currentBalance)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* To Wallet */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                To Wallet *
              </label>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
              >
                <optgroup label={isTourism ? '🚌 Sanzari Tour Wallets' : '🛒 Dry Fruit Wallets'}>
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.currentBalance)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Transfer Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-zinc-400 font-bold text-base">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-lg font-black text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Reason / Note
            </label>
            <input
              type="text"
              placeholder="e.g. Cash settlement for store purchase"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-zinc-500 font-medium">Transfer Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 font-medium outline-hidden"
            />
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveTransfer}
              className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white text-sm font-bold rounded-2xl shadow-lg transition-transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowRightLeft size={16} />
              <span>{isSubmitting ? 'Transferring...' : 'SAVE TRANSFER'}</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {successInfo && (
        <SuccessSheet
          isOpen={!!successInfo}
          onClose={() => setSuccessInfo(null)}
          title="Transfer Complete"
          referenceCode={`${successInfo.from} ➔ ${successInfo.to}`}
          amount={successInfo.amount}
          subtitle="Wallet balances shifted without altering total business balance."
        />
      )}
    </>
  );
};
