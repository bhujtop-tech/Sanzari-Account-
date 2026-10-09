import React, { useState } from 'react';
import { X, Receipt, Wallet, Calendar, MapPin, CheckCircle2, IndianRupee } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { addTourExpense } from '../../services/db';

interface AddTourExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTourExpenseModal: React.FC<AddTourExpenseModalProps> = ({ isOpen, onClose }) => {
  const { wallets, tourBatches, formatCurrency } = useData();
  const { currentUserProfile } = useAuth();

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [category, setCategory] = useState<
    'Hotel & Stay' | 'Train & Transport' | 'Food & Meals' | 'Sightseeing & Entry' | 'Guide & Staff' | 'Other'
  >('Hotel & Stay');
  const [amount, setAmount] = useState<number | string>('');
  const tourWallets = wallets.filter((w) => w.scope === 'tourism' || w.name.includes('(Tour)'));
  const dryfruitWallets = wallets.filter((w) => w.scope === 'dryfruit' || (!w.scope && !w.name.includes('(Tour)')));

  const [walletName, setWalletName] = useState<string>(() => {
    const defaultTour = wallets.find((w) => w.name.toLowerCase().includes('bus (tour)')) || tourWallets[0];
    return defaultTour?.name || wallets[0]?.name || 'Bus (Tour)';
  });
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Please enter a valid expense amount.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a short description.');
      return;
    }

    const batch = tourBatches.find((b) => b.id === selectedBatchId);

    setIsSubmitting(true);
    try {
      await addTourExpense(
        {
          tourBatchId: selectedBatchId || '',
          tourTitle: batch?.title || '',
          destination: batch?.destination || '',
          category,
          amount: Number(amount),
          walletName,
          date,
          monthKey: date.substring(0, 7),
          description: description.trim(),
        },
        currentUserProfile?.email || 'admin@sanzari.com'
      );

      onClose();
    } catch (err: any) {
      console.error('Failed to add tour expense:', err);
      setErrorMsg(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 px-6 py-4 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Record Tour Expense</h2>
              <p className="text-xs text-rose-100">Hotel, Tickets, Transport & Food Payouts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-4 sm:p-6 space-y-4 text-zinc-800 flex-1 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Select Tour Batch (Optional)
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 focus:bg-white focus:ring-2 focus:ring-rose-500 font-medium"
            >
              <option value="">-- General Tourism Expense --</option>
              {tourBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.departureDate} • {b.title} ({b.destination})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 focus:ring-2 focus:ring-rose-500 font-semibold"
              >
                <option value="Hotel & Stay">Hotel & Stay</option>
                <option value="Train & Transport">Train / Flight / Bus</option>
                <option value="Food & Meals">Food & Meals</option>
                <option value="Sightseeing & Entry">Sightseeing & Permits</option>
                <option value="Guide & Staff">Guide & Staff</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                className="w-full text-base font-extrabold bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-zinc-900 focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Paid From Wallet *
              </label>
              <select
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 focus:ring-2 focus:ring-rose-500"
              >
                {tourWallets.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({formatCurrency(w.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full text-xs bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Description / Notes *
            </label>
            <input
              type="text"
              placeholder="e.g. Hotel Grand Mumtaz 5 rooms advance token"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full text-xs bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          </div>

          <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-200/80 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
