import { Wallet, TourBooking, TourExpense, Transfer } from '../types';

export interface TourWalletLedgerItem {
  id: string;
  date: string;
  rawDate: string;
  type:
    | 'tour_booking'
    | 'tour_payment'
    | 'tour_expense'
    | 'transfer_in'
    | 'transfer_out';
  title: string;
  subtitle: string;
  amount: number;
  isPositive: boolean;
  walletName: string;
  bookingWalletName?: string;
  isCrossAccount?: boolean;
  paymentMode?: string;
  bookingNumber?: string;
  customerName?: string;
  tourTitle?: string;
  refId?: string;
}

/**
 * Matches whether a record's walletId or walletName belongs to a specific Tour Wallet
 * (e.g., Sahil (Tour), Rizwan (Tour), Bus (Tour))
 */
export function matchesTourWallet(
  wallet: Pick<Wallet, 'id' | 'name' | 'partnerKey'>,
  targetId?: string,
  targetName?: string
): boolean {
  if (!wallet) return false;
  if (targetId && wallet.id && targetId === wallet.id) return true;

  const wName = (wallet.name || '').toLowerCase().trim();
  const tName = (targetName || '').toLowerCase().trim();
  if (!tName) return false;

  if (wName === tName) return true;
  if (wName.includes('sahil') && tName.includes('sahil')) return true;
  if (wName.includes('rizwan') && tName.includes('rizwan')) return true;
  if (wName.includes('bus') && tName.includes('bus')) return true;

  if (
    wallet.partnerKey &&
    wallet.partnerKey !== 'other' &&
    tName.includes(wallet.partnerKey.toLowerCase())
  ) {
    return true;
  }

  return false;
}

export interface NormalizedBookingPayment {
  id: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  membersCount: number;
  tourTitle: string;
  tourDate: string;
  amount: number;
  date: string;
  walletName: string;
  bookingPrimaryWallet: string;
  isCrossAccount: boolean;
  isInstallment: boolean;
  paymentMode: string;
  notes: string;
}

/**
 * Extracts all real money-in entries from a TourBooking, accounting for both:
 * 1. Initial booking advance (`walletName` / `paymentHistory[0]`)
 * 2. Subsequent received payments via `+ Receive` (`paymentHistory` entries in Sahil / Rizwan / Bus)
 */
