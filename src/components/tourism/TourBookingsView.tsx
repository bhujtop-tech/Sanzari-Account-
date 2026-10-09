import React, { useState, useMemo } from 'react';
import {
  Luggage,
  Search,
  Plus,
  Calendar,
  MapPin,
  Users,
  Train,
  CheckCircle2,
  Phone,
  MessageCircle,
  FileText,
  Trash2,
  Edit2,
  Share2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { TourBooking } from '../../types';

interface TourBookingsViewProps {
  onOpenBookingDetail?: (booking: TourBooking) => void;
}

export const TourBookingsView: React.FC<TourBookingsViewProps> = ({ onOpenBookingDetail }) => {
  const {
    tourBookings,
    formatCurrency,
    formatDate,
    setIsAddTourBookingOpen,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
    openEditTourBookingModal,
    deleteTourBookingById,
  } = useData();
  const { currentUserProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Paid' | 'Partial' | 'Pending'>('ALL');

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
      {/* Top Banner - Signature Black Theme */}
      <div className="bg-zinc-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-zinc-850 relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider">
              <Luggage className="w-3.5 h-3.5 text-blue-400" />
              Customer Bookings
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Tour Bookings & Passengers
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Track customer bookings, passenger ages, train/flight class, advance payments, and send instant WhatsApp receipts.
            </p>
          </div>

          <button
            onClick={() => setIsAddTourBookingOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> + New Tour Booking
          </button>
        </div>
      </div>

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
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0 ${
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

      {/* Bookings List (2 Cards Per Row on Mobile) */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto">
            <Luggage className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Bookings Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            No tour bookings match your search. Create a new booking with customer name, members, and advance payment!
          </p>
          <button
            onClick={() => setIsAddTourBookingOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Tour Booking
          </button>
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
                className="bg-zinc-950 text-white rounded-2xl border border-zinc-800 shadow-md p-3 sm:p-4 flex flex-col justify-between hover:border-zinc-700 transition-all group"
              >
                <div>
                  {/* Top Header / Booking No & Status */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-2">
                    <span className="font-mono text-[9px] sm:text-[10px] font-black text-amber-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 truncate max-w-[90px]">
                      {b.bookingNumber}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                        b.paymentStatus === 'Paid'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : b.paymentStatus === 'Partial'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {b.paymentStatus === 'Partial' ? 'Advance' : b.paymentStatus}
                    </span>
                  </div>

                  {/* Big Date Highlight & Customer Info */}
                  <div className="flex items-center gap-2 mb-2">
                    {/* Big Date Badge */}
                    <div className="px-2 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-center shrink-0 min-w-[42px]">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-amber-400 block leading-tight">
                        {monthShort}
                      </span>
                      <span className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white block leading-none my-0.5">
                        {dayNum}
                      </span>
                      <span className="text-[7px] font-bold text-zinc-400 block leading-tight">
                        {yearNum}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-sm font-black text-white truncate tracking-tight">
                        {b.customerName}
                      </h3>
                      <a
                        href={`tel:${b.customerPhone}`}
                        className="text-[10px] font-medium text-zinc-400 hover:text-white flex items-center gap-1 truncate"
                      >
                        <Phone size={10} className="text-blue-400 shrink-0" />
                        <span className="truncate">{b.customerPhone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Destination & Members Details */}
                  <div className="bg-zinc-900/90 rounded-xl p-2 border border-zinc-800/80 space-y-1 mb-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-blue-400 font-bold flex items-center gap-1 truncate max-w-[110px]">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{b.destination}</span>
                      </span>
                      <span className="text-amber-300 font-bold text-[9px] bg-zinc-950 px-1 rounded border border-zinc-800 truncate max-w-[70px]">
                        {b.travelClass}
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-300 flex items-center gap-1">
                      <Users size={11} className="text-zinc-500 shrink-0" />
                      <span className="font-bold">{b.membersCount} Pax</span>
                      <span className="text-zinc-500 text-[9px] truncate">
                        ({b.members.map((m) => m.name).slice(0, 2).join(', ')}
                        {b.members.length > 2 ? '...' : ''})
                      </span>
                    </div>
                  </div>

                  {/* Money Summary */}
                  <div className="grid grid-cols-2 gap-1 bg-zinc-900/60 rounded-xl p-1.5 text-center text-[9px] font-medium border border-zinc-850">
                    <div>
                      <span className="text-zinc-500 block">Total</span>
                      <strong className="text-white font-mono text-xs">{formatCurrency(b.totalAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-400 block">Advance</span>
                      <strong className="text-emerald-400 font-mono text-xs">{formatCurrency(b.advancePaid)}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 mt-2 border-t border-zinc-850 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditTourBookingModal(b)}
                      title="Edit Booking"
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-blue-600/30 text-blue-400 border border-zinc-800 transition-all cursor-pointer"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppSend(b)}
                      title="Send WhatsApp"
                      className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all cursor-pointer"
                    >
                      <MessageCircle size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareReceipt(b)}
                      title="Voucher Slip"
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all cursor-pointer"
                    >
                      <FileText size={12} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(b.id, b.customerName)}
                    title="Delete Booking"
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-600/30 text-rose-400 border border-zinc-800 hover:border-rose-500/40 transition-all cursor-pointer"
                  >
                    <Trash2 size={12} />
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
