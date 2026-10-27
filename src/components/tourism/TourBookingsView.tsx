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
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBooking } from '../../types';
import { BookingsSkeleton } from '../common/Skeleton';

interface TourBookingsViewProps {
  onOpenBookingDetail?: (booking: TourBooking) => void;
}

export const TourBookingsView: React.FC<TourBookingsViewProps> = () => {
  const {
    loading,
    tourBookings,
    formatCurrency,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
    openEditTourBookingModal,
    deleteTourBookingById,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Paid' | 'Partial' | 'Pending'>('ALL');
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    return (localStorage.getItem('sz_tour_bookings_view_mode') as 'card' | 'list') || 'card';
  });

  const toggleViewMode = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('sz_tour_bookings_view_mode', mode);
  };

  if (loading) {
    return <BookingsSkeleton />;
  }

  const filteredBookings = useMemo(() => {
    return tourBookings.filter((b) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        b.destination.toLowerCase().includes(q) ||
        b.bookingNumber.toLowerCase().includes(q) ||
        b.members.some((m) => m.name.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || b.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tourBookings, searchQuery, statusFilter]);

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

  // Quick WhatsApp share direct message
  const handleWhatsAppSend = (b: TourBooking) => {
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
      `💰 *Total Amount:* ₹${b.totalAmount}\n` +
      `✅ *Advance Paid:* ₹${b.advancePaid} (${b.paymentMode || 'Online'})\n` +
      `⚠️ *Remaining Due:* ₹${b.pendingAmount}\n\n` +
      (b.specialNotes ? `📝 *Note:* ${b.specialNotes}\n\n` : '') +
      `Thank you for booking with Sanzari Tours & Travels!`;

    const phoneClean = b.customerPhone.replace(/[^0-9]/g, '');
    const phoneWithCode = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5 pb-48 sm:pb-24">
      {/* Filter & View Switcher Bar */}
      <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, destination, or passenger name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 font-medium"
          />
        </div>

        {/* Status Filter & View Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['ALL', 'Paid', 'Partial', 'Pending'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                {st === 'ALL' ? 'All Bookings' : st === 'Partial' ? 'Advance' : st}
              </button>
            ))}
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
            No tour bookings match your search. Use the header "+ Booking" button to create a new booking!
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

            return (
              <div
                key={b.id}
                className="bg-white text-zinc-950 rounded-2xl border-2 border-zinc-900 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top Header / Booking No & Status */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-2">
                    <span className="text-[10px] font-mono font-black text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300 truncate max-w-[120px]">
                      {b.bookingNumber}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                        b.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                          : b.paymentStatus === 'Partial'
                          ? 'bg-amber-50 text-amber-900 border-amber-400'
                          : 'bg-rose-50 text-rose-800 border-rose-400'
                      }`}
                    >
                      {b.paymentStatus === 'Partial' ? 'Advance' : b.paymentStatus}
                    </span>
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
                      <a
                        href={`tel:${b.customerPhone}`}
                        className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 flex items-center gap-1 truncate mt-0.5"
                      >
                        <Phone size={11} className="text-zinc-900 shrink-0" />
                        <span className="truncate">{b.customerPhone}</span>
                      </a>
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

                    <div className="text-[10px] text-zinc-700 flex items-center gap-1.5">
                      <Users size={12} className="text-zinc-900 shrink-0" />
                      <span className="font-extrabold text-zinc-900">{b.membersCount} Pax</span>
                      <span className="text-zinc-500 text-[10px] truncate">
                        ({b.members.map((m) => m.name).slice(0, 2).join(', ')}
                        {b.members.length > 2 ? '...' : ''})
                      </span>
                    </div>
                  </div>

                  {/* Money Summary */}
                  <div className="grid grid-cols-2 gap-1.5 bg-zinc-50 rounded-xl p-2 text-center text-[10px] font-medium border border-zinc-200">
                    <div>
                      <span className="text-zinc-500 block text-[9px] font-bold uppercase">Total</span>
                      <strong className="text-zinc-950 font-black text-xs">{formatCurrency(b.totalAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[9px] font-bold uppercase">Advance</span>
                      <strong className="text-emerald-700 font-black text-xs">{formatCurrency(b.advancePaid)}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 mt-2 border-t border-zinc-200 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
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
            <div className="col-span-2 text-right">Amounts (₹)</div>
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

              return (
                <div
                  key={b.id}
                  className="p-3.5 sm:p-4 hover:bg-zinc-50 transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:items-center"
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
                        className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                          b.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                            : b.paymentStatus === 'Partial'
                            ? 'bg-amber-50 text-amber-900 border-amber-400'
                            : 'bg-rose-50 text-rose-800 border-rose-400'
                        }`}
                      >
                        {b.paymentStatus === 'Partial' ? 'Advance' : b.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="col-span-3">
                    <h4 className="text-sm font-black text-zinc-950 tracking-tight flex items-center gap-1.5">
                      <span>{b.customerName}</span>
                      <span
                        className={`hidden lg:inline-block text-[9px] font-black px-1.5 py-0.2 rounded border ${
                          b.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                            : b.paymentStatus === 'Partial'
                            ? 'bg-amber-50 text-amber-900 border-amber-400'
                            : 'bg-rose-50 text-rose-800 border-rose-400'
                        }`}
                      >
                        {b.paymentStatus === 'Partial' ? 'Advance' : b.paymentStatus}
                      </span>
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 mt-0.5">
                      <a
                        href={`tel:${b.customerPhone}`}
                        className="font-bold text-zinc-900 hover:underline flex items-center gap-1"
                      >
                        <Phone size={11} className="text-zinc-900 shrink-0" />
                        <span>{b.customerPhone}</span>
                      </a>
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

                  {/* Pax Count & Names */}
                  <div className="col-span-1 lg:text-center">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 border border-zinc-300 text-xs font-black text-zinc-950">
                      <Users size={12} className="text-zinc-900" />
                      <span>{b.membersCount} Pax</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate max-w-[120px] lg:mx-auto mt-0.5">
                      {b.members.map((m) => m.name).slice(0, 2).join(', ')}
                    </p>
                  </div>

                  {/* Financials (Total, Advance, Due) */}
                  <div className="col-span-2 flex items-center justify-between lg:block lg:text-right bg-zinc-50 lg:bg-transparent p-2 lg:p-0 rounded-xl">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold lg:hidden">Amounts:</span>
                      <div className="text-xs font-black text-zinc-950">
                        {formatCurrency(b.totalAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-emerald-700">
                        Adv: {formatCurrency(b.advancePaid)}
                      </div>
                      {b.pendingAmount > 0 && (
                        <div className="text-[10px] font-bold text-rose-600">
                          Due: {formatCurrency(b.pendingAmount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5 pt-1 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
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
    </div>
  );
};
