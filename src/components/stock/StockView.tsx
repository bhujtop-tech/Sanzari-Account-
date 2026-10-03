import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { ProductDetailModal } from '../products/ProductDetailModal';
import { AddReturnModal } from './AddReturnModal';
import { AddPurchaseModal } from '../purchases/AddPurchaseModal';
import { generateMonthlyStockPDF } from '../../utils/generateMonthlyStockPDF';
import {
  Boxes,
  Plus,
  RotateCcw,
  Search,
  Package,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  FileDown,
  Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';

export const StockView: React.FC = () => {
  const {
    products,
    stockMovements,
    returns,
    settings,
    selectedMonth,
    setSelectedMonth,
    formatCurrency,
    formatDate,
    setSelectedProductId,
    setIsAddPurchaseOpen,
    isAddPurchaseOpen,
    setIsReturnOpen,
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'movements' | 'returns'>('inventory');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const handleExportStockPDF = () => {
    generateMonthlyStockPDF({
      products,
      stockMovements,
      settings,
      selectedMonth,
      formatCurrency,
    });
  };

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  // Total Stock Valuation
  const totalStockValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchaseCost || 0), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.currentStock <= p.lowStockThreshold).length;
  }, [products]);

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-5xl mx-auto">
      {/* Stock Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950 flex items-center gap-2">
            <Boxes size={24} className="text-amber-500" />
            <span>Stock & Inventory Hub</span>
          </h2>
          <p className="text-xs text-zinc-600 font-medium">
            {products.length} Products • Total Stock Value: {formatCurrency(totalStockValuation)}
          </p>
        </div>

        {/* Primary Stock Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
            <Calendar size={13} className="text-zinc-500 shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-zinc-900 bg-transparent outline-hidden cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportStockPDF}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            title="Export Monthly Stock PDF Report"
          >
            <FileDown size={15} />
            <span>Export Stock PDF</span>
          </button>

          <button
            onClick={() => setIsAddPurchaseOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus size={15} />
            <span>+ Inward Stock</span>
          </button>

          <button
            onClick={() => setIsReturnOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Return</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Total Items
          </span>
          <p className="text-base font-black text-zinc-950 mt-0.5">{products.length} Items</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Stock Valuation
          </span>
          <p className="text-base font-black text-emerald-900 mt-0.5">
            {formatCurrency(totalStockValuation)}
          </p>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            lowStockCount > 0
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-zinc-50 border-zinc-200/80 text-zinc-900'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block">
            Low Stock Alert
          </span>
          <p className="text-base font-black mt-0.5">{lowStockCount} Items</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-950">
          <span className="text-[10px] font-bold uppercase tracking-wider block">
            Returns Recorded
          </span>
          <p className="text-base font-black mt-0.5">{returns.length} Returns</p>
        </div>
      </div>

      {/* Sub Tab Switcher */}
      <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200/80">
        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'inventory'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          All Inventory ({products.length})
        </button>

        <button
          onClick={() => setActiveSubTab('movements')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'movements'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Stock Log ({stockMovements.length})
        </button>

        <button
          onClick={() => setActiveSubTab('returns')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'returns'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Returns ({returns.length})
        </button>
      </div>

      {/* SUB-TAB 1: ALL INVENTORY PRODUCTS */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-3">
          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search stock by product name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs text-xs font-medium focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredProducts.map((p) => {
              const isLow = p.currentStock <= p.lowStockThreshold && p.currentStock > 0;
              const isOut = p.currentStock <= 0;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedProductId(p.id)}
                  className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 hover:shadow-xs flex flex-col justify-between transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        {p.category}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isOut
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-zinc-950">{p.name}</h3>
                  </div>

                  <div className="flex items-end justify-between mt-3 pt-2.5 border-t border-zinc-100">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Available Stock</span>
                      <span className="text-xs font-black text-zinc-900">
                        {p.currentStock} {p.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">Cost / Sell</span>
                      <span className="text-xs font-bold text-zinc-700">
                        ₹{p.purchaseCost} /{' '}
                        <span className="text-emerald-600 font-extrabold">
                          {formatCurrency(p.sellingPrice)}
                        </span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STOCK MOVEMENT LOGS */}
      {activeSubTab === 'movements' && (
        <div className="space-y-2">
          {stockMovements.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-xs text-zinc-500">
              No stock movements recorded yet.
            </div>
          ) : (
            stockMovements.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        m.type === 'PURCHASE' || m.type === 'OPENING' || m.type === 'RETURN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {m.type}
                    </span>
                    <h4 className="font-bold text-zinc-900">{m.productName}</h4>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {m.notes || m.type} • {formatDate(m.date)}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-black ${
                      m.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-TAB 3: SALES RETURNS LOG */}
      {activeSubTab === 'returns' && (
        <div className="space-y-2">
          {returns.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-xs text-zinc-500">
              No sales returns recorded yet. Use ↩️ Sales Return above to record returned stock.
            </div>
          ) : (
            returns.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                      RETURN
                    </span>
                    <h4 className="font-bold text-zinc-900">{r.productName}</h4>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Customer: <span className="font-bold text-zinc-700">{r.customerName}</span> •{' '}
                    {formatDate(r.date)}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Action: {r.refundMethod === 'DeductPending' ? 'Deducted Udhari' : 'Wallet Refund'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-amber-700 block">
                    +{r.quantity} {r.unit} Restocked
                  </span>
                  <span className="text-xs font-bold text-zinc-900">
                    {formatCurrency(r.totalAmount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal />

      {/* Sales Return Modal */}
      <AddReturnModal />

      {/* Inward Purchase Modal */}
      <AddPurchaseModal
        isOpen={isAddPurchaseOpen}
        onClose={() => setIsAddPurchaseOpen(false)}
      />
    </div>
  );
};
