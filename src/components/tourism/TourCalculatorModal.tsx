import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
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

interface CalcMember {
  name: string;
  age: string;
  gender: 'Male' | 'Female' | 'Child';
}

export const TourCalculatorModal: React.FC<TourCalculatorModalProps> = ({
  isOpen,
  onClose,
  onTransferToBooking,
}) => {
  const { tourPricingSettings, setIsAddTourBookingOpen } = useData();

  const sleeperPrice = tourPricingSettings?.sleeperPrice ?? 13999;
  const acTrainPrice = tourPricingSettings?.acTrainPrice ?? 15999;
  const coupleRoomSurcharge = tourPricingSettings?.coupleRoomSurcharge ?? 3000;
  const child5To7Percent = tourPricingSettings?.child5To7Percent ?? 50;
  const child8To11Percent = tourPricingSettings?.child8To11Percent ?? 75;

  // STEP 1: Members & Ages
  const [members, setMembers] = useState<CalcMember[]>([
    { name: 'Member 1 (Adult)', age: '32', gender: 'Male' },
    { name: 'Member 2 (Adult)', age: '28', gender: 'Female' },
  ]);

  // STEP 2: Private / Personal Room count
  const [personalRoomsCount, setPersonalRoomsCount] = useState<number>(0);

  // STEP 3: Travel Class
  const [travelClass, setTravelClass] = useState<TravelClass>('AC Train');
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState<number | string>(15999);

  // Copy status
  const [copiedLang, setCopiedLang] = useState<'gu' | 'en' | null>(null);

  // Effective Base Rate per Adult
  const baseRate = useMemo(() => {
    if (isCustomRate) return Number(customRate) || 0;
    if (travelClass === 'Sleeper Train' || travelClass === 'Non-AC Sleeper' || travelClass === 'Non-AC Train') {
      return sleeperPrice;
    }
    return acTrainPrice;
  }, [isCustomRate, customRate, travelClass, sleeperPrice, acTrainPrice]);

  // Calculation Breakdown
  const breakdown = useMemo(() => {
    let adultsTotal = 0;
    let kidsTotal = 0;
    let adultsCount = 0;
    let kidsCount = 0;
    let infantsCount = 0;

    const passengerDetails = members.map((m, idx) => {
      const ageNum = Number(m.age || 0);
      let fare = baseRate;
      let discountLabelGu = 'સંપૂર્ણ ટિકિટ (100%)';
      let discountLabelEn = 'Full Fare (100%)';
      let tier: 'adult' | '5-7' | '8-11' | 'infant' = 'adult';

      if (ageNum > 0 && ageNum < 5) {
        fare = 0;
        discountLabelGu = 'મફત (<૫ વર્ષ: 0%)';
        discountLabelEn = 'Free (<5 yrs: 0%)';
        tier = 'infant';
        infantsCount++;
      } else if (ageNum >= 5 && ageNum <= 7) {
        fare = Math.round(baseRate * (child5To7Percent / 100));
        discountLabelGu = `બાળક (૫-૭ વર્ષ: ${child5To7Percent}%)`;
        discountLabelEn = `Child (5-7 yrs: ${child5To7Percent}%)`;
        tier = '5-7';
        kidsCount++;
      } else if (ageNum >= 8 && ageNum <= 11) {
        fare = Math.round(baseRate * (child8To11Percent / 100));
        discountLabelGu = `બાળક (૮-૧૧ વર્ષ: ${child8To11Percent}%)`;
        discountLabelEn = `Child (8-11 yrs: ${child8To11Percent}%)`;
        tier = '8-11';
        kidsCount++;
      } else {
        adultsCount++;
      }

      if (tier === 'adult') {
        adultsTotal += fare;
      } else {
        kidsTotal += fare;
      }

      return {
        index: idx + 1,
        name: m.name || `Member ${idx + 1}`,
        age: ageNum,
        fare,
        discountLabelGu,
        discountLabelEn,
        tier,
      };
    });

    const roomSurchargeTotal = personalRoomsCount * coupleRoomSurcharge;
    const grandTotal = adultsTotal + kidsTotal + roomSurchargeTotal;
    const avgPerPerson = members.length > 0 ? Math.round(grandTotal / members.length) : 0;

    return {
      adultsCount,
      kidsCount,
      infantsCount,
      adultsTotal,
      kidsTotal,
      roomSurchargeTotal,
      grandTotal,
      avgPerPerson,
      passengerDetails,
    };
  }, [members, baseRate, personalRoomsCount, coupleRoomSurcharge, child5To7Percent, child8To11Percent]);

  if (!isOpen) return null;

  // Member helpers
  const addPassenger = (age: string = '30') => {
    setMembers((prev) => [
      ...prev,
      {
        name: `Member ${prev.length + 1}`,
        age,
        gender: 'Male',
      },
    ]);
  };

  const removePassenger = (index: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof CalcMember, value: string) => {
    setMembers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const applyPreset = (adults: number, kidsAges: number[] = []) => {
    const newMembers: CalcMember[] = [];
    for (let i = 1; i <= adults; i++) {
      newMembers.push({
        name: `Member ${i} (Adult)`,
        age: '32',
        gender: i % 2 === 1 ? 'Male' : 'Female',
      });
    }
    kidsAges.forEach((age, idx) => {
      newMembers.push({
        name: `Child ${idx + 1}`,
        age: String(age),
        gender: 'Child',
      });
    });
    setMembers(newMembers);
  };

  const handleReset = () => {
    setTravelClass('AC Train');
    setIsCustomRate(false);
    setPersonalRoomsCount(0);
    setMembers([
      { name: 'Member 1 (Adult)', age: '32', gender: 'Male' },
      { name: 'Member 2 (Adult)', age: '28', gender: 'Female' },
    ]);
  };

  // Generate Gujarati Quotation
  const generateGujaratiQuoteText = () => {
    const classLabelGu =
      travelClass === 'AC Train' || travelClass === '3AC Train'
        ? '3AC ટ્રેન ડીલક્સ (AC Train Deluxe)'
        : 'સ્લીપર ટ્રેન (Sleeper Coach)';

    const lines = [
      `🚩 *સંજરી ટુર્સ એન્ડ ટ્રાવેલ્સ - ભુજ (કચ્છ)* 🚩`,
      `📋 *ફેમિલી ટૂર પેકેજ ક્વોટેશન / અંદાજ*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🚆 *ટ્રાવેલ ક્લાસ:* ${classLabelGu}`,
      `🏷️ *મૂળ ભાડું (પુખ્ત):* ₹${baseRate.toLocaleString('en-IN')} / વ્યક્તિ`,
      `👥 *કુલ સભ્યો (PAX):* ${members.length} વ્યક્તિ (${breakdown.adultsCount} પુખ્ત, ${breakdown.kidsCount} બાળક, ${breakdown.infantsCount} નાના બાળક)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*મુસાફરોની વિગતવાર ટિકિટ:*`,
      ...breakdown.passengerDetails.map(
        (p) => `• મુસાફર ${p.index} (ઉંમર ${p.age} વર્ષ): ₹${p.fare.toLocaleString('en-IN')} _(${p.discountLabelGu})_`
      ),
      ...(personalRoomsCount > 0
        ? [
            `━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🏨 *પ્રાઇવેટ / પર્સનલ રૂમ:* ${personalRoomsCount} રૂમ × ₹${coupleRoomSurcharge.toLocaleString('en-IN')} = +₹${breakdown.roomSurchargeTotal.toLocaleString('en-IN')}`,
          ]
        : []),
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *કુલ ફેમિલી પેકેજ રકમ: ₹${breakdown.grandTotal.toLocaleString('en-IN')}*`,
      `📊 *સરેરાશ વ્યક્તિ દીઠ: ₹${breakdown.avgPerPerson.toLocaleString('en-IN')}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *ટૂર પેકેજમાં સામેલ:*`,
      `• કન્ફર્મ ટ્રેન ટિકિટ (આવવા-જવા)`,
      `• પ્રીમિયમ હોટેલ / રિસોર્ટમાં રોકાણ`,
      `• સવારનો ચા-નાસ્તો અને સ્વાદિષ્ટ ડિનર (શુદ્ધ શાકાહારી / જૈન ભોજન ઉપલબ્ધ)`,
      `• તમામ સાઈટસીઈંગ સ્પેશિયલ વાહનમાં`,
      `• અનુભવી ટૂર મેનેજરની 24x7 સેવા`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📞 *બુકિંગ અને વધુ માહિતી માટે સંપર્ક કરો:*`,
      `સંજરી ટુર્સ એન્ડ ટ્રાવેલ્સ, ભુજ`,
      `મોબાઈલ: 99098 57240 / 63536 64924`,
      `📍 ભુજ - કચ્છ (ગુજરાત)`,
    ];

    return lines.join('\n');
  };

  // Generate English Quotation
  const generateEnglishQuoteText = () => {
    const classLabelEn =
      travelClass === 'AC Train' || travelClass === '3AC Train'
        ? '3AC Train Deluxe (AC Coach + Deluxe Hotel)'
        : 'Sleeper Train (Sleeper Coach + Deluxe Hotel)';

    const lines = [
      `🚩 *SANZARI TOURS & TRAVELS - BHUJ (KUTCH)* 🚩`,
      `📋 *Family Tour Package Quotation*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🚆 *Travel Class:* ${classLabelEn}`,
      `🏷️ *Base Fare (Adult):* ₹${baseRate.toLocaleString('en-IN')} / person`,
      `👥 *Total Family Members (PAX):* ${members.length} Persons (${breakdown.adultsCount} Adults, ${breakdown.kidsCount} Kids, ${breakdown.infantsCount} Infants)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*Passenger Breakdown:*`,
      ...breakdown.passengerDetails.map(
        (p) => `• Passenger ${p.index} (Age ${p.age}): ₹${p.fare.toLocaleString('en-IN')} _(${p.discountLabelEn})_`
      ),
      ...(personalRoomsCount > 0
        ? [
            `━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🏨 *Private / Separate Room:* ${personalRoomsCount} Room(s) × ₹${coupleRoomSurcharge.toLocaleString('en-IN')} = +₹${breakdown.roomSurchargeTotal.toLocaleString('en-IN')}`,
          ]
        : []),
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *TOTAL FAMILY PACKAGE COST: ₹${breakdown.grandTotal.toLocaleString('en-IN')}*`,
      `📊 *Average Per Person: ₹${breakdown.avgPerPerson.toLocaleString('en-IN')}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Tour Package Inclusions:*`,
      `• Confirmed Round-Trip Train Tickets`,
      `• Premium Hotel / Resort Accommodation`,
      `• Daily Morning Breakfast & Delicious Dinner (Pure Veg / Jain Available)`,
      `• All Sightseeing & Transfers in dedicated vehicle`,
      `• 24x7 Experienced Tour Manager Support`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📞 *For Booking & Details, Contact:*`,
      `Sanzari Tours & Travels, Bhuj`,
      `Mobile: 99098 57240 / 63536 64924`,
      `📍 Bhuj - Kutch (Gujarat)`,
    ];

    return lines.join('\n');
  };

  const handleCopy = (lang: 'gu' | 'en') => {
    const text = lang === 'gu' ? generateGujaratiQuoteText() : generateEnglishQuoteText();
    navigator.clipboard.writeText(text);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(null), 2500);
  };

  const handleWhatsApp = (lang: 'gu' | 'en') => {
    const text = lang === 'gu' ? generateGujaratiQuoteText() : generateEnglishQuoteText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleTransferToBooking = () => {
    if (onTransferToBooking) {
      onTransferToBooking({
        travelClass,
        adultsCount: breakdown.adultsCount,
        kidsCount: breakdown.kidsCount + breakdown.infantsCount,
        couplesCount: personalRoomsCount,
        totalAmount: breakdown.grandTotal,
        members: members.map((m) => ({
          name: m.name,
          age: m.age,
          gender: m.gender,
        })),
      });
    } else {
      setIsAddTourBookingOpen(true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      {/* Light Theme Modal Container */}
      <div className="relative w-full max-w-2xl bg-white text-zinc-950 rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header - Clean English */}
        <div className="bg-white px-5 sm:px-6 py-4 border-b-2 border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
              <Calculator className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950">
                  Tour Fare &amp; Family Cost Calculator
                </h2>
                <span className="text-[10px] font-mono font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-lg border border-blue-300">
                  Instant Calculator
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">
                Calculate family package cost with child discounts, private rooms &amp; quick quote buttons
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body - 3 Clear Steps */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1 bg-zinc-50/60">
          
          {/* STEP 1: MEMBERS & AGES */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-black">
                  1
                </span>
                <span>1. Add Family Members &amp; Ages</span>
              </span>

              <button
                type="button"
                onClick={() => addPassenger()}
                className="px-2.5 py-1 bg-zinc-950 hover:bg-black text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus size={13} /> + Add Member
              </button>
            </div>

            {/* Quick Family Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-black uppercase text-zinc-500 mr-1">Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset(2)}
                className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md font-bold text-[11px] border border-zinc-300 cursor-pointer"
              >
                2 Adults
              </button>
              <button
                type="button"
                onClick={() => applyPreset(2, [6])}
                className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md font-bold text-[11px] border border-zinc-300 cursor-pointer"
              >
                2 Adults + 1 Kid (6y)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(2, [6, 3])}
                className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md font-bold text-[11px] border border-zinc-300 cursor-pointer"
              >
                2 Adults + 2 Kids
              </button>
              <button
                type="button"
                onClick={() => applyPreset(4)}
                className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md font-bold text-[11px] border border-zinc-300 cursor-pointer"
              >
                4 Adults
              </button>
            </div>

            {/* Child Discount Tiers Banner */}
            <div className="text-[10px] text-zinc-700 bg-amber-50 p-2 rounded-xl border border-amber-300 flex items-center justify-between flex-wrap gap-1 font-semibold">
              <span>👶 <strong>Child Age Discounts:</strong></span>
              <span className="text-emerald-800 font-black">&lt;5 yrs: Free (0%)</span>
              <span>•</span>
              <span className="text-amber-800 font-black">5-7 yrs: {child5To7Percent}% Fare</span>
              <span>•</span>
              <span className="text-sky-800 font-black">8-11 yrs: {child8To11Percent}% Fare</span>
              <span>•</span>
              <span className="text-zinc-800 font-black">12+ yrs: Full Fare</span>
            </div>

            {/* Passenger Rows */}
            <div className="space-y-2 pt-1">
              {breakdown.passengerDetails.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-zinc-50 border-2 border-zinc-900 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-zinc-950 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={members[idx]?.name || ''}
                      onChange={(e) => updateMember(idx, 'name', e.target.value)}
                      placeholder={`Member ${idx + 1}`}
                      className="w-32 sm:w-44 bg-white border border-zinc-300 rounded-lg px-2 py-1 text-xs font-bold text-zinc-900 focus:outline-none"
                    />

                    {/* Age Input */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-zinc-700 font-bold">Age:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={members[idx]?.age || ''}
                        onChange={(e) => updateMember(idx, 'age', e.target.value)}
                        placeholder="Age"
                        className="w-14 bg-white border-2 border-zinc-900 rounded-lg px-1.5 py-1 text-center font-mono font-black text-xs text-zinc-950 focus:outline-none"
                      />
                    </div>

                    {/* Fare Tier Badge */}
                    <span
                      className={`hidden sm:inline-block px-2 py-0.5 rounded-md border text-[10px] font-black shrink-0 ${
                        p.tier === 'infant'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : p.tier === '5-7'
                          ? 'bg-amber-100 text-amber-900 border-amber-400'
                          : p.tier === '8-11'
                          ? 'bg-sky-100 text-sky-900 border-sky-400'
                          : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      {p.discountLabelEn}
                    </span>
                  </div>

                  {/* Individual Fare Amount */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black text-xs text-zinc-950">
                      ₹{p.fare.toLocaleString('en-IN')}
                    </span>

                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePassenger(idx)}
                        className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 2: PRIVATE / PERSONAL ROOM */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-pink-600 text-white flex items-center justify-center text-[11px] font-black">
                  2
                </span>
                <span>2. Personal / Private Room Selection</span>
              </span>
              <span className="text-[10px] text-pink-900 font-bold bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                +₹{coupleRoomSurcharge.toLocaleString('en-IN')} / room
              </span>
            </div>

            <div className="p-3 bg-pink-50/70 rounded-xl border-2 border-pink-300 flex items-center justify-between">
              <div>
                <span className="font-black text-xs text-pink-950 block">
                  💑 Separate Couple / Private Room
                </span>
                <span className="text-[10px] text-pink-800 font-medium">
                  Extra surcharge for dedicated private room (+₹{coupleRoomSurcharge.toLocaleString('en-IN')} per room)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPersonalRoomsCount((p) => Math.max(0, p - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-pink-300 hover:bg-pink-100 text-pink-950 font-black flex items-center justify-center cursor-pointer text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center font-black font-mono text-base text-pink-950">
                  {personalRoomsCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPersonalRoomsCount((p) => p + 1)}
                  className="w-8 h-8 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-black flex items-center justify-center cursor-pointer text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* STEP 3: TRAVEL CLASS (AC / SLEEPER) */}
          <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px] font-black">
                  3
                </span>
                <span>3. Select Travel Class (Train Coach)</span>
              </span>
              <span className="text-[11px] font-mono font-black text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                Base Fare: ₹{baseRate.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTravelClass('AC Train');
                  setIsCustomRate(false);
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  !isCustomRate && (travelClass === 'AC Train' || travelClass === '3AC Train')
                    ? 'bg-blue-50 border-blue-600 text-zinc-950 ring-2 ring-blue-600 shadow-sm'
                    : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-zinc-950 flex items-center gap-1.5">
                    🚆 3AC Train Deluxe
                  </span>
                  <span className="text-xs font-black text-blue-700 font-mono">
                    ₹{acTrainPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">AC Coach + Deluxe Hotel Stay</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTravelClass('Sleeper Train');
                  setIsCustomRate(false);
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  !isCustomRate && (travelClass === 'Sleeper Train' || travelClass === 'Non-AC Sleeper')
                    ? 'bg-amber-50 border-amber-600 text-zinc-950 ring-2 ring-amber-600 shadow-sm'
                    : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-zinc-950 flex items-center gap-1.5">
                    🚂 Sleeper Train
                  </span>
                  <span className="text-xs font-black text-amber-700 font-mono">
                    ₹{sleeperPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Non-AC Sleeper Coach + Deluxe Hotel Stay</p>
              </button>
            </div>

            {/* Custom Manual Price Toggle */}
            <div className="pt-1 flex items-center justify-between flex-wrap gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-800">
                <input
                  type="checkbox"
                  checked={isCustomRate}
                  onChange={(e) => setIsCustomRate(e.target.checked)}
                  className="rounded border-zinc-400 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Custom / Manual Base Fare</span>
              </label>

              {isCustomRate && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-zinc-600">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder="e.g. 17500"
                    className="w-32 bg-zinc-50 border-2 border-zinc-900 rounded-xl px-2.5 py-1 font-mono font-black text-zinc-950 text-xs focus:bg-white focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 font-medium">per adult</span>
                </div>
              )}
            </div>
          </div>

          {/* AUTOMATIC LIVE CALCULATION & BREAKDOWN CARD */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 text-white shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                Live Calculation Breakdown
              </span>
              <span className="text-[11px] font-bold text-zinc-300">
                {breakdown.adultsCount} Adults • {breakdown.kidsCount} Kids • {breakdown.infantsCount} Free Infants
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-bold block">Adults Fare ({breakdown.adultsCount})</span>
                <span className="font-mono font-black text-sm text-white">
                  ₹{breakdown.adultsTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-amber-400 font-bold block">Kids Fare ({breakdown.kidsCount})</span>
                <span className="font-mono font-black text-sm text-amber-400">
                  ₹{breakdown.kidsTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-pink-400 font-bold block">
                  Private Room ({personalRoomsCount})
                </span>
                <span className="font-mono font-black text-sm text-pink-400">
                  +₹{breakdown.roomSurchargeTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-950/80 border border-blue-800/80">
                <span className="text-[10px] text-blue-300 font-bold block">Average / Person</span>
                <span className="font-mono font-black text-sm text-blue-200">
                  ₹{breakdown.avgPerPerson.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Total Display & Create Booking */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-zinc-400 block">
                  Total Family Package Cost
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                  ₹{breakdown.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleTransferToBooking}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                title="Transfer details directly into New Booking form"
              >
                <span>+ Create Tour Booking</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Action Buttons: Clean Copy & WhatsApp Buttons */}
            <div className="pt-3 border-t border-zinc-800">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Share Quotation:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Copy Gujarati */}
                <button
                  type="button"
                  onClick={() => handleCopy('gu')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    copiedLang === 'gu'
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                  }`}
                  title="Copy Gujarati Quotation to clipboard"
                >
                  {copiedLang === 'gu' ? <Check size={14} className="stroke-[3]" /> : <Copy size={13} />}
                  <span>{copiedLang === 'gu' ? 'ગુજરાતી Copied!' : '📋 Copy Gujarati'}</span>
                </button>

                {/* Copy English */}
                <button
                  type="button"
                  onClick={() => handleCopy('en')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    copiedLang === 'en'
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                  }`}
                  title="Copy English Quotation to clipboard"
                >
                  {copiedLang === 'en' ? <Check size={14} className="stroke-[3]" /> : <Copy size={13} />}
                  <span>{copiedLang === 'en' ? 'English Copied!' : '📋 Copy English'}</span>
                </button>

                {/* WhatsApp Gujarati */}
                <button
                  type="button"
                  onClick={() => handleWhatsApp('gu')}
                  className="px-3 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Send Gujarati quotation directly via WhatsApp"
                >
                  <MessageCircle size={14} />
                  <span>📲 WhatsApp (Gujarati)</span>
                </button>

                {/* WhatsApp English */}
                <button
                  type="button"
                  onClick={() => handleWhatsApp('en')}
                  className="px-3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Send English quotation directly via WhatsApp"
                >
                  <MessageCircle size={14} />
                  <span>📲 WhatsApp (English)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-5 sm:px-6 py-3 border-t-2 border-zinc-900 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-zinc-600 hover:text-black font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset Form</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
