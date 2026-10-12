import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Sparkles,
  LogOut,
  X,
  Store,
  ShieldCheck,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Plane,
  Luggage,
  Plus,
  FolderPlus,
} from 'lucide-react';

interface SlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlideMenu: React.FC<SlideMenuProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    activeMoreSection,
    setActiveMoreSection,
    settings,
    businessMode,
    setIsAiAssistantOpen,
    setIsGoogleSheetsOpen,
    setIsPdfCustomizerOpen,
    setIsAddTourBookingOpen,
    setIsAddTourBatchOpen,
  } = useData();
  const { currentUserProfile, lockApp } = useAuth();

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
    { id: 'reports', label: 'Reports & P&L', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tourismManagementNav: { id: MoreSection; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'customers', label: 'Customers & Travelers', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const managementNav = businessMode === 'tourism' ? tourismManagementNav : dryFruitManagementNav;

  const handleSelectTab = (tabId: NavTab) => {
    setActiveTab(tabId);
    onClose();
  };

  const handleSelectMoreSection = (sec: MoreSection) => {
    setActiveTab('more');
    setActiveMoreSection(sec);
    onClose();
  };

  // Back Button and Escape Key Listener for SlideMenu
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.history.pushState({ menuOpen: true }, '');

      const handlePopState = () => {
        onClose();
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('popstate', handlePopState);

      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* iOS Slide Panel from Left */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative z-10 w-[82%] max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            <div>
              {/* Header Profile Section */}
              <div className="p-5 bg-zinc-950 text-white relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-3 mt-1">
                  <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white font-black text-lg flex items-center justify-center shadow-md border border-white/20">
                    S
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                      {currentUserProfile.name}
                      <ShieldCheck size={14} className="text-emerald-400 fill-emerald-400/20" />
                    </h3>
                    <p className="text-[11px] text-zinc-400">{currentUserProfile.role}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                      <Store size={10} />
                      {businessMode === 'tourism' ? 'Sanzari Tours & Travels' : settings.businessName || 'Sanzari Store'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tourism Quick Actions */}
              {businessMode === 'tourism' && (
                <div className="p-3.5 px-4 bg-zinc-50 border-b border-zinc-200/70 space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        setIsAddTourBookingOpen(true);
                      }}
                      className="py-2.5 px-2.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={14} className="stroke-[3]" />
                      <span>+ Booking</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        setIsAddTourBatchOpen(true);
                      }}
                      className="py-2.5 px-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <FolderPlus size={14} />
                      <span>+ Tour Date</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Dry Fruit Store Tools (Only shown in dry fruit mode) */}
              {businessMode === 'dryfruit' && (
                <div className="p-3 px-4 bg-linear-to-r from-amber-50 to-indigo-50 border-b border-amber-200/50 space-y-2">
                  <button
                    onClick={() => {
                      onClose();
                      setIsAiAssistantOpen(true);
                    }}
                    className="w-full flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <Sparkles size={16} className="fill-amber-200" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">Ask AI Assistant</h4>
                        <p className="text-[10px] text-zinc-500">Sales, balances &amp; low stock</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </button>

                  {/* Google Sheets Trigger */}
                  <button
                    onClick={() => {
                      onClose();
                      setIsGoogleSheetsOpen(true);
                    }}
                    className="w-full flex items-center justify-between text-left pt-2 border-t border-emerald-200/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <FileSpreadsheet size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">Google Sheets Auto-Sync</h4>
                        <p className="text-[10px] text-emerald-700 font-medium">Export &amp; Live Sync Excel</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </button>

                  {/* PDF Export Customizer Trigger */}
                  <button
                    onClick={() => {
                      onClose();
                      setIsPdfCustomizerOpen(true);
                    }}
                    className="w-full flex items-center justify-between text-left pt-2 border-t border-zinc-200/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                        <FileText size={16} className="text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">Custom PDF Export</h4>
                        <p className="text-[10px] text-zinc-500 font-medium">Invoices, Khata &amp; Valuation</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </button>
                </div>
              )}

              {/* Main Navigation Links */}
              <div className="p-4 space-y-1 border-b border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-2 mb-1">
                  Main
                </p>
                {mainNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={17} className={isActive ? 'text-white' : 'text-zinc-500'} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Management Sections */}
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-2 mb-1">
                  {businessMode === 'tourism' ? 'Tourism Modules' : 'Store Modules'}
                </p>
                {managementNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === 'more' && activeMoreSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMoreSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={17} className={isActive ? 'text-white' : 'text-zinc-500'} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Footer Lock App */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50">
              <button
                onClick={() => {
                  onClose();
                  lockApp();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut size={16} />
                <span>Lock &amp; Switch Portal</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
