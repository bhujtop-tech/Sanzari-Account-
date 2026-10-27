import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { SuccessSheet } from '../common/SuccessSheet';
import { SaleItem, PaymentStatus, PaymentMethod } from '../../types';
import { createSale, getCurrentDateString } from '../../services/db';
import { ProductSearchSelector } from '../common/ProductSearchSelector';
import { Plus, Trash2, Search, UserPlus, Check, ChevronDown, Package } from 'lucide-react';

export const AddSaleModal: React.FC = () => {
  const {
    isAddSaleOpen,
    setIsAddSaleOpen,
    customers,
    products,
    wallets,
    dryfruitWallets,
    tourWallets,
    formatCurrency,
  } = useData();
  const { user } = useAuth();

  // Form states
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ id?: string; name: string; phone: string } | null>(null);

  const [salesPerson, setSalesPerson] = useState<'Rizwan' | 'Avesh' | 'Sahil'>('Rizwan');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paidNow, setPaidNow] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(getCurrentDateString());

  // Success Sheet state
  const [savedSaleResult, setSavedSaleResult] = useState<{ number: string; total: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Set default wallet matching salesPerson
  useEffect(() => {
    const list = dryfruitWallets.length > 0 ? dryfruitWallets : wallets;
    if (list.length > 0) {
      const match = list.find((w) => w.partnerKey === salesPerson.toLowerCase() || w.name.toLowerCase().includes(salesPerson.toLowerCase()));
      if (match) setSelectedWalletId(match.id);
      else setSelectedWalletId(list[0].id);
    }
  }, [salesPerson, dryfruitWallets, wallets]);

  const [saleWalletId, setSaleWalletId] = useState<string>(() => {
    const defaultDry = dryfruitWallets[0] || wallets[0];
    return defaultDry?.id || '';
  });
  useEffect(() => {
    if (isAddSaleOpen) {
      setCustomerSearch('');
      setSelectedCustomer(null);
      setDiscount(0);
      setPaidNow(0);
      setPaymentMethod('UPI');
      setNotes('');
      setFormError(null);
      setSaleDate(getCurrentDateString());

      // Start with 1 empty item row ready for search
      setItems([
        {
          productId: '',
          productName: '',
          quantity: 1,
          unit: 'kg',
          sellingPrice: 0,
          purchaseCost: 0,
          lineTotal: 0,
        },
      ]);
    }
  }, [isAddSaleOpen]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const pendingAmount = Math.max(0, total - (Number(paidNow) || 0));

  // Auto-sync paidNow if user hasn't explicitly customized it to a partial amount
  const handleItemChange = (index: number, updated: Partial<SaleItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], ...updated };
      item.lineTotal = (Number(item.quantity) || 0) * (Number(item.sellingPrice) || 0);
      next[index] = item;
      
      const newSub = next.reduce((s, i) => s + (i.lineTotal || 0), 0);
      const newTot = Math.max(0, newSub - discount);
      setPaidNow(newTot);
      return next;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        productName: '',
        quantity: 1,
        unit: 'kg',
        sellingPrice: 0,
        purchaseCost: 0,
        lineTotal: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const newSub = next.reduce((s, i) => s + (i.lineTotal || 0), 0);
      const newTot = Math.max(0, newSub - discount);
      setPaidNow(newTot);
      return next;
    });
  };

  // Determine Payment Status
  const paymentStatus: PaymentStatus =
    paidNow >= total ? 'Paid' : paidNow > 0 ? 'Partial' : 'Pending';

  // Filtered customer search
  const filteredCustomers = customerSearch.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      )
    : [];

  const handleSaveSale = async () => {
    try {
      setFormError(null);

      // Validation
      let custName = '';
      let custPhone = '';
      let custId = '';

      if (selectedCustomer) {
        custName = selectedCustomer.name;
        custPhone = selectedCustomer.phone;
        custId = selectedCustomer.id || '';
      } else if (customerSearch.trim()) {
        custName = customerSearch.trim();
        custPhone = '';
        custId = '';
      } else {
        setFormError('Please select or type a customer name');
        return;
      }

      const validItems = items.filter((item) => item.productId && item.quantity > 0);
      if (validItems.length === 0) {
        setFormError('Please search and select at least one product');
        return;
      }

      const activeWallet =
        wallets.find((w) => w.id === selectedWalletId || w.id === saleWalletId) ||
        dryfruitWallets[0] ||
        wallets[0];
      if (!activeWallet) {
        setFormError('Please configure at least one wallet');
        return;
      }

      setIsSubmitting(true);

      const created = await createSale({
        sale: {
          customerId: custId,
          customerName: custName,
          customerPhone: custPhone,
          salesPerson,
          walletId: activeWallet.id,
          walletName: activeWallet.name,
          date: saleDate,
          subtotal,
          discount: Number(discount) || 0,
          total,
          paidAmount: Number(paidNow) || 0,
          pendingAmount,
          paymentStatus,
          paymentMethod,
          itemCount: validItems.length,
          items: validItems,
          notes,
        },
        userEmail: user?.email || 'sanzaritourism@gmail.com',
      });

      setIsAddSaleOpen(false);
      setSavedSaleResult({
        number: created.saleNumber,
        total: formatCurrency(created.total),
      });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save sale. Please check your data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isAddSaleOpen}
        onClose={() => setIsAddSaleOpen(false)}
        title="Add Sale"
        subtitle="Quick order & payment entry"
        maxHeight="max-h-[94vh]"
      >
        <div className="space-y-5 pb-6">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* 1. CUSTOMER SECTION - SINGLE COMBINED SEARCH & ADD OPTION */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
              Customer
            </label>

            {!selectedCustomer ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search or type customer name/phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-xs font-medium outline-hidden transition-all"
                  />
                </div>

                {/* Single Combined Dropdown for Existing Matches & Direct New Customer Add */}
                {(filteredCustomers.length > 0 || customerSearch.trim().length > 0) && (
                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100">
                    {/* Existing matches */}
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone || '' });
                          setCustomerSearch('');
                        }}
                        className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{c.name}</p>
                          <p className="text-[11px] text-zinc-500">{c.phone || 'No phone'}</p>
                        </div>
                        {c.pendingBalance > 0 && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            Due: {formatCurrency(c.pendingBalance)}
                          </span>
                        )}
                      </button>
                    ))}

                    {/* Inline option to add typed text directly as new customer */}
                    {customerSearch.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer({ name: customerSearch.trim(), phone: '' });
                          setCustomerSearch('');
                        }}
                        className="w-full px-3.5 py-2.5 text-left flex items-center gap-2 hover:bg-emerald-50 text-emerald-700 font-bold text-xs cursor-pointer transition-colors"
                      >
                        <UserPlus size={15} className="shrink-0 text-emerald-600" />
                        <span>Add <strong>"{customerSearch.trim()}"</strong> as new customer</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {selectedCustomer.id ? 'Selected Customer' : 'New Customer'}
                    </span>
                    <h4 className="text-xs font-black text-zinc-900">{selectedCustomer.name}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-2.5 py-1 rounded-lg bg-zinc-200/60 hover:bg-zinc-200 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* Optional phone number input for selected/new customer */}
                <div className="flex items-center gap-2 pt-1.5 border-t border-zinc-200/80">
                  <span className="text-[11px] font-bold text-zinc-500 shrink-0">Phone:</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Phone number (optional)"
                    value={selectedCustomer.phone}
                    onChange={(e) =>
                      setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })
                    }
                    className="w-full px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-medium text-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. SALES PERSON & WALLET (SEGMENTED CONTROLS) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Sales Person
              </label>
              <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60">
                {(['Rizwan', 'Avesh', 'Sahil'] as const).map((person) => (
                  <button
                    key={person}
                    type="button"
                    onClick={() => setSalesPerson(person)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      salesPerson === person
                        ? 'bg-white text-zinc-950 shadow-xs font-bold'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {person}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Wallet
              </label>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-zinc-100 border border-zinc-200/60 text-xs font-semibold text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Bal: {formatCurrency(w.currentBalance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. PRODUCTS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Products
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-bold text-zinc-900 hover:text-black flex items-center gap-1 cursor-pointer bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus size={13} />
                <span>Add Product</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-zinc-50 border border-dashed border-zinc-200 text-xs text-zinc-500">
                No products added. Tap + Add Product above.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const selectedProd = products.find((p) => p.id === item.productId);

                  if (!item.productId) {
                    {/* SEARCH MODE FOR PRODUCT */}
                    return (
                      <div key={idx} className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            Search Product {items.length > 1 ? `#${idx + 1}` : ''}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-xs text-rose-600 font-semibold hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <ProductSearchSelector
                          products={products}
                          formatCurrency={formatCurrency}
                          onSelectProduct={(p) => {
                            handleItemChange(idx, {
                              productId: p.id,
                              productName: p.name,
                              unit: p.unit,
                              sellingPrice: p.sellingPrice,
                              purchaseCost: p.purchaseCost,
                              lineTotal: p.sellingPrice * (item.quantity || 1),
                            });
                          }}
                        />
                      </div>
                    );
                  }

                  {/* SELECTED PRODUCT CARD / DETAIL CARD */}
                  const costPrice = selectedProd?.purchaseCost || 0;
                  const profitMarginPerUnit = item.sellingPrice - costPrice;
                  const isHike = selectedProd?.costTrend === 'hike';
                  const isLow = selectedProd?.costTrend === 'low';

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-200/80">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 font-bold">
                            <Package size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-zinc-900 truncate">{item.productName}</h4>
                              {selectedProd?.category && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-zinc-200 text-zinc-700">
                                  {selectedProd.category}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                              Stock: <span className="font-extrabold text-zinc-800">{selectedProd?.currentStock ?? 0} {item.unit}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleItemChange(idx, { productId: '', productName: '' })}
                            className="text-[11px] font-bold text-zinc-600 hover:text-zinc-900 px-2.5 py-1 rounded-lg bg-zinc-200/60 hover:bg-zinc-200 cursor-pointer transition-colors"
                          >
                            Change
                          </button>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detail Inputs */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold block mb-1">Quantity</span>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={item.quantity || ''}
                            onChange={(e) =>
                              handleItemChange(idx, { quantity: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-extrabold focus:ring-1 focus:ring-zinc-900 outline-hidden"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold block mb-1">Unit</span>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, { unit: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold focus:ring-1 focus:ring-zinc-900 outline-hidden"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold block mb-1">Selling Rate (₹)</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.sellingPrice || ''}
                            onChange={(e) =>
                              handleItemChange(idx, {
                                sellingPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-extrabold focus:ring-1 focus:ring-zinc-900 outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Costing & Profit Margin Indicator */}
                      <div className="p-2 rounded-xl bg-white border border-zinc-200/80 text-[11px] flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                            <span>Cost: {formatCurrency(costPrice)}/{item.unit}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                                profitMarginPerUnit >= 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Margin: {profitMarginPerUnit >= 0 ? '+' : ''}
                              {formatCurrency(profitMarginPerUnit)}/{item.unit}
                            </span>
                          </div>

                          {isHike && (
                            <p className="text-[10px] font-extrabold text-rose-600 flex items-center gap-1">
                              <span>▲ Cost Price Hiked recently</span>
                              {selectedProd?.previousPurchaseCost && (
                                <span className="font-normal text-zinc-500">
                                  ({formatCurrency(selectedProd.previousPurchaseCost)} → {formatCurrency(costPrice)})
                                </span>
                              )}
                            </p>
                          )}

                          {isLow && (
                            <p className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                              <span>▼ Cost Price Reduced recently</span>
                              {selectedProd?.previousPurchaseCost && (
                                <span className="font-normal text-zinc-500">
                                  ({formatCurrency(selectedProd.previousPurchaseCost)} → {formatCurrency(costPrice)})
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="text-right text-xs font-black text-zinc-900">
                          Total: {formatCurrency(item.lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. TOTALS & DISCOUNT */}
          <div className="p-4 rounded-2xl bg-zinc-100/70 border border-zinc-200 space-y-2">
            <div className="flex justify-between text-xs text-zinc-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>Discount</span>
              <div className="flex items-center gap-1">
                <span>₹</span>
                <input
                  type="number"
                  min="0"
                  value={discount === 0 ? '' : discount}
                  placeholder="0"
                  onChange={(e) => {
                    const d = parseFloat(e.target.value) || 0;
                    setDiscount(d);
                    setPaidNow(Math.max(0, subtotal - d));
                  }}
                  className="w-20 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs text-right font-semibold outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-black text-zinc-950">
              <span>Total Bill</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* 5. PAYMENT SECTION */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Payment
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-zinc-500 font-medium">Paid Now (₹)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={paidNow === 0 ? '' : paidNow}
                  placeholder="0"
                  onChange={(e) => setPaidNow(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-extrabold text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
                />
              </div>

              <div>
                <span className="text-[11px] text-zinc-500 font-medium">Payment Mode</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <span className="text-[11px] text-zinc-500 font-medium">Wallet Received In</span>
                <select
                  value={saleWalletId}
                  onChange={(e) => setSaleWalletId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
                >
                  <optgroup label="🛒 Dry Fruit Wallets">
                    {dryfruitWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatCurrency(w.currentBalance)})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🚌 Sanzari Tour Wallets">
                    {tourWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatCurrency(w.currentBalance)})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Payment Status Badges & Auto Pending */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
              <span className="text-zinc-600 font-medium">Payment Status</span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    paymentStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : paymentStatus === 'Partial'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {paymentStatus}
                </span>
                {pendingAmount > 0 && (
                  <span className="font-bold text-amber-700">
                    (Pending: {formatCurrency(pendingAmount)})
                  </span>
                )}
              </div>
            </div>

            {/* Sale Date picker */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Transaction Date</span>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 font-medium outline-hidden"
              />
            </div>
          </div>

          {/* Sticky SAVE SALE Button */}
          <div className="sticky bottom-0 pt-3 bg-white">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveSale}
              className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white text-sm font-bold rounded-2xl shadow-lg transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving Sale...' : `SAVE SALE • ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Success Sheet Confirmation */}
      {savedSaleResult && (
        <SuccessSheet
          isOpen={!!savedSaleResult}
          onClose={() => setSavedSaleResult(null)}
          title="Sale Saved Successfully"
          referenceCode={savedSaleResult.number}
          amount={savedSaleResult.total}
          subtitle="Wallet & inventory balances have been updated automatically."
        />
      )}
    </>
  );
};
