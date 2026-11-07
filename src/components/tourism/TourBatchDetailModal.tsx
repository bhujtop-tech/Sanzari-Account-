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
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  FileDown,
  Wallet,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Search,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { TourBooking, TourPaymentMode } from '../../types';
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
    openEditTourExpenseModal,
    deleteTourBookingById,
    deleteTourBatchById,
  } = useData();
  const { user, currentUserProfile } = useAuth();

  const [activeView, setActiveView] = useState<'manifest' | 'account'>('manifest');
  const [cashTab, setCashTab] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [classFilter, setClassFilter] = useState<'ALL' | 'AC' | 'NON_AC'>('ALL');
  const [manifestSearchQuery, setManifestSearchQuery] = useState('');
  const [paymentModalBooking, setPaymentModalBooking] = useState<TourBooking | null>(null);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [expandedBookingIds, setExpandedBookingIds] = useState<Record<string, boolean>>({});
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const copyNameToClipboard = (e: React.MouseEvent, rawName?: string) => {
    e.stopPropagation();
    const clean = String(rawName || '').trim();
    if (!clean) return;
    navigator.clipboard.writeText(clean).catch(() => {});
    setCopiedName(clean);
    window.setTimeout(() => {
      setCopiedName((prev) => (prev === clean ? null : prev));
    }, 1600);
  };

  // Simple Cash Out Form State
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expWalletName, setExpWalletName] = useState('Rizwan (Tour)');
  const [expPaymentMode, setExpPaymentMode] = useState<TourPaymentMode>('UPI');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const isNonAcTravelClass = (tc?: string): boolean => {
    const val = String(tc || '').toLowerCase();
    return val.includes('sleeper') || val.includes('non-ac') || val.includes('non ac');
  };

  const batch = useMemo(
    () => (batchId ? tourBatches.find((b) => b.id === batchId) || null : null),
    [batchId, tourBatches]
  );

  const bookings = useMemo(
    () => (batch ? tourBookings.filter((b) => b.tourBatchId === batch.id) : []),
    [batch, tourBookings]
  );

  const acStats = useMemo(() => {
    let acBookings = 0;
    let acPax = 0;
    let nonAcBookings = 0;
    let nonAcPax = 0;
    bookings.forEach((b) => {
      const pax = Number(b.membersCount || 1);
      if (isNonAcTravelClass(b.travelClass)) {
        nonAcBookings += 1;
        nonAcPax += pax;
      } else {
        acBookings += 1;
        acPax += pax;
      }
    });
    return { acBookings, acPax, nonAcBookings, nonAcPax };
  }, [bookings]);

  const filteredManifestBookings = useMemo(() => {
    const q = manifestSearchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (classFilter === 'AC' && isNonAcTravelClass(b.travelClass)) return false;
      if (classFilter === 'NON_AC' && !isNonAcTravelClass(b.travelClass)) return false;
      if (q) {
        const memberNames = Array.isArray(b.members)
          ? b.members.map((m) => m.name || '').join(' ')
          : '';
        const haystack = `${b.customerName || ''} ${b.customerPhone || ''} ${b.bookingNumber || ''} ${b.city || ''} ${b.walletName || ''} ${memberNames}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, classFilter, manifestSearchQuery]);

  const expenses = useMemo(
    () => (batch ? tourExpenses.filter((e) => e.tourBatchId === batch.id) : []),
    [batch, tourExpenses]
  );

  // Folder-Specific Account & Wallet Stats (Sahil vs Rizwan for THIS folder)
  const folderAccountStats = useMemo(() => {
    let sahilIn = 0;
    let sahilOut = 0;
    let rizwanIn = 0;
    let rizwanOut = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;

    const addIn = (wallet: string, amt: number) => {
      if ((wallet || '').toLowerCase().includes('sahil')) {
        sahilIn += amt;
      } else {
        rizwanIn += amt;
      }
    };

    bookings.forEach((b) => {
      const adv = Number(b.advancePaid || 0);
      totalCashIn += adv;

      if (Array.isArray(b.paymentHistory) && b.paymentHistory.length > 0) {
        const histSum = b.paymentHistory.reduce((s, h) => s + Number(h.amount || 0), 0);
        b.paymentHistory.forEach((h) => {
          addIn(h.walletName || b.walletName || 'Rizwan (Tour)', Number(h.amount || 0));
        });
        if (adv > histSum) {
          addIn(b.walletName || 'Rizwan (Tour)', adv - histSum);
        }
      } else if (adv > 0) {
        addIn(b.walletName || 'Rizwan (Tour)', adv);
      }
    });

    expenses.forEach((e) => {
      const amt = Number(e.amount || 0);
      totalCashOut += amt;
      if ((e.walletName || '').toLowerCase().includes('sahil')) {
        sahilOut += amt;
      } else {
        rizwanOut += amt;
      }
    });

    return {
      totalCashIn,
      totalCashOut,
      netBalance: totalCashIn - totalCashOut,
      sahilIn,
      sahilOut,
      sahilNet: sahilIn - sahilOut,
      rizwanIn,
      rizwanOut,
      rizwanNet: rizwanIn - rizwanOut,
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
    const amt = Number(expAmount);
    if (!expDescription.trim() || !amt || amt <= 0) return;

    setIsSavingExpense(true);
    try {
      const selectedWalletObj = tourWallets.find(
        (w) => w.name.toLowerCase() === expWalletName.toLowerCase()
      );
      const userEmail = currentUserProfile?.email || user?.email || 'admin@sanzari.com';
      const today = new Date().toISOString().split('T')[0];

      await addTourExpense(
        {
          tourBatchId: batch.id,
          tourTitle: batch.title,
          destination: batch.destination,
          category: 'Other',
          amount: amt,
          walletId: selectedWalletObj?.id || '',
          walletName: expWalletName,
          paymentMode: expPaymentMode,
          date: today,
          monthKey: today.slice(0, 7),
          description: expDescription.trim(),
          notes: `${expPaymentMode} • ${expWalletName}`,
        },
        userEmail
      );

      setExpDescription('');
      setExpAmount('');
    } catch (err) {
      console.error('Failed to add expense:', err);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteFolderExpense = async (expId: string, desc: string) => {
    if (window.confirm(`Delete expense "${desc}"?`)) {
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

  const toggleBookingExpand = (id: string) => {
    setExpandedBookingIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleWhatsAppShareBooking = (e: React.MouseEvent, b: TourBooking) => {
    e.stopPropagation();
    const total = Number(b.totalAmount || 0);
    const adv = Number(b.advancePaid || 0);
    const due = Math.max(0, total - adv);
    const memberText = b.members
      .map((m, i) => `${i + 1}. ${m.name} (${m.age ? `${m.age} yrs` : 'Adult'}, ${m.gender})`)
      .join('\n');
    const msg =
      `*SANZARI TOURS & TRAVELS*\n*Group Booking Details (${batch.title})*\n\n` +
      `📌 *Booking ID:* ${b.bookingNumber}\n` +
      `👤 *Customer:* ${b.customerName} (${b.customerPhone})\n` +
      `📍 *Destination:* ${b.destination} (${b.tourDate})\n` +
      `🚆 *Travel Class:* ${b.travelClass}\n\n` +
      `*Passengers (${b.membersCount} Pax):*\n${memberText}\n\n` +
      `💰 *Total Amount:* ₹${total.toLocaleString('en-IN')}\n` +
      `✅ *Received:* ₹${adv.toLocaleString('en-IN')} (${(b.walletName || 'Rizwan').replace(' (Tour)', '')} • ${b.paymentMode || 'UPI'})\n` +
      (due === 0
        ? `🎉 *Status:* FULL PAID\n`
        : `⏳ *Baaki Due:* ₹${due.toLocaleString('en-IN')}\n`) +
      (b.specialNotes ? `📝 *Notes:* ${b.specialNotes}\n` : '');

    const phoneClean = (b.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCode = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[98vh] sm:max-h-[94vh] flex flex-col">
        {/* Clean Header */}
        <div className="bg-white p-3 sm:p-5 text-zinc-950 shrink-0 border-b-2 border-zinc-900">
          <div className="flex items-start justify-between gap-2.5 flex-wrap">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold text-zinc-900 bg-zinc-100 border border-zinc-300 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full">
                  🗓️ Departure: {formatDate(batch.departureDate)}
                </span>
                <span className="text-[10px] sm:text-[11px] bg-zinc-100 border border-zinc-300 text-zinc-900 font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md">
                  {batch.tourType}
                </span>
                <span className="text-[10px] sm:text-[11px] bg-blue-100 border border-blue-400 text-blue-900 font-black px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-lg">
                  🚆 AC: {acStats.acPax} Pax ({acStats.acBookings})
                </span>
                <span className="text-[10px] sm:text-[11px] bg-amber-100 border border-amber-400 text-amber-900 font-black px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-lg">
                  🚂 Non-AC: {acStats.nonAcPax} Pax ({acStats.nonAcBookings})
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black mt-1 text-zinc-950 tracking-tight leading-tight">
                {batch.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-600 flex items-center gap-1 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-zinc-900 shrink-0" /> {batch.destination} •{' '}
                {batch.durationDays} Days ({batch.travelMode})
              </p>
            </div>

            {/* Top Action Buttons: Account Button, Download PDF, Delete, Close */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setActiveView((prev) => (prev === 'account' ? 'manifest' : 'account'))
                }
                className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border-2 text-[11px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  activeView === 'account'
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-amber-400 hover:bg-amber-500 text-zinc-950 border-zinc-900'
                }`}
              >
                <Wallet size={13} className="stroke-[2.5]" />
                <span>{activeView === 'account' ? '← Back' : 'Account'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPDFModalOpen(true)}
                disabled={bookings.length === 0}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white border border-emerald-700 text-[11px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
              >
                <FileDown size={13} className="stroke-[2.5]" />
                <span>Download Group PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteBatch}
                className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Delete Folder</span>
              </button>

              <button
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Summary Cards (Compact 2x2 Grid on Mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mt-3 pt-2.5 border-t border-zinc-200 text-xs">
            <div className="bg-zinc-50 border border-zinc-200 p-2 sm:p-2.5 rounded-xl min-w-0">
              <span className="text-zinc-500 block text-[10px] sm:text-[11px] font-medium truncate">Seat Capacity</span>
              <span className="text-xs sm:text-base font-black text-zinc-950 truncate block">
                {totalPassengers} / {totalSeats} Booked ({percentage}%)
              </span>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-300 text-[9px] font-black">
                  🚆 AC: {acStats.acPax}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black">
                  🚂 Non-AC: {acStats.nonAcPax}
                </span>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-2 sm:p-2.5 rounded-xl min-w-0">
              <span className="text-zinc-500 block text-[10px] sm:text-[11px] font-medium truncate">Total Package Value</span>
              <span className="text-xs sm:text-base font-black text-zinc-950 truncate block">
                {formatCurrency(totalRevenue)}
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-2 sm:p-2.5 rounded-xl min-w-0">
              <span className="text-emerald-800 block text-[10px] sm:text-[11px] font-bold truncate">Advance / Received</span>
              <span className="text-xs sm:text-base font-black text-emerald-700 truncate block">
                {formatCurrency(totalAdvance)}
              </span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 p-2 sm:p-2.5 rounded-xl min-w-0">
              <span className="text-rose-800 block text-[10px] sm:text-[11px] font-bold truncate">Remaining Baaki (Due)</span>
              <span className="text-xs sm:text-base font-black text-rose-600 truncate block">
                {formatCurrency(totalPending)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0 bg-white text-zinc-900">
          {activeView === 'account' ? (
            /* =========================================================
               SIMPLE FOLDER ACCOUNT VIEW (CASH IN / CASH OUT + WALLETS)
               ========================================================= */
            <div className="space-y-4">
              {/* Row 1: Kisme Kitna He (Sahil vs Rizwan vs Folder Net Balance) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Sahil Box */}
                <div className="p-3 rounded-2xl bg-purple-50/60 border-2 border-purple-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-900 block">
                      🟣 Sahil Account (Is Folder me)
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-zinc-950">
                      {formatCurrency(folderAccountStats.sahilNet)}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 block">
                      In: +{formatCurrency(folderAccountStats.sahilIn)} • Out: -
                      {formatCurrency(folderAccountStats.sahilOut)}
                    </span>
                  </div>
                </div>

                {/* Rizwan Box */}
                <div className="p-3 rounded-2xl bg-blue-50/60 border-2 border-blue-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-900 block">
                      🔵 Rizwan Account (Is Folder me)
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-zinc-950">
                      {formatCurrency(folderAccountStats.rizwanNet)}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 block">
                      In: +{formatCurrency(folderAccountStats.rizwanIn)} • Out: -
                      {formatCurrency(folderAccountStats.rizwanOut)}
                    </span>
                  </div>
                </div>

                {/* Net Folder Balance */}
                <div className="p-3 rounded-2xl bg-zinc-950 text-white border-2 border-zinc-950 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 block">
                      💼 Folder Net Balance (In - Out)
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                      {formatCurrency(folderAccountStats.netBalance)}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 block">
                      Total In: +{formatCurrency(folderAccountStats.totalCashIn)} • Out: -
                      {formatCurrency(folderAccountStats.totalCashOut)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Simple 2-Button Toggle: Cash In vs Cash Out */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCashTab('cash_in')}
                  className={`py-3 px-4 rounded-2xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    cashTab === 'cash_in'
                      ? 'bg-emerald-600 text-white border-emerald-800 shadow-sm'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:border-emerald-600'
                  }`}
                >
                  <ArrowDownLeft size={16} className="stroke-[3]" />
                  <span>🟢 Cash In — Customer Wise ({formatCurrency(folderAccountStats.totalCashIn)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCashTab('cash_out')}
                  className={`py-3 px-4 rounded-2xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    cashTab === 'cash_out'
                      ? 'bg-rose-600 text-white border-rose-800 shadow-sm'
                      : 'bg-rose-50 text-rose-900 border-rose-300 hover:border-rose-600'
                  }`}
                >
                  <ArrowUpRight size={16} className="stroke-[3]" />
                  <span>🔴 Cash Out — Expenses ({formatCurrency(folderAccountStats.totalCashOut)})</span>
                </button>
              </div>

              {/* Tab 1: CASH IN (Customer-Wise List) */}
              {cashTab === 'cash_in' ? (
                <div className="border-2 border-zinc-900 rounded-2xl overflow-hidden bg-white">
                  <div className="bg-zinc-100 px-4 py-2.5 border-b-2 border-zinc-900 flex items-center justify-between text-xs font-black text-zinc-800">
                    <span>CUSTOMER NAME &amp; ACCOUNT</span>
                    <span>CASH IN (RECEIVED)</span>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 font-medium">
                      No customer bookings in this folder yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200">
                      {bookings.map((b, idx) => {
                        const total = Number(b.totalAmount || 0);
                        const adv = Number(b.advancePaid || 0);
                        const due = Math.max(0, total - adv);
                        const isFullPaid = due === 0 && total > 0;
                        const walletShort = (b.walletName || 'Rizwan').replace(' (Tour)', '');

                        return (
                          <div
                            key={b.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold text-zinc-400">
                                  #{idx + 1}
                                </span>
                                <span
                                  onClick={(e) => copyNameToClipboard(e, b.customerName)}
                                  onDoubleClick={(e) => copyNameToClipboard(e, b.customerName)}
                                  title="Click or Double-click to copy name"
                                  className={`font-black text-sm cursor-pointer select-none transition-colors ${
                                    copiedName === String(b.customerName || '').trim()
                                      ? 'text-emerald-600'
                                      : 'text-zinc-950 hover:text-emerald-700'
                                  }`}
                                >
                                  {b.customerName}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-zinc-900 text-white text-[10px] font-black">
                                  {b.membersCount} Pax
                                </span>
                                {isNonAcTravelClass(b.travelClass) ? (
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-400 text-[10px] font-black">
                                    🚂 Non-AC
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-400 text-[10px] font-black">
                                    🚆 AC
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-zinc-600 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-900">
                                  💳 {walletShort} ({b.paymentMode || 'UPI'})
                                </span>
                                <span>Total: {formatCurrency(total)}</span>
                                {!isFullPaid && (
                                  <span className="text-rose-600">
                                    • Baaki: {formatCurrency(due)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="font-mono font-black text-sm sm:text-base text-emerald-700">
                                + {formatCurrency(adv)}
                              </span>
                              {!isFullPaid && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentModalBooking(b)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer"
                                >
                                  + Receive
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: CASH OUT (Simple Add Expense + Expense List) */
                <div className="space-y-3">
                  {/* Simple 1-Box Add Expense Form */}
                  <form
                    onSubmit={handleAddFolderExpense}
                    className="p-3.5 rounded-2xl bg-rose-50/50 border-2 border-zinc-900 space-y-2.5"
                  >
                    <div className="text-xs font-black uppercase text-zinc-900">
                      + Add Cash Out / Expense (Is Folder ke Liye)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Expense Name (e.g. Hotel, Train, Bus, Food)"
                        value={expDescription}
                        onChange={(e) => setExpDescription(e.target.value)}
                        className="sm:col-span-4 bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-xs font-bold text-zinc-950 focus:outline-none"
                      />

                      <input
                        type="number"
                        required
                        min={1}
                        placeholder="₹ Amount"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="sm:col-span-2 bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-xs font-mono font-black text-rose-700 focus:outline-none"
                      />

                      <select
                        value={expWalletName}
                        onChange={(e) => setExpWalletName(e.target.value)}
                        className="sm:col-span-2 bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-2 text-xs font-black text-zinc-950 cursor-pointer focus:outline-none"
                      >
                        <option value="Rizwan (Tour)">🔵 Rizwan</option>
                        <option value="Sahil (Tour)">🟣 Sahil</option>
                        <option value="Bus (Tour)">🟠 Bus</option>
                      </select>

                      <select
                        value={expPaymentMode}
                        onChange={(e) => setExpPaymentMode(e.target.value as TourPaymentMode)}
                        className="sm:col-span-2 bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-2 text-xs font-black text-zinc-950 cursor-pointer focus:outline-none"
                      >
                        <option value="UPI">📱 UPI</option>
                        <option value="Cash">💵 Cash</option>
                        <option value="Online">🏦 Online</option>
                      </select>

                      <button
                        type="submit"
                        disabled={isSavingExpense}
                        className="sm:col-span-2 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs cursor-pointer"
                      >
                        {isSavingExpense ? 'Saving...' : '+ Add Out'}
                      </button>
                    </div>
                  </form>

                  {/* Cash Out List */}
                  <div className="border-2 border-zinc-900 rounded-2xl overflow-hidden bg-white">
                    <div className="bg-zinc-100 px-4 py-2.5 border-b-2 border-zinc-900 flex items-center justify-between text-xs font-black text-zinc-800">
                      <span>EXPENSE DETAIL &amp; ACCOUNT</span>
                      <span>CASH OUT AMOUNT</span>
                    </div>

                    {expenses.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500 font-medium">
                        No expenses added in this folder yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-200">
                        {expenses.map((e, idx) => (
                          <div
                            key={e.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50"
                          >
                            <div>
                              <div className="font-black text-sm text-zinc-950">
                                {idx + 1}. {e.description}
                              </div>
                              <div className="text-[11px] font-bold text-zinc-600 mt-0.5 flex items-center gap-2">
                                <span className="px-2 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-900">
                                  💳 {(e.walletName || 'Rizwan').replace(' (Tour)', '')}
                                  {e.paymentMode ? ` (${e.paymentMode})` : ''}
                                </span>
                                <span>📅 {formatDate(e.date)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-black text-sm sm:text-base text-rose-600">
                                - {formatCurrency(e.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openEditTourExpenseModal(e)}
                                className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-zinc-950 border border-amber-400 text-[10px] font-black inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Edit Expense"
                              >
                                <Edit2 size={11} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFolderExpense(e.id, e.description)}
                                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-600 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* =========================================================
               DEFAULT VIEW: BOOKED PASSENGERS MANIFEST
               ========================================================= */
            <>
              <div className="space-y-2.5">
                {/* Top Row: Manifest Title on Left + Search Bar on Right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5 flex-wrap">
                      <Users className="w-4 h-4 text-zinc-950 shrink-0" />
                      <span>
                        Booked Passengers Manifest ({bookings.length} Bookings • {totalPassengers} Pax)
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                      💡 Click on any customer booking row below to expand &amp; view all members and details
                    </p>
                  </div>

                  {/* Search Bar right across from Booked Passengers Manifest */}
                  <div className="relative w-full sm:w-80 shrink-0">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={manifestSearchQuery}
                      onChange={(e) => setManifestSearchQuery(e.target.value)}
                      placeholder="Search passenger name, phone or booking ID..."
                      className="w-full pl-8 pr-7 py-2 bg-zinc-50 focus:bg-white border-2 border-zinc-900 rounded-xl text-xs font-bold text-zinc-950 placeholder:text-zinc-400 focus:outline-none transition-colors"
                    />
                    {manifestSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setManifestSearchQuery('')}
                        title="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-zinc-400 hover:text-zinc-900 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Second Row: AC / Non-AC Filter Pills + Expand All + Book Passenger Button */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* AC vs Non-AC Filter Pills inside Tour Folder */}
                  <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-300">
                    <button
                      type="button"
                      onClick={() => setClassFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                        classFilter === 'ALL'
                          ? 'bg-zinc-950 text-white shadow-2xs'
                          : 'text-zinc-700 hover:bg-white'
                      }`}
                    >
                      All ({totalPassengers} Pax)
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassFilter('AC')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${
                        classFilter === 'AC'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                          : 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      🚆 AC ({acStats.acPax} Pax)
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassFilter('NON_AC')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${
                        classFilter === 'NON_AC'
                          ? 'bg-amber-500 text-zinc-950 border-amber-600 shadow-2xs'
                          : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      🚂 Non-AC ({acStats.nonAcPax} Pax)
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {bookings.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allExpanded = bookings.every((bk) => expandedBookingIds[bk.id]);
                          if (allExpanded) {
                            setExpandedBookingIds({});
                          } else {
                            const next: Record<string, boolean> = {};
                            bookings.forEach((bk) => {
                              next[bk.id] = true;
                            });
                            setExpandedBookingIds(next);
                          }
                        }}
                        className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        {bookings.every((bk) => expandedBookingIds[bk.id])
                          ? 'Collapse All'
                          : 'Expand All'}
                      </button>
                    )}

                    <button
                      onClick={() => onAddBookingToBatch(batch.id)}
                      className="px-3.5 py-2 bg-zinc-950 hover:bg-black text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" /> + Book Passenger for this Date
                    </button>
                  </div>
                </div>
              </div>

              {filteredManifestBookings.length === 0 ? (
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
                <div className="space-y-2.5">
                  {filteredManifestBookings.map((b) => {
                    const total = Number(b.totalAmount || 0);
                    const adv = Number(b.advancePaid || 0);
                    const due = Math.max(0, total - adv);
                    const isFullPaid = due === 0 && total > 0;
                    const isExpanded = Boolean(expandedBookingIds[b.id]);
                    const instList = Array.isArray(b.paymentHistory) ? b.paymentHistory : [];
                    const isNonAc = isNonAcTravelClass(b.travelClass);

                    return (
                      <div
                        key={b.id}
                        className={`bg-white border-2 rounded-2xl transition-all overflow-hidden ${
                          isFullPaid
                            ? 'border-emerald-500 bg-emerald-50/10'
                            : isExpanded
                            ? 'border-zinc-900 shadow-sm'
                            : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        {/* Main Clickable Row (Customer Name, PAX, AC/Non-AC Badge, Payment Status & Actions) */}
                        <div
                          onClick={() => toggleBookingExpand(b.id)}
                          className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none hover:bg-zinc-50/60 transition-colors"
                        >
                          {/* Left: Booking ID, Customer Name, Phone, PAX, AC/Non-AC Badge & Quick Financial Summary */}
                          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-zinc-100 rounded-lg text-zinc-800 border border-zinc-300">
                              {b.bookingNumber}
                            </span>

                            <span
                              onClick={(e) => copyNameToClipboard(e, b.customerName)}
                              onDoubleClick={(e) => copyNameToClipboard(e, b.customerName)}
                              title="Click or Double-click to copy name"
                              className={`text-sm sm:text-base font-black cursor-pointer select-none transition-colors ${
                                copiedName === String(b.customerName || '').trim()
                                  ? 'text-emerald-600'
                                  : 'text-zinc-950 hover:text-emerald-700'
                              }`}
                            >
                              {b.customerName}
                            </span>

                            <span className="text-xs text-zinc-500 font-mono font-semibold">
                              ({b.customerPhone})
                            </span>

                            <span className="px-2 py-0.5 rounded-lg bg-zinc-900 text-white text-[11px] font-black">
                              {b.membersCount} Pax
                            </span>

                            {/* AC vs Non-AC Distinct Colored Badge right next to 2 Pax */}
                            {isNonAc ? (
                              <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-400 text-[11px] font-black shadow-2xs">
                                🚂 Non-AC
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-400 text-[11px] font-black shadow-2xs">
                                🚆 AC
                              </span>
                            )}

                            {/* Inline Financial Summary on Closed Card */}
                            <div className="flex items-center gap-2 text-xs font-mono pl-1">
                              <span className="text-zinc-600">
                                Total: <strong className="text-zinc-950">{formatCurrency(total)}</strong>
                              </span>
                              <span className="text-emerald-700 font-bold">
                                • Recd: {formatCurrency(adv)}
                              </span>
                              {!isFullPaid && (
                                <span className="text-rose-600 font-black">
                                  • Baaki: {formatCurrency(due)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Desktop Right: Status Badge + Action Buttons + Expand Chevron (Hidden on Mobile) */}
                          <div
                            className="hidden lg:flex items-center justify-end gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                              type="button"
                              onClick={(e) => handleWhatsAppShareBooking(e, b)}
                              title="Share Booking Details on WhatsApp"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Share
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditTourBookingModal(b)}
                              className="px-2.5 py-1 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareVoucher(b)}
                              className="px-2.5 py-1 bg-zinc-900 text-white hover:bg-black rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Slip
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(b.id, b.customerName)}
                              title="Delete Booking"
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleBookingExpand(b.id)}
                              title={isExpanded ? 'Hide Details' : 'Show Members & Other Details'}
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 transition-colors cursor-pointer ml-1"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Mobile Right Action Chevron (Shown on Mobile) */}
                          <div className="lg:hidden flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {!isFullPaid ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentModalBooking(b);
                                }}
                                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3 h-3 stroke-[3]" /> + Recv
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-black">
                                ✅ PAID
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookingExpand(b.id);
                              }}
                              className="p-1 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-300 cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Lower Details (Members List, Mobile Action Bar, Wallet/Mode, Installments, Notes) */}
                        {isExpanded && (
                          <div className="px-3 sm:px-4 pb-4 pt-2 border-t border-zinc-200 bg-zinc-50/70 space-y-3">
                            {/* Mobile Quick Action Buttons Bar (Share, Edit, Slip, Delete) */}
                            <div className="flex items-center gap-1.5 flex-wrap lg:hidden pb-2 border-b border-zinc-200">
                              <button
                                type="button"
                                onClick={(e) => handleWhatsAppShareBooking(e, b)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <MessageCircle size={13} /> Share WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditTourBookingModal(b)}
                                className="px-2.5 py-1.5 bg-white text-zinc-800 hover:bg-zinc-100 border border-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleShareVoucher(b)}
                                className="px-2.5 py-1.5 bg-zinc-950 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Share2 size={13} /> Voucher Slip
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBooking(b.id, b.customerName)}
                                className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                            {/* Members Sub-list */}
                            <div className="bg-white p-3 rounded-xl border border-zinc-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-black text-zinc-700 uppercase">
                                  👥 All Family Members ({b.membersCount} Pax) • {b.travelClass}
                                  {b.city ? ` • 📍 ${b.city}` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleWhatsAppShareBooking(e, b)}
                                  className="text-[11px] font-black text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageCircle size={12} /> Share Details on WhatsApp
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                                {b.members.map((m, mi) => {
                                  const isMemberCopied =
                                    copiedName === String(m.name || '').trim();
                                  return (
                                    <div
                                      key={mi}
                                      onClick={(e) => copyNameToClipboard(e, m.name)}
                                      onDoubleClick={(e) => copyNameToClipboard(e, m.name)}
                                      title="Click or Double-click to copy passenger name"
                                      className={`p-2.5 rounded-lg border flex justify-between items-center cursor-pointer select-none transition-colors ${
                                        isMemberCopied
                                          ? 'bg-emerald-50 border-emerald-400'
                                          : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/80'
                                      }`}
                                    >
                                      <span className="font-bold text-zinc-950">
                                        {mi + 1}.{' '}
                                        <span
                                          className={
                                            isMemberCopied
                                              ? 'text-emerald-700 underline decoration-emerald-500'
                                              : 'hover:text-emerald-700'
                                          }
                                        >
                                          {m.name}
                                        </span>{' '}
                                        ({m.gender})
                                      </span>
                                      <span className="text-zinc-600 font-mono font-semibold text-[11px]">
                                        Age: {m.age || 'Adult'}
                                        {m.seatBerthPreference &&
                                        m.seatBerthPreference !== 'No Preference'
                                          ? ` • ${m.seatBerthPreference}`
                                          : ''}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {b.specialNotes && (
                                <div className="mt-2 pt-2 border-t border-zinc-100 text-xs text-amber-900 font-semibold">
                                  📝 Special Note: {b.specialNotes}
                                </div>
                              )}
                            </div>

                            {/* Financial & Installment Details */}
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2 px-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-zinc-600 font-semibold">
                                  Account:{' '}
                                  <strong className="text-zinc-950">
                                    {b.walletName || 'Rizwan (Tour)'}
                                  </strong>{' '}
                                  • Mode: <strong className="text-zinc-950">{b.paymentMode}</strong>
                                </span>
                                {instList.length > 1 &&
                                  instList.map((inst, iIdx) => (
                                    <span
                                      key={inst.id || iIdx}
                                      className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]"
                                    >
                                      #{iIdx + 1}: {formatCurrency(inst.amount)} (
                                      {(inst.walletName || 'Rizwan').replace(' (Tour)', '')} •{' '}
                                      {inst.paymentMode})
                                    </span>
                                  ))}
                              </div>

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
                        )}
                      </div>
                    );
                  })}
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

      {copiedName && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-black shadow-xl border border-emerald-500/60 flex items-center gap-2 pointer-events-none animate-fade-in">
          <span className="text-emerald-400">✓ Copied:</span>
          <span>{copiedName}</span>
        </div>
      )}
    </div>
  );
};
