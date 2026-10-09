import React from 'react';
import {
  X,
  Printer,
  Share2,
  Calendar,
  MapPin,
  Train,
  Users,
  Luggage,
  Edit2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBooking } from '../../types';

interface TourReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: TourBooking | null;
}

export const TourReceiptModal: React.FC<TourReceiptModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const { formatCurrency, formatDate, openEditTourBookingModal } = useData();

  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const memberText = booking.members
      .map((m, i) => `${i + 1}. ${m.name}${m.age ? ` (Age: ${m.age} yrs)` : ''}`)
      .join('\n');

    const message =
      `✨ *SANZARI TOURS & TRAVELS* ✨\n` +
      `🎫 *BOOKING CONFIRMATION SLIP*\n\n` +
      `📌 *Booking ID:* ${booking.bookingNumber}\n` +
      `📍 *Destination:* ${booking.destination}\n` +
      `📅 *Departure Date:* ${formatDate(booking.tourDate)}\n` +
      `🚆 *Travel Mode:* ${booking.travelClass} (${booking.tourType})\n\n` +
      `👤 *Customer Name:* ${booking.customerName}\n` +
      `📞 *Mobile:* ${booking.customerPhone}\n` +
      `👥 *Total Passengers:* ${booking.membersCount} Members\n\n` +
      `*Passengers:*\n${memberText}\n\n` +
      `💰 *PAYMENT SUMMARY:*\n` +
      `• Total Package: ${formatCurrency(booking.totalAmount)}\n` +
      `• Advance Paid: ${formatCurrency(booking.advancePaid)} (${booking.paymentMode || 'Online'})\n` +
      `• Remaining Balance: ${formatCurrency(booking.pendingAmount)}\n` +
      `• Status: *${booking.paymentStatus === 'Paid' ? '✅ FULLY PAID' : '⏳ ADVANCE RECEIVED'}*\n\n` +
      (booking.specialNotes ? `📝 *Note:* ${booking.specialNotes}\n\n` : '') +
      `🙏 *Thank you for choosing Sanzari Tours & Travels!*`;

    const cleanPhone = booking.customerPhone.replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto max-h-[92vh] flex flex-col print:border-none print:shadow-none print:max-h-none">
        {/* Modal Controls (Hidden during print) */}
        <div className="bg-zinc-950 px-6 py-3.5 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Booking Slip • {booking.bookingNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                openEditTourBookingModal(booking);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Receipt */}
        <div className="p-6 sm:p-8 space-y-6 text-zinc-900 bg-white flex-1 overflow-y-auto min-h-0" id="tour-printable-slip">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-5 border-zinc-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-sm">
                  ✈️
                </div>
                <h1 className="text-xl font-black tracking-tight text-zinc-950">
                  SANZARI TOURS & TRAVELS
                </h1>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Group Tours & Travel Booking Receipt
              </p>
            </div>

            <div className="text-right">
              <span className="font-mono text-xs font-bold text-zinc-900 block">
                {booking.bookingNumber}
              </span>
              <span className="text-[11px] text-zinc-500">{formatDate(booking.createdAt || new Date().toISOString())}</span>
            </div>
          </div>

          {/* Tour Destination Card */}
          <div className="p-4 rounded-2xl bg-zinc-950 text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Tour Destination
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                {booking.tourType}
              </span>
            </div>
            <div className="text-xl font-black tracking-tight">{booking.destination}</div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 pt-1">
              <span className="flex items-center gap-1 font-mono">
                <Calendar size={13} className="text-blue-400" /> Date: {formatDate(booking.tourDate)}
              </span>
              <span className="flex items-center gap-1">
                <Train size={13} className="text-amber-400" /> {booking.travelClass}
              </span>
            </div>
          </div>

          {/* Customer & Passengers */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Customer Name</span>
                <span className="text-sm font-bold text-zinc-950">{booking.customerName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Contact Number</span>
                <span className="text-sm font-bold text-zinc-950 font-mono">{booking.customerPhone}</span>
              </div>
            </div>

            {/* Passengers Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1">
                <Users size={13} />
                Passengers Manifest ({booking.membersCount} Members)
              </h3>
              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-100 text-zinc-600 font-bold border-b border-zinc-200">
                    <tr>
                      <th className="p-2.5 text-center w-10">#</th>
                      <th className="p-2.5">Passenger Name</th>
                      <th className="p-2.5 text-center">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {booking.members.map((m, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="p-2.5 text-center text-zinc-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-zinc-900">{m.name}</td>
                        <td className="p-2.5 text-center font-mono text-zinc-700">
                          {m.age ? `${m.age} yrs` : 'Adult'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>Total Package Amount:</span>
              <span className="font-mono font-bold text-zinc-900 text-sm">
                {formatCurrency(booking.totalAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-700">
              <span className="font-semibold">Advance Received ({booking.paymentMode || 'Online'}):</span>
              <span className="font-mono font-black text-sm">
                {formatCurrency(booking.advancePaid)}
              </span>
            </div>
            <div className="border-t border-zinc-200 pt-2 flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-900">Remaining Due Balance:</span>
              <span className="font-mono font-black text-rose-600 text-base">
                {formatCurrency(booking.pendingAmount)}
              </span>
            </div>
          </div>

          {booking.specialNotes && (
            <div className="text-xs text-zinc-600 italic bg-amber-50 border border-amber-200/60 p-3 rounded-xl">
              <span className="font-bold text-zinc-800 not-italic">Note: </span>
              {booking.specialNotes}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-2 text-[11px] text-zinc-400 border-t border-zinc-200">
            Thank you for choosing Sanzari Tours & Travels. Wish you a wonderful journey!
          </div>
        </div>
      </div>
    </div>
  );
};
