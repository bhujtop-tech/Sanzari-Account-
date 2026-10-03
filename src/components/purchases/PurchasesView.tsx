import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AddPurchaseModal } from './AddPurchaseModal';
import { Truck, Plus, Search, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export const PurchasesView: React.FC = () => {
  const { purchases, formatCurrency, formatDate } = useData();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(
      (p) =>
        p.productName.toLowerCase().includes(search.toLowerCase()) ||
        p.vendorName.toLowerCase().includes(search.toLowerCase())
    );
  }, [purchases, search]);

  const totalPurchasesCost = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  }, [purchases]);

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Purchases</h2>
          <p className="text-xs text-zinc-600 font-medium">
            Inward Stock Supplies • Total: {formatCurrency(totalPurchasesCost)}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>New Purchase</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search purchases by supplier or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs text-xs font-medium focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
        />
      </div>

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200 text-zinc-600">
          <Truck size={32} className="mx-auto mb-2 text-zinc-300" />
          <p className="text-xs font-bold text-zinc-700">No purchases recorded yet</p>
          <p className="text-[11px] mt-0.5">Tap "New Purchase" to add inward vendor stock</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPurchases.map((pur) => (
            <motion.div
              key={pur.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xs font-bold text-zinc-950">{pur.productName}</h3>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      pur.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {pur.paymentStatus}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Supplier: {pur.vendorName} • {pur.quantity} {pur.unit} @ {formatCurrency(pur.purchaseCost)}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-zinc-950 block">
                  {formatCurrency(pur.totalCost)}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">{formatDate(pur.date)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AddPurchaseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};
