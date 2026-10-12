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
    const memberText = b.members.map((m, i) => `${i + 1}. ${m.name} (${m.age ? `${m.age} yrs` : 'Adult'})`).join('\n');
    const msg = `*SANZARI TOURS & TRAVELS*\n*Tour Booking Confirmation*\n\n` +
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
      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-zinc-200/90 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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
              {st === 'ALL' ? 'All Bookings' : st === 'Partial' ? 'Advance Paid' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List (2 Cards Per Row on Mobile, Pure Black Style - Zero Orange) */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto">
            <Luggage className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Bookings Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            No tour bookings match your search. Use the header "+ Booking" button to create a new booking!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {filteredBookings.map((b) => {
            // Parse Date for Highlight Box
            const d = new Date(b.tourDate);
            const isValid = !isNaN(d.getTime());
            const dayNum = isValid ? String(d.getDate()).padStart(2, '0') : b.tourDate.split('-')[2] || '10';
            const monthShort = isValid
              ? d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
              : 'OCT';
            const yearNum = isValid ? d.getFullYear() : b.tourDate.split('-')[0] || '2026';

            return (
              <div
                key={b.id}
                className="bg-white text-zinc-950 rounded-2xl border-2 border-zinc-900 shadow-sm p-3 sm:p-4 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top Header / Booking No & Status - Crisp White Card & Black Border */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-2">
                    <span className="text-[10px] font-black text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300 truncate max-w-[90px]">
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
                    {/* Big Date Badge - White background, Black border */}
                    <div className="px-2 py-1 rounded-xl bg-zinc-50 border-2 border-zinc-900 text-center shrink-0 min-w-[44px]">
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
                      <h3 className="text-sm font-black text-zinc-950 truncate tracking-tight">
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
                      <span className="text-zinc-950 font-black flex items-center gap-1 truncate max-w-[120px]">
                        <MapPin size={12} className="text-zinc-900 shrink-0" />
                        <span className="truncate">{b.destination}</span>
                      </span>
                      <span className="text-zinc-800 font-bold text-[9px] bg-white px-1.5 py-0.5 rounded border border-zinc-300 truncate max-w-[80px]">
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
      )}
    </div>
  );
};
