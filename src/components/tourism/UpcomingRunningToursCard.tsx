import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Edit2,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TourBatch, TourBooking, TourChecklistItem } from '../../types';
import { updateTourDepartureChecklist } from '../../services/db';

interface UpcomingRunningToursCardProps {
  onSelectBatch: (batchId: string) => void;
  onOpenPaymentModal: (booking: TourBooking) => void;
  onShareBooking: (booking: TourBooking) => void;
  onNavigateBookings: () => void;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_TOUR_DAYS = 9; // 2 days going + 5 nights Kashmir stay + 2 days return

function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseLocalCalendarDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  // Match YYYY-MM-DD (or ISO prefix)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    const dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]) - 1;
    let y = Number(dmyMatch[3]);
    if (y < 100) y += 2000;
    const dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatShortCalDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function cleanOriginCity(raw?: string): string {
  if (!raw || !raw.trim()) return 'Bhuj';
  const first = raw.split(/[\/,|-]/)[0]?.trim();
  return first || 'Bhuj';
}

export function buildDefaultTourChecklist(
  originRaw?: string,
  destinationRaw?: string
): TourChecklistItem[] {
  const origin = cleanOriginCity(originRaw);
  const dest = (destinationRaw || 'Kashmir').trim();
  const isKashmirRoute =
    !destinationRaw ||
    /kashmir|jammu|srinagar|gulmarg|pahalgam|sonmarg|vaishno/i.test(dest);

  if (isKashmirRoute) {
    return [
      { id: 'out_bus', label: `${origin} → Jodhpur Bus Ticket`, done: false },
      { id: 'out_train', label: 'Jodhpur → Jammu Train Ticket', done: false },
      { id: 'ret_train', label: 'Jammu → Jodhpur Return Train Ticket', done: false },
      { id: 'ret_bus', label: `Jodhpur → ${origin} Return Bus Ticket`, done: false },
      { id: 'hotel', label: 'Hotel & Houseboat Booking Confirmed', done: false },
      { id: 'cab', label: 'Cab & Sightseeing Driver Confirmed', done: false },
    ];
  }

  return [
    { id: 'out_bus', label: `${origin} Pickup / Outbound Bus Ticket`, done: false },
    { id: 'out_train', label: `Outbound Train / Flight Ticket (${dest})`, done: false },
    { id: 'ret_train', label: `Return Train / Flight Ticket (${dest})`, done: false },
    { id: 'ret_bus', label: `Return Bus / Drop to ${origin}`, done: false },
    { id: 'hotel', label: `${dest} Hotel Booking Confirmed`, done: false },
    { id: 'cab', label: `${dest} Cab & Sightseeing Driver Confirmed`, done: false },
  ];
}

function getRunningPhaseLabel(currentDay: number, totalDays: number): string {
  if (totalDays <= 4) {
    return `Day ${currentDay} of ${totalDays} · On Tour`;
  }
  if (currentDay <= 2) {
    return `Day ${currentDay} of ${totalDays} · Going (Outbound)`;
  }
  if (currentDay > totalDays - 2) {
    return `Day ${currentDay} of ${totalDays} · Returning`;
  }
  const stayNights = Math.max(1, totalDays - 4);
  return `Day ${currentDay} of ${totalDays} · ${stayNights}N Destination Stay`;
}

interface UnifiedTourItem {
  key: string;
  targetType: 'batch' | 'booking';
  id: string;
  tourCategory: 'Group' | 'Private';
  title: string;
  subtitle: string;
  destination: string;
  originCity: string;
  departureDate: Date;
  endDate: Date;
  durationDays: number;
  daysUntilDeparture: number; // <0 already started, 0 today, 1 tomorrow, 2 in 2 days
  currentDay: number; // 1-indexed when running
  isRunning: boolean;
  isReminderDue: boolean; // 0 <= daysUntilDeparture <= 2
  paxCount: number;
  bookingsCount: number;
  checklist: TourChecklistItem[];
  hasSavedChecklist: boolean;
  batch?: TourBatch;
  booking?: TourBooking;
}

export const UpcomingRunningToursCard: React.FC<UpcomingRunningToursCardProps> = ({
  onSelectBatch,
  onOpenPaymentModal,
  onShareBooking,
  onNavigateBookings,
}) => {
  const { tourBatches, tourBookings } = useData();

  const [statusFilter, setStatusFilter] = useState<'all' | 'reminder' | 'running' | 'upcoming'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Group' | 'Private'>('all');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Optimistic local overrides so toggles feel instant (<= 200ms) while Firestore syncs
  const [optimisticChecklists, setOptimisticChecklists] = useState<
    Record<string, TourChecklistItem[]>
  >({});
  const [optimisticDurations, setOptimisticDurations] = useState<Record<string, number>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Inline custom step & step editor state
  const [newStepTextByKey, setNewStepTextByKey] = useState<Record<string, string>>({});
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingNote, setEditingNote] = useState('');

