import React, { useState, useMemo } from 'react';
import {
  Luggage,
  Search,
  MapPin,
  Users,
  Phone,
  MessageCircle,
  FileText,
  Trash2,
  Edit2,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  FileDown,
  Folder,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBooking } from '../../types';
import { BookingsSkeleton } from '../common/Skeleton';
import { ReceiveTourPaymentModal } from './ReceiveTourPaymentModal';
import { TourPDFExportModal } from './TourPDFExportModal';
import { resolveBookedBy } from './TourCommissionView';

interface TourBookingsViewProps {
  onOpenBookingDetail?: (booking: TourBooking) => void;
}

export const TourBookingsView: React.FC<TourBookingsViewProps> = () => {
  const {
    loading,
    tourBookings,
    tourBatches,
    formatCurrency,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
    openEditTourBookingModal,
    deleteTourBookingById,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Paid' | 'Due'>('ALL');
  const [bookedByFilter, setBookedByFilter] = useState<'ALL' | 'Rizwan' | 'Mustak'>('ALL');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    return (localStorage.getItem('sz_tour_bookings_view_mode') as 'card' | 'list') || 'card';
  });
  const [paymentModalBooking, setPaymentModalBooking] = useState<TourBooking | null>(null);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

  const toggleViewMode = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('sz_tour_bookings_view_mode', mode);
  };

  // Bookings filtered by Group/Batch first (for accurate KPI stats)
  const batchFilteredBookings = useMemo(() => {
    if (selectedBatchId === 'ALL') return tourBookings;
    return tourBookings.filter((b) => b.tourBatchId === selectedBatchId);
  }, [tourBookings, selectedBatchId]);

  // Summary counts for Full Paid vs Baaki Due
  const summaryStats = useMemo(() => {
    let fullPaidCount = 0;
    let dueCount = 0;
    let totalReceived = 0;
    let totalDue = 0;

    batchFilteredBookings.forEach((b) => {
      const total = Number(b.totalAmount || 0);
      const adv = Number(b.advancePaid || 0);
      const due = Math.max(0, total - adv);

      totalReceived += adv;
      totalDue += due;

      if (due === 0 && total > 0) {
        fullPaidCount++;
      } else {
        dueCount++;
      }
    });

    return {
      fullPaidCount,
      dueCount,
      totalReceived,
      totalDue,
    };
  }, [batchFilteredBookings]);

  const filteredBookings = useMemo(() => {
    return batchFilteredBookings.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const total = Number(b.totalAmount || 0);
      const adv = Number(b.advancePaid || 0);
      const due = Math.max(0, total - adv);
      const isFullPaid = due === 0 && total > 0;

      if (statusFilter === 'Paid' && !isFullPaid) return false;
      if (statusFilter === 'Due' && isFullPaid) return false;

      if (bookedByFilter !== 'ALL') {
        const bBy = resolveBookedBy(b).toLowerCase();
        if (bookedByFilter === 'Rizwan' && !bBy.includes('rizwan')) return false;
        if (bookedByFilter === 'Mustak' && !bBy.includes('mustak')) return false;
      }

      if (!q) return true;

      const cName = (b.customerName || '').toLowerCase();
      const cPhone = String(b.customerPhone || '');
      const cDest = (b.destination || '').toLowerCase();
      const bNum = (b.bookingNumber || '').toLowerCase();
      const members = Array.isArray(b.members) ? b.members : [];
      const matchMember = members.some((m) => (m?.name || '').toLowerCase().includes(q));

      return (
        cName.includes(q) ||
        cPhone.includes(q) ||
        cDest.includes(q) ||
        bNum.includes(q) ||
        matchMember
      );
    });
  }, [batchFilteredBookings, searchQuery, statusFilter, bookedByFilter]);

  if (loading) {
    return <BookingsSkeleton />;
  }

  const handleExportPDF = () => {
    setIsPDFModalOpen(true);
  };

  const handleShareReceipt = (b: TourBooking) => {
    setTourReceiptBooking(b);
    setIsTourReceiptOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete booking for ${name}?`)) {
      try {
        await deleteTourBookingById(id);
      } catch (err) {
        console.error('Failed to delete booking:', err);
      }
    }
  };

  const handleWhatsAppSend = (b: TourBooking) => {
    const total = Number(b.totalAmount || 0);
    const adv = Number(b.advancePaid || 0);
    const due = Math.max(0, total - adv);
    const memberText = b.members
      .map((m, i) => `${i + 1}. ${m.name} (${m.age ? `${m.age} yrs` : 'Adult'})`)
      .join('\n');
    const msg =
      `*SANZARI TOURS & TRAVELS*\n*Tour Booking Confirmation*\n\n` +
      `📌 *Booking No:* ${b.bookingNumber}\n` +
      `👤 *Customer Name:* ${b.customerName}\n` +
      `📍 *Destination:* ${b.destination}\n` +
      `📅 *Tour Date:* ${b.tourDate}\n` +
      `🚆 *Travel Mode:* ${b.travelClass}\n` +
      `👥 *Tour Type:* ${b.tourType}\n\n` +
      `*Travelers (${b.membersCount} Members):*\n${memberText}\n\n` +
      `💰 *Total Amount:* ₹${total.toLocaleString('en-IN')}\n` +
      `✅ *Total Paid (Received):* ₹${adv.toLocaleString('en-IN')} (${b.paymentMode || 'Online'})\n` +
      (due === 0
        ? `🎉 *Payment Status:* FULL PAID (₹0 Due)\n\n`
        : `⚠️ *Remaining Due:* ₹${due.toLocaleString('en-IN')}\n\n`) +
      (b.specialNotes ? `📝 *Note:* ${b.specialNotes}\n\n` : '') +
      `Thank you for booking with Sanzari Tours & Travels!`;

    const phoneClean = (b.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCode = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const formatShortDate = (dStr?: string) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-4 pb-48 sm:pb-24">
      {/* Quick Payment Status Summary Strip (2x2 Grid on Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-2.5 sm:p-3 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
              : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-900'
          }`}
        >
          <span
            className={`text-[9px] sm:text-[10px] font-bold uppercase block truncate ${
              statusFilter === 'ALL' ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            Total Confirmed
          </span>
          <span className="text-xs sm:text-lg font-black font-mono truncate block mt-0.5">
            {batchFilteredBookings.length} Bookings
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('Paid')}
          className={`p-2.5 sm:p-3 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'Paid'
              ? 'bg-emerald-600 text-white border-emerald-800 shadow-sm'
              : 'bg-emerald-50/70 text-emerald-950 border-emerald-300 hover:border-emerald-600'
          }`}
        >
          <span
            className={`text-[9px] sm:text-[10px] font-bold uppercase flex items-center gap-1 truncate ${
              statusFilter === 'Paid' ? 'text-emerald-100' : 'text-emerald-800'
            }`}
          >
            <CheckCircle2 size={10} className="shrink-0" /> <span className="truncate">Full Paid</span>
          </span>
          <span className="text-xs sm:text-lg font-black font-mono truncate block mt-0.5">
            {summaryStats.fullPaidCount} Paid
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('Due')}
          className={`p-2.5 sm:p-3 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'Due'
              ? 'bg-rose-600 text-white border-rose-800 shadow-sm'
              : 'bg-rose-50/70 text-rose-950 border-rose-300 hover:border-rose-600'
          }`}
        >
          <span
            className={`text-[9px] sm:text-[10px] font-bold uppercase flex items-center gap-1 truncate ${
              statusFilter === 'Due' ? 'text-rose-100' : 'text-rose-800'
            }`}
          >
            <Clock size={10} className="shrink-0" /> <span className="truncate">Baaki (Due)</span>
          </span>
          <span className="text-xs sm:text-lg font-black font-mono truncate block mt-0.5">
            {summaryStats.dueCount} Bookings
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-2xl bg-white border-2 border-zinc-900 min-w-0">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-zinc-500 block truncate">
            Total Baaki to Collect
          </span>
          <span className="text-xs sm:text-lg font-black font-mono text-rose-600 truncate block mt-0.5">
            {formatCurrency(summaryStats.totalDue)}
          </span>
        </div>
      </div>

      {/* Filter, Group Selector & PDF Download Bar */}
      <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search customer name, phone, destination, or passenger name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 font-medium"
            />
          </div>

          {/* Group / Date Folder Dropdown + Download PDF Button */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:flex-initial">
              <Folder className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full sm:w-auto pl-8 pr-7 py-2 text-xs font-black bg-zinc-100 border-2 border-zinc-900 rounded-xl text-zinc-950 focus:outline-none cursor-pointer"
              >
                <option value="ALL">📂 All Groups / Folders ({tourBookings.length})</option>
                {tourBatches.map((batch) => {
                  const cnt = tourBookings.filter((b) => b.tourBatchId === batch.id).length;
                  return (
                    <option key={batch.id} value={batch.id}>
                      📂 {batch.title} - {batch.destination} ({cnt})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={filteredBookings.length === 0}
              title="Download Clean Booking-wise Group PDF with Advance & Remaining Due"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <FileDown size={15} className="stroke-[2.5]" />
              <span>Download Group PDF ({filteredBookings.length})</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills & View Mode Toggle */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 overflow-x-auto">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              All ({batchFilteredBookings.length})
            </button>
            <button
              onClick={() => setStatusFilter('Paid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                statusFilter === 'Paid'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 size={12} />
              <span>Full Paid ({summaryStats.fullPaidCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('Due')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                statusFilter === 'Due'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Clock size={12} />
              <span>Baaki / Due ({summaryStats.dueCount})</span>
            </button>

            {/* Booked By Filter Pills */}
            <div className="flex items-center gap-1 pl-2 border-l border-zinc-200 shrink-0">
              <span className="text-[10px] font-bold text-zinc-500 uppercase hidden sm:inline">Booked By:</span>
              <button
                onClick={() => setBookedByFilter('ALL')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  bookedByFilter === 'ALL'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setBookedByFilter('Rizwan')}
                className={`px-2 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  bookedByFilter === 'Rizwan'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                }`}
              >
                👤 Rizwan
              </button>
              <button
                onClick={() => setBookedByFilter('Mustak')}
                className={`px-2 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  bookedByFilter === 'Mustak'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                👤 Mustak
              </button>
            </div>
          </div>

          {/* View Mode Toggle: Cards vs List */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-300 shrink-0">
            <button
              type="button"
              onClick={() => toggleViewMode('card')}
              className={`p-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="Card View (Grid)"
            >
              <LayoutGrid size={14} />
              <span className="hidden md:inline text-[11px]">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => toggleViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="List View (Table)"
            >
              <List size={14} />
              <span className="hidden md:inline text-[11px]">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bookings View: Empty State */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-900 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto border border-zinc-300">
            <Luggage className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Bookings Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            No tour bookings match your filter. Use the header "+ Booking" button to create a new booking!
          </p>
        </div>
      ) : viewMode === 'card' ? (
        /* ----------------------------------------------------
           VIEW 1: CARD VIEW (Grid of Cards)
           ---------------------------------------------------- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredBookings.map((b) => {
            const d = new Date(b.tourDate);
            const isValid = !isNaN(d.getTime());
            const dayNum = isValid ? String(d.getDate()).padStart(2, '0') : b.tourDate.split('-')[2] || '10';
            const monthShort = isValid
              ? d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
              : 'NOV';
            const yearNum = isValid ? d.getFullYear() : b.tourDate.split('-')[0] || '2026';

            const total = Number(b.totalAmount || 0);
            const adv = Number(b.advancePaid || 0);
            const due = Math.max(0, total - adv);
            const isFullPaid = due === 0 && total > 0;
            const paidPct = total > 0 ? Math.min(100, Math.round((adv / total) * 100)) : 0;
            const historyCount = Array.isArray(b.paymentHistory) ? b.paymentHistory.length : (adv > 0 ? 1 : 0);
            const latestPayment =
              Array.isArray(b.paymentHistory) && b.paymentHistory.length > 1
                ? b.paymentHistory[b.paymentHistory.length - 1]
                : null;

            return (
              <div
                key={b.id}
                className={`bg-white text-zinc-950 rounded-2xl border-2 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between hover:shadow-md transition-all group ${
                  isFullPaid ? 'border-emerald-600 bg-emerald-50/10' : 'border-zinc-900'
                }`}
              >
                <div>
                  {/* Top Header / Booking No & Payment Status Badge */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-2 gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono font-black text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300 truncate max-w-[110px]">
                        {b.bookingNumber}
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                          resolveBookedBy(b).toLowerCase().includes('mustak')
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}
                      >
                        👤 {resolveBookedBy(b)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {historyCount > 1 && (
                        <button
                          type="button"
                          onClick={() => setPaymentModalBooking(b)}
                          className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-300 cursor-pointer hover:bg-blue-100"
                          title="Click to view payment installments history"
                        >
                          💵 {historyCount} Inst.
                        </button>
                      )}
                      <span
                        onClick={() => setPaymentModalBooking(b)}
                        className={`text-[9px] font-black px-2 py-0.5 rounded border cursor-pointer flex items-center gap-1 ${
                          isFullPaid
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : adv > 0
                            ? 'bg-amber-50 text-amber-900 border-amber-400'
                            : 'bg-rose-50 text-rose-800 border-rose-400'
                        }`}
                      >
                        {isFullPaid ? (
                          <>
                            <CheckCircle2 size={10} className="stroke-[3]" />
                            <span>FULL PAID</span>
                          </>
                        ) : adv > 0 ? (
                          `Adv (${paidPct}%)`
                        ) : (
                          'Due'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Big Date Highlight & Customer Info */}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    {/* Big Date Badge */}
                    <div className="px-2 py-1 rounded-xl bg-zinc-50 border-2 border-zinc-900 text-center shrink-0 min-w-[46px]">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-zinc-600 block leading-tight">
                        {monthShort}
                      </span>
                      <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 block leading-none my-0.5">
                        {dayNum}
                      </span>
                      <span className="text-[8px] font-bold text-zinc-500 block leading-tight">
                        {yearNum}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-black text-zinc-950 truncate tracking-tight">
                        {b.customerName}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <a
                          href={`tel:${b.customerPhone}`}
                          className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 flex items-center gap-1 truncate"
                        >
                          <Phone size={11} className="text-zinc-900 shrink-0" />
                          <span className="truncate">{b.customerPhone}</span>
                        </a>
                        {b.city && (
                          <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.2 rounded border border-zinc-200">
                            📍 {b.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Destination & Members Details */}
                  <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-200 space-y-1.5 mb-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-950 font-black flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin size={12} className="text-zinc-900 shrink-0" />
                        <span className="truncate">{b.destination}</span>
                      </span>
                      <span className="text-zinc-800 font-bold text-[9px] bg-white px-1.5 py-0.5 rounded border border-zinc-300 truncate max-w-[100px]">
                        {b.travelClass}
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-700 flex items-center gap-1.5 flex-wrap">
                      <Users size={12} className="text-zinc-900 shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-white font-black text-[10px]">
                        {b.membersCount} Pax
                      </span>
                      {String(b.travelClass || '').toLowerCase().includes('sleeper') ||
                      String(b.travelClass || '').toLowerCase().includes('non-ac') ||
                      String(b.travelClass || '').toLowerCase().includes('non ac') ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-400 font-black text-[10px]">
                          🚂 Non-AC
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-400 font-black text-[10px]">
                          🚆 AC
                        </span>
                      )}
                      <span className="text-zinc-500 text-[10px] truncate">
                        ({b.members.map((m) => m.name).slice(0, 2).join(', ')}
                        {b.members.length > 2 ? '...' : ''})
                      </span>
                    </div>
                  </div>

                  {/* Money Summary + Visual Progress Bar (Clickable to open Receive Payment Modal) */}
                  <div
                    onClick={() => setPaymentModalBooking(b)}
                    title="Click to Receive Payment or View Installment History"
                    className={`rounded-xl p-2.5 border cursor-pointer transition-all space-y-1.5 ${
                      isFullPaid
                        ? 'bg-emerald-50/80 border-emerald-400 hover:bg-emerald-100/70'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-medium">
                      <div>
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">Total</span>
                        <strong className="text-zinc-950 font-black text-xs">{formatCurrency(total)}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 block text-[9px] font-bold uppercase">Received</span>
                        <strong className="text-emerald-700 font-black text-xs">{formatCurrency(adv)}</strong>
                      </div>
                      <div>
                        <span
                          className={`block text-[9px] font-bold uppercase ${
                            isFullPaid ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isFullPaid ? 'Status' : 'Baaki Due'}
                        </span>
                        <strong
                          className={`font-black text-xs ${
                            isFullPaid ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isFullPaid ? '✅ Paid' : formatCurrency(due)}
                        </strong>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFullPaid ? 'bg-emerald-600' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>

                    {/* Received Account & Payment Mode Info */}
                    {adv > 0 && (
                      <div className="pt-1 border-t border-zinc-200/70 flex items-center justify-between gap-1 text-[9px] font-bold text-zinc-700 flex-wrap">
                        <span className="truncate">
                          💳 Account:{' '}
                          <strong className="text-zinc-950">
                            {Array.isArray(b.paymentHistory) && b.paymentHistory.length > 0
                              ? Array.from(
                                  new Set(
                                    b.paymentHistory.map((p) =>
                                      (p.walletName || b.walletName || 'Rizwan').replace(' (Tour)', '')
                                    )
                                  )
                                ).join(' + ')
                              : (b.walletName || 'Rizwan').replace(' (Tour)', '')}
                          </strong>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-white border border-zinc-300 text-emerald-800 font-black">
                          {Array.isArray(b.paymentHistory) && b.paymentHistory.length > 0
                            ? Array.from(
                                new Set(b.paymentHistory.map((p) => p.paymentMode || b.paymentMode || 'UPI'))
                              ).join(' / ')
                            : b.paymentMode || 'UPI'}
                        </span>
                      </div>
                    )}

                    {/* Latest Installment Info if any */}
                    {latestPayment && (
                      <div className="text-[9px] font-bold text-emerald-800 flex items-center justify-between">
                        <span>
                          🕒 Last: +{formatCurrency(latestPayment.amount)} ({formatShortDate(latestPayment.date)})
                        </span>
                        <span className="text-zinc-600">
                          {latestPayment.walletName.replace(' (Tour)', '')} • {latestPayment.paymentMode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2.5 mt-2 border-t border-zinc-200 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    {/* Prominent Receive Payment / Paid History Button */}
                    {!isFullPaid ? (
                      <button
                        type="button"
                        onClick={() => setPaymentModalBooking(b)}
                        title="Receive Remaining Baaki Payment"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                      >
                        <ArrowDownLeft size={12} className="stroke-[3]" />
                        <span>+ Receive</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPaymentModalBooking(b)}
                        title="View Full Payment History"
                        className="px-2 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={12} className="text-emerald-700" />
                        <span>Paid Info</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditTourBookingModal(b)}
                      title="Edit Booking"
                      className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppSend(b)}
                      title="Send WhatsApp"
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 transition-all cursor-pointer"
                    >
                      <MessageCircle size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareReceipt(b)}
                      title="Voucher Slip"
                      className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-all cursor-pointer"
                    >
                      <FileText size={13} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(b.id, b.customerName)}
                    title="Delete Booking"
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ----------------------------------------------------
           VIEW 2: LIST VIEW (Clean Table / Rows View)
           ---------------------------------------------------- */
        <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
          {/* Table Header (Desktop) */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-zinc-100 border-b-2 border-zinc-900 text-[11px] font-black uppercase tracking-wider text-zinc-700">
            <div className="col-span-2">Date &amp; Code</div>
            <div className="col-span-3">Customer &amp; Phone</div>
            <div className="col-span-2">Tour Destination</div>
            <div className="col-span-1 text-center">Pax</div>
            <div className="col-span-2 text-right">Payment Status (₹)</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* List Rows */}
          <div className="divide-y divide-zinc-200">
            {filteredBookings.map((b) => {
              const d = new Date(b.tourDate);
              const isValid = !isNaN(d.getTime());
              const dateDisplay = isValid
                ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : b.tourDate;

              const total = Number(b.totalAmount || 0);
              const adv = Number(b.advancePaid || 0);
              const due = Math.max(0, total - adv);
              const isFullPaid = due === 0 && total > 0;
              const historyCount = Array.isArray(b.paymentHistory) ? b.paymentHistory.length : (adv > 0 ? 1 : 0);

              return (
                <div
                  key={b.id}
                  className={`p-3.5 sm:p-4 hover:bg-zinc-50 transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:items-center ${
                    isFullPaid ? 'bg-emerald-50/20' : ''
                  }`}
                >
                  {/* Date & Booking Number */}
                  <div className="col-span-2 flex items-center justify-between lg:block">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded-lg bg-zinc-900 text-white font-mono text-[10px] font-black">
                        {dateDisplay}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 font-bold">
                        {b.bookingNumber}
                      </span>
                    </div>

                    {/* Status Badge (visible on mobile row top right) */}
                    <div className="lg:hidden">
                      <span
                        onClick={() => setPaymentModalBooking(b)}
                        className={`text-[9px] font-black px-2 py-0.5 rounded border cursor-pointer ${
                          isFullPaid
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-amber-50 text-amber-900 border-amber-400'
                        }`}
                      >
                        {isFullPaid ? '✅ FULL PAID' : `Baaki: ${formatCurrency(due)}`}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="col-span-3">
                    <h4 className="text-sm font-black text-zinc-950 tracking-tight flex items-center gap-1.5 flex-wrap">
                      <span>{b.customerName}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                          resolveBookedBy(b).toLowerCase().includes('mustak')
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}
                      >
                        👤 {resolveBookedBy(b)}
                      </span>
                      <span
                        onClick={() => setPaymentModalBooking(b)}
                        className={`hidden lg:inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded border cursor-pointer ${
                          isFullPaid
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-amber-50 text-amber-900 border-amber-400'
                        }`}
                      >
                        {isFullPaid ? '✅ FULL PAID' : 'Advance'}
                      </span>
                      {historyCount > 1 && (
                        <span
                          onClick={() => setPaymentModalBooking(b)}
                          className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-300 cursor-pointer"
                        >
                          💵 {historyCount} Inst.
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-600 mt-0.5">
                      <a
                        href={`tel:${b.customerPhone}`}
                        className="font-bold text-zinc-900 hover:underline flex items-center gap-1"
                      >
                        <Phone size={11} className="text-zinc-900 shrink-0" />
                        <span>{b.customerPhone}</span>
                      </a>
                      {b.city && (
                        <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.2 rounded border border-zinc-200">
                          📍 {b.city}
                        </span>
                      )}
                      {b.walletName && (
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded">
                          💳 {b.walletName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Destination & Class */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1 text-xs font-black text-zinc-950">
                      <MapPin size={12} className="text-zinc-900 shrink-0" />
                      <span className="truncate">{b.destination}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-zinc-500 mt-0.5 flex items-center gap-1">
                      <span>{b.travelClass}</span>
                      {b.tourBatchTitle && <span>• {b.tourBatchTitle}</span>}
                    </div>
                  </div>

                  {/* Pax Count & AC/Non-AC Badge */}
                  <div className="col-span-1 lg:text-center">
                    <div className="inline-flex items-center gap-1 flex-wrap justify-center">
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-900 text-white text-[10px] font-black">
                        {b.membersCount} Pax
                      </span>
                      {String(b.travelClass || '').toLowerCase().includes('sleeper') ||
                      String(b.travelClass || '').toLowerCase().includes('non-ac') ||
                      String(b.travelClass || '').toLowerCase().includes('non ac') ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-400 text-[10px] font-black">
                          🚂 Non-AC
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-400 text-[10px] font-black">
                          🚆 AC
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate max-w-[120px] lg:mx-auto mt-0.5">
                      {b.members.map((m) => m.name).slice(0, 2).join(', ')}
                    </p>
                  </div>

                  {/* Financials (Total, Received, Due) */}
                  <div
                    onClick={() => setPaymentModalBooking(b)}
                    className="col-span-2 flex items-center justify-between lg:block lg:text-right bg-zinc-50 lg:bg-transparent p-2 lg:p-0 rounded-xl cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold lg:hidden">Total:</span>
                      <div className="text-xs font-black text-zinc-950">
                        {formatCurrency(total)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-emerald-700">
                        Recd: {formatCurrency(adv)}
                      </div>
                      {isFullPaid ? (
                        <div className="text-[10px] font-black text-emerald-700">
                          ✅ Full Paid
                        </div>
                      ) : (
                        <div className="text-[10px] font-black text-rose-600">
                          Due: {formatCurrency(due)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5 pt-1 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
                    {!isFullPaid ? (
                      <button
                        type="button"
                        onClick={() => setPaymentModalBooking(b)}
                        title="Receive Remaining Due Payment"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                      >
                        <ArrowDownLeft size={12} className="stroke-[3]" />
                        <span>+ Receive</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPaymentModalBooking(b)}
                        title="View Payment History"
                        className="px-2 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={11} />
                        <span>History</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditTourBookingModal(b)}
                      title="Edit Booking"
                      className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppSend(b)}
                      title="Send WhatsApp Confirmation"
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 transition-all cursor-pointer"
                    >
                      <MessageCircle size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareReceipt(b)}
                      title="Voucher Slip"
                      className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-all cursor-pointer"
                    >
                      <FileText size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id, b.customerName)}
                      title="Delete Booking"
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Receive Payment & Installment History Modal */}
      <ReceiveTourPaymentModal
        isOpen={Boolean(paymentModalBooking)}
        onClose={() => setPaymentModalBooking(null)}
        booking={paymentModalBooking}
      />

      {/* Custom PDF Export Options Modal */}
      <TourPDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        initialBatchId={selectedBatchId}
        initialPaymentFilter={statusFilter}
      />
    </div>
  );
};
