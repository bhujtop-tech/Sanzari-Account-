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
  Phone,
  MapPin,
  Pencil,
  Trash2,
  Check,
  Tag,
  ArrowRightLeft,
  Receipt,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  TourBooking,
  TourPaymentMode,
  PaymentMethod,
  TourPaymentEntry,
  TourExpense,
  TourExpenseCategory,
} from '../../types';
import {
  recordTourBookingPayment,
  updateTourBookingPaymentEntry,
  deleteTourBookingPaymentEntry,
  updateTourBookingDiscount,
  addTourExpense,
} from '../../services/db';
import { isPrivateTourBooking } from './TourCommissionView';
import { matchesPrivateTourExpense } from '../../utils/tourWalletLedger';

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
    tourBatches,
    tourBookings,
    tourExpenses,
    tourWallets,
    formatCurrency,
    formatDate,
    openEditTourExpenseModal,
    deleteTourExpenseById,
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
  const [actionBanner, setActionBanner] = useState<string>('');

  // Discount / Gapchi (write-off) state inside Receive Payment form
  const [showDiscountBox, setShowDiscountBox] = useState(false);
  const [discountInput, setDiscountInput] = useState<string>('');
  const [discountType, setDiscountType] = useState<'Discount' | 'Gapchi / Waived'>('Discount');
  const [discountReason, setDiscountReason] = useState<string>('');

  // Edit existing applied discount state
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [editDiscountAmount, setEditDiscountAmount] = useState<string>('');
  const [editDiscountType, setEditDiscountType] = useState<'Discount' | 'Gapchi / Waived'>('Discount');
  const [editDiscountReason, setEditDiscountReason] = useState<string>('');
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [discountEditError, setDiscountEditError] = useState('');

  // Inline Edit Payment Entry state
  const [editingEntryIdx, setEditingEntryIdx] = useState<number | null>(null);
  const [editWalletName, setEditWalletName] = useState<string>('');
  const [editPaymentMode, setEditPaymentMode] = useState<TourPaymentMode>('UPI');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editError, setEditError] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

  // Inline Private Package Expense state
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [expCategory, setExpCategory] = useState<TourExpenseCategory>('Hotel & Stay');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expWalletName, setExpWalletName] = useState('Rizwan (Tour)');
  const [expPaymentMode, setExpPaymentMode] = useState<TourPaymentMode>('UPI');
  const [expDate, setExpDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expError, setExpError] = useState('');
  const [confirmDeleteExpId, setConfirmDeleteExpId] = useState<string | null>(null);

  const walletOptions = useMemo(() => {
    if (tourWallets.length > 0) return tourWallets;
    return [
      { id: 'sahil', name: 'Sahil (Tour)' },
      { id: 'rizwan', name: 'Rizwan (Tour)' },
      { id: 'bus', name: 'Bus (Tour)' },
    ];
  }, [tourWallets]);

  useEffect(() => {
    if (isOpen && liveBooking) {
      const due = Math.max(0, Number(liveBooking.balanceDue ?? liveBooking.pendingAmount ?? 0));
      setAmountReceived(due > 0 ? String(due) : '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setErrorMsg('');
      setJustPaidAmount(null);
      setActionBanner('');
      setShowDiscountBox(false);
      setDiscountInput('');
      setDiscountType('Discount');
      setDiscountReason('');
      setIsEditingDiscount(false);
      setDiscountEditError('');
      setEditingEntryIdx(null);
      setConfirmDeleteIdx(null);
      setEditError('');
      setShowAddExpenseForm(false);
      setExpCategory('Hotel & Stay');
      setExpDescription('');
      setExpAmount('');
      setExpPaymentMode('UPI');
      setExpDate(new Date().toISOString().split('T')[0]);
      setExpError('');
      setConfirmDeleteExpId(null);

      // Default wallet to booking's wallet or current logged-in partner's wallet
      const isSahil =
        currentUserProfile?.name?.toLowerCase().includes('sahil') ||
        user?.displayName?.toLowerCase().includes('sahil');
      const sahilW = tourWallets.find((w) => w.name.toLowerCase().includes('sahil'));
      const rizwanW = tourWallets.find((w) => w.name.toLowerCase().includes('rizwan'));

      const defaultWallet = liveBooking.walletName
        ? liveBooking.walletName
        : isSahil && sahilW
        ? sahilW.name
        : rizwanW?.name || tourWallets[0]?.name || 'Rizwan (Tour)';
      setWalletName(defaultWallet);
      setExpWalletName(defaultWallet);
    }
  }, [isOpen, liveBooking?.id]);

  const totalAmount = Number(liveBooking?.totalAmount || 0);
  const appliedDiscount = Number(liveBooking?.discountAmount || 0);
  const originalTotalAmount =
    Number(liveBooking?.originalTotalAmount || 0) > 0
      ? Number(liveBooking?.originalTotalAmount)
      : totalAmount + appliedDiscount;
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

  // Detect Private Package & pull all expenses linked from Wallet/Accounts or directly inside this modal
  const isPrivatePackage = useMemo(() => {
    if (!liveBooking) return false;
    return isPrivateTourBooking(liveBooking, tourBatches);
  }, [liveBooking, tourBatches]);

  const linkedPrivateExpenses = useMemo(() => {
    if (!liveBooking) return [];
    return tourExpenses
      .filter((exp) => matchesPrivateTourExpense(exp, liveBooking))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [tourExpenses, liveBooking]);

  const totalPrivateExpenses = useMemo(
    () => linkedPrivateExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0),
    [linkedPrivateExpenses]
  );

  const privateBillingProfit = totalAmount - totalPrivateExpenses;
  const privateCashBalance = advancePaid - totalPrivateExpenses;

  if (!isOpen || !liveBooking) return null;

  const numEntering = Math.max(0, Number(amountReceived || 0));
  const numDiscount = showDiscountBox ? Math.max(0, Number(discountInput || 0)) : 0;
  const previewNewTotal = Math.max(0, totalAmount - numDiscount);
  const previewNewAdvance = advancePaid + numEntering;
  const previewNewDue = Math.max(0, previewNewTotal - previewNewAdvance);
  const leftoverAfterCash = Math.max(0, currentDue - numEntering);

  const toDateInputValue = (dStr?: string) => {
    if (!dStr) return new Date().toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  };

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

  const resolveCanonicalWalletName = (rawName?: string) => {
    const raw = (rawName || '').toLowerCase().trim();
    const matched = walletOptions.find(
      (w) =>
        w.name.toLowerCase().trim() === raw ||
        (raw.includes('sahil') && w.name.toLowerCase().includes('sahil')) ||
        (raw.includes('rizwan') && w.name.toLowerCase().includes('rizwan')) ||
        (raw.includes('bus') && w.name.toLowerCase().includes('bus'))
    );
    return matched?.name || rawName || walletOptions[0]?.name || 'Rizwan (Tour)';
  };

  const PRIVATE_EXPENSE_CATEGORIES: TourExpenseCategory[] = [
    'Hotel & Stay',
    'Train & Transport',
    'Food & Meals',
    'Sightseeing & Entry',
    'Guide & Staff',
    'Mustak Commission',
    'Customer Refund',
    'Other',
  ];

  const handleAddPrivateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError('');
    const amt = Number(expAmount);
    if (!amt || amt <= 0) {
      setExpError('Please enter a valid expense amount greater than ₹0.');
      return;
    }

    const canonicalWallet = resolveCanonicalWalletName(expWalletName);
    const matchedWallet = tourWallets.find(
      (w) => w.name.toLowerCase().trim() === canonicalWallet.toLowerCase().trim()
    );
    const userEmail = currentUserProfile?.email || user?.email || 'admin@sanzari.com';
    const cleanDate = expDate || new Date().toISOString().split('T')[0];

    setIsSavingExpense(true);
    try {
      await addTourExpense(
        {
          tourBatchId: `PRIVATE_${liveBooking.id}`,
          tourBookingId: liveBooking.id,
          tourTitle: `🚗 Private (${liveBooking.tourDate}) • ${liveBooking.customerName}`,
          destination: liveBooking.destination || '',
          category: expCategory,
          amount: amt,
          walletId: matchedWallet?.id || '',
          walletName: canonicalWallet,
          paymentMode: expPaymentMode,
          paidToPerson: expCategory === 'Mustak Commission' ? 'Mustak' : undefined,
          date: cleanDate,
          monthKey: cleanDate.slice(0, 7),
          description: expDescription.trim() || `${expCategory} • ${liveBooking.customerName}`,
          notes: `${expPaymentMode} • ${canonicalWallet}`,
        },
        userEmail
      );
      setExpAmount('');
      setExpDescription('');
      setShowAddExpenseForm(false);
      setActionBanner(`Expense of ${formatCurrency(amt)} added & deducted from ${canonicalWallet}.`);
    } catch (err: any) {
      console.error('Failed to add private package expense:', err);
      setExpError(err?.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeletePrivateExpense = async (exp: TourExpense) => {
    try {
      await deleteTourExpenseById(exp.id);
      setConfirmDeleteExpId(null);
      setActionBanner(
        `Expense of ${formatCurrency(exp.amount)} deleted & refunded to ${exp.walletName || 'Wallet'}.`
      );
    } catch (err: any) {
      console.error('Failed to delete private package expense:', err);
      setExpError(err?.message || 'Failed to delete expense.');
    }
  };

  const handleStartEditEntry = (item: TourPaymentEntry, idx: number) => {
    setEditingEntryIdx(idx);
    setConfirmDeleteIdx(null);
    setEditError('');
    setEditWalletName(resolveCanonicalWalletName(item.walletName || liveBooking.walletName));
    setEditPaymentMode(item.paymentMode || 'UPI');
    setEditAmount(String(Number(item.amount || 0)));
    setEditDate(toDateInputValue(item.date));
    setEditNotes(item.notes || '');
  };

  const handleCancelEditEntry = () => {
    setEditingEntryIdx(null);
    setConfirmDeleteIdx(null);
    setEditError('');
  };

  const handleSaveEditEntry = async (item: TourPaymentEntry, idx: number) => {
    setEditError('');
    const newAmt = Number(editAmount);
    if (!newAmt || newAmt <= 0) {
      setEditError('Please enter a valid amount greater than ₹0.');
      return;
    }

    const oldAmt = Number(item.amount || 0);
    const otherEntriesSum = paymentHistoryList.reduce(
      (sum, h, i) => (i === idx ? sum : sum + Number(h.amount || 0)),
      0
    );
    const projectedAdvance = otherEntriesSum + newAmt;
    if (projectedAdvance > totalAmount && newAmt > oldAmt) {
      const maxForEntry = Math.max(0, totalAmount - otherEntriesSum);
      setEditError(
        `Total received (${formatCurrency(projectedAdvance)}) cannot exceed package total (${formatCurrency(totalAmount)}). Max for this entry: ${formatCurrency(maxForEntry)}.`
      );
      return;
    }

    setIsSavingEdit(true);
    try {
      const method: PaymentMethod =
        editPaymentMode === 'UPI' || editPaymentMode === 'Online'
          ? 'UPI'
          : editPaymentMode === 'Cash'
          ? 'Cash'
          : 'Other';

      await updateTourBookingPaymentEntry({
        bookingId: liveBooking.id,
        entryIndex: idx,
        entryId: item.id !== 'initial-advance' ? item.id : undefined,
        amount: newAmt,
        walletName: editWalletName,
        paymentMode: editPaymentMode,
        paymentMethod: method,
        paymentDate: editDate ? new Date(editDate).toISOString() : item.date || new Date().toISOString(),
        notes: editNotes,
        userEmail: currentUserProfile?.email || user?.email || 'admin@sanzari.com',
      });

      const oldW = (item.walletName || liveBooking.walletName || '').replace(' (Tour)', '');
      const newW = editWalletName.replace(' (Tour)', '');
      const walletChanged = oldW.toLowerCase() !== newW.toLowerCase();

      setActionBanner(
        walletChanged
          ? `Payment updated! ${oldW} (-${formatCurrency(oldAmt)}) & ${newW} (+${formatCurrency(newAmt)}) dono accounts sync ho gaye.`
          : `Payment updated to ${formatCurrency(newAmt)} in ${newW} (${editPaymentMode})! Account balance synced.`
      );
      setJustPaidAmount(null);
      setEditingEntryIdx(null);
      setConfirmDeleteIdx(null);
    } catch (err: any) {
      console.error('Failed to update payment entry:', err);
      setEditError(err.message || 'Failed to update payment entry.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEntry = async (item: TourPaymentEntry, idx: number) => {
    setEditError('');
    setIsSavingEdit(true);
    try {
      await deleteTourBookingPaymentEntry({
        bookingId: liveBooking.id,
        entryIndex: idx,
        entryId: item.id !== 'initial-advance' ? item.id : undefined,
        userEmail: currentUserProfile?.email || user?.email || 'admin@sanzari.com',
      });

      const wLabel = (item.walletName || liveBooking.walletName || '').replace(' (Tour)', '');
      setActionBanner(
        `Entry deleted! ${formatCurrency(item.amount)} reversed from ${wLabel} account.`
      );
      setJustPaidAmount(null);
      setEditingEntryIdx(null);
      setConfirmDeleteIdx(null);
    } catch (err: any) {
      console.error('Failed to delete payment entry:', err);
      setEditError(err.message || 'Failed to delete payment entry.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenEditDiscount = () => {
    setEditDiscountAmount(String(appliedDiscount));
    setEditDiscountType(liveBooking.discountType || 'Discount');
    setEditDiscountReason(liveBooking.discountReason || '');
    setDiscountEditError('');
    setIsEditingDiscount(true);
  };

  const handleSaveDiscountEdit = async (overrideAmount?: number) => {
    setDiscountEditError('');
    const targetAmt = overrideAmount !== undefined ? overrideAmount : Math.max(0, Number(editDiscountAmount || 0));
    const maxAllowed = Math.max(0, originalTotalAmount - advancePaid);
    if (targetAmt > maxAllowed) {
      setDiscountEditError(`Discount cannot exceed ${formatCurrency(maxAllowed)}.`);
      return;
    }

    setIsSavingDiscount(true);
    try {
      await updateTourBookingDiscount({
        bookingId: liveBooking.id,
        discountAmount: targetAmt,
        discountType: editDiscountType,
        discountReason: editDiscountReason,
        userEmail: currentUserProfile?.email || user?.email || 'admin@sanzari.com',
      });
      setIsEditingDiscount(false);
      setActionBanner(
        targetAmt === 0
          ? `Discount / Gapchi removed! Package restored to ${formatCurrency(originalTotalAmount)}.`
          : `${editDiscountType} updated to ${formatCurrency(targetAmt)}! Net package is now ${formatCurrency(originalTotalAmount - targetAmt)}.`
      );
      setJustPaidAmount(null);
    } catch (err: any) {
      setDiscountEditError(err.message || 'Failed to update discount.');
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amt = Math.max(0, Number(amountReceived || 0));
    const discAmt = showDiscountBox ? Math.max(0, Number(discountInput || 0)) : 0;

    if (amt <= 0 && discAmt <= 0) {
      setErrorMsg('Please enter a valid payment amount or discount / gapchi amount.');
      return;
    }
    if (amt + discAmt > currentDue && currentDue > 0) {
      setErrorMsg(
        `Received (${formatCurrency(amt)}) + Discount/Gapchi (${formatCurrency(discAmt)}) cannot exceed remaining balance due (${formatCurrency(currentDue)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const method: PaymentMethod =
        paymentMode === 'UPI' || paymentMode === 'Online'
          ? 'UPI'
          : paymentMode === 'Cash'
          ? 'Cash'
          : 'Other';

      await recordTourBookingPayment({
        bookingId: liveBooking.id,
        amount: amt,
        walletName: walletName || 'Rizwan (Tour)',
        paymentMode,
        paymentMethod: method,
        notes:
          notes.trim() ||
          (currentDue - (amt + discAmt) <= 0
            ? discAmt > 0
              ? `Full & Final Settled (${discountType}: ₹${discAmt.toLocaleString('en-IN')})`
              : 'Full & Final Payment Received'
            : `Installment #${paymentHistoryList.length + 1} Received`),
        receivedBy: currentUserProfile?.name || user?.displayName || 'Office Staff',
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        userEmail: currentUserProfile?.email || user?.email || 'admin@sanzari.com',
        discountAmount: discAmt > 0 ? discAmt : undefined,
        discountType: discAmt > 0 ? discountType : undefined,
        discountReason: discAmt > 0 ? discountReason.trim() : undefined,
      });

      if (amt > 0) {
        setJustPaidAmount(amt);
        setActionBanner(
          discAmt > 0
            ? `${formatCurrency(amt)} added to ${walletName} + ${formatCurrency(discAmt)} ${discountType} applied (wallet me add nahi hua).`
            : ''
        );
      } else {
        setJustPaidAmount(null);
        setActionBanner(
          `${formatCurrency(discAmt)} ${discountType} applied! Baaki due updated without adding to any wallet.`
        );
      }
      setAmountReceived('');
      setNotes('');
      setShowDiscountBox(false);
      setDiscountInput('');
      setDiscountReason('');
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
      (appliedDiscount > 0
        ? `📦 *Original Package:* ₹${originalTotalAmount.toLocaleString('en-IN')}\n` +
          `🏷️ *Discount / Adjustment:* -₹${appliedDiscount.toLocaleString('en-IN')}\n`
        : '') +
      `💰 *${appliedDiscount > 0 ? 'Net Package Amount' : 'Total Package Amount'}:* ₹${totalAmount.toLocaleString('en-IN')}\n` +
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
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs overflow-hidden sm:overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white text-zinc-950 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-zinc-900 overflow-hidden my-0 sm:my-auto max-h-[94dvh] sm:max-h-[94vh] flex flex-col">
        {/* Mobile bottom-sheet grab handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-white shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-300" />
        </div>

        {/* Header */}
        <div className="bg-white px-3.5 py-3 sm:px-5 sm:py-4 border-b-2 border-zinc-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black shadow-xs shrink-0 ${
                currentDue === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-950 text-white'
              }`}
            >
              {currentDue === 0 ? <CheckCircle2 className="w-5 h-5" /> : <IndianRupee className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-zinc-950 leading-tight">
                  {currentDue === 0 ? 'Payment Completed (Full Paid)' : 'Receive Baaki / Due Payment'}
                </h2>
                <span className="text-[10px] font-mono font-black bg-zinc-100 text-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-300">
                  {liveBooking.bookingNumber}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 font-semibold flex items-center flex-wrap gap-x-1.5 gap-y-0.5 sm:gap-2 mt-0.5">
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
            className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain space-y-3.5 sm:space-y-4 text-xs flex-1 bg-zinc-50/50">
          {/* Action Sync Banner (when an entry is edited/deleted or discount updated) */}
          {actionBanner && justPaidAmount === null && (
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-950 border-2 border-emerald-500 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span className="font-bold text-xs leading-snug">{actionBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionBanner('')}
                className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
                    {actionBanner ? (
                      actionBanner
                    ) : (
                      <>
                        Added to <strong>{walletName}</strong> •{' '}
                        {currentDue === 0
                          ? '🎉 Booking is now 100% FULL PAID!'
                          : `Remaining Due: ${formatCurrency(currentDue)}`}
                      </>
                    )}
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
                  {appliedDiscount > 0 ? 'Net Package' : 'Total Package'}
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-zinc-950">
                  {formatCurrency(totalAmount)}
                </span>
                {appliedDiscount > 0 && (
                  <span className="text-[9px] font-bold text-zinc-500 block mt-0.5 line-through">
                    {formatCurrency(originalTotalAmount)}
                  </span>
                )}
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

            {/* Applied Discount / Gapchi Strip (with Edit / Remove) */}
            {appliedDiscount > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                {!isEditingDiscount ? (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-amber-950">
                          {liveBooking.discountType || 'Discount'}: -{formatCurrency(appliedDiscount)}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-800 ml-1.5">
                          (Original {formatCurrency(originalTotalAmount)} → Net {formatCurrency(totalAmount)})
                        </span>
                        {liveBooking.discountReason && (
                          <div className="text-[10px] text-amber-800 font-medium truncate">
                            Note: {liveBooking.discountReason}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenEditDiscount}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-950 border border-amber-400 font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> Edit Discount / Gapchi
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingDiscount(false)}
                        className="text-amber-800 hover:text-black cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {discountEditError && (
                      <div className="text-[11px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                        {discountEditError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {(['Discount', 'Gapchi / Waived'] as const).map((dt) => (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => setEditDiscountType(dt)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-black border cursor-pointer ${
                            editDiscountType === dt
                              ? 'bg-amber-600 text-white border-amber-700'
                              : 'bg-white text-zinc-800 border-amber-300'
                          }`}
                        >
                          {dt === 'Discount' ? '🏷️ Discount Given' : '⚠️ Gapchi / Waived'}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, originalTotalAmount - advancePaid)}
                        value={editDiscountAmount}
                        onChange={(e) => setEditDiscountAmount(e.target.value)}
                        placeholder="Discount Amount (₹)"
                        className="w-full bg-white border border-amber-400 rounded-lg px-2.5 py-1.5 text-zinc-950 font-mono font-black text-xs focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editDiscountReason}
                        onChange={(e) => setEditDiscountReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-full bg-white border border-amber-400 rounded-lg px-2.5 py-1.5 text-zinc-950 font-semibold text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isSavingDiscount}
                        onClick={() => handleSaveDiscountEdit(0)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-[10px] cursor-pointer"
                      >
                        Remove (₹0)
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsEditingDiscount(false)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-700 font-bold text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingDiscount}
                          onClick={() => handleSaveDiscountEdit()}
                          className="px-3 py-1 rounded-lg bg-zinc-950 hover:bg-black text-white font-black text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>{isSavingDiscount ? 'Saving...' : 'Update'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                      Enter Received Amount (₹) {showDiscountBox && numDiscount > 0 ? '(0 if Full Waive)' : '*'}
                    </label>
                    <input
                      type="number"
                      min={0}
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

              {/* STEP 4: DISCOUNT / GAPCHI / LAST AMOUNT WAIVE-OFF */}
              <div className="pt-1 border-t border-zinc-200">
                {!showDiscountBox ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscountBox(true);
                      if (numEntering > 0 && leftoverAfterCash > 0) {
                        setDiscountInput(String(leftoverAfterCash));
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border-2 border-dashed text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      numEntering > 0 && leftoverAfterCash > 0
                        ? 'bg-amber-50 border-amber-400 text-amber-950 hover:bg-amber-100'
                        : 'bg-zinc-50 border-zinc-300 text-zinc-700 hover:border-zinc-900 hover:text-zinc-950'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-bold text-[11px]">
                      <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {numEntering > 0 && leftoverAfterCash > 0
                          ? `Baaki ${formatCurrency(leftoverAfterCash)} Discount / Gapchi me close karein?`
                          : '+ Discount / Gapchi Option (Last ₹1,000 / ₹1,500 kam diya ya maaf kiya)'}
                      </span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900 shrink-0">
                      + Add
                    </span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-400 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-700" />
                        <span>4. Discount / Gapchi (Kam Diya / Waive Off)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDiscountBox(false);
                          setDiscountInput('');
                          setDiscountReason('');
                        }}
                        className="text-[10px] font-bold text-amber-900 hover:text-black flex items-center gap-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Close
                      </button>
                    </div>

                    {/* Type Toggle: Discount vs Gapchi */}
                    <div className="grid grid-cols-2 gap-2">
                      {(['Discount', 'Gapchi / Waived'] as const).map((dt) => (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => setDiscountType(dt)}
                          className={`py-1.5 px-2.5 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer ${
                            discountType === dt
                              ? 'bg-amber-600 text-white border-amber-800 shadow-2xs'
                              : 'bg-white text-zinc-800 border-amber-300 hover:border-amber-600'
                          }`}
                        >
                          {dt === 'Discount' ? '🏷️ Discount Diya' : '⚠️ Gapchi / Waived Off'}
                        </button>
                      ))}
                    </div>

                    {/* Quick Discount / Gapchi Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {numEntering > 0 && leftoverAfterCash > 0 && (
                        <button
                          type="button"
                          onClick={() => setDiscountInput(String(leftoverAfterCash))}
                          className={`px-2 py-1 rounded-lg font-black text-[10px] border cursor-pointer ${
                            numDiscount === leftoverAfterCash
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-white text-amber-950 border-amber-400 hover:bg-amber-100'
                          }`}
                        >
                          Close Baaki ({formatCurrency(leftoverAfterCash)})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAmountReceived('0');
                          setDiscountInput(String(currentDue));
                        }}
                        className={`px-2 py-1 rounded-lg font-bold text-[10px] border cursor-pointer ${
                          numEntering === 0 && numDiscount === currentDue
                            ? 'bg-zinc-950 text-white border-zinc-950'
                            : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        Full Baaki Maaf ({formatCurrency(currentDue)})
                      </button>
                      {[500, 1000, 1500, 2000]
                        .filter((v) => v <= currentDue)
                        .map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => {
                              setDiscountInput(String(v));
                              if (numEntering + v > currentDue) {
                                setAmountReceived(String(Math.max(0, currentDue - v)));
                              }
                            }}
                            className={`px-2 py-1 rounded-lg font-bold text-[10px] border cursor-pointer ${
                              numDiscount === v
                                ? 'bg-amber-700 text-white border-amber-800'
                                : 'bg-white text-zinc-800 border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            ₹{v.toLocaleString('en-IN')}
                          </button>
                        ))}
                    </div>

                    {/* Discount Amount + Reason Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-amber-950 mb-1">
                          Discount / Gapchi Amount (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={currentDue}
                          placeholder="e.g. 1000 or 1500"
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          className="w-full bg-white border-2 border-amber-500 rounded-xl px-3 py-1.5 text-amber-950 font-mono font-black text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-950 mb-1">
                          Reason / Note (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder={
                            discountType === 'Gapchi / Waived'
                              ? 'e.g. Customer last ₹1,500 nahi diya'
                              : 'e.g. Final settlement discount'
                          }
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          className="w-full bg-white border border-amber-400 rounded-xl px-3 py-1.5 text-zinc-950 font-semibold text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] font-semibold text-amber-900">
                      Note: Discount / Gapchi amount kisi wallet (Sahil / Rizwan) me add nahi hoga — sirf Baaki Due &amp; Package total se minus hoga.
                    </p>
                  </div>
                )}
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

              {/* Live Preview Box showing Account + Mode + Amount + Discount */}
              {(numEntering > 0 || numDiscount > 0) && (
                <div className="p-3 rounded-xl bg-zinc-950 text-white flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    {numEntering > 0 && (
                      <span className="text-[10px] text-zinc-300 font-bold block">
                        Wallet Credit → <strong className="text-white">{walletName}</strong> ({paymentMode}):{' '}
                        <strong className="text-emerald-400">+{formatCurrency(numEntering)}</strong>
                      </span>
                    )}
                    {numDiscount > 0 && (
                      <span className="text-[10px] text-amber-300 font-bold block">
                        {discountType}: -{formatCurrency(numDiscount)} (Net Package: {formatCurrency(previewNewTotal)})
                      </span>
                    )}
                    <span className="text-xs font-black text-emerald-400 block">
                      Total Jama: {formatCurrency(previewNewAdvance)} / {formatCurrency(previewNewTotal)}
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
                    ? 'Saving...'
                    : numEntering > 0 && numDiscount > 0
                    ? `Save ${formatCurrency(numEntering)} in ${walletName.replace(' (Tour)', '')} + ${formatCurrency(numDiscount)} ${discountType === 'Discount' ? 'Discount' : 'Gapchi'}`
                    : numEntering === 0 && numDiscount > 0
                    ? `Apply ${formatCurrency(numDiscount)} ${discountType} & Settle`
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
                All {formatCurrency(totalAmount)} has been collected for this booking.
                {appliedDiscount > 0
                  ? ` (${formatCurrency(appliedDiscount)} ${liveBooking.discountType || 'Discount'} applied).`
                  : ' Zero pending due.'}
              </p>
            </div>
          )}

          {/* 3. Payment Installments / Timeline History (with Inline Edit & Multi-Account Sync) */}
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
                {paymentHistoryList.map((item, idx) => {
                  const isEditingThis = editingEntryIdx === idx;
                  const oldAmt = Number(item.amount || 0);
                  const editNumAmt = Number(editAmount || 0);
                  const oldWShort = (item.walletName || liveBooking.walletName || 'Rizwan (Tour)').replace(' (Tour)', '');
                  const newWShort = (editWalletName || '').replace(' (Tour)', '');
                  const isWalletSwitched =
                    isEditingThis && oldWShort.toLowerCase() !== newWShort.toLowerCase();
                  const isAmountChanged = isEditingThis && editNumAmt > 0 && editNumAmt !== oldAmt;

                  if (isEditingThis) {
                    return (
                      <div
                        key={item.id || idx}
                        className="p-3 rounded-xl bg-zinc-50 border-2 border-zinc-950 space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                          <span className="text-xs font-black text-zinc-950 flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5 text-zinc-900" />
                            <span>
                              Edit {idx === 0 ? '1st Advance' : `Installment #${idx + 1}`}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelEditEntry}
                            className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-black cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {editError && (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 font-bold text-[11px]">
                            {editError}
                          </div>
                        )}

                        {/* Edit Account / Wallet */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-700">
                            Account / Wallet (Sahil / Rizwan)
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {walletOptions.map((w) => {
                              const selected = editWalletName === w.name;
                              return (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => setEditWalletName(w.name)}
                                  className={`py-1.5 px-2 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer truncate ${
                                    selected
                                      ? 'bg-zinc-950 text-white border-zinc-950'
                                      : 'bg-white text-zinc-800 border-zinc-300 hover:border-zinc-900'
                                  }`}
                                >
                                  {selected ? '✓ ' : ''}
                                  {w.name.replace(' (Tour)', '')}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Edit Payment Mode */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-700">
                            Payment Mode
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['UPI', 'Cash', 'Online', 'Offline'] as TourPaymentMode[]).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setEditPaymentMode(m)}
                                className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                  editPaymentMode === m
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-white text-zinc-800 border-zinc-300 hover:border-zinc-900'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Edit Amount & Date */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                              Amount (₹) *
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-full bg-white border-2 border-zinc-900 rounded-lg px-2.5 py-1.5 text-zinc-950 font-mono font-black text-sm focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                              Payment Date
                            </label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full bg-white border-2 border-zinc-900 rounded-lg px-2.5 py-1.5 text-zinc-950 font-bold text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Edit Notes */}
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                            Note / Reference
                          </label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Payment note..."
                            className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-zinc-950 font-semibold text-xs focus:border-zinc-900 focus:outline-none"
                          />
                        </div>

                        {/* Dual-Account Reconciliation Preview */}
                        {(isWalletSwitched || isAmountChanged) && editNumAmt > 0 && (
                          <div className="p-2 rounded-lg bg-zinc-900 text-white text-[10px] font-bold flex items-center gap-1.5 flex-wrap">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            {isWalletSwitched ? (
                              <span>
                                Account Sync: <span className="text-rose-300">{oldWShort} (-{formatCurrency(oldAmt)})</span>{' '}
                                → <span className="text-emerald-400">{newWShort} (+{formatCurrency(editNumAmt)})</span>
                              </span>
                            ) : (
                              <span>
                                {newWShort} Account Sync:{' '}
                                <span className={editNumAmt > oldAmt ? 'text-emerald-400' : 'text-amber-300'}>
                                  {editNumAmt > oldAmt ? '+' : '-'}
                                  {formatCurrency(Math.abs(editNumAmt - oldAmt))}
                                </span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Edit Footer Actions */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          {confirmDeleteIdx === idx ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isSavingEdit}
                                onClick={() => handleDeleteEntry(item, idx)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] cursor-pointer"
                              >
                                {isSavingEdit ? 'Deleting...' : 'Confirm Delete'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteIdx(null)}
                                className="px-2 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-700 font-bold text-[10px] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteIdx(idx)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          )}

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCancelEditEntry}
                              className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-700 font-bold text-[11px] hover:bg-zinc-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSavingEdit}
                              onClick={() => handleSaveEditEntry(item, idx)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{isSavingEdit ? 'Syncing...' : 'Save & Sync'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
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

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-black text-xs sm:text-sm text-emerald-700">
                          +{formatCurrency(item.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEditEntry(item, idx)}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-zinc-950 text-zinc-700 hover:text-white border border-zinc-300 hover:border-zinc-950 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit Account, Mode or Amount"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. PRIVATE PACKAGE EXPENSES & COMPLETE HISAAB */}
          {(isPrivatePackage || linkedPrivateExpenses.length > 0) && (
            <div className="bg-white rounded-2xl border-2 border-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-black text-zinc-950 uppercase tracking-wider">
                    Private Package Expenses &amp; Hisaab ({linkedPrivateExpenses.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tabular-nums font-black text-rose-700">
                    -{formatCurrency(totalPrivateExpenses)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExpenseForm((prev) => !prev);
                      setExpError('');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                      showAddExpenseForm
                        ? 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
                        : 'bg-zinc-950 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {showAddExpenseForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{showAddExpenseForm ? 'Close' : 'Add Expense'}</span>
                  </button>
                </div>
              </div>

              {/* 3-Box Package Hisaab Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 px-2.5 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Cash In
                  </span>
                  <span className="text-xs sm:text-sm font-mono tabular-nums font-black text-emerald-800 block mt-0.5">
                    {formatCurrency(advancePaid)}
                  </span>
                  <span className="text-[10px] text-emerald-700/80 font-medium block truncate">
                    Bill: {formatCurrency(totalAmount)}
                  </span>
                </div>

                <div className="rounded-xl bg-rose-50/70 border border-rose-200 px-2.5 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                    Cash Out
                  </span>
                  <span className="text-xs sm:text-sm font-mono tabular-nums font-black text-rose-700 block mt-0.5">
                    {formatCurrency(totalPrivateExpenses)}
                  </span>
                  <span className="text-[10px] text-rose-700/80 font-medium block truncate">
                    {linkedPrivateExpenses.length} {linkedPrivateExpenses.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                <div
                  className={`rounded-xl border px-2.5 py-2 ${
                    privateBillingProfit >= 0
                      ? 'bg-zinc-950 border-zinc-900 text-white'
                      : 'bg-rose-600 border-rose-700 text-white'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Net Profit
                  </span>
                  <span className="text-xs sm:text-sm font-mono tabular-nums font-black block mt-0.5">
                    {privateBillingProfit >= 0 ? '+' : ''}
                    {formatCurrency(privateBillingProfit)}
                  </span>
                  <span className="text-[10px] text-zinc-300 font-mono tabular-nums block truncate">
                    Cash: {privateCashBalance >= 0 ? '+' : ''}
                    {formatCurrency(privateCashBalance)}
                  </span>
                </div>
              </div>

              {/* Inline Add Expense Form */}
              {showAddExpenseForm && (
                <form
                  onSubmit={handleAddPrivateExpense}
                  className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-rose-900 uppercase tracking-wider">
                      Add Expense to {liveBooking.customerName}
                    </span>
                    <span className="text-[10px] font-bold text-rose-700">
                      Deducts live from selected wallet
                    </span>
                  </div>

                  {expError && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-bold">
                      {expError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">
                        Category
                      </label>
                      <select
                        value={expCategory}
                        onChange={(e) => setExpCategory(e.target.value as TourExpenseCategory)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                      >
                        {PRIVATE_EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">
                        Amount (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="e.g. 12500"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-zinc-300 text-xs font-mono font-black text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">
                      Description / Particulars
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kashmir Hotel, Cab Innova, Train Tickets..."
                      value={expDescription}
                      onChange={(e) => setExpDescription(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-white border border-zinc-300 text-xs font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">
                        Paid From Wallet
                      </label>
                      <select
                        value={expWalletName}
                        onChange={(e) => setExpWalletName(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                      >
                        {walletOptions.map((w) => (
                          <option key={w.id} value={w.name}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">
                        Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['UPI', 'Cash', 'Online'] as TourPaymentMode[]).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setExpPaymentMode(m)}
                            className={`py-2 rounded-lg text-[10px] font-black border transition-colors cursor-pointer ${
                              expPaymentMode === m
                                ? 'bg-zinc-950 text-white border-zinc-950'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddExpenseForm(false);
                        setExpError('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-700 font-bold text-[11px] hover:bg-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingExpense}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isSavingExpense ? 'Saving...' : 'Save Expense'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Linked Expenses List */}
              {linkedPrivateExpenses.length === 0 ? (
                <div className="py-4 px-3 rounded-xl bg-zinc-50 border border-dashed border-zinc-300 text-center">
                  <p className="text-xs font-semibold text-zinc-500">
                    No expenses linked to this Private Package yet.
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Click &ldquo;Add Expense&rdquo; above or link from Accounts / Wallet to track full profit &amp; hisaab.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedPrivateExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-zinc-950 truncate">
                            {exp.description || exp.category}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-zinc-300 text-zinc-700">
                            {exp.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{formatDate(exp.date)}</span>
                          <span>•</span>
                          <span className="font-bold text-zinc-700">{exp.walletName || 'Wallet'}</span>
                          {exp.paymentMode && (
                            <>
                              <span>•</span>
                              <span>{exp.paymentMode}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono tabular-nums font-black text-xs sm:text-sm text-rose-700">
                          -{formatCurrency(exp.amount)}
                        </span>

                        {confirmDeleteExpId === exp.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeletePrivateExpense(exp)}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteExpId(null)}
                              className="px-1.5 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-700 font-bold text-[10px] cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditTourExpenseModal(exp)}
                              className="px-2 py-1 rounded-lg bg-white hover:bg-zinc-950 text-zinc-700 hover:text-white border border-zinc-300 hover:border-zinc-950 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Edit Expense"
                            >
                              <Pencil className="w-3 h-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteExpId(exp.id)}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 transition-colors cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-3.5 py-2.5 sm:px-5 sm:py-3 border-t-2 border-zinc-900 flex items-center justify-between gap-2 shrink-0 safe-bottom sm:pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleWhatsAppPaymentReceipt()}
              className="px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <MessageCircle size={14} />
              <span className="sm:hidden">WhatsApp</span>
              <span className="hidden sm:inline">WhatsApp Payment Status</span>
            </button>

            <button
              type="button"
              onClick={handleOpenVoucher}
              className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileText size={14} />
              <span className="sm:hidden">Slip</span>
              <span className="hidden sm:inline">Voucher Slip</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
