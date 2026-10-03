import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { SlideMenu } from './SlideMenu';
import { ProfileModalCard } from './ProfileModalCard';
import { Menu, Sparkles, Store, Plus, Receipt, ArrowDownLeft, Share2, Check, User } from 'lucide-react';

export const Header: React.FC = () => {
  const { settings, setIsAiAssistantOpen, setIsAddSaleOpen, setIsAddExpenseOpen, setIsAddPaymentOpen } = useData();
  const { currentUserProfile, userPermissions } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const handleSharePublicLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'public');
    const shareUrl = url.toString();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#f8f9fa]/95 backdrop-blur-md border-b border-zinc-200/60 px-3 sm:px-8 py-2.5 flex items-center justify-between transition-all">
        {/* Left: Slide Menu Toggle & Brand */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open Slide Menu"
            className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center hover:bg-black transition-transform active:scale-95 cursor-pointer shadow-xs shrink-0"
          >
            <Menu size={18} className="stroke-[2.5]" />
          </button>

          <div className="min-w-0">
            <h1 className="font-black text-xs sm:text-base tracking-tight text-zinc-950 flex items-center gap-1.5 truncate">
              SANZARI ACCOUNTS
            </h1>
            <p className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1 truncate">
              <Store size={10} className="text-zinc-400 shrink-0" />
              <span className="truncate">{settings.businessName || 'Sanzari Store'}</span>
            </p>
          </div>
        </div>

        {/* Right: Desktop Quick Actions & AI Trigger & Compact Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Quick Actions */}
          <div className="hidden md:flex items-center gap-2 mr-1">
            {userPermissions?.canAddSale && (
              <button
                onClick={() => setIsAddSaleOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>+ Sale</span>
              </button>
            )}

            {userPermissions?.canAddExpense && (
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-amber-300 text-xs font-bold flex items-center gap-1 border border-zinc-800 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Receipt size={14} />
                <span>+ Expense</span>
              </button>
            )}

            <button
              onClick={() => setIsAddPaymentOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold border border-zinc-200 shadow-2xs flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
            >
              <ArrowDownLeft size={14} className="text-emerald-600" />
              <span>+ Payment</span>
            </button>
          </div>

          {/* Share Public Link Button (Icon on mobile, text on desktop) */}
          <button
            onClick={handleSharePublicLink}
            title="Copy Public Share Link (No Login Required)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            {copiedShareLink ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} className="text-emerald-600" />}
            <span className="hidden sm:inline text-xs">{copiedShareLink ? 'Copied!' : 'Public Link'}</span>
          </button>

          {/* AI Trigger Button */}
          <button
            onClick={() => setIsAiAssistantOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-linear-to-r from-amber-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 text-zinc-900 border border-amber-500/20 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles size={14} className="text-amber-500 fill-amber-400" />
            <span className="hidden sm:inline">Ask</span> AI
          </button>

          {/* Compact Circular Profile Avatar Button (Icon Only on Mobile!) */}
          <button
            onClick={() => setIsProfileOpen(true)}
            title="Account Options & Switch User"
            className="w-8.5 h-8.5 sm:w-auto sm:px-2.5 sm:py-1 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 font-black text-xs flex items-center justify-center">
              {currentUserProfile.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs font-bold">{currentUserProfile.name.split(' ')[0]}</span>
          </button>
        </div>
      </header>

      {/* iOS Slide Drawer Menu */}
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Profile & Switch Account Card Popup */}
      <ProfileModalCard isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};
