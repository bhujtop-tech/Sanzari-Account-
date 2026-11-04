import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  IndianRupee,
  Wallet,
  Calendar,
  Clock,
  MessageCircle,
  FileText,
  ArrowDownLeft,
  Sparkles,
  Phone,
  MapPin,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { TourBooking, TourPaymentMode, PaymentMethod, TourPaymentEntry } from '../../types';
import { recordTourBookingPayment } from '../../services/db';

interface ReceiveTourPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: TourBooking | null;
}

export const ReceiveTourPaymentModal: React.FC<ReceiveTourPaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const {
    tourBookings,
    tourWallets,
    formatCurrency,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
  } = useData();
  const { user, currentUserProfile } = useAuth();

  // Always read live booking from context so real-time updates reflect immediately
  const liveBooking = useMemo(() => {
    if (!booking) return null;
    return tourBookings.find((b) => b.id === booking.id) || booking;
  }, [booking, tourBookings]);

  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<TourPaymentMode>('UPI');
  const [walletName, setWalletName] = useState<string>('Sahil (Tour)');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [justPaidAmount, setJustPaidAmount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && liveBooking) {
      const due = Math.max(0, Number(liveBooking.balanceDue ?? liveBooking.pendingAmount ?? 0));
      setAmountReceived(due > 0 ? String(due) : '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setErrorMsg('');
      setJustPaidAmount(null);

      // Default wallet to booking's wallet or current logged-in partner's wallet
      const isSahil =
        currentUserProfile?.name?.toLowerCase().includes('sahil') ||
        user?.displayName?.toLowerCase().includes('sahil');
      const sahilW = tourWallets.find((w) => w.name.toLowerCase().includes('sahil'));
      const rizwanW = tourWallets.find((w) => w.name.toLowerCase().includes('rizwan'));

      if (liveBooking.walletName) {
        setWalletName(liveBooking.walletName);
      } else if (isSahil && sahilW) {
        setWalletName(sahilW.name);
      } else {
        setWalletName(rizwanW?.name || tourWallets[0]?.name || 'Rizwan (Tour)');
      }
    }
  }, [isOpen, liveBooking?.id]);

  const totalAmount = Number(liveBooking?.totalAmount || 0);
  const advancePaid = Number(liveBooking?.advancePaid || 0);
  const currentDue = Math.max(0, totalAmount - advancePaid);
  const paidPercentage = totalAmount > 0 ? Math.min(100, Math.round((advancePaid / totalAmount) * 100)) : 0;

  // Build effective payment history list for display (must be above early return to follow Rules of Hooks)
  const paymentHistoryList: TourPaymentEntry[] = useMemo(() => {
    if (!liveBooking) return [];
    if (Array.isArray(liveBooking.paymentHistory) && liveBooking.paymentHistory.length > 0) {
      return liveBooking.paymentHistory;
    }
    if (advancePaid > 0) {
      return [
        {
          id: 'initial-advance',
          amount: advancePaid,
          date: liveBooking.createdAt || liveBooking.tourDate || new Date().toISOString(),
          walletName: liveBooking.walletName || 'Rizwan (Tour)',
          paymentMode: liveBooking.paymentMode || 'Online',
          paymentMethod: liveBooking.paymentMethod || 'UPI',
          notes: 'Initial Booking Advance',
          receivedBy: liveBooking.bookedBy || 'Office Staff',
        },
      ];
    }
    return [];
  }, [liveBooking, advancePaid]);

  if (!isOpen || !liveBooking) return null;

  const numEntering = Number(amountReceived || 0);
  const previewNewAdvance = advancePaid + (numEntering > 0 ? numEntering : 0);
  const previewNewDue = Math.max(0, totalAmount - previewNewAdvance);

  const formatInstallmentDate = (dStr?: string) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amt = Number(amountReceived);
    if (!amt || amt <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than ₹0.');
      return;
    }
    if (amt > currentDue && currentDue > 0) {
      setErrorMsg(`Amount cannot exceed remaining balance due (${formatCurrency(currentDue)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const method: PaymentMethod =
        paymentMode === 'UPI' || paymentMode === 'Online' ? 'UPI' : 'Cash';

      await recordTourBookingPayment({
        bookingId: liveBooking.id,
        amount: amt,
        walletName: walletName || 'Rizwan (Tour)',
        paymentMode,
        paymentMethod: method,
        notes:
          notes.trim() ||
          (currentDue - amt <= 0
            ? 'Full & Final Payment Received'
            : `Installment #${paymentHistoryList.length + 1} Received`),
        receivedBy: currentUserProfile?.name || user?.displayName || 'Office Staff',
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        userEmail: currentUserProfile?.email || user?.email || 'admin@sanzari.com',
      });

      setJustPaidAmount(amt);
      setAmountReceived('');
      setNotes('');
    } catch (err: any) {
      console.error('Failed to record tour payment:', err);
      setErrorMsg(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppPaymentReceipt = (lastAmt?: number) => {
    const historyLines = paymentHistoryList
      .map(
        (h, i) =>
          `  ${i + 1}. ₹${Number(h.amount).toLocaleString('en-IN')} (${formatInstallmentDate(h.date)} - ${h.paymentMode})`
      )
      .join('\n');

    const statusLine =
      currentDue === 0
        ? `✅ *PAYMENT STATUS: FULL PAID (100% Received)*`
        : `⏳ *Remaining Balance Due: ₹${currentDue.toLocaleString('en-IN')}*`;

    const msg =
      `🚩 *SANZARI TOURS & TRAVELS - BHUJ* 🚩\n` +
      `🧾 *Payment Received Confirmation*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Booking ID:* ${liveBooking.bookingNumber}\n` +
      `👤 *Customer:* ${liveBooking.customerName}\n` +
      `📍 *Tour:* ${liveBooking.destination} (${liveBooking.tourDate})\n` +
      `👥 *Travelers:* ${liveBooking.membersCount} Pax (${liveBooking.travelClass})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      (lastAmt
        ? `💵 *Latest Payment Received:* ₹${lastAmt.toLocaleString('en-IN')}\n`
        : '') +
      `💰 *Total Package Amount:* ₹${totalAmount.toLocaleString('en-IN')}\n` +
      `✅ *Total Paid So Far:* ₹${advancePaid.toLocaleString('en-IN')}\n` +
      `${statusLine}\n` +
      (paymentHistoryList.length > 0
        ? `━━━━━━━━━━━━━━━━━━━━━━━━━\n*Payment History:*\n${historyLines}\n`
        : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for choosing Sanzari Tours & Travels! 🙏`;

    const phoneClean = (liveBooking.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCode = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleOpenVoucher = () => {
    setTourReceiptBooking(liveBooking);
    setIsTourReceiptOpen(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white text-zinc-950 rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b-2 border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-xs ${
                currentDue === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-950 text-white'
              }`}
            >
              {currentDue === 0 ? <CheckCircle2 className="w-5 h-5" /> : <IndianRupee className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950">
                  {currentDue === 0 ? 'Payment Completed (Full Paid)' : 'Receive Baaki / Due Payment'}
                </h2>
                <span className="text-[10px] font-mono font-black bg-zinc-100 text-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-300">
                  {liveBooking.bookingNumber}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 font-semibold flex items-center gap-2 mt-0.5">
                <span className="font-black text-zinc-950">{liveBooking.customerName}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Phone size={10} /> {liveBooking.customerPhone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={10} /> {liveBooking.destination}
                </span>
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

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1 bg-zinc-50/50">
          {/* Success Banner when payment just recorded */}
          {justPaidAmount !== null && (
            <div className="p-3.5 rounded-2xl bg-emerald-600 text-white border-2 border-emerald-800 shadow-md flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-200" />
                <div>
                  <div className="font-black text-xs sm:text-sm">
                    ₹{justPaidAmount.toLocaleString('en-IN')} Payment Recorded Successfully!
                  </div>
                  <div className="text-[11px] text-emerald-100 font-medium">
                    Added to <strong>{walletName}</strong> •{' '}
                    {currentDue === 0
                      ? '🎉 Booking is now 100% FULL PAID!'
                      : `Remaining Due: ${formatCurrency(currentDue)}`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleWhatsAppPaymentReceipt(justPaidAmount)}
                className="px-3 py-1.5 rounded-xl bg-white text-emerald-950 font-black text-[11px] flex items-center gap-1 shadow-xs hover:bg-emerald-50 cursor-pointer shrink-0"
              >
                <MessageCircle size={13} className="text-emerald-600" />
                <span>Send Receipt</span>
              </button>
            </div>
          )}

          {/* 1. Payment Summary & Progress Bar */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                Payment Status ({paidPercentage}% Received)
              </span>
              {currentDue === 0 ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-400 font-black text-[11px] flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-700" />
                  ✅ FULL PAID (Payment Aagaya)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-400 font-black text-[11px]">
                  ⏳ Baaki Due: {formatCurrency(currentDue)}
                </span>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-300">
              <div
                className={`h-full transition-all duration-500 ${
                  currentDue === 0 ? 'bg-emerald-600' : 'bg-emerald-500'
                }`}
                style={{ width: `${paidPercentage}%` }}
              />
            </div>

            {/* 3 Amount Boxes */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                <span className="text-[10px] font-bold uppercase text-zinc-500 block">
                  Total Package
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-zinc-950">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                  Received (Jama)
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-emerald-700">
                  {formatCurrency(advancePaid)}
                </span>
                {paymentHistoryList.length > 0 && (
                  <span className="text-[9px] font-bold text-emerald-900 block mt-0.5 truncate">
                    {paymentHistoryList
                      .map(
                        (p) =>
                          `${(p.walletName || 'Rizwan').replace(' (Tour)', '')} (${p.paymentMode || 'UPI'})`
                      )
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join(', ')}
                  </span>
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border text-center ${
                  currentDue === 0
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-rose-50 border-rose-300'
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase block ${
                    currentDue === 0 ? 'text-emerald-800' : 'text-rose-700'
                  }`}
                >
                  Baaki (Due)
                </span>
                <span
                  className={`text-sm sm:text-base font-black font-mono ${
                    currentDue === 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {currentDue === 0 ? '₹0 (Paid)' : formatCurrency(currentDue)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Receive New Installment Form (Only if currentDue > 0) */}
          {currentDue > 0 ? (
            <form
              onSubmit={handleReceivePayment}
              className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>Receive Payment — Account, Mode &amp; Amount</span>
                </span>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs">
                  {errorMsg}
                </div>
              )}

              {/* STEP 1: KISKE ACCOUNT ME PAYMENT AAYA? (Sahil vs Rizwan) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                  <Wallet size={13} className="text-zinc-900" />
                  <span>1. Kiske Account / Wallet me Payment Aaya? *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(tourWallets.length > 0
                    ? tourWallets
                    : [
                        { id: 'sahil', name: 'Sahil (Tour)' },
                        { id: 'rizwan', name: 'Rizwan (Tour)' },
                        { id: 'bus', name: 'Bus (Tour)' },
                      ]
                  ).map((w) => {
                    const isSelected = walletName === w.name;
                    const isSahilW = w.name.toLowerCase().includes('sahil');
                    const isRizwanW = w.name.toLowerCase().includes('rizwan');
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setWalletName(w.name)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                            : 'bg-zinc-50 text-zinc-900 border-zinc-300 hover:border-zinc-900'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected
                              ? isSahilW
                                ? 'bg-purple-500 text-white'
                                : isRizwanW
                                ? 'bg-blue-500 text-white'
                                : 'bg-amber-500 text-white'
                              : 'bg-white border border-zinc-300 text-zinc-900'
                          }`}
                        >
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-xs truncate">
                            {w.name.replace(' (Tour)', '')}
                          </div>
                          <div
                            className={`text-[9px] font-bold truncate ${
                              isSelected ? 'text-emerald-300' : 'text-zinc-500'
                            }`}
                          >
                            {isSelected ? '✓ Selected Account' : 'Tour Account'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: PAYMENT KESE RECEIVED HUA? (Mode: UPI / Cash / Online) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-800">
                  2. Payment Kese Received Hua? (Payment Mode) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { mode: 'UPI' as TourPaymentMode, label: 'UPI / GPay', sub: 'PhonePe / QR', icon: '📱' },
                    { mode: 'Cash' as TourPaymentMode, label: 'Cash (Rokda)', sub: 'Office Cash', icon: '💵' },
                    { mode: 'Online' as TourPaymentMode, label: 'Bank / Online', sub: 'NEFT / IMPS', icon: '🏦' },
                    { mode: 'Offline' as TourPaymentMode, label: 'Offline / Other', sub: 'Cheque / Other', icon: '🧾' },
                  ].map((item) => {
                    const isSelected = paymentMode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => setPaymentMode(item.mode)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-800 shadow-sm'
                            : 'bg-zinc-50 text-zinc-900 border-zinc-300 hover:border-zinc-900'
                        }`}
                      >
                        <div className="font-black text-xs flex items-center gap-1">
                          <span>{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </div>
                        <div
                          className={`text-[9px] font-bold mt-0.5 ${
                            isSelected ? 'text-emerald-100' : 'text-zinc-500'
                          }`}
                        >
                          {isSelected ? '✓ Selected Mode' : item.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: KITNA AMOUNT AAYA? (Quick Chips + Input) */}
              <div className="space-y-2 pt-1 border-t border-zinc-200">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-800">
                    3. Kitna Amount Received Hua? (₹) *
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setAmountReceived(String(currentDue));
                        setNotes('Full & Final Balance Received');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-black text-[11px] border transition-all cursor-pointer ${
                        Number(amountReceived) === currentDue
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-400 hover:bg-emerald-100'
                      }`}
                    >
                      ✅ Full Baaki ({formatCurrency(currentDue)})
                    </button>

                    {[5000, 10000, 15000, 20000]
                      .filter((amt) => amt < currentDue)
                      .map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmountReceived(String(amt))}
                          className={`px-2 py-1 rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                            Number(amountReceived) === amt
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200'
                          }`}
                        >
                          +₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Amount & Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                      Enter Received Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={currentDue}
                      placeholder={`Max ₹${currentDue}`}
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full bg-emerald-50/50 border-2 border-emerald-600 rounded-xl px-3 py-2 text-emerald-900 font-mono font-black text-base focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1 flex items-center gap-1">
                      <Calendar size={11} /> Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Note */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                  Payment Note / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GPay from customer / Cash given at office"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-semibold text-xs focus:outline-none"
                />
              </div>

              {/* Live Preview Box showing Account + Mode + Amount */}
              {numEntering > 0 && (
                <div className="p-3 rounded-xl bg-zinc-950 text-white flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                      Receiving in <strong className="text-white">{walletName}</strong> via{' '}
                      <strong className="text-emerald-400">{paymentMode}</strong>:
                    </span>
                    <span className="text-xs font-black text-emerald-400">
                      Total Jama: {formatCurrency(previewNewAdvance)} / {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                      New Remaining Due:
                    </span>
                    <span
                      className={`text-xs font-black font-mono ${
                        previewNewDue === 0 ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {previewNewDue === 0
                        ? '₹0 (✅ FULL PAID!)'
                        : formatCurrency(previewNewDue)}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isSubmitting
                    ? 'Saving Payment...'
                    : numEntering > 0
                    ? `Save ${formatCurrency(numEntering)} in ${walletName.replace(' (Tour)', '')} (${paymentMode})`
                    : 'Confirm Payment Received'}
                </span>
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-black text-emerald-950">
                100% Full Payment Received! (Pura Payment Aagaya He)
              </h3>
              <p className="text-xs text-emerald-800 font-medium">
                All {formatCurrency(totalAmount)} has been collected for this booking. Zero pending due.
              </p>
            </div>
          )}

          {/* 3. Payment Installments / Timeline History */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-900" />
                <span>Received Payment History ({paymentHistoryList.length})</span>
              </span>
              <span className="text-[11px] font-mono font-black text-emerald-700">
                Total: {formatCurrency(advancePaid)}
              </span>
            </div>

            {paymentHistoryList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center font-medium">
                No payment installments recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {paymentHistoryList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-zinc-950">
                            {idx === 0 ? '1st Advance' : `Installment #${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-zinc-300 text-zinc-700">
                            💳 {item.walletName}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                            {item.paymentMode}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                          📅 {formatInstallmentDate(item.date)}
                          {item.notes ? ` • ${item.notes}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-xs sm:text-sm text-emerald-700">
                        +{formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-5 py-3 border-t-2 border-zinc-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleWhatsAppPaymentReceipt()}
              className="px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <MessageCircle size={14} />
              <span>WhatsApp Payment Status</span>
            </button>

            <button
              type="button"
              onClick={handleOpenVoucher}
              className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileText size={14} />
              <span>Voucher Slip</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
