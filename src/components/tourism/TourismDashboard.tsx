import React from 'react';
import {
  Luggage,
  Calendar,
  Users,
  CreditCard,
  Plus,
  FolderPlus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Train,
  Share2,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
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
    tourExpenses,
    totalBalance,
    thisMonthTourRevenue,
    thisMonthTourAdvance,
    thisMonthTourPending,
    thisMonthTourExpenses,
    totalTourPassengers,
    formatCurrency,
    formatDate,
    setIsAddTourBookingOpen,
    setIsAddTourBatchOpen,
    setIsAddTourExpenseOpen,
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
      {/* Welcome & Business Switcher Banner - Signature Black Theme */}
      <div className="bg-zinc-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-zinc-850 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-zinc-800/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sanzari Tours & Travels
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Tour & Group Booking Manager
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-lg">
              Manage tour dates (e.g. 10 Oct Kashmir), passenger manifests with member ages, advance payments, and instant WhatsApp vouchers.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddTourBookingOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-black/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>+ New Booking</span>
            </button>
            <button
              onClick={() => setIsAddTourBatchOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-700/80 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <FolderPlus size={15} />
              <span>+ New Tour Date</span>
            </button>
          </div>
        </div>
      </div>

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
      <div className="bg-amber-50/50 rounded-2xl border border-amber-200/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-800" />
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Tour Accounts &amp; Wallets
            </h3>
          </div>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
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
                className="p-3 bg-white rounded-xl border border-amber-200/90 hover:border-amber-400 shadow-2xs flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                    style={{ backgroundColor: w.color || '#f59e0b' }}
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

      {/* Quick Action Buttons - Signature Black Style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setIsAddTourBookingOpen(true)}
          className="p-4 rounded-2xl bg-zinc-950 hover:bg-black text-white shadow-md shadow-zinc-950/15 border border-zinc-850 flex flex-col justify-between transition-all active:scale-95 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider block">New Booking</span>
            <span className="text-[11px] text-zinc-400 font-medium">Add members, seats & advance</span>
          </div>
        </button>

        <button
          onClick={() => setIsAddTourBatchOpen(true)}
          className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-950 text-white shadow-md border border-zinc-800 flex flex-col justify-between transition-all active:scale-95 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FolderPlus className="w-5 h-5 text-zinc-200" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider block">New Tour Date</span>
            <span className="text-[11px] text-zinc-400 font-medium">Create 10 Oct batch folder</span>
          </div>
        </button>

        <button
          onClick={() => setIsAddTourExpenseOpen(true)}
          className="p-4 rounded-2xl bg-white hover:bg-zinc-50 text-zinc-900 shadow-sm border border-zinc-200 flex flex-col justify-between transition-all active:scale-95 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider block">Tour Expense</span>
            <span className="text-[11px] text-zinc-500 font-medium">Hotel, tickets & bus payouts</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('accounts')}
          className="p-4 rounded-2xl bg-white hover:bg-zinc-50 text-zinc-900 shadow-sm border border-zinc-200 flex flex-col justify-between transition-all active:scale-95 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider block">Wallets & Cash</span>
            <span className="text-[11px] text-zinc-500 font-medium">{formatCurrency(totalBalance)} total</span>
          </div>
        </button>
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
                Tour Date Folders & Batches
              </h2>
              <p className="text-xs text-zinc-500">Upcoming departures with seat occupancy</p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('stock')}
            className="text-xs font-bold text-zinc-900 hover:text-black flex items-center gap-1"
          >
            View All Dates &rarr;
          </button>
        </div>

        {/* Batches Cards */}
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
                className="relative bg-white rounded-3xl border-2 border-amber-200/90 hover:border-amber-400 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Folder Header Band */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-700 px-3.5 py-2 text-white flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span>📂</span> Tour Folder
                  </span>
                  <span className="text-[10px] font-extrabold bg-black/20 px-2 py-0.5 rounded-full border border-white/20">
                    {batch.tourType}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Big Date Callout Badge */}
                    <div className="px-3 py-1.5 rounded-2xl bg-zinc-950 text-white text-center shadow-md border border-zinc-800 shrink-0">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 block leading-tight">
                        {monthShort}
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white block leading-none my-0.5">
                        {dayNum}
                      </span>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-sm font-black text-zinc-950 tracking-tight flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{batch.destination}</span>
                      </h3>
                      <p className="text-xs font-bold text-zinc-700 mt-0.5 line-clamp-1">{batch.title}</p>
                    </div>
                  </div>

                  {/* Multi-Tier Prices Preview */}
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[9px] text-zinc-500 block font-medium">🚆 AC Train</span>
                      <span className="font-mono font-bold text-zinc-950">
                        {batch.priceAcTrain ? formatCurrency(batch.priceAcTrain) : formatCurrency(batch.basePricePerPerson || 16000)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block font-medium">✈️ Flight</span>
                      <span className="font-mono font-bold text-sky-700">
                        {batch.priceFlight ? formatCurrency(batch.priceFlight) : '₹22,000'}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-600">
                      <span>Booked Seats</span>
                      <span className="font-mono text-zinc-900">
                        {bookedSeats} / {totalSeats} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-400 font-mono text-[11px]">
                    Child: {batch.priceChildHalf ? formatCurrency(batch.priceChildHalf) : '₹7,000'}
                  </span>
                  <button
                    onClick={() => {
                      onSelectBatch(batch.id);
                    }}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" /> + Book
                  </button>
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
