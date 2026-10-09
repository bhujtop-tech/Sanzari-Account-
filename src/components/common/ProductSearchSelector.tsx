import React, { useState } from 'react';
import { Product } from '../../types';
import { Search, Package, ChevronRight } from 'lucide-react';

interface ProductSearchSelectorProps {
  products: Product[];
  selectedProductId?: string;
  onSelectProduct: (product: Product) => void;
  formatCurrency?: (val: number) => string;
}

export const ProductSearchSelector: React.FC<ProductSearchSelectorProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  formatCurrency = (val) => `₹${val}`,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-2">
      {/* Search Bar Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-zinc-400" />
        <input
          type="text"
          autoFocus
          placeholder="Search product (e.g. Kaju, Almond, Dates)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-xs font-medium outline-hidden transition-all"
        />
      </div>

      {/* Filtered Product Results List */}
      <div className="max-h-56 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100">
        {filteredProducts.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500 font-medium">
            No matching product found
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isSelected = p.id === selectedProductId;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectProduct(p);
                  setSearchTerm('');
                }}
                className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors ${
                  isSelected ? 'bg-zinc-100' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 font-bold">
                    <Package size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-zinc-900 truncate">{p.name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-600">
                        {p.category}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-500 block">
                      Rate: {formatCurrency(p.sellingPrice)} / {p.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                      p.currentStock <= 0
                        ? 'bg-rose-100 text-rose-800'
                        : p.currentStock <= p.lowStockThreshold
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    Stock: {p.currentStock} {p.unit}
                  </span>
                  <ChevronRight size={14} className="text-zinc-400" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
