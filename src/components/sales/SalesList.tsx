import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { SaleDetailModal } from './SaleDetailModal';
import { Search, Plus, ShoppingBag, ChevronRight, Calendar, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export const SalesList: React.FC = () => {
  const { sales, formatCurrency, formatDate, setSelectedSaleId, setIsAddSaleOpen } = useData();

  const [search, setSearch] = useState('');
  const [personFilter, setPersonFilter] = useState<'All' | 'Rizwan' | 'Avesh' | 'Sahil'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partial' | 'Pending'>('All');

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.customerName.toLowerCase().includes(search.toLowerCase()) ||
        s.customerPhone.includes(search);

      const matchPerson =
        personFilter === 'All' ||
        s.salesPerson.toLowerCase() === personFilter.toLowerCase();

      const matchStatus =
        statusFilter === 'All' || s.paymentStatus === statusFilter;

      return matchSearch && matchPerson && matchStatus;
    });
  }, [sales, search, personFilter, statusFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  }, [filteredSales]);

  return (
    <div className="space-y-4 pb-36 sm:pb-32 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Sales History</h2>
          <p className="text-xs text-zinc-600 font-medium">
            {filteredSales.length} Orders • Total: {formatCurrency(totalFilteredAmount)}
          </p>
        </div>

        <button
          onClick={() => setIsAddSaleOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>New Sale</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by sale number, customer name, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs text-xs font-medium focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition-all"
        />
      </div>

      {/* Segmented Person Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60">
          {(['All', 'Rizwan', 'Avesh', 'Sahil'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPersonFilter(p)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                personFilter === p
                  ? 'bg-white text-zinc-950 shadow-xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60">
          {(['All', 'Paid', 'Partial', 'Pending'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-zinc-950 shadow-xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Sales List Cards */}
      {filteredSales.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200 text-zinc-600">
          <ShoppingBag size={32} className="mx-auto mb-2 text-zinc-300" />
          <p className="text-xs font-bold text-zinc-700">No sales records found</p>
          <p className="text-[11px] mt-0.5">Tap "New Sale" to create an invoice</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSales.map((sale) => (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedSaleId(sale.id)}
              className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md">
                    {sale.saleNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sale.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : sale.paymentStatus === 'Partial'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    }`}
                  >
                    {sale.paymentStatus}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-zinc-950 tracking-tight">
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-600 mt-2">
                <div>
                  <p className="font-bold text-zinc-900">{sale.customerName}</p>
                  <p className="text-[11px] text-zinc-600">
                    {sale.items?.length || 1} product(s) • Sales: {sale.salesPerson} ({sale.walletName})
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-right">
                  <span className="text-[11px] text-zinc-600 font-medium">
                    {formatDate(sale.date)}
                  </span>
                  <ChevronRight size={15} className="text-zinc-400" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sale Detail Invoice Modal */}
      <SaleDetailModal />
    </div>
  );
};
