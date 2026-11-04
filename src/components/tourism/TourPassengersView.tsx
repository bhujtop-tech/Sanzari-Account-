import React, { useState, useMemo } from 'react';
import { Users, Search, FileDown, Folder } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourPDFExportModal } from './TourPDFExportModal';

export const TourPassengersView: React.FC = () => {
  const { tourBookings, tourBatches, formatCurrency } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

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
      <div className="bg-zinc-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-zinc-850 relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Customers &amp; Passengers
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Travelers Directory &amp; Group Manifest
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              All booked passengers, ages, train class, customer contact numbers, and booking payment status across tour groups.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleExportGroupPDF}
              disabled={filteredBookings.length === 0}
              className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <FileDown size={16} className="stroke-[2.5]" />
              <span>Download Group PDF ({filteredBookings.length} Bookings)</span>
            </button>

            <div className="bg-zinc-900 px-4 py-2.5 rounded-2xl border border-zinc-800 text-center shrink-0">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">Total Travelers</div>
              <div className="text-xl font-black font-mono text-white">{allPassengers.length} Members</div>
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

      {/* Passengers Table */}
      <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
                      <td className="p-3.5 font-bold text-zinc-950">{p.passengerName}</td>
                      <td className="p-3.5 font-mono text-zinc-700">{p.age ? `${p.age} yrs` : '-'}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-zinc-900">
                          {p.customerName}{' '}
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
    </div>
  );
};

