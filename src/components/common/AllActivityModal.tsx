import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BottomSheet } from './BottomSheet';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  ArrowRightLeft,
  Receipt,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import { ActivityItem } from '../../types';

export const AllActivityModal: React.FC = () => {
  const {
    isViewAllActivityOpen,
    setIsViewAllActivityOpen,
    recentActivity,
    formatCurrency,
    setSelectedActivityItem,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  if (!isViewAllActivityOpen) return null;

  const filteredActivity = recentActivity.filter((item) => {
    const matchesType =
      selectedType === 'all' ||
      item.type === selectedType ||
      (selectedType === 'sale' && item.type === 'tourBooking') ||
      (selectedType === 'expense' && item.type === 'tourExpense');

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchLower) ||
      item.subtitle.toLowerCase().includes(searchLower) ||
      (item.walletName && item.walletName.toLowerCase().includes(searchLower)) ||
      (item.notes && item.notes.toLowerCase().includes(searchLower)) ||
      (item.customerName && item.customerName.toLowerCase().includes(searchLower)) ||
      item.amount.toString().includes(searchLower);

    return matchesType && matchesSearch;
  });

  return (
    <BottomSheet
      isOpen={isViewAllActivityOpen}
      onClose={() => setIsViewAllActivityOpen(false)}
      title="All Activity History"
      subtitle={`${filteredActivity.length} Total Recorded Transactions`}
    >
      <div className="space-y-4 pb-6">
        {/* Search & Filter Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, wallet, amount, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-zinc-100 border border-zinc-200/80 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'sale', label: 'Sales' },
              { id: 'expense', label: 'Expenses' },
              { id: 'payment', label: 'Payments' },
              { id: 'transfer', label: 'Transfers' },
              { id: 'purchase', label: 'Purchases' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedType(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === f.id
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Cards List */}
        {filteredActivity.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-zinc-500 text-xs font-medium">
            No activity found matching your search.
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filteredActivity.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedActivityItem(item);
                }}
                className="w-full p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all text-left flex items-center justify-between cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {item.isPositive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-zinc-900 truncate">{item.title}</h4>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {item.subtitle} • <span className="font-medium text-zinc-700">{item.date}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div
                    className={`text-xs font-black tracking-tight ${
                      item.isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {item.isPositive ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </div>
                  {item.walletName && (
                    <span className="text-[10px] font-medium text-zinc-500 block truncate max-w-[100px]">
                      {item.walletName}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
