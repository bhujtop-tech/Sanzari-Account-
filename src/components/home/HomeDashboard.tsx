import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  ArrowDownLeft,
  Clock,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ArrowRightLeft,
  CheckCircle,
  AlertCircle,
  Package,
} from 'lucide-react';
import { motion } from 'motion/react';

export const HomeDashboard: React.FC = () => {
  const { userPermissions } = useAuth();
  const {
    dryfruitWallets,
    totalBalance,
    thisMonthSalesTotal,
    thisMonthCollectedTotal,
    thisMonthPendingTotal,
    thisMonthExpensesTotal,
    recentActivity,
    formatCurrency,
    setIsAddSaleOpen,
    setIsAddExpenseOpen,
    setIsAddPaymentOpen,
    setIsTransferOpen,
    setSelectedWalletId,
    setActiveTab,
    setActiveMoreSection,
    products,
    setSelectedActivityItem,
    setIsViewAllActivityOpen,
  } = useData();

  // Find partner wallets strictly for Dry Fruit store
  const rizwanWallet = dryfruitWallets.find(
    (w) => w.name.toLowerCase() === 'rizwan' || (w.partnerKey === 'rizwan' && !w.name.includes('(Tour)'))
  );
  const aveshWallet = dryfruitWallets.find(
    (w) => w.name.toLowerCase() === 'avesh' || (w.partnerKey === 'avesh' && !w.name.includes('(Tour)'))
  );
  const sahilWallet = dryfruitWallets.find(
    (w) => w.name.toLowerCase() === 'sahil' || (w.partnerKey === 'sahil' && !w.name.includes('(Tour)'))
  );

  const lowStockCount = products.filter((p) => p.currentStock <= p.lowStockThreshold).length;

  return (
    <div className="space-y-6 pb-36 sm:pb-32 max-w-5xl mx-auto pt-2">
      {/* Hero: TOTAL BALANCE Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] bg-zinc-950 text-white p-6 sm:p-7 shadow-xl shadow-zinc-950/10 border border-zinc-800"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Total Combined Balance
            </span>
            <button
              onClick={() => setIsTransferOpen(true)}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowRightLeft size={12} />
              <span>Transfer</span>
            </button>
          </div>

          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {userPermissions?.canViewWalletBalances ? formatCurrency(totalBalance) : '₹ ***,***'}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Combined live balance across Rizwan, Avesh &amp; Sahil
            </p>
          </div>
        </div>

        {/* Decorative subtle iOS glow */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* 3 Compact Wallet Cards */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
            Partner Wallets
          </h3>
          <button
            onClick={() => setActiveTab('accounts')}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
          >
            View All →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {[
            { wallet: rizwanWallet, fallbackName: 'Rizwan', color: 'from-sky-500 to-blue-600' },
            { wallet: aveshWallet, fallbackName: 'Avesh', color: 'from-emerald-500 to-teal-600' },
            { wallet: sahilWallet, fallbackName: 'Sahil', color: 'from-violet-500 to-purple-600' },
          ].map(({ wallet, fallbackName }, idx) => {
            const balance = wallet ? wallet.currentBalance : 0;
            const name = wallet ? wallet.name : fallbackName;

            return (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  if (wallet) {
                    setSelectedWalletId(wallet.id);
                  }
                  setActiveTab('accounts');
                }}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:shadow-md hover:border-zinc-300 text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-900">{name}</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-zinc-950 tracking-tight">
                    {formatCurrency(balance)}
                  </div>
                  <span className="text-[10px] text-zinc-600 font-medium">Tap for ledger</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* THIS MONTH: Compact 2x2 KPI Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
            This Month
          </h3>
          <button
            onClick={() => {
              setActiveTab('more');
              setActiveMoreSection('monthly');
            }}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
          >
            Month Folders →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Sales */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-zinc-700">Sales</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-zinc-950 tracking-tight">
              {formatCurrency(thisMonthSalesTotal)}
            </div>
            <p className="text-[11px] text-zinc-600 mt-0.5">Total billed sales</p>
          </div>

          {/* Collected */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-zinc-700">Collected</span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ArrowDownLeft size={14} />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(thisMonthCollectedTotal)}
            </div>
            <p className="text-[11px] text-zinc-600 mt-0.5">Cash in wallets</p>
          </div>

          {/* Pending */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-zinc-700">Pending</span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={14} />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-600 tracking-tight">
              {formatCurrency(thisMonthPendingTotal)}
            </div>
            <p className="text-[11px] text-zinc-600 mt-0.5">Customer dues</p>
          </div>

          {/* Expenses */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-zinc-700">Expenses</span>
              <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Receipt size={14} />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-600 tracking-tight">
              {formatCurrency(thisMonthExpensesTotal)}
            </div>
            <p className="text-[11px] text-zinc-600 mt-0.5">Store &amp; operations</p>
          </div>
        </div>
      </div>

      {/* Low stock notice if any */}
      {lowStockCount > 0 && (
        <button
          onClick={() => {
            setActiveTab('stock');
          }}
          className="w-full p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                {lowStockCount} Product{lowStockCount > 1 ? 's' : ''} on Low Stock
              </p>
              <p className="text-[11px] text-amber-700">Tap to review physical inventory</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-800">Check →</span>
        </button>
      )}

      {/* RECENT ACTIVITY: Latest 5 Transactions */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
            Recent Activity
          </h3>
          <span className="text-[11px] font-semibold text-zinc-500">Latest 5</span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-zinc-200 text-zinc-600 text-xs font-medium">
            No transactions yet. Start by recording a sale or expense.
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((item) => {
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedActivityItem(item)}
                  className="w-full p-3.5 rounded-2xl bg-white border border-zinc-200/70 shadow-2xs flex items-center justify-between transition-all hover:border-zinc-300 hover:shadow-xs active:scale-98 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.isPositive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {item.isPositive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">{item.title}</h4>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {item.subtitle} • {item.date}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <div
                      className={`text-xs font-extrabold tracking-tight ${
                        item.isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {item.isPositive ? '+' : '-'}
                      {formatCurrency(item.amount)}
                    </div>
                    {item.walletName && (
                      <span className="text-[10px] text-zinc-500 block truncate max-w-[100px] font-medium">
                        {item.walletName}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* View All Button */}
            <div className="pt-2">
              <button
                onClick={() => setIsViewAllActivityOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200/90 text-zinc-900 text-xs font-bold transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border border-zinc-200/60"
              >
                <span>View All Activity ({recentActivity.length})</span>
                <span className="text-zinc-500">→</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS BAR (SALE, EXPENSE, PAYMENT) */}
      <div className="pt-2">
        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2.5 px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {/* Sale */}
          <button
            onClick={() => setIsAddSaleOpen(true)}
            className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-black text-white text-center flex flex-col items-center justify-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <Plus size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold tracking-tight">Sale</span>
          </button>

          {/* Expense */}
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="p-3.5 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-900 text-center flex flex-col items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt size={16} />
            </div>
            <span className="text-xs font-bold tracking-tight">Expense</span>
          </button>

          {/* Payment / Settlement */}
          <button
            onClick={() => setIsAddPaymentOpen(true)}
            className="p-3.5 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-900 text-center flex flex-col items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
            <span className="text-xs font-bold tracking-tight">Receive Due</span>
          </button>
        </div>
      </div>
    </div>
  );
};
