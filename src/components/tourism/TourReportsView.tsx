import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Luggage,
  Download,
  ChevronDown,
  ChevronUp,
  Receipt,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Wallet,
  FileText,
  Users,
  Car,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  TourBatch,
  TourBooking,
  TourExpense,
  TourExpenseCategory,
  TourPaymentMode,
} from '../../types';
import { addTourExpense } from '../../services/db';
import { isPrivateTourBooking } from './TourCommissionView';
import {
  extractBookingPayments,
  matchesPrivateTourExpense,
} from '../../utils/tourWalletLedger';
import { ReceiveTourPaymentModal } from './ReceiveTourPaymentModal';

type ReportScope = 'all' | 'group' | 'private';

interface UnifiedReportRow {
  key: string;
  type: 'group' | 'private';
  title: string;
  subtitle: string;
  departureDate: string;
  paxLabel: string;
  totalPax: number;
  totalRevenue: number;
  totalAdvance: number;
  totalPending: number;
  totalExpenses: number;
  netProfit: number;
  cashProfit: number;
  profitMargin: number;
  batch?: TourBatch;
  booking?: TourBooking;
  bookings: TourBooking[];
  expenses: TourExpense[];
  sahilIn: number;
  sahilOut: number;
  rizwanIn: number;
  rizwanOut: number;
}

const REPORT_EXPENSE_CATEGORIES: TourExpenseCategory[] = [
  'Hotel & Stay',
  'Train & Transport',
  'Food & Meals',
  'Sightseeing & Entry',
  'Guide & Staff',
  'Mustak Commission',
  'Customer Refund',
  'Other',
];

