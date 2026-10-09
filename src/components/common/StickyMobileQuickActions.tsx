import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, ShoppingBag, Receipt, ArrowDownLeft, FolderPlus } from 'lucide-react';

export const StickyMobileQuickActions: React.FC = () => {
  const {
    businessMode,
    setIsAddSaleOpen,
    setIsAddExpenseOpen,
    setIsAddPaymentOpen,
    setIsAddTourBookingOpen,
    setIsAddTourBatchOpen,
    setIsAddTourExpenseOpen,
  } = useData();
  const { userPermissions } = useAuth();

  const canSale = userPermissions?.canAddSale ?? true;
  const canExpense = userPermissions?.canAddExpense ?? true;

  if (businessMode === 'tourism') {
    return (
      <div className="fixed bottom-[68px] left-0 right-0 z-30 pointer-events-none flex justify-center px-4 pb-1 md:hidden">
        <div className="pointer-events-auto bg-zinc-950 text-white p-1.5 rounded-2xl shadow-2xl border border-zinc-800 flex items-center gap-2 max-w-sm w-full justify-between">
          <button
            onClick={() => setIsAddTourBookingOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>+ Booking</span>
          </button>

          <button
            onClick={() => setIsAddTourBatchOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-indigo-300 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-indigo-400/20 active:scale-95 transition-transform cursor-pointer"
          >
            <FolderPlus size={14} />
            <span>+ Tour Date</span>
          </button>

          <button
            onClick={() => setIsAddTourExpenseOpen(true)}
            className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
          >
            <Receipt size={14} className="text-rose-400" />
            <span>Expense</span>
          </button>
        </div>
      </div>
    );
  }

  if (!canSale && !canExpense) return null;

  return (
    <div className="fixed bottom-[68px] left-0 right-0 z-30 pointer-events-none flex justify-center px-4 pb-1 md:hidden">
      <div className="pointer-events-auto bg-zinc-950 text-white p-1.5 rounded-2xl shadow-2xl border border-zinc-800 flex items-center gap-2 max-w-sm w-full justify-between">
        {/* Quick New Sale Button */}
        {canSale && (
          <button
            onClick={() => setIsAddSaleOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>New Sale</span>
          </button>
        )}

        {/* Quick Add Expense Button */}
        {canExpense && (
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-amber-400/20 active:scale-95 transition-transform cursor-pointer"
          >
            <Receipt size={15} />
            <span>Expense</span>
          </button>
        )}

        {/* Quick Collect Payment Button */}
        <button
          onClick={() => setIsAddPaymentOpen(true)}
          className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
        >
          <ArrowDownLeft size={14} className="text-emerald-400" />
          <span>Payment</span>
        </button>
      </div>
    </div>
  );
};
