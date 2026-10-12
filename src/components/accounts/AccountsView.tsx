import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { WalletLedgerModal } from './WalletLedgerModal';
import { TransferModal } from './TransferModal';
import {
  ArrowRightLeft,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Calendar,
  User,
  Plus,
  X,
  Wallet as WalletIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { addWallet } from '../../services/db';

export const AccountsView: React.FC = () => {
  const {
    businessMode,
    wallets,
    dryfruitWallets,
    tourWallets,
    formatCurrency,
    formatDate,
    setSelectedWalletId,
    setIsTransferOpen,
    sales,
    expenses,
    transfers,
  } = useData();

  const isTourism = businessMode === 'tourism';

  const [filterWalletId, setFilterWalletId] = useState<string>('all');
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletOpening, setNewWalletOpening] = useState('');
  const [newWalletScope, setNewWalletScope] = useState<'tourism' | 'dryfruit'>(isTourism ? 'tourism' : 'dryfruit');
  const [newWalletColor, setNewWalletColor] = useState(isTourism ? '#f59e0b' : '#0ea5e9');
  const [isSavingWallet, setIsSavingWallet] = useState(false);

  const currentMonthKey = new Date().toISOString().substring(0, 7);

  // Active wallets strictly based on current mode
  const currentWallets = isTourism ? tourWallets : dryfruitWallets;
  const currentTotal = currentWallets.reduce((s, w) => s + (w.currentBalance || 0), 0);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;
    setIsSavingWallet(true);
    try {
      const openBal = Number(newWalletOpening) || 0;
      const lower = newWalletName.toLowerCase();
      const partnerKey = lower.includes('sahil')
        ? 'sahil'
        : lower.includes('bus')
        ? 'bus'
        : lower.includes('rizwan')
        ? 'rizwan'
        : lower.includes('avesh')
        ? 'avesh'
        : 'other';

      await addWallet({
        name: newWalletName.trim(),
        partnerKey,
        scope: isTourism ? 'tourism' : 'dryfruit',
        openingBalance: openBal,
        currentBalance: openBal,
        color: newWalletColor,
      });
      setNewWalletName('');
      setNewWalletOpening('');
      setIsAddWalletOpen(false);
    } catch (err) {
      console.error('Failed to add wallet:', err);
    } finally {
      setIsSavingWallet(false);
    }
  };

  // Filter transfers strictly for current mode's wallets
  const currentWalletIds = new Set(currentWallets.map((w) => w.id));
  const filteredTransfers = transfers.filter((t) => {
    const isModeTransfer = currentWalletIds.has(t.fromWalletId) || currentWalletIds.has(t.toWalletId);
    if (!isModeTransfer) return false;
    if (filterWalletId === 'all') return true;
    return t.fromWalletId === filterWalletId || t.toWalletId === filterWalletId;
  });

  return (
    <div className="space-y-6 pb-36 md:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950 flex items-center gap-2">
            <span>{isTourism ? '🚌 Tour Accounts & Wallets' : '🛒 Dry Fruit Store Accounts'}</span>
          </h2>
          <p className="text-xs text-zinc-600 font-medium">
            {isTourism
              ? 'Tour advance, passenger bookings & bus expenses (Rizwan, Sahil, Bus)'
              : 'Store partner wallets: Rizwan, Avesh, Sahil (Dry fruits & spices)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddWalletOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 border-2 border-zinc-900 text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>+ Add Account</span>
          </button>

          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <ArrowRightLeft size={14} />
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* Hero Overview Card - Strictly Mode Specific Cash */}
      <div
        className={`p-6 rounded-[28px] text-white shadow-xl ${
          isTourism
            ? 'bg-gradient-to-br from-amber-950 via-zinc-950 to-zinc-900 border border-amber-900/40'
            : 'bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            {isTourism ? 'Sanzari Tours Total Cash' : 'Dry Fruit Store Total Cash'}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isTourism
                ? 'text-amber-300 bg-amber-950/80 border border-amber-800/50'
                : 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/50'
            }`}
          >
            <ShieldCheck size={11} />
            {isTourism ? 'Tour Accounts Only' : 'Dry Fruit Accounts Only'}
          </span>
        </div>
        <div className="text-3xl font-black tracking-tight text-white mt-1 font-mono">
          {formatCurrency(currentTotal)}
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          {isTourism
            ? `Sum across ${currentWallets.length} Tour Wallets (Rizwan, Sahil & Bus)`
            : `Sum across ${currentWallets.length} Store Wallets (Rizwan, Avesh & Sahil)`}
        </p>
      </div>

      {/* Wallets List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
            <span>{isTourism ? '🚌' : '🛒'}</span>
            <span>{isTourism ? 'Tour Dedicated Accounts' : 'Dry Fruit Store Wallets'} ({currentWallets.length})</span>
          </h3>
          <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full">
            {isTourism ? 'Tour Advance & Expenses' : 'Sales, Expenses & Purchases'}
          </span>
        </div>

        <div className="space-y-3">
          {currentWallets.map((wallet, idx) => {
            const walletMonthSales = sales
              .filter(
                (s) =>
                  s.walletId === wallet.id &&
                  (s.monthKey === currentMonthKey || s.date?.startsWith(currentMonthKey))
              )
              .reduce((sum, s) => sum + (s.paidAmount || 0), 0);

            const walletMonthExpenses = expenses
              .filter(
                (e) =>
                  e.walletId === wallet.id &&
                  (e.monthKey === currentMonthKey || e.date?.startsWith(currentMonthKey))
              )
              .reduce((sum, e) => sum + (e.amount || 0), 0);

            return (
              <motion.div
                key={wallet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedWalletId(wallet.id)}
                className={`p-5 rounded-3xl border shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
                  isTourism
                    ? 'bg-amber-50/40 border-amber-200/90 hover:border-amber-400'
                    : 'bg-white border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs"
                      style={{ backgroundColor: wallet.color || (isTourism ? '#f59e0b' : '#18181b') }}
                    >
                      {wallet.name.startsWith('Bus') ? '🚌' : wallet.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-zinc-950">{wallet.name}</h4>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isTourism
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {isTourism ? 'Tour Account' : 'Dry Fruit Account'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600">
                        Opening Balance: {formatCurrency(wallet.openingBalance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-base font-black text-zinc-950 tracking-tight font-mono">
                        {formatCurrency(wallet.currentBalance)}
                      </span>
                      <p className="text-[10px] text-zinc-600 font-semibold">Live Balance</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </div>
                </div>

                {!isTourism && (walletMonthSales > 0 || walletMonthExpenses > 0) && (
                  <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-zinc-100 text-xs">
                    <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-800 font-medium">Month Sales</span>
                      <span className="font-bold text-emerald-700">+{formatCurrency(walletMonthSales)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                      <span className="text-[11px] text-rose-800 font-medium">Month Expenses</span>
                      <span className="font-bold text-rose-700">-{formatCurrency(walletMonthExpenses)}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Account-to-Account Transfer History & Logs */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRightLeft size={14} className="text-zinc-800" />
              <span>Account-to-Account Transfer History</span>
            </h3>
            <p className="text-[11px] text-zinc-500">
              Transfer logs showing sender, receiver, reason &amp; date
            </p>
          </div>

          {/* Account Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterWalletId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterWalletId === 'all'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              All ({transfers.length})
            </button>
            {currentWallets.map((w) => {
              const count = filteredTransfers.filter(
                (t) => t.fromWalletId === w.id || t.toWalletId === w.id
              ).length;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setFilterWalletId(w.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    filterWalletId === w.id
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: w.color || '#3f3f46' }}
                  />
                  <span>{w.name} ({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transfer Cards List */}
        {filteredTransfers.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white border border-dashed border-zinc-200 text-xs text-zinc-500">
            <ArrowRightLeft size={24} className="mx-auto mb-2 text-zinc-400" />
            <p className="font-semibold text-zinc-700">No account transfers found</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Use the "Transfer" button above to send money between partner accounts.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransfers.map((t) => {
              const fromW = wallets.find((w) => w.id === t.fromWalletId);
              const toW = wallets.find((w) => w.id === t.toWalletId);

              return (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    {/* Visual Transfer Pill */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black text-white shadow-2xs"
                        style={{ backgroundColor: fromW?.color || '#18181b' }}
                      >
                        {t.fromWalletName}
                      </span>

                      <ArrowRight size={14} className="text-zinc-400 shrink-0" />

                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black text-white shadow-2xs"
                        style={{ backgroundColor: toW?.color || '#18181b' }}
                      >
                        {t.toWalletName}
                      </span>

                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(t.date)}
                      </span>
                    </div>

                    {/* Transfer Reason & Person */}
                    <div className="text-xs">
                      <p className="font-bold text-zinc-900">
                        <span className="text-zinc-500 font-normal">Reason: </span>
                        {t.notes || 'Internal wallet transfer'}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                        <User size={11} className="text-zinc-400" />
                        <span>Transferred by: <strong className="text-zinc-700">{t.createdBy || t.userEmail || 'Admin'}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Transfer Amount */}
                  <div className="text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 flex sm:flex-col items-center justify-between sm:items-end">
                    <span className="text-xs text-zinc-600 font-medium sm:hidden">Amount:</span>
                    <div>
                      <div className="text-base font-black text-zinc-950 tracking-tight">
                        {formatCurrency(t.amount)}
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full inline-block">
                        Account Transfer
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <WalletLedgerModal />

      {/* Add New Wallet / Account Modal */}
      {isAddWalletOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-2 border-zinc-900 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                  <WalletIcon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950">Add New Account</h3>
                  <p className="text-[11px] text-zinc-500 font-medium">Create partner or business wallet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWalletOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateWallet} className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block mb-1">
                  Account / Person Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahil (Tour), Bus (Tour), Rizwan..."
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block mb-1">
                  Business Scope
                </label>
                <select
                  value={newWalletScope}
                  onChange={(e) => setNewWalletScope(e.target.value as any)}
                  className="w-full text-xs font-bold p-2.5 bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none focus:bg-white"
                >
                  <option value="tourism">🚌 Sanzari Tours (Tour Wallet)</option>
                  <option value="dryfruit">🛒 Dry Fruit Store</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newWalletOpening}
                  onChange={(e) => setNewWalletOpening(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block mb-1">
                  Tag Color
                </label>
                <div className="flex items-center gap-2">
                  {['#0ea5e9', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#18181b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewWalletColor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        newWalletColor === c ? 'scale-110 ring-2 ring-zinc-950' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWalletOpen(false)}
                  className="px-3 py-2 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingWallet}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingWallet ? 'Adding...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
