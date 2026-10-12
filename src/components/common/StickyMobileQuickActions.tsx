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
    setIsAddTourInquiryOpen,
  } = useData();
  const { userPermissions } = useAuth();

  const canSale = userPermissions?.canAddSale ?? true;
  const canExpense = userPermissions?.canAddExpense ?? true;

  if (businessMode === 'tourism') {
    return (
      <>
        {/* Mobile Floating Action Bar directly above Bottom Nav */}
        <div className="fixed bottom-[64px] left-0 right-0 z-30 pointer-events-none flex justify-center px-3 pb-1 md:hidden">
          <div className="pointer-events-auto bg-zinc-950 text-white p-1.5 rounded-2xl shadow-2xl border-2 border-zinc-900 flex items-center gap-1.5 max-w-sm w-full justify-between">
            {/* Quick Floating Add Inquiry Button - Lamba & High Visibility */}
            <button
              onClick={() => setIsAddTourInquiryOpen(true)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
            >
              <Plus size={15} className="stroke-[3]" />
              <span>+ New Inquiry</span>
            </button>

            {/* Quick Floating Add Booking Button */}
            <button
              onClick={() => setIsAddTourBookingOpen(true)}
              className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1 border border-zinc-700 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus size={14} />
              <span>Booking</span>
            </button>

            {/* Quick Floating Add Tour Date Button */}
            <button
              onClick={() => setIsAddTourBatchOpen(true)}
              className="py-2.5 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1 border border-zinc-800 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
            >
              <FolderPlus size={14} />
              <span>+ Date</span>
            </button>
          </div>
        </div>

        {/* Floating Action Button (FAB) on bottom-right for desktop/tablet */}
        <div className="hidden md:flex fixed bottom-6 right-6 z-30 pointer-events-auto">
          <button
            onClick={() => setIsAddTourInquiryOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-950 hover:bg-black text-white font-black text-xs shadow-2xl border-2 border-zinc-800 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>+ Add New Inquiry</span>
          </button>
        </div>
      </>
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
