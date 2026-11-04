import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileDown,
  Users,
  User,
  IndianRupee,
  CheckSquare,
  Square,
  Folder,
  Sparkles,
  ListOrdered,
} from 'lucide-react';
import { TourBooking, TourBatch } from '../../types';
import { useData } from '../../context/DataContext';
import {
  generateTourGroupPDF,
  MembersDisplayMode,
  AmountDisplayPreset,
} from '../../utils/generateTourGroupPDF';

interface TourPDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBatchId?: string;
  initialPaymentFilter?: 'ALL' | 'Due' | 'Paid';
  customBookings?: TourBooking[];
}

export const TourPDFExportModal: React.FC<TourPDFExportModalProps> = ({
  isOpen,
  onClose,
  initialBatchId = 'ALL',
  initialPaymentFilter = 'ALL',
  customBookings,
}) => {
  const { tourBookings, tourBatches, formatCurrency } = useData();

  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId);
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'Due' | 'Paid'>(initialPaymentFilter);
  const [membersMode, setMembersMode] = useState<MembersDisplayMode>('all_members');
  const [amountPreset, setAmountPreset] = useState<AmountDisplayPreset>('all_amounts');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Individual column toggles
  const [showBookingIdAndDate, setShowBookingIdAndDate] = useState(true);
  const [showCustomerName, setShowCustomerName] = useState(true);
  const [showCustomerPhone, setShowCustomerPhone] = useState(true);
  const [showCity, setShowCity] = useState(true);
  const [showPaxCount, setShowPaxCount] = useState(true);
  const [showTravelClass, setShowTravelClass] = useState(true);
  const [showSpecialNotes, setShowSpecialNotes] = useState(true);

  const [showTopSummaryCards, setShowTopSummaryCards] = useState(true);
  const [showTotalAmount, setShowTotalAmount] = useState(true);
  const [showAdvanceAmount, setShowAdvanceAmount] = useState(true);
  const [showAccountAndMode, setShowAccountAndMode] = useState(true);
  const [showDueAmount, setShowDueAmount] = useState(true);
  const [showPaymentStatus, setShowPaymentStatus] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedBatchId(initialBatchId || 'ALL');
      setPaymentFilter(initialPaymentFilter || 'ALL');
    }
  }, [isOpen, initialBatchId, initialPaymentFilter]);

  // Apply amount preset helper
  const applyAmountPreset = (preset: AmountDisplayPreset) => {
    setAmountPreset(preset);
    switch (preset) {
      case 'all_amounts':
        setShowTotalAmount(true);
        setShowAdvanceAmount(true);
        setShowAccountAndMode(true);
        setShowDueAmount(true);
        setShowPaymentStatus(true);
        setShowTopSummaryCards(true);
        break;
      case 'due_only':
        setShowTotalAmount(false);
        setShowAdvanceAmount(false);
        setShowAccountAndMode(false);
        setShowDueAmount(true);
        setShowPaymentStatus(true);
        setShowTopSummaryCards(true);
        break;
      case 'advance_only':
        setShowTotalAmount(false);
        setShowAdvanceAmount(true);
        setShowAccountAndMode(true);
        setShowDueAmount(false);
        setShowPaymentStatus(false);
        setShowTopSummaryCards(true);
        break;
      case 'advance_and_due':
        setShowTotalAmount(false);
        setShowAdvanceAmount(true);
        setShowAccountAndMode(true);
        setShowDueAmount(true);
        setShowPaymentStatus(true);
        setShowTopSummaryCards(true);
        break;
      case 'no_amounts':
        setShowTotalAmount(false);
        setShowAdvanceAmount(false);
        setShowAccountAndMode(false);
        setShowDueAmount(false);
        setShowPaymentStatus(false);
        setShowTopSummaryCards(true);
        break;
    }
  };

  // Apply full quick template
  const applyQuickTemplate = (
    template: 'full_all' | 'first_person_summary' | 'due_collection' | 'hotel_manager_no_money' | 'passenger_serial'
  ) => {
    if (template === 'full_all') {
      setPaymentFilter('ALL');
      setMembersMode('all_members');
      setShowBookingIdAndDate(true);
      setShowCustomerName(true);
      setShowCustomerPhone(true);
      setShowCity(true);
      setShowPaxCount(true);
      setShowTravelClass(true);
      setShowSpecialNotes(true);
      setOrientation('landscape');
      applyAmountPreset('all_amounts');
    } else if (template === 'first_person_summary') {
      setPaymentFilter('ALL');
      setMembersMode('first_person_only');
      setShowBookingIdAndDate(true);
      setShowCustomerName(true);
      setShowCustomerPhone(true);
      setShowCity(true);
      setShowPaxCount(true);
      setShowTravelClass(true);
      setShowSpecialNotes(false);
      setOrientation('landscape');
      applyAmountPreset('all_amounts');
    } else if (template === 'due_collection') {
      setPaymentFilter('Due');
      setMembersMode('first_person_only');
      setShowBookingIdAndDate(true);
      setShowCustomerName(true);
      setShowCustomerPhone(true);
      setShowCity(true);
      setShowPaxCount(true);
      setShowTravelClass(false);
      setShowSpecialNotes(false);
      setOrientation('portrait');
      applyAmountPreset('all_amounts');
    } else if (template === 'hotel_manager_no_money') {
      setPaymentFilter('ALL');
      setMembersMode('all_members');
      setShowBookingIdAndDate(true);
      setShowCustomerName(true);
      setShowCustomerPhone(true);
      setShowCity(true);
      setShowPaxCount(true);
      setShowTravelClass(true);
      setShowSpecialNotes(true);
      setOrientation('portrait');
      applyAmountPreset('no_amounts');
    } else if (template === 'passenger_serial') {
      setPaymentFilter('ALL');
      setMembersMode('one_row_per_member');
      setShowBookingIdAndDate(true);
      setShowCustomerName(true);
      setShowCustomerPhone(true);
      setShowCity(false);
      setShowPaxCount(false);
      setShowTravelClass(true);
      setShowSpecialNotes(true);
      setOrientation('portrait');
      applyAmountPreset('no_amounts');
    }
  };

  // Filtered bookings preview count
  const targetBookings = useMemo(() => {
    const base = customBookings || tourBookings;
    const byBatch =
      selectedBatchId === 'ALL'
        ? base
        : base.filter((b) => b.tourBatchId === selectedBatchId);

    return byBatch.filter((b) => {
      const tot = Number(b.totalAmount || 0);
      const adv = Number(b.advancePaid || 0);
      const due = Math.max(0, tot - adv);
      const isPaid = due === 0 && tot > 0;
      if (paymentFilter === 'Paid' && !isPaid) return false;
      if (paymentFilter === 'Due' && isPaid) return false;
      return true;
    });
  }, [customBookings, tourBookings, selectedBatchId, paymentFilter]);

  const previewStats = useMemo(() => {
    const pax = targetBookings.reduce(
      (sum, b) => sum + (Number(b.membersCount) || (Array.isArray(b.members) ? b.members.length : 1)),
      0
    );
    const total = targetBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const adv = targetBookings.reduce((sum, b) => sum + Number(b.advancePaid || 0), 0);
    const due = targetBookings.reduce(
      (sum, b) => sum + Math.max(0, Number(b.totalAmount || 0) - Number(b.advancePaid || 0)),
      0
    );
    return { bookingsCount: targetBookings.length, pax, total, adv, due };
  }, [targetBookings]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (targetBookings.length === 0) return;

    const selectedBatch: TourBatch | null =
      selectedBatchId !== 'ALL'
        ? tourBatches.find((b) => b.id === selectedBatchId) || null
        : null;

    const filterTitle =
      paymentFilter === 'Due'
        ? 'BAAKI / DUE PAYMENT BOOKINGS'
        : paymentFilter === 'Paid'
        ? 'FULL PAID BOOKINGS'
        : 'ALL CONFIRMED BOOKINGS';

    generateTourGroupPDF(targetBookings, {
      batch: selectedBatch,
      title: selectedBatch
        ? `${selectedBatch.title} - ${selectedBatch.destination}`
        : filterTitle,
      filterLabel: `${filterTitle} • ${targetBookings.length} Bookings (${previewStats.pax} PAX)`,
      orientation,
      paymentFilter,
      membersMode,
      showBookingIdAndDate,
      showCustomerName,
      showCustomerPhone,
      showCity,
      showPaxCount,
      showTravelClass,
      showSpecialNotes,
      showTopSummaryCards,
      showTotalAmount,
      showAdvanceAmount,
      showAccountAndMode,
      showDueAmount,
      showPaymentStatus,
    });

    onClose();
  };

  const ToggleChip = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`px-3 py-2 rounded-xl border-2 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left ${
        checked
          ? 'bg-zinc-950 text-white border-zinc-950 shadow-2xs'
          : 'bg-zinc-50 text-zinc-600 border-zinc-300 hover:border-zinc-500'
      }`}
    >
      {checked ? (
        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <Square className="w-4 h-4 text-zinc-400 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white text-zinc-950 rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b-2 border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <FileDown className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950">
                Customize &amp; Download Group PDF
              </h2>
              <p className="text-[11px] text-zinc-600 font-semibold">
                Select what details, members mode &amp; payment columns you want in the PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1 bg-zinc-50/50">
          {/* Quick 1-Click Templates */}
          <div className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" />
              <span>Quick 1-Click PDF Templates (Ready Presets):</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyQuickTemplate('full_all')}
                className="p-2.5 rounded-xl border-2 border-zinc-900 bg-zinc-950 text-white text-left hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <div className="font-black text-xs">📋 Full All Details</div>
                <div className="text-[9px] text-zinc-300 mt-0.5">
                  All Members + Advance + Due + Account/Mode
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('first_person_summary')}
                className="p-2.5 rounded-xl border-2 border-zinc-300 bg-zinc-50 hover:border-zinc-900 text-zinc-950 text-left transition-all cursor-pointer"
              >
                <div className="font-black text-xs">👤 1st Person + Payment</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">
                  Single Customer + Phone + PAX + Adv/Due
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('due_collection')}
                className="p-2.5 rounded-xl border-2 border-rose-300 bg-rose-50/70 hover:border-rose-600 text-rose-950 text-left transition-all cursor-pointer"
              >
                <div className="font-black text-xs">⏳ Only Baaki Due List</div>
                <div className="text-[9px] text-rose-700 mt-0.5">
                  Sirf jinka payment baaki hai unki list
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('hotel_manager_no_money')}
                className="p-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/70 hover:border-emerald-600 text-emerald-950 text-left transition-all cursor-pointer"
              >
                <div className="font-black text-xs">🚌 Hotel / Manager List</div>
                <div className="text-[9px] text-emerald-800 mt-0.5">
                  All Members + Phone (Without Money/Rates)
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('passenger_serial')}
                className="p-2.5 rounded-xl border-2 border-blue-300 bg-blue-50/70 hover:border-blue-600 text-blue-950 text-left transition-all cursor-pointer"
              >
                <div className="font-black text-xs">🔢 1-by-1 Passenger List</div>
                <div className="text-[9px] text-blue-800 mt-0.5">
                  Serial #1, #2, #3 row per passenger
                </div>
              </button>
            </div>
          </div>

          {/* 1. Select Group Folder & Booking Filter */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <Folder size={13} />
              <span>1. Select Group Folder &amp; Booking Status</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                  Tour Date Folder / Group
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-black text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">📂 All Tour Groups / Folders ({tourBookings.length})</option>
                  {tourBatches.map((b) => {
                    const cnt = tourBookings.filter((bk) => bk.tourBatchId === b.id).length;
                    return (
                      <option key={b.id} value={b.id}>
                        📂 {b.title} - {b.destination} ({cnt} Bookings)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                  Konse Bookings Chahiye? (Status Filter)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'ALL' as const, label: 'All Bookings' },
                    { id: 'Due' as const, label: 'Only Baaki Due' },
                    { id: 'Paid' as const, label: 'Only Full Paid' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setPaymentFilter(st.id)}
                      className={`py-2 px-2 rounded-xl border-2 font-black text-[11px] transition-all cursor-pointer ${
                        paymentFilter === st.id
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-300 hover:border-zinc-900'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Members / Passengers Display Mode */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 space-y-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <Users size={13} />
              <span>2. Members / Passengers Kese Dikhana He?</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMembersMode('all_members')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  membersMode === 'all_members'
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                    : 'bg-zinc-50 text-zinc-900 border-zinc-300 hover:border-zinc-900'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1.5">
                  <Users size={13} />
                  <span>All Members</span>
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    membersMode === 'all_members' ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  Sabhi family members ke naam, age &amp; gender
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMembersMode('first_person_only')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  membersMode === 'first_person_only'
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                    : 'bg-zinc-50 text-zinc-900 border-zinc-300 hover:border-zinc-900'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1.5">
                  <User size={13} />
                  <span>Single / 1st Person Only</span>
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    membersMode === 'first_person_only' ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  Sirf main customer ka naam + Total PAX
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMembersMode('one_row_per_member')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  membersMode === 'one_row_per_member'
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                    : 'bg-zinc-50 text-zinc-900 border-zinc-300 hover:border-zinc-900'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1.5">
                  <ListOrdered size={13} />
                  <span>1-by-1 Passenger Rows</span>
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    membersMode === 'one_row_per_member' ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  Har passenger ki alag serial line (1 to {previewStats.pax})
                </div>
              </button>
            </div>
          </div>

          {/* 3. Amount & Payment Options */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <IndianRupee size={13} />
              <span>3. Amount &amp; Payment Mode me Kya Chahiye?</span>
            </span>

            {/* Quick Amount Mode Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'all_amounts' as const, label: '💰 All Amounts' },
                { id: 'due_only' as const, label: '⏳ Only Baaki Due' },
                { id: 'advance_only' as const, label: '✅ Only Advance' },
                { id: 'advance_and_due' as const, label: '⚖️ Adv + Due' },
                { id: 'no_amounts' as const, label: '🚫 No Amounts' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyAmountPreset(item.id)}
                  className={`py-2 px-2 rounded-xl border-2 font-black text-[11px] transition-all cursor-pointer ${
                    amountPreset === item.id
                      ? 'bg-emerald-600 text-white border-emerald-800 shadow-xs'
                      : 'bg-zinc-50 text-zinc-800 border-zinc-300 hover:border-zinc-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Individual Payment Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <ToggleChip
                checked={showTotalAmount}
                onChange={setShowTotalAmount}
                label="Total Package (₹)"
              />
              <ToggleChip
                checked={showAdvanceAmount}
                onChange={setShowAdvanceAmount}
                label="Advance / Received (₹)"
              />
              <ToggleChip
                checked={showAccountAndMode}
                onChange={setShowAccountAndMode}
                label="Account & Mode (Sahil/Rizwan)"
              />
              <ToggleChip
                checked={showDueAmount}
                onChange={setShowDueAmount}
                label="Baaki / Due Amount (₹)"
              />
              <ToggleChip
                checked={showPaymentStatus}
                onChange={setShowPaymentStatus}
                label="Status (Full Paid / Due)"
              />
              <ToggleChip
                checked={showTopSummaryCards}
                onChange={setShowTopSummaryCards}
                label="Top Total Summary Cards"
              />
            </div>
          </div>

          {/* 4. Customer & Booking Columns Checkboxes */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
                4. Customer &amp; Booking Columns
              </span>

              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-300">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer ${
                    orientation === 'landscape'
                      ? 'bg-zinc-950 text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Landscape (Wide A4)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer ${
                    orientation === 'portrait'
                      ? 'bg-zinc-950 text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Portrait (Vertical A4)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <ToggleChip
                checked={showCustomerName}
                onChange={setShowCustomerName}
                label="Customer Name"
              />
              <ToggleChip
                checked={showCustomerPhone}
                onChange={setShowCustomerPhone}
                label="Mobile Number"
              />
              <ToggleChip
                checked={showCity}
                onChange={setShowCity}
                label="City / Village"
              />
              <ToggleChip
                checked={showBookingIdAndDate}
                onChange={setShowBookingIdAndDate}
                label="Booking ID & Date"
              />
              <ToggleChip
                checked={showPaxCount}
                onChange={setShowPaxCount}
                label="Total PAX Count"
              />
              <ToggleChip
                checked={showTravelClass}
                onChange={setShowTravelClass}
                label="Travel Mode (3AC/Sleeper)"
              />
              <ToggleChip
                checked={showSpecialNotes}
                onChange={setShowSpecialNotes}
                label="Special Notes / Room"
              />
            </div>
          </div>

          {/* Live Summary Strip */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 text-white flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                Ready to Export in PDF:
              </span>
              <span className="text-xs sm:text-sm font-black text-white">
                {previewStats.bookingsCount} Bookings • {previewStats.pax} Passengers (PAX)
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-emerald-400 font-bold">
                Adv: {formatCurrency(previewStats.adv)}
              </span>
              <span className="text-rose-400 font-bold">
                Due: {formatCurrency(previewStats.due)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-5 py-3.5 border-t-2 border-zinc-900 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-xl text-xs border border-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={previewStats.bookingsCount === 0}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <FileDown className="w-4 h-4 stroke-[2.5]" />
            <span>
              Download PDF Now ({previewStats.bookingsCount} Bookings • {previewStats.pax} PAX)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
