import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { generateMonthlyStockPDF } from '../../utils/generateMonthlyStockPDF';
import { generatePnLPDF } from '../../utils/generatePnLPDF';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Wallet, Clock, Boxes, FileDown, Download } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    sales,
    expenses,
    wallets,
    products,
    customers,
    settings,
    availableMonths,
    formatCurrency,
  } = useData();

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || new Date().toISOString().substring(0, 7)
  );

  const formatMonthName = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch {
      return monthKey;
    }
  };

  // Compute metrics for the selected month
  const report = useMemo(() => {
    const monthSales = sales.filter((s) => s.monthKey === selectedMonth || s.date?.startsWith(selectedMonth));
    const monthExpenses = expenses.filter((e) => e.monthKey === selectedMonth || e.date?.startsWith(selectedMonth));

    const totalSalesAmount = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalCollectedAmount = monthSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const totalPendingSales = monthSales.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
    const totalExpensesAmount = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate product cost only where valid purchase cost is available
    let totalProductCost = 0;
    monthSales.forEach((s) => {
      s.items?.forEach((item) => {
        if (item.purchaseCost && item.purchaseCost > 0) {
          totalProductCost += item.purchaseCost * (item.quantity || 1);
        } else {
          // Check product catalog
          const p = products.find((prod) => prod.id === item.productId);
          if (p && p.purchaseCost > 0) {
            totalProductCost += p.purchaseCost * (item.quantity || 1);
          }
        }
      });
    });

    const estimatedGrossProfit = totalSalesAmount - totalProductCost;
    const netProfit = estimatedGrossProfit - totalExpensesAmount;

    // Total Stock Value
    const totalStockValue = products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchaseCost || 0), 0);

    // Total Outstanding Pending from all customers
    const totalOutstandingDue = customers.reduce((sum, c) => sum + (c.pendingBalance || 0), 0);

    return {
      monthSalesCount: monthSales.length,
      totalSalesAmount,
      totalCollectedAmount,
      totalPendingSales,
      totalExpensesAmount,
      totalProductCost,
      estimatedGrossProfit,
      netProfit,
      totalStockValue,
      totalOutstandingDue,
    };
  }, [selectedMonth, sales, expenses, products, customers]);

  return (
    <div className="space-y-5 pb-28 md:pb-12 max-w-3xl mx-auto">
      {/* Header & Month Filter */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Financial Reports</h2>
          <p className="text-xs text-zinc-600 font-medium">Profit &amp; Loss, margins, and balances</p>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-900 shadow-2xs focus:ring-1 focus:ring-zinc-900 outline-hidden"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {formatMonthName(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Net Profit Big Card */}
      <div
        className={`p-6 rounded-3xl border shadow-xl text-white relative ${
          report.netProfit >= 0
            ? 'bg-zinc-950 border-zinc-800'
            : 'bg-linear-to-br from-rose-950 to-zinc-950 border-rose-900'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {formatMonthName(selectedMonth)} • Net Profit
            </span>
            <div
              className={`text-3xl sm:text-4xl font-black tracking-tight mt-1 ${
                report.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(report.netProfit)}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Gross Profit ({formatCurrency(report.estimatedGrossProfit)}) − Expenses ({formatCurrency(report.totalExpensesAmount)})
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              generatePnLPDF({
                selectedMonth,
                sales,
                expenses,
                products,
                settings,
                formatCurrency,
              })
            }
            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Download size={14} className="stroke-[2.5]" />
            <span>Export P&amp;L PDF</span>
          </button>
        </div>
      </div>

      {/* Breakdown 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Sales */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Gross Sales Revenue</span>
          <div className="text-lg font-black text-zinc-950 mt-0.5">
            {formatCurrency(report.totalSalesAmount)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{report.monthSalesCount} orders</p>
        </div>

        {/* Product Cost (COGS) */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Cost of Goods (COGS)</span>
          <div className="text-lg font-black text-zinc-700 mt-0.5">
            {formatCurrency(report.totalProductCost)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Actual purchase cost</p>
        </div>

        {/* Gross Profit */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Estimated Gross Profit</span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">
            {formatCurrency(report.estimatedGrossProfit)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Sales minus product cost</p>
        </div>

        {/* Expenses */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Monthly Expenses</span>
          <div className="text-lg font-black text-rose-600 mt-0.5">
            {formatCurrency(report.totalExpensesAmount)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Operations &amp; courier</p>
        </div>
      </div>

      {/* Balance Sheet Summary Cards */}
      <div className="space-y-2.5 pt-2">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">
          Store Assets &amp; Receivables
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Current Inventory Stock Value</span>
              <p className="text-base font-black text-zinc-950 mt-0.5">
                {formatCurrency(report.totalStockValue)}
              </p>
              <button
                onClick={() =>
                  generateMonthlyStockPDF({
                    products,
                    stockMovements: [],
                    settings,
                    selectedMonth,
                    formatCurrency,
                  })
                }
                className="mt-2 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <FileDown size={13} />
                <span>Export Stock PDF</span>
              </button>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
              <Boxes size={18} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Total Customer Pending Dues</span>
              <p className="text-base font-black text-amber-600 mt-0.5">
                {formatCurrency(report.totalOutstandingDue)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Summary */}
      <div className="p-5 rounded-3xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
          Wallet Balances Snapshot
        </h4>
        <div className="divide-y divide-zinc-100">
          {wallets.map((w) => (
            <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: w.color || '#18181b' }}
                />
                <span className="font-bold text-zinc-900">{w.name}</span>
              </div>
              <span className="font-black text-zinc-950">{formatCurrency(w.currentBalance)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
