import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { Printer, Share2, CheckCircle2, Clock, XCircle, Store, User } from 'lucide-react';
import { updateDoc, doc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export const SaleDetailModal: React.FC = () => {
  const {
    selectedSaleId,
    setSelectedSaleId,
    sales,
    settings,
    formatCurrency,
    formatDate,
    setSelectedCustomerId,
  } = useData();
  const { user } = useAuth();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sale = sales.find((s) => s.id === selectedSaleId);

  if (!sale) return null;

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleSaveNotesCorrection = async () => {
    if (!sale) return;
    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'sales', sale.id), {
        notes: editedNotes,
        updatedAt: new Date().toISOString(),
      });

      // Audit log
      await addDoc(collection(db, 'auditLogs'), {
        userEmail: user?.email || 'sanzaritourism@gmail.com',
        action: 'UPDATE_SALE_NOTES',
        recordType: 'sale',
        recordId: sale.id,
        oldValue: sale.notes || '',
        newValue: editedNotes,
        timestamp: new Date().toISOString(),
      });

      setIsEditingNotes(false);
    } catch (err) {
      console.error('Failed to update sale notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={!!selectedSaleId}
      onClose={() => setSelectedSaleId(null)}
      title="Sale Invoice"
      subtitle={sale.saleNumber}
    >
      <div className="space-y-5 pb-6">
        {/* Printable Receipt Preview Card */}
        <div id="printable-receipt" className="p-5 rounded-3xl bg-zinc-50 border border-zinc-200 text-zinc-900 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-zinc-950">
                {settings.businessName || 'Sanzari Store'}
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">Invoice: {sale.saleNumber}</p>
            </div>
            <div className="text-right">
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  sale.paymentStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : sale.paymentStatus === 'Partial'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {sale.paymentStatus}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1">{formatDate(sale.date)}</p>
            </div>
          </div>

          {/* Customer & Sales Person Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Customer</span>
              <p className="font-bold text-zinc-900">{sale.customerName}</p>
              <p className="text-zinc-500 font-mono">{sale.customerPhone}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Handled By</span>
              <p className="font-bold text-zinc-900">{sale.salesPerson}</p>
              <p className="text-zinc-500">Wallet: {sale.walletName}</p>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-2">
              Purchased Items
            </span>
            <div className="space-y-2">
              {sale.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 last:border-0">
                  <div>
                    <span className="font-bold text-zinc-900">{item.productName}</span>
                    <span className="text-[11px] text-zinc-500 block">
                      {item.quantity} {item.unit} @ {formatCurrency(item.sellingPrice)}
                    </span>
                  </div>
                  <span className="font-bold text-zinc-900">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="border-t border-zinc-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-zinc-950 pt-1 border-t border-zinc-200">
              <span>Total Amount</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>

            <div className="flex justify-between text-xs font-bold text-emerald-700 pt-1">
              <span>Paid ({sale.paymentMethod})</span>
              <span>{formatCurrency(sale.paidAmount)}</span>
            </div>

            {sale.pendingAmount > 0 && (
              <div className="flex justify-between text-xs font-bold text-amber-700">
                <span>Pending Balance Due</span>
                <span>{formatCurrency(sale.pendingAmount)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="pt-2 border-t border-zinc-200 text-xs text-zinc-600">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Notes:</span>
              <p className="italic">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Actions (Print / View Customer) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (sale.customerId) {
                setSelectedSaleId(null);
                setSelectedCustomerId(sale.customerId);
              }
            }}
            className="py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <User size={14} />
            <span>Customer Profile</span>
          </button>

          <button
            onClick={handlePrintReceipt}
            className="py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
