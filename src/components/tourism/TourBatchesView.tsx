import React, { useState, useMemo } from 'react';
import {
  Folder,
  Calendar,
  MapPin,
  Users,
  Search,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBatch } from '../../types';
import { BatchesSkeleton } from '../common/Skeleton';

interface TourBatchesViewProps {
  onSelectBatch?: (batchId: string) => void;
  onBookTour?: (batchId: string) => void;
}

export const TourBatchesView: React.FC<TourBatchesViewProps> = ({
  onSelectBatch,
}) => {
  const {
    loading,
    tourBatches,
    tourBookings,
    formatCurrency,
    setIsAddTourBatchOpen,
    deleteTourBatchById,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return <BatchesSkeleton />;
  }

  const handleDeleteBatch = async (e: React.MouseEvent, batch: TourBatch) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete tour folder "${batch.title}"? This cannot be undone.`)) {
      try {
        await deleteTourBatchById(batch.id);
      } catch (err) {
        console.error('Failed to delete tour folder:', err);
      }
    }
  };

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
      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-zinc-500 ml-2" />
        <input
          type="text"
          placeholder="Search by tour date, destination, or title (e.g. 10 Oct)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs text-zinc-900 focus:outline-none placeholder:text-zinc-400 font-medium"
        />
      </div>

      {/* Folders List (2 cards per row on mobile, White Background & Black Border) */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-900 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto border border-zinc-300">
            <Folder className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Tour Folders Yet</h3>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto">
            No tour date folders match your search. Create tour date folders using the header or menu button!
          </p>
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
                onClick={() => onSelectBatch && onSelectBatch(b.id)}
                className="bg-white text-zinc-950 rounded-2xl border-2 border-zinc-900 shadow-sm p-3 sm:p-4 flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer"
              >
                <div>
                  {/* Folder Top Header - White Background, Black Border & Direct Delete Option */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <span>📂</span> Folder
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-300 truncate max-w-[70px]">
                        {b.tourType}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBatch(e, b)}
                        title="Delete Tour Folder"
                        className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Highlighted Date & Destination */}
                  <div className="flex items-center gap-2 mb-2.5">
                    {/* Big Date Badge - White background, Black border */}
                    <div className="px-2 py-1 rounded-xl bg-zinc-50 border-2 border-zinc-900 text-center shrink-0 min-w-[44px]">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-zinc-600 block leading-tight">
                        {monthShort}
                      </span>
                      <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 block leading-none my-0.5">
                        {dayNum}
                      </span>
                      <span className="text-[8px] font-bold text-zinc-500 block leading-tight">
                        {yearNum}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-zinc-950">
                        <MapPin size={12} className="shrink-0 stroke-[2.5]" />
                        <h3 className="text-xs sm:text-sm font-black text-zinc-950 truncate tracking-tight">
                          {b.destination}
                        </h3>
                      </div>
                      <p className="text-[10px] font-semibold text-zinc-600 truncate mt-0.5">{b.title}</p>
                    </div>
                  </div>

                  {/* Compact Rates Grid - Clean White & Zinc */}
                  <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-200 my-2 space-y-1">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-600 flex justify-between items-center">
                      <span>Rates / Person</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-bold">
                      <div className="bg-white px-1.5 py-0.5 rounded text-zinc-900 border border-zinc-200 truncate">
                        🚆 AC: {b.priceAcTrain ? formatCurrency(b.priceAcTrain) : formatCurrency(b.basePricePerPerson || 16000)}
                      </div>
                      <div className="bg-white px-1.5 py-0.5 rounded text-zinc-900 border border-zinc-200 truncate">
                        🚞 Non-AC: {b.priceNonAcTrain ? formatCurrency(b.priceNonAcTrain) : '₹14k'}
                      </div>
                      <div className="bg-white px-1.5 py-0.5 rounded text-zinc-900 border border-zinc-200 truncate">
                        ✈️ Flight: {b.priceFlight ? formatCurrency(b.priceFlight) : '₹22k'}
                      </div>
                      <div className="bg-white px-1.5 py-0.5 rounded text-zinc-900 border border-zinc-200 truncate">
                        👶 Child: {b.priceChildHalf ? formatCurrency(b.priceChildHalf) : '₹7k'}
                      </div>
                    </div>
                  </div>

                  {/* Compact Stats */}
                  <div className="grid grid-cols-3 gap-1 bg-zinc-50 rounded-xl p-1.5 text-center text-[9px] font-medium border border-zinc-200">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">Bookings</span>
                      <strong className="text-zinc-950 font-bold text-xs">{stats.bookingsCount}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">Travelers</span>
                      <strong className="text-zinc-950 font-bold text-xs">{stats.totalPassengers}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">Advance</span>
                      <strong className="text-emerald-700 font-bold text-xs">{formatCurrency(stats.totalAdvance)}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2.5 mt-2.5 border-t border-zinc-200 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600 font-semibold">
                    {stats.totalPassengers} Passengers
                  </span>
                  <div className="text-[10px] font-bold text-zinc-900 group-hover:text-black flex items-center gap-0.5 transition-colors">
                    <span>View Folder</span>
                    <ChevronRight size={12} className="text-zinc-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
