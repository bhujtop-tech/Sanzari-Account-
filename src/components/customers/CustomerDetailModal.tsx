import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BottomSheet } from '../common/BottomSheet';
import { Phone, MapPin, ShoppingBag, Clock, Plus, CheckCircle2, ArrowDownLeft } from 'lucide-react';

export const CustomerDetailModal: React.FC = () => {
  const {
    selectedCustomerId,
    setSelectedCustomerId,
    customers,
    sales,
    payments,
    formatCurrency,
    formatDate,
    setIsAddPaymentOpen,
    setPrefilledCustomerIdForPayment,
    setSelectedSaleId,
  } = useData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  // Filter sales and payments for this customer
  const customerSales = useMemo(() => {
    if (!selectedCustomerId) return [];
    return sales.filter((s) => s.customerId === selectedCustomerId);
  }, [sales, selectedCustomerId]);

  const customerPayments = useMemo(() => {
    if (!selectedCustomerId) return [];
    return payments.filter((p) => p.customerId === selectedCustomerId);
  }, [payments, selectedCustomerId]);

  if (!customer) return null;

  return (
    <BottomSheet
      isOpen={!!selectedCustomerId}
      onClose={() => setSelectedCustomerId(null)}
      title="Customer Profile"
      subtitle={customer.name}
    >
      <div className="space-y-5 pb-6">
        {/* Contact Info Header */}
        <div className="p-4 rounded-3xl bg-zinc-50 border border-zinc-200/80">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-extrabold text-zinc-950">{customer.name}</h3>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                <span className="flex items-center gap-1 font-mono">
                  <Phone size={12} />
                  {customer.phone}
                </span>
                {customer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {customer.city}
                  </span>
                )}
              </div>
            </div>

            {customer.pendingBalance > 0 && (
              <button
                onClick={() => {
                  setPrefilledCustomerIdForPayment(customer.id);
                  setIsAddPaymentOpen(true);
                }}
                className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Receive Due</span>
              </button>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-200/70 text-center">
            <div>
              <span className="text-[10px] text-zinc-600 font-semibold uppercase">Total Orders</span>
              <p className="text-sm font-black text-zinc-900">{customer.totalOrders}</p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-600 font-semibold uppercase">Total Spent</span>
              <p className="text-sm font-black text-zinc-900">{formatCurrency(customer.totalSpent)}</p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-600 font-semibold uppercase">Pending Due</span>
              <p className={`text-sm font-black ${customer.pendingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrency(customer.pendingBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History Tabs */}
        <div>
          <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2.5">
            Order &amp; Payment History
          </h4>

          {customerSales.length === 0 && customerPayments.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-xs text-zinc-600">
              No transactions recorded for this customer yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {customerSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSaleId(sale.id)}
                  className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-800">{sale.saleNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sale.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : sale.paymentStatus === 'Partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </div>
                    <span className="text-xs font-black text-zinc-900">{formatCurrency(sale.total)}</span>
                  </div>

                  <div className="text-[11px] text-zinc-600 flex items-center justify-between">
                    <span>
                      {sale.items?.length || 0} product(s): {sale.items?.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                    </span>
                    <span>{formatDate(sale.date)}</span>
                  </div>
                </div>
              ))}

              {customerPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ArrowDownLeft size={13} />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-950">Payment Settled</p>
                      <p className="text-[10px] text-emerald-700">{p.paymentMethod} • {formatDate(p.date)}</p>
                    </div>
                  </div>
                  <span className="font-black text-emerald-700">+{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
