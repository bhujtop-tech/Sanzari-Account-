import React from 'react';
import {
  X,
  Calendar,
  MapPin,
  Users,
  Train,
  Plus,
  Share2,
  Printer,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Receipt,
  Luggage,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { deleteTourBooking } from '../../services/db';
import { TourBatch, TourBooking, TourExpense } from '../../types';

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
    formatCurrency,
    formatDate,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
    openEditTourBookingModal,
    deleteTourBookingById,
  } = useData();
  const { currentUserProfile } = useAuth();

  if (!isOpen || !batchId) return null;

  const batch = tourBatches.find((b) => b.id === batchId);
  if (!batch) return null;

  const bookings = tourBookings.filter((b) => b.tourBatchId === batch.id);
  const expenses = tourExpenses.filter((e) => e.tourBatchId === batch.id);

  const handleDeleteBooking = async (bId: string, custName: string) => {
    if (window.confirm(`Are you sure you want to delete booking for ${custName}?`)) {
      try {
        await deleteTourBookingById(bId);
      } catch (err) {
        console.error('Failed to delete booking:', err);
      }
    }
  };

  const totalPassengers = bookings.reduce((sum, b) => sum + (b.membersCount || 1), 0);
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalAdvance = bookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);
  const totalPending = bookings.reduce((sum, b) => sum + (b.pendingAmount || 0), 0);
  const totalTourExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netTourProfit = totalRevenue - totalTourExpenses;

  const totalSeats = batch.totalSeats || 30;
  const percentage = Math.min(100, Math.round((totalPassengers / totalSeats) * 100));

  const handleShareVoucher = (b: TourBooking) => {
    setTourReceiptBooking(b);
    setIsTourReceiptOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-800 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-200 bg-white/15 px-2.5 py-0.5 rounded-full font-mono">
                  🗓️ Departure: {formatDate(batch.departureDate)}
                </span>
                <span className="text-xs bg-sky-500 text-white font-bold px-2 py-0.5 rounded-md">
                  {batch.tourType}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1.5">{batch.title}</h2>
              <p className="text-xs text-sky-100 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> {batch.destination} • {batch.durationDays} Days ({batch.travelMode})
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Seat Progress & PnL Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/20 text-xs">
            <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-xl border border-white/15">
              <span className="text-sky-200 block text-[11px]">Seat Capacity</span>
              <span className="text-base font-bold font-mono">
                {totalPassengers} / {totalSeats} Booked ({percentage}%)
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-xl border border-white/15">
              <span className="text-sky-200 block text-[11px]">Total Revenue</span>
              <span className="text-base font-bold font-mono">{formatCurrency(totalRevenue)}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-xl border border-white/15">
              <span className="text-sky-200 block text-[11px]">Hotel & Transport Cost</span>
              <span className="text-base font-bold font-mono text-rose-200">
                {formatCurrency(totalTourExpenses)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-xl border border-white/15">
              <span className="text-sky-200 block text-[11px]">Estimated Tour Profit</span>
              <span
                className={`text-base font-bold font-mono ${
                  netTourProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {formatCurrency(netTourProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" /> Booked Passengers Manifest ({bookings.length} Bookings • {totalPassengers} Pax)
            </h3>
            <button
              onClick={() => onAddBookingToBatch(batch.id)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> + Book Passenger for this Date
            </button>
          </div>

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-8 text-center space-y-2">
              <Luggage className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-xs font-bold text-zinc-700">No Bookings in this Tour Folder yet</p>
              <p className="text-[11px] text-zinc-500">
                Click "+ Book Passenger" to add customer bookings to this departure date!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-zinc-100 rounded text-zinc-700">
                        {b.bookingNumber}
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900">{b.customerName}</span>
                      <span className="text-xs text-zinc-500 font-mono">({b.customerPhone})</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          b.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.paymentStatus === 'Paid' ? 'Paid' : `Advance: ₹${b.advancePaid}`}
                      </span>
                      <button
                        onClick={() => openEditTourBookingModal(b)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleShareVoucher(b)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Slip
                      </button>
                      <button
                        onClick={() => handleDeleteBooking(b.id, b.customerName)}
                        title="Delete Booking"
                        className="p-1 rounded-lg bg-zinc-100 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Members Sub-list */}
                  <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                    <div className="text-[11px] font-bold text-zinc-500 uppercase mb-1.5">
                      Members List ({b.membersCount} Pax)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {b.members.map((m, mi) => (
                        <div key={mi} className="bg-white p-2 rounded border border-zinc-200 flex justify-between">
                          <span className="font-semibold text-zinc-800">
                            {mi + 1}. {m.name} ({m.gender})
                          </span>
                          <span className="text-zinc-500 font-mono">
                            Age: {m.age} {m.seatBerthPreference ? `• ${m.seatBerthPreference}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                    <span className="text-zinc-500">
                      Payment Mode: <strong className="text-zinc-800">{b.paymentMode} ({b.paymentMethod})</strong>
                    </span>
                    <div className="flex items-center gap-4 font-mono">
                      <span>Total: <strong>{formatCurrency(b.totalAmount)}</strong></span>
                      <span className="text-emerald-700">Advance: <strong>{formatCurrency(b.advancePaid)}</strong></span>
                      {b.pendingAmount > 0 && (
                        <span className="text-rose-600 font-bold">Due: {formatCurrency(b.pendingAmount)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tour Expenses Breakdown */}
          {expenses.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-rose-600" /> Tour Expenses Log ({formatCurrency(totalTourExpenses)})
              </h3>
              <div className="divide-y border border-zinc-200 rounded-xl overflow-hidden text-xs">
                {expenses.map((e) => (
                  <div key={e.id} className="p-3 bg-white flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 block">{e.description}</span>
                      <span className="text-zinc-500 text-[11px]">
                        {e.category} • Wallet: {e.walletName} • {formatDate(e.date)}
                      </span>
                    </div>
                    <span className="font-extrabold text-rose-600 font-mono">
                      {formatCurrency(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
