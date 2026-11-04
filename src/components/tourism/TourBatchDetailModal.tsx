import React, { useState, useMemo } from 'react';
import {
  X,
  MapPin,
  Users,
  Plus,
  Share2,
  Luggage,
  Edit2,
  Trash2,
  Receipt,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  FileDown,
  Wallet,
  Calendar,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { TourBooking, TourExpense, TourPaymentMode } from '../../types';
import { addTourExpense, deleteTourExpense } from '../../services/db';
import { ReceiveTourPaymentModal } from './ReceiveTourPaymentModal';
import { TourPDFExportModal } from './TourPDFExportModal';

interface TourBatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string | null;
  onAddBookingToBatch: (batchId: string) => void;
}

export const TourBatchDetailModal: React.FC<TourBatchDetailModalProps> = ({
  isOpen,
  onClose,
  batchId,
  onAddBookingToBatch,
}) => {
  const {
    tourBatches,
    tourBookings,
    tourExpenses,
    tourWallets,
    formatCurrency,
    formatDate,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
    openEditTourBookingModal,
    deleteTourBookingById,
    deleteTourBatchById,
  } = useData();
  const { user, currentUserProfile } = useAuth();

  const [activeView, setActiveView] = useState<'manifest' | 'account'>('manifest');
  const [accountSubTab, setAccountSubTab] = useState<'both' | 'cash_in' | 'cash_out'>('both');
  const [paymentModalBooking, setPaymentModalBooking] = useState<TourBooking | null>(null);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

  // Cash Out (Folder Expense) Form State
  const [expDescription, setExpDescription] = useState('');
  const [expCategory, setExpCategory] = useState<TourExpense['category']>('Hotel & Stay');
  const [expAmount, setExpAmount] = useState('');
  const [expWalletName, setExpWalletName] = useState('Rizwan (Tour)');
  const [expPaymentMode, setExpPaymentMode] = useState<TourPaymentMode>('UPI');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expError, setExpError] = useState('');

  const batch = useMemo(
    () => (batchId ? tourBatches.find((b) => b.id === batchId) || null : null),
    [batchId, tourBatches]
  );

  const bookings = useMemo(
    () => (batch ? tourBookings.filter((b) => b.tourBatchId === batch.id) : []),
    [batch, tourBookings]
  );

  const expenses = useMemo(
    () => (batch ? tourExpenses.filter((e) => e.tourBatchId === batch.id) : []),
    [batch, tourExpenses]
  );

  // Compute Folder-Specific Account & Wallet Stats (Kisme Kitna He for THIS folder)
  const folderAccountStats = useMemo(() => {
    const walletsMap: Record<
      string,
      { cashIn: number; cashOut: number; net: number }
    > = {
      'Sahil (Tour)': { cashIn: 0, cashOut: 0, net: 0 },
      'Rizwan (Tour)': { cashIn: 0, cashOut: 0, net: 0 },
    };

    const ensureWallet = (wName: string) => {
      const cleanName = wName || 'Rizwan (Tour)';
      if (!walletsMap[cleanName]) {
        walletsMap[cleanName] = { cashIn: 0, cashOut: 0, net: 0 };
      }
      return cleanName;
    };

    let totalCashIn = 0;
    let totalCashOut = 0;

    // 1. Aggregate Cash In from this folder's bookings (using paymentHistory if present)
    bookings.forEach((b) => {
      const adv = Number(b.advancePaid || 0);
      totalCashIn += adv;

      if (Array.isArray(b.paymentHistory) && b.paymentHistory.length > 0) {
        const histSum = b.paymentHistory.reduce((s, h) => s + Number(h.amount || 0), 0);
        b.paymentHistory.forEach((h) => {
          const w = ensureWallet(h.walletName || b.walletName || 'Rizwan (Tour)');
          walletsMap[w].cashIn += Number(h.amount || 0);
        });
        // If advancePaid is higher than paymentHistory sum (legacy adjustment), attribute remainder to booking wallet
        if (adv > histSum) {
          const w = ensureWallet(b.walletName || 'Rizwan (Tour)');
          walletsMap[w].cashIn += adv - histSum;
        }
      } else if (adv > 0) {
        const w = ensureWallet(b.walletName || 'Rizwan (Tour)');
        walletsMap[w].cashIn += adv;
      }
    });

    // 2. Aggregate Cash Out from this folder's expenses
    expenses.forEach((e) => {
      const amt = Number(e.amount || 0);
      totalCashOut += amt;
      const w = ensureWallet(e.walletName || 'Rizwan (Tour)');
      walletsMap[w].cashOut += amt;
    });

    // 3. Calculate Net per wallet
    Object.keys(walletsMap).forEach((w) => {
      walletsMap[w].net = walletsMap[w].cashIn - walletsMap[w].cashOut;
    });

    return {
      totalCashIn,
      totalCashOut,
      netFolderBalance: totalCashIn - totalCashOut,
      walletsMap,
    };
  }, [bookings, expenses]);

  if (!isOpen || !batchId || !batch) return null;

  const handleDeleteBooking = async (bId: string, custName: string) => {
    if (window.confirm(`Are you sure you want to delete booking for ${custName}?`)) {
      try {
        await deleteTourBookingById(bId);
      } catch (err) {
        console.error('Failed to delete booking:', err);
      }
    }
  };

  const handleDeleteBatch = async () => {
    if (window.confirm(`Are you sure you want to delete tour folder "${batch.title}"? This cannot be undone.`)) {
      try {
        await deleteTourBatchById(batch.id);
        onClose();
      } catch (err) {
        console.error('Failed to delete tour folder:', err);
      }
    }
  };

  const handleAddFolderExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError('');

    const amt = Number(expAmount);
    if (!expDescription.trim()) {
      setExpError('Please enter expense description (e.g. Hotel Advance / Train Ticket).');
      return;
    }
    if (!amt || amt <= 0) {
      setExpError('Please enter a valid amount greater than ₹0.');
      return;
    }

    setIsSavingExpense(true);
    try {
      const selectedWalletObj = tourWallets.find(
        (w) => w.name.toLowerCase() === expWalletName.toLowerCase()
      );
      const userEmail = currentUserProfile?.email || user?.email || 'admin@sanzari.com';

      await addTourExpense(
        {
          tourBatchId: batch.id,
          tourTitle: batch.title,
          destination: batch.destination,
          category: expCategory,
          amount: amt,
          walletId: selectedWalletObj?.id || '',
          walletName: expWalletName,
          paymentMode: expPaymentMode,
          date: expDate || new Date().toISOString().split('T')[0],
          monthKey: (expDate || new Date().toISOString()).slice(0, 7),
          description: expDescription.trim(),
          notes: `Paid via ${expPaymentMode} from ${expWalletName}`,
        },
        userEmail
      );

      setExpDescription('');
      setExpAmount('');
    } catch (err: any) {
      console.error('Failed to add folder expense:', err);
      setExpError(err.message || 'Failed to save expense.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteFolderExpense = async (expId: string, desc: string) => {
    if (window.confirm(`Delete Cash Out entry "${desc}"?`)) {
      try {
        const userEmail = currentUserProfile?.email || user?.email || 'admin@sanzari.com';
        await deleteTourExpense(expId, userEmail);
      } catch (err) {
        console.error('Failed to delete expense:', err);
      }
    }
  };

  const totalPassengers = bookings.reduce((sum, b) => sum + (b.membersCount || 1), 0);
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalAdvance = bookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);
  const totalPending = bookings.reduce(
    (sum, b) => sum + Math.max(0, (b.totalAmount || 0) - (b.advancePaid || 0)),
    0
  );

  const totalSeats = batch.totalSeats || 30;
  const percentage = Math.min(100, Math.round((totalPassengers / totalSeats) * 100));

  const handleShareVoucher = (b: TourBooking) => {
    setTourReceiptBooking(b);
    setIsTourReceiptOpen(true);
  };

  const handleExportGroupPDF = () => {
    setIsPDFModalOpen(true);
  };

  const walletOptions =
    tourWallets.length > 0
      ? tourWallets
      : [
          { id: 'sahil', name: 'Sahil (Tour)' },
          { id: 'rizwan', name: 'Rizwan (Tour)' },
          { id: 'bus', name: 'Bus (Tour)' },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header - Crisp White Background, Black Text & Black Borders */}
        <div className="bg-white p-5 sm:p-6 text-zinc-950 shrink-0 border-b-2 border-zinc-900">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-900 bg-zinc-100 border border-zinc-300 px-2.5 py-0.5 rounded-full">
                  🗓️ Departure: {formatDate(batch.departureDate)}
                </span>
                <span className="text-[11px] bg-zinc-100 border border-zinc-300 text-zinc-900 font-bold px-2 py-0.5 rounded-md">
                  {batch.tourType}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1.5 text-zinc-950 tracking-tight">
                {batch.title}
              </h2>
              <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-zinc-900" /> {batch.destination} •{' '}
                {batch.durationDays} Days ({batch.travelMode})
              </p>
            </div>

            {/* Header Right: Folder Account Button (Marked Area), Download PDF, Delete Folder & Close */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* NEW: Folder Account (Cash In / Cash Out) Toggle Button */}
              <button
                type="button"
                onClick={() =>
                  setActiveView((prev) => (prev === 'account' ? 'manifest' : 'account'))
                }
                title="Open Folder Account (Cash In & Cash Out for this group)"
                className={`px-3.5 py-2 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs ${
                  activeView === 'account'
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-amber-400 hover:bg-amber-500 text-zinc-950 border-zinc-900'
                }`}
              >
                <Wallet size={14} className="stroke-[2.5]" />
                <span>
                  {activeView === 'account'
                    ? '👥 Back to Bookings'
                    : '💳 Folder Account (Cash In/Out)'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleExportGroupPDF}
                disabled={bookings.length === 0}
                title="Download Group Bookings & Payment List PDF"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white border border-emerald-700 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <FileDown size={14} className="stroke-[2.5]" />
                <span>Download Group PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteBatch}
                title="Delete Tour Folder"
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Trash2 size={13} />
                <span>Delete Folder</span>
              </button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Seat Progress & Collection Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-zinc-200 text-xs">
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl">
              <span className="text-zinc-500 block text-[11px] font-medium">Seat Capacity</span>
              <span className="text-sm sm:text-base font-black text-zinc-950">
                {totalPassengers} / {totalSeats} Booked ({percentage}%)
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl">
              <span className="text-zinc-500 block text-[11px] font-medium">Total Package Value</span>
              <span className="text-sm sm:text-base font-black text-zinc-950">
                {formatCurrency(totalRevenue)}
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl">
              <span className="text-emerald-800 block text-[11px] font-bold">
                Advance / Received (Cash In)
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-700">
                {formatCurrency(totalAdvance)}
              </span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 p-2.5 rounded-xl">
              <span className="text-rose-800 block text-[11px] font-bold">
                Remaining Baaki (Due)
              </span>
              <span className="text-sm sm:text-base font-black text-rose-600">
                {formatCurrency(totalPending)}
              </span>
            </div>
          </div>

          {/* View Switcher Tabs inside Modal Header */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setActiveView('manifest')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
                activeView === 'manifest'
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-zinc-900'
              }`}
            >
              <Users size={14} />
              <span>👥 Bookings Manifest ({bookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('account')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
                activeView === 'account'
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                  : 'bg-amber-50 text-amber-950 border-amber-400 hover:border-zinc-900'
              }`}
            >
              <Wallet size={14} />
              <span>
                💳 Folder Account — Cash In / Cash Out (Net:{' '}
                {formatCurrency(folderAccountStats.netFolderBalance)})
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0 bg-white text-zinc-900">
          {activeView === 'account' ? (
            /* =========================================================
               VIEW 2: FOLDER ACCOUNT (CASH IN & CASH OUT FOR THIS FOLDER)
               ========================================================= */
            <div className="space-y-5">
              {/* 1. Folder Cash In / Cash Out / Net Balance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-emerald-900">
                      🟢 Folder Cash In (Received)
                    </span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-1">
                    + {formatCurrency(folderAccountStats.totalCashIn)}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                    From {bookings.filter((b) => (b.advancePaid || 0) > 0).length} customer bookings
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-rose-900">
                      🔴 Folder Cash Out (Expenses)
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-rose-700 stroke-[2.5]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 mt-1">
                    - {formatCurrency(folderAccountStats.totalCashOut)}
                  </div>
                  <div className="text-[11px] text-rose-800 font-semibold mt-0.5">
                    Across {expenses.length} expense entries in this folder
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 text-white border-2 border-zinc-950">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-amber-400">
                      💼 Net Folder Balance (Bachat)
                    </span>
                    <Wallet className="w-4 h-4 text-amber-400" />
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                      folderAccountStats.netFolderBalance >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(folderAccountStats.netFolderBalance)}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-semibold mt-0.5">
                    Cash In ({formatCurrency(folderAccountStats.totalCashIn)}) - Cash Out (
                    {formatCurrency(folderAccountStats.totalCashOut)})
                  </div>
                </div>
              </div>

              {/* 2. Kisme Kitna He? (Sahil vs Rizwan Wallet Breakdown for THIS Folder) */}
              <div className="p-4 rounded-2xl bg-zinc-50 border-2 border-zinc-900 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                    <Wallet size={14} className="text-zinc-950" />
                    <span>
                      Kiske Account me Kitna He? — ({batch.title} Folder Breakdown)
                    </span>
                  </h4>
                  <span className="text-[10px] font-bold bg-white px-2.5 py-0.5 rounded-full border border-zinc-300 text-zinc-700">
                    Only this folder&apos;s Cash In &amp; Cash Out
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(folderAccountStats.walletsMap).map(([wName, wData]) => {
                    const isSahil = wName.toLowerCase().includes('sahil');
                    const isRizwan = wName.toLowerCase().includes('rizwan');
                    return (
                      <div
                        key={wName}
                        className="p-3.5 rounded-xl bg-white border-2 border-zinc-900 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-7 h-7 rounded-lg font-black text-xs text-white flex items-center justify-center ${
                                isSahil
                                  ? 'bg-purple-600'
                                  : isRizwan
                                  ? 'bg-blue-600'
                                  : 'bg-amber-600'
                              }`}
                            >
                              {wName.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <span className="font-black text-xs text-zinc-950 block">
                                {wName}
                              </span>
                              <span className="text-[9px] text-zinc-500 font-bold uppercase">
                                Folder Account Balance
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-black font-mono ${
                              wData.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(wData.net)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="bg-emerald-50/70 px-2 py-1 rounded-lg border border-emerald-200">
                            <span className="text-[9px] font-sans font-bold uppercase text-emerald-800 block">
                              Cash In (+)
                            </span>
                            <strong className="text-emerald-700 font-black">
                              +{formatCurrency(wData.cashIn)}
                            </strong>
                          </div>
                          <div className="bg-rose-50/70 px-2 py-1 rounded-lg border border-rose-200">
                            <span className="text-[9px] font-sans font-bold uppercase text-rose-800 block">
                              Cash Out (-)
                            </span>
                            <strong className="text-rose-600 font-black">
                              -{formatCurrency(wData.cashOut)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Sub-tab Filter: Both vs Cash In Only vs Cash Out Only */}
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAccountSubTab('both')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      accountSubTab === 'both'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-zinc-900'
                    }`}
                  >
                    📊 Both (Cash In &amp; Cash Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountSubTab('cash_in')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      accountSubTab === 'cash_in'
                        ? 'bg-emerald-600 text-white border-emerald-800'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:border-emerald-600'
                    }`}
                  >
                    🟢 Customer Cash In ({bookings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountSubTab('cash_out')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      accountSubTab === 'cash_out'
                        ? 'bg-rose-600 text-white border-rose-800'
                        : 'bg-rose-50 text-rose-900 border-rose-300 hover:border-rose-600'
                    }`}
                  >
                    🔴 Cash Out / Expenses ({expenses.length})
                  </button>
                </div>
              </div>

              {/* 4. CASH OUT SECTION: Add Folder Expense Form + Expense List */}
              {(accountSubTab === 'both' || accountSubTab === 'cash_out') && (
                <div className="p-4 rounded-2xl bg-rose-50/40 border-2 border-zinc-900 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4 text-rose-600 stroke-[3]" />
                      <span>
                        🔴 Cash Out — Add Expense for {batch.title} ({formatCurrency(folderAccountStats.totalCashOut)})
                      </span>
                    </h4>
                  </div>

                  {/* Add Expense Form */}
                  <form
                    onSubmit={handleAddFolderExpense}
                    className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 space-y-3"
                  >
                    {expError && (
                      <div className="p-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold">
                        {expError}
                      </div>
                    )}

                    {/* Quick Expense Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-zinc-500 mr-1">
                        Quick Expense:
                      </span>
                      {[
                        { label: '🏨 Hotel Advance', cat: 'Hotel & Stay' as const },
                        { label: '🚆 Train Tickets', cat: 'Train & Transport' as const },
                        { label: '🚌 Tempo / Cab Payment', cat: 'Train & Transport' as const },
                        { label: '🍽️ Food / Maharaj', cat: 'Food & Meals' as const },
                        { label: '🛶 Shikara / Entry', cat: 'Sightseeing & Entry' as const },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setExpDescription(preset.label.replace(/^[^\s]+\s/, ''));
                            setExpCategory(preset.cat);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-900 text-zinc-800 hover:text-white border border-zinc-300 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                          Expense Detail / Description *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Srinagar Hotel Advance / Bus Payment / Food"
                          value={expDescription}
                          onChange={(e) => setExpDescription(e.target.value)}
                          className="w-full bg-zinc-50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-xs font-bold text-zinc-950 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                          Cash Out Amount (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="₹ Amount"
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          className="w-full bg-rose-50/60 border-2 border-rose-600 rounded-xl px-3 py-2 text-sm font-mono font-black text-rose-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Account Selector + Mode Selector + Date + Submit */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                      {/* Account Selector Buttons */}
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                          Paid From Account (Kiske Account se Gaya?) *
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {walletOptions.map((w) => {
                            const selected = expWalletName === w.name;
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => setExpWalletName(w.name)}
                                className={`py-2 px-1.5 rounded-xl border-2 text-[11px] font-black truncate cursor-pointer transition-all ${
                                  selected
                                    ? 'bg-zinc-950 text-white border-zinc-950'
                                    : 'bg-zinc-50 text-zinc-800 border-zinc-300 hover:border-zinc-900'
                                }`}
                              >
                                {w.name.replace(' (Tour)', '')}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment Mode Buttons */}
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                          Payment Mode *
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['UPI', 'Cash', 'Online'] as TourPaymentMode[]).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setExpPaymentMode(m)}
                              className={`py-2 px-1.5 rounded-xl border-2 text-[11px] font-black cursor-pointer transition-all ${
                                expPaymentMode === m
                                  ? 'bg-rose-600 text-white border-rose-800'
                                  : 'bg-zinc-50 text-zinc-800 border-zinc-300 hover:border-zinc-900'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date & Save Button */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-zinc-600 mb-1 flex items-center gap-1">
                            <Calendar size={10} /> Date
                          </label>
                          <input
                            type="date"
                            value={expDate}
                            onChange={(e) => setExpDate(e.target.value)}
                            className="w-full bg-zinc-50 border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-950"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingExpense}
                          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer active:scale-95 shrink-0"
                        >
                          <Plus size={14} className="stroke-[3]" />
                          <span>{isSavingExpense ? 'Saving...' : '+ Add Cash Out'}</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Cash Out / Expenses List for this Folder */}
                  {expenses.length === 0 ? (
                    <div className="p-5 rounded-xl bg-white border border-zinc-200 text-center text-xs text-zinc-500 font-medium">
                      No Cash Out / Expenses recorded in this folder yet. Use the form above to add hotel, train, or transport expenses.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 border-2 border-zinc-900 rounded-2xl overflow-hidden bg-white">
                      {expenses.map((e, idx) => (
                        <div
                          key={e.id}
                          className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-rose-50/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-black text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-black text-xs sm:text-sm text-zinc-950 truncate">
                                {e.description}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold text-zinc-600 mt-0.5">
                                <span className="px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-900">
                                  💳 {e.walletName}
                                </span>
                                {e.paymentMode && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800">
                                    {e.paymentMode}
                                  </span>
                                )}
                                <span>• {e.category}</span>
                                <span>• 📅 {formatDate(e.date)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono font-black text-sm text-rose-600">
                              - {formatCurrency(e.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteFolderExpense(e.id, e.description)}
                              title="Delete Expense"
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-600 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. CASH IN SECTION: Customer-Wise Received Payments List for THIS Folder */}
              {(accountSubTab === 'both' || accountSubTab === 'cash_in') && (
                <div className="p-4 rounded-2xl bg-emerald-50/40 border-2 border-zinc-900 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      <span>
                        🟢 Cash In — Customer-Wise Received Payments ({formatCurrency(folderAccountStats.totalCashIn)})
                      </span>
                    </h4>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-300">
                      Remaining Baaki in Folder: {formatCurrency(totalPending)}
                    </span>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="p-5 rounded-xl bg-white border border-zinc-200 text-center text-xs text-zinc-500 font-medium">
                      No customer bookings in this folder yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 border-2 border-zinc-900 rounded-2xl overflow-hidden bg-white">
                      {bookings.map((b, idx) => {
                        const total = Number(b.totalAmount || 0);
                        const adv = Number(b.advancePaid || 0);
                        const due = Math.max(0, total - adv);
                        const isFullPaid = due === 0 && total > 0;
                        const instList = Array.isArray(b.paymentHistory) ? b.paymentHistory : [];

                        return (
                          <div
                            key={b.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-emerald-50/20 transition-colors"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-sm text-zinc-950">
                                    {b.customerName}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-700">
                                    {b.bookingNumber}
                                  </span>
                                  <span className="text-[11px] font-bold text-zinc-600">
                                    ({b.membersCount} Pax)
                                  </span>
                                </div>

                                {/* Account & Mode Breakdown per Customer */}
                                <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px] font-bold">
                                  {instList.length > 0 ? (
                                    instList.map((inst, iIdx) => (
                                      <span
                                        key={inst.id || iIdx}
                                        className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900"
                                      >
                                        #{iIdx + 1}: +{formatCurrency(inst.amount)} in{' '}
                                        <strong>
                                          {(inst.walletName || b.walletName || 'Rizwan').replace(
                                            ' (Tour)',
                                            ''
                                          )}
                                        </strong>{' '}
                                        ({inst.paymentMode || 'UPI'})
                                      </span>
                                    ))
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900">
                                      💳 Account:{' '}
                                      <strong>
                                        {(b.walletName || 'Rizwan').replace(' (Tour)', '')}
                                      </strong>{' '}
                                      • Mode: <strong>{b.paymentMode || 'UPI'}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Cash In Amount, Remaining Baaki & + Receive Button */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                              <div className="text-left sm:text-right font-mono">
                                <div className="text-sm font-black text-emerald-700">
                                  + {formatCurrency(adv)}
                                </div>
                                <div className="text-[10px] font-bold text-zinc-500">
                                  Total: {formatCurrency(total)} •{' '}
                                  {isFullPaid ? (
                                    <span className="text-emerald-700 font-black">✅ Full Paid</span>
                                  ) : (
                                    <span className="text-rose-600 font-black">
                                      Baaki: {formatCurrency(due)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {!isFullPaid ? (
                                <button
                                  type="button"
                                  onClick={() => setPaymentModalBooking(b)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <ArrowDownLeft size={13} className="stroke-[2.5]" />
                                  <span>+ Receive</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPaymentModalBooking(b)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Paid</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* =========================================================
               VIEW 1: BOOKED PASSENGERS MANIFEST
               ========================================================= */
            <>
              {/* Top Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-zinc-950" /> Booked Passengers Manifest (
                  {bookings.length} Bookings • {totalPassengers} Pax)
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {bookings.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportGroupPDF}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-900 hover:text-white border-2 border-emerald-600 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 stroke-[2.5]" /> 📄 Export PDF List
                    </button>
                  )}
                  <button
                    onClick={() => onAddBookingToBatch(batch.id)}
                    className="px-3.5 py-2 bg-zinc-950 hover:bg-black text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer w-fit"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> + Book Passenger for this Date
                  </button>
                </div>
              </div>

              {/* Bookings List */}
              {bookings.length === 0 ? (
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center space-y-2">
                  <Luggage className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-xs font-bold text-zinc-900">
                    No Bookings in this Tour Folder yet
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Click &quot;+ Book Passenger&quot; to add customer bookings to this departure
                    date!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => {
                    const total = Number(b.totalAmount || 0);
                    const adv = Number(b.advancePaid || 0);
                    const due = Math.max(0, total - adv);
                    const isFullPaid = due === 0 && total > 0;

                    return (
                      <div
                        key={b.id}
                        className={`bg-white border rounded-2xl p-4 shadow-xs hover:border-zinc-400 transition-all space-y-3 ${
                          isFullPaid ? 'border-emerald-500 bg-emerald-50/10' : 'border-zinc-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-zinc-100 rounded-lg text-zinc-800 border border-zinc-200">
                              {b.bookingNumber}
                            </span>
                            <span className="text-sm font-black text-zinc-950">
                              {b.customerName}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono font-medium">
                              ({b.customerPhone})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              onClick={() => setPaymentModalBooking(b)}
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg cursor-pointer ${
                                isFullPaid
                                  ? 'bg-emerald-600 text-white border border-emerald-700'
                                  : 'bg-amber-50 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {isFullPaid
                                ? '✅ FULL PAID'
                                : `Received: ₹${adv.toLocaleString('en-IN')}`}
                            </span>

                            {!isFullPaid ? (
                              <button
                                type="button"
                                onClick={() => setPaymentModalBooking(b)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" /> + Receive
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPaymentModalBooking(b)}
                                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> History
                              </button>
                            )}

                            <button
                              onClick={() => openEditTourBookingModal(b)}
                              className="px-2.5 py-1 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleShareVoucher(b)}
                              className="px-2.5 py-1 bg-zinc-900 text-white hover:bg-black rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Slip
                            </button>
                            <button
                              onClick={() => handleDeleteBooking(b.id, b.customerName)}
                              title="Delete Booking"
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Members Sub-list */}
                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                          <div className="text-[11px] font-bold text-zinc-600 uppercase mb-1.5">
                            Members List ({b.membersCount} Pax)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {b.members.map((m, mi) => (
                              <div
                                key={mi}
                                className="bg-white p-2 rounded-lg border border-zinc-200 flex justify-between shadow-2xs"
                              >
                                <span className="font-bold text-zinc-900">
                                  {mi + 1}. {m.name} ({m.gender})
                                </span>
                                <span className="text-zinc-500 font-mono font-medium">
                                  Age: {m.age || 'Adult'}{' '}
                                  {m.seatBerthPreference ? `• ${m.seatBerthPreference}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Financial Details */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 flex-wrap gap-2">
                          <span className="text-zinc-500 font-medium">
                            Wallet:{' '}
                            <strong className="text-zinc-900">
                              {b.walletName || 'Rizwan (Tour)'}
                            </strong>{' '}
                            • Mode: <strong className="text-zinc-900">{b.paymentMode}</strong>
                          </span>
                          <div className="flex items-center gap-4 font-mono">
                            <span>
                              Total:{' '}
                              <strong className="text-zinc-950 font-black">
                                {formatCurrency(total)}
                              </strong>
                            </span>
                            <span className="text-emerald-700">
                              Received:{' '}
                              <strong className="font-black">{formatCurrency(adv)}</strong>
                            </span>
                            {isFullPaid ? (
                              <span className="text-emerald-700 font-black">✅ Full Paid</span>
                            ) : (
                              <span className="text-rose-600 font-black">
                                Baaki Due: {formatCurrency(due)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tour Expenses Breakdown at bottom of Manifest */}
              {expenses.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-rose-600" /> Folder Cash Out / Expenses Log (
                      {formatCurrency(folderAccountStats.totalCashOut)})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveView('account')}
                      className="text-xs font-black text-rose-700 hover:underline cursor-pointer"
                    >
                      + Add / Manage in Folder Account →
                    </button>
                  </div>
                  <div className="divide-y border border-zinc-200 rounded-2xl overflow-hidden text-xs bg-white shadow-2xs">
                    {expenses.map((e) => (
                      <div key={e.id} className="p-3 bg-white flex items-center justify-between">
                        <div>
                          <span className="font-bold text-zinc-900 block">{e.description}</span>
                          <span className="text-zinc-500 text-[11px] font-medium">
                            {e.category} • Wallet: {e.walletName}{' '}
                            {e.paymentMode ? `(${e.paymentMode})` : ''} • {formatDate(e.date)}
                          </span>
                        </div>
                        <span className="font-extrabold text-rose-600 font-mono">
                          - {formatCurrency(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ReceiveTourPaymentModal
        isOpen={Boolean(paymentModalBooking)}
        onClose={() => setPaymentModalBooking(null)}
        booking={paymentModalBooking}
      />

      <TourPDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        initialBatchId={batch.id}
      />
    </div>
  );
};
