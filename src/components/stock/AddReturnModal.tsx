import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { SuccessSheet } from '../common/SuccessSheet';
import { recordSalesReturn, getCurrentDateString } from '../../services/db';
import { RotateCcw, User, Package, Wallet as WalletIcon, Check } from 'lucide-react';

export const AddReturnModal: React.FC = () => {
  const {
    isReturnOpen,
    setIsReturnOpen,
    customers,
    products,
    wallets,
    formatCurrency,
  } = useData();
  const { user } = useAuth();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [returnQty, setReturnQty] = useState<number | ''>('');
  const [returnRate, setReturnRate] = useState<number | ''>('');
  const [refundMethod, setRefundMethod] = useState<'DeductPending' | 'WalletRefund'>('DeductPending');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [date, setDate] = useState(getCurrentDateString());
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    item: string;
    amount: string;
    customerName: string;
  } | null>(null);

  useEffect(() => {
    if (isReturnOpen) {
      if (customers.length > 0) setSelectedCustomerId(customers[0].id);
      if (products.length > 0) {
        setSelectedProductId(products[0].id);
        setReturnRate(products[0].sellingPrice || 0);
      }
      if (wallets.length > 0) setSelectedWalletId(wallets[0].id);
      setReturnQty('');
      setRefundMethod('DeductPending');
      setDate(getCurrentDateString());
      setNotes('');
      setFormError(null);
    }
  }, [isReturnOpen, customers, products, wallets]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find((prod) => prod.id === prodId);
    if (p) {
      setReturnRate(p.sellingPrice || 0);
    }
  };

  const totalAmount = (Number(returnQty) || 0) * (Number(returnRate) || 0);

  const handleSaveReturn = async () => {
    try {
      setFormError(null);

      if (!selectedCustomer) {
        setFormError('Please select a customer');
        return;
      }
      if (!selectedProduct) {
        setFormError('Please select a product');
        return;
      }
      if (!returnQty || Number(returnQty) <= 0) {
        setFormError('Please enter valid return quantity');
        return;
      }

      const activeWallet = wallets.find((w) => w.id === selectedWalletId);

      setIsSubmitting(true);

      await recordSalesReturn({
        salesReturn: {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: Number(returnQty),
          unit: selectedProduct.unit,
          rate: Number(returnRate) || 0,
          totalAmount,
          refundMethod,
          walletId: refundMethod === 'WalletRefund' && activeWallet ? activeWallet.id : undefined,
          walletName: refundMethod === 'WalletRefund' && activeWallet ? activeWallet.name : undefined,
          date,
          notes: notes.trim() || 'Customer product return',
        },
        userEmail: user?.email || 'sanzaritourism@gmail.com',
      });

      setIsReturnOpen(false);
      setSuccessInfo({
        item: `+${returnQty} ${selectedProduct.unit} ${selectedProduct.name}`,
        amount: formatCurrency(totalAmount),
        customerName: selectedCustomer.name,
      });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to record sales return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        title="Customer Sales / Stock Return"
        subtitle="Accept returned goods back into inventory & adjust dues or refund"
      >
        <div className="space-y-4 pb-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {formError}
            </div>
          )}

          {/* Customer Selection */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
            <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <User size={15} className="text-blue-600" />
              <span>Select Customer *</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) — Pending Due: {formatCurrency(c.pendingBalance)}
                </option>
              ))}
            </select>
          </div>

          {/* Product & Return Quantity */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
            <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Package size={15} className="text-emerald-600" />
              <span>Select Returned Product *</span>
            </label>

            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit}) — Current Stock: {p.currentStock} {p.unit}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Returned Quantity ({selectedProduct?.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1"
                  value={returnQty}
                  onChange={(e) =>
                    setReturnQty(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-black text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Return Rate (₹/{selectedProduct?.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Rate"
                  value={returnRate}
                  onChange={(e) =>
                    setReturnRate(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-black text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
                />
              </div>
            </div>

            {/* Total Return Value Banner */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between font-bold">
              <span>Total Return Value:</span>
              <span className="text-sm font-black text-amber-900">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Refund Settlement Action */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw size={15} className="text-amber-600" />
              <span>Refund Settlement Method</span>
            </label>

            <div className="space-y-2 pt-1">
              <label
                onClick={() => setRefundMethod('DeductPending')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  refundMethod === 'DeductPending'
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                    : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <input
                  type="radio"
                  name="refundMethod"
                  checked={refundMethod === 'DeductPending'}
                  onChange={() => setRefundMethod('DeductPending')}
                  className="mt-0.5"
                />
                <div>
                  <span>Deduct From Customer Pending Udhari</span>
                  <p className="text-[10px] font-normal opacity-80 mt-0.5">
                    Reduces customer's outstanding due balance by {formatCurrency(totalAmount)}
                  </p>
                </div>
              </label>

              <label
                onClick={() => setRefundMethod('WalletRefund')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  refundMethod === 'WalletRefund'
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                    : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <input
                  type="radio"
                  name="refundMethod"
                  checked={refundMethod === 'WalletRefund'}
                  onChange={() => setRefundMethod('WalletRefund')}
                  className="mt-0.5"
                />
                <div>
                  <span>Refund Cash / UPI From Wallet</span>
                  <p className="text-[10px] font-normal opacity-80 mt-0.5">
                    Refunds cash directly to customer from selected partner wallet
                  </p>
                </div>
              </label>
            </div>

            {refundMethod === 'WalletRefund' && (
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                  Select Refund Wallet
                </label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-900 outline-hidden"
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

          {/* Date & Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                Return Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                placeholder="Reason for return"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs outline-hidden"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveReturn}
            className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl transition-transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={16} />
            <span>
              {isSubmitting
                ? 'Processing Stock Return...'
                : 'RECORD RETURN & ADD BACK TO STOCK'}
            </span>
          </button>
        </div>
      </BottomSheet>

      {successInfo && (
        <SuccessSheet
          isOpen={!!successInfo}
          onClose={() => setSuccessInfo(null)}
          title="Stock Returned & Restocked"
          referenceCode={successInfo.item}
          amount={successInfo.amount}
          subtitle={`Customer: ${successInfo.customerName} • Returned quantity added back to inventory.`}
        />
      )}
    </>
  );
};
