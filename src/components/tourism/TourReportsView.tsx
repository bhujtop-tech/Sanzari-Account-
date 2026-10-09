import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Luggage,
  Receipt,
  Download,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const TourReportsView: React.FC = () => {
  const {
    tourBatches,
    tourBookings,
    tourExpenses,
    formatCurrency,
    formatDate,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
  } = useData();

  // Financial calculations per batch
  const reportData = useMemo(() => {
    return tourBatches.map((batch) => {
      const bookings = tourBookings.filter((b) => b.tourBatchId === batch.id);
      const expenses = tourExpenses.filter((e) => e.tourBatchId === batch.id);

      const totalPax = bookings.reduce((sum, b) => sum + (b.membersCount || 1), 0);
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const totalAdvance = bookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);
      const totalPending = bookings.reduce((sum, b) => sum + (b.pendingAmount || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

      return {
        batch,
        totalPax,
        totalRevenue,
        totalAdvance,
        totalPending,
        totalExpenses,
        netProfit,
        profitMargin,
      };
    });
  }, [tourBatches, tourBookings, tourExpenses]);

  // Overall totals
  const totalTourRevenue = reportData.reduce((sum, r) => sum + r.totalRevenue, 0);
  const totalTourAdvance = reportData.reduce((sum, r) => sum + r.totalAdvance, 0);
  const totalTourPending = reportData.reduce((sum, r) => sum + r.totalPending, 0);
  const totalTourExpenses = reportData.reduce((sum, r) => sum + r.totalExpenses, 0);
  const totalNetProfit = totalTourRevenue - totalTourExpenses;

  return (
    <div className="space-y-6 pb-36 sm:pb-32">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-800 via-teal-800 to-sky-900 p-5 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
            <TrendingUp className="w-4 h-4" /> Tour Financials & P&L
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
            Tour Profit & Loss Reports
          </h2>
          <p className="text-xs text-emerald-100 max-w-xl mt-1">
            Analyze revenue, advance collections, pending dues, hotel & IRCTC ticket costs, and net profit per tour batch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white text-emerald-900 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 hover:bg-emerald-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 uppercase block">Total Tour Billing</span>
          <span className="text-xl font-extrabold text-zinc-900 font-mono">
            {formatCurrency(totalTourRevenue)}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-1">All confirmed packages</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 uppercase block">Advance Collected</span>
          <span className="text-xl font-extrabold text-emerald-700 font-mono">
            {formatCurrency(totalTourAdvance)}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-1">Cash & Online UPI</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-sm">
          <span className="text-[11px] font-bold text-rose-700 uppercase block">Total Expenses</span>
          <span className="text-xl font-extrabold text-rose-700 font-mono">
            {formatCurrency(totalTourExpenses)}
          </span>
          <span className="text-[10px] text-rose-600 block mt-1">Hotel, tickets & bus</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-100 bg-blue-50/20 shadow-sm">
          <span className="text-[11px] font-bold text-blue-700 uppercase block">Net Tour Profit</span>
          <span
            className={`text-xl font-extrabold font-mono ${
              totalNetProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
            }`}
          >
            {formatCurrency(totalNetProfit)}
          </span>
          <span className="text-[10px] text-blue-600 block mt-1">Billing minus expenses</span>
        </div>
      </div>

      {/* Batch-wise Breakdown Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden space-y-4 p-5">
        <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <Luggage className="w-5 h-5 text-blue-600" /> Tour Batch Profitability Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100/80 text-zinc-600 font-bold border-b border-zinc-200 uppercase text-[10px] tracking-wider">
                <th className="p-3">Tour Batch / Destination</th>
                <th className="p-3 text-center">Date</th>
                <th className="p-3 text-center">Pax</th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">Advance Paid</th>
                <th className="p-3 text-right">Pending Due</th>
                <th className="p-3 text-right">Tour Costs</th>
                <th className="p-3 text-right">Net Profit</th>
                <th className="p-3 text-center">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {reportData.map((r, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="p-3">
                    <span className="font-extrabold text-zinc-900 block text-sm">{r.batch.title}</span>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {r.batch.destination} ({r.batch.travelMode})
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-zinc-700">
                    {formatDate(r.batch.departureDate)}
                  </td>
                  <td className="p-3 text-center font-bold font-mono text-indigo-700">
                    {r.totalPax} / {r.batch.totalSeats}
                  </td>
                  <td className="p-3 text-right font-bold font-mono text-zinc-900">
                    {formatCurrency(r.totalRevenue)}
                  </td>
                  <td className="p-3 text-right font-bold font-mono text-emerald-700">
                    {formatCurrency(r.totalAdvance)}
                  </td>
                  <td className="p-3 text-right font-bold font-mono text-rose-600">
                    {formatCurrency(r.totalPending)}
                  </td>
                  <td className="p-3 text-right font-bold font-mono text-zinc-700">
                    {formatCurrency(r.totalExpenses)}
                  </td>
                  <td
                    className={`p-3 text-right font-extrabold font-mono text-sm ${
                      r.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(r.netProfit)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        r.profitMargin >= 25
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.profitMargin > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.profitMargin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
