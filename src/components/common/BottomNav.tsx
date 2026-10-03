import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { NavTab, MoreSection } from '../../types';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  WalletCards,
  Grid2X2,
  Package,
  Boxes,
  Receipt,
  Truck,
  Building2,
  CalendarDays,
  BarChart3,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, activeMoreSection, setActiveMoreSection, setIsAiAssistantOpen } = useData();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const tabs: { id: NavTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales', icon: ShoppingBag },
    { id: 'stock', label: 'Stock', icon: Boxes },
    { id: 'accounts', label: 'Accounts', icon: WalletCards },
    { id: 'more', label: 'More', icon: Grid2X2 },
  ];

  const moreItems: { id: MoreSection; label: string; icon: React.FC<{ size?: number; className?: string }>; desc: string }[] = [
    { id: 'customers', label: 'Customers', icon: Users, desc: 'Grahak Ledger & Udhari' },
    { id: 'products', label: 'Products', icon: Package, desc: 'Pricing & Catalog' },
    { id: 'expenses', label: 'Expenses', icon: Receipt, desc: 'Daily Business Expenses' },
    { id: 'purchases', label: 'Purchases', icon: Truck, desc: 'Vendor Inward Supplies' },
    { id: 'vendors', label: 'Vendors', icon: Building2, desc: 'Supplier Accounts' },
    { id: 'users', label: 'Users & Staff', icon: ShieldCheck, desc: 'Roles & Staff Control' },
    { id: 'monthly', label: 'Month Folders', icon: CalendarDays, desc: 'Monthly Organization' },
    { id: 'reports', label: 'Reports', icon: BarChart3, desc: 'P&L & Wallet Summary' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Store & Data Controls' },
  ];

  const handleTabClick = (tabId: NavTab) => {
    if (tabId === 'more') {
      setIsMoreMenuOpen(true);
    } else {
      setActiveTab(tabId);
      setIsMoreMenuOpen(false);
    }
  };

  const handleSelectMoreSection = (sec: MoreSection) => {
    setActiveTab('more');
    setActiveMoreSection(sec);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* iOS Floating / Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-zinc-200/80 px-2 py-1.5 md:hidden safe-bottom">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center w-16 py-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-zinc-950 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 font-medium'
                }`}
              >
                <div
                  className={`relative p-1 rounded-xl transition-all ${
                    isActive ? 'bg-zinc-100 text-zinc-950 scale-105' : ''
                  }`}
                >
                  <Icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Section Popup Sheet */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative z-10 bg-white rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="w-10 h-1.5 bg-zinc-300 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Sanzari Modules</h3>
                  <p className="text-xs text-zinc-500">Quick access to inventory, expenses, and reports</p>
                </div>
                <button
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500"
                >
                  <X size={16} />
                </button>
              </div>

              {/* AI Assistant Banner */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsAiAssistantOpen(true);
                }}
                className="w-full mb-4 p-3.5 rounded-2xl bg-linear-to-r from-amber-50 to-indigo-50 border border-amber-200/60 flex items-center gap-3 text-left transition-transform active:scale-98 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white shadow-2xs flex items-center justify-center text-amber-500">
                  <Sparkles size={20} className="fill-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                    AI Business Assistant
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] rounded-full font-bold">SMART</span>
                  </h4>
                  <p className="text-[11px] text-zinc-600">Ask sales, balances, stock in English/Urdu</p>
                </div>
              </button>

              {/* Grid of items */}
              <div className="grid grid-cols-2 gap-2.5 pb-6">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === 'more' && activeMoreSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMoreSection(item.id)}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-97 cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
                          : 'bg-zinc-50/80 hover:bg-zinc-100/80 border-zinc-200/70 text-zinc-800'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white shadow-2xs text-zinc-700'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-xs tracking-tight">{item.label}</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
