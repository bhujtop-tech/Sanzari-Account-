import React, { useState, useMemo } from 'react';
import {
  IndianRupee,
  Search,
  Folder,
  Sliders,
  Phone,
  MapPin,
  Luggage,
  Calendar,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBooking, TourMember } from '../../types';
import { PricingDiscountSettingsPanel } from './PricingDiscountSettingsPanel';

export const isBillableForCommission = (member: TourMember): boolean => {
  const ageStr = String(member?.age ?? '').trim();
  if (ageStr === '') return true; // default adult
  const ageNum = Number(ageStr);
  if (isNaN(ageNum) || ageNum < 0) return true;
  return ageNum >= 5; // < 5 yrs (infant 0% fare) is excluded, 5+ yrs (50%, 82%, 100% fare) included
};

export const getBillablePaxCount = (booking: TourBooking): number => {
  const members = Array.isArray(booking.members) ? booking.members : [];
  if (members.length === 0) {
    return Math.max(1, (booking.adultsCount || 0) + (booking.kidsCount || 0));
  }
  return members.filter(isBillableForCommission).length;
};

export const resolveBookedBy = (b: TourBooking): string => {
  if (b.bookedBy && b.bookedBy.trim()) {
    return b.bookedBy.trim();
  }
  const wallet = (b.walletName || '').toLowerCase();
  const notes = (b.specialNotes || '').toLowerCase();
  if (wallet.includes('mustak') || notes.includes('mustak')) {
    return 'Mustak';
  }
  return 'Rizwan';
};

