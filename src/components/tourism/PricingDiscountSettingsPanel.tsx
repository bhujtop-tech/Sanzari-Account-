import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface PricingDiscountSettingsPanelProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const PricingDiscountSettingsPanel: React.FC<PricingDiscountSettingsPanelProps> = ({
  onClose,
  isModal = false,
}) => {
  const { tourPricingSettings, updateTourPricing } = useData();

  const [sleeperPrice, setSleeperPrice] = useState<number | string>(tourPricingSettings?.sleeperPrice ?? 13999);
  const [acTrainPrice, setAcTrainPrice] = useState<number | string>(tourPricingSettings?.acTrainPrice ?? 15999);
  const [coupleRoomSurcharge, setCoupleRoomSurcharge] = useState<number | string>(tourPricingSettings?.coupleRoomSurcharge ?? 3000);
  const [child5To7Percent, setChild5To7Percent] = useState<number | string>(tourPricingSettings?.child5To7Percent ?? 50);
  const [child8To11Percent, setChild8To11Percent] = useState<number | string>(tourPricingSettings?.child8To11Percent ?? 75);

  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep local form in sync when Firestore pricing updates
  useEffect(() => {
    if (tourPricingSettings) {
      setSleeperPrice(tourPricingSettings.sleeperPrice ?? 13999);
      setAcTrainPrice(tourPricingSettings.acTrainPrice ?? 15999);
      setCoupleRoomSurcharge(tourPricingSettings.coupleRoomSurcharge ?? 3000);
      setChild5To7Percent(tourPricingSettings.child5To7Percent ?? 50);
      setChild8To11Percent(tourPricingSettings.child8To11Percent ?? 75);
    }
  }, [tourPricingSettings]);

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);

    try {
      const payload = {
        sleeperPrice: Math.max(0, Number(sleeperPrice) || 13999),
        acTrainPrice: Math.max(0, Number(acTrainPrice) || 15999),
        coupleRoomSurcharge: Math.max(0, Number(coupleRoomSurcharge) || 3000),
        child5To7Percent: Math.max(0, Math.min(100, Number(child5To7Percent) || 50)),
        child8To11Percent: Math.max(0, Math.min(100, Number(child8To11Percent) || 75)),
      };

      await updateTourPricing(payload);

      setShowSavedToast(true);
      setTimeout(() => {
        setShowSavedToast(false);
      }, 3000);
    } catch (err: any) {
      console.error('Failed to save tour pricing settings:', err);
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <div className="bg-white rounded-3xl border-2 border-zinc-900 shadow-xl overflow-hidden p-5 sm:p-6 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
            <Sliders size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-zinc-950 flex items-center gap-2">
              <span>Pricing &amp; Discount Settings</span>
            </h3>
            <p className="text-[11px] text-zinc-500 font-medium">
              Configure package rates, couple room surcharge, and child discount percentages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-xl text-xs font-bold">
          ⚠️ {errorMsg}
        </div>
      )}

      {showSavedToast && (
        <div className="p-2.5 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 rounded-xl text-xs font-black flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Settings saved and synced to Firestore collection `settings/tourPricing`!</span>
        </div>
      )}

      {/* 5-Column Responsive Inputs - Matching Screenshot */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Sleeper Train Package Price */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-800">
              Sleeper Train Package Price (₹)
            </label>
            <input
              type="number"
              required
              min={0}
              value={sleeperPrice}
              onChange={(e) => setSleeperPrice(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-black text-sm font-mono focus:bg-white focus:outline-none"
            />
          </div>

          {/* 3AC Train Package Price */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-800">
              3AC Train Package Price (₹)
            </label>
            <input
              type="number"
              required
              min={0}
              value={acTrainPrice}
              onChange={(e) => setAcTrainPrice(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-black text-sm font-mono focus:bg-white focus:outline-none"
            />
          </div>

          {/* Couple Room Surcharge */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-800">
              Couple Room Surcharge (₹)
            </label>
            <input
              type="number"
              required
              min={0}
              value={coupleRoomSurcharge}
              onChange={(e) => setCoupleRoomSurcharge(e.target.value)}
              className="w-full bg-pink-50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-pink-700 font-black text-sm font-mono focus:bg-white focus:outline-none"
            />
          </div>

          {/* Child 5-7 Yrs Ticket Fare (%) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-800">
              Child 5–7 Yrs Ticket Fare (%)
            </label>
            <input
              type="number"
              required
              min={0}
              max={100}
              value={child5To7Percent}
              onChange={(e) => setChild5To7Percent(e.target.value)}
              className="w-full bg-amber-50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-amber-900 font-black text-sm font-mono focus:bg-white focus:outline-none"
            />
          </div>

          {/* Child 8-11 Yrs Ticket Fare (%) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-800">
              Child 8–11 Yrs Ticket Fare (%)
            </label>
            <input
              type="number"
              required
              min={0}
              max={100}
              value={child8To11Percent}
              onChange={(e) => setChild8To11Percent(e.target.value)}
              className="w-full bg-sky-50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-sky-900 font-black text-sm font-mono focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Action Button: Orange Save Settings */}
        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>{isSaving ? 'Saving to Firestore...' : '💾 Save Settings'}</span>
          </button>

          <span className="text-[11px] font-medium text-zinc-500">
            Changes apply instantly to current and upcoming bookings
          </span>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
