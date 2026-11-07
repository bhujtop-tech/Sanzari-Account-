import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  IndianRupee,
  Train,
  Users,
  CheckCircle2,
  Folder,
  Edit2,
  Heart,
  Calculator,
  Lock,
  Car,
  Settings,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { addTourBooking, updateTourBooking } from '../../services/db';
import { TourMember, TourType, TravelClass, TourPaymentMode, PaymentMethod, PaymentStatus } from '../../types';
import { GoogleContactsAutofill } from './GoogleContactsAutofill';
import { saveCustomerToContactsCache } from '../../services/googleContacts';
import { PricingDiscountSettingsPanel } from './PricingDiscountSettingsPanel';

interface AddTourBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBatchId?: string;
}

// Helper to calculate exact age in years from birth year and birth month (1-12)
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

// Parse "MM/YYYY" (e.g. "10/2000", "5/2018", "10-2018") or "YYYY"
export const parseMonthYearString = (raw: string): { month: number; year: number } | null => {
  const cleaned = raw.trim();
  const slashMatch = cleaned.match(/^(\d{1,2})\s*[\/\-]\s*(\d{4})$/);
  if (slashMatch) {
    const m = Number(slashMatch[1]);
    const y = Number(slashMatch[2]);
    if (m >= 1 && m <= 12 && y >= 1920 && y <= new Date().getFullYear()) {
      return { month: m, year: y };
    }
  }
  const sixDigitMatch = cleaned.match(/^(\d{2})(\d{4})$/);
  if (sixDigitMatch) {
    const m = Number(sixDigitMatch[1]);
    const y = Number(sixDigitMatch[2]);
    if (m >= 1 && m <= 12 && y >= 1920 && y <= new Date().getFullYear()) {
      return { month: m, year: y };
    }
  }
  const yearOnlyMatch = cleaned.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    const y = Number(yearOnlyMatch[1]);
    if (y >= 1920 && y <= new Date().getFullYear()) {
      return { month: 1, year: y };
    }
  }
  return null;
};

