import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
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
  Luggage,
  FolderPlus,
  Plane,
  LogOut,
  FileText,
  Calculator,
  Menu,
  PanelLeftClose,
  History,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onToggle,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { lockApp } = useAuth();
  const {
    activeTab,
    setActiveTab,
    activeMoreSection,
    setActiveMoreSection,
    setIsAddSaleOpen,
    setIsAddExpenseOpen,
    setIsAddTourBookingOpen,
    setIsAddTourBatchOpen,
    setIsAddTourInquiryOpen,
    setIsAiAssistantOpen,
    setIsTourCalculatorOpen,
    setIsPackageExplainerOpen,
    setIsLogsModalOpen,
    businessMode,
  } = useData();

  const dryFruitMainNav: { id: NavTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales History', icon: ShoppingBag },
    { id: 'stock', label: 'Stock & Inventory', icon: Boxes },
    { id: 'accounts', label: 'Wallets & Accounts', icon: WalletCards },
  ];

  const tourismMainNav: { id: NavTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'home', label: 'Tours Dashboard', icon: Plane },
    { id: 'stock', label: 'Tour Dates & Folders', icon: CalendarDays },
    { id: 'sales', label: 'Tour Bookings', icon: Luggage },
    { id: 'accounts', label: 'Wallets & Khata', icon: WalletCards },
  ];

  const mainNav = businessMode === 'tourism' ? tourismMainNav : dryFruitMainNav;

  const dryFruitManagementNav: { id: MoreSection; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
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

  const tourismManagementNav: { id: MoreSection; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'inquiries', label: 'Inquiries & Leads', icon: FileText },
    { id: 'packages', label: 'Tour Packages & PDF', icon: Package },
    { id: 'customers', label: 'Passengers Manifest', icon: Users },
    { id: 'reports', label: 'Tour Reports & P&L', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const managementNav = businessMode === 'tourism' ? tourismManagementNav : dryFruitManagementNav;

  const sidebarContent = (onHideClick?: () => void) => (
    <>
      {/* Brand Header with Menu Button inside Sidebar (Click to Hide) */}
      <div className="flex items-center justify-between gap-2 px-1 py-1.5 mb-4 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onHideClick}
            title="Click to Hide Side Menu"
            aria-label="Hide Side Menu"
            className="w-9 h-9 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-xs shrink-0"
          >
            <Menu size={18} className="stroke-[2.5]" />
          </button>
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm tracking-tight text-zinc-900 truncate">
              {businessMode === 'tourism' ? 'SANZARI TOURS' : 'SANZARI STORE'}
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium truncate">
              {businessMode === 'tourism' ? 'Travels & Group Tours' : 'Dry Fruits & Spices'}
            </p>
          </div>
        </div>
        <button
          onClick={onHideClick}
          title="Hide Menu"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="space-y-2 mb-4">
        {businessMode === 'tourism' ? (
          <>
            <button
              onClick={() => {
                onCloseMobile?.();
                setIsPackageExplainerOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer border border-amber-500"
            >
              <span>🎙️</span>
              <span>Package Explainer</span>
            </button>

            {/* Lamba Add New Inquiry Button */}
            <button
              onClick={() => {
                onCloseMobile?.();
                setIsAddTourInquiryOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer border border-zinc-900"
            >
              <Plus size={15} className="stroke-[3]" />
              <span>+ Add New Inquiry</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onCloseMobile?.();
                  setIsAddTourBookingOpen(true);
                }}
                className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold border border-zinc-300 shadow-2xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Booking</span>
              </button>
              <button
                onClick={() => {
                  onCloseMobile?.();
                  setIsAddTourBatchOpen(true);
                }}
                className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold transition-transform active:scale-95 cursor-pointer border border-zinc-200"
              >
                <FolderPlus size={14} />
                <span>+ Tour Date</span>
              </button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onCloseMobile?.();
                setIsAddSaleOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>Sale</span>
            </button>
            <button
              onClick={() => {
                onCloseMobile?.();
                setIsAddExpenseOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>Expense</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Navigation */}
      <div className="space-y-1 mb-5">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">
          Main
        </p>
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? businessMode === 'tourism'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'bg-zinc-100 text-zinc-950 font-bold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Icon size={16} className={isActive ? (businessMode === 'tourism' ? 'text-blue-600 stroke-[2.5]' : 'text-zinc-900 stroke-[2.5]') : 'text-zinc-400'} />
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
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? businessMode === 'tourism'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'bg-zinc-100 text-zinc-950 font-bold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Icon size={16} className={isActive ? (businessMode === 'tourism' ? 'text-blue-600 stroke-[2.5]' : 'text-zinc-900 stroke-[2.5]') : 'text-zinc-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Widgets */}
      <div className="mt-auto pt-3 border-t border-zinc-100 space-y-2">
        {/* Tour Fare & Family Cost Calculator */}
        <button
          onClick={() => {
            onCloseMobile?.();
            setIsTourCalculatorOpen(true);
          }}
          className="w-full p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-indigo-500/10 border-2 border-blue-500/30 text-left hover:border-blue-600 hover:bg-blue-50/70 transition-all cursor-pointer group shadow-2xs"
          title="Instant family tour cost calculation: AC / Non-AC, child age discounts & private room"
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="flex items-center gap-1.5 text-xs font-black text-zinc-950 group-hover:text-blue-700">
              <Calculator size={14} className="text-blue-600 stroke-[2.5]" />
              Tour Calculator
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-900 font-black border border-blue-200">
              🧮 Fare
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium">Family PAX, age discounts &amp; room</p>
        </button>

        {/* AI Assistant Widget */}
        <button
          onClick={() => {
            onCloseMobile?.();
            setIsAiAssistantOpen(true);
          }}
          className="w-full p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-indigo-500/10 border border-amber-500/20 text-left hover:border-amber-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="flex items-center gap-1 text-xs font-bold text-zinc-900">
              <Sparkles size={13} className="text-amber-500 fill-amber-400" />
              Ask AI Assistant
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 font-bold">
              AI
            </span>
          </div>
          <p className="text-[10px] text-zinc-500">Ask business metrics &amp; balances</p>
        </button>

        {/* Activity & Update Logs Card (Below Ask AI) */}
        <button
          onClick={() => {
            onCloseMobile?.();
            setIsLogsModalOpen(true);
          }}
          className="w-full p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-zinc-900/5 border-2 border-emerald-500/30 text-left hover:border-emerald-600 hover:bg-emerald-50/60 transition-all cursor-pointer group shadow-2xs"
          title="View Date-wise Hinglish logs of all bookings, updates, payments & expenses"
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="flex items-center gap-1.5 text-xs font-black text-zinc-950 group-hover:text-emerald-800">
              <History size={14} className="text-emerald-600 stroke-[2.5]" />
              Activity &amp; Update Logs
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-900 font-black border border-emerald-300">
              📜 Logs
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium">Date-wise Hinglish update history</p>
        </button>

        {/* Lock / Switch Portal Button */}
        <button
          onClick={() => {
            onCloseMobile?.();
            lockApp();
          }}
          className="w-full py-2 px-3 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-600 hover:text-rose-700 border border-zinc-200 hover:border-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          title="Lock session to switch to another business portal at login"
        >
          <LogOut size={13} />
          <span>Lock / Switch Portal</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Collapsible Side Menu */}
      {isOpen && (
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-zinc-200/80 bg-white min-h-screen p-4 sticky top-0 h-screen overflow-y-auto transition-all duration-200">
          {sidebarContent(onToggle)}
        </aside>
      )}

      {/* Mobile Slide-Over Side Menu */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />
          <aside className="relative z-10 flex flex-col w-72 max-w-[85vw] bg-white h-full p-4 shadow-2xl overflow-y-auto">
            {sidebarContent(onCloseMobile)}
          </aside>
        </div>
      )}
    </>
  );
};


