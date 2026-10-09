import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from './BottomSheet';
import { updateTransactionRecord, deleteSale } from '../../services/db';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Receipt,
  Calendar,
  Wallet,
  User,
  Tag,
  FileText,
  Edit2,
  Check,
  X,
  CreditCard,
  Building2,
  Info,
  Clock,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ActivityItem } from '../../types';

export const TransactionDetailModal: React.FC = () => {
  const {
    selectedActivityItem,
    setSelectedActivityItem,
    wallets,
    formatCurrency,
    formatDate,
    setSelectedSaleId,
  } = useData();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State for editing
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editWalletId, setEditWalletId] = useState<string>('');
  const [editWalletName, setEditWalletName] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editVendorName, setEditVendorName] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('');

  useEffect(() => {
    if (selectedActivityItem) {
      setIsEditing(false);
      setSaveSuccess(false);
      setShowConfirmDelete(false);
      setDeleteError(null);

      setEditAmount(String(selectedActivityItem.amount || 0));
      // Raw ISO date string format YYYY-MM-DD
      const initialDate = selectedActivityItem.rawDate
        ? selectedActivityItem.rawDate.substring(0, 10)
        : new Date().toISOString().substring(0, 10);
      setEditDate(initialDate);

      const foundWallet = wallets.find(
        (w) =>
          w.id === selectedActivityItem.walletId ||
          w.name.toLowerCase() === (selectedActivityItem.walletName || '').toLowerCase()
      );
      setEditWalletId(foundWallet?.id || wallets[0]?.id || '');
      setEditWalletName(foundWallet?.name || selectedActivityItem.walletName || wallets[0]?.name || '');

      setEditNotes(selectedActivityItem.notes || selectedActivityItem.subtitle || '');
      setEditCustomerName(selectedActivityItem.customerName || '');
      setEditVendorName(selectedActivityItem.vendorName || '');
      setEditCategory(selectedActivityItem.category || '');
      setEditPaymentMethod(selectedActivityItem.paymentMethod || 'Cash');
      setEditPaymentStatus(selectedActivityItem.paymentStatus || 'Paid');
    }
  }, [selectedActivityItem, wallets]);

  const handleDeleteSale = async () => {
    if (!selectedActivityItem || selectedActivityItem.type !== 'sale') return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteSale(selectedActivityItem.id, user?.email || 'sanzaritourism@gmail.com');
      setSelectedActivityItem(null);
      setShowConfirmDelete(false);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete sale. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedActivityItem) return null;

  const item = selectedActivityItem;

  const handleWalletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wId = e.target.value;
    const w = wallets.find((wal) => wal.id === wId);
    setEditWalletId(wId);
    if (w) setEditWalletName(w.name);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateTransactionRecord({
        id: item.id,
        type: item.type,
        updates: {
          amount: parseFloat(editAmount) || 0,
          date: editDate,
          walletId: editWalletId,
          walletName: editWalletName,
          notes: editNotes,
          description: editNotes,
          category: editCategory,
          customerName: editCustomerName,
          vendorName: editVendorName,
          paymentMethod: editPaymentMethod as any,
          paymentStatus: editPaymentStatus as any,
        },
        userEmail: user?.email || 'sanzaritourism@gmail.com',
      });

      // Update local view state
      setSelectedActivityItem({
        ...item,
        amount: parseFloat(editAmount) || 0,
        date: formatDate(editDate),
        rawDate: editDate,
        walletName: editWalletName,
        walletId: editWalletId,
        notes: editNotes,
        customerName: editCustomerName || item.customerName,
        vendorName: editVendorName || item.vendorName,
        category: editCategory || item.category,
        paymentMethod: editPaymentMethod || item.paymentMethod,
        paymentStatus: editPaymentStatus || item.paymentStatus,
      });

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update transaction:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeBadge = () => {
    switch (item.type) {
      case 'sale':
        return { label: 'Sale', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'expense':
        return { label: 'Expense', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'payment':
        return { label: 'Payment Received', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'purchase':
        return { label: 'Purchase', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'transfer':
        return { label: 'Account Transfer', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'tourBooking':
        return { label: 'Tour Booking', bg: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'tourExpense':
        return { label: 'Tour Expense', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      default:
        return { label: 'Transaction', bg: 'bg-zinc-100 text-zinc-800 border-zinc-200' };
    }
  };

  const badge = getTypeBadge();

  return (
    <BottomSheet
      isOpen={!!selectedActivityItem}
      onClose={() => {
        setSelectedActivityItem(null);
        setIsEditing(false);
      }}
      title={isEditing ? 'Edit Transaction Details' : 'Transaction Information'}
      subtitle={`ID: ${item.id.slice(0, 10)}...`}
    >
      <div className="space-y-5 pb-6">
        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <Check size={16} />
            <span>Transaction updated successfully!</span>
          </div>
        )}

        {/* Top Summary Card */}
        <div className="p-5 rounded-2xl bg-zinc-950 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.bg}`}>
              {badge.label}
            </span>
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
              <Clock size={12} />
              {item.date}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <p className="text-xs text-zinc-400">Total Amount</p>
              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  item.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {item.isPositive ? '+' : '-'} {formatCurrency(item.amount)}
              </h2>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Details */}
        {!isEditing ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3 text-xs">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={13} />
                <span>Full Details</span>
              </h4>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-200/60">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Title</span>
                  <span className="font-bold text-zinc-900">{item.title}</span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 block">Wallet / Account</span>
                  <span className="font-bold text-zinc-900">{item.walletName || 'Store Account'}</span>
                </div>

                {item.customerName && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Customer</span>
                    <span className="font-bold text-zinc-900">{item.customerName}</span>
                  </div>
                )}

                {item.vendorName && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Vendor</span>
                    <span className="font-bold text-zinc-900">{item.vendorName}</span>
                  </div>
                )}

                {item.category && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Category</span>
                    <span className="font-bold text-zinc-900">{item.category}</span>
                  </div>
                )}

                {item.paymentMethod && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Payment Method</span>
                    <span className="font-bold text-zinc-900">{item.paymentMethod}</span>
                  </div>
                )}

                {item.paymentStatus && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Payment Status</span>
                    <span className="font-bold text-zinc-900">{item.paymentStatus}</span>
                  </div>
                )}

                {item.createdBy && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Transferred / Recorded By</span>
                    <span className="font-bold text-zinc-900">{item.createdBy}</span>
                  </div>
                )}
              </div>

              {/* Notes / Reason */}
              {(item.notes || item.subtitle) && (
                <div className="pt-2 border-t border-zinc-200/60">
                  <span className="text-[10px] text-zinc-500 block font-semibold uppercase">
                    Reason / Description / Notes
                  </span>
                  <p className="text-xs text-zinc-800 font-medium mt-0.5 bg-white p-2.5 rounded-xl border border-zinc-200">
                    {item.notes || item.subtitle}
                  </p>
                </div>
              )}

              {/* Items if Sale */}
              {item.items && item.items.length > 0 && (
                <div className="pt-2 border-t border-zinc-200/60 space-y-1.5">
                  <span className="text-[10px] text-zinc-500 block font-semibold uppercase">
                    Items Purchased ({item.items.length})
                  </span>
                  <div className="space-y-1">
                    {item.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-zinc-100"
                      >
                        <span className="font-semibold text-zinc-900">
                          {it.productName} ({it.quantity} {it.unit})
                        </span>
                        <span className="font-bold text-zinc-900">{formatCurrency(it.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* If Sale, allow opening full Sale Invoice OR deleting sale directly */}
            {item.type === 'sale' && (
              <div className="space-y-2 pt-1">
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
                          This will permanently delete this sale, restore inventory stock, and deduct paid amount from wallet balance.
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedActivityItem(null);
                        setSelectedSaleId(item.id);
                      }}
                      className="py-3 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Receipt size={14} />
                      <span>View Invoice</span>
                    </button>

                    <button
                      onClick={() => setShowConfirmDelete(true)}
                      className="py-3 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      <span>Delete Sale</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Edit Mode Form */
          <div className="space-y-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Edit2 size={14} className="text-zinc-600" />
              <span>Modify Details</span>
            </h4>

            {/* Amount */}
            <div>
              <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                Amount ({item.isPositive ? '+' : '-'})
              </label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-[11px] font-bold text-zinc-700 block mb-1">Transaction Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none"
              />
            </div>

            {/* Wallet / Account */}
            {item.type !== 'transfer' && (
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Payment Account / Wallet
                </label>
                <select
                  value={editWalletId}
                  onChange={handleWalletChange}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Balance: {formatCurrency(w.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Name if applicable */}
            {(item.type === 'sale' || item.type === 'payment' || item.type === 'tourBooking') && (
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none"
                />
              </div>
            )}

            {/* Vendor Name if purchase */}
            {item.type === 'purchase' && (
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">Vendor Name</label>
                <input
                  type="text"
                  value={editVendorName}
                  onChange={(e) => setEditVendorName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none"
                />
              </div>
            )}

            {/* Category if expense */}
            {(item.type === 'expense' || item.type === 'tourExpense') && (
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">Expense Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="e.g. Courier, Advertising, Salary"
                  className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none"
                />
              </div>
            )}

            {/* Notes / Reason */}
            <div>
              <label className="text-[11px] font-bold text-zinc-700 block mb-1">Reason / Description / Notes</label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Enter details or reason..."
                className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none resize-none"
              />
            </div>

            {/* Form Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-2.5 px-4 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
