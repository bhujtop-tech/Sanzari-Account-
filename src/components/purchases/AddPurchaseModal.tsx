import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { SuccessSheet } from '../common/SuccessSheet';
import { createPurchase, addVendor, getCurrentDateString } from '../../services/db';
import { ProductSearchSelector } from '../common/ProductSearchSelector';
import {
  Plus,
  Building2,
  Package,
  Boxes,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';

export const AddPurchaseModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { products, wallets, vendors, formatCurrency } = useData();
  const { user } = useAuth();

  // Supplier selection / Inline Creation
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [isAddingNewVendor, setIsAddingNewVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorCity, setNewVendorCity] = useState('');

  // Item & Pricing
  const [selectedProductId, setSelectedProductId] = useState('');
  const [unitPricingMode, setUnitPricingMode] = useState<'per_kg' | 'per_g' | 'standard'>('standard');
  const [quantityInput, setQuantityInput] = useState<number | ''>('');
  const [rateInput, setRateInput] = useState<number | ''>('');

  // Payment & Date
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid'>('Paid');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [date, setDate] = useState(getCurrentDateString());
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    amount: string;
    item: string;
    supplier: string;
    newStock: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedVendorId(vendors.length > 0 ? vendors[0].id : '');
      setIsAddingNewVendor(false);
      setNewVendorName('');
      setNewVendorPhone('');
      setNewVendorCity('');
      setQuantityInput('');
      setPaymentStatus('Paid');
      setDate(getCurrentDateString());
      setNotes('');
      setFormError(null);

      if (products.length > 0) {
        const firstP = products[0];
        setSelectedProductId(firstP.id);
        setupProductDefaults(firstP);
      }
      if (wallets.length > 0) {
        setSelectedWalletId(wallets[0].id);
      }
    }
  }, [isOpen, products, wallets, vendors]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Set unit defaults based on product unit
  const setupProductDefaults = (prod: typeof products[0]) => {
    const u = prod.unit.toLowerCase();
    if (u === 'kg' || u === 'kilogram') {
      setUnitPricingMode('per_kg');
      setRateInput(prod.purchaseCost || 0);
    } else if (u === 'g' || u === '1g' || u === 'gram') {
      setUnitPricingMode('per_g');
      setRateInput(prod.purchaseCost || 0);
    } else {
      setUnitPricingMode('standard');
      setRateInput(prod.purchaseCost || 0);
    }
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find((prod) => prod.id === prodId);
    if (p) setupProductDefaults(p);
  };

  // Convert inputs to standard product unit values
  // e.g. If product is in "kg":
  //   - If mode is 'per_kg': rateInput is ₹/kg, quantity is in kg.
  //   - If mode is 'per_g': rateInput is ₹/g -> rate per kg = rateInput * 1000.
  // e.g. If product is in "g" or "1g":
  //   - If mode is 'per_g': rateInput is ₹/g, quantity is in g.
  //   - If mode is 'per_kg': rateInput is ₹/kg -> rate per g = rateInput / 1000.
  const calculateFinalMetrics = () => {
    if (!selectedProduct) return { finalQty: 0, finalCostPerProductUnit: 0, totalCost: 0 };

    const rawQty = Number(quantityInput) || 0;
    const rawRate = Number(rateInput) || 0;
    const prodUnit = selectedProduct.unit.toLowerCase();

    let finalQty = rawQty;
    let finalCostPerProductUnit = rawRate;

    if (prodUnit === 'kg' || prodUnit === 'kilogram') {
      if (unitPricingMode === 'per_g') {
        // Qty in grams -> convert to kg for product stock
        finalQty = rawQty / 1000;
        // Rate per gram -> convert to rate per kg
        finalCostPerProductUnit = rawRate * 1000;
      }
    } else if (prodUnit === 'g' || prodUnit === '1g' || prodUnit === 'gram') {
      if (unitPricingMode === 'per_kg') {
        // Qty in kg -> convert to grams
        finalQty = rawQty * 1000;
        // Rate per kg -> convert to rate per g
        finalCostPerProductUnit = rawRate / 1000;
      }
    }

    const totalCost = rawQty * rawRate;
    return { finalQty, finalCostPerProductUnit, totalCost };
  };

  const { finalQty, finalCostPerProductUnit, totalCost } = calculateFinalMetrics();
  const expectedNewStock = (selectedProduct?.currentStock || 0) + finalQty;

  // Price Hike / Low Comparison
  const lastPurchaseCost = selectedProduct?.purchaseCost || 0;
  const costDiff = finalCostPerProductUnit - lastPurchaseCost;
  const percentageChange =
    lastPurchaseCost > 0 ? ((costDiff / lastPurchaseCost) * 100).toFixed(1) : '0';

  const handleCreateNewVendor = async (): Promise<string | null> => {
    if (!newVendorName.trim()) {
      setFormError('Please enter Supplier / Vendor name');
      return null;
    }
    try {
      const vId = await addVendor({
        name: newVendorName.trim(),
        phone: newVendorPhone.trim() || 'N/A',
        city: newVendorCity.trim(),
        totalPurchases: 0,
        pendingPayment: 0,
      });
      return vId;
    } catch (e: any) {
      setFormError('Failed to create supplier');
      return null;
    }
  };

  const handleSavePurchase = async () => {
    try {
      setFormError(null);

      let vendorId = selectedVendorId;
      let vendorName = '';

      if (isAddingNewVendor) {
        const createdId = await handleCreateNewVendor();
        if (!createdId) return;
        vendorId = createdId;
        vendorName = newVendorName.trim();
      } else {
        const v = vendors.find((v) => v.id === selectedVendorId);
        vendorName = v ? v.name : 'Direct Supplier';
      }

      if (!selectedProduct) {
        setFormError('Please select a product');
        return;
      }

      if (finalQty <= 0) {
        setFormError('Please enter a valid stock quantity');
        return;
      }

      if (finalCostPerProductUnit <= 0) {
        setFormError('Please enter purchase cost price');
        return;
      }

      const activeWallet = wallets.find((w) => w.id === selectedWalletId);

      setIsSubmitting(true);

      await createPurchase({
        purchase: {
          vendorId: vendorId || undefined,
          vendorName,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: finalQty,
          unit: selectedProduct.unit,
          purchaseCost: finalCostPerProductUnit,
          totalCost,
          paymentStatus,
          walletId: paymentStatus === 'Paid' && activeWallet ? activeWallet.id : undefined,
          walletName: paymentStatus === 'Paid' && activeWallet ? activeWallet.name : undefined,
          date,
          notes: notes.trim(),
        },
        userEmail: user?.email || 'sanzaritourism@gmail.com',
      });

      onClose();
      setSuccessInfo({
        amount: formatCurrency(totalCost),
        item: `+${finalQty} ${selectedProduct.unit} of ${selectedProduct.name}`,
        supplier: vendorName,
        newStock: expectedNewStock,
      });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to record purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Record Inward Purchase & Costing"
        subtitle="Select supplier, rate (Per Kg / Per Gram), and track price hikes"
      >
        <div className="space-y-4 pb-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {formError}
            </div>
          )}

          {/* Supplier / Vendor Section */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={15} className="text-violet-600" />
                <span>Supplier / Vendor *</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewVendor(!isAddingNewVendor);
                  setFormError(null);
                }}
                className="text-[11px] font-bold text-violet-700 hover:text-violet-900 flex items-center gap-1 cursor-pointer"
              >
                {isAddingNewVendor ? 'Select Existing' : '+ Add New Supplier'}
              </button>
            </div>

            {!isAddingNewVendor ? (
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
              >
                {vendors.length === 0 ? (
                  <option value="">No suppliers found (tap + Add New Supplier)</option>
                ) : (
                  vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.city ? `(${v.city})` : ''} - Purchases: {formatCurrency(v.totalPurchases)}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Supplier / Business Name *"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={newVendorPhone}
                    onChange={(e) => setNewVendorPhone(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="City (e.g. Srinagar)"
                    value={newVendorCity}
                    onChange={(e) => setNewVendorCity(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Product Select & Cost Price Info */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={15} className="text-emerald-600" />
                <span>Select Item / Product *</span>
              </label>
              {selectedProduct && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Current Stock: {selectedProduct.currentStock} {selectedProduct.unit}
                </span>
              )}
            </div>

            <ProductSearchSelector
              products={products}
              selectedProductId={selectedProductId}
              formatCurrency={formatCurrency}
              onSelectProduct={(p) => handleProductChange(p.id)}
            />

            {/* Per Kg / Per Gram Pricing Unit Mode */}
            {selectedProduct &&
              (selectedProduct.unit.toLowerCase().includes('kg') ||
                selectedProduct.unit.toLowerCase().includes('g')) && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200 text-xs">
                  <span className="font-bold text-zinc-600 flex items-center gap-1">
                    <ArrowRightLeft size={13} className="text-zinc-400" />
                    Rate Calculation Mode:
                  </span>
                  <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setUnitPricingMode('per_kg')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                        unitPricingMode === 'per_kg'
                          ? 'bg-zinc-900 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Per Kg (₹/kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitPricingMode('per_g')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                        unitPricingMode === 'per_g'
                          ? 'bg-zinc-900 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Per Gram (₹/g)
                    </button>
                  </div>
                </div>
              )}

            {/* Quantity and Rate Input */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Inward Qty ({unitPricingMode === 'per_kg' ? 'kg' : unitPricingMode === 'per_g' ? 'grams' : selectedProduct?.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 5"
                  value={quantityInput}
                  onChange={(e) =>
                    setQuantityInput(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-black text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Rate Price ({unitPricingMode === 'per_kg' ? '₹/kg' : unitPricingMode === 'per_g' ? '₹/gram' : `₹/${selectedProduct?.unit}`}) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1800"
                  value={rateInput}
                  onChange={(e) =>
                    setRateInput(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-black text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
                />
              </div>
            </div>

            {/* Price Hike / Reduction Live Trend Banner */}
            {selectedProduct && Number(rateInput) > 0 && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  costDiff > 0
                    ? 'bg-rose-50 border-rose-200/80 text-rose-900'
                    : costDiff < 0
                    ? 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
                    : 'bg-blue-50 border-blue-200/80 text-blue-900'
                }`}
              >
                <div>
                  <div className="font-extrabold flex items-center gap-1">
                    {costDiff > 0 ? (
                      <>
                        <TrendingUp size={15} className="text-rose-600" />
                        <span>PRICE HIKE (+{percentageChange}%)</span>
                      </>
                    ) : costDiff < 0 ? (
                      <>
                        <TrendingDown size={15} className="text-emerald-600" />
                        <span>PRICE REDUCED ({percentageChange}%)</span>
                      </>
                    ) : (
                      <>
                        <Minus size={15} className="text-blue-600" />
                        <span>PRICE UNCHANGED</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    Previous Cost: {formatCurrency(lastPurchaseCost)}/{selectedProduct.unit} → New Rate:{' '}
                    {formatCurrency(finalCostPerProductUnit)}/{selectedProduct.unit}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-xs">
                    {costDiff > 0 ? `+${formatCurrency(costDiff)}` : formatCurrency(costDiff)}
                  </span>
                </div>
              </div>
            )}

            {/* Auto Stock Replenishment Summary */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1">
                  <Boxes size={14} className="text-emerald-600" />
                  Auto-Replenish Stock:
                </span>
                <span className="text-emerald-800 font-extrabold">
                  {selectedProduct?.currentStock || 0} + {finalQty} = {expectedNewStock}{' '}
                  {selectedProduct?.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Total Cost Banner */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 text-white flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Total Purchase Bill:</span>
            <span className="text-lg font-black tracking-tight text-emerald-400">
              {formatCurrency(totalCost)}
            </span>
          </div>

          {/* Payment Status & Partner Wallet */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Payment Status
              </label>
              <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
                {(['Paid', 'Unpaid'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentStatus(st)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      paymentStatus === st
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'text-zinc-600'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {paymentStatus === 'Paid' && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Paid From Wallet
                </label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-800 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Notes / Bill No.
              </label>
              <input
                type="text"
                placeholder="Optional invoice note"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-800 outline-hidden"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSavePurchase}
              className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl transition-transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check size={16} />
              <span>
                {isSubmitting
                  ? 'Recording Purchase & Updating Cost...'
                  : 'SAVE PURCHASE & REPLENISH STOCK'}
              </span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {successInfo && (
        <SuccessSheet
          isOpen={!!successInfo}
          onClose={() => setSuccessInfo(null)}
          title="Stock Inward & Cost Updated"
          referenceCode={successInfo.item}
          amount={successInfo.amount}
          subtitle={`Supplier: ${successInfo.supplier} • Updated Stock: ${successInfo.newStock}`}
        />
      )}
    </>
  );
};
