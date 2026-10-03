import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AddExpenseModal } from './AddExpenseModal';
import { Receipt, Plus, Search } from 'lucide-react';
import { motion } from 'motion/react';

export const ExpensesList: React.FC = () => {
  const { expenses, formatCurrency, formatDate, setIsAddExpenseOpen } = useData();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    expenses.forEach((e) => e.category && set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.walletName.toLowerCase().includes(search.toLowerCase());

      const matchCategory = categoryFilter === 'All' || e.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [expenses, search, categoryFilter]);

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Store Expenses</h2>
          <p className="text-xs text-zinc-600 font-medium">
            {filteredExpenses.length} Vouchers • Total: {formatCurrency(totalExpenseAmount)}
          </p>
        </div>

        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search expenses by category or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs text-xs font-medium focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200 text-zinc-600">
          <Receipt size={32} className="mx-auto mb-2 text-zinc-300" />
          <p className="text-xs font-bold text-zinc-700">No expense vouchers recorded</p>
          <p className="text-[11px] mt-0.5">Tap "Add Expense" to record business spending</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExpenses.map((exp) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-zinc-950">{exp.category}</span>
                  <span className="text-[10px] text-zinc-500 font-semibold bg-zinc-100 px-2 py-0.5 rounded-full">
                    {exp.walletName}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">{exp.description}</p>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-rose-600 block">
                  -{formatCurrency(exp.amount)}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">{formatDate(exp.date)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
