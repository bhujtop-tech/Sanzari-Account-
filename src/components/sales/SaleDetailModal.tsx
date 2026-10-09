import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { Printer, Share2, CheckCircle2, Clock, XCircle, Store, User, Trash2, AlertTriangle } from 'lucide-react';
import { updateDoc, doc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { deleteSale } from '../../services/db';

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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sale = sales.find((s) => s.id === selectedSaleId);

  if (!sale) return null;

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleDeleteSale = async () => {
    if (!sale) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteSale(sale.id, user?.email || 'sanzaritourism@gmail.com');
      setSelectedSaleId(null);
      setShowConfirmDelete(false);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete sale. Please try again.');
    } finally {
      setIsDeleting(false);
    }
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

        {/* Actions (Print / View Customer / Delete Sale) */}
        <div className="space-y-2.5">
          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {deleteError}
            </div>
          )}

          {showConfirmDelete ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-950">Delete Sale Record?</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                    This will permanently remove <strong>{sale.saleNumber}</strong>, restore product inventory stock, and deduct paid amount from wallet balance.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-rose-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSale}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Sale'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
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

              <button
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Sale Invoice</span>
              </button>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
