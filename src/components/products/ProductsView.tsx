import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { ProductDetailModal } from './ProductDetailModal';
import { addProduct } from '../../services/db';
import { Search, Plus, Package, Boxes, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ProductsView: React.FC = () => {
  const { products, formatCurrency, setSelectedProductId } = useData();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // New product form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Dry Fruits');
  const [unit, setUnit] = useState('kg');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [purchaseCost, setPurchaseCost] = useState<number | ''>('');
  const [openingStock, setOpeningStock] = useState<number | ''>('');
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  const totalStockValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchaseCost || 0), 0);
  }, [products]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await addProduct({
        name: name.trim(),
        category: category.trim() || 'General',
        unit: unit.trim() || 'pcs',
        sellingPrice: Number(sellingPrice) || 0,
        purchaseCost: Number(purchaseCost) || 0,
        currentStock: Number(openingStock) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
      });

      setName('');
      setSellingPrice('');
      setPurchaseCost('');
      setOpeningStock('');
      setIsAddProductOpen(false);
    } catch (err) {
      console.error('Failed to create product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Products Catalog</h2>
          <p className="text-xs text-zinc-600 font-medium">
            {products.length} Items • Inventory Value: {formatCurrency(totalStockValuation)}
          </p>
        </div>

        <button
          onClick={() => setIsAddProductOpen(!isAddProductOpen)}
          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>New Product</span>
        </button>
      </div>

      {/* Add Product Inline Form */}
      {isAddProductOpen && (
        <form
          onSubmit={handleCreateProduct}
          className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900">Add Product to Sanzari Catalog</h3>
            <button
              type="button"
              onClick={() => setIsAddProductOpen(false)}
              className="text-[11px] text-zinc-500 hover:text-zinc-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Product Name (e.g. Mamra Badam) *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
            <input
              type="text"
              placeholder="Category (e.g. Dry Fruits, Spices)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <span className="text-[10px] text-zinc-500 font-semibold">Unit</span>
              <input
                type="text"
                placeholder="kg / pcs / g"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 font-semibold">Selling Price (₹)</span>
              <input
                type="number"
                required
                placeholder="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold focus:ring-1 focus:ring-zinc-900 outline-hidden"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 font-semibold">Purchase Cost (₹)</span>
              <input
                type="number"
                placeholder="0"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold focus:ring-1 focus:ring-zinc-900 outline-hidden"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 font-semibold">Opening Stock</span>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold focus:ring-1 focus:ring-zinc-900 outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl"
          >
            {isSubmitting ? 'Saving Product...' : 'Save Product'}
          </button>
        </form>
      )}

      {/* Search & Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs text-xs font-medium focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
          />
        </div>

        {/* Category Pills */}
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

      {/* Products Grid / Cards */}
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
                  <span className="text-[10px] text-zinc-500 block">Current Stock</span>
                  <span className="text-xs font-extrabold text-zinc-900">
                    {p.currentStock} {p.unit}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">Price</span>
                  <span className="text-xs font-black text-emerald-600">
                    {formatCurrency(p.sellingPrice)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal />
    </div>
  );
};
