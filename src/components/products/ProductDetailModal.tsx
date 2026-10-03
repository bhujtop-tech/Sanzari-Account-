import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { adjustStock, updateProduct, deleteProduct } from '../../services/db';
import {
  Boxes,
  Edit2,
  Trash2,
  Check,
  X,
  Tag,
  AlertTriangle,
  History,
  Save,
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProductId,
    setSelectedProductId,
    products,
    stockMovements,
    formatCurrency,
    formatDate,
  } = useData();
  const { user, userPermissions } = useAuth();

  const product = products.find((p) => p.id === selectedProductId);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState<number | ''>('');
  const [editPurchaseCost, setEditPurchaseCost] = useState<number | ''>('');
  const [editLowStockThreshold, setEditLowStockThreshold] = useState<number | ''>('');

  // Stock Adjustment State
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'ADJUSTMENT' | 'DAMAGE' | 'LOSS'>('ADJUSTMENT');
  const [newStockQty, setNewStockQty] = useState<number | ''>('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setEditName(product.name);
      setEditCategory(product.category);
      setEditUnit(product.unit);
      setEditSellingPrice(product.sellingPrice);
      setEditPurchaseCost(product.purchaseCost);
      setEditLowStockThreshold(product.lowStockThreshold);
      setIsEditing(false);
      setIsAdjusting(false);
      setFormError(null);
    }
  }, [product]);

  // Filter stock movements for this product
  const movements = useMemo(() => {
    if (!selectedProductId) return [];
    return stockMovements.filter((m) => m.productId === selectedProductId);
  }, [stockMovements, selectedProductId]);

  if (!product) return null;

  const stockValue = (product.currentStock || 0) * (product.purchaseCost || 0);
  const isLowStock = product.currentStock <= product.lowStockThreshold && product.currentStock > 0;
  const isOutOfStock = product.currentStock <= 0;

  const handleSaveProductEdit = async () => {
    if (!editName.trim()) {
      setFormError('Product name is required');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      await updateProduct(product.id, {
        name: editName.trim(),
        category: editCategory.trim() || 'General',
        unit: editUnit.trim() || 'pcs',
        sellingPrice: Number(editSellingPrice) || 0,
        purchaseCost: Number(editPurchaseCost) || 0,
        lowStockThreshold: Number(editLowStockThreshold) || 5,
      });
      setIsEditing(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update product details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProductConfirm = async () => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}" from catalog?`)) return;
    try {
      setIsSubmitting(true);
      await deleteProduct(product.id);
      setSelectedProductId(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAdjustment = async () => {
    if (newStockQty === '') return;
    try {
      setIsSubmitting(true);
      await adjustStock(
        product.id,
        product.name,
        Number(newStockQty),
        adjustmentType,
        adjustmentNotes.trim() || `Physical stock ${adjustmentType.toLowerCase()}`,
        user?.email || 'sanzaritourism@gmail.com'
      );
      setIsAdjusting(false);
      setNewStockQty('');
      setAdjustmentNotes('');
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={!!selectedProductId}
      onClose={() => {
        setSelectedProductId(null);
        setIsEditing(false);
        setIsAdjusting(false);
      }}
      title="Product Management"
      subtitle={product.name}
    >
      <div className="space-y-5 pb-6">
        {formError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {formError}
          </div>
        )}

        {/* Product Card or Edit Form */}
        {!isEditing ? (
          <div className="p-5 rounded-3xl bg-zinc-50 border border-zinc-200/80 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  {product.category}
                </span>
                <h3 className="text-base font-extrabold text-zinc-950 mt-0.5">{product.name}</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 text-zinc-800 text-xs font-bold shadow-2xs hover:bg-zinc-100 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    isOutOfStock
                      ? 'bg-rose-100 text-rose-800'
                      : isLowStock
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-200/70 text-center">
              <div className="p-2 rounded-xl bg-white border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">Current Stock</span>
                <p className="text-sm font-black text-zinc-950 mt-0.5">
                  {product.currentStock} {product.unit}
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">Stock Value</span>
                <p className="text-sm font-black text-zinc-950 mt-0.5">
                  {formatCurrency(stockValue)}
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">Selling Price</span>
                <p className="text-sm font-black text-emerald-600 mt-0.5">
                  {formatCurrency(product.sellingPrice)}
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">Purchase Cost</span>
                <p className="text-sm font-black text-zinc-700 mt-0.5">
                  {userPermissions?.canViewCostPrice ? formatCurrency(product.purchaseCost) : '***'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Manual Edit Form */
          <div className="p-4 rounded-3xl bg-zinc-50 border border-zinc-300 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Edit Product Manual Data
              </h4>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-900 outline-hidden focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-medium text-zinc-900 outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                  Unit (kg / pcs / 1g)
                </label>
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-medium text-zinc-900 outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                  Selling Rate (₹)
                </label>
                <input
                  type="number"
                  value={editSellingPrice}
                  onChange={(e) =>
                    setEditSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-extrabold text-zinc-900 outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                  Purchase Cost (₹)
                </label>
                <input
                  type="number"
                  value={editPurchaseCost}
                  onChange={(e) =>
                    setEditPurchaseCost(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-extrabold text-zinc-900 outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                  Low Threshold
                </label>
                <input
                  type="number"
                  value={editLowStockThreshold}
                  onChange={(e) =>
                    setEditLowStockThreshold(
                      e.target.value === '' ? '' : parseFloat(e.target.value)
                    )
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-extrabold text-zinc-900 outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleDeleteProductConfirm}
                className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveProductEdit}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={13} />
                <span>{isSubmitting ? 'Saving Changes...' : 'Save Product Updates'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Stock Correction Action Button */}
        <div>
          {!isAdjusting ? (
            <button
              onClick={() => {
                setNewStockQty(product.currentStock);
                setIsAdjusting(true);
              }}
              className="w-full py-3 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
            >
              <Boxes size={14} />
              <span>Physical Stock Audit / Quantity Adjustment</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900">Enter Physical Count</h4>
                <button
                  onClick={() => setIsAdjusting(false)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['ADJUSTMENT', 'DAMAGE', 'LOSS'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAdjustmentType(type)}
                    className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      adjustmentType === type
                        ? 'bg-zinc-900 text-white font-bold'
                        : 'bg-white text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-semibold">
                  {adjustmentType === 'ADJUSTMENT' ? 'New Actual Count' : 'Quantity to Deduct'} ({product.unit})
                </span>
                <input
                  type="number"
                  step="any"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-xs font-black outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <input
                type="text"
                placeholder="Reason / Audit Note"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs outline-hidden"
              />

              <button
                disabled={isSubmitting}
                onClick={handleSaveAdjustment}
                className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl"
              >
                {isSubmitting ? 'Updating...' : 'Confirm Stock Update'}
              </button>
            </div>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div>
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5">
            Stock Movement Trail ({movements.length})
          </h4>

          {movements.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-xs text-zinc-500">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          m.type === 'PURCHASE' || m.type === 'OPENING'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {m.type}
                      </span>
                      <span className="font-semibold text-zinc-800">{m.notes || m.type}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 block mt-0.5">{formatDate(m.date)}</span>
                  </div>

                  <span
                    className={`font-black text-xs ${
                      m.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