  // Horizontal card slider refs & navigation state
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Build unified Group + Private Upcoming & Running tours list
  const allActiveTours = useMemo<UnifiedTourItem[]>(() => {
    const today = getTodayLocal();
    const batchIdSet = new Set(tourBatches.map((b) => b.id));
    const items: UnifiedTourItem[] = [];

    // 1. Group Tour Folders (tourBatches)
    tourBatches.forEach((batch) => {
      if (batch.status === 'Cancelled') return;
      const depDate = parseLocalCalendarDate(batch.departureDate);
      if (!depDate) return;

      const key = `batch:${batch.id}`;
      const savedDuration = optimisticDurations[key] ?? batch.durationDays;
      const durationDays =
        savedDuration && Number(savedDuration) >= 1
          ? Number(savedDuration)
          : DEFAULT_TOUR_DAYS;
      const endDate = addDays(depDate, durationDays - 1);

      const daysUntilDeparture = Math.round((depDate.getTime() - today.getTime()) / MS_PER_DAY);
      const isRunning = today.getTime() >= depDate.getTime() && today.getTime() <= endDate.getTime();
      const isUpcoming = depDate.getTime() > today.getTime();

      if (!isRunning && !isUpcoming) return; // Completed past tour

      const isReminderDue = daysUntilDeparture >= 0 && daysUntilDeparture <= 2;
      const currentDay = isRunning ? Math.abs(daysUntilDeparture) + 1 : 0;

      const activeBatchBookings = tourBookings.filter(
        (bk) => bk.tourBatchId === batch.id && bk.bookingStatus !== 'Cancelled'
      );
      const paxCount = activeBatchBookings.reduce((sum, bk) => sum + Number(bk.membersCount || 1), 0);

      const origin = cleanOriginCity(batch.pickupCity);
      const savedList =
        optimisticChecklists[key] ??
        (Array.isArray(batch.departureChecklist) && batch.departureChecklist.length > 0
          ? batch.departureChecklist
          : null);

      const checklist = savedList || buildDefaultTourChecklist(origin, batch.destination);
      const isPrivateBatch = batch.tourType === 'Private Tour' || batch.tourType === 'Custom Package';

      items.push({
        key,
        targetType: 'batch',
        id: batch.id,
        tourCategory: isPrivateBatch ? 'Private' : 'Group',
        title: batch.title || batch.destination,
        subtitle: `${activeBatchBookings.length} Booking${activeBatchBookings.length === 1 ? '' : 's'} · ${batch.travelMode || 'Train'}`,
        destination: batch.destination,
        originCity: origin,
        departureDate: depDate,
        endDate,
        durationDays,
        daysUntilDeparture,
        currentDay,
        isRunning,
        isReminderDue,
        paxCount,
        bookingsCount: activeBatchBookings.length,
        checklist,
        hasSavedChecklist: Boolean(savedList),
        batch,
      });
    });

    // 2. Standalone Private / Custom Tour Bookings (not inside a Group batch folder)
    tourBookings.forEach((bk) => {
      if (bk.bookingStatus === 'Cancelled') return;
      const isPrivateType =
        bk.tourType === 'Private Tour' ||
        bk.tourType === 'Custom Package' ||
        !bk.tourBatchId ||
        !batchIdSet.has(bk.tourBatchId);

      if (!isPrivateType) return;

      const depDate = parseLocalCalendarDate(bk.tourDate);
      if (!depDate) return;

      const key = `booking:${bk.id}`;
      const durationDays =
        optimisticDurations[key] ??
        (bk.tourDurationDays && Number(bk.tourDurationDays) >= 1
          ? Number(bk.tourDurationDays)
          : DEFAULT_TOUR_DAYS);
      const endDate = addDays(depDate, durationDays - 1);

      const daysUntilDeparture = Math.round((depDate.getTime() - today.getTime()) / MS_PER_DAY);
      const isRunning = today.getTime() >= depDate.getTime() && today.getTime() <= endDate.getTime();
      const isUpcoming = depDate.getTime() > today.getTime();

      if (!isRunning && !isUpcoming) return; // Past completed private tour

      const isReminderDue = daysUntilDeparture >= 0 && daysUntilDeparture <= 2;
      const currentDay = isRunning ? Math.abs(daysUntilDeparture) + 1 : 0;

      const origin = cleanOriginCity(bk.city);
      const savedList =
        optimisticChecklists[key] ??
        (Array.isArray(bk.departureChecklist) && bk.departureChecklist.length > 0
          ? bk.departureChecklist
          : null);

      const checklist = savedList || buildDefaultTourChecklist(origin, bk.destination);

      items.push({
        key,
        targetType: 'booking',
        id: bk.id,
        tourCategory: 'Private',
        title: bk.customerName || 'Private Customer',
        subtitle: `${bk.bookingNumber} · ${bk.customerPhone}${bk.city ? ` · ${bk.city}` : ''}`,
        destination: bk.destination || 'Kashmir',
        originCity: origin,
        departureDate: depDate,
        endDate,
        durationDays,
        daysUntilDeparture,
        currentDay,
        isRunning,
        isReminderDue,
        paxCount: Number(bk.membersCount || 1),
        bookingsCount: 1,
        checklist,
        hasSavedChecklist: Boolean(savedList),
        booking: bk,
      });
    });

    // Sort priority: 1) 2-Day Reminders (soonest first), 2) Running Now (lowest day first), 3) Upcoming (soonest first)
    items.sort((a, b) => {
      const rank = (x: UnifiedTourItem) => {
        if (x.isReminderDue) return 0;
        if (x.isRunning) return 1;
        return 2;
      };
      const rDiff = rank(a) - rank(b);
      if (rDiff !== 0) return rDiff;
      return a.departureDate.getTime() - b.departureDate.getTime();
    });

    return items;
  }, [tourBatches, tourBookings, optimisticChecklists, optimisticDurations]);

