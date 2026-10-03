import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { CustomerDetailModal } from './CustomerDetailModal';
import { Search, UserPlus, Phone, MapPin, ChevronRight, User } from 'lucide-react';
import { motion } from 'motion/react';
import { addCustomer } from '../../services/db';

export const CustomersView: React.FC = () => {
  const { customers, formatCurrency, setSelectedCustomerId, setIsAddSaleOpen } = useData();

  const [search, setSearch] = useState('');
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // New customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.city && c.city.toLowerCase().includes(search.toLowerCase()));

      if (filterPendingOnly) {
        return matchSearch && c.pendingBalance > 0;
      }
      return matchSearch;
    });
  }, [customers, search, filterPendingOnly]);

  const totalPendingAllCustomers = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.pendingBalance || 0), 0);
  }, [customers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await addCustomer({
        name: name.trim(),
        phone: phone.trim() || 'N/A',
        city: city.trim(),
        totalOrders: 0,
        totalSpent: 0,
        pendingBalance: 0,
        notes: notes.trim(),
      });
      setName('');
      setPhone('');
      setCity('');
      setNotes('');
      setIsAddCustomerOpen(false);
    } catch (err) {
      console.error('Failed to create customer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-5xl mx-auto">
      {/* Top Title & Stats */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Customers</h2>
          <p className="text-xs text-zinc-600 font-medium">
            {customers.length} Contacts • Total Due: {formatCurrency(totalPendingAllCustomers)}
          </p>
        </div>
        <button
          onClick={() => setIsAddCustomerOpen(!isAddCustomerOpen)}
          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <UserPlus size={14} />
          <span>Add</span>
        </button>
      </div>

      {/* Quick Inline Add Form */}
      {isAddCustomerOpen && (
        <form
          onSubmit={handleCreateCustomer}
          className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900">New Customer Details</h3>
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(false)}
              className="text-[11px] text-zinc-500 hover:text-zinc-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              placeholder="Customer Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 outline-hidden font-medium"
            />
            <input
              type="tel"
              placeholder="Phone (+91...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 outline-hidden font-medium"
            />
            <input
              type="text"
              placeholder="City (e.g. Bhuj)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 outline-hidden font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs text-xs font-medium focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition-all"
          />
        </div>

        <button
          onClick={() => setFilterPendingOnly(!filterPendingOnly)}
          className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            filterPendingOnly
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-50'
          }`}
        >
          Due Only
        </button>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200 text-zinc-600">
          <User size={32} className="mx-auto mb-2 text-zinc-300" />
          <p className="text-xs font-bold text-zinc-700">No customers found</p>
          <p className="text-[11px] mt-0.5">Try a different search or add a new customer</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedCustomerId(customer.id)}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-zinc-200/70 shadow-2xs hover:border-zinc-300 hover:shadow-xs flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-black text-sm text-zinc-700">
                  {customer.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                    {customer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-600 mt-0.5">
                    <span className="font-mono">{customer.phone}</span>
                    {customer.city && <span>• {customer.city}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  {customer.pendingBalance > 0 ? (
                    <div>
                      <span className="text-xs font-black text-amber-600">
                        {formatCurrency(customer.pendingBalance)}
                      </span>
                      <p className="text-[10px] font-semibold text-amber-700">Pending Due</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-extrabold text-zinc-900">
                        {formatCurrency(customer.totalSpent)}
                      </span>
                      <p className="text-[10px] text-zinc-600 font-medium">Spent</p>
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-zinc-400" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Customer Detail Profile BottomSheet */}
      <CustomerDetailModal />
    </div>
  );
};
