import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  User,
  Phone,
  IndianRupee,
  Train,
  Users,
  CheckCircle2,
  FileText,
  Folder,
  Edit2,
  Heart,
  Sliders,
  Building,
  Calculator,
  Lock,
  Unlock,
  Sparkles,
  Car,
  Settings,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { addTourBooking, updateTourBooking } from '../../services/db';
import { TourMember, TourType, TravelClass, TourPaymentMode, PaymentMethod, PaymentStatus } from '../../types';
import { GoogleContactsAutofill } from './GoogleContactsAutofill';
import { PricingDiscountSettingsPanel } from './PricingDiscountSettingsPanel';

interface AddTourBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBatchId?: string;
}

// Helper to calculate exact age in years from birth year and birth month
export const calculateAgeFromMonthYear = (birthYear: number, birthMonth: number = 1): number => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  if (!birthYear || birthYear < 1920 || birthYear > currentYear) return 0;
  let age = currentYear - birthYear;
  if (currentMonth < birthMonth) {
    age -= 1;
  }
  return Math.max(0, age);
};

// Helper for child discount badge
export const getPassengerDiscountBadge = (
  ageNum: number,
  child5To7Percent: number = 50,
  child8To11Percent: number = 75
) => {
  if (ageNum <= 0) return { label: 'Adult (12+ yrs)', color: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
  if (ageNum < 5) return { label: 'Infant (<5 yrs: Free 0%)', color: 'bg-emerald-100 text-emerald-900 border-emerald-400' };
  if (ageNum >= 5 && ageNum <= 7) return { label: `Child (5-7 yrs: ${child5To7Percent}% Fare)`, color: 'bg-amber-100 text-amber-900 border-amber-400' };
  if (ageNum >= 8 && ageNum <= 11) return { label: `Child (8-11 yrs: ${child8To11Percent}% Fare)`, color: 'bg-sky-100 text-sky-900 border-sky-400' };
  return { label: 'Adult (12+ yrs: Full Fare)', color: 'bg-zinc-100 text-zinc-800 border-zinc-300' };
};

const MONTHS_LIST = [
  { value: 1, label: '01 - January' },
  { value: 2, label: '02 - February' },
  { value: 3, label: '03 - March' },
  { value: 4, label: '04 - April' },
  { value: 5, label: '05 - May' },
  { value: 6, label: '06 - June' },
  { value: 7, label: '07 - July' },
  { value: 8, label: '08 - August' },
  { value: 9, label: '09 - September' },
  { value: 10, label: '10 - October' },
  { value: 11, label: '11 - November' },
  { value: 12, label: '12 - December' },
];

export const AddTourBookingModal: React.FC<AddTourBookingModalProps> = ({
  isOpen,
  onClose,
  preselectedBatchId,
}) => {
  const {
    tourWallets,
    tourBatches,
    formatCurrency,
    setTourReceiptBooking,
    setIsTourReceiptOpen,
    editingTourBooking,
    setEditingTourBooking,
    deleteTourBookingById,
    tourPricingSettings,
  } = useData();
  const { currentUserProfile, user } = useAuth();

  // Basic Tour Details
  const [tourType, setTourType] = useState<TourType>('Group Tour'); // 'Group Tour' vs 'Private Tour'
  const [selectedBatchId, setSelectedBatchId] = useState<string>(preselectedBatchId || '');
  const [destination, setDestination] = useState('Kashmir');
  const [tourTitle, setTourTitle] = useState('Kashmir Winter Tour 2026');
  const [tourBatchTitle, setTourBatchTitle] = useState('15 november');
  const [tourDate, setTourDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Primary Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [city, setCity] = useState('Bhuj');

  // Travel Class & Package Category
  const [travelClass, setTravelClass] = useState<TravelClass>('AC Train');
  const [packageCategory, setPackageCategory] = useState<'Standard' | 'Deluxe' | 'Super Deluxe' | 'Luxury'>('Deluxe');

  // PAX Breakdown & Couple Room
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [kidsCount, setKidsCount] = useState<number>(0);
  const [couplesCount, setCouplesCount] = useState<number>(0);

  // Manual Pricing Override Toggle
  const [isManualPrice, setIsManualPrice] = useState<boolean>(false);
  const [totalAmount, setTotalAmount] = useState<number | string>(31998);
  const [advancePaid, setAdvancePaid] = useState<number | string>('');

  // Members / Passenger List
  const [members, setMembers] = useState<TourMember[]>([
    { name: '', age: '30', gender: 'Male' },
    { name: '', age: '28', gender: 'Female' },
  ]);

  // Pricing & Discount Settings Panel State
  const [showPricingSettings, setShowPricingSettings] = useState(false);

  // Dedicated Auto Age Calculator Tool State
  const [showAgeCalcTool, setShowAgeCalcTool] = useState(false);
  const [calcPassengerIndex, setCalcPassengerIndex] = useState(0);
  const [calcBirthMonth, setCalcBirthMonth] = useState<number>(new Date().getMonth() + 1);
  const [calcBirthYear, setCalcBirthYear] = useState<number | string>(2020);

  // Payment Details & Metadata
  const [paymentMode, setPaymentMode] = useState<TourPaymentMode>('Online');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [walletName, setWalletName] = useState<string>(() => {
    const defaultTour = tourWallets.find((w) => w.name.toLowerCase().includes('rizwan')) || tourWallets[0];
    return defaultTour?.name || 'Rizwan (Tour)';
  });
  const [bookedBy, setBookedBy] = useState<string>('Office Staff');
  const [specialNotes, setSpecialNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Total PAX
  const membersCount = Math.max(1, adultsCount + kidsCount);

  // Dynamic Pricing Rates from Firestore
  const currentSleeperPrice = tourPricingSettings?.sleeperPrice ?? 13999;
  const currentAcTrainPrice = tourPricingSettings?.acTrainPrice ?? 15999;
  const currentCoupleSurcharge = tourPricingSettings?.coupleRoomSurcharge ?? 3000;
  const currentChild5To7Percent = tourPricingSettings?.child5To7Percent ?? 50;
  const currentChild8To11Percent = tourPricingSettings?.child8To11Percent ?? 75;

  // Auto-calculate Base Price & Breakdown
  const baseRatePerAdult = useMemo(() => {
    if (travelClass === 'Sleeper Train' || travelClass === 'Non-AC Sleeper' || travelClass === 'Non-AC Train') {
      return currentSleeperPrice;
    }
    return currentAcTrainPrice;
  }, [travelClass, currentSleeperPrice, currentAcTrainPrice]);

  // Calculate Auto Total Amount based on Passenger Ages, Rates, and Couple Rooms
  const calculatedTotal = useMemo(() => {
    // 1. Adults base amount
    let total = adultsCount * baseRatePerAdult;

    // 2. Kids amount based on age in members array
    members.forEach((m, idx) => {
      const ageNum = Number(m.age || 0);
      if (idx >= adultsCount || (ageNum > 0 && ageNum < 12)) {
        if (ageNum > 0 && ageNum < 5) {
          // Free (<5 yrs): 0%
          total += 0;
        } else if (ageNum >= 5 && ageNum <= 7) {
          // 5-7 yrs discount fare
          total += Math.round(baseRatePerAdult * (currentChild5To7Percent / 100));
        } else if (ageNum >= 8 && ageNum <= 11) {
          // 8-11 yrs discount fare
          total += Math.round(baseRatePerAdult * (currentChild8To11Percent / 100));
        }
      }
    });

    // 3. Couple Separate Room (+₹3,000 / currentCoupleSurcharge per couple)
    if (couplesCount > 0) {
      total += couplesCount * currentCoupleSurcharge;
    }

    return total;
  }, [adultsCount, baseRatePerAdult, members, couplesCount, currentCoupleSurcharge, currentChild5To7Percent, currentChild8To11Percent]);

  // Update totalAmount when auto-calculating and manual override is off
  useEffect(() => {
    if (!isManualPrice) {
      setTotalAmount(calculatedTotal);
    }
  }, [calculatedTotal, isManualPrice]);

  // Handler for Couple Room Count changes:
  // Directly updates totalAmount so clicking '+' ALWAYS adds +₹3,000 (surcharge)
  // in BOTH new and edit modes, and even if manual override is active!
  const handleCoupleCountChange = (delta: number) => {
    const nextCouples = Math.max(0, couplesCount + delta);
    if (nextCouples === couplesCount) return;
    const diff = (nextCouples - couplesCount) * currentCoupleSurcharge;
    setCouplesCount(nextCouples);

    setTotalAmount((prev) => {
      const currentVal = Number(prev || 0);
      return Math.max(0, currentVal + diff);
    });
  };

  const handleTravelClassChange = (newClass: TravelClass) => {
    if (travelClass === newClass) return;
    const oldBase = travelClass === 'Sleeper Train' || travelClass === 'Non-AC Sleeper' || travelClass === 'Non-AC Train'
      ? currentSleeperPrice
      : currentAcTrainPrice;
    const newBase = newClass === 'Sleeper Train' || newClass === 'Non-AC Sleeper' || newClass === 'Non-AC Train'
      ? currentSleeperPrice
      : currentAcTrainPrice;
    const diff = (newBase - oldBase) * adultsCount;
    setTravelClass(newClass);

    if (isManualPrice) {
      setTotalAmount((prev) => Math.max(0, Number(prev || 0) + diff));
    }
  };

  // Reset or pre-fill form state when modal opens or editingTourBooking changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingTourBooking) {
      setTourType(editingTourBooking.tourType || 'Group Tour');
      setSelectedBatchId(editingTourBooking.tourBatchId || '');
      setDestination(editingTourBooking.destination || 'Kashmir');
      setTourTitle(editingTourBooking.tourTitle || 'Kashmir Winter Tour 2026');
      setTourBatchTitle(editingTourBooking.tourBatchTitle || '15 november');
      setTourDate(editingTourBooking.tourDate || new Date().toISOString().split('T')[0]);
      setCustomerName(editingTourBooking.customerName || '');
      setCustomerPhone(editingTourBooking.customerPhone || '');
      setCity(editingTourBooking.city || 'Bhuj');
      setTravelClass(editingTourBooking.travelClass || 'AC Train');
      setPackageCategory(editingTourBooking.packageCategory || 'Deluxe');
      setAdultsCount(editingTourBooking.adultsCount ?? (editingTourBooking.membersCount || 2));
      setKidsCount(editingTourBooking.kidsCount ?? 0);
      setCouplesCount(editingTourBooking.couplesCount ?? 0);
      setMembers(
        editingTourBooking.members && editingTourBooking.members.length > 0
          ? editingTourBooking.members
          : [{ name: editingTourBooking.customerName || '', age: '30', gender: 'Male' }]
      );
      setTotalAmount(editingTourBooking.totalAmount ?? '');
      setAdvancePaid(editingTourBooking.advancePaid ?? '');
      setPaymentMode(editingTourBooking.paymentMode || 'Online');
      setPaymentMethod(editingTourBooking.paymentMethod || 'UPI');
      setWalletName(editingTourBooking.walletName || 'Rizwan (Tour)');
      setBookedBy(editingTourBooking.bookedBy || currentUserProfile?.name || 'Office Staff');
      setSpecialNotes(editingTourBooking.specialNotes || '');
      setIsManualPrice(true); // Keep existing saved price for editing
    } else {
      if (preselectedBatchId) {
        setTourType('Group Tour');
        setSelectedBatchId(preselectedBatchId);
        const b = tourBatches.find((batch) => batch.id === preselectedBatchId);
        if (b) {
          setTourBatchTitle(b.title);
          setTourTitle(b.title);
          setDestination(b.destination);
          setTourDate(b.departureDate);
        }
      } else {
        setTourType('Group Tour');
        // Default to first batch if available
        if (tourBatches.length > 0) {
          const firstBatch = tourBatches[0];
          setSelectedBatchId(firstBatch.id);
          setTourBatchTitle(firstBatch.title);
          setTourTitle(firstBatch.title);
          setDestination(firstBatch.destination);
          setTourDate(firstBatch.departureDate);
        } else {
          setSelectedBatchId('');
          setDestination('Kashmir');
          setTourTitle('Kashmir Winter Tour 2026');
          setTourBatchTitle('15 november');
          setTourDate(new Date().toISOString().split('T')[0]);
        }
      }
      setCustomerName('');
      setCustomerPhone('');
      setCity('Bhuj');
      setTravelClass('AC Train');
      setPackageCategory('Deluxe');
      setAdultsCount(2);
      setKidsCount(0);
      setCouplesCount(0);
      setMembers([
        { name: '', age: '30', gender: 'Male' },
        { name: '', age: '28', gender: 'Female' },
      ]);
      setTotalAmount(31998);
      setAdvancePaid('');
      setPaymentMode('Online');
      setPaymentMethod('UPI');
      const defaultTour = tourWallets.find((w) => w.name.toLowerCase().includes('rizwan')) || tourWallets[0];
      setWalletName(defaultTour?.name || 'Rizwan (Tour)');
      setBookedBy(currentUserProfile?.name || user?.displayName || 'Office Staff');
      setSpecialNotes('');
      setIsManualPrice(false);
    }
  }, [isOpen, editingTourBooking, preselectedBatchId, currentUserProfile, user, tourBatches]);

  const handleModalClose = () => {
    setEditingTourBooking(null);
    onClose();
  };

  // Sync batch details when selected in Group Tour mode
  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (!batchId) return;
    const batch = tourBatches.find((b) => b.id === batchId);
    if (batch) {
      setTourBatchTitle(batch.title);
      setTourTitle(batch.title);
      setDestination(batch.destination);
      setTourDate(batch.departureDate); // Automatically locked to batch departure date
    }
  };

  // Handle Tour Type Change (Group Tour vs Private Tour)
  const handleTourTypeChange = (type: TourType) => {
    setTourType(type);
    if (type === 'Group Tour') {
      // Pick first batch if none selected
      if (!selectedBatchId && tourBatches.length > 0) {
        handleBatchSelect(tourBatches[0].id);
      }
    } else {
      // Private Tour: custom date becomes editable, batchId is unset
      setSelectedBatchId('');
      setTourBatchTitle(`Private Tour - ${tourDate}`);
      setTourTitle(`Private Tour - ${destination}`);
    }
  };

  // Sync first member name with customer name if empty
  useEffect(() => {
    if (customerName && members.length > 0 && !members[0].name) {
      setMembers((prev) => {
        const copy = [...prev];
        copy[0] = { ...copy[0], name: customerName };
        return copy;
      });
    }
  }, [customerName]);

  // Adjust member rows when adults + kids count changes
  const handlePaxCountChange = (newAdults: number, newKids: number) => {
    const total = Math.max(1, newAdults + newKids);
    setMembers((prev) => {
      if (prev.length === total) return prev;
      if (prev.length < total) {
        const added: TourMember[] = [];
        for (let i = prev.length; i < total; i++) {
          const isKid = i >= newAdults;
          added.push({
            name: '',
            age: isKid ? '6' : '30',
            gender: isKid ? 'Child' : (i % 2 === 1 ? 'Female' : 'Male'),
          });
        }
        return [...prev, ...added];
      }
      return prev.slice(0, total);
    });
  };

  if (!isOpen) return null;

  const addMemberRow = () => {
    setMembers((prev) => [
      ...prev,
      { name: '', age: '30', gender: 'Male' },
    ]);
    setAdultsCount((prev) => prev + 1);
  };

  const removeMemberRow = (idx: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== idx));
    if (adultsCount > 1) {
      setAdultsCount((prev) => prev - 1);
    } else if (kidsCount > 0) {
      setKidsCount((prev) => prev - 1);
    }
  };

  const updateMember = (idx: number, field: keyof TourMember, val: any) => {
    setMembers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Apply calculated age from dedicated tool to specific passenger
  const handleApplyCalculatedAge = () => {
    const y = Number(calcBirthYear);
    if (!y || y < 1920 || y > new Date().getFullYear()) {
      alert('Please enter a valid birth year (e.g. 2018)');
      return;
    }
    const computedAge = calculateAgeFromMonthYear(y, calcBirthMonth);
    const targetIdx = Math.min(calcPassengerIndex, members.length - 1);

    updateMember(targetIdx, 'age', String(computedAge));
    if (computedAge < 12) {
      updateMember(targetIdx, 'gender', 'Child');
    }
    setShowAgeCalcTool(false);
  };

  const numTotal = Number(totalAmount || 0);
  const numAdvance = Number(advancePaid || 0);
  const pendingAmount = Math.max(0, numTotal - numAdvance);
  const balanceDue = pendingAmount; // Exact match with receipt generator

  const paymentStatus: PaymentStatus | 'Due' =
    pendingAmount === 0 ? 'Paid' : numAdvance > 0 ? 'Partial' : 'Due';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Customer Name is required.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg('Customer Mobile Number is required.');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Destination is required.');
      return;
    }
    if (tourType === 'Group Tour' && !selectedBatchId) {
      setErrorMsg('Please select a Tour Date Folder for Group Tour.');
      return;
    }
    if (numTotal <= 0) {
      setErrorMsg('Please enter a valid Total Amount.');
      return;
    }

    // Clean members
    const validMembers = members
      .filter((m) => m.name.trim() !== '')
      .map((m) => ({
        name: m.name.trim(),
        age: m.age || '30',
        gender: m.gender || 'Male',
      }));

    if (validMembers.length === 0) {
      validMembers.push({
        name: customerName.trim(),
        age: '30',
        gender: 'Male',
      });
    }

    setIsSubmitting(true);
    try {
      const selectedBatch = tourBatches.find((b) => b.id === selectedBatchId);
      const bookingNumber =
        editingTourBooking?.bookingNumber || `SZ-TOUR-${Math.floor(1000 + Math.random() * 9000)}`;

      // Exact 100% Matching Firestore Payload
      const bookingData = {
        bookingNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        city: city.trim() || 'Bhuj',
        destination: destination.trim(),
        tourTitle: tourTitle.trim() || `${destination} Tour`,
        tourBatchTitle: tourType === 'Group Tour' ? (selectedBatch?.title || tourBatchTitle.trim() || '15 november') : (tourBatchTitle.trim() || `Private Tour - ${tourDate}`),
        tourBatchId: tourType === 'Group Tour' ? (selectedBatchId || '') : '',
        tourDate: tourDate || new Date().toISOString().split('T')[0],
        tourType,
        travelClass,
        packageCategory,
        membersCount: validMembers.length,
        adultsCount,
        kidsCount,
        couplesCount,
        members: validMembers,
        totalAmount: numTotal,
        advancePaid: numAdvance,
        pendingAmount,
        balanceDue,
        paymentStatus,
        paymentMode,
        paymentMethod: (paymentMode === 'Online' || paymentMode === 'UPI' ? 'UPI' : 'Cash') as PaymentMethod,
        walletName: walletName || tourWallets[0]?.name || 'Rizwan (Tour)',
        bookingStatus: 'Confirmed' as const,
        bookedBy: bookedBy || currentUserProfile?.name || 'Office Staff',
        specialNotes: specialNotes.trim(),
        monthKey: (tourDate || new Date().toISOString().split('T')[0]).substring(0, 7),
      };

      if (editingTourBooking) {
        // UPDATE EXISTING FIRESTORE DOCUMENT (NO DUPLICATE)
        await updateTourBooking(
          editingTourBooking.id,
          bookingData,
          currentUserProfile?.email || user?.email || 'admin@sanzari.com'
        );

        setTourReceiptBooking({
          ...editingTourBooking,
          ...bookingData,
          id: editingTourBooking.id,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // CREATE NEW FIRESTORE DOCUMENT
        const newBookingId = await addTourBooking(
          bookingData,
          currentUserProfile?.email || user?.email || 'admin@sanzari.com'
        );

        setTourReceiptBooking({
          ...bookingData,
          id: typeof newBookingId === 'string' ? newBookingId : (newBookingId as any)?.id || Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setIsTourReceiptOpen(true);
      handleModalClose();
    } catch (err: any) {
      console.error('Failed to save booking:', err);
      setErrorMsg(err.message || 'Failed to save booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCurrentBooking = async () => {
    if (!editingTourBooking) return;
    if (window.confirm(`Are you sure you want to delete booking ${editingTourBooking.bookingNumber} for ${editingTourBooking.customerName}?`)) {
      setIsSubmitting(true);
      try {
        await deleteTourBookingById(editingTourBooking.id);
        handleModalClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to delete booking.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Selected batch object
  const currentSelectedBatch = tourBatches.find((b) => b.id === selectedBatchId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      {/* Light Theme Modal Container - Matching New Inquiry Form */}
      <div className="relative w-full max-w-2xl bg-white text-zinc-950 rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header - Clean White with Crisp Black Border */}
        <div className="bg-white px-5 sm:px-6 py-4 border-b-2 border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-sm shadow-xs">
              {editingTourBooking ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5 stroke-[3]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950">
                  {editingTourBooking ? 'Edit Tour Booking' : 'New Tour Booking'}
                </h2>
                <span className="text-xs font-mono font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-lg border border-blue-300">
                  {editingTourBooking?.bookingNumber || `SZ-TOUR-XXXX`}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 font-semibold mt-0.5">
                {editingTourBooking
                  ? 'Update existing booking in Firestore collection `tourBookings` without duplicate'
                  : 'Sleeper (₹13,999) & 3AC (₹15,999) • Couple Room (+₹3,000) • Child Discount'}
              </p>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body - Light Theme */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1 bg-zinc-50/50">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border-2 border-rose-400 text-rose-900 rounded-xl text-xs font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* 1. Tour Batch Department & Departure Date (Group Tour vs Private Tour) */}
            <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-blue-600" />
                  1. Tour Department &amp; Departure Date
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                  {tourDate.substring(0, 7)}
                </span>
              </div>

              {/* 2 Big Toggle Options: Group Tour OR Private Tour */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-zinc-700 mb-1.5">
                  Tour Type Selection *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTourTypeChange('Group Tour')}
                    className={`py-2.5 px-3 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      tourType === 'Group Tour'
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                    }`}
                  >
                    <Users size={14} />
                    <span>👥 Group Tour</span>
                    {tourType === 'Group Tour' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTourTypeChange('Private Tour')}
                    className={`py-2.5 px-3 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      tourType === 'Private Tour'
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                    }`}
                  >
                    <Car size={14} />
                    <span>🚗 Private Tour</span>
                    {tourType === 'Private Tour' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* GROUP TOUR LOGIC: Batch Folder dropdown + Locked Departure Date */}
              {tourType === 'Group Tour' ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Tour Date Folder Dropdown */}
                    <div>
                      <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                        Tour Date Folder (Batch) *
                      </label>
                      <select
                        value={selectedBatchId}
                        onChange={(e) => handleBatchSelect(e.target.value)}
                        className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950"
                      >
                        <option value="">-- Select Tour Date Folder --</option>
                        {tourBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            📁 {b.title} • {b.departureDate} ({b.destination})
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-zinc-500 font-medium mt-1 block">
                        Select an existing departure batch folder
                      </span>
                    </div>

                    {/* Destination (Auto from Batch) */}
                    <div>
                      <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                        Destination *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kashmir / Diwali special"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950"
                      />
                    </div>
                  </div>

                  {/* Locked Departure Date Badge & Batch Title */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-400 text-zinc-950 flex items-center justify-center font-bold">
                        <Lock size={15} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                          Group Departure Date (Locked by Batch)
                        </span>
                        <span className="text-sm font-black text-zinc-950 font-mono">
                          📅 {tourDate || 'Please select a batch folder'}
                        </span>
                      </div>
                    </div>

                    {currentSelectedBatch && (
                      <div className="text-[11px] font-bold text-amber-950 bg-amber-200/80 px-2.5 py-1 rounded-lg">
                        Batch: {currentSelectedBatch.title}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* PRIVATE TOUR LOGIC: Departure Date is visible and editable */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-zinc-800 mb-1 font-bold flex items-center gap-1">
                      <Calendar size={13} className="text-blue-600" />
                      <span>Departure Date (tourDate) *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={tourDate}
                      onChange={(e) => {
                        setTourDate(e.target.value);
                        setTourBatchTitle(`Private Tour - ${e.target.value}`);
                      }}
                      className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-black focus:outline-none focus:ring-2 focus:ring-zinc-950"
                    />
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5 block">
                      Choose any custom departure date for private tour
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                      Destination *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kashmir / Kerala / Dubai"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Customer Contact & City */}
            <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5 border-b border-zinc-200 pb-2">
                <User className="w-4 h-4 text-emerald-600" />
                2. Customer Details &amp; City
              </span>

              <GoogleContactsAutofill
                selectedName={customerName}
                selectedPhone={customerPhone}
                onSelectContact={({ name, phoneNumber }) => {
                  if (name) setCustomerName(name);
                  if (phoneNumber) setCustomerPhone(phoneNumber);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9909857240"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                    City (e.g. Bhuj / Anjar)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bhuj, Vadodara, Ahmedabad"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  />
                </div>
              </div>
            </div>

            {/* 3. Package Selection & Pricing Rules */}
            <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Train className="w-4 h-4 text-amber-600" />
                  3. Travel Class &amp; Base Package
                </span>
                <span className="text-[10px] text-amber-900 font-extrabold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  Base: ₹{baseRatePerAdult.toLocaleString('en-IN')} / person
                </span>
              </div>

              {/* Package Rate Selector Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleTravelClassChange('AC Train')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    travelClass === 'AC Train' || travelClass === '3AC Train'
                      ? 'bg-blue-50 border-blue-600 text-zinc-950 shadow-sm ring-2 ring-blue-600'
                      : 'bg-white border-zinc-300 text-zinc-600 hover:border-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-zinc-950">🚆 3AC Train Deluxe</span>
                    <span className="text-xs font-black text-blue-700 font-mono">₹{currentAcTrainPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Base Fare per Adult</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTravelClassChange('Sleeper Train')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    travelClass === 'Sleeper Train' || travelClass === 'Non-AC Sleeper'
                      ? 'bg-amber-50 border-amber-500 text-zinc-950 shadow-sm ring-2 ring-amber-500'
                      : 'bg-white border-zinc-300 text-zinc-600 hover:border-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-zinc-950">🚂 Sleeper Train</span>
                    <span className="text-xs font-black text-amber-700 font-mono">₹{currentSleeperPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Base Fare per Adult</p>
                </button>
              </div>

              {/* PAX Counts: Adults, Kids, Couples */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {/* Adults Count */}
                <div className="bg-zinc-50 p-2.5 rounded-xl border-2 border-zinc-900">
                  <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">
                    Adults (12+ yrs)
                  </label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, adultsCount - 1);
                        setAdultsCount(next);
                        handlePaxCountChange(next, kidsCount);
                      }}
                      className="w-7 h-7 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-black flex items-center justify-center border border-zinc-400 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-zinc-950 font-mono">{adultsCount}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = adultsCount + 1;
                        setAdultsCount(next);
                        handlePaxCountChange(next, kidsCount);
                      }}
                      className="w-7 h-7 rounded-lg bg-zinc-950 hover:bg-black text-white font-black flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Kids Count */}
                <div className="bg-zinc-50 p-2.5 rounded-xl border-2 border-zinc-900">
                  <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">
                    Kids (&lt;12 yrs)
                  </label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, kidsCount - 1);
                        setKidsCount(next);
                        handlePaxCountChange(adultsCount, next);
                      }}
                      className="w-7 h-7 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-black flex items-center justify-center border border-zinc-400 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-zinc-950 font-mono">{kidsCount}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = kidsCount + 1;
                        setKidsCount(next);
                        handlePaxCountChange(adultsCount, next);
                      }}
                      className="w-7 h-7 rounded-lg bg-zinc-950 hover:bg-black text-white font-black flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Couple Separate Room (+₹3,000 / currentCoupleSurcharge) */}
                <div className="bg-zinc-50 p-2.5 rounded-xl border-2 border-zinc-900">
                  <label className="block text-[10px] font-black uppercase text-pink-700 mb-1 flex items-center gap-1">
                    <Heart size={11} className="fill-pink-500 text-pink-500" /> Couple (+₹{currentCoupleSurcharge.toLocaleString('en-IN')})
                  </label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCoupleCountChange(-1)}
                      className="w-7 h-7 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-black flex items-center justify-center border border-zinc-400 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-pink-700 font-mono">{couplesCount}</span>
                    <button
                      type="button"
                      onClick={() => handleCoupleCountChange(1)}
                      className="w-7 h-7 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-black flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Child Discount Guide Note with Settings Gear Icon */}
              <div className="text-[10px] text-zinc-800 bg-amber-50 p-2.5 rounded-xl border-2 border-amber-300 flex items-center justify-between flex-wrap gap-2 font-semibold shadow-2xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>👶 <strong>Child Discounts:</strong></span>
                  <span className="text-emerald-800 font-black">&lt;5 yrs: Free (0%)</span>
                  <span>•</span>
                  <span className="text-amber-800 font-black">5-7 yrs: {currentChild5To7Percent}% Fare</span>
                  <span>•</span>
                  <span className="text-sky-800 font-black">8-11 yrs: {currentChild8To11Percent}% Fare</span>
                  <span>•</span>
                  <span className="text-pink-800 font-black">Couple Room: +₹{currentCoupleSurcharge.toLocaleString('en-IN')}</span>
                </div>

                {/* Gear Icon button to open Pricing & Discount Settings */}
                <button
                  type="button"
                  onClick={() => setShowPricingSettings(!showPricingSettings)}
                  className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 font-black text-[11px] ${
                    showPricingSettings
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                  }`}
                  title="Configure Package Rates, Child Discounts & Couple Room"
                >
                  <Settings size={13} className={showPricingSettings ? 'rotate-90 transition-transform' : ''} />
                  <span>Configure Rates</span>
                </button>
              </div>

              {/* Expandable Pricing & Discount Settings Panel */}
              {showPricingSettings && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                  <PricingDiscountSettingsPanel onClose={() => setShowPricingSettings(false)} />
                </div>
              )}
            </div>

            {/* 4. Members List (Passenger Manifest) & Auto Age Calculator */}
            <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-600" />
                  4. Passenger Manifest ({members.length} Pax)
                </span>

                <div className="flex items-center gap-2">
                  {/* Tool Button to toggle Age Calculator */}
                  <button
                    type="button"
                    onClick={() => setShowAgeCalcTool(!showAgeCalcTool)}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                    title="Calculate exact age by Birth Month & Year"
                  >
                    <Calculator size={13} />
                    <span>🧮 Age Calculator</span>
                  </button>

                  <button
                    type="button"
                    onClick={addMemberRow}
                    className="px-2.5 py-1 bg-zinc-950 hover:bg-black text-white rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus size={13} /> + Add Pax
                  </button>
                </div>
              </div>

              {/* Dedicated Passenger Age Auto-Calculator Tool Panel */}
              {showAgeCalcTool && (
                <div className="bg-amber-50 p-3.5 rounded-2xl border-2 border-amber-400 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Calculator size={14} className="text-amber-800" />
                      <span>Auto Age Calculator (Birth Month &amp; Year)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAgeCalcTool(false)}
                      className="text-amber-800 hover:text-black font-black text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    {/* Passenger Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Select Passenger</label>
                      <select
                        value={calcPassengerIndex}
                        onChange={(e) => setCalcPassengerIndex(Number(e.target.value))}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 font-bold text-zinc-900 text-xs"
                      >
                        {members.map((m, idx) => (
                          <option key={idx} value={idx}>
                            Pax #{idx + 1}: {m.name || `Passenger ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Birth Month Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Birth Month</label>
                      <select
                        value={calcBirthMonth}
                        onChange={(e) => setCalcBirthMonth(Number(e.target.value))}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 font-bold text-zinc-900 text-xs"
                      >
                        {MONTHS_LIST.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Birth Year Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Birth Year (YYYY)</label>
                      <input
                        type="number"
                        placeholder="e.g. 2018"
                        min={1925}
                        max={new Date().getFullYear()}
                        value={calcBirthYear}
                        onChange={(e) => setCalcBirthYear(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 font-black text-zinc-900 text-xs font-mono"
                      />
                    </div>

                    {/* Live Calculated Age & Apply Button */}
                    <div className="flex flex-col justify-end">
                      <button
                        type="button"
                        onClick={handleApplyCalculatedAge}
                        className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 text-xs"
                      >
                        <CheckCircle2 size={13} />
                        <span>Set Age: {calculateAgeFromMonthYear(Number(calcBirthYear), calcBirthMonth)} yrs</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-900 font-bold flex items-center gap-2">
                    <span>Result:</span>
                    <span className="font-black underline">
                      {calculateAgeFromMonthYear(Number(calcBirthYear), calcBirthMonth)} Years Old
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-extrabold text-[10px]">
                      {getPassengerDiscountBadge(calculateAgeFromMonthYear(Number(calcBirthYear), calcBirthMonth), currentChild5To7Percent, currentChild8To11Percent).label}
                    </span>
                  </div>
                </div>
              )}

              {/* Members Table / Rows */}
              <div className="space-y-2.5">
                {members.map((m, idx) => {
                  const ageNum = Number(m.age || 0);
                  const discountInfo = getPassengerDiscountBadge(ageNum, currentChild5To7Percent, currentChild8To11Percent);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-zinc-50 border-2 border-zinc-900 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        {/* Passenger Number Badge */}
                        <span className="w-7 h-7 rounded-xl bg-zinc-950 text-white flex items-center justify-center text-xs font-black shrink-0">
                          {idx + 1}
                        </span>

                        {/* Passenger Name */}
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder={`Passenger ${idx + 1} Full Name`}
                            value={m.name}
                            onChange={(e) => updateMember(idx, 'name', e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 text-xs"
                          />
                        </div>

                        {/* Direct Age Input */}
                        <div className="w-20">
                          <input
                            type="number"
                            placeholder="Age"
                            value={m.age}
                            onChange={(e) => updateMember(idx, 'age', e.target.value)}
                            className="w-full bg-white border-2 border-zinc-900 rounded-xl px-2 py-1.5 text-center text-zinc-950 text-xs font-black focus:outline-none font-mono"
                          />
                        </div>

                        {/* Gender Select */}
                        <div className="w-24">
                          <select
                            value={m.gender}
                            onChange={(e) => updateMember(idx, 'gender', e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-xl px-2 py-1.5 text-zinc-950 text-xs font-bold focus:outline-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Child">Child</option>
                          </select>
                        </div>

                        {/* Delete Row */}
                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMemberRow(idx)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Remove passenger"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Sub-row: Inline Quick Month & Year Calculation for this passenger + Discount Badge */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-200 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-600">
                          <span>🧮 Auto Calc Age:</span>
                          <input
                            type="number"
                            placeholder="Birth Year (e.g. 2018)"
                            min={1925}
                            max={new Date().getFullYear()}
                            onChange={(e) => {
                              const y = Number(e.target.value);
                              if (y >= 1925 && y <= new Date().getFullYear()) {
                                const calculated = calculateAgeFromMonthYear(y, 6);
                                updateMember(idx, 'age', String(calculated));
                                if (calculated < 12) updateMember(idx, 'gender', 'Child');
                              }
                            }}
                            className="w-36 bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-zinc-900 font-mono"
                          />
                        </div>

                        {/* Live Discount Category Tag */}
                        <span className={`px-2 py-0.5 rounded-md border font-black text-[10px] ${discountInfo.color}`}>
                          {discountInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Financials: Total Amount, Advance, Due, Mode */}
            <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  5. Amount &amp; Payment Details
                </span>

                {/* Manual Override Checkbox */}
                <label className="flex items-center gap-1.5 text-xs text-zinc-800 cursor-pointer font-black select-none">
                  <input
                    type="checkbox"
                    checked={isManualPrice}
                    onChange={(e) => {
                      setIsManualPrice(e.target.checked);
                      if (!e.target.checked) {
                        setTotalAmount(calculatedTotal);
                      }
                    }}
                    className="rounded bg-white border-2 border-zinc-900 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Manual Price Override</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-zinc-800 font-bold">
                      Total Amount (₹) *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualPrice(false);
                          setTotalAmount(calculatedTotal);
                        }}
                        className="text-[10px] font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-300 transition-colors cursor-pointer flex items-center gap-1"
                        title="Re-calculate total using current passenger ages, discounts, and couple room"
                      >
                        🔄 Auto Calc (₹{calculatedTotal.toLocaleString('en-IN')})
                      </button>
                      {!isManualPrice && (
                        <span className="text-[10px] text-emerald-800 font-black bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300">
                          Auto
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 49500"
                    value={totalAmount}
                    onChange={(e) => {
                      setTotalAmount(e.target.value);
                      setIsManualPrice(true);
                    }}
                    className={`w-full bg-white border-2 rounded-xl px-3 py-2 text-zinc-950 font-mono font-black text-sm focus:outline-none ${
                      isManualPrice ? 'border-amber-500' : 'border-zinc-900'
                    }`}
                  />
                </div>

                {/* Advance Paid */}
                <div>
                  <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                    Advance Paid (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                    className="w-full bg-white border-2 border-emerald-600 rounded-xl px-3 py-2 text-emerald-800 font-mono font-black text-sm focus:outline-none"
                  />
                </div>

                {/* Due Balance / balanceDue */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-zinc-800 font-bold">
                      Due Amount (balanceDue)
                    </label>
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${
                      paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {paymentStatus}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 border-2 border-zinc-300 rounded-xl px-3 py-2 text-rose-600 font-mono font-black text-sm">
                    {formatCurrency(balanceDue)}
                  </div>
                </div>
              </div>

              {/* Payment Mode, Wallet & Booked By */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as TourPaymentMode)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none"
                  >
                    <option value="Online">📱 Online (UPI/Bank)</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="Cash">💵 Cash</option>
                    <option value="Offline">💵 Offline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                    Wallet (Received In)
                  </label>
                  <select
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none"
                  >
                    {tourWallets.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-800 mb-1 font-bold">
                    Booked By (Staff)
                  </label>
                  <input
                    type="text"
                    placeholder="Staff name"
                    value={bookedBy}
                    onChange={(e) => setBookedBy(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-zinc-950 font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 6. Special Notes */}
            <div className="p-4 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-900">
                Special Notes (Room, Food, or Payment Condition)
              </label>
              <input
                type="text"
                placeholder="e.g. Privet room mate vaat thai gai che 3000 ok che"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-zinc-950 focus:outline-none focus:border-zinc-900 text-xs font-bold"
              />
            </div>
          </div>

          {/* Sticky Pinned Bottom Action Footer - Light Theme */}
          <div className="px-5 sm:px-6 py-3.5 bg-white border-t-2 border-zinc-900 flex items-center justify-between gap-2 shrink-0">
            {editingTourBooking ? (
              <button
                type="button"
                onClick={handleDeleteCurrentBooking}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 size={15} />
                <span>Delete Booking</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-black border border-zinc-300 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <CheckCircle2 size={16} />
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : editingTourBooking
                    ? 'Update Booking (No Duplicate)'
                    : 'Save Booking & Receipt'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
