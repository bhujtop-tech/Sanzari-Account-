import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { addVendor } from '../../services/db';
import { Building2, Plus, Phone, MapPin, Search } from 'lucide-react';
import { motion } from 'motion/react';

export const VendorsView: React.FC = () => {
  const { vendors, formatCurrency } = useData();

  const [search, setSearch] = useState('');
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [productsSupplied, setProductsSupplied] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.phone.includes(search) ||
      (v.city && v.city.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await addVendor({
        name: name.trim(),
        phone: phone.trim() || 'N/A',
        city: city.trim(),
        productsSupplied: productsSupplied.trim(),
        totalPurchases: 0,
        pendingPayment: 0,
      });

      setName('');
      setPhone('');
      setCity('');
      setProductsSupplied('');
      setIsAddVendorOpen(false);
    } catch (err) {
      console.error('Failed to create vendor:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Vendors</h2>
          <p className="text-xs text-zinc-600 font-medium">Supplier &amp; Wholesale Accounts</p>
        </div>

        <button
          onClick={() => setIsAddVendorOpen(!isAddVendorOpen)}
          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Add Vendor Form */}
      {isAddVendorOpen && (
        <form
          onSubmit={handleCreateVendor}
          className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900">New Vendor Details</h3>
            <button
              type="button"
              onClick={() => setIsAddVendorOpen(false)}
              className="text-[11px] text-zinc-500 hover:text-zinc-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Vendor / Business Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="City (e.g. Srinagar / Mumbai)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
            <input
              type="text"
              placeholder="Supplied Products (e.g. Saffron, Walnut)"
              value={productsSupplied}
              onChange={(e) => setProductsSupplied(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl"
          >
            {isSubmitting ? 'Saving...' : 'Save Vendor'}
          </button>
        </form>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs text-xs font-medium focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden"
        />
      </div>

      {/* List */}
      {filteredVendors.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200 text-zinc-600">
          <Building2 size={32} className="mx-auto mb-2 text-zinc-300" />
          <p className="text-xs font-bold text-zinc-700">No vendors registered yet</p>
          <p className="text-[11px] mt-0.5">Add suppliers to track purchases and payables</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVendors.map((vendor) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between"
            >
              <div>
                <h3 className="text-xs font-bold text-zinc-950">{vendor.name}</h3>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                  <span className="font-mono">{vendor.phone}</span>
                  {vendor.city && <span>• {vendor.city}</span>}
                </div>
                {vendor.productsSupplied && (
                  <p className="text-[10px] text-zinc-400 mt-1">Supplies: {vendor.productsSupplied}</p>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-zinc-950 block">
                  Purchases: {formatCurrency(vendor.totalPurchases)}
                </span>
                {vendor.pendingPayment > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 block">
                    Payable: {formatCurrency(vendor.pendingPayment)}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
