import React, { useState, useMemo } from 'react';
import { Users, Search, FileDown, Folder, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourPDFExportModal } from './TourPDFExportModal';

export const TourPassengersView: React.FC = () => {
  const { tourBookings, tourBatches, formatCurrency } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const copyNameToClipboard = (e: React.MouseEvent, rawName?: string) => {
    e.stopPropagation();
    const clean = String(rawName || '').trim();
    if (!clean) return;
    navigator.clipboard.writeText(clean).catch(() => {});
    setCopiedName(clean);
    window.setTimeout(() => {
      setCopiedName((prev) => (prev === clean ? null : prev));
    }, 1600);
  };

  const filteredBookings = useMemo(() => {
    if (selectedBatchId === 'ALL') return tourBookings;
    return tourBookings.filter((b) => b.tourBatchId === selectedBatchId);
  }, [tourBookings, selectedBatchId]);

  // Flatten all passengers from bookings
  const allPassengers = useMemo(() => {
    const list: Array<{
      bookingId: string;
      bookingNumber: string;
      destination: string;
      tourDate: string;
      customerName: string;
      customerPhone: string;
      passengerName: string;
      age: number | string;
      travelClass: string;
      totalAmount: number;
      advancePaid: number;
      dueAmount: number;
    }> = [];

    filteredBookings.forEach((b) => {
      const tot = Number(b.totalAmount || 0);
      const adv = Number(b.advancePaid || 0);
      const due = Math.max(0, tot - adv);

      b.members.forEach((m) => {
        list.push({
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          destination: b.destination,
          tourDate: b.tourDate,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          passengerName: m.name,
          age: m.age,
          travelClass: b.travelClass,
          totalAmount: tot,
          advancePaid: adv,
          dueAmount: due,
        });
      });
    });

    return list;
  }, [filteredBookings]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allPassengers.filter(
      (p) =>
        p.passengerName.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.customerPhone.includes(q) ||
        p.destination.toLowerCase().includes(q) ||
        p.bookingNumber.toLowerCase().includes(q)
    );
  }, [allPassengers, searchQuery]);

  const handleExportGroupPDF = () => {
    setIsPDFModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-36 sm:pb-32">
      {/* Top Banner - Signature Black Theme */}
      <div className="bg-zinc-950 rounded-3xl p-4 sm:p-7 text-white shadow-xl border border-zinc-850 relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Customers &amp; Passengers
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
              Travelers Directory &amp; Group Manifest
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl hidden sm:block">
              All booked passengers, ages, train class, customer contact numbers, and booking payment status across tour groups.
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleExportGroupPDF}
              disabled={filteredBookings.length === 0}
              className="flex-1 sm:flex-initial justify-center px-4 py-2.5 sm:py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <FileDown size={16} className="stroke-[2.5] shrink-0" />
              <span>Group PDF ({filteredBookings.length})</span>
            </button>

            <div className="bg-zinc-900 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-zinc-800 text-center shrink-0">
              <div className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold">Travelers</div>
              <div className="text-base sm:text-xl font-black font-mono tabular-nums text-white whitespace-nowrap">{allPassengers.length} Pax</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Group Filter */}
      <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search passenger name, customer name, phone, or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 font-medium"
          />
        </div>

        <div className="relative">
          <Folder className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full sm:w-auto pl-8 pr-7 py-2 text-xs font-black bg-zinc-100 border-2 border-zinc-900 rounded-xl text-zinc-950 focus:outline-none cursor-pointer"
          >
            <option value="ALL">📂 All Tour Groups ({tourBookings.length} Bookings)</option>
            {tourBatches.map((batch) => {
              const cnt = tourBookings.filter((b) => b.tourBatchId === batch.id).length;
              return (
                <option key={batch.id} value={batch.id}>
                  📂 {batch.title} - {batch.destination} ({cnt} Bookings)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Passengers View: Mobile List (Single-Line Expandable) & Desktop Table */}
      <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
        {/* Mobile View: Compact Expandable Single-Line Rows */}
        <div className="sm:hidden divide-y divide-zinc-200">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 font-medium">
              No passengers found.
            </div>
          ) : (
            filtered.map((p, idx) => {
              const isPaid = p.dueAmount === 0 && p.totalAmount > 0;
              const expandKey = `${p.bookingId}-${idx}`;
              const isExpanded = Boolean(expandedIds[expandKey]);

              return (
                <div key={expandKey} className="bg-white">
                  {/* Single-Line Compact Mobile Row */}
                  <div
                    onClick={() =>
                      setExpandedIds((prev) => ({ ...prev, [expandKey]: !prev[expandKey] }))
                    }
                    className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-zinc-50 active:bg-zinc-100 transition-colors select-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0">
                          {idx + 1}.
                        </span>
                        <span
                          onClick={(e) => copyNameToClipboard(e, p.passengerName)}
                          onDoubleClick={(e) => copyNameToClipboard(e, p.passengerName)}
                          title="Click to copy name"
                          className={`font-black text-[14px] truncate cursor-pointer select-none transition-colors ${
                            copiedName === String(p.passengerName || '').trim()
                              ? 'text-emerald-600'
                              : 'text-zinc-950'
                          }`}
                        >
                          {p.passengerName}
                        </span>
                        {p.age && (
                          <span className="text-[11px] font-mono font-semibold text-zinc-500 shrink-0">
                            {p.age}y
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5 truncate">
                        <span className="font-bold text-zinc-800 truncate">{p.destination}</span>
                        <span className="text-zinc-300">·</span>
                        <span className="truncate">{p.customerName}</span>
                        <span className="text-zinc-300">·</span>
                        <span className="font-semibold text-zinc-700 shrink-0">{p.travelClass}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[11px] font-black font-mono tabular-nums whitespace-nowrap ${
                          isPaid ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isPaid ? 'Paid' : formatCurrency(p.dueAmount)}
                      </span>
                      <span className="w-7 h-7 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 flex items-center justify-center">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Sleek Divider Drawer */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-2.5 bg-zinc-50/80 border-t border-zinc-200 space-y-2.5 text-xs">
                      <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
                        <div className="px-3 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Booked By</span>
                            <span className="text-xs font-black text-zinc-950 truncate block">{p.customerName}</span>
                          </div>
                          <a
                            href={`tel:${p.customerPhone}`}
                            className="h-8 px-3 rounded-lg bg-zinc-950 text-white text-[11px] font-black flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Phone size={12} className="shrink-0" />
                            <span>Call</span>
                          </a>
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-zinc-500 font-semibold">Ref &amp; Date</span>
                          <span className="font-mono font-bold text-zinc-900 whitespace-nowrap">
                            {p.bookingNumber} · {p.tourDate}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 divide-x divide-zinc-200 bg-white rounded-xl border border-zinc-200 py-2 text-center">
                        <div className="px-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase text-zinc-500 block">Total</span>
                          <span className="text-xs font-black font-mono tabular-nums text-zinc-950 whitespace-nowrap block truncate">
                            {formatCurrency(p.totalAmount)}
                          </span>
                        </div>
                        <div className="px-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase text-emerald-700 block">Advance</span>
                          <span className="text-xs font-black font-mono tabular-nums text-emerald-700 whitespace-nowrap block truncate">
                            {formatCurrency(p.advancePaid)}
                          </span>
                        </div>
                        <div className="px-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase text-rose-600 block">Baaki Due</span>
                          <span className="text-xs font-black font-mono tabular-nums text-rose-600 whitespace-nowrap block truncate">
                            {formatCurrency(p.dueAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Data Table (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-700 font-black border-b-2 border-zinc-900 uppercase text-[10px] tracking-wider">
                <th className="p-3.5 text-center w-12">#</th>
                <th className="p-3.5">Passenger Name</th>
                <th className="p-3.5">Age</th>
                <th className="p-3.5">Booked By &amp; Contact</th>
                <th className="p-3.5">Tour &amp; Date</th>
                <th className="p-3.5">Train</th>
                <th className="p-3.5 text-right">Booking Payment (Adv / Baaki)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium text-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    No passengers found.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const isPaid = p.dueAmount === 0 && p.totalAmount > 0;
                  return (
                    <tr key={`${p.bookingId}-${idx}`} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="p-3.5 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-zinc-950">
                        <span
                          onClick={(e) => copyNameToClipboard(e, p.passengerName)}
                          onDoubleClick={(e) => copyNameToClipboard(e, p.passengerName)}
                          title="Click or Double-click to copy passenger name"
                          className={`cursor-pointer select-none transition-colors ${
                            copiedName === String(p.passengerName || '').trim()
                              ? 'text-emerald-600'
                              : 'hover:text-emerald-700'
                          }`}
                        >
                          {p.passengerName}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-700">{p.age ? `${p.age} yrs` : '-'}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-zinc-900">
                          <span
                            onClick={(e) => copyNameToClipboard(e, p.customerName)}
                            onDoubleClick={(e) => copyNameToClipboard(e, p.customerName)}
                            title="Click or Double-click to copy customer name"
                            className={`cursor-pointer select-none transition-colors ${
                              copiedName === String(p.customerName || '').trim()
                                ? 'text-emerald-600'
                                : 'hover:text-emerald-700'
                            }`}
                          >
                            {p.customerName}
                          </span>{' '}
                          <span className="text-[10px] font-mono text-zinc-500">({p.bookingNumber})</span>
                        </div>
                        <a href={`tel:${p.customerPhone}`} className="text-[11px] text-zinc-500 hover:text-zinc-900">
                          {p.customerPhone}
                        </a>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-zinc-900">{p.destination}</div>
                        <div className="text-[11px] text-zinc-500">{p.tourDate}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/60 text-[10px] font-bold">
                          {p.travelClass}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        <div className="text-[11px] text-emerald-700 font-bold">
                          Adv: {formatCurrency(p.advancePaid)} / {formatCurrency(p.totalAmount)}
                        </div>
                        {isPaid ? (
                          <span className="text-[10px] font-black text-emerald-700">✅ FULL PAID</span>
                        ) : (
                          <span className="text-[10px] font-black text-rose-600">
                            Baaki: {formatCurrency(p.dueAmount)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TourPDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        initialBatchId={selectedBatchId}
      />

      {copiedName && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-black shadow-xl border border-emerald-500/60 flex items-center gap-2 pointer-events-none animate-fade-in">
          <span className="text-emerald-400">✓ Copied:</span>
          <span>{copiedName}</span>
        </div>
      )}
    </div>
  );
};