  const counts = useMemo(() => {
    let reminder = 0;
    let running = 0;
    let upcoming = 0;
    let group = 0;
    let priv = 0;

    allActiveTours.forEach((t) => {
      if (t.isReminderDue) reminder++;
      if (t.isRunning) running++;
      if (t.daysUntilDeparture > 0) upcoming++;
      if (t.tourCategory === 'Group') group++;
      else priv++;
    });

    return {
      all: allActiveTours.length,
      reminder,
      running,
      upcoming,
      group,
      priv,
    };
  }, [allActiveTours]);

  const reminderTours = useMemo(
    () => allActiveTours.filter((t) => t.isReminderDue),
    [allActiveTours]
  );

  const visibleTours = useMemo(() => {
    return allActiveTours.filter((t) => {
      if (typeFilter !== 'all' && t.tourCategory !== typeFilter) return false;
      if (statusFilter === 'reminder' && !t.isReminderDue) return false;
      if (statusFilter === 'running' && !t.isRunning) return false;
      if (statusFilter === 'upcoming' && t.daysUntilDeparture <= 0) return false;
      return true;
    });
  }, [allActiveTours, statusFilter, typeFilter]);

  const expandedTour = useMemo(
    () => visibleTours.find((t) => t.key === expandedKey) || null,
    [visibleTours, expandedKey]
  );

