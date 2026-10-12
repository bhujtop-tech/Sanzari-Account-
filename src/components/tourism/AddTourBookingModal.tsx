import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  User,
  Phone,
  IndianRupee,
  Wallet as WalletIcon,
  Train,
  Users,
  CheckCircle2,
  FileText,
  Folder,
  Edit2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { addTourBooking, updateTourBooking, deleteTourBooking } from '../../services/db';
import { TourMember, TourType, TravelClass, TourPaymentMode, PaymentMethod } from '../../types';
import { GoogleContactsAutofill } from './GoogleContactsAutofill';

interface AddTourBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBatchId?: string;
}

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
  } = useData();
  const { currentUserProfile } = useAuth();

  // Form State
  const [selectedBatchId, setSelectedBatchId] = useState<string>(preselectedBatchId || '');
  const [destination, setDestination] = useState('');
  const [tourTitle, setTourTitle] = useState('');
  const [tourDate, setTourDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Tour Choices
  const [tourType, setTourType] = useState<TourType>('Group Tour');
  const [travelClass, setTravelClass] = useState<TravelClass>('AC Train');

  // Members List (Name & Age)
  const [members, setMembers] = useState<TourMember[]>([
    { name: '', age: '', gender: 'Male' },
  ]);

  // Payment Details
  const [totalAmount, setTotalAmount] = useState<number | string>('');
  const [advancePaid, setAdvancePaid] = useState<number | string>('');
  const [paymentMode, setPaymentMode] = useState<TourPaymentMode>('Online');

  const [walletName, setWalletName] = useState<string>(() => {
    const defaultTour = tourWallets.find((w) => w.name.toLowerCase().includes('rizwan')) || tourWallets[0];
    return defaultTour?.name || 'Rizwan (Tour)';
  });
  const [specialNotes, setSpecialNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset or pre-fill form state when modal opens or editingTourBooking changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingTourBooking) {
      setSelectedBatchId(editingTourBooking.tourBatchId || '');
      setDestination(editingTourBooking.destination || '');
      setTourTitle(editingTourBooking.tourTitle || '');
      setTourDate(editingTourBooking.tourDate || new Date().toISOString().split('T')[0]);
      setCustomerName(editingTourBooking.customerName || '');
      setCustomerPhone(editingTourBooking.customerPhone || '');
      setTourType(editingTourBooking.tourType || 'Group Tour');
      setTravelClass(editingTourBooking.travelClass || 'AC Train');
      setMembers(
        editingTourBooking.members && editingTourBooking.members.length > 0
          ? editingTourBooking.members
          : [{ name: editingTourBooking.customerName || '', age: '', gender: 'Male' }]
      );
      setTotalAmount(editingTourBooking.totalAmount ?? '');
      setAdvancePaid(editingTourBooking.advancePaid ?? '');
      setPaymentMode(editingTourBooking.paymentMode || 'Online');
      setWalletName(editingTourBooking.walletName || 'Rizwan (Tour)');
      setSpecialNotes(editingTourBooking.specialNotes || '');
    } else {
      if (preselectedBatchId) {
        setSelectedBatchId(preselectedBatchId);
      } else {
        setSelectedBatchId('');
      }
      setDestination('');
      setTourTitle('');
      setTourDate(new Date().toISOString().split('T')[0]);
      setCustomerName('');
      setCustomerPhone('');
      setTourType('Group Tour');
      setTravelClass('AC Train');
      setMembers([{ name: '', age: '', gender: 'Male' }]);
      setTotalAmount('');
      setAdvancePaid('');
      setPaymentMode('Online');
      const defaultTour = tourWallets.find((w) => w.name.toLowerCase().includes('rizwan')) || tourWallets[0];
      setWalletName(defaultTour?.name || 'Rizwan (Tour)');
      setSpecialNotes('');
    }
  }, [isOpen, editingTourBooking, preselectedBatchId]);

  const handleModalClose = () => {
    setEditingTourBooking(null);
    onClose();
  };

  useEffect(() => {
    if (selectedBatchId) {
      const batch = tourBatches.find((b) => b.id === selectedBatchId);
      if (batch) {
        setTourTitle(batch.title);
        setDestination(batch.destination);
        setTourDate(batch.departureDate);
        setTourType(batch.tourType);
        if (batch.travelMode) {
          setTravelClass(batch.travelMode as TravelClass);
        }

        // Calculate rate based on travel class and member ages
        let adultRate = batch.priceAcTrain || batch.basePricePerPerson || 16000;
        if (travelClass === 'Non-AC Train' || travelClass === 'Non-AC Sleeper') {
          adultRate = batch.priceNonAcTrain || 14000;
        } else if (travelClass === 'Flight') {
          adultRate = batch.priceFlight || 22000;
        } else if (travelClass === 'AC Train') {
          adultRate = batch.priceAcTrain || batch.basePricePerPerson || 16000;
        }

        const childRate = batch.priceChildHalf || 7000;

        let totalEst = 0;
        members.forEach((m) => {
          const ageNum = Number(m.age || 0);
          if (ageNum > 0 && ageNum < 7) {
            totalEst += childRate;
          } else {
            totalEst += adultRate;
          }
        });

        if (totalEst > 0 && (!totalAmount || !editingTourBooking)) {
          setTotalAmount(totalEst);
        }
      }
    }
  }, [selectedBatchId, tourBatches, travelClass, members.length]);

  // Sync first member name with customer name if empty
  useEffect(() => {
    if (customerName && members.length === 1 && !members[0].name) {
      setMembers([{ name: customerName, age: members[0].age || '', gender: 'Male' }]);
    }
  }, [customerName]);

  if (!isOpen) return null;

  const addMemberRow = () => {
    setMembers((prev) => [
      ...prev,
      { name: '', age: '', gender: 'Male' },
    ]);
  };

  const removeMemberRow = (idx: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, field: keyof TourMember, val: any) => {
    setMembers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const numTotal = Number(totalAmount || 0);
  const numAdvance = Number(advancePaid || 0);
  const pendingAmount = Math.max(0, numTotal - numAdvance);

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
    if (numTotal <= 0) {
      setErrorMsg('Please enter Total Amount.');
      return;
    }

    // Clean members
    const validMembers = members
      .filter((m) => m.name.trim() !== '')
      .map((m) => ({
        name: m.name.trim(),
        age: m.age || '',
        gender: m.gender || 'Male',
      }));

    if (validMembers.length === 0) {
      validMembers.push({
        name: customerName.trim(),
        age: '',
        gender: 'Male',
      });
    }

    setIsSubmitting(true);
    try {
      const selectedBatch = tourBatches.find((b) => b.id === selectedBatchId);
      const bookingNumber = editingTourBooking?.bookingNumber || `ST-${Date.now().toString().slice(-6)}`;
      const pStatus = numAdvance >= numTotal ? 'Paid' : numAdvance > 0 ? 'Partial' : 'Pending';

      const bookingData = {
        tourTitle: tourTitle || selectedBatch?.title || `${destination} Tour`,
        tourBatchId: selectedBatchId || '',
        tourBatchTitle: selectedBatch ? selectedBatch.title : tourTitle || `${destination} Tour`,
        destination: destination.trim(),
        tourDate: tourDate || new Date().toISOString().split('T')[0],
        monthKey: (tourDate || new Date().toISOString().split('T')[0]).substring(0, 7),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        tourType,
        travelClass,
        packageCategory: 'Deluxe' as const,
        bookingStatus: 'Confirmed' as const,
        membersCount: validMembers.length,
        members: validMembers,
        totalAmount: numTotal,
        advancePaid: numAdvance,
        paymentMode,
        paymentMethod: (paymentMode === 'Online' ? 'UPI' : 'Cash') as PaymentMethod,
        walletName: walletName || tourWallets[0]?.name || 'Rizwan (Tour)',
        specialNotes: specialNotes.trim(),
      };

      if (editingTourBooking) {
        await updateTourBooking(
          editingTourBooking.id,
          bookingData,
          currentUserProfile?.email || 'admin@sanzari.com'
        );

        setTourReceiptBooking({
          ...editingTourBooking,
          ...bookingData,
          pendingAmount,
          paymentStatus: pStatus,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const newBookingId = await addTourBooking(
          bookingData,
          currentUserProfile?.email || 'admin@sanzari.com'
        );

        setTourReceiptBooking({
          ...bookingData,
          id: typeof newBookingId === 'string' ? newBookingId : (newBookingId as any)?.id || Date.now().toString(),
          bookingNumber,
          pendingAmount,
          paymentStatus: pStatus,
          createdAt: new Date().toISOString(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 text-white rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header - Signature Black */}
        <div className="bg-zinc-900/90 px-5 sm:px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
              {editingTourBooking ? <Edit2 className="w-5 h-5 stroke-[2.5]" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{editingTourBooking ? 'Edit Tour Booking' : 'New Tour Booking'}</span>
                {editingTourBooking && (
                  <span className="text-xs font-mono font-bold bg-blue-950 text-blue-300 px-2 py-0.5 rounded-lg border border-blue-800/60">
                    {editingTourBooking.bookingNumber}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                {editingTourBooking ? 'Modify customer details, member count, tour date & payment' : 'Add passenger manifest, tour date & payment hisab'}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

          {/* 1. Tour Folder / Date Selection */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                1. Select Tour Date / Folder
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">Monthly Tour</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Tour Date Folder (e.g. 10 Oct Kashmir)
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Existing Tour Folder --</option>
                  {tourBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📁 {b.departureDate} - {b.title} ({b.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Destination
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kashmir, Goa, Manali, Kerala"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Tour Date
                </label>
                <input
                  type="date"
                  required
                  value={tourDate}
                  onChange={(e) => setTourDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Tour Name / Group Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10 Oct Kashmir Autumn Tour"
                  value={tourTitle}
                  onChange={(e) => setTourTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* 2. Customer Contact */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              2. Customer Details
            </span>

            {/* Quick Auto-fill from Google Contacts (sanzaritourism@gmail.com) */}
            <GoogleContactsAutofill
              selectedName={customerName}
              selectedPhone={customerPhone}
              onSelectContact={({ name, phoneNumber }) => {
                if (name) setCustomerName(name);
                if (phoneNumber) setCustomerPhone(phoneNumber);
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rizwan Khan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Mobile Number (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* 3. Tour Type & Train Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tour Type */}
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Tour Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Group Tour', 'Private Tour'] as TourType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTourType(t)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border ${
                      tourType === t
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Mode (AC / Non-AC / Flight) */}
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Train className="w-3.5 h-3.5 text-amber-400" />
                Travel Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['AC Train', 'Non-AC Train', 'Flight'] as TravelClass[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTravelClass(c)}
                    className={`py-2 px-1.5 rounded-xl font-bold text-xs transition-all border ${
                      travelClass === c
                        ? c === 'Flight'
                          ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                          : 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {c === 'Flight' ? '✈️ Flight' : c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Members (Name & Age for each member) */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                4. Members List ({members.length} {members.length === 1 ? 'Person' : 'Members'})
              </span>
              <button
                type="button"
                onClick={addMemberRow}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
              >
                <Plus size={13} /> + Add Member
              </button>
            </div>

            <div className="space-y-2">
              {members.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
                >
                  <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`Member ${idx + 1} Full Name`}
                      value={m.name}
                      onChange={(e) => updateMember(idx, 'name', e.target.value)}
                      className="w-full bg-transparent text-white font-medium placeholder:text-zinc-600 focus:outline-none text-xs"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Age"
                      value={m.age}
                      onChange={(e) => updateMember(idx, 'age', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-center text-white text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMemberRow(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Financials: Total Amount, Advance, Due, Mode */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
              5. Amount & Payment Mode
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Total Amount */}
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Total Tour Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 45000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Advance Paid */}
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Advance Paid (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Due Balance */}
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Remaining Due (₹)
                </label>
                <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold text-sm">
                  {formatCurrency(pendingAmount)}
                </div>
              </div>
            </div>

            {/* Payment Mode & Wallet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Online', 'Offline'] as TourPaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-1.5 px-3 rounded-xl font-bold text-xs border transition-all ${
                        paymentMode === mode
                          ? 'bg-zinc-100 text-zinc-950 border-white'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {mode === 'Online' ? '📱 Online (UPI/Bank)' : '💵 Cash (Offline)'}
                    </button>
                  ))}
                </div>
              </div>

              {numAdvance > 0 && (
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                    Wallet (Received By)
                  </label>
                  <select
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-medium focus:outline-none"
                  >
                    {tourWallets.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.name} ({formatCurrency(w.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 6. Any Note */}
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Need lower berth, vegetarian food, airport pickup"
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
            />
          </div>

          </div>

          {/* Sticky Pinned Bottom Action Footer */}
          <div className="px-5 sm:px-6 py-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            {editingTourBooking ? (
              <button
                type="button"
                onClick={handleDeleteCurrentBooking}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : editingTourBooking
                    ? 'Update Booking & Slip'
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
