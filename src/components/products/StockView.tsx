import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { ProductDetailModal } from './ProductDetailModal';
import { Boxes, AlertTriangle, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export const StockView: React.FC = () => {
  const { products, formatCurrency, setSelectedProductId } = useData();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Low' | 'Out'>('All');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());

      const isLow = p.currentStock <= p.lowStockThreshold && p.currentStock > 0;
      const isOut = p.currentStock <= 0;

      if (filterType === 'Low') return matchSearch && isLow;
      if (filterType === 'Out') return matchSearch && isOut;
      return matchSearch;
    });
  }, [products, search, filterType]);

  const inStockCount = products.filter((p) => p.currentStock > p.lowStockThreshold).length;
  const lowStockCount = products.filter((p) => p.currentStock <= p.lowStockThreshold && p.currentStock > 0).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Stock Management</h2>
          <p className="text-xs text-zinc-600 font-medium">Physical inventory counts &amp; audit trails</p>
        </div>
      </div>

      {/* 3 KPI Badges */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => setFilterType('All')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === 'All'
              ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
              : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider ${filterType === 'All' ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Total SKUs
          </span>
          <p className="text-xl font-black mt-0.5">{products.length}</p>
        </button>

        <button
          onClick={() => setFilterType('Low')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === 'Low'
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'bg-white border-zinc-200 text-amber-700 hover:bg-amber-50'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider ${filterType === 'Low' ? 'text-amber-200' : 'text-amber-600'}`}>
            Low Stock
          </span>
          <p className="text-xl font-black mt-0.5">{lowStockCount}</p>
        </button>

        <button
          onClick={() => setFilterType('Out')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === 'Out'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white border-zinc-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider ${filterType === 'Out' ? 'text-rose-200' : 'text-rose-600'}`}>
            Out of Stock
          </span>
          <p className="text-xl font-black mt-0.5">{outOfStockCount}</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Filter stock items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs text-xs font-medium focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
        />
      </div>

      {/* Stock Cards List */}
      <div className="space-y-2">
        {filteredProducts.map((p) => {
          const isLow = p.currentStock <= p.lowStockThreshold && p.currentStock > 0;
          const isOut = p.currentStock <= 0;

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedProductId(p.id)}
              className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 hover:shadow-xs flex items-center justify-between transition-all cursor-pointer"
            >
              <div>
                <h3 className="text-xs font-bold text-zinc-950">{p.name}</h3>
                <p className="text-[11px] text-zinc-500">
                  {p.category} • Low threshold: {p.lowStockThreshold} {p.unit}
                </p>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-zinc-950">
                  {p.currentStock} <span className="text-xs font-semibold text-zinc-500">{p.unit}</span>
                </div>
                <span
                  className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                    isOut
                      ? 'bg-rose-100 text-rose-800'
                      : isLow
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <ProductDetailModal />
    </div>
  );
};
