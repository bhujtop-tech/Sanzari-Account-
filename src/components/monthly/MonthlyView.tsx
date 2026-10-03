import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Folder,
  FolderOpen,
  Calendar,
  ShoppingBag,
  Receipt,
  ArrowDownLeft,
  Truck,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const MonthlyView: React.FC = () => {
  const {
    sales,
    expenses,
    payments,
    purchases,
    transfers,
    availableMonths,
    formatCurrency,
    formatDate,
    setSelectedSaleId,
  } = useData();

  // Active open month folder
  const [openedMonth, setOpenedMonth] = useState<string>(
    availableMonths[0] || new Date().toISOString().substring(0, 7)
  );
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    'sales' | 'expenses' | 'payments' | 'purchases' | 'transfers'
  >('sales');

  // Month stats calculation
  const monthStats = useMemo(() => {
    const mSales = sales.filter((s) => s.monthKey === openedMonth || s.date?.startsWith(openedMonth));
    const mExpenses = expenses.filter((e) => e.monthKey === openedMonth || e.date?.startsWith(openedMonth));
    const mPayments = payments.filter((p) => p.monthKey === openedMonth || p.date?.startsWith(openedMonth));
    const mPurchases = purchases.filter((pur) => pur.monthKey === openedMonth || pur.date?.startsWith(openedMonth));
    const mTransfers = transfers.filter((t) => t.monthKey === openedMonth || t.date?.startsWith(openedMonth));

    const totalSales = mSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalCollected = mSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const totalPending = mSales.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
    const totalExpenses = mExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPurchases = mPurchases.reduce((sum, pur) => sum + (pur.totalCost || 0), 0);

    return {
      mSales,
      mExpenses,
      mPayments,
      mPurchases,
      mTransfers,
      totalSales,
      totalCollected,
      totalPending,
      totalExpenses,
      totalPurchases,
    };
  }, [openedMonth, sales, expenses, payments, purchases, transfers]);

  const formatMonthName = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch {
      return monthKey;
    }
  };

  return (
    <div className="space-y-5 pb-28 md:pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="pt-1">
        <h2 className="text-2xl font-black tracking-tight text-zinc-950">Monthly Folders</h2>
        <p className="text-xs text-zinc-600 font-medium">
          Clean folder-based business archives &amp; monthly statements
        </p>
      </div>

      {/* Month Folders Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {availableMonths.map((mKey) => {
          const isSelected = openedMonth === mKey;
          return (
            <button
              key={mKey}
              onClick={() => setOpenedMonth(mKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm scale-102'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {isSelected ? (
                <FolderOpen size={16} className="text-amber-400" />
              ) : (
                <Folder size={16} className="text-zinc-400" />
              )}
              <span>{formatMonthName(mKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Month Folder Container */}
      <div className="rounded-3xl bg-white border border-zinc-200/80 shadow-xs overflow-hidden">
        {/* Month Header Banner */}
        <div className="p-5 bg-zinc-950 text-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Month Folder Overview
              </span>
              <h3 className="text-xl font-black tracking-tight text-white mt-0.5">
                {formatMonthName(openedMonth)}
              </h3>
            </div>
            <div className="p-2 rounded-2xl bg-white/10 text-amber-400">
              <FolderOpen size={24} />
            </div>
          </div>

          {/* Month Financial KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total Sales</span>
              <p className="text-sm font-black text-white mt-0.5">
                {formatCurrency(monthStats.totalSales)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Collected</span>
              <p className="text-sm font-black text-emerald-400 mt-0.5">
                {formatCurrency(monthStats.totalCollected)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-semibold">Pending</span>
              <p className="text-sm font-black text-amber-400 mt-0.5">
                {formatCurrency(monthStats.totalPending)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 uppercase font-semibold">Expenses</span>
              <p className="text-sm font-black text-rose-400 mt-0.5">
                {formatCurrency(monthStats.totalExpenses)}
              </p>
            </div>
          </div>
        </div>

        {/* Section Tabs inside Month */}
        <div className="px-4 pt-3 border-b border-zinc-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'sales', label: `Sales (${monthStats.mSales.length})`, icon: ShoppingBag },
            { id: 'expenses', label: `Expenses (${monthStats.mExpenses.length})`, icon: Receipt },
            { id: 'payments', label: `Payments (${monthStats.mPayments.length})`, icon: ArrowDownLeft },
            { id: 'purchases', label: `Purchases (${monthStats.mPurchases.length})`, icon: Truck },
            { id: 'transfers', label: `Transfers (${monthStats.mTransfers.length})`, icon: ArrowRightLeft },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategoryTab(tab.id as any)}
              className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeCategoryTab === tab.id
                  ? 'border-zinc-900 text-zinc-950 font-black'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Folder Content Listing */}
        <div className="p-4 min-h-[220px]">
          {/* Sales Tab */}
          {activeCategoryTab === 'sales' && (
            <div className="space-y-2">
              {monthStats.mSales.length === 0 ? (
                <p className="text-center py-8 text-xs text-zinc-400">No sales recorded for this month</p>
              ) : (
                monthStats.mSales.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSaleId(s.id)}
                    className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70 hover:border-zinc-300 flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-900">{s.saleNumber}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-zinc-200/70 rounded-md">
                          {s.paymentStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {s.customerName} • Handled by {s.salesPerson} ({s.walletName})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-zinc-900">{formatCurrency(s.total)}</span>
                      <span className="text-[10px] text-zinc-400 block">{formatDate(s.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Expenses Tab */}
          {activeCategoryTab === 'expenses' && (
            <div className="space-y-2">
              {monthStats.mExpenses.length === 0 ? (
                <p className="text-center py-8 text-xs text-zinc-400">No expenses recorded for this month</p>
              ) : (
                monthStats.mExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-900">{e.category}</span>
                      <p className="text-[11px] text-zinc-500">{e.description} • {e.walletName}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-rose-600">-{formatCurrency(e.amount)}</span>
                      <span className="text-[10px] text-zinc-400 block">{formatDate(e.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeCategoryTab === 'payments' && (
            <div className="space-y-2">
              {monthStats.mPayments.length === 0 ? (
                <p className="text-center py-8 text-xs text-zinc-400">No customer settlement payments this month</p>
              ) : (
                monthStats.mPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-900">{p.customerName}</span>
                      <p className="text-[11px] text-zinc-500">{p.paymentMethod} • Received in {p.walletName}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-600">+{formatCurrency(p.amount)}</span>
                      <span className="text-[10px] text-zinc-400 block">{formatDate(p.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Purchases Tab */}
          {activeCategoryTab === 'purchases' && (
            <div className="space-y-2">
              {monthStats.mPurchases.length === 0 ? (
                <p className="text-center py-8 text-xs text-zinc-400">No inward purchases this month</p>
              ) : (
                monthStats.mPurchases.map((pur) => (
                  <div
                    key={pur.id}
                    className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-900">{pur.productName}</span>
                      <p className="text-[11px] text-zinc-500">
                        {pur.vendorName} • {pur.quantity} {pur.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-zinc-900">{formatCurrency(pur.totalCost)}</span>
                      <span className="text-[10px] text-zinc-400 block">{formatDate(pur.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Transfers Tab */}
          {activeCategoryTab === 'transfers' && (
            <div className="space-y-2">
              {monthStats.mTransfers.length === 0 ? (
                <p className="text-center py-8 text-xs text-zinc-400">No internal wallet transfers this month</p>
              ) : (
                monthStats.mTransfers.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-900">
                        {t.fromWalletName} ➔ {t.toWalletName}
                      </span>
                      <p className="text-[11px] text-zinc-500">{t.notes || 'Internal Transfer'}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-zinc-900">{formatCurrency(t.amount)}</span>
                      <span className="text-[10px] text-zinc-400 block">{formatDate(t.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
