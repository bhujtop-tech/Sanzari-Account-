import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  MapPin,
  Calendar,
  Share2,
  FileText,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CustomTourPackage } from '../../types';
import { BatchesSkeleton } from '../common/Skeleton';

export const CustomTourPackagesView: React.FC = () => {
  const {
    loading,
    customTourPackages,
    formatCurrency,
    setIsCustomPackageModalOpen,
    openEditCustomPackageModal,
    deleteCustomPackageById,
    openPackagePdf,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredPackages = useMemo(() => {
    return customTourPackages.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.packageName.toLowerCase().includes(q) ||
        p.packageNameGujarati.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q)
      );
    });
  }, [customTourPackages, searchQuery]);

  if (loading) {
    return <BatchesSkeleton />;
  }

  const handleDelete = async (pkg: CustomTourPackage) => {
    if (window.confirm(`Are you sure you want to delete tour package "${pkg.packageName}"?`)) {
      try {
        await deleteCustomPackageById(pkg.id);
      } catch (err) {
        console.error('Delete package error:', err);
      }
    }
  };

  return (
    <div className="space-y-5 pb-48 sm:pb-24">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-500 ml-2" />
          <input
            type="text"
            placeholder="Search custom packages by name or destination (e.g. Kashmir, Manali)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-zinc-900 focus:outline-none placeholder:text-zinc-400 font-medium"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsCustomPackageModalOpen(true)}
          className="px-4 py-3 bg-zinc-950 hover:bg-black text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>+ New Package</span>
        </button>
      </div>

      {/* Packages Grid - Crisp White Card & Black Border (2 per row on mobile) */}
      {filteredPackages.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-900 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto border border-zinc-300">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Custom Packages Found</h3>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto">
            Click "+ New Package" above to create custom tour packages with Gujarati brochure!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white text-zinc-950 rounded-2xl border-2 border-zinc-900 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-all group"
            >
              <div className="space-y-3">
                {/* Header Tag & Code */}
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                    {pkg.packageCode || 'SZ-PKG'}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900 border border-zinc-300">
                    {pkg.durationTextGujarati || `${pkg.durationDays}D / ${pkg.durationNights}N`}
                  </span>
                </div>

                {/* Title & Destination */}
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-950 tracking-tight leading-snug">
                    {pkg.packageName}
                  </h3>
                  <p className="text-[11px] font-semibold text-zinc-600 mt-0.5">
                    {pkg.packageNameGujarati}
                  </p>
                  <p className="text-xs font-black text-zinc-900 flex items-center gap-1 mt-1">
                    <MapPin size={12} className="text-zinc-900 shrink-0" />
                    <span className="truncate">{pkg.destination}</span>
                  </p>
                </div>

                {/* Rates Grid */}
                <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-200 grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold block">🚆 3AC Train</span>
                    <strong className="text-zinc-950 font-black">
                      {pkg.priceAcTrain ? formatCurrency(pkg.priceAcTrain) : '₹18,000'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold block">✈️ Flight / Air</span>
                    <strong className="text-zinc-950 font-black">
                      {pkg.priceFlight ? formatCurrency(pkg.priceFlight) : '₹24,000'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold block">🚞 Non-AC</span>
                    <strong className="text-zinc-900 font-bold">
                      {pkg.priceNonAcTrain ? formatCurrency(pkg.priceNonAcTrain) : '₹14,000'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold block">👶 Child Rate</span>
                    <strong className="text-zinc-900 font-bold">
                      {pkg.priceChildHalf ? formatCurrency(pkg.priceChildHalf) : '₹8,000'}
                    </strong>
                  </div>
                </div>

                {/* Inclusions Highlights */}
                <div className="text-[11px] text-zinc-700 space-y-1">
                  <div className="font-extrabold text-zinc-900 text-[10px] uppercase">
                    Key Inclusions:
                  </div>
                  {pkg.inclusionsGujarati.slice(0, 2).map((inc, i) => (
                    <div key={i} className="flex items-start gap-1.5 line-clamp-1">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span className="truncate">{inc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 mt-3 border-t border-zinc-200 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => openPackagePdf(pkg)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <FileText size={13} />
                  <span>Gujarati PDF Brochure</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditCustomPackageModal(pkg)}
                    title="Edit Package"
                    className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pkg)}
                    title="Delete Package"
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
