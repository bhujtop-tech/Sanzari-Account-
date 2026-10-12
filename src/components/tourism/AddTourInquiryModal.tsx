import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MapPin,
  Calendar,
  Users,
  MessageCircle,
  Instagram,
  CheckCircle2,
  Trash2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { addTourInquiry, updateTourInquiry } from '../../services/db';
import { InquirySource, InquiryStatus, TourInquiry, TravelClass } from '../../types';
import { GoogleContactsAutofill } from './GoogleContactsAutofill';

interface AddTourInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTourInquiryModal: React.FC<AddTourInquiryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const {
    tourInquiries,
    setTourInquiries,
    customTourPackages,
    editingTourInquiry,
    setEditingTourInquiry,
    deleteTourInquiryById,
    openInquiryPdf,
  } = useData();

  const isEditing = Boolean(editingTourInquiry);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [source, setSource] = useState<InquirySource>('Phone Call');
  const [destination, setDestination] = useState('Kashmir');
  const [fromCity, setFromCity] = useState('Vadodara');
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [paxAdults, setPaxAdults] = useState<number>(2);
  const [paxChildren, setPaxChildren] = useState<number>(0);
  const [travelMode, setTravelMode] = useState<string>('Train');
  const [travelClass, setTravelClass] = useState<TravelClass | string>('AC Train');
  const [preferredDate, setPreferredDate] = useState('');
  const [budget, setBudget] = useState('');
  const [packageCategory, setPackageCategory] = useState<'Standard' | 'Deluxe' | 'Super Deluxe' | 'Luxury'>('Deluxe');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<InquiryStatus>('New');
  const [followUpDate, setFollowUpDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('Rizwan');
  const [linkedPackageId, setLinkedPackageId] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prefill when editing
  useEffect(() => {
    if (editingTourInquiry) {
      setCustomerName(editingTourInquiry.customerName || '');
      setCustomerPhone(editingTourInquiry.customerPhone || '');
      setSource(editingTourInquiry.source || 'Phone Call');
      setDestination(editingTourInquiry.destination || '');
      setFromCity(editingTourInquiry.fromCity || 'Vadodara');
      setDiscussionSummary(editingTourInquiry.discussionSummary || '');
      setPaxAdults(editingTourInquiry.paxAdults || 2);
      setPaxChildren(editingTourInquiry.paxChildren || 0);
      setTravelMode(editingTourInquiry.travelMode || 'Train');
      setTravelClass(editingTourInquiry.travelClass || 'AC Train');
      setPreferredDate(editingTourInquiry.preferredDate || '');
      setBudget(String(editingTourInquiry.budget || ''));
      setPackageCategory(editingTourInquiry.packageCategory || 'Deluxe');
      setNotes(editingTourInquiry.notes || '');
      setStatus(editingTourInquiry.status || 'New');
      setFollowUpDate(editingTourInquiry.followUpDate || '');
      setAssignedTo(editingTourInquiry.assignedTo || 'Rizwan');
      setLinkedPackageId(editingTourInquiry.linkedPackageId || '');
    } else {
      // Defaults for new inquiry
      setCustomerName('');
      setCustomerPhone('');
      setSource('Phone Call');
      setDestination('Kashmir');
      setFromCity('Vadodara');
      setDiscussionSummary('');
      setPaxAdults(2);
      setPaxChildren(0);
      setTravelMode('Train');
      setTravelClass('AC Train');
      setPreferredDate('');
      setBudget('');
      setPackageCategory('Deluxe');
      setNotes('');
      setStatus('New');
      setFollowUpDate(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
      setAssignedTo('Rizwan');
      setLinkedPackageId(customTourPackages[0]?.id || '');
    }
    setError('');
  }, [editingTourInquiry, isOpen, customTourPackages]);

  if (!isOpen) return null;

  const totalPax = Number(paxAdults || 0) + Number(paxChildren || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Please enter customer name');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Please enter mobile or WhatsApp number');
      return;
    }

    setSaving(true);
    setError('');

    const linkedPkg = customTourPackages.find((p) => p.id === linkedPackageId);

    const inquiryPayload: Omit<TourInquiry, 'id' | 'inquiryNumber' | 'createdAt' | 'updatedAt'> = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      source,
      destination: destination.trim(),
      fromCity: fromCity.trim(),
      discussionSummary: discussionSummary.trim(),
      paxAdults: Number(paxAdults) || 1,
      paxChildren: Number(paxChildren) || 0,
      totalPax,
      travelMode: travelMode as any,
      travelClass,
      preferredDate,
      budget: budget.trim(),
      packageCategory,
      notes: notes.trim(),
      status,
      followUpDate,
      assignedTo,
      linkedPackageId,
      linkedPackageTitle: linkedPkg?.packageName || linkedPkg?.packageNameGujarati,
    };

    try {
      if (isEditing && editingTourInquiry) {
        // Update
        setTourInquiries((prev) =>
          prev.map((inq) =>
            inq.id === editingTourInquiry.id
              ? { ...inq, ...inquiryPayload, updatedAt: new Date().toISOString() }
              : inq
          )
        );
        await updateTourInquiry(
          editingTourInquiry.id,
          inquiryPayload,
          user?.email || 'admin@sanzari.com'
        );
      } else {
        // Add new
        const now = new Date().toISOString();
        const tempId = `inq_${Date.now()}`;
        const newRecord: TourInquiry = {
          ...inquiryPayload,
          id: tempId,
          inquiryNumber: `INQ-${Date.now().toString().slice(-4)}`,
          createdAt: now,
          updatedAt: now,
        };

        setTourInquiries((prev) => [newRecord, ...prev]);

        await addTourInquiry(inquiryPayload, user?.email || 'admin@sanzari.com');
      }

      setEditingTourInquiry(null);
      onClose();
    } catch (err: any) {
      console.error('Failed to save inquiry:', err);
      setError(err?.message || 'Failed to save inquiry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!editingTourInquiry) return;
    if (window.confirm(`Are you sure you want to delete inquiry for ${editingTourInquiry.customerName}?`)) {
      try {
        await deleteTourInquiryById(editingTourInquiry.id);
        setEditingTourInquiry(null);
        onClose();
      } catch (err) {
        console.error('Delete inquiry error:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header - White Background, Black Border */}
        <div className="bg-white p-5 text-zinc-950 flex items-center justify-between shrink-0 border-b-2 border-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold">
              📋
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950">
                {isEditing ? 'Edit Tour Inquiry' : 'New Tour Inquiry'}
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Record customer leads from Instagram, WhatsApp &amp; phone calls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDeleteCurrent}
                title="Delete Inquiry"
                className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={() => {
                setEditingTourInquiry(null);
                onClose();
              }}
              className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 hover:text-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* Quick Auto-fill from Google Contacts (sanzaritourism@gmail.com) */}
          <GoogleContactsAutofill
            selectedName={customerName}
            selectedPhone={customerPhone}
            onSelectContact={({ name, phoneNumber }) => {
              if (name) setCustomerName(name);
              if (phoneNumber) setCustomerPhone(phoneNumber);
            }}
          />

          {/* Section: Customer & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Customer Name */}
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Customer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Shah / Ramesh Patel"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            {/* Customer Phone */}
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Mobile Number (Phone/WA) *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98250 14522"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            {/* Inquiry Source */}
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Inquiry Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as InquirySource)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              >
                <option value="Phone Call">📞 Phone Call</option>
                <option value="WhatsApp">💬 WhatsApp</option>
                <option value="Instagram">📷 Instagram</option>
                <option value="Walk-in">🚶 Walk-in (Office)</option>
                <option value="Reference">👥 Reference</option>
                <option value="Other">🌐 Other</option>
              </select>
            </div>
          </div>

          {/* Destination & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Destination (Where to go?) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kashmir / Manali - Shimla / Goa / Kerala"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Customer City (From)
              </label>
              <input
                type="text"
                placeholder="e.g. Vadodara / Ahmedabad / Anand / Surat"
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Pax, Travel Mode, Preferred Date */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
            <div>
              <label className="text-[10px] font-black text-zinc-700 uppercase block">
                Adults (12+ yrs)
              </label>
              <input
                type="number"
                min="1"
                value={paxAdults}
                onChange={(e) => setPaxAdults(Number(e.target.value))}
                className="w-full text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded-lg p-2 mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-700 uppercase block">
                Children (under 12 yrs)
              </label>
              <input
                type="number"
                min="0"
                value={paxChildren}
                onChange={(e) => setPaxChildren(Number(e.target.value))}
                className="w-full text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded-lg p-2 mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-700 uppercase block">
                Travel Class / Mode
              </label>
              <select
                value={travelClass}
                onChange={(e) => setTravelClass(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded-lg p-2 mt-1"
              >
                <option value="AC Train">🚆 3AC Train</option>
                <option value="Non-AC Train">🚞 Sleeper Train</option>
                <option value="Flight">✈️ Flight / Air</option>
                <option value="Volvo Bus">🚌 Volvo Bus</option>
                <option value="Self Drive">🚗 Cab / Private</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-700 uppercase block">
                Preferred Date / Month
              </label>
              <input
                type="text"
                placeholder="e.g. 15 Nov / Diwali"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded-lg p-2 mt-1"
              />
            </div>
          </div>

          {/* Core Feature: "Kya baat hui" / Discussion summary */}
          <div className="space-y-1">
            <label className="text-xs font-black text-zinc-950 uppercase tracking-wider flex items-center justify-between">
              <span>Discussion Summary (Kya Baat Hui) *</span>
              <span className="text-[10px] font-normal text-zinc-500">
                Customer preferences &amp; conversation notes
              </span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Enter conversation details: e.g. Family trip of 4 pax, asked for vegetarian meal options, requested 3AC train vs flight cost, preferred 3-star hotel stay..."
              value={discussionSummary}
              onChange={(e) => setDiscussionSummary(e.target.value)}
              className="w-full text-xs font-medium text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-3 focus:outline-none focus:bg-white leading-relaxed"
            />
          </div>

          {/* Link Custom Tour Package */}
          <div className="space-y-1">
            <label className="text-xs font-black text-zinc-950 uppercase tracking-wider block">
              Link Tour Package (Package Information for WhatsApp &amp; PDF)
            </label>
            <select
              value={linkedPackageId}
              onChange={(e) => setLinkedPackageId(e.target.value)}
              className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
            >
              <option value="">-- Select Tour Package (Optional) --</option>
              {customTourPackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.packageName} ({pkg.destination}) - {pkg.durationDays}D/{pkg.durationNights}N
                </option>
              ))}
            </select>
          </div>

          {/* Status, Follow-up date & Assigned Employee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Inquiry Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InquiryStatus)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              >
                <option value="New">🟡 New Lead</option>
                <option value="In Discussion">🔵 In Discussion</option>
                <option value="Package Sent">🟣 Package Sent</option>
                <option value="Follow-up">🟠 Follow-up Required</option>
                <option value="Converted">🟢 Converted (Booked)</option>
                <option value="Lost">🔴 Lost / Cancelled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Follow-up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                Assigned Staff
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full text-xs font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-900 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              >
                <option value="Rizwan">Rizwan</option>
                <option value="Sahil">Sahil</option>
                <option value="Avesh">Avesh</option>
                <option value="Office Staff">Office Staff</option>
              </select>
            </div>
          </div>

          {/* Extra Notes */}
          <div className="space-y-1">
            <label className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
              Extra Notes / Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Sent PDF proposal on WhatsApp, follow-up on Monday morning."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingTourInquiry(null);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Inquiry' : 'Save Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
