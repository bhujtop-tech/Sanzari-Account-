import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { SuccessSheet } from '../common/SuccessSheet';
import { Customer, PaymentMethod } from '../../types';
import { createPayment, getCurrentDateString } from '../../services/db';
import { Search, UserCheck } from 'lucide-react';

export const AddPaymentModal: React.FC = () => {
  const {
    isAddPaymentOpen,
    setIsAddPaymentOpen,
    businessMode,
    customers,
    wallets,
    dryfruitWallets,
    tourWallets,
    formatCurrency,
    prefilledCustomerIdForPayment,
    setPrefilledCustomerIdForPayment,
  } = useData();
  const { user } = useAuth();

  const activeWallets = businessMode === 'tourism' ? tourWallets : dryfruitWallets.length > 0 ? dryfruitWallets : wallets;

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getCurrentDateString());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ amount: string; customer: string } | null>(null);

  useEffect(() => {
    if (isAddPaymentOpen) {
      setCustomerSearch('');
      setAmount('');
      setPaymentMethod('UPI');
      setNotes('');
      setDate(getCurrentDateString());
      setFormError(null);

      if (activeWallets.length > 0) {
        setSelectedWalletId(activeWallets[0].id);
      }

      if (prefilledCustomerIdForPayment) {
        const found = customers.find((c) => c.id === prefilledCustomerIdForPayment);
        if (found) {
          setSelectedCustomer(found);
          setAmount(found.pendingBalance > 0 ? found.pendingBalance : '');
        }
      } else {
        // Pick first customer with pending balance if any
        const withPending = customers.find((c) => c.pendingBalance > 0);
        if (withPending) {
          setSelectedCustomer(withPending);
          setAmount(withPending.pendingBalance);
        } else if (customers.length > 0) {
          setSelectedCustomer(customers[0]);
        }
      }
    }
  }, [isAddPaymentOpen, prefilledCustomerIdForPayment, customers, wallets]);

  const filteredCustomers = customerSearch.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      )
    : [];

  const handleSavePayment = async () => {
    try {
      setFormError(null);

      if (!selectedCustomer) {
        setFormError('Please select a customer');
        return;
      }

      const parsedAmount = Number(amount);
      if (!parsedAmount || parsedAmount <= 0) {
        setFormError('Please enter a valid payment amount');
        return;
      }

      const activeWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];
      if (!activeWallet) {
        setFormError('Please select a receiving wallet');
        return;
      }

      setIsSubmitting(true);

      await createPayment({
        payment: {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          walletId: activeWallet.id,
          walletName: activeWallet.name,
          amount: parsedAmount,
          paymentMethod,
          date,
          notes: notes.trim() || `Customer dues settlement`,
        },
        userEmail: user?.email || 'sanzaritourism@gmail.com',
      });

      setIsAddPaymentOpen(false);
      setPrefilledCustomerIdForPayment(undefined);
      setSuccessInfo({
        amount: formatCurrency(parsedAmount),
        customer: selectedCustomer.name,
      });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isAddPaymentOpen}
        onClose={() => {
          setIsAddPaymentOpen(false);
          setPrefilledCustomerIdForPayment(undefined);
        }}
        title="Receive Payment"
        subtitle="Collect pending dues from customer"
      >
        <div className="space-y-4 pb-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Customer *
            </label>

            {!selectedCustomer ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-medium outline-hidden"
                  />
                </div>

                {filteredCustomers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setAmount(c.pendingBalance > 0 ? c.pendingBalance : '');
                          setCustomerSearch('');
                        }}
                        className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-zinc-50 cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{c.name}</p>
                          <p className="text-[11px] text-zinc-500">{c.phone}</p>
                        </div>
                        <span className="text-xs font-extrabold text-amber-600">
                          Due: {formatCurrency(c.pendingBalance)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <UserCheck size={14} className="text-emerald-600" />
                      {selectedCustomer.name}
                    </h4>
                    <p className="text-[11px] text-zinc-500">{selectedCustomer.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded-lg hover:bg-zinc-200 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-900">Current Outstanding Due:</span>
                  <span className="font-black text-amber-900">
                    {formatCurrency(selectedCustomer.pendingBalance)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Amount to receive */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Enter Payment Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-zinc-400 font-bold text-base">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-lg font-black text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
              />
            </div>
            {selectedCustomer && Number(amount) > 0 && (
              <p className="text-[11px] text-zinc-500 mt-1">
                Remaining due after payment: {formatCurrency(Math.max(0, selectedCustomer.pendingBalance - Number(amount)))}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Payment Method *
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['UPI', 'Cash', 'Bank', 'Other'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === mode
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Received In Wallet */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Received In Wallet *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {activeWallets.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWalletId(w.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedWalletId === w.id
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  <p className="text-xs font-bold">{w.name}</p>
                  <p
                    className={`text-[10px] mt-0.5 truncate ${
                      selectedWalletId === w.id ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {formatCurrency(w.currentBalance)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-zinc-500 font-medium">Payment Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 font-medium outline-hidden"
            />
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSavePayment}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl shadow-lg transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Recording Payment...' : 'SAVE PAYMENT'}
            </button>
          </div>
        </div>
      </BottomSheet>

      {successInfo && (
        <SuccessSheet
          isOpen={!!successInfo}
          onClose={() => setSuccessInfo(null)}
          title="Payment Received"
          referenceCode={successInfo.customer}
          amount={successInfo.amount}
          subtitle="Wallet balance increased & customer pending due settled."
        />
      )}
    </>
  );
};
