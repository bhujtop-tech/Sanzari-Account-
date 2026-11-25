import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  XCircle,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  RotateCcw,
  Calendar,
  TrendingDown,
  MessageCircle,
} from 'lucide-react';
import { TourBooking, TourPaymentMode } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { cancelTourBooking, restoreCancelledTourBooking } from '../../services/db';

interface CancelTourBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: TourBooking | null;
}

interface PolicySlabOption {
  id: string;
  label: string;
  sublabel: string;
  deductionPct: number | null; // null = custom manual
}

const POLICY_SLABS: PolicySlabOption[] = [
  { id: '30_plus', label: '30+ Days Before', sublabel: '10% Charge', deductionPct: 10 },
  { id: '15_29', label: '15–29 Days Before', sublabel: '25% Charge', deductionPct: 25 },
  { id: '7_14', label: '7–14 Days Before', sublabel: '50% Charge', deductionPct: 50 },
  { id: '3_6', label: '3–6 Days Before', sublabel: '75% Charge', deductionPct: 75 },
  { id: 'under_48h', label: '< 48 Hrs / No Show', sublabel: '100% No Refund', deductionPct: 100 },
  { id: 'custom', label: 'Custom / Manual', sublabel: 'Exact Amount', deductionPct: null },
];

function computeDaysBefore(tourDateStr?: string, cancelDateStr?: string): number | undefined {
  if (!tourDateStr || !cancelDateStr) return undefined;
  const t = new Date(tourDateStr);
  const c = new Date(cancelDateStr);
  if (isNaN(t.getTime()) || isNaN(c.getTime())) return undefined;
  const diffMs = t.getTime() - c.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function pickSlabForDays(days?: number): PolicySlabOption {
  if (days === undefined) return POLICY_SLABS[5];
  if (days >= 30) return POLICY_SLABS[0];
  if (days >= 15) return POLICY_SLABS[1];
  if (days >= 7) return POLICY_SLABS[2];
  if (days >= 3) return POLICY_SLABS[3];
  return POLICY_SLABS[4];
}

export const CancelTourBookingModal: React.FC<CancelTourBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const { tourWallets, formatCurrency } = useData();
  const { user, currentUserProfile } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  const [cancelDate, setCancelDate] = useState(todayStr);
  const [selectedSlabId, setSelectedSlabId] = useState<string>('custom');
  const [cancellationCharge, setCancellationCharge] = useState<string>('0');
  const [refundAmount, setRefundAmount] = useState<string>('0');
  const [ticketOrHotelLoss, setTicketOrHotelLoss] = useState<string>('0');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<TourPaymentMode>('UPI');
  const [reason, setReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const receivedAmount = Number(booking?.advancePaid || 0);
  const totalAmount = Number(booking?.totalAmount || 0);
  const isAlreadyCancelled = booking?.bookingStatus === 'Cancelled';

  const daysBeforeDeparture = useMemo(
    () => computeDaysBefore(booking?.tourDate, cancelDate),
    [booking?.tourDate, cancelDate]
  );

  // Initialize form whenever modal opens for a booking
  useEffect(() => {
    if (!isOpen || !booking) return;
    setErrorMsg('');

    const defaultWallet =
      tourWallets.find((w) =>
        (w.name || '').toLowerCase().includes((booking.walletName || '').toLowerCase().replace(' (tour)', ''))
      ) || tourWallets[0];

    if (booking.bookingStatus === 'Cancelled' && booking.cancellationDetails) {
      const cd = booking.cancellationDetails;
      setCancelDate(cd.cancelDate || todayStr);
      const matchedSlab = POLICY_SLABS.find(
        (s) => `${s.label} (${s.sublabel})` === cd.policySlab || s.label === cd.policySlab
      );
      setSelectedSlabId(matchedSlab ? matchedSlab.id : 'custom');
      setCancellationCharge(String(cd.cancellationCharge ?? 0));
      setRefundAmount(String(cd.refundAmount ?? 0));
      setTicketOrHotelLoss(String(cd.ticketOrHotelLoss ?? 0));
      setSelectedWalletId(cd.refundWalletId || defaultWallet?.id || '');
      setPaymentMode(cd.refundPaymentMode || 'UPI');
      setReason(cd.reason || '');
    } else {
      const dStr = todayStr;
      setCancelDate(dStr);
      const days = computeDaysBefore(booking.tourDate, dStr);
      const autoSlab = pickSlabForDays(days);
      setSelectedSlabId(autoSlab.id);
      const recd = Number(booking.advancePaid || 0);
      if (autoSlab.deductionPct !== null) {
        const calcCharge = Math.min(recd, Math.round((recd * autoSlab.deductionPct) / 100));
        const calcRefund = Math.max(0, recd - calcCharge);
        setCancellationCharge(String(calcCharge));
        setRefundAmount(String(calcRefund));
      } else {
        setCancellationCharge('0');
        setRefundAmount(String(recd));
      }
      setTicketOrHotelLoss('0');
      setSelectedWalletId(defaultWallet?.id || '');
      setPaymentMode('UPI');
      setReason('');
    }
  }, [isOpen, booking, tourWallets, todayStr]);

  if (!isOpen || !booking) return null;

  const activeSlab = POLICY_SLABS.find((s) => s.id === selectedSlabId) || POLICY_SLABS[5];
  const numCharge = Math.max(0, Number(cancellationCharge) || 0);
  const numRefund = Math.max(0, Number(refundAmount) || 0);
  const numLoss = Math.max(0, Number(ticketOrHotelLoss) || 0);
  const netRetained = receivedAmount - numRefund - numLoss;

  const selectedWalletObj = tourWallets.find((w) => w.id === selectedWalletId) || tourWallets[0];

  const handleSelectSlab = (slab: PolicySlabOption) => {
    setSelectedSlabId(slab.id);
    if (slab.deductionPct !== null) {
      const calcCharge = Math.min(receivedAmount, Math.round((receivedAmount * slab.deductionPct) / 100));
      const calcRefund = Math.max(0, receivedAmount - calcCharge);
      setCancellationCharge(String(calcCharge));
      setRefundAmount(String(calcRefund));
    }
  };

  const handleChargeChange = (val: string) => {
    setSelectedSlabId('custom');
    setCancellationCharge(val);
    const c = Math.max(0, Number(val) || 0);
    setRefundAmount(String(Math.max(0, receivedAmount - c)));
  };

  const handleRefundChange = (val: string) => {
    setSelectedSlabId('custom');
    setRefundAmount(val);
    const r = Math.max(0, Number(val) || 0);
    setCancellationCharge(String(Math.max(0, receivedAmount - r)));
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (numRefund > receivedAmount) {
      setErrorMsg(
        `Refund amount (${formatCurrency(numRefund)}) received amount (${formatCurrency(receivedAmount)}) se zyada nahi ho sakta.`
      );
      return;
    }

    if (numRefund > 0 && !selectedWalletObj) {
      setErrorMsg('Kripya select karein ki refund kis account / wallet se diya gaya.');
      return;
    }

    setIsSaving(true);
    try {
      const userEmail = currentUserProfile?.email || user?.email || 'admin@sanzari.com';
      await cancelTourBooking(
        {
          bookingId: booking.id,
          cancelDate,
          policySlab: `${activeSlab.label} (${activeSlab.sublabel})`,
          daysBeforeDeparture,
          cancellationCharge: numCharge,
          ticketOrHotelLoss: numLoss,
          refundAmount: numRefund,
          refundWalletId: numRefund > 0 ? selectedWalletObj?.id : undefined,
          refundWalletName: numRefund > 0 ? selectedWalletObj?.name : undefined,
          refundPaymentMode: numRefund > 0 ? paymentMode : undefined,
          reason: reason.trim(),
        },
        userEmail
      );
      onClose();
    } catch (err: any) {
      console.error('Cancel booking error:', err);
      setErrorMsg(err?.message || 'Booking cancel karne me error aaya. Dobara try karein.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreBooking = async () => {
    if (
      !window.confirm(
        `Kya aap "${booking.customerName}" ki cancelled booking wapas Confirm (Restore) karna chahte hain? Agar refund wallet se deduct hua tha, toh wo balance wapas add ho jayega.`
      )
    ) {
      return;
    }
    setIsRestoring(true);
    setErrorMsg('');
    try {
      const userEmail = currentUserProfile?.email || user?.email || 'admin@sanzari.com';
      await restoreCancelledTourBooking(booking.id, userEmail);
      onClose();
    } catch (err: any) {
      console.error('Restore booking error:', err);
      setErrorMsg(err?.message || 'Restore karne me error aaya.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleShareWhatsAppSummary = () => {
    const walletShort = (selectedWalletObj?.name || 'Office').replace(' (Tour)', '');
    const msg =
      `*SANZARI TOURS & TRAVELS*\n*Booking Cancellation & Refund Statement*\n\n` +
      `📌 *Booking ID:* ${booking.bookingNumber}\n` +
      `👤 *Customer:* ${booking.customerName} (${booking.customerPhone})\n` +
      `📍 *Tour:* ${booking.destination} (${booking.tourDate})\n` +
      `📅 *Cancel Date:* ${cancelDate}\n` +
      `📋 *Policy Applied:* ${activeSlab.label} (${activeSlab.sublabel})\n\n` +
      `💰 *Total Received:* ₹${receivedAmount.toLocaleString('en-IN')}\n` +
      `✂️ *Cancellation Charge:* ₹${numCharge.toLocaleString('en-IN')}\n` +
      `✅ *Net Refund Amount:* ₹${numRefund.toLocaleString('en-IN')}\n` +
      (numRefund > 0
        ? `💳 *Refund Paid Via:* ${walletShort} (${paymentMode})\n`
        : `ℹ️ *Refund Status:* Non-refundable as per policy\n`) +
      (reason ? `📝 *Note:* ${reason}\n` : '');

    const clean = (booking.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCode = clean.length === 10 ? `91${clean}` : clean;
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs overflow-hidden sm:overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-zinc-900 overflow-hidden my-0 sm:my-auto max-h-[94dvh] sm:max-h-[95vh] flex flex-col"
      >
        {/* Mobile bottom-sheet grab handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-zinc-950 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="bg-zinc-950 px-4 py-3 sm:p-5 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <XCircle size={20} className="stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                {isAlreadyCancelled ? 'Edit Cancellation & Refund' : 'Cancel Booking & Refund'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-semibold truncate">
                {booking.customerName} • {booking.bookingNumber} • {booking.membersCount} Pax • {booking.tourDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmCancel} className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 safe-bottom sm:pb-5">
          {/* Top Summary Box */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="bg-white p-2 rounded-xl border border-rose-100 text-center">
              <span className="text-[9px] font-black text-zinc-500 uppercase block">Total Package</span>
              <span className="text-xs sm:text-sm font-black font-mono text-zinc-950">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center">
              <span className="text-[9px] font-black text-emerald-700 uppercase block">Received (Jama)</span>
              <span className="text-xs sm:text-sm font-black font-mono text-emerald-700">
                {formatCurrency(receivedAmount)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-200 text-center">
              <span className="text-[9px] font-black text-amber-800 uppercase block">Before Tour</span>
              <span className="text-xs sm:text-sm font-black font-mono text-amber-900">
                {daysBeforeDeparture !== undefined
                  ? daysBeforeDeparture >= 0
                    ? `${daysBeforeDeparture} Days`
                    : 'Departed'
                  : '—'}
              </span>
            </div>
          </div>

          {/* 1. Cancellation Policy Slab */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-rose-600" />
                1. Cancellation Policy Slab (Auto-Calculate)
              </label>
              <span className="text-[10px] font-bold text-zinc-500">
                Policy ke hisab se select karein
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {POLICY_SLABS.map((slab) => {
                const isSelected = selectedSlabId === slab.id;
                return (
                  <button
                    key={slab.id}
                    type="button"
                    onClick={() => handleSelectSlab(slab)}
                    className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                        : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <div className="text-[11px] font-black leading-tight">{slab.label}</div>
                    <div
                      className={`text-[10px] font-bold mt-0.5 ${
                        isSelected ? 'text-amber-400' : 'text-rose-600'
                      }`}
                    >
                      {slab.sublabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Refund, Cancellation Charge & Loss Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-700 block mb-1">
                Policy Charge / Deduction (₹)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={cancellationCharge}
                onChange={(e) => handleChargeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-zinc-300 focus:border-zinc-950 font-mono font-black text-sm text-zinc-950 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-emerald-800 block mb-1">
                Refund to Customer (₹) *
              </label>
              <input
                type="number"
                min={0}
                max={receivedAmount}
                step="1"
                value={refundAmount}
                onChange={(e) => handleRefundChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 focus:bg-white font-mono font-black text-sm text-emerald-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-rose-700 block mb-1 flex items-center gap-1">
                <TrendingDown size={11} /> Ticket / Hotel Loss (₹)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={ticketOrHotelLoss}
                onChange={(e) => setTicketOrHotelLoss(e.target.value)}
                placeholder="IRCTC / Hotel loss"
                className="w-full px-3 py-2 rounded-xl border-2 border-rose-300 bg-rose-50/30 focus:bg-white focus:border-rose-600 font-mono font-black text-sm text-rose-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Settlement Preview Strip */}
          <div
            className={`p-3 rounded-2xl border-2 flex items-center justify-between flex-wrap gap-2 text-xs ${
              netRetained < 0
                ? 'bg-rose-50 border-rose-400 text-rose-950'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900'
            }`}
          >
            <div className="space-y-0.5">
              <div className="font-black text-[11px] uppercase tracking-wide text-zinc-600">
                Final Cancellation Hisab (With Loss)
              </div>
              <div className="text-[11px] font-bold">
                Jama {formatCurrency(receivedAmount)} − Refund {formatCurrency(numRefund)}
                {numLoss > 0 ? ` − Ticket/Hotel Loss ${formatCurrency(numLoss)}` : ''}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase block text-zinc-500">
                {netRetained < 0 ? 'Net Company Loss' : 'Net Company Retained'}
              </span>
              <span
                className={`text-base font-black font-mono ${
                  netRetained < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {netRetained < 0 ? `-${formatCurrency(Math.abs(netRetained))}` : formatCurrency(netRetained)}
              </span>
            </div>
          </div>

          {/* 3. Kiske Account Se Refund Diya? (Wallet Selection) */}
          {numRefund > 0 ? (
            <div className="space-y-2.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                <Wallet size={13} className="text-rose-600" />
                2. Kiske Account Se Refund Diya? (Deduct From Wallet) *
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tourWallets.map((w) => {
                  const isSel = selectedWalletObj?.id === w.id;
                  const shortName = w.name.replace(' (Tour)', '');
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWalletId(w.id)}
                      className={`p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                        isSel
                          ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                          : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-xs truncate">{shortName}</span>
                        {isSel && <CheckCircle2 size={14} className="text-amber-400 shrink-0" />}
                      </div>
                      <div
                        className={`text-[11px] font-mono font-bold mt-0.5 ${
                          isSel ? 'text-amber-300' : 'text-zinc-500'
                        }`}
                      >
                        {formatCurrency(Number(w.currentBalance || 0))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Payment Mode */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(
                  [
                    { val: 'UPI', label: '📲 UPI / GPay' },
                    { val: 'Cash', label: '💵 Cash' },
                    { val: 'Online', label: '🏦 Bank' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => setPaymentMode(m.val)}
                    className={`py-2 px-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      paymentMode === m.val
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900">
              ℹ️ Refund Amount ₹0 hai — kisi bhi wallet/account se paisa deduct nahi hoga.
            </div>
          )}

          {/* 4. Cancel Date & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-700 block mb-1 flex items-center gap-1">
                <Calendar size={11} /> Cancellation Date *
              </label>
              <input
                type="date"
                required
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-zinc-300 focus:border-zinc-950 font-bold text-xs text-zinc-950 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-zinc-700 block mb-1">
                Cancellation Reason / Remarks
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Medical emergency / Plan changed"
                className="w-full px-3 py-2 rounded-xl border-2 border-zinc-300 focus:border-zinc-950 font-semibold text-xs text-zinc-950 focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-zinc-200 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {isAlreadyCancelled && (
                <button
                  type="button"
                  disabled={isRestoring || isSaving}
                  onClick={handleRestoreBooking}
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-800 hover:text-white border border-blue-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  <span>{isRestoring ? 'Restoring...' : 'Restore Booking'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareWhatsAppSummary}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                title="Send Cancellation & Refund Summary on WhatsApp"
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-black text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving || isRestoring}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <XCircle size={14} className="stroke-[2.5]" />
                <span>
                  {isSaving
                    ? 'Saving...'
                    : isAlreadyCancelled
                    ? 'Update Cancellation'
                    : 'Confirm Cancel & Refund'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
