import React, { useState } from 'react';
import { X, FolderPlus, MapPin, Calendar, Train, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { addTourBatch } from '../../services/db';
import { TourType, TravelClass } from '../../types';

interface AddTourBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTourBatchModal: React.FC<AddTourBatchModalProps> = ({ isOpen, onClose }) => {
  const { currentUserProfile } = useAuth();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tourType, setTourType] = useState<TourType>('Group Tour');
  const [travelMode, setTravelMode] = useState<string>('AC Train');

  // Multi-tier Prices
  const [priceAcTrain, setPriceAcTrain] = useState<number | string>('16000');
  const [priceNonAcTrain, setPriceNonAcTrain] = useState<number | string>('14000');
  const [priceFlight, setPriceFlight] = useState<number | string>('22000');
  const [priceChildHalf, setPriceChildHalf] = useState<number | string>('7000');

  const [totalSeats, setTotalSeats] = useState<number | string>(30);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a tour name (e.g. 10 Oct Kashmir Tour).');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Please enter destination.');
      return;
    }
    if (!departureDate) {
      setErrorMsg('Please select a tour date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTourBatch(
        {
          title: title.trim(),
          destination: destination.trim(),
          departureDate,
          returnDate: departureDate,
          durationDays: 7,
          tourType,
          basePricePerPerson: Number(priceAcTrain || 0),
          priceAcTrain: Number(priceAcTrain || 0),
          priceNonAcTrain: Number(priceNonAcTrain || 0),
          priceFlight: Number(priceFlight || 0),
          priceChildHalf: Number(priceChildHalf || 0),
          totalSeats: Number(totalSeats || 30),
          status: 'Upcoming',
          travelMode,
          pickupCity: 'Gujarat / All India',
          notes: notes.trim(),
          monthKey: departureDate.substring(0, 7),
        },
        currentUserProfile?.email || 'admin@sanzari.com'
      );

      onClose();
    } catch (err: any) {
      console.error('Failed to create tour batch:', err);
      setErrorMsg(err.message || 'Failed to create tour date folder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-950 text-white rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header - Black Luxury */}
        <div className="bg-zinc-900/90 px-5 sm:px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                New Tour Date Folder
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                Create monthly departure date folder (e.g. 10 Oct Kashmir)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-5 sm:p-6 space-y-4 text-xs flex-1 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl font-semibold">
                {errorMsg}
              </div>
            )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Tour Folder Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 10 Oct Kashmir Autumn Special"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Destination *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kashmir, Manali, Goa"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Departure Date *
              </label>
              <input
                type="date"
                required
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Tour Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Group Tour', 'Private Tour'] as TourType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTourType(t)}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs border transition-all ${
                      tourType === t
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Default Travel Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['AC Train', 'Non-AC Train', 'Flight', 'Volvo Bus'] as string[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTravelMode(c)}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-all ${
                      travelMode === c
                        ? 'bg-amber-500 text-zinc-950 border-amber-400'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ticket Rates Setup Section */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
              🏷️ Set Tour Ticket Prices (Per Person)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">
                  🚆 AC Train (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 16000"
                  value={priceAcTrain}
                  onChange={(e) => setPriceAcTrain(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">
                  🚞 Non-AC Train (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 14000"
                  value={priceNonAcTrain}
                  onChange={(e) => setPriceNonAcTrain(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">
                  ✈️ Flight (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 22000"
                  value={priceFlight}
                  onChange={(e) => setPriceFlight(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-sky-400 font-mono font-bold text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">
                  👶 Child (&lt;7 Yrs) (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 7000"
                  value={priceChildHalf}
                  onChange={(e) => setPriceChildHalf(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Total Seats Available
              </label>
              <input
                type="number"
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Flight rates variable based on booking date"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
              />
            </div>
          </div>

          </div>

          <div className="px-5 sm:px-6 py-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? 'Creating...' : 'Create Folder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
