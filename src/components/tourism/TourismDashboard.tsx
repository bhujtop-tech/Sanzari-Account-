import React from 'react';
import {
  Luggage,
  Calendar,
  Users,
  ArrowDownLeft,
  ChevronRight,
  Share2,
  MapPin,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBatch, TourBooking } from '../../types';

interface TourismDashboardProps {
  onNavigateTab: (tab: any) => void;
  onSelectBatch: (batchId: string) => void;
}

export const TourismDashboard: React.FC<TourismDashboardProps> = ({
  onNavigateTab,
  onSelectBatch,
}) => {
  const {
    wallets,
    setSelectedWalletId,
    tourBatches,
    tourBookings,
    totalBalance,
    thisMonthTourRevenue,
    thisMonthTourAdvance,
    thisMonthTourPending,
    totalTourPassengers,
    formatCurrency,
    formatDate,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
  } = useData();

  // Upcoming batches
  const upcomingBatches = tourBatches.slice(0, 3);
  const recentBookings = tourBookings.slice(0, 5);

  const handleShareBooking = (b: TourBooking) => {
    setTourReceiptBooking(b);
    setIsTourReceiptOpen(true);
  };

  return (
    <div className="space-y-6 pb-48 sm:pb-24">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Booked Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Tour Bookings (Month)</span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center font-bold">
              <Luggage className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 font-mono">
            {formatCurrency(thisMonthTourRevenue)}
          </div>
          <div className="text-[11px] text-zinc-500 font-medium mt-1 flex items-center gap-1">
            <span className="font-bold text-zinc-900">{tourBookings.length}</span> Total Bookings
          </div>
        </div>

        {/* Advance Collected */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Advance Collected</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {formatCurrency(thisMonthTourAdvance)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            Received in Wallets
          </div>
        </div>

        {/* Pending Customer Dues */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Remaining Dues</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
            {formatCurrency(thisMonthTourPending)}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">
            Pending from Travelers
          </div>
        </div>

        {/* Total Passengers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-900 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Total Travelers</span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 font-mono">
            {totalTourPassengers} Pax
          </div>
          <div className="text-[11px] text-zinc-500 font-medium mt-1">
            Across confirmed tours
          </div>
        </div>
      </div>

      {/* Tour Dedicated Wallets Strip */}
      <div className="bg-zinc-100/80 rounded-2xl border border-zinc-200/90 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-zinc-700" />
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Tour Accounts &amp; Wallets
            </h3>
          </div>
          <span className="text-[10px] font-bold text-zinc-600 bg-zinc-200/80 px-2 py-0.5 rounded-full">
            Separate Tour Accounts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {wallets
            .filter((w) => w.scope === 'tourism' || w.name.includes('(Tour)'))
            .map((w) => (
              <div
                key={w.id}
                onClick={() => {
                  setSelectedWalletId(w.id);
                  onNavigateTab('accounts');
                }}
                className="p-3 bg-white rounded-xl border border-zinc-200 hover:border-zinc-400 shadow-2xs flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                    style={{ backgroundColor: w.color || '#3b82f6' }}
                  >
                    {w.name.startsWith('Bus') ? '🚌' : w.name.slice(0, 1)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">{w.name}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">Tour Wallet</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-zinc-950 font-mono">
                    {formatCurrency(w.currentBalance)}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Tour Date Folders (Upcoming Batches) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                Tour Date Folders &amp; Batches
              </h2>
              <p className="text-xs text-zinc-500">Upcoming departures with seat occupancy</p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('stock')}
            className="text-xs font-bold text-zinc-900 hover:text-black flex items-center gap-1 cursor-pointer"
          >
            View All Dates &rarr;
          </button>
        </div>

        {/* Batches Cards (Sleek Black Folder Cards - Zero Orange) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingBatches.map((batch) => {
            const bookings = tourBookings.filter((b) => b.tourBatchId === batch.id);
            const bookedSeats = bookings.reduce((sum, b) => sum + (b.membersCount || 1), 0);
            const totalSeats = batch.totalSeats || 30;
            const percentage = Math.min(100, Math.round((bookedSeats / totalSeats) * 100));

            const d = new Date(batch.departureDate);
            const isValid = !isNaN(d.getTime());
            const dayNum = isValid ? String(d.getDate()).padStart(2, '0') : batch.departureDate.split('-')[2] || '10';
            const monthShort = isValid
              ? d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
              : 'OCT';

            return (
              <div
                key={batch.id}
                onClick={() => onSelectBatch(batch.id)}
                className="relative bg-zinc-950 text-white rounded-2xl border border-zinc-800 hover:border-zinc-700 shadow-md transition-all flex flex-col justify-between overflow-hidden group cursor-pointer"
              >
                {/* Folder Header Band - Pure Black & Zinc (No Orange) */}
                <div className="bg-zinc-900 px-3.5 py-2.5 text-white flex items-center justify-between border-b border-zinc-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <span>📂</span> Tour Folder
                  </span>
                  <span className="text-[9px] font-extrabold bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
                    {batch.tourType}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Big Date Callout Badge */}
                    <div className="px-2.5 py-1.5 rounded-xl bg-zinc-900 text-white text-center border border-zinc-800 shrink-0 min-w-[44px]">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block leading-tight">
                        {monthShort}
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white block leading-none my-0.5">
                        {dayNum}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{batch.destination}</span>
                      </h3>
                      <p className="text-xs font-medium text-zinc-400 mt-0.5 line-clamp-1">{batch.title}</p>
                    </div>
                  </div>

                  {/* Multi-Tier Prices Preview */}
                  <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-[11px] grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[9px] text-zinc-500 block font-medium">🚆 AC Train</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {batch.priceAcTrain ? formatCurrency(batch.priceAcTrain) : formatCurrency(batch.basePricePerPerson || 16000)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block font-medium">✈️ Flight</span>
                      <span className="font-mono font-bold text-sky-400">
                        {batch.priceFlight ? formatCurrency(batch.priceFlight) : '₹22,000'}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Booked Seats</span>
                      <span className="font-mono text-zinc-200">
                        {bookedSeats} / {totalSeats} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-400 font-mono text-[11px]">
                    Child: {batch.priceChildHalf ? formatCurrency(batch.priceChildHalf) : '₹7,000'}
                  </span>
                  <div className="text-zinc-300 hover:text-white font-bold text-[11px] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>View Folder</span>
                    <ChevronRight size={13} className="text-zinc-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Tour Bookings */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Luggage className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                Recent Tour Bookings & Slips
              </h2>
              <p className="text-xs text-zinc-500">Customer manifests & advance status</p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('sales')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            All Bookings &rarr;
          </button>
        </div>

        <div className="space-y-2.5">
          {recentBookings.map((b) => (
            <div
              key={b.id}
              className="bg-zinc-50 hover:bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 hover:border-sky-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                    {b.bookingNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {b.paymentStatus === 'Paid' ? 'Paid' : `Advance: ₹${b.advancePaid}`}
                  </span>
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-semibold">
                    {b.travelClass}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900">{b.customerName}</h3>
                  <span className="text-xs text-zinc-500 font-medium">
                    ({b.membersCount} Pax • {b.destination})
                  </span>
                </div>

                <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                  <span>🗓️ Departure: {formatDate(b.tourDate)}</span>
                  {b.pendingAmount > 0 && (
                    <span className="text-rose-600 font-bold">
                      Pending: {formatCurrency(b.pendingAmount)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold">Total</span>
                  <span className="text-sm font-black text-zinc-900 font-mono">
                    {formatCurrency(b.totalAmount)}
                  </span>
                </div>

                <button
                  onClick={() => handleShareBooking(b)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 transition-colors"
                  title="WhatsApp Confirmation Slip"
                >
                  <Share2 className="w-3.5 h-3.5" /> Slip
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
