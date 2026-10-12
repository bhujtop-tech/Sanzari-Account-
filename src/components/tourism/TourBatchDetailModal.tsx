import React from 'react';
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
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBooking } from '../../types';

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
    deleteTourBatchById,
  } = useData();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header - Crisp White Background, Black Text & Black Borders (Zero Blue) */}
        <div className="bg-white p-5 sm:p-6 text-zinc-950 shrink-0 border-b-2 border-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-900 bg-zinc-100 border border-zinc-300 px-2.5 py-0.5 rounded-full">
                  🗓️ Departure: {formatDate(batch.departureDate)}
                </span>
                <span className="text-[11px] bg-zinc-100 border border-zinc-300 text-zinc-900 font-bold px-2 py-0.5 rounded-md">
                  {batch.tourType}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1.5 text-zinc-950 tracking-tight">{batch.title}</h2>
              <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-zinc-900" /> {batch.destination} • {batch.durationDays} Days ({batch.travelMode})
              </p>
            </div>

            {/* Header Right: Delete Folder & Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteBatch}
                title="Delete Tour Folder"
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
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

          {/* Seat Progress & PnL Bar - Crisp White & Black Style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-zinc-200 text-xs">
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl">
              <span className="text-zinc-500 block text-[11px] font-medium">Seat Capacity</span>
              <span className="text-sm sm:text-base font-black text-zinc-950">
                {totalPassengers} / {totalSeats} Booked ({percentage}%)
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl">
              <span className="text-zinc-500 block text-[11px] font-medium">Total Revenue</span>
              <span className="text-sm sm:text-base font-black text-zinc-950">{formatCurrency(totalRevenue)}</span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl">
              <span className="text-zinc-500 block text-[11px] font-medium">Hotel & Transport Cost</span>
              <span className="text-sm sm:text-base font-black text-rose-700">
                {formatCurrency(totalTourExpenses)}
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl">
              <span className="text-zinc-500 block text-[11px] font-medium">Estimated Tour Profit</span>
              <span
                className={`text-sm sm:text-base font-black ${
                  netTourProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatCurrency(netTourProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content - Crisp White Background & Dark Text */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0 bg-white text-zinc-900">
          {/* Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-zinc-950" /> Booked Passengers Manifest ({bookings.length} Bookings • {totalPassengers} Pax)
            </h3>
            <button
              onClick={() => onAddBookingToBatch(batch.id)}
              className="px-3.5 py-2 bg-zinc-950 hover:bg-black text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer w-fit"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> + Book Passenger for this Date
            </button>
          </div>

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center space-y-2">
              <Luggage className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-xs font-bold text-zinc-900">No Bookings in this Tour Folder yet</p>
              <p className="text-[11px] text-zinc-500">
                Click "+ Book Passenger" to add customer bookings to this departure date!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs hover:border-zinc-400 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-zinc-100 rounded-lg text-zinc-800 border border-zinc-200">
                        {b.bookingNumber}
                      </span>
                      <span className="text-sm font-black text-zinc-950">{b.customerName}</span>
                      <span className="text-xs text-zinc-500 font-mono font-medium">({b.customerPhone})</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${
                          b.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {b.paymentStatus === 'Paid' ? 'Paid' : `Advance: ₹${b.advancePaid}`}
                      </span>
                      <button
                        onClick={() => openEditTourBookingModal(b)}
                        className="px-2.5 py-1 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleShareVoucher(b)}
                        className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
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
                        <div key={mi} className="bg-white p-2 rounded-lg border border-zinc-200 flex justify-between shadow-2xs">
                          <span className="font-bold text-zinc-900">
                            {mi + 1}. {m.name} ({m.gender})
                          </span>
                          <span className="text-zinc-500 font-mono font-medium">
                            Age: {m.age || 'Adult'} {m.seatBerthPreference ? `• ${m.seatBerthPreference}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                    <span className="text-zinc-500 font-medium">
                      Payment Mode: <strong className="text-zinc-900">{b.paymentMode} ({b.paymentMethod})</strong>
                    </span>
                    <div className="flex items-center gap-4 font-mono">
                      <span>Total: <strong className="text-zinc-950 font-black">{formatCurrency(b.totalAmount)}</strong></span>
                      <span className="text-emerald-700">Advance: <strong className="font-black">{formatCurrency(b.advancePaid)}</strong></span>
                      {b.pendingAmount > 0 && (
                        <span className="text-rose-600 font-black">Due: {formatCurrency(b.pendingAmount)}</span>
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
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-rose-600" /> Tour Expenses Log ({formatCurrency(totalTourExpenses)})
              </h3>
              <div className="divide-y border border-zinc-200 rounded-2xl overflow-hidden text-xs bg-white shadow-2xs">
                {expenses.map((e) => (
                  <div key={e.id} className="p-3 bg-white flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 block">{e.description}</span>
                      <span className="text-zinc-500 text-[11px] font-medium">
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
