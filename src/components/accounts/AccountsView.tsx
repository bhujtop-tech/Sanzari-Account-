import React from 'react';
import { useData } from '../../context/DataContext';
import { WalletLedgerModal } from './WalletLedgerModal';
import { TransferModal } from './TransferModal';
import { ArrowRightLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const AccountsView: React.FC = () => {
  const {
    wallets,
    totalBalance,
    formatCurrency,
    setSelectedWalletId,
    setIsTransferOpen,
    sales,
    expenses,
  } = useData();

  const currentMonthKey = new Date().toISOString().substring(0, 7);

  return (
    <div className="space-y-5 pb-28 md:pb-12 max-w-5xl mx-auto">
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
            Total Business Cash &amp; Bank
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck size={11} />
            Balanced
          </span>
        </div>
        <div className="text-3xl font-black tracking-tight text-white mt-1">
          {formatCurrency(totalBalance)}
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Total physical cash and bank funds across all 3 partner accounts
        </p>
      </div>

      {/* Partner Wallets List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider px-1">
          Partner Accounts
        </h3>

        <div className="space-y-3">
          {wallets.map((wallet, idx) => {
            // Calculate this month metrics for this wallet
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
                      <h4 className="text-sm font-extrabold text-zinc-950">{wallet.name}</h4>
                      <p className="text-[11px] text-zinc-600">
                        Opening Balance: {formatCurrency(wallet.openingBalance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-base font-black text-zinc-950 tracking-tight">
                        {formatCurrency(wallet.currentBalance)}
                      </span>
                      <p className="text-[10px] text-zinc-600 font-semibold">Live Balance</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </div>
                </div>

                {/* This Month KPI strip for this wallet */}
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

      {/* Modals */}
      <WalletLedgerModal />
      <TransferModal />
    </div>
  );
};
