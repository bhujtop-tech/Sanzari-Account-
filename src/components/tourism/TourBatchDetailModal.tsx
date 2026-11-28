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
  MoreVertical,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { TourBooking, TourPaymentMode } from '../../types';
import {
  addTourExpense,
  deleteTourExpense,
  updateTourBookingTicketStatus,
  restoreCancelledTourBooking,
} from '../../services/db';
import { ReceiveTourPaymentModal } from './ReceiveTourPaymentModal';
import { TourPDFExportModal } from './TourPDFExportModal';
import { CancelTourBookingModal } from './CancelTourBookingModal';
import { TourWhatsAppShareModal } from './TourWhatsAppShareModal';

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
  const [classFilter, setClassFilter] = useState<'ALL' | 'AC' | 'NON_AC' | 'CANCELLED'>('ALL');
  const [manifestSearchQuery, setManifestSearchQuery] = useState('');
  const [paymentModalBooking, setPaymentModalBooking] = useState<TourBooking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<TourBooking | null>(null);
  const [whatsappModalBooking, setWhatsappModalBooking] = useState<TourBooking | null>(null);
  const [openMenuBookingId, setOpenMenuBookingId] = useState<string | null>(null);
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

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.bookingStatus !== 'Cancelled'),
    [bookings]
  );

  const cancelledBookings = useMemo(
    () => bookings.filter((b) => b.bookingStatus === 'Cancelled'),
    [bookings]
  );

  const acStats = useMemo(() => {
    let acBookings = 0;
    let acPax = 0;
    let nonAcBookings = 0;
    let nonAcPax = 0;
    activeBookings.forEach((b) => {
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
  }, [activeBookings]);

  const filteredManifestBookings = useMemo(() => {
    const q = manifestSearchQuery.trim().toLowerCase();
    const matchesQuery = (b: TourBooking) => {
      if (!q) return true;
      const memberNames = Array.isArray(b.members)
        ? b.members.map((m) => m.name || '').join(' ')
        : '';
      const haystack = `${b.customerName || ''} ${b.customerPhone || ''} ${b.bookingNumber || ''} ${b.city || ''} ${b.walletName || ''} ${memberNames}`.toLowerCase();
      return haystack.includes(q);
    };

    if (classFilter === 'CANCELLED') {
      return cancelledBookings.filter(matchesQuery);
    }

    const filteredActive = activeBookings.filter((b) => {
      if (classFilter === 'AC' && isNonAcTravelClass(b.travelClass)) return false;
      if (classFilter === 'NON_AC' && !isNonAcTravelClass(b.travelClass)) return false;
      return matchesQuery(b);
    });

    // In 'ALL' view, keep active bookings first and show cancelled/lost bookings cleanly right below
    if (classFilter === 'ALL') {
      return [...filteredActive, ...cancelledBookings.filter(matchesQuery)];
    }

    return filteredActive;
  }, [activeBookings, cancelledBookings, classFilter, manifestSearchQuery]);

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

  const totalPassengers = activeBookings.reduce((sum, b) => sum + (b.membersCount || 1), 0);
  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalAdvance = activeBookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);
  const totalPending = activeBookings.reduce(
    (sum, b) => sum + Math.max(0, (b.totalAmount || 0) - (b.advancePaid || 0)),
    0
  );

  const handleQuickRestoreBooking = async (b: TourBooking) => {
    if (
      !window.confirm(
        `Kya aap "${b.customerName}" ki cancelled booking wapas Confirm (Restore) karna chahte hain? Agar refund wallet se deduct hua tha, toh wo balance wapas add ho jayega.`
      )
    ) {
      return;
    }
    try {
      const userEmail = currentUserProfile?.email || user?.email || 'admin@sanzari.com';
      await restoreCancelledTourBooking(b.id, userEmail);
    } catch (err) {
      console.error('Failed to restore booking:', err);
    }
  };

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
    setWhatsappModalBooking(b);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-zinc-900 overflow-hidden my-0 sm:my-auto h-[94dvh] sm:h-auto sm:max-h-[94vh] flex flex-col">
        {/* =========================================================
            MOBILE-ONLY COMPACT STICKY TOP BAR (< sm)
            Keeps 88%+ of the mobile screen open for smooth single-scroll!
            ========================================================= */}
        <div className="sm:hidden bg-white px-3.5 pt-2 pb-2.5 text-zinc-950 shrink-0 border-b border-zinc-200">
          <div className="w-10 h-1 rounded-full bg-zinc-300 mx-auto mb-2" />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-black text-zinc-950 tracking-tight leading-tight truncate">
                {batch.title}
              </h2>
              <p className="text-[11px] text-zinc-500 font-semibold truncate mt-0.5">
                {batch.destination} · {formatDate(batch.departureDate)}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setActiveView((prev) => (prev === 'account' ? 'manifest' : 'account'))
                }
                className={`h-9 px-2.5 rounded-xl border-2 text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  activeView === 'account'
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-amber-400 active:bg-amber-500 text-zinc-950 border-zinc-900'
                }`}
              >
                <Wallet size={13} className="stroke-[2.5] shrink-0" />
                <span>{activeView === 'account' ? 'List' : 'Account'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPDFModalOpen(true)}
                disabled={bookings.length === 0}
                title="Download Group PDF"
                className="h-9 px-2.5 rounded-xl bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0"
              >
                <FileDown size={13} className="stroke-[2.5]" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-xl bg-zinc-100 active:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            DESKTOP HEADER (sm+ ONLY — 100% UNCHANGED)
            ========================================================= */}
        <div className="hidden sm:block bg-white p-5 text-zinc-950 shrink-0 border-b-2 border-zinc-900">
          <div className="flex items-start justify-between gap-2.5 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-900 bg-zinc-100 border border-zinc-300 px-2.5 py-0.5 rounded-full">
                  🗓️ Departure: {formatDate(batch.departureDate)}
                </span>
                <span className="text-[11px] bg-zinc-100 border border-zinc-300 text-zinc-900 font-bold px-2 py-0.5 rounded-md">
                  {batch.tourType}
                </span>
                <span className="text-[11px] bg-blue-100 border border-blue-400 text-blue-900 font-black px-2.5 py-0.5 rounded-lg">
                  🚆 AC: {acStats.acPax} Pax ({acStats.acBookings})
                </span>
                <span className="text-[11px] bg-amber-100 border border-amber-400 text-amber-900 font-black px-2.5 py-0.5 rounded-lg">
                  🚂 Non-AC: {acStats.nonAcPax} Pax ({acStats.nonAcBookings})
                </span>
              </div>
              <h2 className="text-2xl font-black mt-1 text-zinc-950 tracking-tight leading-tight">
                {batch.title}
              </h2>
              <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-zinc-900 shrink-0" /> {batch.destination} •{' '}
                {batch.durationDays} Days ({batch.travelMode})
              </p>
            </div>

            {/* Top Action Buttons: Account Button, Download PDF, Delete, Close */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setActiveView((prev) => (prev === 'account' ? 'manifest' : 'account'))
                }
                className={`px-3.5 py-2 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
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
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white border border-emerald-700 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileDown size={13} className="stroke-[2.5]" />
                <span>Download Group PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteBatch}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Delete Folder</span>
              </button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-4 gap-2.5 mt-3 pt-2.5 border-t border-zinc-200 text-xs">
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl min-w-0">
              <span className="text-zinc-500 block text-[11px] font-medium truncate">Seat Capacity</span>
              <span className="text-base font-black text-zinc-950 truncate block">
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

            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl min-w-0">
              <span className="text-zinc-500 block text-[11px] font-medium truncate">Total Package Value</span>
              <span className="text-base font-black text-zinc-950 truncate block">
                {formatCurrency(totalRevenue)}
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl min-w-0">
              <span className="text-emerald-800 block text-[11px] font-bold truncate">Advance / Received</span>
              <span className="text-base font-black text-emerald-700 truncate block">
                {formatCurrency(totalAdvance)}
              </span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 p-2.5 rounded-xl min-w-0">
              <span className="text-rose-800 block text-[11px] font-bold truncate">Remaining Baaki (Due)</span>
              <span className="text-base font-black text-rose-600 truncate block">
                {formatCurrency(totalPending)}
              </span>
            </div>
          </div>
        </div>

        {/* Single Smooth Scrollable Body */}
        <div
          onClick={() => {
            if (openMenuBookingId) setOpenMenuBookingId(null);
          }}
          className="p-3 sm:p-5 pb-20 sm:pb-24 overflow-y-auto overscroll-contain space-y-3 sm:space-y-4 flex-1 min-h-0 bg-zinc-50/50 sm:bg-white text-zinc-900"
        >
          {/* Mobile-Only Scrollable KPI Summary (scrolls away cleanly while browsing passengers!) */}
          <div className="sm:hidden space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-zinc-200 p-2.5 rounded-xl min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-zinc-500">Seats Booked</span>
                  <span className="text-[10px] font-black text-zinc-700 font-mono tabular-nums">
                    {percentage}%
                  </span>
                </div>
                <span className="text-[15px] font-black text-zinc-950 font-mono tabular-nums block mt-0.5">
                  {totalPassengers} / {totalSeats} Pax
                </span>
                <div className="text-[10px] font-bold mt-0.5 flex items-center gap-1.5">
                  <span className="text-blue-700">AC {acStats.acPax}</span>
                  <span className="text-zinc-300">·</span>
                  <span className="text-amber-700">Non-AC {acStats.nonAcPax}</span>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-2.5 rounded-xl min-w-0">
                <span className="text-[10px] font-semibold text-zinc-500 block">Package Billing</span>
                <span className="text-[15px] font-black text-zinc-950 font-mono tabular-nums block mt-0.5 truncate">
                  {formatCurrency(totalRevenue)}
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 block mt-0.5 truncate">
                  {activeBookings.length} Active · {batch.durationDays}d
                </span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl min-w-0">
                <span className="text-[10px] font-bold text-emerald-800 block">Advance Recd</span>
                <span className="text-[15px] font-black text-emerald-700 font-mono tabular-nums block mt-0.5 truncate">
                  {formatCurrency(totalAdvance)}
                </span>
              </div>

              <div className="bg-rose-50/70 border border-rose-200 p-2.5 rounded-xl min-w-0">
                <span className="text-[10px] font-bold text-rose-800 block">Remaining Due</span>
                <span className="text-[15px] font-black text-rose-600 font-mono tabular-nums block mt-0.5 truncate">
                  {formatCurrency(totalPending)}
                </span>
              </div>
            </div>
          </div>
          {activeView === 'account' ? (
            /* =========================================================
               SIMPLE FOLDER ACCOUNT VIEW (CASH IN / CASH OUT + WALLETS)
               ========================================================= */
            <div className="space-y-4">
              {/* Row 1: Kisme Kitna He (Sahil vs Rizwan vs Folder Net Balance) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {/* Sahil Box */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-50/60 border-2 border-purple-300 flex items-center justify-between min-w-0">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-purple-900 block truncate">
                      <span className="sm:hidden">🟣 Sahil Net</span>
                      <span className="hidden sm:inline">🟣 Sahil Account (Is Folder me)</span>
                    </span>
                    <span className="text-sm sm:text-lg font-black font-mono tabular-nums text-zinc-950 block truncate">
                      {formatCurrency(folderAccountStats.sahilNet)}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 block truncate">
                      +{formatCurrency(folderAccountStats.sahilIn)} / -{formatCurrency(folderAccountStats.sahilOut)}
                    </span>
                  </div>
                </div>

                {/* Rizwan Box */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-blue-50/60 border-2 border-blue-300 flex items-center justify-between min-w-0">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-blue-900 block truncate">
                      <span className="sm:hidden">🔵 Rizwan Net</span>
                      <span className="hidden sm:inline">🔵 Rizwan Account (Is Folder me)</span>
                    </span>
                    <span className="text-sm sm:text-lg font-black font-mono tabular-nums text-zinc-950 block truncate">
                      {formatCurrency(folderAccountStats.rizwanNet)}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 block truncate">
                      +{formatCurrency(folderAccountStats.rizwanIn)} / -{formatCurrency(folderAccountStats.rizwanOut)}
                    </span>
                  </div>
                </div>

                {/* Net Folder Balance */}
                <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-zinc-950 text-white border-2 border-zinc-950 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 block">
                      💼 Folder Net Balance (In - Out)
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono tabular-nums text-emerald-400">
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
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setCashTab('cash_in')}
                  className={`py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-2xl border-2 font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 transition-all cursor-pointer ${
                    cashTab === 'cash_in'
                      ? 'bg-emerald-600 text-white border-emerald-800 shadow-sm'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:border-emerald-600'
                  }`}
                >
                  <span className="sm:hidden flex items-center gap-1 text-[11px]">
                    <ArrowDownLeft size={14} className="stroke-[3]" /> Cash In
                  </span>
                  <span className="sm:hidden font-mono tabular-nums text-xs">
                    {formatCurrency(folderAccountStats.totalCashIn)}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-2">
                    <ArrowDownLeft size={16} className="stroke-[3]" />
                    <span>🟢 Cash In — Customer Wise ({formatCurrency(folderAccountStats.totalCashIn)})</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCashTab('cash_out')}
                  className={`py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-2xl border-2 font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 transition-all cursor-pointer ${
                    cashTab === 'cash_out'
                      ? 'bg-rose-600 text-white border-rose-800 shadow-sm'
                      : 'bg-rose-50 text-rose-900 border-rose-300 hover:border-rose-600'
                  }`}
                >
                  <span className="sm:hidden flex items-center gap-1 text-[11px]">
                    <ArrowUpRight size={14} className="stroke-[3]" /> Cash Out
                  </span>
                  <span className="sm:hidden font-mono tabular-nums text-xs">
                    {formatCurrency(folderAccountStats.totalCashOut)}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-2">
                    <ArrowUpRight size={16} className="stroke-[3]" />
                    <span>🔴 Cash Out — Expenses ({formatCurrency(folderAccountStats.totalCashOut)})</span>
                  </span>
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

                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Expense Name (e.g. Hotel, Train, Bus, Food)"
                        value={expDescription}
                        onChange={(e) => setExpDescription(e.target.value)}
                        className="col-span-2 sm:col-span-4 bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-xs font-bold text-zinc-950 focus:outline-none"
                      />

                      <input
                        type="number"
                        required
                        min={1}
                        placeholder="₹ Amount"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="col-span-1 sm:col-span-2 bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-xs font-mono font-black text-rose-700 focus:outline-none"
                      />

                      <select
                        value={expWalletName}
                        onChange={(e) => setExpWalletName(e.target.value)}
                        className="col-span-1 sm:col-span-2 bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-2 text-xs font-black text-zinc-950 cursor-pointer focus:outline-none"
                      >
                        <option value="Rizwan (Tour)">🔵 Rizwan</option>
                        <option value="Sahil (Tour)">🟣 Sahil</option>
                        <option value="Bus (Tour)">🟠 Bus</option>
                      </select>

                      <select
                        value={expPaymentMode}
                        onChange={(e) => setExpPaymentMode(e.target.value as TourPaymentMode)}
                        className="col-span-1 sm:col-span-2 bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-2 text-xs font-black text-zinc-950 cursor-pointer focus:outline-none"
                      >
                        <option value="UPI">📱 UPI</option>
                        <option value="Cash">💵 Cash</option>
                        <option value="Online">🏦 Online</option>
                      </select>

                      <button
                        type="submit"
                        disabled={isSavingExpense}
                        className="col-span-1 sm:col-span-2 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs cursor-pointer"
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
              {/* MOBILE-ONLY COMPACT MANIFEST TOOLBAR (< sm) */}
              <div className="sm:hidden space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-zinc-950 flex items-center gap-1.5 min-w-0 truncate">
                    <Users className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
                    <span className="truncate">
                      Passengers ({bookings.length} · {totalPassengers} Pax)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
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
                        className="h-7 px-2.5 bg-white text-zinc-700 border border-zinc-300 rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        {bookings.every((bk) => expandedBookingIds[bk.id]) ? 'Collapse' : 'Expand All'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDeleteBatch}
                      title="Delete Folder"
                      className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Search + Primary Book CTA on ONE tight row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={manifestSearchQuery}
                      onChange={(e) => setManifestSearchQuery(e.target.value)}
                      placeholder="Search name, phone, ID..."
                      className="w-full h-10 pl-8 pr-7 bg-white border border-zinc-300 focus:border-zinc-900 rounded-xl text-xs font-semibold text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                    />
                    {manifestSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setManifestSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddBookingToBatch(batch.id)}
                    className="h-10 px-3.5 bg-zinc-950 active:bg-black text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Book</span>
                  </button>
                </div>

                {/* Single-line Horizontal Scroll Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => setClassFilter('ALL')}
                    className={`h-8 px-3 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      classFilter === 'ALL'
                        ? 'bg-zinc-950 text-white'
                        : 'bg-white text-zinc-700 border border-zinc-200'
                    }`}
                  >
                    All ({totalPassengers})
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassFilter('AC')}
                    className={`h-8 px-3 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                      classFilter === 'AC'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-blue-50 text-blue-900 border-blue-200'
                    }`}
                  >
                    AC ({acStats.acPax})
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassFilter('NON_AC')}
                    className={`h-8 px-3 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                      classFilter === 'NON_AC'
                        ? 'bg-amber-500 text-zinc-950 border-amber-600'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    Non-AC ({acStats.nonAcPax})
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassFilter('CANCELLED')}
                    className={`h-8 px-3 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                      classFilter === 'CANCELLED'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    Cancelled ({cancelledBookings.length})
                  </button>
                </div>
              </div>

              {/* DESKTOP MANIFEST TOOLBAR (sm+ ONLY — 100% UNCHANGED) */}
              <div className="hidden sm:block space-y-2.5">
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
                  {/* AC vs Non-AC vs Cancelled/Lost Filter Pills inside Tour Folder */}
                  <div className="flex items-center gap-1.5 flex-wrap bg-zinc-100 p-1 rounded-xl border border-zinc-300">
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
                    <button
                      type="button"
                      onClick={() => setClassFilter('CANCELLED')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${
                        classFilter === 'CANCELLED'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                          : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                      }`}
                    >
                      ❌ Cancelled / Lost ({cancelledBookings.length})
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
                    const isCancelled = b.bookingStatus === 'Cancelled';
                    const cancelInfo = b.cancellationDetails;
                    const ticketStatus = b.ticketStatus || 'PENDING';
                    const isTicketDone = !isCancelled && (ticketStatus === '1_WAY' || ticketStatus === '2_WAY');
                    const isMenuOpen = openMenuBookingId === b.id;

                    const handleToggleTicketStatus = (
                      e: React.MouseEvent,
                      target: '1_WAY' | '2_WAY'
                    ) => {
                      e.stopPropagation();
                      const next = ticketStatus === target ? 'PENDING' : target;
                      updateTourBookingTicketStatus(b.id, next).catch((err) =>
                        console.error('Failed to update ticket status:', err)
                      );
                    };

                    const renderThreeDotMenu = () => (
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuBookingId((prev) => (prev === b.id ? null : b.id));
                          }}
                          title="More Options (Share, Edit, Slip, Cancel / Refund, Delete)"
                          className={`w-8 h-8 sm:w-auto sm:h-auto sm:p-1.5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                            isMenuOpen
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-white sm:bg-zinc-100 hover:bg-zinc-200 text-zinc-700 sm:text-zinc-800 border-zinc-200 sm:border-zinc-300'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white rounded-2xl border-2 border-zinc-900 shadow-2xl py-1.5 text-xs font-bold text-zinc-900">
                            <button
                              type="button"
                              onClick={(e) => {
                                setOpenMenuBookingId(null);
                                handleWhatsAppShareBooking(e, b);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-emerald-50 text-emerald-800 flex items-center gap-2.5 cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4 shrink-0" />
                              <span>Share on WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuBookingId(null);
                                openEditTourBookingModal(b);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-zinc-100 text-zinc-900 flex items-center gap-2.5 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4 shrink-0" />
                              <span>Edit Booking</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuBookingId(null);
                                handleShareVoucher(b);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-zinc-100 text-zinc-900 flex items-center gap-2.5 cursor-pointer"
                            >
                              <Share2 className="w-4 h-4 shrink-0" />
                              <span>Voucher Slip</span>
                            </button>

                            <div className="my-1 border-t border-zinc-200" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuBookingId(null);
                                setCancelModalBooking(b);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-amber-50 text-amber-900 flex items-center gap-2.5 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                              <span>
                                {isCancelled ? 'Edit Refund & Loss' : 'Cancel Booking & Refund'}
                              </span>
                            </button>

                            {isCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuBookingId(null);
                                  handleQuickRestoreBooking(b);
                                }}
                                className="w-full px-3.5 py-2 text-left hover:bg-blue-50 text-blue-800 flex items-center gap-2.5 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4 shrink-0" />
                                <span>Restore Booking</span>
                              </button>
                            )}

                            <div className="my-1 border-t border-zinc-200" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuBookingId(null);
                                handleDeleteBooking(b.id, b.customerName);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                              <span>Delete Booking</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );

                    return (
                      <div
                        key={b.id}
                        className={`relative border-2 rounded-2xl transition-all ${
                          isMenuOpen ? 'z-30' : 'z-0'
                        } ${
                          isCancelled
                            ? 'bg-rose-50/85 border-rose-300'
                            : isTicketDone
                            ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                            : isFullPaid
                            ? 'bg-white border-emerald-500'
                            : isExpanded
                            ? 'bg-white border-zinc-900 shadow-sm'
                            : 'bg-white border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        {/* =========================================================
                            MOBILE-NATIVE COMPACT PASSENGER CARD (< sm ONLY)
                            3 crisp breathable rows — razor-sharp native mobile layout
                            ========================================================= */}
                        <div
                          onClick={() => toggleBookingExpand(b.id)}
                          className={`sm:hidden p-3.5 rounded-2xl space-y-2.5 cursor-pointer select-none transition-colors ${
                            isCancelled
                              ? 'active:bg-rose-100/50'
                              : isTicketDone
                              ? 'active:bg-emerald-100/60'
                              : 'active:bg-zinc-50'
                          }`}
                        >
                          {/* Row 1: Identity + Pax/Class + Matched 32x32 Expand & 3-Dot Controls */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  onClick={(e) => copyNameToClipboard(e, b.customerName)}
                                  className={`text-[15px] font-black leading-tight tracking-tight truncate ${
                                    isCancelled
                                      ? 'line-through text-rose-900/80'
                                      : copiedName === String(b.customerName || '').trim()
                                      ? 'text-emerald-600'
                                      : 'text-zinc-950'
                                  }`}
                                >
                                  {b.customerName}
                                </span>
                                {isCancelled && (
                                  <span className="text-[10px] font-black text-rose-700 uppercase shrink-0">
                                    Cancelled
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold mt-1 flex-wrap leading-none">
                                <span className="font-mono tabular-nums text-zinc-600">{b.customerPhone}</span>
                                <span className="text-zinc-300">·</span>
                                <span className="font-mono text-[10px] text-zinc-400">{b.bookingNumber}</span>
                                <span className="text-zinc-300">·</span>
                                <span className="font-black text-zinc-900">{b.membersCount} Pax</span>
                                <span className="text-zinc-300">·</span>
                                <span
                                  className={`font-black ${
                                    isNonAc ? 'text-amber-700' : 'text-blue-600'
                                  }`}
                                >
                                  {isNonAc ? 'Non-AC' : 'AC'}
                                </span>
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-1.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => toggleBookingExpand(b.id)}
                                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                                  isExpanded
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-zinc-700 border-zinc-200'
                                }`}
                              >
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
                              {renderThreeDotMenu()}
                            </div>
                          </div>

                          {/* Row 2: Financials Strip (3 Crisp Tabular Columns — Zero Wrapping) */}
                          {isCancelled && cancelInfo ? (
                            <div className="grid grid-cols-3 divide-x divide-rose-200/80 bg-white/90 rounded-xl border border-rose-200 py-2 px-1 text-center font-mono tabular-nums">
                              <div className="px-1 min-w-0">
                                <span className="text-[9px] font-sans font-bold tracking-wider text-zinc-400 uppercase block">Recd</span>
                                <strong className="text-[12px] font-black text-zinc-900 block whitespace-nowrap truncate">
                                  {formatCurrency(cancelInfo.receivedAmount)}
                                </strong>
                              </div>
                              <div className="px-1 min-w-0">
                                <span className="text-[9px] font-sans font-bold tracking-wider text-rose-500 uppercase block">Refund</span>
                                <strong className="text-[12px] font-black text-rose-600 block whitespace-nowrap truncate">
                                  {formatCurrency(cancelInfo.refundAmount)}
                                </strong>
                              </div>
                              <div className="px-1 min-w-0">
                                <span className="text-[9px] font-sans font-bold tracking-wider text-zinc-400 uppercase block">
                                  {Number(cancelInfo.netRetained || 0) < 0 ? 'Loss' : 'Retained'}
                                </span>
                                <strong
                                  className={`text-[12px] font-black block whitespace-nowrap truncate ${
                                    Number(cancelInfo.netRetained || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'
                                  }`}
                                >
                                  {formatCurrency(Math.abs(Number(cancelInfo.netRetained || 0)))}
                                </strong>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 divide-x divide-zinc-200/80 bg-zinc-50/90 rounded-xl border border-zinc-200/80 py-2 px-1 text-center font-mono tabular-nums">
                              <div className="px-1 min-w-0">
                                <span className="text-[9px] font-sans font-bold tracking-wider text-zinc-400 uppercase block">Total</span>
                                <strong className="text-[12.5px] font-black text-zinc-950 block whitespace-nowrap truncate mt-0.5">
                                  {formatCurrency(total)}
                                </strong>
                              </div>
                              <div className="px-1 min-w-0">
                                <span className="text-[9px] font-sans font-bold tracking-wider text-emerald-700/80 uppercase block">Received</span>
                                <strong className="text-[12.5px] font-black text-emerald-700 block whitespace-nowrap truncate mt-0.5">
                                  {formatCurrency(adv)}
                                </strong>
                              </div>
                              <div className="px-1 min-w-0">
                                <span className="text-[9px] font-sans font-bold tracking-wider text-zinc-400 uppercase block">
                                  {isFullPaid ? 'Status' : 'Baaki Due'}
                                </span>
                                <strong
                                  className={`text-[12.5px] font-black block whitespace-nowrap truncate mt-0.5 ${
                                    isFullPaid ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {isFullPaid ? 'Full Paid' : formatCurrency(due)}
                                </strong>
                              </div>
                            </div>
                          )}

                          {/* Row 3: Ticket Segmented Control + Primary Payment Action */}
                          <div
                            className="flex items-center justify-between gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!isCancelled ? (
                              <div className="inline-flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/90">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleTicketStatus(e, '1_WAY')}
                                  className={`h-7 px-2.5 rounded-md text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                                    ticketStatus === '1_WAY'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'text-zinc-600'
                                  }`}
                                >
                                  {ticketStatus === '1_WAY' ? '✓ 1 Way' : '1 Way'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleTicketStatus(e, '2_WAY')}
                                  className={`h-7 px-2.5 rounded-md text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                                    ticketStatus === '2_WAY'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'text-zinc-600'
                                  }`}
                                >
                                  {ticketStatus === '2_WAY' ? '✓ 2 Way' : '2 Way'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-rose-700">
                                {cancelInfo?.cancelDate || 'Cancelled'}
                              </span>
                            )}

                            {isCancelled ? (
                              <button
                                type="button"
                                onClick={() => setCancelModalBooking(b)}
                                className="h-8 px-3 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[11px] font-black cursor-pointer whitespace-nowrap"
                              >
                                Refund Info
                              </button>
                            ) : !isFullPaid ? (
                              <button
                                type="button"
                                onClick={() => setPaymentModalBooking(b)}
                                className="h-8 px-3.5 bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Receive</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPaymentModalBooking(b)}
                                className="h-8 px-3 bg-emerald-50 active:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Paid · History</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* =========================================================
                            DESKTOP MAIN CLICKABLE ROW (sm+ ONLY — 100% UNCHANGED)
                            ========================================================= */}
                        <div
                          onClick={() => toggleBookingExpand(b.id)}
                          className={`hidden sm:flex p-4 rounded-2xl flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                            isCancelled
                              ? 'hover:bg-rose-100/50'
                              : isTicketDone
                              ? 'hover:bg-emerald-100/60'
                              : 'hover:bg-zinc-50/60'
                          }`}
                        >
                          {/* Left: Booking ID, Customer Name, Phone, PAX, AC/Non-AC Badge, Ticket Done & Quick Financial Summary */}
                          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white/90 rounded-lg text-zinc-800 border border-zinc-300">
                              {b.bookingNumber}
                            </span>

                            <span
                              onClick={(e) => copyNameToClipboard(e, b.customerName)}
                              onDoubleClick={(e) => copyNameToClipboard(e, b.customerName)}
                              title="Click or Double-click to copy name"
                              className={`text-sm sm:text-base font-black cursor-pointer select-none transition-colors ${
                                isCancelled
                                  ? 'line-through text-rose-900/80'
                                  : copiedName === String(b.customerName || '').trim()
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

                            {isCancelled && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-black shadow-2xs">
                                ❌ CANCELLED / LOST
                              </span>
                            )}

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

                            {/* 1 Way / 2 Way Ticket Done Quick Toggle (Only for active bookings) */}
                            {!isCancelled && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-white/90 p-0.5 rounded-lg border border-zinc-300 shadow-2xs"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleTicketStatus(e, '1_WAY')}
                                  title="Mark 1 Way Ticket Done (click again to clear)"
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                    ticketStatus === '1_WAY'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'text-zinc-600 hover:bg-zinc-100'
                                  }`}
                                >
                                  {ticketStatus === '1_WAY' ? '🎫 Ticket Done (1 Way)' : '🎫 1 Way'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleTicketStatus(e, '2_WAY')}
                                  title="Mark 2 Way Ticket Done (click again to clear)"
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                    ticketStatus === '2_WAY'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'text-zinc-600 hover:bg-zinc-100'
                                  }`}
                                >
                                  {ticketStatus === '2_WAY' ? '🎫 Ticket Done (2 Way)' : '🎫 2 Way'}
                                </button>
                              </div>
                            )}

                            {/* Inline Financial Summary OR Cancellation/Refund/Loss Strip */}
                            {isCancelled && cancelInfo ? (
                              <div className="flex items-center gap-2 flex-wrap text-xs font-mono pl-1">
                                <span className="text-zinc-700 font-bold">
                                  Recd: {formatCurrency(cancelInfo.receivedAmount)}
                                </span>
                                <span className="text-rose-700 font-black">
                                  • Refund: {formatCurrency(cancelInfo.refundAmount)}
                                  {cancelInfo.refundAmount > 0 && cancelInfo.refundWalletName
                                    ? ` (${cancelInfo.refundWalletName.replace(' (Tour)', '')}${
                                        cancelInfo.refundPaymentMode
                                          ? ` • ${cancelInfo.refundPaymentMode}`
                                          : ''
                                      })`
                                    : ''}
                                </span>
                                {Number(cancelInfo.ticketOrHotelLoss || 0) > 0 && (
                                  <span className="text-rose-800 font-black bg-rose-200/70 px-1.5 py-0.5 rounded">
                                    Loss: {formatCurrency(Number(cancelInfo.ticketOrHotelLoss || 0))}
                                  </span>
                                )}
                                <span
                                  className={`font-black px-1.5 py-0.5 rounded ${
                                    Number(cancelInfo.netRetained || 0) < 0
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-emerald-100 text-emerald-900'
                                  }`}
                                >
                                  {Number(cancelInfo.netRetained || 0) < 0
                                    ? `Net Loss: -${formatCurrency(Math.abs(Number(cancelInfo.netRetained || 0)))}`
                                    : `Retained: ${formatCurrency(Number(cancelInfo.netRetained || 0))}`}
                                </span>
                              </div>
                            ) : (
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
                            )}
                          </div>

                          {/* Desktop Right: Payment Badge + Receive/History + Expand Chevron + 3-Dot Menu */}
                          <div
                            className="hidden lg:flex items-center justify-end gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isCancelled ? (
                              <button
                                type="button"
                                onClick={() => setCancelModalBooking(b)}
                                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-lg text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Refund Details
                              </button>
                            ) : (
                              <>
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
                              </>
                            )}

                            {/* Expand / Collapse Chevron */}
                            <button
                              type="button"
                              onClick={() => toggleBookingExpand(b.id)}
                              title={isExpanded ? 'Hide Details' : 'Show Members & Other Details'}
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 transition-colors cursor-pointer ml-0.5"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            {/* 3-Dot Action Menu behind Expand Icon */}
                            {renderThreeDotMenu()}
                          </div>

                          {/* Tablet Action Bar (sm..lg) */}
                          <div
                            className="lg:hidden flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isCancelled ? (
                              <button
                                type="button"
                                onClick={() => setCancelModalBooking(b)}
                                className="px-2 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[10px] font-black cursor-pointer"
                              >
                                Refund Info
                              </button>
                            ) : !isFullPaid ? (
                              <button
                                type="button"
                                onClick={() => setPaymentModalBooking(b)}
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
                              onClick={() => toggleBookingExpand(b.id)}
                              className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-300 cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                            {renderThreeDotMenu()}
                          </div>
                        </div>

                        {/* Expandable Lower Details */}
                        {isExpanded && (
                          <>
                            {/* =========================================================
                                MOBILE-ONLY EXPANDED DRAWER (< sm)
                                Clean divider list, crisp non-wrapping WhatsApp chip, zero redundant broken totals
                                ========================================================= */}
                            <div className="sm:hidden px-3.5 pb-3.5 pt-3 border-t border-zinc-200/80 bg-zinc-50/80 rounded-b-2xl space-y-2.5">
                              {/* Cancellation Summary (Mobile Compact) */}
                              {isCancelled && cancelInfo && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-black text-rose-900 flex items-center gap-1">
                                      <XCircle size={13} className="text-rose-600 shrink-0" />
                                      Cancelled · {cancelInfo.cancelDate}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-800 truncate">
                                      {cancelInfo.policySlab}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono tabular-nums">
                                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-rose-100 flex items-center justify-between">
                                      <span className="font-sans text-[10px] text-zinc-500">Charge</span>
                                      <strong className="text-amber-800">{formatCurrency(cancelInfo.cancellationCharge)}</strong>
                                    </div>
                                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-rose-100 flex items-center justify-between">
                                      <span className="font-sans text-[10px] text-rose-600">Loss</span>
                                      <strong className="text-rose-700">{formatCurrency(Number(cancelInfo.ticketOrHotelLoss || 0))}</strong>
                                    </div>
                                  </div>
                                  <div className="text-[11px] text-rose-900 font-semibold leading-snug">
                                    Refund from:{' '}
                                    <strong>
                                      {cancelInfo.refundAmount > 0 && cancelInfo.refundWalletName
                                        ? `${cancelInfo.refundWalletName.replace(' (Tour)', '')} (${cancelInfo.refundPaymentMode || 'UPI'})`
                                        : 'No Refund (₹0)'}
                                    </strong>
                                    {cancelInfo.reason ? ` · ${cancelInfo.reason}` : ''}
                                  </div>
                                </div>
                              )}

                              {/* Header Row: Members Meta + Crisp WhatsApp Chip (Never Crushes or Wraps!) */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="text-[11px] font-extrabold text-zinc-700 block truncate">
                                    Members ({b.membersCount}) · {b.travelClass}
                                    {b.city ? ` · ${b.city}` : ''}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleWhatsAppShareBooking(e, b)}
                                  className="h-7 px-2.5 rounded-lg bg-emerald-50 active:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-black flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
                                >
                                  <MessageCircle size={12} className="shrink-0" />
                                  <span>WhatsApp</span>
                                </button>
                              </div>

                              {/* Clean Single-Container Member List (No Double Nested Boxes!) */}
                              <div className="bg-white rounded-xl border border-zinc-200/90 divide-y divide-zinc-100 overflow-hidden">
                                {b.members.map((m, mi) => {
                                  const isMemberCopied =
                                    copiedName === String(m.name || '').trim();
                                  const genderShort =
                                    String(m.gender || '').toLowerCase() === 'female'
                                      ? 'F'
                                      : String(m.gender || '').toLowerCase() === 'male'
                                      ? 'M'
                                      : m.gender;
                                  return (
                                    <div
                                      key={mi}
                                      onClick={(e) => copyNameToClipboard(e, m.name)}
                                      className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors ${
                                        isMemberCopied
                                          ? 'bg-emerald-50'
                                          : 'active:bg-zinc-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="w-5 h-5 rounded-md bg-zinc-100 text-zinc-500 text-[10px] font-black font-mono flex items-center justify-center shrink-0">
                                          {mi + 1}
                                        </span>
                                        <span
                                          className={`text-[13px] font-bold truncate ${
                                            isMemberCopied ? 'text-emerald-700' : 'text-zinc-950'
                                          }`}
                                        >
                                          {m.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-zinc-500 shrink-0 whitespace-nowrap">
                                        {genderShort && (
                                          <span className="font-sans font-bold text-zinc-400">
                                            {genderShort}
                                          </span>
                                        )}
                                        <span className="text-zinc-300">·</span>
                                        <span className="font-semibold text-zinc-700">
                                          {m.age ? `${m.age}y` : 'Adult'}
                                        </span>
                                        {m.seatBerthPreference &&
                                          m.seatBerthPreference !== 'No Preference' && (
                                            <>
                                              <span className="text-zinc-300">·</span>
                                              <span className="font-sans font-bold text-blue-700">
                                                {m.seatBerthPreference}
                                              </span>
                                            </>
                                          )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {b.specialNotes && (
                                <div className="px-3 py-2 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-900 font-semibold leading-snug">
                                  Note: {b.specialNotes}
                                </div>
                              )}

                              {/* Installment Breakdown (only if multiple installments) */}
                              {instList.length > 1 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {instList.map((inst, iIdx) => (
                                    <span
                                      key={inst.id || iIdx}
                                      className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-900 font-mono tabular-nums font-bold text-[10px] whitespace-nowrap"
                                    >
                                      #{iIdx + 1} {formatCurrency(inst.amount)} ·{' '}
                                      {(inst.walletName || 'Rizwan').replace(' (Tour)', '')} ({inst.paymentMode})
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Clean Footer: Account + Quick Slip/Edit Actions (No Redundant Broken Totals!) */}
                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <div className="text-[11px] text-zinc-500 font-semibold truncate min-w-0">
                                  <span className="font-bold text-zinc-900">
                                    {(b.walletName || 'Rizwan (Tour)').replace(' (Tour)', '')}
                                  </span>
                                  <span className="mx-1 text-zinc-300">·</span>
                                  <span className="font-bold text-zinc-700">{b.paymentMode}</span>
                                </div>
                                <div
                                  className="flex items-center gap-1.5 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleShareVoucher(b)}
                                    className="h-7 px-2.5 rounded-lg bg-white active:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  >
                                    <Share2 size={11} />
                                    <span>Slip</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditTourBookingModal(b)}
                                    className="h-7 px-2.5 rounded-lg bg-white active:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  >
                                    <Edit2 size={11} />
                                    <span>Edit</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* =========================================================
                                DESKTOP EXPANDED DRAWER (sm+ ONLY — 100% UNCHANGED)
                                ========================================================= */}
                            <div className="hidden sm:block px-3 sm:px-4 pb-4 pt-2 border-t border-zinc-200 bg-zinc-50/70 rounded-b-2xl space-y-3">
                              {/* Cancellation & Refund Policy Record Card if Cancelled */}
                              {isCancelled && cancelInfo && (
                                <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="text-xs font-black text-rose-900 uppercase flex items-center gap-1.5">
                                      <XCircle size={14} className="text-rose-600" />
                                      Cancellation &amp; Refund Summary ({cancelInfo.cancelDate})
                                    </span>
                                    <span className="text-[11px] font-black px-2 py-0.5 rounded bg-white border border-rose-300 text-rose-800">
                                      📋 Policy: {cancelInfo.policySlab}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                                    <div className="bg-white p-2 rounded-lg border border-rose-200">
                                      <span className="text-[9px] font-sans font-bold text-zinc-500 uppercase block">Received</span>
                                      <strong className="text-zinc-950">{formatCurrency(cancelInfo.receivedAmount)}</strong>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-rose-200">
                                      <span className="text-[9px] font-sans font-bold text-zinc-500 uppercase block">Policy Charge</span>
                                      <strong className="text-amber-800">{formatCurrency(cancelInfo.cancellationCharge)}</strong>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-rose-200">
                                      <span className="text-[9px] font-sans font-bold text-rose-700 uppercase block">Refund Given</span>
                                      <strong className="text-rose-700">{formatCurrency(cancelInfo.refundAmount)}</strong>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-rose-200">
                                      <span className="text-[9px] font-sans font-bold text-rose-700 uppercase block">Ticket/Hotel Loss</span>
                                      <strong className="text-rose-700">
                                        {formatCurrency(Number(cancelInfo.ticketOrHotelLoss || 0))}
                                      </strong>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-rose-200">
                                      <span className="text-[9px] font-sans font-bold text-zinc-500 uppercase block">
                                        {Number(cancelInfo.netRetained || 0) < 0 ? 'Net Loss' : 'Net Retained'}
                                      </span>
                                      <strong
                                        className={
                                          Number(cancelInfo.netRetained || 0) < 0
                                            ? 'text-rose-600'
                                            : 'text-emerald-700'
                                        }
                                      >
                                        {Number(cancelInfo.netRetained || 0) < 0
                                          ? `-${formatCurrency(Math.abs(Number(cancelInfo.netRetained || 0)))}`
                                          : formatCurrency(Number(cancelInfo.netRetained || 0))}
                                      </strong>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-bold text-rose-900">
                                    <span>
                                      💳 Refund Paid From:{' '}
                                      <strong>
                                        {cancelInfo.refundAmount > 0 && cancelInfo.refundWalletName
                                          ? `${cancelInfo.refundWalletName.replace(' (Tour)', '')} (${cancelInfo.refundPaymentMode || 'UPI'})`
                                          : 'No Refund Outflow (₹0)'}
                                      </strong>
                                    </span>
                                    {cancelInfo.reason && (
                                      <span>📝 Reason: {cancelInfo.reason}</span>
                                    )}
                                  </div>
                                </div>
                              )}
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
                          </>
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

      <CancelTourBookingModal
        isOpen={Boolean(cancelModalBooking)}
        onClose={() => setCancelModalBooking(null)}
        booking={cancelModalBooking}
      />

      <TourPDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        initialBatchId={batch.id}
      />

      <TourWhatsAppShareModal
        isOpen={Boolean(whatsappModalBooking)}
        onClose={() => setWhatsappModalBooking(null)}
        booking={whatsappModalBooking}
        batchTitle={batch.title}
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