export function extractBookingPayments(tb: TourBooking): NormalizedBookingPayment[] {
  const results: NormalizedBookingPayment[] = [];
  const adv = Number(tb.advancePaid || 0);
  const primaryWallet = tb.walletName || 'Rizwan (Tour)';
  const folderLabel = tb.tourBatchTitle || tb.tourTitle || tb.destination || 'Tour';
  const paxCount = Number(tb.membersCount || tb.members?.length || 1);

  const isDiffPartner = (w1: string, w2: string) => {
    const a = (w1 || '').toLowerCase();
    const b = (w2 || '').toLowerCase();
    if (a.includes('sahil') && !b.includes('sahil')) return true;
    if (a.includes('rizwan') && !b.includes('rizwan')) return true;
    if (a.includes('bus') && !b.includes('bus')) return true;
    return false;
  };

  if (Array.isArray(tb.paymentHistory) && tb.paymentHistory.length > 0) {
    if (tb.paymentHistory.length === 1) {
      const only = tb.paymentHistory[0];
      const isAddedInstallment = Boolean(only.id && only.id.startsWith('pay-'));
      const entryWallet = isAddedInstallment
        ? only.walletName || primaryWallet
        : primaryWallet || only.walletName || 'Rizwan (Tour)';
      const entryAmt = adv > 0 ? adv : Number(only.amount || 0);

      if (entryAmt > 0) {
        results.push({
          id: `${tb.id}-${only.id || '0'}`,
          bookingId: tb.id,
          bookingNumber: tb.bookingNumber || '',
          customerName: tb.customerName || 'Customer',
          membersCount: paxCount,
          tourTitle: folderLabel,
          tourDate: tb.tourDate || '',
          amount: entryAmt,
          date: only.date || tb.lastPaymentDate || tb.tourDate || tb.createdAt || '',
          walletName: entryWallet,
          bookingPrimaryWallet: primaryWallet,
          isCrossAccount: isDiffPartner(entryWallet, primaryWallet),
          isInstallment: isAddedInstallment,
          paymentMode: only.paymentMode || tb.paymentMode || 'UPI',
          notes: only.notes || (isAddedInstallment ? 'Payment Received' : 'Initial Booking Advance'),
        });
      }
      return results;
    }

    // Multiple installments in paymentHistory
    let histSum = 0;
    tb.paymentHistory.forEach((h, idx) => {
      const amt = Number(h.amount || 0);
      if (amt <= 0) return;
      histSum += amt;
      const entryWallet = h.walletName || primaryWallet;
      const isInst =
        idx > 0 ||
        Boolean(h.id && h.id.startsWith('pay-')) ||
        !(h.notes || '').toLowerCase().includes('initial');

      results.push({
        id: `${tb.id}-${h.id || idx}`,
        bookingId: tb.id,
        bookingNumber: tb.bookingNumber || '',
        customerName: tb.customerName || 'Customer',
        membersCount: paxCount,
        tourTitle: folderLabel,
        tourDate: tb.tourDate || '',
        amount: amt,
        date: h.date || tb.lastPaymentDate || tb.tourDate || tb.createdAt || '',
        walletName: entryWallet,
        bookingPrimaryWallet: primaryWallet,
        isCrossAccount: isDiffPartner(entryWallet, primaryWallet),
        isInstallment: isInst,
        paymentMode: h.paymentMode || tb.paymentMode || 'UPI',
        notes: h.notes || (idx === 0 ? 'Initial Booking Advance' : `Installment #${idx + 1} Received`),
      });
    });

    // If advancePaid on the booking is higher than the sum of paymentHistory (e.g. edited manually)
    if (adv > histSum) {
      const diff = adv - histSum;
      results.push({
        id: `${tb.id}-extra`,
        bookingId: tb.id,
        bookingNumber: tb.bookingNumber || '',
        customerName: tb.customerName || 'Customer',
        membersCount: paxCount,
        tourTitle: folderLabel,
        tourDate: tb.tourDate || '',
        amount: diff,
        date: tb.updatedAt || tb.tourDate || tb.createdAt || '',
        walletName: primaryWallet,
        bookingPrimaryWallet: primaryWallet,
        isCrossAccount: false,
        isInstallment: false,
        paymentMode: tb.paymentMode || 'UPI',
        notes: 'Booking Advance',
      });
    }

    return results;
  }

  // Fallback when paymentHistory array is empty or not present
  if (adv > 0) {
    results.push({
      id: `${tb.id}-adv`,
      bookingId: tb.id,
      bookingNumber: tb.bookingNumber || '',
      customerName: tb.customerName || 'Customer',
      membersCount: paxCount,
      tourTitle: folderLabel,
      tourDate: tb.tourDate || '',
      amount: adv,
      date: tb.tourDate || tb.createdAt || '',
      walletName: primaryWallet,
      bookingPrimaryWallet: primaryWallet,
      isCrossAccount: false,
      isInstallment: false,
      paymentMode: tb.paymentMode || 'Online',
      notes: 'Initial Booking Advance',
    });
  }

  return results;
}

/**
 * Computes the complete chronological ledger and totals for a specific Tour Wallet
 */