export const TourReportsView: React.FC = () => {
  const {
    tourBatches,
    tourBookings,
    tourExpenses,
    tourWallets,
    formatCurrency,
    formatDate,
    openEditTourExpenseModal,
    deleteTourExpenseById,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
  } = useData();
  const { user, currentUserProfile } = useAuth();

  const [reportScope, setReportScope] = useState<ReportScope>('all');
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [paymentModalBooking, setPaymentModalBooking] = useState<TourBooking | null>(null);

  // Inline + Add Expense state inside expanded hisaab drawer
  const [addingForKey, setAddingForKey] = useState<string | null>(null);
  const [expCategory, setExpCategory] = useState<TourExpenseCategory>('Hotel & Stay');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expWalletName, setExpWalletName] = useState<string>(
    () => tourWallets.find((w) => w.name.toLowerCase().includes('rizwan'))?.name || tourWallets[0]?.name || 'Rizwan (Tour)'
  );
  const [expPaymentMode, setExpPaymentMode] = useState<TourPaymentMode>('UPI');
  const [expDate, setExpDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isSavingExp, setIsSavingExp] = useState(false);
  const [expError, setExpError] = useState('');
  const [confirmDeleteExpId, setConfirmDeleteExpId] = useState<string | null>(null);

  const walletOptions = useMemo(() => {
    if (tourWallets.length > 0) return tourWallets;
    return [
      { id: 'sahil', name: 'Sahil (Tour)' },
      { id: 'rizwan', name: 'Rizwan (Tour)' },
      { id: 'bus', name: 'Bus (Tour)' },
    ];
  }, [tourWallets]);

  const computePartnerBreakdown = (bookings: TourBooking[], expenses: TourExpense[]) => {
    let sahilIn = 0;
    let rizwanIn = 0;
    let sahilOut = 0;
    let rizwanOut = 0;

    bookings.forEach((b) => {
      extractBookingPayments(b).forEach((p) => {
        const w = (p.walletName || '').toLowerCase();
        if (w.includes('sahil')) sahilIn += Number(p.amount || 0);
        else if (w.includes('rizwan')) rizwanIn += Number(p.amount || 0);
      });
    });

    expenses.forEach((e) => {
      const w = (e.walletName || '').toLowerCase();
      if (w.includes('sahil')) sahilOut += Number(e.amount || 0);
      else if (w.includes('rizwan')) rizwanOut += Number(e.amount || 0);
    });

    return { sahilIn, sahilOut, rizwanIn, rizwanOut };
  };

  // Build Group Tour rows (excluding cancelled bookings)
  const groupRows: UnifiedReportRow[] = useMemo(() => {
    return tourBatches.map((batch) => {
      const activeBookings = tourBookings.filter(
        (b) => b.tourBatchId === batch.id && b.bookingStatus !== 'Cancelled'
      );
      const linkedExpenses = tourExpenses
        .filter((e) => e.tourBatchId === batch.id)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const totalPax = activeBookings.reduce((sum, b) => sum + Number(b.membersCount || 1), 0);
      const totalRevenue = activeBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
      const totalAdvance = activeBookings.reduce((sum, b) => sum + Number(b.advancePaid || 0), 0);
      const totalPending = activeBookings.reduce(
        (sum, b) => sum + Math.max(0, Number(b.balanceDue ?? b.pendingAmount ?? (Number(b.totalAmount || 0) - Number(b.advancePaid || 0)))),
        0
      );
      const totalExpenses = linkedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const cashProfit = totalAdvance - totalExpenses;
      const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
      const partners = computePartnerBreakdown(activeBookings, linkedExpenses);

      return {
        key: `group:${batch.id}`,
        type: 'group',
        title: batch.title,
        subtitle: `${batch.destination} • ${batch.travelMode} • ${activeBookings.length} ${
          activeBookings.length === 1 ? 'Booking' : 'Bookings'
        }`,
        departureDate: batch.departureDate || '',
        paxLabel: `${totalPax} / ${batch.totalSeats}`,
        totalPax,
        totalRevenue,
        totalAdvance,
        totalPending,
        totalExpenses,
        netProfit,
        cashProfit,
        profitMargin,
        batch,
        bookings: activeBookings,
        expenses: linkedExpenses,
        ...partners,
      };
    });
  }, [tourBatches, tourBookings, tourExpenses]);

  // Build Private Package rows (excluding cancelled bookings)
  const privateRows: UnifiedReportRow[] = useMemo(() => {
    const standalonePrivateBookings = tourBookings.filter(
      (b) => b.bookingStatus !== 'Cancelled' && isPrivateTourBooking(b, tourBatches)
    );

    return standalonePrivateBookings.map((booking) => {
      const linkedExpenses = tourExpenses
        .filter((e) => matchesPrivateTourExpense(e, booking))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const totalPax = Number(booking.membersCount || 1);
      const totalRevenue = Number(booking.totalAmount || 0);
      const totalAdvance = Number(booking.advancePaid || 0);
      const totalPending = Math.max(
        0,
        Number(booking.balanceDue ?? booking.pendingAmount ?? (totalRevenue - totalAdvance))
      );
      const totalExpenses = linkedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const cashProfit = totalAdvance - totalExpenses;
      const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
      const partners = computePartnerBreakdown([booking], linkedExpenses);

      return {
        key: `private:${booking.id}`,
        type: 'private',
        title: booking.customerName || 'Private Guest',
        subtitle: `${booking.destination || 'Custom Tour'}${
          booking.bookingNumber ? ` • ${booking.bookingNumber}` : ''
        }${booking.customerPhone ? ` • ${booking.customerPhone}` : ''}`,
        departureDate: booking.tourDate || '',
        paxLabel: `${totalPax} Pax`,
        totalPax,
        totalRevenue,
        totalAdvance,
        totalPending,
        totalExpenses,
        netProfit,
        cashProfit,
        profitMargin,
        booking,
        bookings: [booking],
        expenses: linkedExpenses,
        ...partners,
      };
    });
  }, [tourBatches, tourBookings, tourExpenses]);

  const allRows = useMemo(() => {
    return [...groupRows, ...privateRows].sort((a, b) =>
      (b.departureDate || '').localeCompare(a.departureDate || '')
    );
  }, [groupRows, privateRows]);

  const visibleRows = useMemo(() => {
    if (reportScope === 'group') {
      return [...groupRows].sort((a, b) => (b.departureDate || '').localeCompare(a.departureDate || ''));
    }
    if (reportScope === 'private') {
      return [...privateRows].sort((a, b) => (b.departureDate || '').localeCompare(a.departureDate || ''));
    }
    return allRows;
  }, [reportScope, allRows, groupRows, privateRows]);

  // Dynamic KPI totals matching the active toggle
  const totalTourRevenue = visibleRows.reduce((sum, r) => sum + r.totalRevenue, 0);
  const totalTourAdvance = visibleRows.reduce((sum, r) => sum + r.totalAdvance, 0);
  const totalTourPending = visibleRows.reduce((sum, r) => sum + r.totalPending, 0);
  const totalTourExpenses = visibleRows.reduce((sum, r) => sum + r.totalExpenses, 0);
  const totalNetProfit = totalTourRevenue - totalTourExpenses;

  const handleToggleRow = (key: string) => {
    setExpandedRowKey((prev) => (prev === key ? null : key));
    setConfirmDeleteExpId(null);
    setExpError('');
  };

  const handleOpenInlineAddExpense = (rowKey: string) => {
    if (addingForKey === rowKey) {
      setAddingForKey(null);
      setExpError('');
      return;
    }
    setAddingForKey(rowKey);
    setExpCategory('Hotel & Stay');
    setExpDescription('');
    setExpAmount('');
    setExpPaymentMode('UPI');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpError('');
    const defaultW =
      tourWallets.find((w) => w.name.toLowerCase().includes('rizwan'))?.name ||
      tourWallets[0]?.name ||
      'Rizwan (Tour)';
    setExpWalletName(defaultW);
  };

  const handleSaveRowExpense = async (e: React.FormEvent, row: UnifiedReportRow) => {
    e.preventDefault();
    setExpError('');
    const amt = Number(expAmount);
    if (!amt || amt <= 0) {
      setExpError('Enter a valid expense amount greater than ₹0.');
      return;
    }

    const matchedWallet = tourWallets.find(
      (w) => w.name.toLowerCase().trim() === expWalletName.toLowerCase().trim()
    );
    const cleanDate = expDate || new Date().toISOString().split('T')[0];
    const userEmail = currentUserProfile?.email || user?.email || 'admin@sanzari.com';

    const payload =
      row.type === 'group' && row.batch
        ? {
            tourBatchId: row.batch.id,
            tourBookingId: '',
            tourTitle: `📂 ${row.batch.departureDate} • ${row.batch.title}`,
            destination: row.batch.destination || '',
            category: expCategory,
            amount: amt,
            walletId: matchedWallet?.id || '',
            walletName: expWalletName,
            paymentMode: expPaymentMode,
            paidToPerson: expCategory === 'Mustak Commission' ? 'Mustak' : undefined,
            date: cleanDate,
            monthKey: cleanDate.slice(0, 7),
            description: expDescription.trim() || `${expCategory} • ${row.batch.title}`,
            notes: `${expPaymentMode} • ${expWalletName}`,
          }
        : {
            tourBatchId: row.booking ? `PRIVATE_${row.booking.id}` : '',
            tourBookingId: row.booking?.id || '',
            tourTitle: row.booking
              ? `🚗 Private (${row.booking.tourDate}) • ${row.booking.customerName}`
              : row.title,
            destination: row.booking?.destination || '',
            category: expCategory,
            amount: amt,
            walletId: matchedWallet?.id || '',
            walletName: expWalletName,
            paymentMode: expPaymentMode,
            paidToPerson: expCategory === 'Mustak Commission' ? 'Mustak' : undefined,
            date: cleanDate,
            monthKey: cleanDate.slice(0, 7),
            description: expDescription.trim() || `${expCategory} • ${row.title}`,
            notes: `${expPaymentMode} • ${expWalletName}`,
          };

    setIsSavingExp(true);
    try {
      await addTourExpense(payload, userEmail);
      setExpAmount('');
      setExpDescription('');
      setAddingForKey(null);
    } catch (err: any) {
      console.error('Failed to add report tour expense:', err);
      setExpError(err?.message || 'Failed to save expense.');
    } finally {
      setIsSavingExp(false);
    }
  };

  const handleOpenVoucherSlip = (booking: TourBooking) => {
    setTourReceiptBooking(booking);
    setIsTourReceiptOpen(true);
  };

  const scopeLabel =
    reportScope === 'group'
      ? 'Group Tours only'
      : reportScope === 'private'
      ? 'Private Packages only'
      : 'All Group & Private Tours';

  return (
    <div className="space-y-6 pb-36 sm:pb-32">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-800 via-teal-800 to-sky-900 p-5 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
            <TrendingUp className="w-4 h-4" /> Tour Financials &amp; P&amp;L
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
            Tour Profit &amp; Loss Reports
          </h2>
          <p className="text-xs text-emerald-100 max-w-xl mt-1">
            Complete hisaab for both Group Tour Batches and Private Packages — click any tour row to inspect payments, expenses, partner balances, or add an expense.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-white text-emerald-900 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* KPI Strip (Dynamic per Active Toggle) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
            Total Billing
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-zinc-950 font-mono tabular-nums block mt-1">
            {formatCurrency(totalTourRevenue)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">{scopeLabel}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Received (Jama)
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-emerald-700 font-mono tabular-nums block mt-1">
            {formatCurrency(totalTourAdvance)}
          </span>
          <span className="text-[11px] text-emerald-700/80 block mt-0.5">Cash, UPI &amp; Online</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Pending Due
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-amber-800 font-mono tabular-nums block mt-1">
            {formatCurrency(totalTourPending)}
          </span>
          <span className="text-[11px] text-amber-700/80 block mt-0.5">Remaining collection</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            Total Expenses
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-rose-700 font-mono tabular-nums block mt-1">
            {formatCurrency(totalTourExpenses)}
          </span>
          <span className="text-[11px] text-rose-700/80 block mt-0.5">Hotel, tickets &amp; cab</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-2xl border border-zinc-900 bg-zinc-950 text-white">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Net Tour Profit
          </span>
          <span
            className={`text-lg sm:text-xl font-extrabold font-mono tabular-nums block mt-1 ${
              totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(totalNetProfit)}
          </span>
          <span className="text-[11px] text-zinc-400 block mt-0.5">Billing minus expenses</span>
        </div>
      </div>

      {/* Profitability Breakdown Table with 3-Way Segmented Toggle */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <Luggage className="w-5 h-5 text-blue-600" />
              <span>Tour Batch Profitability Breakdown</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Click any tour row below to open its full Cash In / Cash Out hisaab &amp; add expenses.
            </p>
          </div>

          {/* 3-Toggle Segmented Switch: All | Group Tours | Private Packages */}
          <div className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex items-center p-1 rounded-xl bg-zinc-100 border border-zinc-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setReportScope('all');
                setExpandedRowKey(null);
              }}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer justify-center flex items-center ${
                reportScope === 'all'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              All ({allRows.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setReportScope('group');
                setExpandedRowKey(null);
              }}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer justify-center flex items-center gap-1 sm:gap-1.5 ${
                reportScope === 'group'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Group ({groupRows.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setReportScope('private');
                setExpandedRowKey(null);
              }}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer justify-center flex items-center gap-1 sm:gap-1.5 ${
                reportScope === 'private'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Car className="w-3.5 h-3.5 shrink-0" />
              <span>Private ({privateRows.length})</span>
            </button>
          </div>
        </div>

        {/* MOBILE-ONLY (< sm) PROFITABILITY CARD LIST (No cramped 9-column horizontal scroll!) */}
        <div className="sm:hidden divide-y divide-zinc-200">
          {visibleRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-medium">
              No tours found for this filter yet.
            </div>
          ) : (
            visibleRows.map((row) => {
              const isExpanded = expandedRowKey === row.key;
              const isAddingHere = addingForKey === row.key;

              return (
                <div key={`m-${row.key}`} className={isExpanded ? 'bg-zinc-50/70' : 'bg-white'}>
                  <div
                    onClick={() => handleToggleRow(row.key)}
                    className="p-3.5 cursor-pointer active:bg-zinc-100/80 transition-colors space-y-2.5"
                  >
                    {/* Top Row: Title + Type + Net Profit & Margin */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-zinc-950 text-[13px] leading-snug truncate">
                            {row.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                              row.type === 'private' ? 'text-indigo-700' : 'text-teal-700'
                            }`}
                          >
                            {row.type === 'private' ? '• Private' : '• Group'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                          {row.departureDate ? formatDate(row.departureDate) : '—'} • {row.paxLabel} • {row.subtitle}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right font-mono tabular-nums">
                          <div
                            className={`text-sm font-black leading-tight ${
                              row.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(row.netProfit)}
                          </div>
                          <div
                            className={`text-[10px] font-extrabold ${
                              row.profitMargin >= 25
                                ? 'text-emerald-700'
                                : row.profitMargin > 0
                                ? 'text-blue-700'
                                : 'text-rose-600'
                            }`}
                          >
                            {row.profitMargin}% margin
                          </div>
                        </div>
                        <span className="text-zinc-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-900" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {/* Crisp 4-Column Financial Strip */}
                    <div className="grid grid-cols-4 gap-1.5 bg-zinc-50 border border-zinc-200/80 rounded-xl p-2 text-center font-mono tabular-nums">
                      <div>
                        <span className="text-[9px] font-sans font-bold uppercase text-zinc-500 block">
                          Billing
                        </span>
                        <span className="text-[11px] font-extrabold text-zinc-900 block truncate">
                          {formatCurrency(row.totalRevenue)}
                        </span>
                      </div>
                      <div className="border-l border-zinc-200/80">
                        <span className="text-[9px] font-sans font-bold uppercase text-emerald-700 block">
                          Recd
                        </span>
                        <span className="text-[11px] font-extrabold text-emerald-700 block truncate">
                          {formatCurrency(row.totalAdvance)}
                        </span>
                      </div>
                      <div className="border-l border-zinc-200/80">
                        <span className="text-[9px] font-sans font-bold uppercase text-amber-700 block">
                          Baaki
                        </span>
                        <span className="text-[11px] font-extrabold text-amber-700 block truncate">
                          {formatCurrency(row.totalPending)}
                        </span>
                      </div>
                      <div className="border-l border-zinc-200/80">
                        <span className="text-[9px] font-sans font-bold uppercase text-rose-700 block">
                          Expense
                        </span>
                        <span className="text-[11px] font-extrabold text-rose-700 block truncate">
                          {formatCurrency(row.totalExpenses)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Expanded Detailed Hisaab Drawer */}
                  {isExpanded && (
                    <div className="px-3.5 pb-4 pt-1 space-y-3 border-t border-zinc-200/80 bg-zinc-50/90">
                      {/* Partner Account & Profit Summary */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-xl border border-zinc-200 p-2.5">
                          <div className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-blue-600 shrink-0" /> Sahil
                          </div>
                          <div className="text-xs font-mono tabular-nums font-black text-zinc-900 mt-0.5">
                            Net {formatCurrency(row.sahilIn - row.sahilOut)}
                          </div>
                          <div className="text-[10px] font-mono tabular-nums flex items-center justify-between mt-1">
                            <span className="text-emerald-700 font-bold">+{formatCurrency(row.sahilIn)}</span>
                            <span className="text-rose-700 font-bold">-{formatCurrency(row.sahilOut)}</span>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl border border-zinc-200 p-2.5">
                          <div className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-emerald-600 shrink-0" /> Rizwan
                          </div>
                          <div className="text-xs font-mono tabular-nums font-black text-zinc-900 mt-0.5">
                            Net {formatCurrency(row.rizwanIn - row.rizwanOut)}
                          </div>
                          <div className="text-[10px] font-mono tabular-nums flex items-center justify-between mt-1">
                            <span className="text-emerald-700 font-bold">+{formatCurrency(row.rizwanIn)}</span>
                            <span className="text-rose-700 font-bold">-{formatCurrency(row.rizwanOut)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Cash In / Bookings or Private Payments */}
                      <div className="bg-white rounded-xl border border-zinc-200 p-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                          <div className="min-w-0">
                            <span className="text-[11px] font-black text-zinc-950 uppercase tracking-wider block">
                              {row.type === 'group'
                                ? `Bookings (${row.bookings.length})`
                                : 'Payment History'}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              Recd {formatCurrency(row.totalAdvance)} / {formatCurrency(row.totalRevenue)}
                            </span>
                          </div>
                          {row.type === 'private' && row.booking && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentModalBooking(row.booking!);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Payment
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenVoucherSlip(row.booking!);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3 h-3" /> Slip
                              </button>
                            </div>
                          )}
                        </div>

                        {row.type === 'group' ? (
                          row.bookings.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-2 text-center">No active bookings.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto">
                              {row.bookings.map((b) => (
                                <div
                                  key={`mb-${b.id}`}
                                  className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs text-zinc-950 truncate">{b.customerName}</div>
                                    <div className="text-[10px] text-zinc-500">
                                      {b.membersCount || 1} Pax • +{formatCurrency(b.advancePaid || 0)} / {formatCurrency(b.totalAmount || 0)}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPaymentModalBooking(b);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-800 font-bold text-[10px] shrink-0 cursor-pointer"
                                  >
                                    Payment
                                  </button>
                                </div>
                              ))}
                            </div>
                          )
                        ) : row.booking ? (
                          <div className="space-y-1.5 max-h-56 overflow-y-auto">
                            {extractBookingPayments(row.booking).length === 0 ? (
                              <p className="text-xs text-zinc-500 py-2 text-center">No payments received yet.</p>
                            ) : (
                              extractBookingPayments(row.booking).map((entry, idx) => (
                                <div
                                  key={`mp-${entry.id || idx}`}
                                  className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs text-zinc-950 truncate">
                                      {idx === 0 ? '1st Advance' : `Installment #${idx + 1}`} • {entry.walletName}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 truncate">
                                      {entry.date ? formatDate(entry.date) : ''} ({entry.paymentMode})
                                    </div>
                                  </div>
                                  <span className="font-mono tabular-nums font-black text-xs text-emerald-700 shrink-0">
                                    +{formatCurrency(entry.amount)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* Tour Expenses + Inline Add Expense */}
                      <div className="bg-white rounded-xl border border-zinc-200 p-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                          <div>
                            <span className="text-[11px] font-black text-zinc-950 uppercase tracking-wider flex items-center gap-1">
                              <Receipt className="w-3.5 h-3.5 text-rose-600" />
                              <span>Expenses ({row.expenses.length})</span>
                            </span>
                            <span className="text-[10px] font-mono tabular-nums font-bold text-rose-700 block">
                              Out: -{formatCurrency(row.totalExpenses)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInlineAddExpense(row.key);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] flex items-center gap-1 cursor-pointer ${
                              isAddingHere
                                ? 'bg-zinc-200 text-zinc-900'
                                : 'bg-zinc-950 text-white'
                            }`}
                          >
                            {isAddingHere ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>{isAddingHere ? 'Close' : 'Add Expense'}</span>
                          </button>
                        </div>

                        {isAddingHere && (
                          <form
                            onSubmit={(e) => handleSaveRowExpense(e, row)}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2"
                          >
                            {expError && (
                              <div className="px-2 py-1 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-bold">
                                {expError}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={expCategory}
                                onChange={(e) => setExpCategory(e.target.value as TourExpenseCategory)}
                                className="px-2 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-900"
                              >
                                {REPORT_EXPENSE_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                placeholder="Amount (₹)"
                                value={expAmount}
                                onChange={(e) => setExpAmount(e.target.value)}
                                className="px-2 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-mono font-black text-zinc-900"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="Description (Hotel, Cab, Tickets...)"
                              value={expDescription}
                              onChange={(e) => setExpDescription(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-semibold text-zinc-900"
                            />
                            <div className="grid grid-cols-3 gap-1.5">
                              <select
                                value={expWalletName}
                                onChange={(e) => setExpWalletName(e.target.value)}
                                className="px-1.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-[11px] font-bold text-zinc-900"
                              >
                                {walletOptions.map((w) => (
                                  <option key={w.id} value={w.name}>
                                    {w.name.replace(' (Tour)', '')}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={expPaymentMode}
                                onChange={(e) => setExpPaymentMode(e.target.value as TourPaymentMode)}
                                className="px-1.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-[11px] font-bold text-zinc-900"
                              >
                                <option value="UPI">UPI</option>
                                <option value="Cash">Cash</option>
                                <option value="Online">Online</option>
                              </select>
                              <input
                                type="date"
                                value={expDate}
                                onChange={(e) => setExpDate(e.target.value)}
                                className="px-1.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-[11px] font-bold text-zinc-900"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setAddingForKey(null)}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-700 font-bold text-[11px]"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingExp}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-black text-[11px] flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isSavingExp ? 'Saving...' : 'Save'}</span>
                              </button>
                            </div>
                          </form>
                        )}

                        {row.expenses.length === 0 ? (
                          <p className="text-xs text-zinc-500 py-2 text-center">No expenses recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-56 overflow-y-auto">
                            {row.expenses.map((exp) => (
                              <div
                                key={`me-${exp.id}`}
                                className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-zinc-950 truncate">
                                    {exp.description || exp.category}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 truncate">
                                    {exp.category} • {formatDate(exp.date)} • {(exp.walletName || 'Wallet').replace(' (Tour)', '')}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <span className="font-mono tabular-nums font-black text-xs text-rose-700">
                                    -{formatCurrency(exp.amount)}
                                  </span>
                                  {confirmDeleteExpId === exp.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await deleteTourExpenseById(exp.id);
                                          setConfirmDeleteExpId(null);
                                        }}
                                        className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[10px]"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteExpId(null)}
                                        className="px-1.5 py-0.5 rounded bg-white border border-zinc-300 text-zinc-700 font-bold text-[10px]"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openEditTourExpenseModal(exp)}
                                        className="p-1.5 rounded-md bg-white border border-zinc-300 text-zinc-700"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteExpId(exp.id)}
                                        className="p-1.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP (sm+) 9-COLUMN TABLE — 100% UNCHANGED */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200 uppercase text-[10px] tracking-wider">
                <th className="p-3">Tour / Customer</th>
                <th className="p-3 text-center">Date</th>
                <th className="p-3 text-center">Pax</th>
                <th className="p-3 text-right">Billing</th>
                <th className="p-3 text-right">Received</th>
                <th className="p-3 text-right">Pending</th>
                <th className="p-3 text-right">Expenses</th>
                <th className="p-3 text-right">Net Profit</th>
                <th className="p-3 text-center">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-500 font-medium">
                    No tours found for this filter yet.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const isExpanded = expandedRowKey === row.key;
                  const isAddingHere = addingForKey === row.key;

                  return (
                    <React.Fragment key={row.key}>
                      <tr
                        onClick={() => handleToggleRow(row.key)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-zinc-100/80' : 'hover:bg-zinc-50'
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 text-zinc-500 shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-zinc-900" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-zinc-950 text-sm">
                                  {row.title}
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wide ${
                                    row.type === 'private' ? 'text-indigo-700' : 'text-teal-700'
                                  }`}
                                >
                                  {row.type === 'private' ? '• Private' : '• Group'}
                                </span>
                              </div>
                              <span className="text-[11px] text-zinc-500 font-medium block mt-0.5">
                                {row.subtitle}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono tabular-nums text-zinc-700 whitespace-nowrap">
                          {row.departureDate ? formatDate(row.departureDate) : '—'}
                        </td>
                        <td className="p-3 text-center font-bold font-mono tabular-nums text-indigo-700 whitespace-nowrap">
                          {row.paxLabel}
                        </td>
                        <td className="p-3 text-right font-bold font-mono tabular-nums text-zinc-900 whitespace-nowrap">
                          {formatCurrency(row.totalRevenue)}
                        </td>
                        <td className="p-3 text-right font-bold font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                          {formatCurrency(row.totalAdvance)}
                        </td>
                        <td className="p-3 text-right font-bold font-mono tabular-nums text-amber-700 whitespace-nowrap">
                          {formatCurrency(row.totalPending)}
                        </td>
                        <td className="p-3 text-right font-bold font-mono tabular-nums text-rose-700 whitespace-nowrap">
                          {formatCurrency(row.totalExpenses)}
                        </td>
                        <td
                          className={`p-3 text-right font-extrabold font-mono tabular-nums text-sm whitespace-nowrap ${
                            row.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(row.netProfit)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`text-xs font-extrabold font-mono tabular-nums ${
                              row.profitMargin >= 25
                                ? 'text-emerald-700'
                                : row.profitMargin > 0
                                ? 'text-blue-700'
                                : 'text-rose-600'
                            }`}
                          >
                            {row.profitMargin}%
                          </span>
                        </td>
                      </tr>

                      {/* Click-to-Expand Detailed Hisaab Drawer */}
                      {isExpanded && (
                        <tr className="bg-zinc-50/90">
                          <td colSpan={9} className="p-4 sm:p-5 border-t border-zinc-200">
                            <div className="space-y-4">
                              {/* Partner Account & Profit Summary Strip */}
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                                <div className="bg-white rounded-xl border border-zinc-200 p-3">
                                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                    <span className="flex items-center gap-1">
                                      <Wallet className="w-3 h-3 text-blue-600" /> Sahil Account
                                    </span>
                                    <span className="font-mono tabular-nums text-zinc-900">
                                      Net {formatCurrency(row.sahilIn - row.sahilOut)}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums">
                                    <span className="text-emerald-700 font-bold">
                                      In +{formatCurrency(row.sahilIn)}
                                    </span>
                                    <span className="text-rose-700 font-bold">
                                      Out -{formatCurrency(row.sahilOut)}
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-white rounded-xl border border-zinc-200 p-3">
                                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                    <span className="flex items-center gap-1">
                                      <Wallet className="w-3 h-3 text-emerald-600" /> Rizwan Account
                                    </span>
                                    <span className="font-mono tabular-nums text-zinc-900">
                                      Net {formatCurrency(row.rizwanIn - row.rizwanOut)}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums">
                                    <span className="text-emerald-700 font-bold">
                                      In +{formatCurrency(row.rizwanIn)}
                                    </span>
                                    <span className="text-rose-700 font-bold">
                                      Out -{formatCurrency(row.rizwanOut)}
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-white rounded-xl border border-zinc-200 p-3">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                                    Cash Balance (Received − Exp)
                                  </span>
                                  <span
                                    className={`text-base font-black font-mono tabular-nums block mt-1 ${
                                      row.cashProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                    }`}
                                  >
                                    {row.cashProfit >= 0 ? '+' : ''}
                                    {formatCurrency(row.cashProfit)}
                                  </span>
                                </div>

                                <div className="bg-white rounded-xl border border-zinc-900 p-3">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                                    Final Net Profit (Billing − Exp)
                                  </span>
                                  <span
                                    className={`text-base font-black font-mono tabular-nums block mt-1 ${
                                      row.netProfit >= 0 ? 'text-zinc-950' : 'text-rose-600'
                                    }`}
                                  >
                                    {row.netProfit >= 0 ? '+' : ''}
                                    {formatCurrency(row.netProfit)}
                                  </span>
                                </div>
                              </div>

                              {/* 2-Column Detailed Breakdown: Left = Cash In / Customers, Right = Cash Out / Expenses */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* LEFT: CASH IN */}
                                <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
                                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                                    <div>
                                      <span className="text-xs font-black text-zinc-950 uppercase tracking-wider block">
                                        {row.type === 'group'
                                          ? `Bookings & Collections (${row.bookings.length})`
                                          : 'Payment History & Package Info'}
                                      </span>
                                      <span className="text-[11px] text-zinc-500">
                                        Received {formatCurrency(row.totalAdvance)} of{' '}
                                        {formatCurrency(row.totalRevenue)}
                                      </span>
                                    </div>

                                    {row.type === 'private' && row.booking && (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPaymentModalBooking(row.booking!);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                                        >
                                          Payment
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenVoucherSlip(row.booking!);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                        >
                                          <FileText className="w-3 h-3" /> Slip
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {row.type === 'group' ? (
                                    row.bookings.length === 0 ? (
                                      <p className="text-xs text-zinc-500 py-3 text-center">
                                        No active bookings in this batch.
                                      </p>
                                    ) : (
                                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {row.bookings.map((b) => {
                                          const due = Math.max(
                                            0,
                                            Number(
                                              b.balanceDue ??
                                                b.pendingAmount ??
                                                Number(b.totalAmount || 0) - Number(b.advancePaid || 0)
                                            )
                                          );
                                          return (
                                            <div
                                              key={b.id}
                                              className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2"
                                            >
                                              <div className="min-w-0">
                                                <div className="font-bold text-xs text-zinc-950 truncate">
                                                  {b.customerName}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 mt-0.5">
                                                  {b.membersCount || 1} Pax
                                                  {b.customerPhone ? ` • ${b.customerPhone}` : ''}
                                                  {due > 0
                                                    ? ` • Due ${formatCurrency(due)}`
                                                    : ' • Full Paid'}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <div className="text-right font-mono tabular-nums">
                                                  <div className="text-xs font-black text-emerald-700">
                                                    +{formatCurrency(b.advancePaid || 0)}
                                                  </div>
                                                  <div className="text-[10px] text-zinc-500">
                                                    / {formatCurrency(b.totalAmount || 0)}
                                                  </div>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPaymentModalBooking(b);
                                                  }}
                                                  className="px-2 py-1 rounded-lg bg-white hover:bg-zinc-950 text-zinc-800 hover:text-white border border-zinc-300 font-bold text-[10px] transition-colors cursor-pointer"
                                                >
                                                  Payment
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )
                                  ) : row.booking ? (
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                      {extractBookingPayments(row.booking).length === 0 ? (
                                        <p className="text-xs text-zinc-500 py-3 text-center">
                                          No payments received yet for this private package.
                                        </p>
                                      ) : (
                                        extractBookingPayments(row.booking).map((entry, idx) => (
                                          <div
                                            key={entry.id || idx}
                                            className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2"
                                          >
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-xs text-zinc-950">
                                                  {idx === 0
                                                    ? '1st Advance'
                                                    : `Installment #${idx + 1}`}
                                                </span>
                                                <span className="text-[10px] font-semibold text-zinc-600">
                                                  • {entry.walletName} ({entry.paymentMode})
                                                </span>
                                              </div>
                                              <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                                                {entry.date ? formatDate(entry.date) : ''}
                                                {entry.notes ? ` • ${entry.notes}` : ''}
                                              </div>
                                            </div>
                                            <span className="font-mono tabular-nums font-black text-xs text-emerald-700 shrink-0">
                                              +{formatCurrency(entry.amount)}
                                            </span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  ) : null}
                                </div>

                                {/* RIGHT: CASH OUT / EXPENSES + INLINE ADD EXPENSE */}
                                <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
                                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                                    <div>
                                      <span className="text-xs font-black text-zinc-950 uppercase tracking-wider flex items-center gap-1.5">
                                        <Receipt className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Tour Expenses ({row.expenses.length})</span>
                                      </span>
                                      <span className="text-[11px] font-mono tabular-nums font-bold text-rose-700 block">
                                        Total Out: -{formatCurrency(row.totalExpenses)}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenInlineAddExpense(row.key);
                                      }}
                                      className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                                        isAddingHere
                                          ? 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
                                          : 'bg-zinc-950 text-white hover:bg-zinc-800'
                                      }`}
                                    >
                                      {isAddingHere ? (
                                        <X className="w-3.5 h-3.5" />
                                      ) : (
                                        <Plus className="w-3.5 h-3.5" />
                                      )}
                                      <span>{isAddingHere ? 'Close' : 'Add Expense'}</span>
                                    </button>
                                  </div>

                                  {/* Inline Add Expense Form for Group OR Private Tour */}
                                  {isAddingHere && (
                                    <form
                                      onSubmit={(e) => handleSaveRowExpense(e, row)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2.5"
                                    >
                                      {expError && (
                                        <div className="px-2.5 py-1.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-bold">
                                          {expError}
                                        </div>
                                      )}

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <select
                                          value={expCategory}
                                          onChange={(e) =>
                                            setExpCategory(e.target.value as TourExpenseCategory)
                                          }
                                          className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                                        >
                                          {REPORT_EXPENSE_CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                              {cat}
                                            </option>
                                          ))}
                                        </select>

                                        <input
                                          type="number"
                                          min="1"
                                          step="1"
                                          required
                                          placeholder="Amount (₹)"
                                          value={expAmount}
                                          onChange={(e) => setExpAmount(e.target.value)}
                                          className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-mono font-black text-zinc-900 outline-none focus:border-zinc-900"
                                        />
                                      </div>

                                      <input
                                        type="text"
                                        placeholder="Description (e.g. Hotel, Cab, Train Tickets)"
                                        value={expDescription}
                                        onChange={(e) => setExpDescription(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                                      />

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <select
                                          value={expWalletName}
                                          onChange={(e) => setExpWalletName(e.target.value)}
                                          className="px-2 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                                        >
                                          {walletOptions.map((w) => (
                                            <option key={w.id} value={w.name}>
                                              {w.name}
                                            </option>
                                          ))}
                                        </select>

                                        <select
                                          value={expPaymentMode}
                                          onChange={(e) =>
                                            setExpPaymentMode(e.target.value as TourPaymentMode)
                                          }
                                          className="px-2 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                                        >
                                          <option value="UPI">UPI</option>
                                          <option value="Cash">Cash</option>
                                          <option value="Online">Online</option>
                                        </select>

                                        <input
                                          type="date"
                                          value={expDate}
                                          onChange={(e) => setExpDate(e.target.value)}
                                          className="px-2 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                                        />
                                      </div>

                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setAddingForKey(null)}
                                          className="px-2.5 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-700 font-bold text-[11px] cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={isSavingExp}
                                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>{isSavingExp ? 'Saving...' : 'Save Expense'}</span>
                                        </button>
                                      </div>
                                    </form>
                                  )}

                                  {/* Linked Expense Rows */}
                                  {row.expenses.length === 0 ? (
                                    <p className="text-xs text-zinc-500 py-3 text-center">
                                      No expenses recorded yet for this {row.type === 'private' ? 'private package' : 'group batch'}.
                                    </p>
                                  ) : (
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                      {row.expenses.map((exp) => (
                                        <div
                                          key={exp.id}
                                          className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2"
                                        >
                                          <div className="min-w-0">
                                            <div className="font-bold text-xs text-zinc-950 truncate">
                                              {exp.description || exp.category}
                                            </div>
                                            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                              <span>{exp.category}</span>
                                              <span>•</span>
                                              <span>{formatDate(exp.date)}</span>
                                              <span>•</span>
                                              <span className="font-semibold text-zinc-700">
                                                {exp.walletName || 'Wallet'}
                                              </span>
                                            </div>
                                          </div>

                                          <div
                                            className="flex items-center gap-1.5 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <span className="font-mono tabular-nums font-black text-xs text-rose-700">
                                              -{formatCurrency(exp.amount)}
                                            </span>

                                            {confirmDeleteExpId === exp.id ? (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    await deleteTourExpenseById(exp.id);
                                                    setConfirmDeleteExpId(null);
                                                  }}
                                                  className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] cursor-pointer"
                                                >
                                                  Confirm
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setConfirmDeleteExpId(null)}
                                                  className="px-1.5 py-0.5 rounded bg-white border border-zinc-300 text-zinc-700 font-bold text-[10px] cursor-pointer"
                                                >
                                                  No
                                                </button>
                                              </div>
                                            ) : (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => openEditTourExpenseModal(exp)}
                                                  className="p-1 rounded-md bg-white hover:bg-zinc-950 text-zinc-700 hover:text-white border border-zinc-300 transition-colors cursor-pointer"
                                                  title="Edit Expense"
                                                >
                                                  <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setConfirmDeleteExpId(exp.id)}
                                                  className="p-1 rounded-md bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-colors cursor-pointer"
                                                  title="Delete Expense"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Payment & Private Package Expense Modal opened directly from Report Detail */}
      <ReceiveTourPaymentModal
        isOpen={Boolean(paymentModalBooking)}
        onClose={() => setPaymentModalBooking(null)}
        booking={paymentModalBooking}
      />
    </div>
  );
};