// Helper for child discount badge
export const getPassengerDiscountBadge = (
  ageVal: string | number | undefined,
  child5To7Percent: number = 50,
  child8To11Percent: number = 75
) => {
  const ageStr = String(ageVal ?? '').trim();
  if (ageStr === '') {
    return { label: 'Adult (100%)', color: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
  }
  const ageNum = Number(ageStr);
  if (isNaN(ageNum) || ageNum < 0) {
    return { label: 'Adult (100%)', color: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
  }
  if (ageNum < 5) {
    return { label: 'Free (<5y: 0%)', color: 'bg-emerald-100 text-emerald-900 border-emerald-400' };
  }
  if (ageNum >= 5 && ageNum <= 7) {
    return { label: `Child 5-7y (${child5To7Percent}%)`, color: 'bg-amber-100 text-amber-900 border-amber-400' };
  }
  if (ageNum >= 8 && ageNum <= 11) {
    return { label: `Child 8-11y (${child8To11Percent}%)`, color: 'bg-sky-100 text-sky-900 border-sky-400' };
  }
  return { label: 'Adult (100%)', color: 'bg-zinc-100 text-zinc-800 border-zinc-300' };
};

const isChildAge = (ageVal: string | number | undefined): boolean => {
  const ageStr = String(ageVal ?? '').trim();
  if (!ageStr) return false;
  const n = Number(ageStr);
  return !isNaN(n) && n >= 0 && n < 12;
};

const MONTHS_LIST = [
  { value: 1, label: '01 - Jan' },
  { value: 2, label: '02 - Feb' },
  { value: 3, label: '03 - Mar' },
  { value: 4, label: '04 - Apr' },
  { value: 5, label: '05 - May' },
  { value: 6, label: '06 - Jun' },
  { value: 7, label: '07 - Jul' },
  { value: 8, label: '08 - Aug' },
  { value: 9, label: '09 - Sep' },
  { value: 10, label: '10 - Oct' },
  { value: 11, label: '11 - Nov' },
  { value: 12, label: '12 - Dec' },
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
  const [tourType, setTourType] = useState<TourType>('Group Tour');
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
  // Per-row MM/YYYY text state (e.g. "10/2000")
  const [memberDobInputs, setMemberDobInputs] = useState<Record<number, string>>({});

  // Pricing & Discount Settings Panel State
  const [showPricingSettings, setShowPricingSettings] = useState(false);

  // Optional Age Calculator Tool State
  const [showAgeCalcTool, setShowAgeCalcTool] = useState(false);
  const [calcPassengerIndex, setCalcPassengerIndex] = useState(0);
  const [calcBirthMonth, setCalcBirthMonth] = useState<number>(new Date().getMonth() + 1);
  const [calcBirthYear, setCalcBirthYear] = useState<number | string>(2018);

  // Payment Details & Metadata
  const [paymentMode, setPaymentMode] = useState<TourPaymentMode>('Online');
  const [walletName, setWalletName] = useState<string>(() => {
    const isSahil = currentUserProfile?.name?.toLowerCase().includes('sahil') || user?.displayName?.toLowerCase().includes('sahil');
    const sahilW = tourWallets.find((w) => w.name.toLowerCase().includes('sahil'));
    const rizwanW = tourWallets.find((w) => w.name.toLowerCase().includes('rizwan'));
    if (isSahil && sahilW) return sahilW.name;
    return rizwanW?.name || tourWallets[0]?.name || 'Rizwan (Tour)';
  });
  const [bookedBy, setBookedBy] = useState<string>('Rizwan');
  const [specialNotes, setSpecialNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dynamic Pricing Rates from Firestore
  const currentSleeperPrice = tourPricingSettings?.sleeperPrice ?? 13999;
  const currentAcTrainPrice = tourPricingSettings?.acTrainPrice ?? 15999;
  const currentCoupleSurcharge = tourPricingSettings?.coupleRoomSurcharge ?? 3000;
  const currentChild5To7Percent = tourPricingSettings?.child5To7Percent ?? 50;
  const currentChild8To11Percent = tourPricingSettings?.child8To11Percent ?? 75;

  // Base Rate per Adult
  const baseRatePerAdult = useMemo(() => {
    if (travelClass === 'Sleeper Train' || travelClass === 'Non-AC Sleeper' || travelClass === 'Non-AC Train') {
      return currentSleeperPrice;
    }
    return currentAcTrainPrice;
  }, [travelClass, currentSleeperPrice, currentAcTrainPrice]);

  // Helper to sync top Adults & Kids counters directly from Passenger Manifest ages
  const syncCountsFromMembersList = (list: TourMember[]) => {
    let kids = 0;
    let adults = 0;
    list.forEach((m) => {
      if (isChildAge(m.age)) {
        kids++;
      } else {
        adults++;
      }
    });
    setAdultsCount(adults);
    setKidsCount(kids);
  };

  // Calculate Auto Total Amount directly from Passenger Ages + Couple Rooms (Never double-counts!)
  const calculatedTotal = useMemo(() => {
    let total = 0;

    members.forEach((m) => {
      if (isChildAge(m.age)) {
        const ageNum = Number(m.age);
        if (ageNum < 5) {
          total += 0; // Infant (<5 yrs): Free
        } else if (ageNum >= 5 && ageNum <= 7) {
          total += Math.round(baseRatePerAdult * (currentChild5To7Percent / 100));
        } else if (ageNum >= 8 && ageNum <= 11) {
          total += Math.round(baseRatePerAdult * (currentChild8To11Percent / 100));
        }
      } else {
        total += baseRatePerAdult;
      }
    });

    if (couplesCount > 0) {
      total += couplesCount * currentCoupleSurcharge;
    }

    return total;
  }, [members, baseRatePerAdult, couplesCount, currentCoupleSurcharge, currentChild5To7Percent, currentChild8To11Percent]);

  // Update totalAmount when auto-calculating and manual override is off
  useEffect(() => {
    if (!isManualPrice) {
      setTotalAmount(calculatedTotal);
    }
  }, [calculatedTotal, isManualPrice]);

  const handleCoupleCountChange = (delta: number) => {
    const nextCouples = Math.max(0, couplesCount + delta);
    if (nextCouples === couplesCount) return;
    const diff = (nextCouples - couplesCount) * currentCoupleSurcharge;
    setCouplesCount(nextCouples);

    if (isManualPrice) {
      setTotalAmount((prev) => Math.max(0, Number(prev || 0) + diff));
    }
  };

  const handleTravelClassChange = (newClass: TravelClass) => {
    if (travelClass === newClass) return;
    const oldBase =
      travelClass === 'Sleeper Train' || travelClass === 'Non-AC Sleeper' || travelClass === 'Non-AC Train'
        ? currentSleeperPrice
        : currentAcTrainPrice;
    const newBase =
      newClass === 'Sleeper Train' || newClass === 'Non-AC Sleeper' || newClass === 'Non-AC Train'
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
    setMemberDobInputs({});

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
      const initialMembers =
        editingTourBooking.members && editingTourBooking.members.length > 0
          ? editingTourBooking.members
          : [{ name: editingTourBooking.customerName || '', age: '30', gender: 'Male' as const }];
      setMembers(initialMembers);
      syncCountsFromMembersList(initialMembers);
      setCouplesCount(editingTourBooking.couplesCount ?? 0);
      setTotalAmount(editingTourBooking.totalAmount ?? '');
      setAdvancePaid(editingTourBooking.advancePaid ?? '');
      setPaymentMode(editingTourBooking.paymentMode || 'Online');
      setWalletName(editingTourBooking.walletName || 'Rizwan (Tour)');
      setBookedBy(editingTourBooking.bookedBy || 'Rizwan');
      setSpecialNotes(editingTourBooking.specialNotes || '');
      setIsManualPrice(true);
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
      const isSahil = currentUserProfile?.name?.toLowerCase().includes('sahil') || user?.displayName?.toLowerCase().includes('sahil');
      const sahilW = tourWallets.find((w) => w.name.toLowerCase().includes('sahil'));
      const rizwanW = tourWallets.find((w) => w.name.toLowerCase().includes('rizwan'));
      const defaultWallet = isSahil && sahilW ? sahilW.name : (rizwanW?.name || tourWallets[0]?.name || 'Rizwan (Tour)');
      setWalletName(defaultWallet);
      setBookedBy('Rizwan');
      setSpecialNotes('');
      setIsManualPrice(false);
    }
  }, [isOpen, editingTourBooking, preselectedBatchId, currentUserProfile, user, tourBatches]);

  const handleModalClose = () => {
    setEditingTourBooking(null);
    onClose();
  };

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (!batchId) return;
    const batch = tourBatches.find((b) => b.id === batchId);
    if (batch) {
      setTourBatchTitle(batch.title);
      setTourTitle(batch.title);
      setDestination(batch.destination);
      setTourDate(batch.departureDate);
    }
  };

  const handleTourTypeChange = (type: TourType) => {
    setTourType(type);
    if (type === 'Group Tour') {
      if (!selectedBatchId && tourBatches.length > 0) {
        handleBatchSelect(tourBatches[0].id);
      }
    } else {
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

  // Top Adults +/- Button Handler
  const handleAdultsStep = (delta: number) => {
    if (delta > 0) {
      const updated: TourMember[] = [
        ...members,
        { name: '', age: '30', gender: members.length % 2 === 1 ? 'Female' : 'Male' },
      ];
      setMembers(updated);
      syncCountsFromMembersList(updated);
    } else {
      if (adultsCount <= 1 && kidsCount === 0) return;
      if (adultsCount <= 0) return;
      // Remove the last adult row
      const lastAdultIdx = [...members].map((m) => !isChildAge(m.age)).lastIndexOf(true);
      if (lastAdultIdx !== -1 && members.length > 1) {
        const updated = members.filter((_, i) => i !== lastAdultIdx);
        setMembers(updated);
        syncCountsFromMembersList(updated);
      }
    }
  };

  // Top Kids +/- Button Handler
  const handleKidsStep = (delta: number) => {
    if (delta > 0) {
      const updated: TourMember[] = [
        ...members,
        { name: '', age: '7', gender: 'Child' },
      ];
      setMembers(updated);
      syncCountsFromMembersList(updated);
    } else {
      if (kidsCount <= 0 || members.length <= 1) return;
      // Remove the last child row
      const lastKidIdx = [...members].map((m) => isChildAge(m.age)).lastIndexOf(true);
      if (lastKidIdx !== -1) {
        const updated = members.filter((_, i) => i !== lastKidIdx);
        setMembers(updated);
        syncCountsFromMembersList(updated);
      }
    }
  };

  if (!isOpen) return null;

  const addMemberRow = () => {
    const updated: TourMember[] = [
      ...members,
      { name: '', age: '30', gender: 'Male' },
    ];
    setMembers(updated);
    syncCountsFromMembersList(updated);
  };

  const removeMemberRow = (idx: number) => {
    if (members.length <= 1) return;
    const updated = members.filter((_, i) => i !== idx);
    setMembers(updated);
    syncCountsFromMembersList(updated);
  };

  const updateMember = (idx: number, field: keyof TourMember, val: any) => {
    setMembers((prev) => {
      const copy = [...prev];
      const updatedRow = { ...copy[idx], [field]: val };

      // When age is changed, auto-set gender to Child if <12 (or Male/Female if >=12 and was Child)
      if (field === 'age') {
        if (isChildAge(String(val))) {
          updatedRow.gender = 'Child';
        } else if (updatedRow.gender === 'Child') {
          updatedRow.gender = 'Male';
        }
      }

      copy[idx] = updatedRow;
      syncCountsFromMembersList(copy);
      return copy;
    });
  };

  // Handle inline MM/YYYY input (e.g. "10/2000")
  const handleMemberDobInputChange = (idx: number, rawVal: string) => {
    let formatted = rawVal;
    // Auto-insert slash if user types 2 digits of a valid month (01-12) followed by a 3rd digit
    const digitsOnly = rawVal.replace(/[^\d]/g, '');
    if (!rawVal.includes('/') && !rawVal.includes('-') && digitsOnly.length >= 3) {
      const firstTwo = Number(digitsOnly.slice(0, 2));
      if (firstTwo >= 1 && firstTwo <= 12) {
        formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 6)}`;
      }
    }

    setMemberDobInputs((prev) => ({ ...prev, [idx]: formatted }));

    const parsed = parseMonthYearString(formatted);
    if (parsed) {
      const calculatedAge = calculateAgeFromMonthYear(parsed.year, parsed.month);
      updateMember(idx, 'age', String(calculatedAge));
    }
  };

  // Apply calculated age from dedicated tool to specific passenger
  const handleApplyCalculatedAge = () => {
    const y = Number(calcBirthYear);
    if (!y || y < 1920 || y > new Date().getFullYear()) return;
    const computedAge = calculateAgeFromMonthYear(y, calcBirthMonth);
    const targetIdx = Math.min(calcPassengerIndex, members.length - 1);
    const mmStr = String(calcBirthMonth).padStart(2, '0');
    setMemberDobInputs((prev) => ({ ...prev, [targetIdx]: `${mmStr}/${y}` }));
    updateMember(targetIdx, 'age', String(computedAge));
    setShowAgeCalcTool(false);
  };

  const numTotal = Number(totalAmount || 0);
  const numAdvance = Number(advancePaid || 0);
  const pendingAmount = Math.max(0, numTotal - numAdvance);
  const balanceDue = pendingAmount;

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

    const validMembers = members
      .filter((m) => m.name.trim() !== '')
      .map((m) => ({
        name: m.name.trim(),
        age: m.age || '30',
        gender: m.gender || (isChildAge(m.age) ? 'Child' : 'Male'),
      }));

    if (validMembers.length === 0) {
      validMembers.push({
        name: customerName.trim(),
        age: members[0]?.age || '30',
        gender: members[0]?.gender || 'Male',
      });
    }

    // Re-verify final adult & kid counts from members
    const finalKidsCount = members.filter((m) => isChildAge(m.age)).length;
    const finalAdultsCount = Math.max(0, members.length - finalKidsCount);

    setIsSubmitting(true);
    try {
      const selectedBatch = tourBatches.find((b) => b.id === selectedBatchId);
      const bookingNumber =
        editingTourBooking?.bookingNumber || `SZ-TOUR-${Math.floor(1000 + Math.random() * 9000)}`;

      const bookingData = {
        bookingNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        city: city.trim() || 'Bhuj',
        destination: destination.trim(),
        tourTitle: tourTitle.trim() || `${destination} Tour`,
        tourBatchTitle:
          tourType === 'Group Tour'
            ? selectedBatch?.title || tourBatchTitle.trim() || '15 november'
            : tourBatchTitle.trim() || `Private Tour - ${tourDate}`,
        tourBatchId: tourType === 'Group Tour' ? selectedBatchId || '' : '',
        tourDate: tourDate || new Date().toISOString().split('T')[0],
        tourType,
        travelClass,
        packageCategory,
        membersCount: members.length,
        adultsCount: finalAdultsCount,
        kidsCount: finalKidsCount,
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

      saveCustomerToContactsCache({
        name: customerName.trim(),
        phoneNumber: customerPhone.trim(),
      }).catch(() => {});

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
    if (window.confirm(`Delete booking ${editingTourBooking.bookingNumber} for ${editingTourBooking.customerName}?`)) {
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white text-zinc-950 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[98vh] sm:max-h-[94vh] flex flex-col">
        {/* Compact Header */}
        <div className="bg-white px-3.5 py-3 sm:px-5 sm:py-3.5 border-b-2 border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs shrink-0">
              {editingTourBooking ? <Edit2 className="w-4 h-4" /> : <Plus className="w-5 h-5 stroke-[3]" />}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h2 className="text-xs sm:text-base font-black tracking-tight text-zinc-950 truncate">
                {editingTourBooking ? 'Edit Tour Booking' : 'New Tour Booking'}
              </h2>
              <span className="text-[10px] sm:text-[11px] font-mono font-black bg-blue-100 text-blue-900 px-1.5 py-0.5 sm:px-2 rounded-lg border border-blue-300 shrink-0">
                {editingTourBooking?.bookingNumber || 'SZ-TOUR'}
              </span>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-2.5 sm:p-5 overflow-y-auto space-y-3 text-xs flex-1 bg-zinc-50/50">
            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border-2 border-rose-400 text-rose-900 rounded-xl text-xs font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* 1. Tour Type & Batch Selection */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-blue-600" />
                  1. Tour Batch &amp; Date
                </span>

                {/* Compact Group vs Private Toggle */}
                <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-300">
                  <button
                    type="button"
                    onClick={() => handleTourTypeChange('Group Tour')}
                    className={`py-1 px-2.5 rounded-lg font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                      tourType === 'Group Tour'
                        ? 'bg-zinc-950 text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    <Users size={12} />
                    <span>Group Tour</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTourTypeChange('Private Tour')}
                    className={`py-1 px-2.5 rounded-lg font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                      tourType === 'Private Tour'
                        ? 'bg-zinc-950 text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    <Car size={12} />
                    <span>Private Tour</span>
                  </button>
                </div>
              </div>

              {tourType === 'Group Tour' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                      Tour Date Folder *
                    </label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => handleBatchSelect(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-2 text-zinc-950 font-bold focus:outline-none"
                    >
                      <option value="">-- Select Tour Date Folder --</option>
                      {tourBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          📁 {b.title} • {b.departureDate} ({b.destination})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                      Destination *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kashmir"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase flex items-center gap-1">
                      <Calendar size={12} className="text-blue-600" />
                      <span>Departure Date *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={tourDate}
                      onChange={(e) => {
                        setTourDate(e.target.value);
                        setTourBatchTitle(`Private Tour - ${e.target.value}`);
                      }}
                      className="w-full bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-zinc-950 font-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                      Destination *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kashmir / Kerala"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Customer Contact & City */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                2. Customer Details
              </span>

              <GoogleContactsAutofill
                selectedName={customerName}
                selectedPhone={customerPhone}
                onSelectContact={({ name, phoneNumber }) => {
                  if (name) setCustomerName(name);
                  if (phoneNumber) setCustomerPhone(phoneNumber);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-Digit Mobile"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bhuj"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Travel Class & PAX Counters (Auto-synced with Passenger Ages!) */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Train className="w-4 h-4 text-amber-600" />
                  3. Travel Class &amp; Package
                </span>
                <button
                  type="button"
                  onClick={() => setShowPricingSettings(!showPricingSettings)}
                  className="px-2 py-0.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Settings size={11} />
                  <span>Rates ({currentChild5To7Percent}% / {currentChild8To11Percent}%)</span>
                </button>
              </div>

              {showPricingSettings && (
                <div className="animate-in fade-in">
                  <PricingDiscountSettingsPanel onClose={() => setShowPricingSettings(false)} />
                </div>
              )}

              {/* Package Rate Selector Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleTravelClassChange('AC Train')}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    travelClass === 'AC Train' || travelClass === '3AC Train'
                      ? 'bg-blue-50 border-blue-600 text-zinc-950 ring-1 ring-blue-600'
                      : 'bg-white border-zinc-300 text-zinc-600 hover:border-zinc-900'
                  }`}
                >
                  <span className="font-black text-xs text-zinc-950">🚆 3AC Train</span>
                  <span className="text-xs font-black text-blue-700 font-mono">
                    ₹{currentAcTrainPrice.toLocaleString('en-IN')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTravelClassChange('Sleeper Train')}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    travelClass === 'Sleeper Train' || travelClass === 'Non-AC Sleeper'
                      ? 'bg-amber-50 border-amber-500 text-zinc-950 ring-1 ring-amber-500'
                      : 'bg-white border-zinc-300 text-zinc-600 hover:border-zinc-900'
                  }`}
                >
                  <span className="font-black text-xs text-zinc-950">🚂 Sleeper</span>
                  <span className="text-xs font-black text-amber-700 font-mono">
                    ₹{currentSleeperPrice.toLocaleString('en-IN')}
                  </span>
                </button>
              </div>

              {/* PAX Counts: Adults, Kids, Couples */}
              <div className="grid grid-cols-3 gap-2">
                {/* Adults Count */}
                <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-300">
                  <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">
                    Adults (12+ yrs)
                  </label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleAdultsStep(-1)}
                      className="w-6 h-6 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-black flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-zinc-950 font-mono">{adultsCount}</span>
                    <button
                      type="button"
                      onClick={() => handleAdultsStep(1)}
                      className="w-6 h-6 rounded-lg bg-zinc-950 hover:bg-black text-white font-black flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Kids Count (Auto-synced when passenger age < 12) */}
                <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-300">
                  <label className="block text-[10px] font-black uppercase text-amber-900 mb-1">
                    Kids (&lt;12 yrs)
                  </label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleKidsStep(-1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-amber-100 text-amber-950 font-black flex items-center justify-center border border-amber-300 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-amber-950 font-mono">{kidsCount}</span>
                    <button
                      type="button"
                      onClick={() => handleKidsStep(1)}
                      className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Couple Separate Room */}
                <div className="bg-pink-50/60 p-2 rounded-xl border border-pink-300">
                  <label className="block text-[10px] font-black uppercase text-pink-800 mb-1 flex items-center gap-1">
                    <Heart size={10} className="fill-pink-500 text-pink-500" /> Room (+₹{currentCoupleSurcharge})
                  </label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCoupleCountChange(-1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-pink-100 text-pink-900 font-black flex items-center justify-center border border-pink-300 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-pink-700 font-mono">{couplesCount}</span>
                    <button
                      type="button"
                      onClick={() => handleCoupleCountChange(1)}
                      className="w-6 h-6 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-black flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Passenger Manifest (Auto-syncs Kids & Fare when Age or MM/YYYY is entered) */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-600" />
                  4. Passengers ({members.length} Pax: {adultsCount} Adult, {kidsCount} Kid)
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAgeCalcTool(!showAgeCalcTool)}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator size={12} />
                    <span>Age Tool</span>
                  </button>

                  <button
                    type="button"
                    onClick={addMemberRow}
                    className="px-2.5 py-1 bg-zinc-950 hover:bg-black text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> + Add Pax
                  </button>
                </div>
              </div>

              {/* Optional Month/Year Dropdown Age Tool */}
              {showAgeCalcTool && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <select
                    value={calcPassengerIndex}
                    onChange={(e) => setCalcPassengerIndex(Number(e.target.value))}
                    className="bg-white border border-amber-300 rounded-lg px-2 py-1 font-bold text-zinc-900"
                  >
                    {members.map((m, idx) => (
                      <option key={idx} value={idx}>
                        Pax #{idx + 1} {m.name ? `(${m.name})` : ''}
                      </option>
                    ))}
                  </select>
                  <select
                    value={calcBirthMonth}
                    onChange={(e) => setCalcBirthMonth(Number(e.target.value))}
                    className="bg-white border border-amber-300 rounded-lg px-2 py-1 font-bold text-zinc-900"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Year (e.g. 2018)"
                    min={1925}
                    max={new Date().getFullYear()}
                    value={calcBirthYear}
                    onChange={(e) => setCalcBirthYear(e.target.value)}
                    className="bg-white border border-amber-300 rounded-lg px-2 py-1 font-black text-zinc-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCalculatedAge}
                    className="py-1 px-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black rounded-lg cursor-pointer"
                  >
                    Set {calculateAgeFromMonthYear(Number(calcBirthYear), calcBirthMonth)} yrs
                  </button>
                </div>
              )}

              {/* Compact Passenger Rows */}
              <div className="space-y-2">
                {members.map((m, idx) => {
                  const discountInfo = getPassengerDiscountBadge(
                    m.age,
                    currentChild5To7Percent,
                    currentChild8To11Percent
                  );

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-300 space-y-2 sm:space-y-1.5"
                    >
                      {/* DESKTOP LAYOUT (1-Line Flex - 100% Unchanged on PC) */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-zinc-950 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                          {idx + 1}
                        </span>

                        {/* Name */}
                        <input
                          type="text"
                          placeholder={`Passenger ${idx + 1} Name`}
                          value={m.name}
                          onChange={(e) => updateMember(idx, 'name', e.target.value)}
                          className="flex-1 min-w-0 bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-zinc-950 font-bold text-xs focus:border-zinc-900 focus:outline-none"
                        />

                        {/* Age */}
                        <input
                          type="number"
                          min={0}
                          max={110}
                          placeholder="Age"
                          value={m.age}
                          onChange={(e) => updateMember(idx, 'age', e.target.value)}
                          className="w-14 bg-white border-2 border-zinc-900 rounded-lg px-1.5 py-1 text-center text-zinc-950 text-xs font-black font-mono focus:outline-none"
                        />

                        {/* Gender */}
                        <select
                          value={m.gender}
                          onChange={(e) => updateMember(idx, 'gender', e.target.value)}
                          className="w-20 bg-white border border-zinc-300 rounded-lg px-1.5 py-1.5 text-zinc-950 text-xs font-bold focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Child">Child</option>
                        </select>

                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMemberRow(idx)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Remove passenger"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* MOBILE LAYOUT (Spacious 2 Rows - Full Width Name Input) */}
                      <div className="sm:hidden space-y-2">
                        {/* Mobile Row 1: Index + Full-Width Name + Delete */}
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-zinc-950 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder={`Passenger ${idx + 1} Full Name`}
                            value={m.name}
                            onChange={(e) => updateMember(idx, 'name', e.target.value)}
                            className="flex-1 min-w-0 bg-white border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold text-xs focus:outline-none"
                          />
                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMemberRow(idx)}
                              className="p-1.5 rounded-lg bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                              title="Remove passenger"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Mobile Row 2: Age + Gender + DOB Input + Discount Badge */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-zinc-500">Age:</span>
                            <input
                              type="number"
                              min={0}
                              max={110}
                              placeholder="Age"
                              value={m.age}
                              onChange={(e) => updateMember(idx, 'age', e.target.value)}
                              className="w-12 bg-white border-2 border-zinc-900 rounded-lg px-1 py-1 text-center text-zinc-950 text-xs font-black font-mono focus:outline-none"
                            />
                          </div>

                          <select
                            value={m.gender}
                            onChange={(e) => updateMember(idx, 'gender', e.target.value)}
                            className="bg-white border border-zinc-300 rounded-lg px-1.5 py-1 text-zinc-950 text-xs font-bold focus:outline-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Child">Child</option>
                          </select>

                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[10px] font-bold text-zinc-500">DOB:</span>
                            <input
                              type="text"
                              placeholder="10/2018"
                              value={memberDobInputs[idx] || ''}
                              onChange={(e) => handleMemberDobInputChange(idx, e.target.value)}
                              className="w-20 bg-white border border-zinc-300 rounded-md px-1.5 py-0.5 text-xs font-bold text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none"
                            />
                          </div>

                          <span className={`px-2 py-0.5 rounded-md border font-black text-[10px] ${discountInfo.color}`}>
                            {discountInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Desktop Inline MM/YYYY Auto Age Input + Fare Badge */}
                      <div className="hidden sm:flex items-center justify-between text-[10px] pl-7 gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-zinc-600 font-bold">
                          <span>🎂 DOB (MM/YYYY):</span>
                          <input
                            type="text"
                            placeholder="e.g. 10/2018"
                            value={memberDobInputs[idx] || ''}
                            onChange={(e) => handleMemberDobInputChange(idx, e.target.value)}
                            className="w-28 bg-white border border-zinc-300 rounded-md px-2 py-0.5 text-[11px] font-bold text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none"
                          />
                        </div>

                        <span className={`px-2 py-0.5 rounded-md border font-black text-[10px] ${discountInfo.color}`}>
                          {discountInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Amount & Payment Details */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  5. Payment Details
                </span>

                <label className="flex items-center gap-1.5 text-[11px] text-zinc-700 cursor-pointer font-bold select-none">
                  <input
                    type="checkbox"
                    checked={isManualPrice}
                    onChange={(e) => {
                      setIsManualPrice(e.target.checked);
                      if (!e.target.checked) {
                        setTotalAmount(calculatedTotal);
                      }
                    }}
                    className="rounded border-zinc-400 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Manual Price</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Total Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-600 font-bold uppercase">
                      Total (₹) *
                    </label>
                    {isManualPrice && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualPrice(false);
                          setTotalAmount(calculatedTotal);
                        }}
                        className="text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 cursor-pointer"
                      >
                        Auto: ₹{calculatedTotal.toLocaleString('en-IN')}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    value={totalAmount}
                    onChange={(e) => {
                      setTotalAmount(e.target.value);
                      setIsManualPrice(true);
                    }}
                    className={`w-full bg-white border-2 rounded-xl px-2.5 py-1.5 text-zinc-950 font-mono font-black text-sm focus:outline-none ${
                      isManualPrice ? 'border-amber-500' : 'border-zinc-900'
                    }`}
                  />
                </div>

                {/* Advance Paid */}
                <div>
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                    Advance Paid (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                    className="w-full bg-white border-2 border-emerald-600 rounded-xl px-2.5 py-1.5 text-emerald-800 font-mono font-black text-sm focus:outline-none"
                  />
                </div>

                {/* Baaki / Due */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-600 font-bold uppercase">
                      Baaki Due (₹)
                    </label>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                        paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {paymentStatus}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 border border-zinc-300 rounded-xl px-2.5 py-1.5 text-rose-600 font-mono font-black text-sm">
                    {formatCurrency(balanceDue)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                    Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as TourPaymentMode)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold focus:outline-none"
                  >
                    <option value="Online">📱 Online (UPI/Bank)</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="Cash">💵 Cash</option>
                    <option value="Offline">💵 Offline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                    Account Wallet
                  </label>
                  <select
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold focus:outline-none"
                  >
                    {tourWallets.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Booked By Selection (Rizwan, Mustak or Custom Name Input) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-600 font-bold uppercase">
                      Booked By *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setBookedBy('Rizwan')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                          bookedBy === 'Rizwan' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        Rizwan
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookedBy('Mustak')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                          bookedBy === 'Mustak' ? 'bg-amber-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        Mustak
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rizwan / Mustak / Staff"
                    value={bookedBy}
                    onChange={(e) => setBookedBy(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold text-xs focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold uppercase">
                    Special Note
                  </label>
                  <input
                    type="text"
                    placeholder="Room / food note (optional)"
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-1.5 text-zinc-950 font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-5 py-3 bg-white border-t-2 border-zinc-900 flex items-center justify-between gap-2 shrink-0">
            {editingTourBooking ? (
              <button
                type="button"
                onClick={handleDeleteCurrentBooking}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-black border border-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : editingTourBooking
                    ? 'Update Booking'
                    : 'Save Booking & Slip'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
