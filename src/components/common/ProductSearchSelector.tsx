import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../../types';
import { Search, ChevronDown, Check, Package } from 'lucide-react';

interface ProductSearchSelectorProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (product: Product) => void;
  formatCurrency?: (val: number) => string;
}

export const ProductSearchSelector: React.FC<ProductSearchSelectorProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  formatCurrency = (val) => `₹${val}`,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* Selected product trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-xs font-bold text-zinc-900 flex items-center justify-between shadow-2xs transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <Package size={14} className="text-zinc-500 shrink-0" />
          {selectedProduct ? (
            <span className="truncate">{selectedProduct.name}</span>
          ) : (
            <span className="text-zinc-400 font-normal">Select product...</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedProduct && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
              Stock: {selectedProduct.currentStock} {selectedProduct.unit}
            </span>
          )}
          <ChevronDown size={14} className="text-zinc-400" />
        </div>
      </button>

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-zinc-200 shadow-2xl p-2 max-h-64 flex flex-col space-y-1.5 overflow-hidden animate-in fade-in duration-150">
          {/* Search Input Bar */}
          <div className="relative shrink-0">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search product (e.g., Kaju, Almond, Dates)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-zinc-900 outline-hidden"
            />
          </div>

          {/* Filtered Products List */}
          <div className="overflow-y-auto max-h-48 divide-y divide-zinc-100 space-y-0.5">
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-500 font-medium">
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
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 text-white font-bold'
                        : 'hover:bg-zinc-50 text-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold flex items-center gap-1.5">
                        <span>{p.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {p.category}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        Rate: {formatCurrency(p.sellingPrice)}/{p.unit}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md block ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : p.currentStock <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
