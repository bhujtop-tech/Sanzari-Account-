import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Receipt,
  Wallet,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Pencil,
  Trash2,
  History,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { addTourExpense, updateTourExpense } from '../../services/db';
import { TourExpense, TourExpenseCategory, TourPaymentMode } from '../../types';
import { getBillablePaxCount, resolveBookedBy, isPrivateTourBooking } from './TourCommissionView';
import { matchesTourWallet } from '../../utils/tourWalletLedger';

interface AddTourExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_CATEGORIES: { label: string; value: TourExpenseCategory; badgeColor: string }[] = [
  { label: '👨‍💼 Staff Salary', value: 'Staff Salary', badgeColor: 'bg-blue-50 text-blue-900 border-blue-200' },
  { label: '🏢 Office Rent', value: 'Office Rent', badgeColor: 'bg-purple-50 text-purple-900 border-purple-200' },
  { label: '⚡ Electricity Bill', value: 'Electricity Bill', badgeColor: 'bg-amber-50 text-amber-900 border-amber-200' },
  { label: '💸 Mustak Commission', value: 'Mustak Commission', badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  { label: '🏨 Hotel & Stay', value: 'Hotel & Stay', badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
  { label: '🚆 Train & Transport', value: 'Train & Transport', badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
  { label: '🍽️ Food & Meals', value: 'Food & Meals', badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
  { label: '🎟️ Sightseeing', value: 'Sightseeing & Entry', badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
  { label: '🧑‍✈️ Guide & Staff', value: 'Guide & Staff', badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
  { label: '📦 Other', value: 'Other', badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
];

export const AddTourExpenseModal: React.FC<AddTourExpenseModalProps> = ({ isOpen, onClose }) => {
  const {
    tourWallets,
    tourBatches,
    tourBookings,
    tourExpenses,
    setTourExpenses,
    editingTourExpense,
    setEditingTourExpense,
    deleteTourExpenseById,
    tourPricingSettings,
    formatCurrency,
    formatDate,
  } = useData();
  const { currentUserProfile } = useAuth();

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [category, setCategory] = useState<TourExpenseCategory>('Staff Salary');
  const [amount, setAmount] = useState<number | string>('');

  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<TourPaymentMode>('UPI');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync form state when modal opens or when editingTourExpense changes
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setConfirmDeleteId(null);

    if (editingTourExpense) {
      setCategory((editingTourExpense.category as TourExpenseCategory) || 'Other');
      setAmount(editingTourExpense.amount || '');
      setDate(editingTourExpense.date || new Date().toISOString().split('T')[0]);
      setPaymentMode((editingTourExpense.paymentMode as TourPaymentMode) || 'UPI');
      setSelectedBatchId(editingTourExpense.tourBatchId || '');
      setDescription(editingTourExpense.description || '');

      const matchedWallet =
        tourWallets.find((w) =>
          matchesTourWallet(w, editingTourExpense.walletId, editingTourExpense.walletName)
        ) || tourWallets[0];
      if (matchedWallet) {
        setSelectedWalletId(matchedWallet.id);
      }
    } else {
      setAmount('');
      setDescription('');
      setSelectedBatchId('');
      setDate(new Date().toISOString().split('T')[0]);
      if (tourWallets.length > 0) {
        const defaultW =
          tourWallets.find((w) => w.id === selectedWalletId) ||
          tourWallets.find((w) => w.name.toLowerCase().includes('rizwan')) ||
          tourWallets.find((w) => w.name.toLowerCase().includes('sahil')) ||
          tourWallets[0];
        if (defaultW) setSelectedWalletId(defaultW.id);
      }
    }
  }, [isOpen, editingTourExpense, tourWallets]);

  const handleCloseModal = () => {
    setEditingTourExpense(null);
    setConfirmDeleteId(null);
    onClose();
  };

  const privateTourBookings = useMemo(() => {
    return tourBookings.filter((b) => isPrivateTourBooking(b, tourBatches));
  }, [tourBookings, tourBatches]);

  // Calculate Mustak Commission stats for helper banner when 'Mustak Commission' is selected
  const mustakCommissionSummary = useMemo(() => {
    const ratePerPax = tourPricingSettings?.commissionRatePerPax ?? 200;
    const mustakBookings = tourBookings.filter((b) => {
      if (!resolveBookedBy(b).toLowerCase().includes('mustak')) return false;
      if (!selectedBatchId) return true;
      if (selectedBatchId === 'ALL_PRIVATE') return isPrivateTourBooking(b, tourBatches);
      if (selectedBatchId.startsWith('PRIVATE_')) {
        return b.id === selectedBatchId.replace('PRIVATE_', '');
      }
      return b.tourBatchId === selectedBatchId;
    });
    const totalBillablePax = mustakBookings.reduce((sum, b) => sum + getBillablePaxCount(b), 0);
    const totalEarned = totalBillablePax * ratePerPax;

    const totalPaid = tourExpenses
      .filter((e) => {
        if (editingTourExpense && e.id === editingTourExpense.id) return false;
        const isMustak =
          e.category === 'Mustak Commission' ||
          (e.paidToPerson || '').toLowerCase().includes('mustak') ||
          (e.description || '').toLowerCase().includes('mustak commission');
        if (!isMustak) return false;
        if (!selectedBatchId) return true;
        return e.tourBatchId === selectedBatchId;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const pendingBaaki = Math.max(0, totalEarned - totalPaid);
    return {
      totalBillablePax,
      ratePerPax,
      totalEarned,
      totalPaid,
      pendingBaaki,
    };
  }, [tourBookings, tourBatches, tourExpenses, tourPricingSettings, selectedBatchId, editingTourExpense]);

  const handleSelectCategory = (cat: TourExpenseCategory) => {
    setCategory(cat);
    if (cat === 'Mustak Commission') {
      if (
        !description.trim() ||
        description.includes('Salary') ||
        description.includes('Rent') ||
        description.includes('Bill')
      ) {
        setDescription('Mustak Commission Payout');
      }
      if (!amount && mustakCommissionSummary.pendingBaaki > 0) {
        setAmount(mustakCommissionSummary.pendingBaaki);
      }
    } else if (cat === 'Staff Salary' && !description.trim()) {
      setDescription('Monthly Staff Salary');
    } else if (cat === 'Office Rent' && !description.trim()) {
      setDescription('Monthly Office Rent');
    } else if (cat === 'Electricity Bill' && !description.trim()) {
      setDescription('Office Electricity Bill');
    }
  };

  if (!isOpen) return null;

  const activeWallet =
    tourWallets.find((w) => w.id === selectedWalletId) ||
    tourWallets[0] || { id: 'rizwan-tour', name: 'Rizwan (Tour)', currentBalance: 0 };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid expense amount.');
      return;
    }

    const finalDescription = description.trim() || category;
    const batch = tourBatches.find((b) => b.id === selectedBatchId);
    const privBooking = selectedBatchId.startsWith('PRIVATE_')
      ? privateTourBookings.find((pb) => pb.id === selectedBatchId.replace('PRIVATE_', ''))
      : undefined;

    const resolvedTourTitle = batch
      ? `📂 ${batch.departureDate} • ${batch.title}`
      : privBooking
      ? `🚗 Private (${privBooking.tourDate}) • ${privBooking.customerName}`
      : selectedBatchId === 'ALL_PRIVATE'
      ? '🚗 All Private Tours'
      : category === 'Mustak Commission'
      ? 'Commission Payout'
      : 'Office / General Expense';

    const payload = {
      tourBatchId: selectedBatchId || '',
      tourTitle: resolvedTourTitle,
      destination: batch?.destination || privBooking?.destination || '',
      category,
      amount: parsedAmount,
      walletId: activeWallet.id,
      walletName: activeWallet.name,
      paymentMode,
      paidToPerson: category === 'Mustak Commission' ? 'Mustak' : undefined,
      date,
      monthKey: date.substring(0, 7),
      description: finalDescription,
    };

    const userEmail = currentUserProfile?.email || 'admin@sanzari.com';
    setIsSubmitting(true);

    try {
      if (editingTourExpense) {
        // Optimistic update in local state
        setTourExpenses((prev) =>
          prev.map((item) =>
            item.id === editingTourExpense.id
              ? { ...item, ...payload, updatedAt: new Date().toISOString() }
              : item
          )
        );
        await updateTourExpense(editingTourExpense.id, payload, userEmail);
      } else {
        await addTourExpense(payload, userEmail);
      }

      handleCloseModal();
    } catch (err: any) {
      console.error('Failed to save tour expense:', err);
      setErrorMsg(err.message || 'Failed to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (exp: TourExpense) => {
    await deleteTourExpenseById(exp.id);
    if (editingTourExpense && editingTourExpense.id === exp.id) {
      handleCloseModal();
    } else {
      setConfirmDeleteId(null);
    }
  };

  const recentExpenses = tourExpenses.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-zinc-950 px-5 py-4 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                editingTourExpense ? 'bg-amber-500 text-zinc-950' : 'bg-rose-600'
              }`}
            >
              {editingTourExpense ? (
                <Pencil className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Receipt className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {editingTourExpense ? '✏️ Edit Expense / Payout' : 'Add Expense / Payout'}
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                {editingTourExpense
                  ? 'Correct amount, wallet account, category, date or notes'
                  : 'Salary, Rent, Electricity, Mustak Commission & Tour Expenses'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-4 sm:p-5 space-y-4 text-zinc-800 flex-1 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {editingTourExpense && (
              <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-400 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-black text-amber-950 block">
                    Editing Existing Expense ({formatCurrency(editingTourExpense.amount)})
                  </span>
                  <span className="text-[11px] text-amber-800 font-semibold">
                    Mistake fix karke &quot;Update Expense&quot; dabayein, wallet balance automatically adjust ho jayega.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTourExpense(null)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-400 text-[11px] font-black text-zinc-800 hover:bg-zinc-100 shrink-0 cursor-pointer"
                >
                  + New Instead
                </button>
              </div>
            )}

            {/* 1. Quick Category Selector Pills */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1.5">
                1. Select Expense Category *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CATEGORIES.map((item) => {
                  const isSelected = category === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleSelectCategory(item.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-950 text-amber-300 border-zinc-950 shadow-sm scale-[1.02]'
                          : `${item.badgeColor} hover:opacity-90`
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mustak Commission Live Hisab Banner when 'Mustak Commission' is selected */}
            {category === 'Mustak Commission' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-700" />
                    Mustak Commission Payout Record
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                    {mustakCommissionSummary.totalBillablePax} Pax × ₹{mustakCommissionSummary.ratePerPax}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-xl border border-amber-200">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-zinc-500 block">Total Earned</span>
                    <span className="text-xs font-black font-mono text-zinc-900">
                      {formatCurrency(mustakCommissionSummary.totalEarned)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-emerald-700 block">Already Paid</span>
                    <span className="text-xs font-black font-mono text-emerald-700">
                      {formatCurrency(mustakCommissionSummary.totalPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-rose-700 block">Pending Baaki</span>
                    <span className="text-xs font-black font-mono text-rose-600">
                      {formatCurrency(mustakCommissionSummary.pendingBaaki)}
                    </span>
                  </div>
                </div>
                {mustakCommissionSummary.pendingBaaki > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(mustakCommissionSummary.pendingBaaki);
                      setDescription('Mustak Commission Payout');
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Fill Full Pending Commission ({formatCurrency(mustakCommissionSummary.pendingBaaki)})
                  </button>
                )}
              </div>
            )}

            {/* 2. Kis Account Se Gaye (Paid From Account / Wallet) */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-rose-600" />
                <span>2. Kis Account Se Gaye? (Paid From Wallet) *</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {tourWallets.map((w) => {
                  const isSel = activeWallet.id === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWalletId(w.id)}
                      className={`p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        isSel
                          ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                          : 'bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black truncate">
                          {w.name.replace(' (Tour)', '')}
                        </span>
                        {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <p
                        className={`text-[10px] font-mono font-bold mt-0.5 truncate ${
                          isSel ? 'text-amber-300' : 'text-zinc-500'
                        }`}
                      >
                        {formatCurrency(w.currentBalance)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Amount & Date & Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                  3. Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full text-base font-black bg-zinc-50 border-2 border-zinc-300 rounded-xl pl-7 pr-3 py-2 text-zinc-950 focus:bg-white focus:border-zinc-950 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full text-xs font-bold bg-zinc-50 border-2 border-zinc-300 rounded-xl px-3 py-2.5 text-zinc-900 focus:bg-white focus:border-zinc-950 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Payment Mode Pills */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['UPI', 'Cash', 'Online'] as TourPaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      paymentMode === mode
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                    }`}
                  >
                    {mode === 'UPI' ? '📱 UPI / GPay' : mode === 'Cash' ? '💵 Cash' : '🏦 Bank / Online'}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Tour Batch or Private Tour */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                Kis Date Folder / Private Tour Ka Kharcha Ya Commission Hai? (Optional)
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-zinc-800 focus:bg-white focus:border-zinc-950 font-semibold"
              >
                <option value="">-- Office / Overall General Expense (All Tours) --</option>
                {privateTourBookings.length > 0 && (
                  <option value="ALL_PRIVATE">🚗 All Private Tour Bookings</option>
                )}
                <optgroup label="📅 Group Tour Date Folders">
                  {tourBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📂 {b.departureDate} • {b.title} ({b.destination})
                    </option>
                  ))}
                </optgroup>
                {privateTourBookings.length > 0 && (
                  <optgroup label="🚗 Individual Private Tour Bookings">
                    {privateTourBookings.map((pb) => (
                      <option key={pb.id} value={`PRIVATE_${pb.id}`}>
                        🚗 Private ({pb.tourDate}) • {pb.customerName} ({pb.destination})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                Description / Notes *
              </label>
              <input
                type="text"
                placeholder={
                  category === 'Staff Salary'
                    ? 'e.g. Staff Salary for November'
                    : category === 'Office Rent'
                    ? 'e.g. Sanzari Office Rent'
                    : category === 'Electricity Bill'
                    ? 'e.g. Torrent Power / Electricity Bill'
                    : category === 'Mustak Commission'
                    ? 'e.g. Mustak Commission Payout'
                    : 'e.g. Hotel advance / Bus fuel / Tickets'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full text-xs font-semibold bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2.5 text-zinc-900 focus:bg-white focus:border-zinc-950 focus:outline-none"
              />
            </div>

            {/* Delete Expense Confirmation when editing */}
            {editingTourExpense && (
              <div className="pt-2 border-t border-zinc-200">
                {confirmDeleteId === editingTourExpense.id ? (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-900">
                      Delete this expense &amp; refund {formatCurrency(editingTourExpense.amount)} to wallet?
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(editingTourExpense)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-black cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(editingTourExpense.id)}
                    className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete This Expense Record</span>
                  </button>
                )}
              </div>
            )}

            {/* Recent Expenses Quick Edit/Delete List (when in Add Mode) */}
            {!editingTourExpense && recentExpenses.length > 0 && (
              <div className="pt-3 border-t-2 border-zinc-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-rose-600" />
                    <span>Recent Expenses (Mistake ho to ✏️ Edit ya 🗑️ Delete karein)</span>
                  </span>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {recentExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-zinc-900 truncate">
                          {exp.description || exp.category || 'Expense'}{' '}
                          <span className="text-rose-600 font-mono">
                            ({formatCurrency(exp.amount)})
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500 truncate">
                          💳 {(exp.walletName || 'Tour').replace(' (Tour)', '')} • 📅{' '}
                          {formatDate(exp.date)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingTourExpense(exp)}
                          className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-zinc-950 border border-amber-400 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                          title="Edit Expense"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {confirmDeleteId === exp.id ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp)}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(exp.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-2 shrink-0">
            <div className="text-[11px] text-zinc-600 font-bold truncate">
              From: <span className="text-zinc-950 font-black">{activeWallet.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200/80 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer ${
                  editingTourExpense
                    ? 'bg-amber-400 hover:bg-amber-500 text-zinc-950 border border-zinc-900'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting
                  ? 'Saving...'
                  : editingTourExpense
                  ? 'Update Expense'
                  : 'Save Expense'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
