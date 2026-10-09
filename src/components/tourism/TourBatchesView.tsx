import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderPlus,
  Calendar,
  MapPin,
  Users,
  Train,
  Plus,
  Search,
  IndianRupee,
  ChevronRight,
  Luggage,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBatch } from '../../types';

interface TourBatchesViewProps {
  onSelectBatch?: (batchId: string) => void;
  onBookTour?: (batchId: string) => void;
}

export const TourBatchesView: React.FC<TourBatchesViewProps> = ({
  onSelectBatch,
  onBookTour,
}) => {
  const {
    tourBatches,
    tourBookings,
    formatCurrency,
    formatDate,
    setIsAddTourBatchOpen,
    setIsAddTourBookingOpen,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');

  // Filtered Tour Batches
  const filteredBatches = useMemo(() => {
    return tourBatches.filter((b) => {
      const q = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q) ||
        b.departureDate.includes(q)
      );
    });
  }, [tourBatches, searchQuery]);

  // Calculate stats for a given batch
  const getBatchStats = (batchId: string) => {
    const bookings = tourBookings.filter((bk) => bk.tourBatchId === batchId);
    const totalPassengers = bookings.reduce((sum, bk) => sum + (bk.membersCount || 1), 0);
    const totalRevenue = bookings.reduce((sum, bk) => sum + (bk.totalAmount || 0), 0);
    const totalAdvance = bookings.reduce((sum, bk) => sum + (bk.advancePaid || 0), 0);
    const totalPending = bookings.reduce((sum, bk) => sum + (bk.pendingAmount || 0), 0);
    return { bookingsCount: bookings.length, totalPassengers, totalRevenue, totalAdvance, totalPending };
  };

  return (
    <div className="space-y-5 pb-48 sm:pb-24">
      {/* Top Banner - Signature Black Theme */}
      <div className="bg-zinc-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-zinc-850 relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider">
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              Monthly Tour Folders
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Tour Dates & Folders
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Manage your 3 monthly tour dates (e.g. 10 Oct Kashmir, 24 Oct Manali). Add bookings directly into each tour date folder.
            </p>
          </div>

          <button
            onClick={() => setIsAddTourBatchOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" /> + New Tour Date Folder
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-zinc-200/90 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-zinc-400 ml-2" />
        <input
          type="text"
          placeholder="Search by tour date, destination, or title (e.g. 10 Oct)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs text-zinc-800 focus:outline-none placeholder:text-zinc-400 font-medium"
        />
      </div>

      {/* Folders List (2 cards per row on mobile) */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto">
            <Folder className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Tour Folders Yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Create your first tour date folder (e.g. 10 October Kashmir Tour) to start taking bookings!
          </p>
          <button
            onClick={() => setIsAddTourBatchOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" /> Create Tour Folder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {filteredBatches.map((b) => {
            const stats = getBatchStats(b.id);

            // Parse Date for Folder Highlight
            const d = new Date(b.departureDate);
            const isValid = !isNaN(d.getTime());
            const dayNum = isValid ? String(d.getDate()).padStart(2, '0') : b.departureDate.split('-')[2] || '10';
            const monthShort = isValid
              ? d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
              : 'OCT';
            const yearNum = isValid ? d.getFullYear() : b.departureDate.split('-')[0] || '2026';

            return (
              <div
                key={b.id}
                className="bg-zinc-950 text-white rounded-2xl border border-zinc-800 shadow-lg p-3 sm:p-4 flex flex-col justify-between hover:border-zinc-700 transition-all group"
              >
                <div>
                  {/* Folder Top Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <span>📂</span> Folder
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 truncate max-w-[80px]">
                      {b.tourType}
                    </span>
                  </div>

                  {/* Highlighted Date & Destination */}
                  <div className="flex items-center gap-2 mb-2.5">
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
                      <div className="flex items-center gap-1 text-blue-400">
                        <MapPin size={12} className="shrink-0 stroke-[2.5]" />
                        <h3 className="text-xs sm:text-sm font-extrabold text-white truncate tracking-tight">
                          {b.destination}
                        </h3>
                      </div>
                      <p className="text-[10px] font-medium text-zinc-400 truncate mt-0.5">{b.title}</p>
                    </div>
                  </div>

                  {/* Compact Rates Grid */}
                  <div className="bg-zinc-900/90 rounded-xl p-2 border border-zinc-800/80 my-2 space-y-1">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400/90 flex justify-between items-center">
                      <span>Rates / Person</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono font-bold">
                      <div className="bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-800/60 truncate">
                        🚆 AC: {b.priceAcTrain ? formatCurrency(b.priceAcTrain) : formatCurrency(b.basePricePerPerson || 16000)}
                      </div>
                      <div className="bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-800/60 truncate">
                        🚞 Non-AC: {b.priceNonAcTrain ? formatCurrency(b.priceNonAcTrain) : '₹14k'}
                      </div>
                      <div className="bg-zinc-950 px-1.5 py-0.5 rounded text-sky-400 border border-zinc-800/60 truncate">
                        ✈️ Flight: {b.priceFlight ? formatCurrency(b.priceFlight) : '₹22k'}
                      </div>
                      <div className="bg-zinc-950 px-1.5 py-0.5 rounded text-amber-300 border border-zinc-800/60 truncate">
                        👶 Child: {b.priceChildHalf ? formatCurrency(b.priceChildHalf) : '₹7k'}
                      </div>
                    </div>
                  </div>

                  {/* Compact Stats */}
                  <div className="grid grid-cols-3 gap-1 bg-zinc-900/60 rounded-xl p-1.5 text-center text-[9px] font-medium border border-zinc-850">
                    <div>
                      <span className="text-zinc-500 block">Bookings</span>
                      <strong className="text-white font-mono text-xs">{stats.bookingsCount}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Travelers</span>
                      <strong className="text-white font-mono text-xs">{stats.totalPassengers}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Advance</span>
                      <strong className="text-emerald-400 font-mono text-xs">{formatCurrency(stats.totalAdvance)}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2.5 mt-2.5 border-t border-zinc-850 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectBatch && onSelectBatch(b.id)}
                    className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View</span>
                    <ChevronRight size={12} className="text-amber-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onBookTour) {
                        onBookTour(b.id);
                      } else {
                        setIsAddTourBookingOpen(true);
                      }
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg text-[10px] flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Plus size={12} className="stroke-[3]" /> + Book
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