export const TourCommissionView: React.FC = () => {
  const { tourBookings, tourBatches, tourPricingSettings, formatCurrency } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [personFilter, setPersonFilter] = useState<'Mustak' | 'Rizwan' | 'ALL'>('Mustak');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [expandedBookingIds, setExpandedBookingIds] = useState<Record<string, boolean>>({});

  const ratePerPax = tourPricingSettings?.commissionRatePerPax ?? 200;

  // Filter bookings by Person and Batch
  const filteredBookings = useMemo(() => {
    return tourBookings.filter((b) => {
      const bBy = resolveBookedBy(b).toLowerCase();
      if (personFilter === 'Mustak' && !bBy.includes('mustak')) return false;
      if (personFilter === 'Rizwan' && !bBy.includes('rizwan')) return false;

      if (selectedBatchId !== 'ALL' && b.tourBatchId !== selectedBatchId) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cName = (b.customerName || '').toLowerCase();
        const cPhone = String(b.customerPhone || '');
        const cDest = (b.destination || '').toLowerCase();
        const bNum = (b.bookingNumber || '').toLowerCase();
        return cName.includes(q) || cPhone.includes(q) || cDest.includes(q) || bNum.includes(q);
      }

      return true;
    });
  }, [tourBookings, personFilter, selectedBatchId, searchQuery]);

  // Overall Statistics for selected Person / Filter
  const stats = useMemo(() => {
    let totalBookings = 0;
    let totalPax = 0;
    let totalBillablePax = 0;
    let totalCommission = 0;

    filteredBookings.forEach((b) => {
      totalBookings += 1;
      totalPax += b.membersCount || (b.members?.length || 1);
      const billable = getBillablePaxCount(b);
      totalBillablePax += billable;
      totalCommission += billable * ratePerPax;
    });

    return {
      totalBookings,
      totalPax,
      totalBillablePax,
      totalCommission,
    };
  }, [filteredBookings, ratePerPax]);

  const toggleExpand = (id: string) => {
    setExpandedBookingIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4 pb-48 sm:pb-24">
      {/* Settings Modal if open */}
      {showSettingsModal && (
        <PricingDiscountSettingsPanel isModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Clean Page Title Bar (Same as Wallets & Accounts) */}
      <div className="flex items-start justify-between gap-3 flex-wrap bg-white p-2 rounded-2xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 inline-flex">
              <IndianRupee size={20} className="stroke-[2.5]" />
            </span>
            <span>Tour Commission Report</span>
          </h2>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Calculate booking commission per passenger (5+ yrs billable pax, configurable rate)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-amber-300 font-extrabold text-xs flex items-center gap-1.5 border border-zinc-800 shadow-xs transition-transform active:scale-95 cursor-pointer"
        >
          <Sliders size={14} />
          <span>Configure Rate (₹{ratePerPax}/Pax)</span>
        </button>
      </div>

      {/* Sleek Dark Summary Banner (Matches Tour Wallets Hero Card) */}
      <div className="bg-zinc-950 text-white p-4 sm:p-6 rounded-3xl border-2 border-zinc-900 shadow-xl relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] uppercase font-black tracking-wider">
                {personFilter === 'ALL' ? '📂 All Bookings' : `👤 ${personFilter} Commission`}
              </span>
              <span className="text-xs font-mono text-zinc-400">Rate: ₹{ratePerPax} / Pax</span>
            </div>
            <div className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-amber-400">
              {formatCurrency(stats.totalCommission)}
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              {stats.totalBillablePax} Billable Pax (5+ Yrs) across {stats.totalBookings} Confirmed Bookings
            </p>
          </div>

          {/* Quick Booked By Filter Selector Pills inside Hero Card */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
            <button
              onClick={() => setPersonFilter('Mustak')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                personFilter === 'Mustak'
                  ? 'bg-amber-400 text-zinc-950 shadow-md border border-amber-500'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <UserCheck size={14} />
              <span>Mustak</span>
            </button>
            <button
              onClick={() => setPersonFilter('Rizwan')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                personFilter === 'Rizwan'
                  ? 'bg-blue-600 text-white shadow-md border border-blue-500'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <UserCheck size={14} />
              <span>Rizwan</span>
            </button>
            <button
              onClick={() => setPersonFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                personFilter === 'ALL'
                  ? 'bg-white text-zinc-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <span>All ({tourBookings.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Clean Light Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">Total Commission</span>
          <span className="text-base sm:text-xl font-black text-amber-600 font-mono block mt-0.5 truncate">
            {formatCurrency(stats.totalCommission)}
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">Billable Pax (≥5 Yrs)</span>
          <span className="text-base sm:text-xl font-black text-zinc-950 font-mono block mt-0.5 truncate">
            {stats.totalBillablePax} Pax
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">Total Bookings</span>
          <span className="text-base sm:text-xl font-black text-zinc-950 font-mono block mt-0.5 truncate">
            {stats.totalBookings}
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">Rate Per Pax</span>
          <span className="text-base sm:text-xl font-black text-emerald-700 font-mono block mt-0.5 truncate">
            ₹{ratePerPax} / Pax
          </span>
        </div>
      </div>

      {/* Search & Folder Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search customer, phone, destination or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950 font-medium"
          />
        </div>

        <div className="relative">
          <Folder className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full sm:w-auto pl-8 pr-7 py-2 text-xs font-black bg-zinc-100 border-2 border-zinc-900 rounded-xl text-zinc-950 focus:outline-none cursor-pointer"
          >
            <option value="ALL">📂 All Tour Folders</option>
            {tourBatches.map((b) => (
              <option key={b.id} value={b.id}>
                📂 {b.title} ({b.destination})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Commission Breakdown List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-900 p-10 text-center space-y-2">
          <Luggage className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-black text-zinc-900">No Bookings Found for {personFilter}</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            There are no tour bookings tagged as booked by &quot;{personFilter}&quot;.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
          {/* Mobile View: Compact Single-Line Expandable List */}
          <div className="sm:hidden divide-y divide-zinc-200">
            {filteredBookings.map((b) => {
              const billableCount = getBillablePaxCount(b);
              const totalPax = b.membersCount || b.members?.length || 1;
              const commAmount = billableCount * ratePerPax;
              const bookedByPerson = resolveBookedBy(b);
              const isExpanded = Boolean(expandedBookingIds[b.id]);

              return (
                <div key={b.id} className="bg-white">
                  {/* Single Line Closed Card */}
                  <div
                    onClick={() => toggleExpand(b.id)}
                    className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-zinc-50 active:bg-zinc-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0">
                        {b.bookingNumber}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-zinc-950 truncate">
                            {b.customerName}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                              bookedByPerson.toLowerCase().includes('mustak')
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            👤 {bookedByPerson}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium truncate">
                          📍 {b.destination} • {totalPax} Pax ({billableCount} Billable)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        +{formatCurrency(commAmount)}
                      </span>
                      <span className="text-zinc-400 text-xs">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Expanded Details */}
                  {isExpanded && (
                    <div className="p-3 bg-zinc-50 border-t border-zinc-200 space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white p-2 rounded-xl border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Contact Number</span>
                          <a
                            href={`tel:${b.customerPhone}`}
                            className="text-blue-600 font-mono font-bold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            📞 {b.customerPhone}
                          </a>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Departure Date</span>
                          <span className="font-bold text-zinc-900 block mt-0.5">{b.tourDate}</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-zinc-200 flex items-center justify-between text-[11px] font-mono">
                        <div>
                          <span className="text-zinc-500 text-[10px] uppercase font-bold block">Commission Formula</span>
                          <span className="font-bold text-zinc-900">{billableCount} pax × ₹{ratePerPax}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-800 text-[10px] uppercase font-bold block">Total Earned</span>
                          <span className="font-black text-amber-700 text-sm">{formatCurrency(commAmount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Data Grid View (Hidden on Mobile) */}
          <div className="hidden sm:block overflow-x-auto">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-zinc-100 border-b-2 border-zinc-900 text-[11px] font-black uppercase tracking-wider text-zinc-700">
              <div className="col-span-2">Booking &amp; Date</div>
              <div className="col-span-3">Customer Info</div>
              <div className="col-span-2">Destination</div>
              <div className="col-span-2 text-center">Pax Breakdown</div>
              <div className="col-span-3 text-right">Commission Earned</div>
            </div>

            <div className="divide-y divide-zinc-200">
              {filteredBookings.map((b) => {
                const billableCount = getBillablePaxCount(b);
                const totalPax = b.membersCount || b.members?.length || 1;
                const infantCount = Math.max(0, totalPax - billableCount);
                const commAmount = billableCount * ratePerPax;
                const bookedByPerson = resolveBookedBy(b);

                return (
                  <div
                    key={b.id}
                    className="p-3.5 sm:p-4 hover:bg-zinc-50 transition-colors grid grid-cols-12 gap-3 items-center"
                  >
                    {/* Booking Code & Date */}
                    <div className="col-span-2">
                      <span className="text-xs font-mono font-black text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                        {b.bookingNumber}
                      </span>
                      <div className="text-[10px] text-zinc-500 font-bold mt-1 flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{b.tourDate}</span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="col-span-3">
                      <h4 className="text-sm font-black text-zinc-950 flex items-center gap-1.5">
                        <span>{b.customerName}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                            bookedByPerson.toLowerCase().includes('mustak')
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}
                        >
                          👤 {bookedByPerson}
                        </span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-zinc-600 mt-0.5">
                        <a href={`tel:${b.customerPhone}`} className="font-bold hover:underline flex items-center gap-1">
                          <Phone size={11} className="text-zinc-900" />
                          <span>{b.customerPhone}</span>
                        </a>
                        {b.city && <span className="text-[10px] text-zinc-500">• {b.city}</span>}
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="col-span-2">
                      <div className="text-xs font-black text-zinc-950 flex items-center gap-1">
                        <MapPin size={12} className="text-zinc-900" />
                        <span>{b.destination}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">
                        {b.travelClass}
                      </span>
                    </div>

                    {/* Pax Breakdown */}
                    <div className="col-span-2 text-center">
                      <div className="inline-flex items-center gap-1 flex-wrap justify-center">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-900 text-white font-black text-[11px]">
                          {totalPax} Total Pax
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px]">
                          {billableCount} Pax (≥5 yrs)
                        </span>
                        {infantCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 text-[9px] font-bold">
                            {infantCount} Infant (&lt;5y)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Commission Calculation & Total */}
                    <div className="col-span-3 text-right">
                      <div className="text-[11px] font-bold text-zinc-600 font-mono">
                        {billableCount} pax × ₹{ratePerPax}
                      </div>
                      <strong className="text-sm sm:text-base font-black text-amber-700 font-mono">
                        {formatCurrency(commAmount)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
