import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { SuccessSheet } from '../common/SuccessSheet';
import { ExpenseCategory } from '../../types';
import { createExpense, getCurrentDateString } from '../../services/db';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Courier',
  'Packaging',
  'Advertising',
  'Travel',
  'Salary',
  'Commission',
  'Office',
  'Vendor',
  'Other',
];

export const AddExpenseModal: React.FC = () => {
  const { isAddExpenseOpen, setIsAddExpenseOpen, wallets, formatCurrency } = useData();
  const { user } = useAuth();

  const [amount, setAmount] = useState<number | ''>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Courier');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getCurrentDateString());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ amount: string; category: string } | null>(null);

  useEffect(() => {
    if (isAddExpenseOpen) {
      setAmount('');
      setCategory('Courier');
      setDescription('');
      setNotes('');
      setDate(getCurrentDateString());
      setFormError(null);
      if (wallets.length > 0) {
        setSelectedWalletId(wallets[0].id);
      }
    }
  }, [isAddExpenseOpen, wallets]);

  const handleSaveExpense = async () => {
    try {
      setFormError(null);
      const parsedAmount = Number(amount);
      if (!parsedAmount || parsedAmount <= 0) {
        setFormError('Please enter a valid expense amount');
        return;
      }

      const activeWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];
      if (!activeWallet) {
        setFormError('Please select a wallet');
        return;
      }

      setIsSubmitting(true);

      await createExpense({
        expense: {
          walletId: activeWallet.id,
          walletName: activeWallet.name,
          category,
          amount: parsedAmount,
          date,
          description: description.trim() || category,
          notes: notes.trim(),
        },
        userEmail: user?.email || 'sanzaritourism@gmail.com',
      });

      setIsAddExpenseOpen(false);
      setSuccessInfo({
        amount: formatCurrency(parsedAmount),
        category: category,
      });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Add Expense"
        subtitle="Deduct business expenditure from wallet"
      >
        <div className="space-y-4 pb-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Amount (₹) *
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

          {/* Wallet Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Deduct From Wallet *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {wallets.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWalletId(w.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedWalletId === w.id
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  <p className="text-xs font-bold">{w.name}</p>
                  <p
                    className={`text-[10px] mt-0.5 truncate ${
                      selectedWalletId === w.id ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {formatCurrency(w.currentBalance)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Expense Category *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. DTDC Courier charges for Delhi parcel"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-zinc-500 font-medium">Expense Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 font-medium outline-hidden"
            />
          </div>

          {/* Save Button */}
          <div className="pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveExpense}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-2xl shadow-lg transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving Expense...' : 'SAVE EXPENSE'}
            </button>
          </div>
        </div>
      </BottomSheet>

      {successInfo && (
        <SuccessSheet
          isOpen={!!successInfo}
          onClose={() => setSuccessInfo(null)}
          title="Expense Recorded"
          referenceCode={successInfo.category}
          amount={successInfo.amount}
          subtitle="Wallet balance has been reduced accordingly."
        />
      )}
    </>
  );
};
