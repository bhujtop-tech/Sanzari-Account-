import React from 'react';
import { useData } from '../../context/DataContext';
import { NavTab, MoreSection } from '../../types';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  WalletCards,
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
  Plus,
  ArrowRightLeft,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    activeMoreSection,
    setActiveMoreSection,
    setIsAddSaleOpen,
    setIsAddExpenseOpen,
    setIsAddPaymentOpen,
    setIsTransferOpen,
    setIsAiAssistantOpen,
  } = useData();

  const mainNav: { id: NavTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales History', icon: ShoppingBag },
    { id: 'stock', label: 'Stock & Inventory', icon: Boxes },
    { id: 'accounts', label: 'Wallets & Accounts', icon: WalletCards },
  ];

  const managementNav: { id: MoreSection; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'customers', label: 'Customers CRM', icon: Users },
    { id: 'products', label: 'Products Catalog', icon: Package },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    { id: 'vendors', label: 'Vendors', icon: Building2 },
    { id: 'users', label: 'Users & Staff', icon: ShieldCheck },
    { id: 'monthly', label: 'Monthly Folders', icon: CalendarDays },
    { id: 'reports', label: 'P&L Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200/80 bg-white min-h-screen p-4 sticky top-0 h-screen overflow-y-auto">
      {/* Brand logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-4">
        <div className="w-9 h-9 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black text-base shadow-sm">
          S
        </div>
        <div>
          <h2 className="font-extrabold text-sm tracking-tight text-zinc-900">SANZARI STORE</h2>
          <p className="text-[11px] text-zinc-600 font-medium">Accounts & Inventory</p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          onClick={() => setIsAddSaleOpen(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Sale</span>
        </button>
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold transition-transform active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Expense</span>
        </button>
      </div>

      {/* Primary Navigation */}
      <div className="space-y-1 mb-6">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">
          Main
        </p>
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 font-bold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-zinc-900 stroke-[2.5]' : 'text-zinc-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Management / More Section */}
      <div className="space-y-1 mb-6 flex-1">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">
          Management
        </p>
        {managementNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === 'more' && activeMoreSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab('more');
                setActiveMoreSection(item.id);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 font-bold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-zinc-900 stroke-[2.5]' : 'text-zinc-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* AI Assistant Widget */}
      <div className="mt-auto pt-3 border-t border-zinc-100">
        <button
          onClick={() => setIsAiAssistantOpen(true)}
          className="w-full p-3 rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-indigo-500/10 border border-amber-500/20 text-left hover:border-amber-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1 text-xs font-bold text-zinc-900">
              <Sparkles size={14} className="text-amber-500 fill-amber-400" />
              Ask AI Assistant
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 font-bold">
              AI
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Ask business metrics & balances</p>
        </button>
      </div>
    </aside>
  );
};
