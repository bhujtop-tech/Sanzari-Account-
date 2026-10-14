import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Phone,
  User,
  Share2,
  Calendar,
  MapPin,
  Train,
  Building,
  Utensils,
  Plus,
  HelpCircle,
  Copy,
  Check,
  Package,
  Layers,
  FileText,
  Clock,
  Send,
  Edit3,
  Bus,
  ShieldCheck,
  Flame,
  Camera,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CustomTourPackage } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const PackageExplainerModal: React.FC = () => {
  const {
    isPackageExplainerOpen,
    setIsPackageExplainerOpen,
    customTourPackages,
    setIsAddTourBookingOpen,
    setIsAddTourInquiryOpen,
    setIsCustomPackageModalOpen,
    openEditCustomPackageModal,
  } = useData();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);

  // Active selected package or default to Kashmir Season Special
  const activePackage = useMemo<CustomTourPackage | null>(() => {
    if (selectedPackageId) {
      const found = customTourPackages.find((p) => p.id === selectedPackageId);
      if (found) return found;
    }
    const kashmir = customTourPackages.find(
      (p) => p.packageName.includes('SEASON SPECIAL') || p.packageCode.includes('SEASON-SPECIAL')
    );
    return kashmir || customTourPackages[0] || null;
  }, [customTourPackages, selectedPackageId]);

  if (!isPackageExplainerOpen) return null;

  const handleCopyWhatsAppScript = () => {
    if (!activePackage) return;

    const script = `🔊 *${activePackage.packageName || 'KASHMIR SEASON SPECIAL ❄️🏔️'}*

😍 ✨*Sanzari Tours & Travels Presents*✨
🥳 ${activePackage.packageNameGujarati || 'Chalo Kashmir... Chalo Kashmir...!'} 🥳

━━━━━━━━━━━━━━━

📆 *Departure Date* : 11 November 2025
🚆 *Tour Duration* : ${activePackage.durationDays || 9} Days (${activePackage.durationNights || 8} Nights)

💸 *Package Rates* :
🎫 *Sleeper Train Package* ➡️ ₹${(activePackage.priceNonAcTrain || 13999).toLocaleString()}/- Per Person
🚆 *3AC Train Package* ➡️ ₹${(activePackage.priceAcTrain || 15999).toLocaleString()}/- Per Person
👫 *Private Couple Room* ➡️ ₹3,000/- Extra Per Couple

━━━━━━━━━━━━━━━

🏨 *Facilities & Inclusions* 🍱🚘🏞️
${(
  activePackage.inclusionsGujarati || [
    'Bhuj se Jammu tak AC Sleeper Bus aur Sleeper Train',
    'Jammu se 6 Days ke liye Private Car',
    'Kashmir me 5 Nights Stay (Deluxe Hotels)',
    '2 Star Hotel me 4-Bed Deluxe Room',
    'Daily Breakfast + Dinner Included (100% Pure Veg) 🍽️',
    '35 Years ke Experience ke sath Best Management 💯',
  ]
)
  .map((inc) => `✅ ${inc}`)
  .join('\n')}

━━━━━━━━━━━━━━━

❄️ *Kashmir Sightseeing Locations* 🏔️
📍 Srinagar City • Dal Lake Shikara • Shankaracharya Temple • Shalimar Garden • Mughal Garden • Nishat Bagh • Hazratbal • Ganderbal (Sindh River) • Sonamarg Glacier • Gulmarg Hill Station • Apple Valley 🍎 • Kesar Valley 🌸 • Bat Factory • Pahalgam • Aishmuqam

━━━━━━━━━━━━━━━

📞 *Booking aur Guidance ke liye Contact Karein* :
🌍 *Sanzari Tourism*
👤 *Rizvan Khalifa*
📱 *7874635992*

━━━━━━━━━━━━━━━
⚠️ *NOTE* : Shikara, Gondola, Horse Ride, Union Cab & Personal Shopping Extra.
🔥 *LIMITED SEATS AVAILABLE* - Abhi Call karke Seat Confirm Karein!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(script);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    }
  };

  const handleCreateBooking = () => {
    setIsPackageExplainerOpen(false);
    setIsAddTourBookingOpen(true);
  };

  const handleCreateInquiry = () => {
    setIsPackageExplainerOpen(false);
    setIsAddTourInquiryOpen(true);
  };

  const steps = [
    { num: 1, title: '📌 Overview', color: 'from-amber-500 to-orange-500' },
    { num: 2, title: '💸 Pricing & Rates', color: 'from-emerald-500 to-teal-500' },
    { num: 3, title: '🏨 Facilities', color: 'from-sky-500 to-indigo-500' },
    { num: 4, title: '❄️ Sightseeing', color: 'from-violet-500 to-purple-600' },
    { num: 5, title: '⚠️ Terms & Exclusions', color: 'from-rose-500 to-pink-600' },
    { num: 6, title: '🗣️ Sales Script & FAQ', color: 'from-amber-400 to-amber-600' },
  ];

  // Hinglish Sales Pitch FAQs for employees
  const faqItems = [
    {
      q: 'Khane me Shuddh Veg / Gujarati / North Indian food milega?',
      script:
        'Haan ji sir/madam! Humari tour me daily Breakfast + Dinner included hai. Special Maharajah dwara 100% Shuddh Shakahari Veg aur Jain-friendly khana garma-garam diya jata hai!',
    },
    {
      q: 'Hum couple hain, humein private room milega?',
      script:
        'Bilkul sir! Standard package me 4-Bed Deluxe Family room hota hai, lekin agar aapko Private Couple Room chahiye toh sirf ₹3,000/- extra per couple me mil jayega.',
    },
    {
      q: 'Booking ke liye advance kitna dena padega?',
      script:
        'Aap bas ₹5,000/- Token Advance dekar apni seat aur train ticket confirm kara sakte hain. Baaki ka amount tour departure se 7 din pehle dena hoga.',
    },
    {
      q: 'Gulmarg Cable Car aur Horse ride package me included hai?',
      script:
        'Nahi sir, Gulmarg Gondola Cable Car aur Pahalgam local Union Cab / Horse Ride Government rates ke hisab se customer ko directly pay karna hota hai. Hum aapko exact guidance pehle se de denge.',
    },
    {
      q: 'Humari travel car aur train konsi rahegi?',
      script:
        'Bhuj/Vadodara se Jammu tak AC Sleeper Bus aur Sleeper/3AC Train ki seat rahegi. Jammu pahunchte hi pure 6 din Kashmir me Private Luxury Car aapke sath rahegi.',
    },
  ];

  // Sightseeing locations list with rich badges
  const sightseeingList = [
    { name: 'Srinagar City', tag: 'City Sightseeing', bg: 'bg-emerald-50 border-emerald-300 text-emerald-900' },
    { name: 'Dal Lake Shikara', tag: 'Water Cruise', bg: 'bg-sky-50 border-sky-300 text-sky-900' },
    { name: 'Shankaracharya Temple', tag: 'Hilltop Temple', bg: 'bg-amber-50 border-amber-300 text-amber-900' },
    { name: 'Shalimar Garden', tag: 'Mughal Garden', bg: 'bg-teal-50 border-teal-300 text-teal-900' },
    { name: 'Mughal Garden', tag: 'Heritage Garden', bg: 'bg-green-50 border-green-300 text-green-900' },
    { name: 'Nishat Bagh', tag: 'Royal Lawn', bg: 'bg-lime-50 border-lime-300 text-lime-900' },
    { name: 'Hazratbal Shrine', tag: 'Religious Spot', bg: 'bg-indigo-50 border-indigo-300 text-indigo-900' },
    { name: 'Ganderbal (Sindh River)', tag: 'River Valley', bg: 'bg-cyan-50 border-cyan-300 text-cyan-900' },
    { name: 'Sonamarg Glacier', tag: 'Snow Point ❄️', bg: 'bg-blue-50 border-blue-300 text-blue-900 font-black' },
    { name: 'Gulmarg Hill Station', tag: 'Cable Car 🚠', bg: 'bg-purple-50 border-purple-300 text-purple-900 font-black' },
    { name: 'Apple Valley 🍎', tag: 'Fresh Orchards', bg: 'bg-rose-50 border-rose-300 text-rose-900' },
    { name: 'Kesar Valley 🌸', tag: 'Saffron Farms', bg: 'bg-pink-50 border-pink-300 text-pink-900' },
    { name: 'Cricket Bat Factory', tag: 'Local Craft', bg: 'bg-amber-50 border-amber-300 text-amber-900' },
    { name: 'Pahalgam Valley', tag: 'Green Meadows', bg: 'bg-emerald-50 border-emerald-300 text-emerald-900' },
    { name: 'Aishmuqam Dargah', tag: 'Historical Spot', bg: 'bg-violet-50 border-violet-300 text-violet-900' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-white border-2 border-zinc-950 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden my-auto text-zinc-900">
        
        {/* Vibrant Gradient Header Bar */}
        <div className="bg-linear-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white p-3.5 sm:p-5 flex items-center justify-between gap-3 shrink-0 border-b-2 border-amber-400">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-amber-400 to-amber-300 text-zinc-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
              🎙️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-xl tracking-tight text-white truncate">
                  Package Pitch &amp; Explainer Script
                </h3>
                <span className="bg-linear-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase shadow-xs">
                  Sales Pitch Guide
                </span>
              </div>
              <p className="text-xs text-amber-200/90 truncate font-semibold">
                Customer calls aur walk-ins par step-by-step package explain karne ka master tool
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPackageExplainerOpen(false)}
            className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Package Switcher & Top Action Buttons */}
        <div className="bg-linear-to-r from-amber-500/10 via-zinc-100 to-indigo-500/10 border-b border-zinc-200 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <span className="text-xs font-black text-zinc-950 shrink-0 flex items-center gap-1.5">
              <Package size={15} className="text-amber-600" /> Package Select:
            </span>
            <select
              value={activePackage?.id || ''}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="flex-1 bg-white border-2 border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-black text-zinc-950 focus:outline-none focus:border-zinc-950 shadow-2xs"
            >
              {customTourPackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.packageName} ({pkg.durationTextGujarati || `${pkg.durationDays} Days`})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activePackage && (
              <button
                type="button"
                onClick={() => openEditCustomPackageModal(activePackage)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 border border-zinc-300 text-zinc-900 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
              >
                <Edit3 size={13} />
                <span className="hidden sm:inline">Edit Package</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCustomPackageModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Add New Package</span>
            </button>
          </div>
        </div>

        {/* Step Stepper Pills */}
        <div className="bg-white border-b border-zinc-200 px-3 sm:px-5 py-2.5 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            {steps.map((s) => {
              const isActive = activeStep === s.num;
              const isDone = activeStep > s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setActiveStep(s.num)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? `bg-linear-to-r ${s.color} text-white shadow-md scale-102 ring-2 ring-zinc-950/20`
                      : isDone
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isActive
                        ? 'bg-white text-zinc-950'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-300 text-zinc-800'
                    }`}
                  >
                    {isDone ? '✓' : s.num}
                  </span>
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Card Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-zinc-50/70">
          {activePackage ? (
            <>
              {/* STEP 1: OVERVIEW */}
              {activeStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-linear-to-r from-amber-500/15 via-amber-400/10 to-orange-500/15 border-2 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider mb-2 shadow-2xs">
                          🔥 Season Special Offer
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
                          {activePackage.packageName}
                        </h2>
                        <p className="text-xs sm:text-sm font-black text-amber-900 mt-1">
                          {activePackage.packageNameGujarati || 'Sanzari Tours Presents — Chalo Kashmir... Chalo Kashmir...!'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-amber-200 text-xs">
                      <div className="bg-white p-3 rounded-2xl border border-amber-300 shadow-2xs">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase">Tour Duration</div>
                        <div className="font-black text-zinc-950 flex items-center gap-1 mt-1 text-xs">
                          <Clock size={14} className="text-amber-600" />
                          <span>{activePackage.durationDays || 9} Days ({activePackage.durationNights || 8} Nights)</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-amber-300 shadow-2xs">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase">Departure Date</div>
                        <div className="font-black text-zinc-950 flex items-center gap-1 mt-1 text-xs">
                          <Calendar size={14} className="text-amber-600" />
                          <span>11 November 2025</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-amber-300 shadow-2xs">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase">Pickup Location</div>
                        <div className="font-black text-zinc-950 flex items-center gap-1 mt-1 text-xs">
                          <MapPin size={14} className="text-amber-600" />
                          <span className="truncate">{activePackage.pickupCity || 'Bhuj / Vadodara / Gadhsisa'}</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-amber-300 shadow-2xs">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase">Contact Officer</div>
                        <div className="font-black text-zinc-950 flex items-center gap-1 mt-1 text-xs">
                          <Phone size={14} className="text-amber-600" />
                          <span>Rizvan (7874635992)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verbal Pitch Box in Hinglish */}
                  <div className="bg-zinc-950 text-white rounded-3xl p-4 sm:p-5 space-y-2 border-2 border-zinc-900 shadow-md">
                    <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                      <Sparkles size={15} />
                      <span>Employee Verbal Opening Pitch Script (Call Par Aise Bolen):</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-zinc-100 italic bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800">
                      &ldquo;Namaste Sir/Madam! Sanzari Tours ki taraf se aayojit <strong className="text-amber-300">&ldquo;Kashmir Season Special 9 Days Family Tour&rdquo;</strong> ki detail share kar raha hun. 11 November 2025 ko departure hone wali is tour me Bhuj/Jammu tak AC Sleeper Bus &amp; Train journey, Kashmir me 6 din Private Luxury Car aur daily Garma-Garam Breakfast + Dinner ke sath 35 years ke management experience ki guarantee rahegi!&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: PRICING */}
              {activeStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-zinc-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>💸</span>
                      <span>Tour Package Rates &amp; Options (Per Person)</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Sleeper Option */}
                    <div className="bg-white border-2 border-zinc-900 rounded-3xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-zinc-950 text-white text-[10px] font-black px-3 py-1 rounded-bl-2xl">
                        Sleeper Train Package
                      </div>
                      <div className="flex items-center gap-2 text-zinc-950 font-black text-sm">
                        <Bus size={18} className="text-amber-600" />
                        <span>Sleeper Train + AC Sleeper Bus</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-zinc-950">
                        ₹{(activePackage.priceNonAcTrain || 13999).toLocaleString()}
                        <span className="text-xs font-bold text-zinc-500"> / Per Person</span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-600">
                        Bhuj se Jammu AC Sleeper Bus &amp; Sleeper Train. Kashmir me Private Car included.
                      </p>
                    </div>

                    {/* 3AC Option */}
                    <div className="bg-linear-to-br from-emerald-500/15 via-emerald-500/5 to-teal-500/10 border-2 border-emerald-600 rounded-3xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-2xl">
                        RECOMMENDED 3AC
                      </div>
                      <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                        <Train size={18} className="text-emerald-700" />
                        <span>3AC Train + Deluxe Bus Package</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-950">
                        ₹{(activePackage.priceAcTrain || 15999).toLocaleString()}
                        <span className="text-xs font-bold text-emerald-700"> / Per Person</span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-900">
                        Comfortable 3AC Train Journey + 6 Days Kashmir Private Car.
                      </p>
                    </div>
                  </div>

                  {/* Private Couple Room Card */}
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        👫 Private Couple Room Option:
                      </span>
                      <span className="text-xs font-black text-amber-900 bg-amber-200 border border-amber-400 px-3 py-0.5 rounded-full">
                        + ₹3,000/- Extra Per Couple
                      </span>
                    </div>
                    <p className="text-xs font-medium text-amber-950 leading-relaxed">
                      Standard package me 2 Star Hotel me 4-Bed Deluxe Family Room milta hai. Agar Private Couple Room chahiye toh sirf ₹3,000/- extra per couple charge rahega.
                    </p>
                  </div>

                  {/* Advance Token Card */}
                  <div className="bg-zinc-950 text-white rounded-2xl p-3.5 flex items-center justify-between text-xs font-bold gap-2">
                    <span className="flex items-center gap-2 text-amber-300 font-black">
                      <span>🏷️ Token Advance Amount:</span>
                      <span className="text-white font-black text-sm">Sirf ₹5,000/- Token Advance me Seat Confirm!</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateBooking}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs cursor-pointer shadow-xs"
                    >
                      Book Seat Now
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: INCLUSIONS */}
              {activeStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-zinc-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏨</span>
                      <span>Sanzari Tour Inclusions &amp; Facilities</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      activePackage.inclusionsGujarati || [
                        'Bhuj se Jammu tak AC Sleeper Bus aur Sleeper Train',
                        'Jammu se 6 Days ke liye Private Car (Innova / Swift)',
                        'Kashmir me 5 Nights Stay (Deluxe Hotels)',
                        '2 Star Hotel me 4-Bed Deluxe Room',
                        'Daily Breakfast + Dinner Included (100% Pure Veg) 🍽️',
                        '35 Years ke Experience ke sath Best Management 💯',
                      ]
                    ).map((inc, idx) => (
                      <div
                        key={idx}
                        className="bg-white border-2 border-zinc-200 hover:border-emerald-600 rounded-2xl p-3.5 flex items-start gap-3 transition-all shadow-2xs"
                      >
                        <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs font-bold text-zinc-950 leading-snug">{inc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Meal Plan Box */}
                  <div className="bg-amber-100/80 border-2 border-amber-300 rounded-3xl p-4 text-xs space-y-2">
                    <div className="font-black text-zinc-950 flex items-center gap-2 text-sm">
                      <Utensils size={16} className="text-amber-700" />
                      <span>Shuddh Shakahari Food &amp; Hotel Details:</span>
                    </div>
                    <p className="text-amber-950 leading-relaxed font-semibold">
                      {activePackage.foodPlan || 'Daily Garma-Garam Breakfast + Dinner (100% Pure Veg Maharajah Khana)'}
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 4: SIGHTSEEING */}
              {activeStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-zinc-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>❄️</span>
                      <span>Kashmir Sightseeing Locations &amp; Visit Spots</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {sightseeingList.map((spot, idx) => (
                      <div
                        key={idx}
                        className={`${spot.bg} border-2 rounded-2xl p-3 text-xs shadow-2xs space-y-1 transition-transform hover:scale-102`}
                      >
                        <div className="font-black flex items-center justify-between gap-1">
                          <span>{spot.name}</span>
                        </div>
                        <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                          {spot.tag}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: TERMS & EXCLUSIONS */}
              {activeStep === 5 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Important Terms &amp; Extra Expenses (Exclusions)</span>
                    </h4>
                  </div>

                  <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-4 sm:p-5 space-y-3">
                    <div className="text-xs font-black text-rose-950 flex items-center gap-2 text-sm">
                      <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                      <span>Ye services package rate me included nahi hain (Customer ko directly pay karni hogi):</span>
                    </div>

                    <div className="space-y-2.5 text-xs font-bold text-rose-950">
                      <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-rose-200 shadow-2xs">
                        <span className="text-rose-600 font-black">❌</span>
                        <span>Shikara Ride, Gondola Cable Car, Horse Ride, Union Cab, Garden Entry &amp; Shopping extra expenses.</span>
                      </div>
                      <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-rose-200 shadow-2xs">
                        <span className="text-rose-600 font-black">❌</span>
                        <span>Emergency situations like natural calamity, accident, traffic jam, extra stay, train/flight delay company is not responsible.</span>
                      </div>
                      <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-rose-200 shadow-2xs">
                        <span className="text-rose-600 font-black">ℹ️</span>
                        <span>Private Couple Room Extra: ₹3,000/- Per Couple.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: SALES PITCH & FAQ SCRIPT */}
              {activeStep === 6 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={20} className="text-amber-800 shrink-0" />
                      <span className="text-xs font-black text-amber-950">
                        Employee Sales Call Pitch Helpline (Customer ke sawalon ke ready answers):
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {faqItems.map((item, idx) => {
                      const isOpen = activeFaqIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="bg-white border-2 border-zinc-300 rounded-2xl overflow-hidden shadow-2xs transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                            className="w-full text-left p-3.5 flex items-center justify-between gap-2 font-black text-xs sm:text-sm text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-zinc-950 text-amber-400 text-xs font-black flex items-center justify-center shrink-0">
                                Q{idx + 1}
                              </span>
                              <span className="truncate">{item.q}</span>
                            </span>
                            <span className="text-zinc-500 font-black text-xs shrink-0">
                              {isOpen ? '▲' : '▼'}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="p-4 bg-zinc-950 text-amber-300 border-t border-zinc-800 text-xs sm:text-sm font-medium leading-relaxed italic space-y-1">
                              <span className="font-black text-white uppercase block text-[10px] tracking-wider not-italic">
                                🎙️ Call par client ko bolne ke liye verbal script:
                              </span>
                              <p className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-zinc-100">
                                &ldquo;{item.script}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500 space-y-3">
              <Package size={36} className="mx-auto text-zinc-400" />
              <p className="font-bold">No tour package selected.</p>
              <button
                type="button"
                onClick={() => setIsCustomPackageModalOpen(true)}
                className="px-4 py-2 bg-zinc-950 text-white rounded-xl text-xs font-black"
              >
                + Add First Tour Package
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions & Step Controls */}
        <div className="bg-white border-t-2 border-zinc-200 p-3.5 sm:p-4 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsAppScript}
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              {copiedScript ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedScript ? 'WhatsApp Script Copied!' : 'Copy WhatsApp Pitch'}</span>
            </button>

            <button
              type="button"
              onClick={handleCreateInquiry}
              className="hidden xs:flex px-3.5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 font-bold text-xs items-center gap-1.5 cursor-pointer"
            >
              <FileText size={15} />
              <span>+ Inquiry</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
              className="px-3.5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            {activeStep < 6 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(6, prev + 1))}
                className="px-4 py-2.5 rounded-2xl bg-zinc-950 hover:bg-black text-white font-black text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
              >
                <span>Next Step</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateBooking}
                className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
              >
                <span>Complete &amp; Book Seat</span>
                <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
