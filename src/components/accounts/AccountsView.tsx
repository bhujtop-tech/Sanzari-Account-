import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { WalletLedgerModal } from './WalletLedgerModal';
import { TransferModal } from './TransferModal';
import {
  ArrowRightLeft,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Calendar,
  User,
} from 'lucide-react';
import { motion } from 'motion/react';

export const AccountsView: React.FC = () => {
  const {
    businessMode,
    wallets,
    totalBalance,
    formatCurrency,
    formatDate,
    setSelectedWalletId,
    setIsTransferOpen,
    sales,
    expenses,
    transfers,
  } = useData();

  // Active category filter initialized and synced with businessMode
  const [categoryFilter, setCategoryFilter] = useState<'tourism' | 'dryfruit' | 'all'>(() =>
    businessMode === 'tourism' ? 'tourism' : 'dryfruit'
  );

  // Sync categoryFilter whenever businessMode changes
  React.useEffect(() => {
    setCategoryFilter(businessMode === 'tourism' ? 'tourism' : 'dryfruit');
  }, [businessMode]);

  const [filterWalletId, setFilterWalletId] = useState<string>('all');

  const currentMonthKey = new Date().toISOString().substring(0, 7);

  const tourWallets = wallets.filter((w) => w.scope === 'tourism' || w.name.includes('(Tour)'));
  const dryfruitWallets = wallets.filter((w) => w.scope === 'dryfruit' || (!w.scope && !w.name.includes('(Tour)')));

  const tourTotal = tourWallets.reduce((s, w) => s + (w.currentBalance || 0), 0);
  const dryfruitTotal = dryfruitWallets.reduce((s, w) => s + (w.currentBalance || 0), 0);

  // Filter transfers by selected wallet or show all
  const filteredTransfers = transfers.filter((t) => {
    if (filterWalletId === 'all') return true;
    return t.fromWalletId === filterWalletId || t.toWalletId === filterWalletId;
  });

  return (
    <div className="space-y-6 pb-36 md:pb-12 max-w-5xl mx-auto">
      {/* Header & Total Business Balance */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Accounts</h2>
          <p className="text-xs text-zinc-600 font-medium">Partner wallets &amp; internal balances</p>
        </div>

        <button
          onClick={() => setIsTransferOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowRightLeft size={14} />
          <span>Transfer</span>
        </button>
      </div>

      {/* Hero Overview Card */}
      <div className="p-6 rounded-[28px] bg-linear-to-br from-zinc-950 to-zinc-900 text-white shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            {categoryFilter === 'tourism'
              ? 'Sanzari Tours Total Cash'
              : categoryFilter === 'dryfruit'
              ? 'Dry Fruit Store Total Cash'
              : 'Total Combined Business Balance'}
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck size={11} />
            Balanced
          </span>
        </div>
        <div className="text-3xl font-black tracking-tight text-white mt-1">
          {formatCurrency(
            categoryFilter === 'tourism'
              ? tourTotal
              : categoryFilter === 'dryfruit'
              ? dryfruitTotal
              : totalBalance
          )}
        </div>

        {/* Business Subtotals Breakdown */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-800/80 text-xs">
          <div
            onClick={() => setCategoryFilter('dryfruit')}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              categoryFilter === 'dryfruit'
                ? 'bg-zinc-800 border-zinc-600 ring-1 ring-white/20'
                : 'bg-zinc-900/90 border-zinc-800 opacity-70 hover:opacity-100'
            }`}
          >
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <span>🛒</span> Dry Fruits Cash
            </span>
            <span className="text-sm font-black text-white font-mono mt-0.5 block">
              {formatCurrency(dryfruitTotal)}
            </span>
          </div>

          <div
            onClick={() => setCategoryFilter('tourism')}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              categoryFilter === 'tourism'
                ? 'bg-amber-950/60 border-amber-500/60 ring-1 ring-amber-400/30'
                : 'bg-zinc-900/90 border-zinc-800 opacity-70 hover:opacity-100'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <span>🚌</span> Sanzari Tours Cash
            </span>
            <span className="text-sm font-black text-amber-300 font-mono mt-0.5 block">
              {formatCurrency(tourTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-2xl border border-zinc-200/90 w-fit">
        <button
          type="button"
          onClick={() => setCategoryFilter('tourism')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            categoryFilter === 'tourism'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <span>🚌</span>
          <span>Tour Wallets ({tourWallets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('dryfruit')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            categoryFilter === 'dryfruit'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <span>🛒</span>
          <span>Dry Fruit Wallets ({dryfruitWallets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            categoryFilter === 'all'
              ? 'bg-zinc-800 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <span>🌐</span>
          <span>All Accounts</span>
        </button>
      </div>

      {/* 1. Sanzari Tours & Travel Wallets */}
      {(categoryFilter === 'tourism' || categoryFilter === 'all') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🚌</span> Sanzari Tours &amp; Travel Accounts
            </h3>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
              Tour Advance &amp; Bus Expenses
            </span>
          </div>

          <div className="space-y-3">
            {tourWallets.map((wallet, idx) => {
              return (
                <motion.div
                  key={wallet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedWalletId(wallet.id)}
                  className="p-5 rounded-3xl bg-amber-50/40 border border-amber-200/90 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs"
                        style={{ backgroundColor: wallet.color || '#f59e0b' }}
                      >
                        {wallet.name.startsWith('Bus') ? '🚌' : wallet.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-zinc-950">{wallet.name}</h4>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            Tour Dedicated
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600">
                          Opening Balance: {formatCurrency(wallet.openingBalance)}
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
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Dry Fruit Store Wallets */}
      {(categoryFilter === 'dryfruit' || categoryFilter === 'all') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>🛒</span> Dry Fruit Store Accounts
            </h3>
            <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
              Store Sales &amp; Vendors
            </span>
          </div>

          <div className="space-y-3">
            {dryfruitWallets.map((wallet, idx) => {
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
                  className="p-5 rounded-3xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs"
                        style={{ backgroundColor: wallet.color || '#18181b' }}
                      >
                        {wallet.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-zinc-950">{wallet.name}</h4>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                            Dry Fruits
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600">
                          Opening Balance: {formatCurrency(wallet.openingBalance)}
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

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100 text-xs">
                    <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-800 font-medium">Month Sales</span>
                      <span className="font-bold text-emerald-700">+{formatCurrency(walletMonthSales)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                      <span className="text-[11px] text-rose-800 font-medium">Month Expenses</span>
                      <span className="font-bold text-rose-700">-{formatCurrency(walletMonthExpenses)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account-to-Account Transfer History & Logs */}
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
              All ({transfers.length})
            </button>
            {wallets.map((w) => {
              const count = transfers.filter(
                (t) => t.fromWalletId === w.id || t.toWalletId === w.id
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
                  <span>{w.name} ({count})</span>
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
              Use the "Transfer" button above to send money between partner accounts.
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
                    {/* Visual Transfer Pill */}
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

                    {/* Transfer Reason & Person */}
                    <div className="text-xs">
                      <p className="font-bold text-zinc-900">
                        <span className="text-zinc-500 font-normal">Reason: </span>
                        {t.notes || 'Internal wallet transfer'}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                        <User size={11} className="text-zinc-400" />
                        <span>Transferred by: <strong className="text-zinc-700">{t.createdBy || t.userEmail || 'Admin'}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Transfer Amount */}
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

      {/* Modals */}
      <WalletLedgerModal />
    </div>
  );
};
