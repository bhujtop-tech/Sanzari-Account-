import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BottomSheet } from '../common/BottomSheet';
import {
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  Wallet,
} from 'lucide-react';

export const WalletLedgerModal: React.FC = () => {
  const {
    selectedWalletId,
    setSelectedWalletId,
    wallets,
    sales,
    payments,
    expenses,
    transfers,
    purchases,
    formatCurrency,
    formatDate,
    setSelectedSaleId,
  } = useData();

  const wallet = wallets.find((w) => w.id === selectedWalletId);

  // Compile full ledger for this wallet
  const ledgerItems = useMemo(() => {
    if (!selectedWalletId) return [];

    const list: Array<{
      id: string;
      date: string;
      rawDate: string;
      type: 'sale' | 'payment' | 'expense' | 'transfer_in' | 'transfer_out' | 'purchase';
      title: string;
      subtitle: string;
      amount: number;
      isPositive: boolean;
      refId?: string;
    }> = [];

    // Sales paid into this wallet
    sales.forEach((s) => {
      if (s.walletId === selectedWalletId && s.paidAmount > 0) {
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

    // Payments received in this wallet (excluding sale direct payments if logged separately)
    payments.forEach((p) => {
      if (p.walletId === selectedWalletId && !p.notes?.includes('Payment for SALE-')) {
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
      if (e.walletId === selectedWalletId) {
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

    // Transfers In
    transfers.forEach((t) => {
      if (t.toWalletId === selectedWalletId) {
        list.push({
          id: `tf-in-${t.id}`,
          date: formatDate(t.date),
          rawDate: t.date || t.createdAt || '',
          type: 'transfer_in',
          title: `Transfer from ${t.fromWalletName}`,
          subtitle: t.notes || 'Internal Transfer',
          amount: t.amount,
          isPositive: true,
        });
      }
      if (t.fromWalletId === selectedWalletId) {
        list.push({
          id: `tf-out-${t.id}`,
          date: formatDate(t.date),
          rawDate: t.date || t.createdAt || '',
          type: 'transfer_out',
          title: `Transfer to ${t.toWalletName}`,
          subtitle: t.notes || 'Internal Transfer',
          amount: t.amount,
          isPositive: false,
        });
      }
    });

    // Purchases paid from this wallet
    purchases.forEach((pur) => {
      if (pur.walletId === selectedWalletId && pur.paymentStatus === 'Paid') {
        list.push({
          id: `pur-${pur.id}`,
          date: formatDate(pur.date),
          rawDate: pur.date || pur.createdAt || '',
          type: 'purchase',
          title: `Purchase • ${pur.productName}`,
          subtitle: pur.vendorName,
          amount: pur.totalCost,
          isPositive: false,
        });
      }
    });

    return list.sort((a, b) => (b.rawDate > a.rawDate ? 1 : b.rawDate < a.rawDate ? -1 : 0));
  }, [selectedWalletId, sales, payments, expenses, transfers, purchases]);

  const moneyIn = useMemo(() => {
    return ledgerItems
      .filter((i) => i.isPositive)
      .reduce((sum, i) => sum + i.amount, 0);
  }, [ledgerItems]);

  const moneyOut = useMemo(() => {
    return ledgerItems
      .filter((i) => !i.isPositive)
      .reduce((sum, i) => sum + i.amount, 0);
  }, [ledgerItems]);

  if (!wallet) return null;

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
            {formatCurrency(wallet.currentBalance)}
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
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5">
            Statement Records ({ledgerItems.length})
          </h4>

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
                    item.refId ? 'hover:border-zinc-300 cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        item.isPositive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {item.isPositive ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-zinc-900">{item.title}</h5>
                      <p className="text-[11px] text-zinc-500">
                        {item.subtitle} • {item.date}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-extrabold tracking-tight ${
                        item.isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {item.isPositive ? '+' : '-'}
                      {formatCurrency(item.amount)}
                    </div>
                    <span className="text-[10px] text-zinc-600 capitalize">{item.type.replace('_', ' ')}</span>
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
