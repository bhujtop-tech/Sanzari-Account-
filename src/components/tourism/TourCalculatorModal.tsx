import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  Copy,
  Check,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { TravelClass } from '../../types';

interface TourCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferToBooking?: (prefillData: {
    travelClass: TravelClass;
    adultsCount: number;
    kidsCount: number;
    couplesCount: number;
    totalAmount: number;
    members: { name: string; age: string; gender: string }[];
  }) => void;
}

interface ChildEntry {
  age: string;
  dob: string;
}

const calculateAgeFromDob = (dobString: string): number | null => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

export const TourCalculatorModal: React.FC<TourCalculatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { tourPricingSettings, customTourPackages } = useData();

  const sleeperPrice = tourPricingSettings?.sleeperPrice ?? 14000;
  const acTrainPrice = tourPricingSettings?.acTrainPrice ?? 16000;
  const coupleRoomSurcharge = tourPricingSettings?.coupleRoomSurcharge ?? 3000;
  const child5To7Percent = tourPricingSettings?.child5To7Percent ?? 50;
  const child8To11Percent = tourPricingSettings?.child8To11Percent ?? 82;

  // 1. Simple Adults Count & Children List
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [children, setChildren] = useState<ChildEntry[]>([]);
  const [privateRooms, setPrivateRooms] = useState<number>(0);

  // 2. Package / Class Selection
  const [selectedPackageId, setSelectedPackageId] = useState<string>('default');
  const [travelClass, setTravelClass] = useState<TravelClass>('AC Train');
  const [customRate, setCustomRate] = useState<string>('');

  const [copied, setCopied] = useState(false);

  // Selected custom package (if user picks one from saved packages)
  const selectedCustomPkg = useMemo(
    () => customTourPackages.find((p) => p.id === selectedPackageId) || null,
    [customTourPackages, selectedPackageId]
  );

  // Base Adult Rate
  const baseRate = useMemo(() => {
    if (customRate && Number(customRate) > 0) return Number(customRate);
    if (selectedCustomPkg) {
      return travelClass === 'Sleeper Train'
        ? selectedCustomPkg.priceNonAcTrain || sleeperPrice
        : selectedCustomPkg.priceAcTrain || acTrainPrice;
    }
    return travelClass === 'Sleeper Train' ? sleeperPrice : acTrainPrice;
  }, [customRate, selectedCustomPkg, travelClass, sleeperPrice, acTrainPrice]);

  // Calculation Breakdown
  const calculation = useMemo(() => {
    const adultsTotal = adultsCount * baseRate;
    let kidsTotal = 0;

    const kidsDetails = children.map((child, idx) => {
      const ageNum = child.age !== '' ? Number(child.age) : 6;
      let fare = 0;
      let label = 'Free (<5y)';

      if (ageNum < 5) {
        fare = 0;
        label = 'Free (0%)';
      } else if (ageNum >= 5 && ageNum <= 7) {
        fare = Math.round(baseRate * (child5To7Percent / 100));
        label = `${child5To7Percent}% Fare`;
      } else if (ageNum >= 8 && ageNum <= 11) {
        fare = Math.round(baseRate * (child8To11Percent / 100));
        label = `${child8To11Percent}% Fare`;
      } else {
        fare = baseRate;
        label = 'Full Fare (12+y)';
      }

      kidsTotal += fare;
      return { index: idx + 1, age: ageNum, fare, label };
    });

    const roomsTotal = privateRooms * coupleRoomSurcharge;
    const grandTotal = adultsTotal + kidsTotal + roomsTotal;

    return {
      adultsTotal,
      kidsTotal,
      roomsTotal,
      grandTotal,
      kidsDetails,
    };
  }, [adultsCount, children, baseRate, privateRooms, coupleRoomSurcharge, child5To7Percent, child8To11Percent]);

  if (!isOpen) return null;

  const handleChildrenCountChange = (newCount: number) => {
    const safeCount = Math.max(0, Math.min(15, newCount));
    setChildren((prev) => {
      if (safeCount > prev.length) {
        const added = Array.from({ length: safeCount - prev.length }, () => ({
          age: '6',
          dob: '',
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, safeCount);
    });
  };

  const updateChildAge = (idx: number, ageVal: string) => {
    setChildren((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], age: ageVal, dob: '' };
      return next;
    });
  };

  const updateChildDob = (idx: number, dobVal: string) => {
    const calcAge = calculateAgeFromDob(dobVal);
    setChildren((prev) => {
      const next = [...prev];
      next[idx] = {
        dob: dobVal,
        age: calcAge !== null ? String(calcAge) : next[idx].age,
      };
      return next;
    });
  };

  const handleReset = () => {
    setAdultsCount(2);
    setChildren([]);
    setPrivateRooms(0);
    setSelectedPackageId('default');
    setTravelClass('AC Train');
    setCustomRate('');
  };

  const buildShareText = () => {
    const pkgTitle = selectedCustomPkg ? selectedCustomPkg.packageName : 'Family Tour Package';
    const classTitle = travelClass === 'AC Train' ? '3AC Train Deluxe' : 'Sleeper Train';
    const lines = [
      `*SANZARI TOURS & TRAVELS*`,
      `*Package:* ${pkgTitle} (${classTitle})`,
      `*Rate:* ₹${baseRate.toLocaleString('en-IN')} / Adult`,
      `------------------------`,
      `• Adults (${adultsCount}): ₹${calculation.adultsTotal.toLocaleString('en-IN')}`,
      ...(calculation.kidsDetails.length > 0
        ? calculation.kidsDetails.map(
            (k) => `• Child ${k.index} (${k.age} yrs - ${k.label}): ₹${k.fare.toLocaleString('en-IN')}`
          )
        : []),
      ...(privateRooms > 0
        ? [`• Private Room (${privateRooms}): +₹${calculation.roomsTotal.toLocaleString('en-IN')}`]
        : []),
      `------------------------`,
      `*TOTAL AMOUNT: ₹${calculation.grandTotal.toLocaleString('en-IN')}*`,
    ];
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white text-zinc-950 rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden">
        {/* Compact Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Calculator size={17} className="stroke-[2.5]" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-zinc-950">
              Quick Tour Calculator
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleReset}
              title="Reset"
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 transition-colors cursor-pointer"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-200/70 hover:bg-zinc-300 flex items-center justify-center text-zinc-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Single-Screen Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* 1. Adults, Children & Private Room Counters */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Adults Counter */}
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-between">
              <span className="text-[11px] font-black uppercase text-zinc-700">Adults</span>
              <span className="text-[10px] text-zinc-400 font-semibold mb-1.5">12+ Years</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdultsCount((c) => Math.max(1, c - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-zinc-300 hover:bg-zinc-100 font-black text-sm flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={adultsCount}
                  onChange={(e) => setAdultsCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-9 text-center font-mono font-black text-sm text-zinc-950 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAdultsCount((c) => c + 1)}
                  className="w-7 h-7 rounded-lg bg-zinc-950 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Children Counter */}
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col items-center justify-between">
              <span className="text-[11px] font-black uppercase text-amber-950">Children</span>
              <span className="text-[10px] text-amber-700 font-semibold mb-1.5">Under 12 Yrs</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChildrenCountChange(children.length - 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-black text-sm flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="w-7 text-center font-mono font-black text-sm text-amber-950">
                  {children.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleChildrenCountChange(children.length + 1)}
                  className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Separate Room Counter */}
            <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-200 flex flex-col items-center justify-between">
              <span className="text-[11px] font-black uppercase text-pink-950">Private Room</span>
              <span className="text-[10px] text-pink-700 font-semibold mb-1.5">+₹{coupleRoomSurcharge}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrivateRooms((r) => Math.max(0, r - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-pink-300 hover:bg-pink-100 text-pink-950 font-black text-sm flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="w-7 text-center font-mono font-black text-sm text-pink-950">
                  {privateRooms}
                </span>
                <button
                  type="button"
                  onClick={() => setPrivateRooms((r) => r + 1)}
                  className="w-7 h-7 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 2. Children Age / DOB Inputs (Only shown if Children > 0) */}
          {children.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-2 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                <span>CHILD AGE OR DATE OF BIRTH (DOB)</span>
                <span>&lt;5y: Free • 5-7y: {child5To7Percent}% • 8-11y: {child8To11Percent}%</span>
              </div>
              {children.map((child, idx) => {
                const detail = calculation.kidsDetails[idx];
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-amber-200 text-xs"
                  >
                    <span className="font-black text-zinc-800 shrink-0">
                      Child {idx + 1}
                    </span>

                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      {/* DOB Picker */}
                      <input
                        type="date"
                        value={child.dob}
                        onChange={(e) => updateChildDob(idx, e.target.value)}
                        title="Select Child Date of Birth"
                        className="bg-zinc-50 border border-zinc-300 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-700 focus:outline-none"
                      />

                      <span className="text-[10px] text-zinc-400 font-bold">OR</span>

                      {/* Direct Age Input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={17}
                          value={child.age}
                          onChange={(e) => updateChildAge(idx, e.target.value)}
                          placeholder="Age"
                          className="w-12 bg-zinc-50 border border-zinc-900 rounded-lg px-1.5 py-1 text-center font-mono font-black text-xs text-zinc-950 focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-zinc-500">yr</span>
                      </div>

                      {/* Calculated Child Fare */}
                      <span className="min-w-[62px] text-right font-mono font-black text-xs text-amber-900">
                        ₹{detail?.fare.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Select Package & Train Class */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase text-zinc-600">
                Select Package &amp; Class
              </span>
              {customTourPackages.length > 0 && (
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="bg-zinc-100 border border-zinc-300 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-900 focus:outline-none max-w-[210px] truncate"
                >
                  <option value="default">Standard Tour Package</option>
                  {customTourPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.packageName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTravelClass('AC Train');
                  setCustomRate('');
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                  !customRate && travelClass === 'AC Train'
                    ? 'bg-blue-50 border-blue-600 text-zinc-950 shadow-2xs'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                }`}
              >
                <div>
                  <span className="font-black text-xs block">🚆 3AC Train</span>
                  <span className="text-[10px] text-zinc-500 font-semibold">AC Package</span>
                </div>
                <span className="font-mono font-black text-sm text-blue-700">
                  ₹{(selectedCustomPkg?.priceAcTrain || acTrainPrice).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTravelClass('Sleeper Train');
                  setCustomRate('');
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                  !customRate && travelClass === 'Sleeper Train'
                    ? 'bg-amber-50 border-amber-600 text-zinc-950 shadow-2xs'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                }`}
              >
                <div>
                  <span className="font-black text-xs block">🚂 Sleeper</span>
                  <span className="text-[10px] text-zinc-500 font-semibold">Non-AC Package</span>
                </div>
                <span className="font-mono font-black text-sm text-amber-700">
                  ₹{(selectedCustomPkg?.priceNonAcTrain || sleeperPrice).toLocaleString('en-IN')}
                </span>
              </button>
            </div>

            {/* Optional Custom Rate input */}
            <div className="flex items-center justify-between px-1 pt-0.5">
              <span className="text-[11px] font-bold text-zinc-500">Custom Adult Rate (Optional):</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-zinc-500">₹</span>
                <input
                  type="number"
                  min={0}
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  placeholder={String(baseRate)}
                  className="w-24 bg-zinc-50 border border-zinc-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Compact Total Result & Share Box */}
          <div className="p-4 rounded-2xl bg-zinc-950 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">
                  Total Package Cost ({adultsCount} Adult{adultsCount > 1 ? 's' : ''}
                  {children.length > 0 ? ` + ${children.length} Kid${children.length > 1 ? 's' : ''}` : ''})
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  ₹{calculation.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="text-right text-[11px] text-zinc-300 font-mono space-y-0.5">
                <div>Adults: ₹{calculation.adultsTotal.toLocaleString('en-IN')}</div>
                {children.length > 0 && (
                  <div className="text-amber-300">Kids: ₹{calculation.kidsTotal.toLocaleString('en-IN')}</div>
                )}
                {privateRooms > 0 && (
                  <div className="text-pink-300">Room: +₹{calculation.roomsTotal.toLocaleString('en-IN')}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleCopy}
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Quote'}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <MessageCircle size={14} />
                <span>WhatsApp Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