  const updateScrollControls = useCallback(() => {
    const el = sliderRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setActiveSlideIndex(0);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    if (el.clientWidth > 0) {
      const approxIdx = Math.round(el.scrollLeft / (el.clientWidth + 12));
      setActiveSlideIndex(Math.max(0, approxIdx));
    }
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(updateScrollControls);
    window.addEventListener('resize', updateScrollControls);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateScrollControls);
    };
  }, [visibleTours.length, statusFilter, typeFilter, updateScrollControls]);

  const handleSlide = (direction: 'prev' | 'next') => {
    const el = sliderRef.current;
    if (!el) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const step = isMobile
      ? el.clientWidth + 12
      : Math.max(300, Math.round(el.clientWidth * 0.78));
    el.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth',
    });
  };

  const focusAndOpenTourCard = (tourKey: string) => {
    setStatusFilter('all');
    setTypeFilter('all');
    setExpandedKey(tourKey);
    requestAnimationFrame(() => {
      const node = cardRefs.current[tourKey];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  };

  const persistChecklist = async (
    tour: UnifiedTourItem,
    nextList: TourChecklistItem[],
    nextDuration?: number
  ) => {
    setErrorBanner(null);
    setOptimisticChecklists((prev) => ({ ...prev, [tour.key]: nextList }));
    if (nextDuration !== undefined) {
      setOptimisticDurations((prev) => ({ ...prev, [tour.key]: nextDuration }));
    }
    setSavingKey(tour.key);
    try {
      await updateTourDepartureChecklist(tour.targetType, tour.id, nextList, nextDuration);
    } catch (err) {
      console.error('Checklist save failed:', err);
      setErrorBanner('Checklist save karne me dikkat aayi. Kripya dobara try karein.');
    } finally {
      setSavingKey((prev) => (prev === tour.key ? null : prev));
    }
  };

  const handleToggleStep = (tour: UnifiedTourItem, stepId: string) => {
    const now = new Date().toISOString();
    const nextList = tour.checklist.map((item) =>
      item.id === stepId ? { ...item, done: !item.done, updatedAt: now } : item
    );
    persistChecklist(tour, nextList);
  };

  const handleAddCustomStep = (e: React.FormEvent, tour: UnifiedTourItem) => {
    e.preventDefault();
    const raw = (newStepTextByKey[tour.key] || '').trim();
    if (!raw) return;

    const newItem: TourChecklistItem = {
      id: `step_${Date.now()}`,
      label: raw,
      done: false,
      updatedAt: new Date().toISOString(),
    };
    const nextList = [...tour.checklist, newItem];
    setNewStepTextByKey((prev) => ({ ...prev, [tour.key]: '' }));
    persistChecklist(tour, nextList);
  };

  const handleDeleteStep = (tour: UnifiedTourItem, stepId: string) => {
    const nextList = tour.checklist.filter((item) => item.id !== stepId);
    persistChecklist(tour, nextList);
  };

  const handleStartEditStep = (item: TourChecklistItem) => {
    setEditingStepId(item.id);
    setEditingLabel(item.label);
    setEditingNote(item.note || '');
  };

  const handleSaveEditStep = (tour: UnifiedTourItem, stepId: string) => {
    const cleanLabel = editingLabel.trim();
    if (!cleanLabel) return;
    const nextList = tour.checklist.map((item) =>
      item.id === stepId
        ? {
            ...item,
            label: cleanLabel,
            note: editingNote.trim(),
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    setEditingStepId(null);
    persistChecklist(tour, nextList);
  };

  const handleResetTemplate = (tour: UnifiedTourItem) => {
    const fresh = buildDefaultTourChecklist(tour.originCity, tour.destination);
    persistChecklist(tour, fresh);
  };

  const handleDurationChange = (tour: UnifiedTourItem, days: number) => {
    persistChecklist(tour, tour.checklist, days);
  };

  return (
    <section className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/90 sm:border-2 sm:border-zinc-900 shadow-sm overflow-hidden">
      {/* Header Zone */}
      <div className="p-3.5 sm:p-6 border-b border-zinc-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-900 shrink-0" />
            <h2 className="text-[15px] sm:text-lg font-black text-zinc-950 tracking-tight">
              Upcoming &amp; Running Tours
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-600 font-medium leading-snug">
            Group &amp; Private departures · 2-day pre-departure alerts · 9-day live journey &amp; route checklist
          </p>
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          {/* Status Segmented Control */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200 overflow-x-auto no-scrollbar max-w-full">
            {(
              [
                { id: 'all', mobileLabel: `All (${counts.all})`, label: `All Active (${counts.all})` },
                { id: 'reminder', mobileLabel: `Alerts (${counts.reminder})`, label: `2-Day Alerts (${counts.reminder})` },
                { id: 'running', mobileLabel: `Running (${counts.running})`, label: `Running (${counts.running})` },
                { id: 'upcoming', mobileLabel: `Upcoming (${counts.upcoming})`, label: `Upcoming (${counts.upcoming})` },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex-auto sm:flex-none text-center px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? tab.id === 'reminder'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : tab.id === 'running'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-zinc-950 text-white shadow-2xs'
                      : 'text-zinc-700 hover:text-zinc-950 hover:bg-white'
                  }`}
                >
                  <span className="sm:hidden">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Group vs Private Segmented Control */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'Group', label: `Group (${counts.group})` },
                { id: 'Private', label: `Private (${counts.priv})` },
              ] as const
            ).map((tTab) => {
              const active = typeFilter === tTab.id;
              return (
                <button
                  key={tTab.id}
                  type="button"
                  onClick={() => setTypeFilter(tTab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer text-center ${
                    active
                      ? 'bg-white text-zinc-950 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {tTab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Urgent 2-Day Departure Reminder Strip (Shows automatically for both Private & Group departing in 0-2 days) */}
      {reminderTours.length > 0 && (
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5">
          <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 min-w-0">
            <Bell className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-[11px] sm:text-xs text-amber-950 leading-snug">
              <strong className="font-black">
                2-Day Departure Reminder ({reminderTours.length}{' '}
                {reminderTours.length === 1 ? 'Tour' : 'Tours'}):
              </strong>{' '}
              {reminderTours.map((rt, idx) => {
                const doneCnt = rt.checklist.filter((c) => c.done).length;
                const whenText =
                  rt.daysUntilDeparture === 0
                    ? 'Today'
                    : rt.daysUntilDeparture === 1
                    ? 'Tomorrow'
                    : 'In 2 Days';
                return (
                  <React.Fragment key={rt.key}>
                    {idx > 0 && <span className="mx-1.5 text-amber-500">·</span>}
                    <button
                      type="button"
                      onClick={() => focusAndOpenTourCard(rt.key)}
                      className="font-bold underline decoration-amber-600/60 hover:text-zinc-950 cursor-pointer"
                    >
                      {rt.title} ({rt.tourCategory}, {whenText} ·{' '}
                      <span className="font-mono tabular-nums">
                        {doneCnt}/{rt.checklist.length}
                      </span>{' '}
                      Ready)
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'reminder' ? 'all' : 'reminder')}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 self-start sm:self-center transition-colors cursor-pointer"
          >
            {statusFilter === 'reminder' ? 'Show All Tours' : 'View Alerts Only'}
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="px-4 sm:px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-xs font-bold text-rose-800 flex items-center justify-between gap-2">
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="p-1 text-rose-700 hover:text-rose-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tours Operations Horizontal Card Slider */}
      {visibleTours.length === 0 ? (
        <div className="p-8 sm:p-10 text-center space-y-2">
          <p className="text-sm font-bold text-zinc-900">
            {statusFilter === 'reminder'
              ? 'No tours departing in the next 2 days'
              : statusFilter === 'running'
              ? 'No Group or Private tours are currently running'
              : 'No active upcoming or running tours match this filter'}
          </p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Add a Group Tour Folder or a Private Package booking with an upcoming departure date to track its 2-day alert, 9-day live status, and bus/train/hotel/cab checklist here.
          </p>
          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-3.5 bg-zinc-50/40">
          {/* Slider Toolbar: Count + Prev / Next Arrows */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-600 font-mono tabular-nums">
              <span className="sm:hidden">
                {Math.min(activeSlideIndex + 1, visibleTours.length)} / {visibleTours.length}{' '}
                {visibleTours.length === 1 ? 'Tour' : 'Tours'} · Swipe cards
              </span>
              <span className="hidden sm:inline">
                {visibleTours.length} {visibleTours.length === 1 ? 'Tour' : 'Tours'} · Swipe or slide cards
              </span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSlide('prev')}
                disabled={!canScrollLeft}
                aria-label="Previous tours"
                className="w-8 h-8 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-950 hover:text-white hover:border-zinc-950 disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-zinc-900 disabled:hover:border-zinc-300 text-zinc-900 flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSlide('next')}
                disabled={!canScrollRight}
                aria-label="Next tours"
                className="w-8 h-8 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-950 hover:text-white hover:border-zinc-950 disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-zinc-900 disabled:hover:border-zinc-300 text-zinc-900 flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroll-Snap Card Track */}
          <div
            ref={sliderRef}
            onScroll={updateScrollControls}
            className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto snap-x snap-mandatory pb-1.5 sm:-mx-1 sm:px-1 no-scrollbar"
          >
            {visibleTours.map((tour) => {
              const isExpanded = expandedKey === tour.key;
              const doneCount = tour.checklist.filter((c) => c.done).length;
              const totalCount = tour.checklist.length;
              const allDone = totalCount > 0 && doneCount === totalCount;
              const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

              const dayNum = String(tour.departureDate.getDate()).padStart(2, '0');
              const monthShort = tour.departureDate
                .toLocaleString('en-US', { month: 'short' })
                .toUpperCase();

              // Explicit semantic status text (never hue alone)
              let stateText = `Upcoming · In ${tour.daysUntilDeparture}d`;
              let stateTextClass = 'text-zinc-700';
              if (tour.isReminderDue && tour.daysUntilDeparture > 0) {
                stateText =
                  tour.daysUntilDeparture === 1
                    ? '2-Day Alert · Tomorrow'
                    : '2-Day Alert · In 2 Days';
                stateTextClass = 'text-amber-700';
              } else if (tour.isReminderDue && tour.daysUntilDeparture === 0) {
                stateText = `Departing Today · Day 1/${tour.durationDays}`;
                stateTextClass = 'text-rose-700';
              } else if (tour.isRunning) {
                stateText = `Running · ${getRunningPhaseLabel(tour.currentDay, tour.durationDays)}`;
                stateTextClass = 'text-emerald-700';
              }

              const cardSurfaceClass = isExpanded
                ? 'border-2 border-zinc-950 bg-white shadow-sm'
                : tour.isReminderDue && !allDone
                ? 'border border-amber-400 bg-amber-50/35 hover:border-amber-600'
                : tour.isRunning
                ? 'border border-emerald-400 bg-emerald-50/25 hover:border-emerald-600'
                : 'border border-zinc-200 bg-white hover:border-zinc-400';

              return (
                <div
                  key={tour.key}
                  ref={(node) => {
                    cardRefs.current[tour.key] = node;
                  }}
                  className={`w-full sm:w-[310px] lg:w-[324px] shrink-0 snap-center sm:snap-start rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-3 sm:gap-3.5 transition-colors ${cardSurfaceClass}`}
                >
                  {/* Top: Date Callout + Status Kicker & Identity */}
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      {/* Compact Calendar Date Block */}
                      <div
                        className={`px-2.5 py-1.5 rounded-xl text-center border shrink-0 min-w-[48px] ${
                          tour.isRunning
                            ? 'bg-emerald-700 text-white border-emerald-800'
                            : tour.isReminderDue
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-zinc-100 text-zinc-950 border-zinc-300'
                        }`}
                      >
                        <span
                          className={`text-[9px] font-bold tracking-wider block leading-tight ${
                            tour.isRunning || tour.isReminderDue ? 'text-white/85' : 'text-zinc-500'
                          }`}
                        >
                          {monthShort}
                        </span>
                        <span className="text-lg font-black font-mono tabular-nums block leading-tight">
                          {dayNum}
                        </span>
                      </div>

                      {/* Quiet 1-line status + Tour Type & Title */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className={`text-[11px] font-black leading-snug truncate ${stateTextClass}`}>
                          {stateText}
                        </div>
                        <h3 className="text-sm font-black text-zinc-950 tracking-tight truncate">
                          {tour.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] truncate">
                          <span
                            className={`font-bold shrink-0 ${
                              tour.tourCategory === 'Private'
                                ? 'text-indigo-700'
                                : 'text-zinc-900'
                            }`}
                          >
                            {tour.tourCategory === 'Private' ? 'Private Package' : 'Group Tour'}
                          </span>
                          <span aria-hidden="true" className="text-zinc-400">
                            ·
                          </span>
                          <span className="text-zinc-600 font-semibold truncate">
                            {tour.destination}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Schedule, Pax & Booking Details (Unboxed metadata separated by ·) */}
                    <div className="pt-2 border-t border-zinc-200/80 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between gap-2 text-zinc-700">
                        <span className="font-mono tabular-nums font-semibold truncate">
                          {formatShortCalDate(tour.departureDate)} – {formatShortCalDate(tour.endDate)} ({tour.durationDays}d)
                        </span>
                        <span className="font-mono tabular-nums font-black text-zinc-950 shrink-0">
                          {tour.paxCount} Pax
                        </span>
                      </div>
                      <div className="text-zinc-500 font-medium truncate">
                        {tour.subtitle}
                      </div>
                    </div>

                    {/* Checklist Readiness Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 font-semibold">Route Checklist</span>
                        <span
                          className={`font-mono tabular-nums font-black ${
                            allDone
                              ? 'text-emerald-700'
                              : tour.isReminderDue
                              ? 'text-rose-700'
                              : 'text-zinc-900'
                          }`}
                        >
                          {doneCount}/{totalCount} Ready
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-150 ${
                            allDone
                              ? 'bg-emerald-600'
                              : tour.isReminderDue
                              ? 'bg-amber-600'
                              : 'bg-zinc-900'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-2.5 border-t border-zinc-200/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedKey((prev) => (prev === tour.key ? null : tour.key))
                      }
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isExpanded
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : tour.isReminderDue && !allDone
                          ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
                          : 'bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-300'
                      }`}
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Checklist</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>

                    {tour.targetType === 'batch' ? (
                      <button
                        type="button"
                        onClick={() => onSelectBatch(tour.id)}
                        className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        <span>Folder</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ) : (
                      tour.booking && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenPaymentModal(tour.booking!)}
                            className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                          >
                            Payment
                          </button>
                          <button
                            type="button"
                            onClick={() => onShareBooking(tour.booking!)}
                            title="Open Voucher Slip"
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-black text-white transition-colors cursor-pointer shrink-0"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full-Width Expandable Checklist Drawer for the Selected Card */}
          {expandedTour && (() => {
            const tour = expandedTour;
            const stayNights = Math.max(1, tour.durationDays - 4);
            const doneCount = tour.checklist.filter((c) => c.done).length;
            const totalCount = tour.checklist.length;

            return (
              <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-zinc-950 space-y-3.5">
                {/* Drawer Header + Duration & Reset Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-3 border-b border-zinc-200 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-black text-zinc-950 truncate">
                        {tour.title}
                      </span>
                      <span aria-hidden="true" className="text-zinc-300">
                        ·
                      </span>
                      <span
                        className={`font-bold ${
                          tour.tourCategory === 'Private' ? 'text-indigo-700' : 'text-zinc-800'
                        }`}
                      >
                        {tour.tourCategory === 'Private' ? 'Private Package' : 'Group Tour'}
                      </span>
                      <span aria-hidden="true" className="text-zinc-300">
                        ·
                      </span>
                      <span className="font-mono tabular-nums font-bold text-emerald-700">
                        {doneCount}/{totalCount} Ready
                      </span>
                      {savingKey === tour.key && (
                        <span className="text-emerald-700 font-bold">· Saving...</span>
                      )}
                    </div>
                    <div className="text-zinc-600 font-medium">
                      <span className="font-bold text-zinc-900">Schedule:</span>{' '}
                      <span className="font-mono tabular-nums">
                        {tour.durationDays >= 5
                          ? `2d Going · ${stayNights}N Stay · 2d Return`
                          : `${tour.durationDays} Days Total`}
                      </span>
                      <span aria-hidden="true" className="mx-1.5 text-zinc-400">
                        ·
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatShortCalDate(tour.departureDate)} → {formatShortCalDate(tour.endDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <label className="text-[11px] font-bold text-zinc-600 flex items-center gap-1.5">
                      <span>Duration:</span>
                      <select
                        value={tour.durationDays}
                        onChange={(e) => handleDurationChange(tour, Number(e.target.value))}
                        className="px-2 py-1 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900 cursor-pointer focus:outline-none focus:border-zinc-900"
                      >
                        {[5, 6, 7, 8, 9, 10, 11, 12, 14].map((d) => (
                          <option key={d} value={d}>
                            {d} Days{d === 9 ? ' (2+5N+2)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleResetTemplate(tour)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 text-zinc-700 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      title="Reset checklist back to default 6 route steps"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Template</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedKey(null)}
                      aria-label="Close checklist"
                      className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Checklist Items List */}
                <div className="divide-y divide-zinc-200 bg-zinc-50/40 rounded-xl border border-zinc-200 overflow-hidden">
                  {tour.checklist.map((item) => {
                    const isEditing = editingStepId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`px-3 sm:px-3.5 py-2.5 min-h-[44px] flex items-center justify-between gap-2 transition-colors ${
                          item.done ? 'bg-emerald-50/60' : 'bg-white hover:bg-zinc-50'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              placeholder="Route / booking step..."
                              className="flex-1 px-2.5 py-1.5 text-xs font-bold text-zinc-950 bg-white border border-zinc-400 rounded-lg focus:outline-none focus:border-zinc-950"
                            />
                            <input
                              type="text"
                              value={editingNote}
                              onChange={(e) => setEditingNote(e.target.value)}
                              placeholder="Optional note (PNR, bus/train no, driver)..."
                              className="flex-1 px-2.5 py-1.5 text-xs font-medium text-zinc-800 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-950"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSaveEditStep(tour, item.id)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-bold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStepId(null)}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleStep(tour, item.id)}
                              className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer py-0.5"
                            >
                              <span
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  item.done
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-zinc-400 text-transparent'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`text-xs sm:text-sm font-bold block ${
                                    item.done
                                      ? 'line-through text-emerald-900/75'
                                      : 'text-zinc-950'
                                  }`}
                                >
                                  {item.label}
                                </span>
                                {item.note && (
                                  <span className="text-[11px] font-medium text-zinc-500 block truncate">
                                    {item.note}
                                  </span>
                                )}
                              </div>
                            </button>

                            <div className="flex items-center gap-0.5 sm:gap-1 self-center shrink-0">
                              <span
                                className={`hidden sm:inline text-[11px] font-bold mr-1.5 ${
                                  item.done ? 'text-emerald-700' : 'text-zinc-400'
                                }`}
                              >
                                {item.done ? 'Done' : 'Pending'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditStep(item)}
                                title="Edit step or add PNR / driver note"
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStep(tour, item.id)}
                                title="Remove step"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Route Step Form */}
                <form
                  onSubmit={(e) => handleAddCustomStep(e, tour)}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <input
                    type="text"
                    value={newStepTextByKey[tour.key] || ''}
                    onChange={(e) =>
                      setNewStepTextByKey((prev) => ({
                        ...prev,
                        [tour.key]: e.target.value,
                      }))
                    }
                    placeholder="Add custom route step (e.g. Ahmedabad → Delhi Train, Houseboat Check-in, Tempo Driver)..."
                    className="flex-1 px-3.5 py-2 bg-white border border-zinc-300 focus:border-zinc-950 rounded-xl text-xs font-medium text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!(newStepTextByKey[tour.key] || '').trim()}
                    className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-black disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Step</span>
                  </button>
                </form>
              </div>
            );
          })()}
        </div>
      )}

      {/* Subtle Footer Action */}
      {allActiveTours.length > 0 && (
        <div className="px-4 sm:px-6 py-2.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
          <span className="font-mono tabular-nums">
            Showing {visibleTours.length} of {allActiveTours.length} active departures
          </span>
          <button
            type="button"
            onClick={onNavigateBookings}
            className="font-bold text-zinc-900 hover:underline cursor-pointer whitespace-nowrap"
          >
            All Tour Bookings &rarr;
          </button>
        </div>
      )}
    </section>
  );
};