export function buildTourWalletLedger(params: {
  wallet: Wallet;
  tourBookings: TourBooking[];
  tourExpenses: TourExpense[];
  transfers: Transfer[];
  formatDate: (d: string) => string;
}): {
  items: TourWalletLedgerItem[];
  moneyIn: number;
  moneyOut: number;
  liveBalance: number;
} {
  const { wallet, tourBookings, tourExpenses, transfers, formatDate } = params;
  const items: TourWalletLedgerItem[] = [];

  // 1. Booking Advances & Received Installments (from paymentHistory + advancePaid)
  tourBookings.forEach((tb) => {
    const entries = extractBookingPayments(tb);
    entries.forEach((entry) => {
      if (matchesTourWallet(wallet, undefined, entry.walletName) && entry.amount > 0) {
        const modeTag = entry.paymentMode ? ` • ${entry.paymentMode}` : '';
        const crossTag = entry.isCrossAccount
          ? ` • (Booking: ${entry.bookingPrimaryWallet.replace(' (Tour)', '')} ➔ Recd in ${entry.walletName.replace(' (Tour)', '')})`
          : '';

        items.push({
          id: `tb-${entry.id}`,
          date: formatDate(entry.date || entry.tourDate),
          rawDate: entry.date || entry.tourDate || '',
          type: entry.isInstallment ? 'tour_payment' : 'tour_booking',
          title: entry.isInstallment
            ? `Payment Received • ${entry.tourTitle}`
            : `Tour Advance • ${entry.tourTitle}`,
          subtitle: `${entry.customerName} (${entry.membersCount} Pax)${modeTag}${crossTag}`,
          amount: entry.amount,
          isPositive: true,
          walletName: wallet.name,
          bookingWalletName: entry.bookingPrimaryWallet,
          isCrossAccount: entry.isCrossAccount,
          paymentMode: entry.paymentMode,
          bookingNumber: entry.bookingNumber,
          customerName: entry.customerName,
          tourTitle: entry.tourTitle,
          refId: entry.bookingId,
        });
      }
    });
  });

  // 2. Tour Expenses paid from this wallet
  tourExpenses.forEach((te) => {
    const amt = Number(te.amount || 0);
    if (amt > 0 && matchesTourWallet(wallet, te.walletId, te.walletName)) {
      items.push({
        id: `te-${te.id}`,
        date: formatDate(te.date),
        rawDate: te.date || te.createdAt || '',
        type: 'tour_expense',
        title: `Tour Exp • ${te.category || 'Expense'}`,
        subtitle: `${te.description || te.tourTitle || 'Tour Expense'}${te.paymentMode ? ` • ${te.paymentMode}` : ''}`,
        amount: amt,
        isPositive: false,
        walletName: wallet.name,
        paymentMode: te.paymentMode,
        tourTitle: te.tourTitle,
        refId: te.id,
      });
    }
  });

  // 3. Account-to-Account Transfers In / Out
  transfers.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (amt <= 0) return;

    if (matchesTourWallet(wallet, t.toWalletId, t.toWalletName)) {
      const reasonStr = t.notes ? `Reason: ${t.notes}` : 'Reason: Internal Transfer';
      const byStr = t.createdBy || t.userEmail ? ` • By: ${t.createdBy || t.userEmail}` : '';
      items.push({
        id: `tf-in-${t.id}`,
        date: formatDate(t.date),
        rawDate: t.date || t.createdAt || '',
        type: 'transfer_in',
        title: `Received from ${t.fromWalletName}`,
        subtitle: `${reasonStr}${byStr}`,
        amount: amt,
        isPositive: true,
        walletName: wallet.name,
        refId: t.id,
      });
    }

    if (matchesTourWallet(wallet, t.fromWalletId, t.fromWalletName)) {
      const reasonStr = t.notes ? `Reason: ${t.notes}` : 'Reason: Internal Transfer';
      const byStr = t.createdBy || t.userEmail ? ` • By: ${t.createdBy || t.userEmail}` : '';
      items.push({
        id: `tf-out-${t.id}`,
        date: formatDate(t.date),
        rawDate: t.date || t.createdAt || '',
        type: 'transfer_out',
        title: `Transferred to ${t.toWalletName}`,
        subtitle: `${reasonStr}${byStr}`,
        amount: amt,
        isPositive: false,
        walletName: wallet.name,
        refId: t.id,
      });
    }
  });

  items.sort((a, b) => (b.rawDate > a.rawDate ? 1 : b.rawDate < a.rawDate ? -1 : 0));

  const moneyIn = items
    .filter((i) => i.isPositive)
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const moneyOut = items
    .filter((i) => !i.isPositive)
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const opening = Number(wallet.openingBalance || 0);
  const liveBalance = opening + moneyIn - moneyOut;

  return {
    items,
    moneyIn,
    moneyOut,
    liveBalance,
  };
}
