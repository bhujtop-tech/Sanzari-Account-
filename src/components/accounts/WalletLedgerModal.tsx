import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { BottomSheet } from '../common/BottomSheet';
import { Wallet } from '../../types';
import { buildTourWalletLedger } from '../../utils/tourWalletLedger';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Pencil,
  Trash2,
} from 'lucide-react';

export const WalletLedgerModal: React.FC = () => {
  const {
    selectedWalletId,
    setSelectedWalletId,
    wallets,
    dryfruitWallets,
    tourWallets,
    sales,
    payments,
    expenses,
    transfers,
    purchases,
    tourBookings,
    tourExpenses,
    formatCurrency,
    formatDate,
    setSelectedSaleId,
    setIsAddExpenseOpen,
    setIsAddTourExpenseOpen,
    setEditingTourExpense,
    openEditTourExpenseModal,
    deleteTourExpenseById,
  } = useData();

  const [confirmDeleteExpId, setConfirmDeleteExpId] = useState<string | null>(null);

  const allWallets = useMemo(() => {
    const map = new Map<string, Wallet>();
    wallets.forEach((w) => map.set(w.id, w));
    dryfruitWallets.forEach((w) => map.set(w.id, w));
    tourWallets.forEach((w) => map.set(w.id, w));
    return Array.from(map.values());
  }, [wallets, dryfruitWallets, tourWallets]);

  const wallet = allWallets.find((w) => w.id === selectedWalletId);

  const isTourWallet = useMemo(() => {
    if (!wallet) return false;
    if (wallet.scope === 'tourism') return true;
    if (wallet.scope === 'dryfruit') return false;
    const n = (wallet.name || '').toLowerCase();
    return n.includes('(tour)') || n.includes('bus') || tourWallets.some((tw) => tw.id === wallet.id);
  }, [wallet, tourWallets]);

  // Compile full ledger for this wallet
  const ledgerItems = useMemo(() => {
    if (!selectedWalletId || !wallet) return [];

    // For Tour Wallets (Sahil (Tour), Rizwan (Tour), Bus (Tour)), use unified tourWalletLedger
    // which includes BOTH initial booking advances AND all +Receive installments in paymentHistory
    if (isTourWallet) {
      const tourLedger = buildTourWalletLedger({
        wallet,
        tourBookings,
        tourExpenses,
        transfers,
        formatDate,
      });
      return tourLedger.items;
    }

    const list: Array<{
      id: string;
      date: string;
      rawDate: string;
      type:
        | 'sale'
        | 'payment'
        | 'expense'
        | 'transfer_in'
        | 'transfer_out'
        | 'purchase'
        | 'tour_booking'
        | 'tour_payment'
        | 'tour_expense';
      title: string;
      subtitle: string;
      amount: number;
      isPositive: boolean;
      isCrossAccount?: boolean;
      bookingWalletName?: string;
      paymentMode?: string;
      refId?: string;
    }> = [];

    const matchesWallet = (wId?: string, wName?: string, salesPerson?: string) => {
      if (wId && (wId === selectedWalletId || (wallet && wId === wallet.id))) return true;
      if (wName && wallet?.name && wName.toLowerCase().trim() === wallet.name.toLowerCase().trim()) return true;
      if (salesPerson && wallet?.partnerKey && salesPerson.toLowerCase().trim() === wallet.partnerKey.toLowerCase().trim()) return true;
      if (salesPerson && wallet?.name && salesPerson.toLowerCase().trim() === wallet.name.toLowerCase().trim()) return true;
      return false;
    };

    // Dry Fruit Store Ledger
    // Sales paid into this wallet
    sales.forEach((s) => {
      if (matchesWallet(s.walletId, s.walletName, s.salesPerson) && s.paidAmount > 0) {
        list.push({
          id: `sale-${s.id}`,
          date: formatDate(s.date),
          rawDate: s.date || s.createdAt || '',
          type: 'sale',
          title: `Sale • ${s.saleNumber}`,
          subtitle: s.customerName || 'Customer',
          amount: s.paidAmount,
          isPositive: true,
          refId: s.id,
        });
      }
    });

    // Payments received in this wallet
    payments.forEach((p) => {
      if (matchesWallet(p.walletId) && !p.notes?.includes('Payment for SALE-')) {
        list.push({
          id: `pay-${p.id}`,
          date: formatDate(p.date),
          rawDate: p.date || p.createdAt || '',
          type: 'payment',
          title: 'Payment Received',
          subtitle: p.customerName || 'Customer',
          amount: p.amount,
          isPositive: true,
        });
      }
    });

    // Expenses paid from this wallet
    expenses.forEach((e) => {
      if (matchesWallet(e.walletId, e.walletName)) {
        list.push({
          id: `exp-${e.id}`,
          date: formatDate(e.date),
          rawDate: e.date || e.createdAt || '',
          type: 'expense',
          title: `Expense • ${e.category}`,
          subtitle: e.description || e.category,
          amount: e.amount,
          isPositive: false,
        });
      }
    });

    // Purchases
    purchases.forEach((p) => {
      if (matchesWallet(p.walletId, p.walletName) && p.paymentStatus === 'Paid') {
        list.push({
          id: `pur-${p.id}`,
          date: formatDate(p.date),
          rawDate: p.date || p.createdAt || '',
          type: 'purchase',
          title: `Purchase • ${p.productName}`,
          subtitle: p.vendorName || 'Vendor',
          amount: p.totalCost,
          isPositive: false,
        });
      }
    });

    // Transfers In / Out
    transfers.forEach((t) => {
      if (matchesWallet(t.toWalletId, t.toWalletName)) {
        const reasonStr = t.notes ? `Reason: ${t.notes}` : 'Reason: Internal Transfer';
        const byStr = t.createdBy || t.userEmail ? ` • By: ${t.createdBy || t.userEmail}` : '';
        list.push({
          id: `tf-in-${t.id}`,
          date: formatDate(t.date),
          rawDate: t.date || t.createdAt || '',
          type: 'transfer_in',
          title: `Received from ${t.fromWalletName}`,
          subtitle: `${reasonStr}${byStr}`,
          amount: t.amount,
          isPositive: true,
        });
      }
      if (matchesWallet(t.fromWalletId, t.fromWalletName)) {
        const reasonStr = t.notes ? `Reason: ${t.notes}` : 'Reason: Internal Transfer';
        const byStr = t.createdBy || t.userEmail ? ` • By: ${t.createdBy || t.userEmail}` : '';
        list.push({
          id: `tf-out-${t.id}`,
          date: formatDate(t.date),
          rawDate: t.date || t.createdAt || '',
          type: 'transfer_out',
          title: `Transferred to ${t.toWalletName}`,
          subtitle: `${reasonStr}${byStr}`,
          amount: t.amount,
          isPositive: false,
        });
      }
    });

    return list.sort((a, b) => (b.rawDate > a.rawDate ? 1 : b.rawDate < a.rawDate ? -1 : 0));
  }, [
    selectedWalletId,
    wallet,
    isTourWallet,
    sales,
    payments,
    expenses,
    transfers,
    purchases,
    tourBookings,
    tourExpenses,
    formatDate,
  ]);

  const moneyIn = useMemo(() => {
    return ledgerItems
      .filter((i) => i.isPositive)
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [ledgerItems]);

  const moneyOut = useMemo(() => {
    return ledgerItems
      .filter((i) => !i.isPositive)
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [ledgerItems]);

  if (!wallet) return null;

  const displayBalance = isTourWallet
    ? Number(wallet.openingBalance || 0) + moneyIn - moneyOut
    : Number(wallet.currentBalance || 0);

  return (
    <BottomSheet
      isOpen={!!selectedWalletId}
      onClose={() => setSelectedWalletId(null)}
      title={`${wallet.name}'s Wallet Ledger`}
      subtitle="Complete chronological statement"
    >
      <div className="space-y-5 pb-6">
        {/* Wallet Balance Summary Card */}
        <div className="p-5 rounded-3xl bg-zinc-950 text-white shadow-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Current Available Balance
          </span>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            {formatCurrency(displayBalance)}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-800 text-center">
            <div>
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">Opening</span>
              <p className="text-xs font-bold text-zinc-200 mt-0.5">
                {formatCurrency(wallet.openingBalance)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">Money In</span>
              <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                +{formatCurrency(moneyIn)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 font-semibold uppercase">Money Out</span>
              <p className="text-xs font-extrabold text-rose-400 mt-0.5">
                -{formatCurrency(moneyOut)}
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Entries List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Statement Records ({ledgerItems.length})
            </h4>
            <button
              type="button"
              onClick={() => {
                setSelectedWalletId(null);
                if (isTourWallet) {
                  setEditingTourExpense(null);
                  setIsAddTourExpenseOpen(true);
                } else {
                  setIsAddExpenseOpen(true);
                }
              }}
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black shadow-2xs cursor-pointer transition-colors"
            >
              + Add Expense
            </button>
          </div>

          {ledgerItems.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-xs text-zinc-500">
              No transactions recorded for this wallet yet.
            </div>
          ) : (
            <div className="space-y-2">
              {ledgerItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.refId && item.type === 'sale') {
                      setSelectedSaleId(item.refId);
                    }
                  }}
                  className={`p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between transition-all ${
                    item.refId && item.type === 'sale' ? 'hover:border-zinc-300 cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        item.isPositive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {item.isPositive ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="text-xs font-bold text-zinc-900">{item.title}</h5>
                        {item.isCrossAccount && item.bookingWalletName && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-black">
                            <ArrowRightLeft size={9} />
                            {item.bookingWalletName.replace(' (Tour)', '')} ➔ {wallet.name.replace(' (Tour)', '')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {item.subtitle} • {item.date}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div
                      className={`text-xs font-extrabold tracking-tight ${
                        item.isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {item.isPositive ? '+' : '-'}
                      {formatCurrency(item.amount)}
                    </div>
                    <span className="text-[10px] text-zinc-600 capitalize">
                      {item.type === 'tour_payment'
                        ? 'Payment Received'
                        : item.type.replace('_', ' ')}
                    </span>

                    {item.type === 'tour_expense' && item.refId && (
                      <div
                        className="flex items-center gap-1 pt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const exp = tourExpenses.find((te) => te.id === item.refId);
                            if (exp) {
                              setSelectedWalletId(null);
                              openEditTourExpenseModal(exp);
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-zinc-950 border border-amber-400 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                          title="Edit Expense"
                        >
                          <Pencil size={10} />
                          <span>Edit</span>
                        </button>

                        {confirmDeleteExpId === item.refId ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteTourExpenseById(item.refId!);
                              setConfirmDeleteExpId(null);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteExpId(item.refId!)}
                            className="p-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
