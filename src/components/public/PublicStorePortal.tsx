import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Store,
  WalletCards,
  Boxes,
  ShoppingBag,
  Share2,
  Copy,
  Check,
  Search,
  LogIn,
  ArrowRightLeft,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';

interface PublicStorePortalProps {
  onGoToLogin?: () => void;
}

export const PublicStorePortal: React.FC<PublicStorePortalProps> = ({ onGoToLogin }) => {
  const {
    wallets,
    products,
    sales,
    settings,
    formatCurrency,
    loading,
  } = useData();

  const [copied, setCopied] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Calculations
  const totalBalance = wallets.reduce((sum, w) => sum + w.currentBalance, 0);
  const rizwanWallet = wallets.find((w) => w.partnerKey === 'rizwan' || w.name.toLowerCase().includes('rizwan'));
  const aveshWallet = wallets.find((w) => w.partnerKey === 'avesh' || w.name.toLowerCase().includes('avesh'));
  const sahilWallet = wallets.find((w) => w.partnerKey === 'sahil' || w.name.toLowerCase().includes('sahil'));

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(stockSearch.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const getPublicLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'public');
    return url.toString();
  };

  const handleCopyLink = () => {
    const link = getPublicLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const link = getPublicLink();
    const text = `📊 *${settings.businessName || 'Sanzari Store'} - Live Status*\n\n💰 Live Balance: ${formatCurrency(
      totalBalance
    )}\n📦 Total Items: ${products.length} Products in Stock\n\nView full live store report here:\n${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900 pb-16">
      {/* Top Banner Header */}
      <header className="sticky top-0 z-30 bg-zinc-950 text-white px-4 sm:px-8 py-3.5 border-b border-zinc-800 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black text-lg shadow-md">
              S
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                {settings.businessName || 'Sanzari Store'}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                  PUBLIC VIEW
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium">Read-Only Live Business Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">WhatsApp</span> Share
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            {onGoToLogin && (
              <button
                onClick={onGoToLogin}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <LogIn size={13} />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Single Page View Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* HERO TOTAL BALANCE & WALLETS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Total Balance */}
          <div className="md:col-span-3 p-6 rounded-[28px] bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white shadow-xl border border-zinc-800 relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Combined Balance
                </span>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                  {formatCurrency(totalBalance)}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Combined live cash &amp; bank balances across all partner accounts
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ExternalLink size={14} />
                  <span>Share Status Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* Partner Wallets Grid */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              R
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase">Rizwan Wallet</p>
              <p className="text-base font-black text-zinc-900">
                {formatCurrency(rizwanWallet ? rizwanWallet.currentBalance : 0)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              A
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase">Avesh Wallet</p>
              <p className="text-base font-black text-zinc-900">
                {formatCurrency(aveshWallet ? aveshWallet.currentBalance : 0)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              S
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase">Sahil Wallet</p>
              <p className="text-base font-black text-zinc-900">
                {formatCurrency(sahilWallet ? sahilWallet.currentBalance : 0)}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: LIVE STOCK INVENTORY */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black tracking-tight text-zinc-950 flex items-center gap-2">
                <Boxes size={22} className="text-emerald-600" />
                Live Product Stock
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Real-time inventory levels &amp; selling prices</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 self-start sm:self-auto">
              Total Items: {products.length}
            </span>
          </div>

          {/* Search Bar & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Search stock item (e.g. Kaju, Badam, Dates)..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-zinc-200 text-xs font-semibold focus:ring-1 focus:ring-zinc-900 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => {
              const isLow = prod.currentStock <= prod.lowStockThreshold && prod.currentStock > 0;
              const isOut = prod.currentStock <= 0;

              return (
                <div
                  key={prod.id}
                  className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">{prod.name}</h3>
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                        {prod.category}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                        isOut
                          ? 'bg-rose-100 text-rose-800'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isOut ? 'Out of Stock' : `${prod.currentStock} ${prod.unit}`}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-500">Selling Price:</span>
                    <span className="text-zinc-950 font-black">{formatCurrency(prod.sellingPrice)} / {prod.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: RECENT SALES ACTIVITY */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-zinc-950 flex items-center gap-2">
                <ShoppingBag size={20} className="text-sky-600" />
                Recent Sales Orders
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Latest customer transactions</p>
            </div>
            <span className="text-xs font-bold text-zinc-600">Showing last 8</span>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden divide-y divide-zinc-100">
            {recentSales.map((sale) => (
              <div key={sale.id} className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-950">{sale.saleNumber}</span>
                    <span className="text-xs font-bold text-zinc-800">• {sale.customerName}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {sale.date} • Sales Person: <span className="font-semibold">{sale.salesPerson}</span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-zinc-950">{formatCurrency(sale.total)}</div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                      sale.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sale.paymentStatus === 'Partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {sale.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-8 text-center text-xs text-zinc-500 space-y-2 border-t border-zinc-200/80">
          <p className="font-bold text-zinc-700">{settings.businessName || 'Sanzari Store'} • Live Business Portal</p>
          <p className="text-[11px] text-zinc-400">
            This public page updates automatically with live Firestore database changes.
          </p>
        </div>
      </main>
    </div>
  );
};
