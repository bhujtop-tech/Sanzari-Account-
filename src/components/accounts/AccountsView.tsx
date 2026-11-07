import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { WalletLedgerModal } from './WalletLedgerModal';
import {
  ArrowRightLeft,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Calendar,
  User,
  Plus,
  X,
  Wallet as WalletIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { addWallet } from '../../services/db';
import { TourExpense } from '../../types';
import {
  buildTourWalletLedger,
  extractBookingPayments,
  matchesTourWallet,
} from '../../utils/tourWalletLedger';

export const AccountsView: React.FC = () => {
  const {
    businessMode,
    wallets,
    dryfruitWallets,
    tourWallets,
    formatCurrency,
    formatDate,
    setSelectedWalletId,
    setIsTransferOpen,
    setIsAddExpenseOpen,
    setIsAddTourExpenseOpen,
    setEditingTourExpense,
    openEditTourExpenseModal,
    deleteTourExpenseById,
    sales,
    expenses,
    transfers,
    tourBookings,
    tourExpenses,
  } = useData();

  const isTourism = businessMode === 'tourism';
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);

  const [filterWalletId, setFilterWalletId] = useState<string>('all');
  const [tourHistoryFilter, setTourHistoryFilter] = useState<
    'all' | 'transfers_cross' | 'money_in' | 'money_out'
  >('all');
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletOpening, setNewWalletOpening] = useState('');
  const [newWalletScope, setNewWalletScope] = useState<'tourism' | 'dryfruit'>(
    isTourism ? 'tourism' : 'dryfruit'
  );
  const [newWalletColor, setNewWalletColor] = useState(isTourism ? '#f59e0b' : '#0ea5e9');
  const [isSavingWallet, setIsSavingWallet] = useState(false);

  const currentMonthKey = new Date().toISOString().substring(0, 7);

  // Active wallets strictly based on current mode
  const currentWallets = isTourism ? tourWallets : dryfruitWallets;
  const currentTotal = currentWallets.reduce((s, w) => s + (Number(w.currentBalance) || 0), 0);

  // Precompute per-wallet ledger stats for Tourism mode cards
  const tourWalletStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { moneyIn: number; moneyOut: number; recordCount: number; crossCount: number }
    >();
    if (!isTourism) return map;

    tourWallets.forEach((w) => {
      const ledger = buildTourWalletLedger({
        wallet: w,
        tourBookings,
        tourExpenses,
        transfers,
        formatDate,
      });
      const crossCount = ledger.items.filter(
        (i) => i.isCrossAccount || i.type === 'transfer_in' || i.type === 'transfer_out'
      ).length;
      map.set(w.id, {
        moneyIn: ledger.moneyIn,
        moneyOut: ledger.moneyOut,
        recordCount: ledger.items.length,
        crossCount,
      });
    });

    return map;
  }, [isTourism, tourWallets, tourBookings, tourExpenses, transfers, formatDate]);

  // Build unified Tourism Khata & Account-to-Account activity list
  const tourUnifiedRecords = useMemo(() => {
    if (!isTourism) return [];

    const list: Array<{
      id: string;
      kind: 'transfer' | 'cross_booking' | 'booking_in' | 'expense_out';
      date: string;
      rawDate: string;
      amount: number;
      isPositive: boolean;
      walletId: string;
      walletName: string;
      fromWalletName?: string;
      toWalletName?: string;
      title: string;
      subtitle: string;
      paymentMode?: string;
      badgeText: string;
      expenseObj?: TourExpense;
    }> = [];

    const findMatchingWallet = (wId?: string, wName?: string) => {
      return (
        tourWallets.find((tw) => matchesTourWallet(tw, wId, wName)) ||
        tourWallets[0] || { id: 'sahil', name: wName || 'Sahil (Tour)' }
      );
    };

    // 1. Direct Account-to-Account Transfers (matching any tour wallet)
    transfers.forEach((t) => {
      const matchesAnyTour = tourWallets.some(
        (tw) =>
          matchesTourWallet(tw, t.fromWalletId, t.fromWalletName) ||
          matchesTourWallet(tw, t.toWalletId, t.toWalletName)
      );
      if (!matchesAnyTour) return;

      const toW = findMatchingWallet(t.toWalletId, t.toWalletName);
      list.push({
        id: `tf-${t.id}`,
        kind: 'transfer',
        date: formatDate(t.date),
        rawDate: t.date || t.createdAt || '',
        amount: Number(t.amount || 0),
        isPositive: true,
        walletId: toW.id,
        walletName: toW.name,
        fromWalletName: t.fromWalletName,
        toWalletName: t.toWalletName,
        title: `${t.fromWalletName} ➔ ${t.toWalletName}`,
        subtitle: `Reason: ${t.notes || 'Internal Account Transfer'} • By: ${t.createdBy || t.userEmail || 'Admin'}`,
        badgeText: 'Account Transfer',
      });
    });

    // 2. Tour Booking Advances & Received Installments (including cross-account payments)
    tourBookings.forEach((tb) => {
      const entries = extractBookingPayments(tb);
      entries.forEach((entry) => {
        if (entry.amount <= 0) return;
        const targetW = findMatchingWallet(undefined, entry.walletName);
        list.push({
          id: `bp-${entry.id}`,
          kind: entry.isCrossAccount ? 'cross_booking' : 'booking_in',
          date: formatDate(entry.date || entry.tourDate),
          rawDate: entry.date || entry.tourDate || '',
          amount: entry.amount,
          isPositive: true,
          walletId: targetW.id,
          walletName: targetW.name,
          fromWalletName: entry.isCrossAccount ? entry.bookingPrimaryWallet : undefined,
          toWalletName: targetW.name,
          title: entry.isInstallment
            ? `Payment Received • ${entry.tourTitle}`
            : `Tour Advance • ${entry.tourTitle}`,
          subtitle: `${entry.customerName} (${entry.membersCount} Pax)${entry.bookingNumber ? ` • ${entry.bookingNumber}` : ''}${entry.notes ? ` • ${entry.notes}` : ''}`,
          paymentMode: entry.paymentMode,
          badgeText: entry.isCrossAccount
            ? `Booking (${entry.bookingPrimaryWallet.replace(' (Tour)', '')}) ➔ Recd in ${targetW.name.replace(' (Tour)', '')}`
            : entry.isInstallment
            ? `Received in ${targetW.name.replace(' (Tour)', '')}`
            : `Advance in ${targetW.name.replace(' (Tour)', '')}`,
        });
      });
    });

    // 3. Tour Expenses (Money Out)
    tourExpenses.forEach((te) => {
      const amt = Number(te.amount || 0);
      if (amt <= 0) return;
      const targetW = findMatchingWallet(te.walletId, te.walletName);
      const catLabel = te.category ? `[${te.category}] ` : '';
      list.push({
        id: `te-${te.id}`,
        kind: 'expense_out',
        date: formatDate(te.date),
        rawDate: te.date || te.createdAt || '',
        amount: amt,
        isPositive: false,
        walletId: targetW.id,
        walletName: targetW.name,
        title: `${catLabel}${te.description || te.category || 'Expense'}`,
        subtitle: `${te.tourTitle || te.destination || 'Office / General Expense'}${te.paymentMode ? ` • ${te.paymentMode}` : ''}`,
        paymentMode: te.paymentMode,
        badgeText: `Paid from ${targetW.name.replace(' (Tour)', '')}`,
        expenseObj: te,
      });
    });

    return list.sort((a, b) => (b.rawDate > a.rawDate ? 1 : b.rawDate < a.rawDate ? -1 : 0));
  }, [isTourism, tourWallets, transfers, tourBookings, tourExpenses, formatDate]);

  const filteredTourRecords = useMemo(() => {
    if (!isTourism) return [];
    const selectedWalletObj = tourWallets.find((w) => w.id === filterWalletId);

    return tourUnifiedRecords.filter((rec) => {
      // Type filter
      if (
        tourHistoryFilter === 'transfers_cross' &&
        rec.kind !== 'transfer' &&
        rec.kind !== 'cross_booking'
      ) {
        return false;
      }
      if (tourHistoryFilter === 'money_in' && !rec.isPositive) return false;
      if (tourHistoryFilter === 'money_out' && rec.isPositive) return false;

      // Wallet filter
      if (filterWalletId === 'all' || !selectedWalletObj) return true;
      if (rec.walletId === selectedWalletObj.id) return true;
      if (rec.fromWalletName && matchesTourWallet(selectedWalletObj, undefined, rec.fromWalletName))
        return true;
      if (rec.toWalletName && matchesTourWallet(selectedWalletObj, undefined, rec.toWalletName))
        return true;
      return matchesTourWallet(selectedWalletObj, rec.walletId, rec.walletName);
    });
  }, [isTourism, tourUnifiedRecords, filterWalletId, tourHistoryFilter, tourWallets]);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;
    setIsSavingWallet(true);
    try {
      const openBal = Number(newWalletOpening) || 0;
      const lower = newWalletName.toLowerCase();
      const partnerKey = lower.includes('sahil')
        ? 'sahil'
        : lower.includes('bus')
        ? 'bus'
        : lower.includes('rizwan')
        ? 'rizwan'
        : lower.includes('avesh')
        ? 'avesh'
        : 'other';

      await addWallet({
        name: newWalletName.trim(),
        partnerKey,
        scope: isTourism ? 'tourism' : 'dryfruit',
        openingBalance: openBal,
        currentBalance: openBal,
        color: newWalletColor,
      });
      setNewWalletName('');
      setNewWalletOpening('');
      setIsAddWalletOpen(false);
    } catch (err) {
      console.error('Failed to add wallet:', err);
    } finally {
      setIsSavingWallet(false);
    }
  };

  // Filter transfers strictly for Dryfruit mode's wallets
  const currentWalletIds = new Set(currentWallets.map((w) => w.id));
  const currentWalletNames = new Set(
    currentWallets.map((w) => (w.name || '').toLowerCase().trim())
  );
  const filteredTransfers = transfers.filter((t) => {
    const isModeTransfer =
      currentWalletIds.has(t.fromWalletId) ||
      currentWalletIds.has(t.toWalletId) ||
      currentWalletNames.has((t.fromWalletName || '').toLowerCase().trim()) ||
      currentWalletNames.has((t.toWalletName || '').toLowerCase().trim());
    if (!isModeTransfer) return false;
    if (filterWalletId === 'all') return true;
    const selectedW = currentWallets.find((w) => w.id === filterWalletId);
    if (!selectedW) return true;
    const selName = (selectedW.name || '').toLowerCase().trim();
    return (
      t.fromWalletId === filterWalletId ||
      t.toWalletId === filterWalletId ||
      (t.fromWalletName || '').toLowerCase().trim() === selName ||
      (t.toWalletName || '').toLowerCase().trim() === selName
    );
  });

  return (
    <div className="space-y-6 pb-36 md:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 flex items-center gap-2">
            <span>{isTourism ? '🚌 Tour Accounts & Wallets' : '🛒 Dry Fruit Store Accounts'}</span>
          </h2>
          <p className="text-xs text-zinc-600 font-medium">
            {isTourism
              ? 'Tour advance, received booking payments & expenses (Rizwan, Sahil, Bus)'
              : 'Store partner wallets: Rizwan, Avesh, Sahil (Dry fruits & spices)'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (isTourism) {
                setEditingTourExpense(null);
                setIsAddTourExpenseOpen(true);
              } else {
                setIsAddExpenseOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>+ Add Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddWalletOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 border-2 border-zinc-900 text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>+ Account</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <ArrowRightLeft size={14} />
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* Hero Overview Card - Strictly Mode Specific Cash */}
      <div
        className={`p-6 rounded-[28px] text-white shadow-xl ${
          isTourism
            ? 'bg-gradient-to-br from-amber-950 via-zinc-950 to-zinc-900 border border-amber-900/40'
            : 'bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            {isTourism ? 'Sanzari Tours Total Available Cash' : 'Dry Fruit Store Total Cash'}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isTourism
                ? 'text-amber-300 bg-amber-950/80 border border-amber-800/50'
                : 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/50'
            }`}
          >
            <ShieldCheck size={11} />
            {isTourism ? 'Tour Accounts Only' : 'Dry Fruit Accounts Only'}
          </span>
        </div>
        <div className="text-3xl font-black tracking-tight text-white mt-1 font-mono">
          {formatCurrency(currentTotal)}
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          {isTourism
            ? `Live balance across ${currentWallets.length} Tour Wallets (Rizwan, Sahil & Bus)`
            : `Sum across ${currentWallets.length} Store Wallets (Rizwan, Avesh & Sahil)`}
        </p>
      </div>

      {/* Wallets List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
            <span>{isTourism ? '🚌' : '🛒'}</span>
            <span>
              {isTourism ? 'Tour Dedicated Accounts' : 'Dry Fruit Store Wallets'} ({currentWallets.length})
            </span>
          </h3>
          <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full">
            {isTourism ? 'Click any account for full statement' : 'Sales, Expenses & Purchases'}
          </span>
        </div>

        <div className="space-y-3">
          {currentWallets.map((wallet, idx) => {
            const tourStats = tourWalletStatsMap.get(wallet.id);

            const walletMonthSales = sales
              .filter(
                (s) =>
                  s.walletId === wallet.id &&
                  (s.monthKey === currentMonthKey || s.date?.startsWith(currentMonthKey))
              )
              .reduce((sum, s) => sum + (s.paidAmount || 0), 0);

            const walletMonthExpenses = expenses
              .filter(
                (e) =>
                  e.walletId === wallet.id &&
                  (e.monthKey === currentMonthKey || e.date?.startsWith(currentMonthKey))
              )
              .reduce((sum, e) => sum + (e.amount || 0), 0);

            return (
              <motion.div
                key={wallet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedWalletId(wallet.id)}
                className={`p-5 rounded-3xl border shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
                  isTourism
                    ? 'bg-amber-50/40 border-amber-200/90 hover:border-amber-400'
                    : 'bg-white border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs"
                      style={{
                        backgroundColor: wallet.color || (isTourism ? '#f59e0b' : '#18181b'),
                      }}
                    >
                      {wallet.name.startsWith('Bus') ? '🚌' : wallet.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-zinc-950">{wallet.name}</h4>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isTourism
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {isTourism ? 'Tour Account' : 'Dry Fruit Account'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600">
                        Opening: {formatCurrency(wallet.openingBalance)}
                        {isTourism && tourStats ? ` • ${tourStats.recordCount} Records` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-base font-black text-zinc-950 tracking-tight font-mono">
                        {formatCurrency(wallet.currentBalance)}
                      </span>
                      <p className="text-[10px] text-zinc-600 font-semibold">Live Balance</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </div>
                </div>

                {isTourism && tourStats && (tourStats.moneyIn > 0 || tourStats.moneyOut > 0) && (
                  <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-amber-200/60 text-xs">
                    <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-900 font-bold">
                        Money In (Bookings)
                      </span>
                      <span className="font-black font-mono text-emerald-700">
                        +{formatCurrency(tourStats.moneyIn)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-200/80 flex items-center justify-between">
                      <span className="text-[11px] text-rose-900 font-bold">
                        Money Out (Expenses)
                      </span>
                      <span className="font-black font-mono text-rose-700">
                        -{formatCurrency(tourStats.moneyOut)}
                      </span>
                    </div>
                  </div>
                )}

                {!isTourism && (walletMonthSales > 0 || walletMonthExpenses > 0) && (
                  <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-zinc-100 text-xs">
                    <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-800 font-medium">Month Sales</span>
                      <span className="font-bold text-emerald-700">
                        +{formatCurrency(walletMonthSales)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                      <span className="text-[11px] text-rose-800 font-medium">Month Expenses</span>
                      <span className="font-bold text-rose-700">
                        -{formatCurrency(walletMonthExpenses)}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom History Section: Tourism Unified Khata & Transfers vs Dryfruit Transfers */}
      {isTourism ? (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRightLeft size={14} className="text-zinc-900" />
                <span>Account-to-Account &amp; Partner Khata History</span>
              </h3>
              <p className="text-[11px] text-zinc-500">
                All booking payments received in Sahil / Rizwan accounts, cross-account collections &amp; transfers
              </p>
            </div>

            {/* Account Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterWalletId('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterWalletId === 'all'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                All ({tourUnifiedRecords.length})
              </button>
              {currentWallets.map((w) => {
                const count = tourUnifiedRecords.filter(
                  (rec) =>
                    rec.walletId === w.id ||
                    (rec.fromWalletName && matchesTourWallet(w, undefined, rec.fromWalletName)) ||
                    (rec.toWalletName && matchesTourWallet(w, undefined, rec.toWalletName)) ||
                    matchesTourWallet(w, rec.walletId, rec.walletName)
                ).length;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setFilterWalletId(w.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      filterWalletId === w.id
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: w.color || '#3f3f46' }}
                    />
                    <span>
                      {w.name} ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-1">
            {[
              { id: 'all', label: `All Records (${tourUnifiedRecords.length})` },
              {
                id: 'transfers_cross',
                label: `⇄ Account-to-Account (${
                  tourUnifiedRecords.filter(
                    (r) => r.kind === 'transfer' || r.kind === 'cross_booking'
                  ).length
                })`,
              },
              {
                id: 'money_in',
                label: `🟢 Money In (${tourUnifiedRecords.filter((r) => r.isPositive).length})`,
              },
              {
                id: 'money_out',
                label: `🔴 Money Out (${tourUnifiedRecords.filter((r) => !r.isPositive).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTourHistoryFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  tourHistoryFilter === tab.id
                    ? 'bg-amber-400 text-zinc-950 border-zinc-900 font-black'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Records List */}
          {filteredTourRecords.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white border border-dashed border-zinc-200 text-xs text-zinc-500">
              <ArrowRightLeft size={24} className="mx-auto mb-2 text-zinc-400" />
              <p className="font-semibold text-zinc-700">No records found for this filter</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Switch filter to &quot;All Records&quot; or use the &quot;Transfer&quot; button above.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTourRecords.map((rec) => {
                const targetW = currentWallets.find((w) => w.id === rec.walletId);
                const fromW = rec.fromWalletName
                  ? currentWallets.find((w) =>
                      matchesTourWallet(w, undefined, rec.fromWalletName)
                    )
                  : undefined;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedWalletId(rec.walletId)}
                    className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs hover:border-zinc-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {rec.kind === 'transfer' || rec.kind === 'cross_booking' ? (
                          <>
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black text-white shadow-2xs"
                              style={{ backgroundColor: fromW?.color || '#0ea5e9' }}
                            >
                              {rec.kind === 'cross_booking'
                                ? `Booking: ${(rec.fromWalletName || '').replace(' (Tour)', '')}`
                                : rec.fromWalletName}
                            </span>
                            <ArrowRight size={13} className="text-zinc-400 shrink-0" />
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black text-white shadow-2xs"
                              style={{ backgroundColor: targetW?.color || '#a855f7' }}
                            >
                              {rec.kind === 'cross_booking'
                                ? `Received: ${rec.walletName}`
                                : rec.toWalletName}
                            </span>
                          </>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-black text-white shadow-2xs"
                            style={{ backgroundColor: targetW?.color || '#18181b' }}
                          >
                            {rec.isPositive ? (
                              <ArrowDownLeft size={12} />
                            ) : (
                              <ArrowUpRight size={12} />
                            )}
                            {rec.walletName}
                          </span>
                        )}

                        {rec.paymentMode && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {rec.paymentMode}
                          </span>
                        )}

                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Calendar size={10} />
                          {rec.date}
                        </span>
                      </div>

                      <div className="text-xs">
                        <p className="font-extrabold text-zinc-950">{rec.title}</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{rec.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 flex sm:flex-col items-center justify-between sm:items-end gap-1.5 shrink-0">
                      <span className="text-xs text-zinc-600 font-medium sm:hidden">Amount:</span>
                      <div className="flex flex-col sm:items-end gap-1">
                        <div
                          className={`text-base font-black font-mono tracking-tight ${
                            rec.kind === 'transfer'
                              ? 'text-zinc-950'
                              : rec.isPositive
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {rec.kind === 'transfer' ? '' : rec.isPositive ? '+' : '-'}
                          {formatCurrency(rec.amount)}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            rec.kind === 'cross_booking'
                              ? 'text-purple-800 bg-purple-50 border border-purple-200'
                              : rec.kind === 'transfer'
                              ? 'text-blue-700 bg-blue-50 border border-blue-200'
                              : rec.isPositive
                              ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                              : 'text-rose-800 bg-rose-50 border border-rose-200'
                          }`}
                        >
                          {rec.badgeText}
                        </span>

                        {rec.kind === 'expense_out' && rec.expenseObj && (
                          <div
                            className="flex items-center gap-1.5 pt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openEditTourExpenseModal(rec.expenseObj!)}
                              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-zinc-950 border border-amber-400 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Edit Expense"
                            >
                              <Pencil size={11} />
                              <span>Edit</span>
                            </button>

                            {confirmDeleteExpenseId === rec.expenseObj.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteTourExpenseById(rec.expenseObj!.id);
                                    setConfirmDeleteExpenseId(null);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteExpenseId(null)}
                                  className="px-2 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-300 text-[10px] font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteExpenseId(rec.expenseObj!.id)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-[10px] font-black inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 size={11} />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Dryfruit Store Account-to-Account Transfer History */
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRightLeft size={14} className="text-zinc-800" />
                <span>Account-to-Account Transfer History</span>
              </h3>
              <p className="text-[11px] text-zinc-500">
                Transfer logs showing sender, receiver, reason &amp; date
              </p>
            </div>

            {/* Account Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterWalletId('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterWalletId === 'all'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                All ({filteredTransfers.length})
              </button>
              {currentWallets.map((w) => {
                const count = filteredTransfers.filter(
                  (t) =>
                    t.fromWalletId === w.id ||
                    t.toWalletId === w.id ||
                    (t.fromWalletName || '').toLowerCase().trim() ===
                      (w.name || '').toLowerCase().trim() ||
                    (t.toWalletName || '').toLowerCase().trim() ===
                      (w.name || '').toLowerCase().trim()
                ).length;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setFilterWalletId(w.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      filterWalletId === w.id
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: w.color || '#3f3f46' }}
                    />
                    <span>
                      {w.name} ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transfer Cards List */}
          {filteredTransfers.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white border border-dashed border-zinc-200 text-xs text-zinc-500">
              <ArrowRightLeft size={24} className="mx-auto mb-2 text-zinc-400" />
              <p className="font-semibold text-zinc-700">No account transfers found</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Use the &quot;Transfer&quot; button above to send money between partner accounts.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTransfers.map((t) => {
                const fromW = wallets.find((w) => w.id === t.fromWalletId);
                const toW = wallets.find((w) => w.id === t.toWalletId);

                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black text-white shadow-2xs"
                          style={{ backgroundColor: fromW?.color || '#18181b' }}
                        >
                          {t.fromWalletName}
                        </span>

                        <ArrowRight size={14} className="text-zinc-400 shrink-0" />

                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black text-white shadow-2xs"
                          style={{ backgroundColor: toW?.color || '#18181b' }}
                        >
                          {t.toWalletName}
                        </span>

                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(t.date)}
                        </span>
                      </div>

                      <div className="text-xs">
                        <p className="font-bold text-zinc-900">
                          <span className="text-zinc-500 font-normal">Reason: </span>
                          {t.notes || 'Internal wallet transfer'}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <User size={11} className="text-zinc-400" />
                          <span>
                            Transferred by:{' '}
                            <strong className="text-zinc-700">
                              {t.createdBy || t.userEmail || 'Admin'}
                            </strong>
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 flex sm:flex-col items-center justify-between sm:items-end">
                      <span className="text-xs text-zinc-600 font-medium sm:hidden">Amount:</span>
                      <div>
                        <div className="text-base font-black text-zinc-950 tracking-tight">
                          {formatCurrency(t.amount)}
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full inline-block">
                          Account Transfer
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <WalletLedgerModal />

      {/* Add New Wallet / Account Modal */}
      {isAddWalletOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-2 border-zinc-900 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                  <WalletIcon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950">Add New Account</h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Create partner or business wallet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWalletOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateWallet} className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block mb-1">
                  Account / Person Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahil (Tour), Bus (Tour), Rizwan..."
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block mb-1">
                  Business Scope
                </label>
                <select
                  value={newWalletScope}
                  onChange={(e) => setNewWalletScope(e.target.value as any)}
                  className="w-full text-xs font-bold p-2.5 bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none focus:bg-white"
                >
                  <option value="tourism">🚌 Sanzari Tours (Tour Wallet)</option>
                  <option value="dryfruit">🛒 Dry Fruit Store</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newWalletOpening}
                  onChange={(e) => setNewWalletOpening(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block mb-1">
                  Tag Color
                </label>
                <div className="flex items-center gap-2">
                  {['#0ea5e9', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#18181b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewWalletColor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        newWalletColor === c ? 'scale-110 ring-2 ring-zinc-950' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWalletOpen(false)}
                  className="px-3 py-2 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingWallet}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingWallet ? 'Adding...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
