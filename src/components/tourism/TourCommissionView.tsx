import React, { useState, useMemo } from 'react';
import {
  IndianRupee,
  Search,
  Folder,
  Sliders,
  Phone,
  MapPin,
  Luggage,
  Calendar,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Wallet,
  CheckCircle2,
  X,
  Trash2,
  History,
  Sparkles,
  ArrowUpRight,
  Pencil,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { TourBatch, TourBooking, TourMember, TourPaymentMode } from '../../types';
import { addTourExpense, deleteTourExpense } from '../../services/db';
import { PricingDiscountSettingsPanel } from './PricingDiscountSettingsPanel';

export const isBillableForCommission = (member: TourMember): boolean => {
  const ageStr = String(member?.age ?? '').trim();
  if (ageStr === '') return true; // default adult
  const ageNum = Number(ageStr);
  if (isNaN(ageNum) || ageNum < 0) return true;
  return ageNum >= 5; // < 5 yrs (infant 0% fare) is excluded, 5+ yrs (50%, 82%, 100% fare) included
};

export const getBillablePaxCount = (booking: TourBooking): number => {
  const members = Array.isArray(booking.members) ? booking.members : [];
  if (members.length === 0) {
    return Math.max(1, (booking.adultsCount || 0) + (booking.kidsCount || 0));
  }
  return members.filter(isBillableForCommission).length;
};

export const resolveBookedBy = (b: TourBooking): string => {
  if (b.bookedBy && b.bookedBy.trim()) {
    return b.bookedBy.trim();
  }
  const wallet = (b.walletName || '').toLowerCase();
  const notes = (b.specialNotes || '').toLowerCase();
  if (wallet.includes('mustak') || notes.includes('mustak')) {
    return 'Mustak';
  }
  return 'Rizwan';
};

export const isPrivateTourBooking = (b: TourBooking, batches: TourBatch[]): boolean => {
  if (b.tourType === 'Private Tour' || b.tourType === 'Custom Package') return true;
  if (!b.tourBatchId) return true;
  const hasBatch = batches.some((tb) => tb.id === b.tourBatchId);
  return !hasBatch;
};

export const TourCommissionView: React.FC = () => {
  const {
    tourBookings,
    tourBatches,
    tourExpenses,
    tourWallets,
    tourPricingSettings,
    openEditTourExpenseModal,
    formatCurrency,
    formatDate,
  } = useData();
  const { currentUserProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [personFilter, setPersonFilter] = useState<'Mustak' | 'Rizwan' | 'ALL'>('Mustak');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [expandedBookingIds, setExpandedBookingIds] = useState<Record<string, boolean>>({});

  // Commission Payout Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutTargetFolderId, setPayoutTargetFolderId] = useState<string>('ALL');
  const [payoutAmount, setPayoutAmount] = useState<number | string>('');
  const [payoutWalletId, setPayoutWalletId] = useState<string>('');
  const [payoutMode, setPayoutMode] = useState<TourPaymentMode>('UPI');
  const [payoutDate, setPayoutDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [deletingPayoutId, setDeletingPayoutId] = useState<string | null>(null);

  const ratePerPax = tourPricingSettings?.commissionRatePerPax ?? 200;

  // Bookings matching the person filter (before folder/search filter)
  const personBookings = useMemo(() => {
    return tourBookings.filter((b) => {
      const bBy = resolveBookedBy(b).toLowerCase();
      if (personFilter === 'Mustak' && !bBy.includes('mustak')) return false;
      if (personFilter === 'Rizwan' && !bBy.includes('rizwan')) return false;
      return true;
    });
  }, [tourBookings, personFilter]);

  // All Commission Payout records for the selected person
  const personCommissionPayouts = useMemo(() => {
    return tourExpenses
      .filter((e) => {
        const isComm =
          e.category === 'Mustak Commission' ||
          (e.description || '').toLowerCase().includes('commission') ||
          Boolean(e.paidToPerson);
        if (!isComm) return false;

        if (personFilter === 'Mustak') {
          const desc = (e.description || '').toLowerCase();
          const paidTo = (e.paidToPerson || '').toLowerCase();
          return (
            e.category === 'Mustak Commission' ||
            paidTo.includes('mustak') ||
            desc.includes('mustak') ||
            !paidTo.includes('rizwan')
          );
        }
        if (personFilter === 'Rizwan') {
          const desc = (e.description || '').toLowerCase();
          const paidTo = (e.paidToPerson || '').toLowerCase();
          return paidTo.includes('rizwan') || desc.includes('rizwan');
        }
        return true;
      })
      .sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
  }, [tourExpenses, personFilter]);

  // Build Date Folder & Private Tour Options with Earned / Paid / Pending stats
  const folderCommissionOptions = useMemo(() => {
    const options: Array<{
      id: string;
      type: 'batch' | 'private_all' | 'private_single';
      title: string;
      shortBadge: string;
      dateStr: string;
      destination: string;
      bookingsCount: number;
      billablePax: number;
      earned: number;
      paidOut: number;
      pending: number;
    }> = [];

    // 1. Group Tour Date Folders (tourBatches)
    tourBatches.forEach((batch) => {
      const bks = personBookings.filter((b) => b.tourBatchId === batch.id);
      const billablePax = bks.reduce((s, b) => s + getBillablePaxCount(b), 0);
      const earned = billablePax * ratePerPax;
      const paidOut = personCommissionPayouts
        .filter((p) => p.tourBatchId === batch.id)
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      const pending = Math.max(0, earned - paidOut);

      options.push({
        id: batch.id,
        type: 'batch',
        title: `📂 ${batch.departureDate} • ${batch.title} (${batch.destination})`,
        shortBadge: `📂 ${batch.departureDate} • ${batch.title}`,
        dateStr: batch.departureDate,
        destination: batch.destination,
        bookingsCount: bks.length,
        billablePax,
        earned,
        paidOut,
        pending,
      });
    });

    // 2. Private Tour Bookings (bookings with tourType === 'Private Tour' or no matching batch)
    const privateBookings = personBookings.filter((b) => isPrivateTourBooking(b, tourBatches));
    if (privateBookings.length > 0) {
      const privBillable = privateBookings.reduce((s, b) => s + getBillablePaxCount(b), 0);
      const privEarned = privBillable * ratePerPax;
      const privPaid = personCommissionPayouts
        .filter(
          (p) =>
            p.tourBatchId === 'ALL_PRIVATE' ||
            (p.tourBatchId || '').startsWith('PRIVATE_') ||
            (p.tourTitle || '').toLowerCase().includes('private')
        )
        .reduce((s, p) => s + Number(p.amount || 0), 0);

      options.push({
        id: 'ALL_PRIVATE',
        type: 'private_all',
        title: `🚗 All Private Tour Bookings (${privateBookings.length} Bookings)`,
        shortBadge: `🚗 All Private Tours (${privateBookings.length})`,
        dateStr: '',
        destination: 'Private Tours',
        bookingsCount: privateBookings.length,
        billablePax: privBillable,
        earned: privEarned,
        paidOut: privPaid,
        pending: Math.max(0, privEarned - privPaid),
      });

      privateBookings.forEach((pb) => {
        const pbPax = getBillablePaxCount(pb);
        const pbEarned = pbPax * ratePerPax;
        const pbFolderId = `PRIVATE_${pb.id}`;
        const pbPaid = personCommissionPayouts
          .filter((p) => p.tourBatchId === pbFolderId)
          .reduce((s, p) => s + Number(p.amount || 0), 0);

        options.push({
          id: pbFolderId,
          type: 'private_single',
          title: `🚗 Private (${pb.tourDate || 'Date'}) • ${pb.customerName} (${pb.destination})`,
          shortBadge: `🚗 Private (${pb.tourDate}) • ${pb.customerName}`,
          dateStr: pb.tourDate || '',
          destination: pb.destination || 'Private Tour',
          bookingsCount: 1,
          billablePax: pbPax,
          earned: pbEarned,
          paidOut: pbPaid,
          pending: Math.max(0, pbEarned - pbPaid),
        });
      });
    }

    return options;
  }, [tourBatches, personBookings, personCommissionPayouts, ratePerPax]);

  // Filter bookings by Person, Folder/Private selection, and Search
  const filteredBookings = useMemo(() => {
    return personBookings.filter((b) => {
      if (selectedBatchId !== 'ALL') {
        if (selectedBatchId === 'ALL_PRIVATE') {
          if (!isPrivateTourBooking(b, tourBatches)) return false;
        } else if (selectedBatchId.startsWith('PRIVATE_')) {
          const targetBookingId = selectedBatchId.replace('PRIVATE_', '');
          if (b.id !== targetBookingId) return false;
        } else if (b.tourBatchId !== selectedBatchId) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cName = (b.customerName || '').toLowerCase();
        const cPhone = String(b.customerPhone || '');
        const cDest = (b.destination || '').toLowerCase();
        const bNum = (b.bookingNumber || '').toLowerCase();
        const tDate = (b.tourDate || '').toLowerCase();
        return (
          cName.includes(q) ||
          cPhone.includes(q) ||
          cDest.includes(q) ||
          bNum.includes(q) ||
          tDate.includes(q)
        );
      }

      return true;
    });
  }, [personBookings, selectedBatchId, tourBatches, searchQuery]);

  // Filter Commission Payout records matching current folder filter
  const commissionPayouts = useMemo(() => {
    if (selectedBatchId === 'ALL') return personCommissionPayouts;
    if (selectedBatchId === 'ALL_PRIVATE') {
      return personCommissionPayouts.filter(
        (p) =>
          p.tourBatchId === 'ALL_PRIVATE' ||
          (p.tourBatchId || '').startsWith('PRIVATE_') ||
          (p.tourTitle || '').toLowerCase().includes('private')
      );
    }
    return personCommissionPayouts.filter((p) => p.tourBatchId === selectedBatchId);
  }, [personCommissionPayouts, selectedBatchId]);

  // Overall Statistics for selected Person / Filter
  const stats = useMemo(() => {
    let totalBookings = 0;
    let totalPax = 0;
    let totalBillablePax = 0;
    let totalCommission = 0;

    filteredBookings.forEach((b) => {
      totalBookings += 1;
      totalPax += b.membersCount || b.members?.length || 1;
      const billable = getBillablePaxCount(b);
      totalBillablePax += billable;
      totalCommission += billable * ratePerPax;
    });

    const totalPaidOut = commissionPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingCommission = Math.max(0, totalCommission - totalPaidOut);

    return {
      totalBookings,
      totalPax,
      totalBillablePax,
      totalCommission,
      totalPaidOut,
      pendingCommission,
    };
  }, [filteredBookings, ratePerPax, commissionPayouts]);

  // Dynamic Commission Stats inside the Payout Modal based on `payoutTargetFolderId`
  const modalFolderStats = useMemo(() => {
    if (payoutTargetFolderId === 'ALL') {
      const allBillable = personBookings.reduce((s, b) => s + getBillablePaxCount(b), 0);
      const allEarned = allBillable * ratePerPax;
      const allPaid = personCommissionPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);
      return {
        label: 'All Date Folders & Private Tours',
        billablePax: allBillable,
        earned: allEarned,
        paidOut: allPaid,
        pending: Math.max(0, allEarned - allPaid),
      };
    }

    const foundOpt = folderCommissionOptions.find((o) => o.id === payoutTargetFolderId);
    if (foundOpt) {
      return {
        label: foundOpt.shortBadge,
        billablePax: foundOpt.billablePax,
        earned: foundOpt.earned,
        paidOut: foundOpt.paidOut,
        pending: foundOpt.pending,
      };
    }

    return {
      label: 'Selected Tour Folder',
      billablePax: stats.totalBillablePax,
      earned: stats.totalCommission,
      paidOut: stats.totalPaidOut,
      pending: stats.pendingCommission,
    };
  }, [
    payoutTargetFolderId,
    personBookings,
    ratePerPax,
    personCommissionPayouts,
    folderCommissionOptions,
    stats,
  ]);

  const toggleExpand = (id: string) => {
    setExpandedBookingIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectPayoutFolder = (folderId: string) => {
    setPayoutTargetFolderId(folderId);
    const targetPerson = personFilter === 'ALL' ? 'Mustak' : personFilter;

    if (folderId === 'ALL') {
      const allBillable = personBookings.reduce((s, b) => s + getBillablePaxCount(b), 0);
      const allEarned = allBillable * ratePerPax;
      const allPaid = personCommissionPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);
      const pend = Math.max(0, allEarned - allPaid);
      setPayoutAmount(pend > 0 ? pend : '');
      setPayoutNotes(`${targetPerson} Commission Payout`);
    } else {
      const opt = folderCommissionOptions.find((o) => o.id === folderId);
      if (opt) {
        setPayoutAmount(opt.pending > 0 ? opt.pending : opt.earned > 0 ? opt.earned : '');
        setPayoutNotes(`${targetPerson} Commission • ${opt.shortBadge.replace(/^[📂🚗]\s*/, '')}`);
      }
    }
  };

  const openPayoutModal = (initialFolderId?: string) => {
    setPayoutError('');
    const startFolder = initialFolderId || selectedBatchId || 'ALL';
    setPayoutDate(new Date().toISOString().split('T')[0]);
    if (tourWallets.length > 0 && !payoutWalletId) {
      const defW =
        tourWallets.find((w) => w.name.toLowerCase().includes('sahil')) ||
        tourWallets.find((w) => w.name.toLowerCase().includes('rizwan')) ||
        tourWallets[0];
      if (defW) setPayoutWalletId(defW.id);
    }
    handleSelectPayoutFolder(startFolder);
    setIsPayoutModalOpen(true);
  };

  const activePayoutWallet =
    tourWallets.find((w) => w.id === payoutWalletId) ||
    tourWallets[0] || { id: 'rizwan-tour', name: 'Rizwan (Tour)', currentBalance: 0 };

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');

    const parsedAmt = Number(payoutAmount);
    if (!parsedAmt || parsedAmt <= 0) {
      setPayoutError('Please enter a valid commission payout amount.');
      return;
    }

    const targetPerson = personFilter === 'ALL' ? 'Mustak' : personFilter;
    const selectedOpt = folderCommissionOptions.find((o) => o.id === payoutTargetFolderId);

    setIsSubmittingPayout(true);
    try {
      await addTourExpense(
        {
          tourBatchId: payoutTargetFolderId !== 'ALL' ? payoutTargetFolderId : '',
          tourTitle: selectedOpt
            ? selectedOpt.shortBadge
            : `${targetPerson} Overall Commission`,
          destination: selectedOpt?.destination || '',
          category: 'Mustak Commission',
          amount: parsedAmt,
          walletId: activePayoutWallet.id,
          walletName: activePayoutWallet.name,
          paymentMode: payoutMode,
          paidToPerson: targetPerson,
          date: payoutDate,
          monthKey: payoutDate.substring(0, 7),
          description: payoutNotes.trim() || `${targetPerson} Commission Payout`,
        },
        currentUserProfile?.email || 'admin@sanzari.com'
      );

      setIsPayoutModalOpen(false);
    } catch (err: any) {
      console.error('Failed to record commission payout:', err);
      setPayoutError(err.message || 'Failed to save commission payout.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleDeletePayout = async (id: string) => {
    setDeletingPayoutId(id);
    try {
      await deleteTourExpense(id, currentUserProfile?.email || 'admin@sanzari.com');
    } catch (err) {
      console.error('Failed to delete commission payout:', err);
    } finally {
      setDeletingPayoutId(null);
    }
  };

  const getBookingFolderBadge = (b: TourBooking) => {
    if (isPrivateTourBooking(b, tourBatches)) {
      return {
        isPrivate: true,
        text: `🚗 Private Tour (${b.tourDate || 'Custom Date'})`,
      };
    }
    const batch = tourBatches.find((tb) => tb.id === b.tourBatchId);
    return {
      isPrivate: false,
      text: `📂 ${batch?.departureDate || b.tourDate} • ${batch?.title || b.tourTitle}`,
    };
  };

  return (
    <div className="space-y-4 pb-48 sm:pb-24">
      {/* Settings Modal if open */}
      {showSettingsModal && (
        <PricingDiscountSettingsPanel isModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Commission Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[94vh] flex flex-col">
            <div className="bg-zinc-950 px-5 py-4 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center font-black shadow-sm">
                  <IndianRupee className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Record Commission Payout
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Select Date Folder or Private Tour &amp; Paid From Wallet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleRecordPayout}
              className="p-4 sm:p-5 space-y-4 text-zinc-800 overflow-y-auto flex-1"
            >
              {payoutError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                  {payoutError}
                </div>
              )}

              {/* 1. Select Date Folder OR Private Tour Booking */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                  <span>1. Kis Date Folder / Private Tour Ka Commission Hai? *</span>
                </label>
                <select
                  value={payoutTargetFolderId}
                  onChange={(e) => handleSelectPayoutFolder(e.target.value)}
                  className="w-full text-xs font-black bg-zinc-50 border-2 border-zinc-900 rounded-xl px-3 py-2.5 text-zinc-950 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">
                    📂 Overall All Tour Folders &amp; Private Tours ({personBookings.length} Bookings)
                  </option>

                  {folderCommissionOptions.filter((o) => o.type === 'batch').length > 0 && (
                    <optgroup label="📅 Group Tour Date Folders">
                      {folderCommissionOptions
                        .filter((o) => o.type === 'batch')
                        .map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.title} — {opt.billablePax} Pax ({formatCurrency(opt.earned)} | Baaki: {formatCurrency(opt.pending)})
                          </option>
                        ))}
                    </optgroup>
                  )}

                  {folderCommissionOptions.filter((o) => o.type !== 'batch').length > 0 && (
                    <optgroup label="🚗 Private Tour Bookings">
                      {folderCommissionOptions
                        .filter((o) => o.type !== 'batch')
                        .map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.title} — {opt.billablePax} Pax ({formatCurrency(opt.earned)} | Baaki: {formatCurrency(opt.pending)})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Live Commission Balance Summary for Selected Folder / Private Tour */}
              <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-black text-amber-950 px-0.5">
                  <span className="truncate">{modalFolderStats.label}</span>
                  <span className="shrink-0 font-mono">{modalFolderStats.billablePax} Pax</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-bold uppercase text-zinc-500 block">Total Earned</span>
                    <span className="text-xs font-black font-mono text-zinc-950">
                      {formatCurrency(modalFolderStats.earned)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-bold uppercase text-emerald-700 block">Paid Out</span>
                    <span className="text-xs font-black font-mono text-emerald-700">
                      {formatCurrency(modalFolderStats.paidOut)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-bold uppercase text-rose-700 block">Pending Baaki</span>
                    <span className="text-xs font-black font-mono text-rose-600">
                      {formatCurrency(modalFolderStats.pending)}
                    </span>
                  </div>
                </div>
                {modalFolderStats.pending > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(modalFolderStats.pending)}
                    className="w-full py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Pay Full Remaining ({formatCurrency(modalFolderStats.pending)})
                  </button>
                )}
              </div>

              {/* 2. Kis Account Se Gaye (Paid From Account) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-rose-600" />
                  <span>2. Kis Account Se Gaye? (Paid From Wallet) *</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {tourWallets.map((w) => {
                    const isSel = activePayoutWallet.id === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setPayoutWalletId(w.id)}
                        className={`p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                            : 'bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black truncate">
                            {w.name.replace(' (Tour)', '')}
                          </span>
                          {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <p
                          className={`text-[10px] font-mono font-bold mt-0.5 truncate ${
                            isSel ? 'text-amber-300' : 'text-zinc-500'
                          }`}
                        >
                          {formatCurrency(w.currentBalance)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                    3. Payout Amount (₹) *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 5000"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full text-base font-black bg-zinc-50 border-2 border-zinc-300 rounded-xl px-3 py-2 text-zinc-950 focus:bg-white focus:border-zinc-950 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold bg-zinc-50 border-2 border-zinc-300 rounded-xl px-3 py-2.5 text-zinc-900 focus:bg-white focus:border-zinc-950 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* 4. Payment Mode */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                  4. Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Cash', 'Online'] as TourPaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayoutMode(mode)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        payoutMode === mode
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                      }`}
                    >
                      {mode === 'UPI' ? '📱 UPI / GPay' : mode === 'Cash' ? '💵 Cash' : '🏦 Bank'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Notes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
                  Notes / Remark *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mustak Commission Payout via GPay"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  required
                  className="w-full text-xs font-semibold bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2.5 text-zinc-900 focus:bg-white focus:border-zinc-950 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout}
                  className="px-5 py-2.5 text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmittingPayout ? 'Saving Payout...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Page Title Bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap bg-white p-2 rounded-2xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 inline-flex">
              <IndianRupee size={20} className="stroke-[2.5]" />
            </span>
            <span>Tour Commission &amp; Payouts</span>
          </h2>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Date Folder-wise &amp; Private Tour commission tracking (5+ yrs billable pax)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openPayoutModal()}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <IndianRupee size={14} className="stroke-[2.5]" />
            <span>💸 Payout Commission</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-amber-300 font-extrabold text-xs flex items-center gap-1.5 border border-zinc-800 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Sliders size={14} />
            <span>Rate (₹{ratePerPax}/Pax)</span>
          </button>
        </div>
      </div>

      {/* Sleek Dark Summary Banner */}
      <div className="bg-zinc-950 text-white p-4 sm:p-6 rounded-3xl border-2 border-zinc-900 shadow-xl relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] uppercase font-black tracking-wider">
                {personFilter === 'ALL' ? '📂 All Bookings' : `👤 ${personFilter} Commission`}
              </span>
              <span className="text-xs font-mono text-zinc-400">Rate: ₹{ratePerPax} / Pax</span>
              {stats.totalPaidOut > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                  Paid: {formatCurrency(stats.totalPaidOut)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <div className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-amber-400">
                {formatCurrency(stats.pendingCommission)}
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Pending Baaki (Total Earned: {formatCurrency(stats.totalCommission)})
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              {stats.totalBillablePax} Billable Pax (5+ Yrs) across {stats.totalBookings} Confirmed Bookings (Group &amp; Private Tours)
            </p>
          </div>

          {/* Quick Booked By Filter Selector Pills */}
          <div className="flex flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setPersonFilter('Mustak')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  personFilter === 'Mustak'
                    ? 'bg-amber-400 text-zinc-950 shadow-md border border-amber-500'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <UserCheck size={14} />
                <span>Mustak</span>
              </button>
              <button
                type="button"
                onClick={() => setPersonFilter('Rizwan')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  personFilter === 'Rizwan'
                    ? 'bg-blue-600 text-white shadow-md border border-blue-500'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <UserCheck size={14} />
                <span>Rizwan</span>
              </button>
              <button
                type="button"
                onClick={() => setPersonFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  personFilter === 'ALL'
                    ? 'bg-white text-zinc-950 shadow-md'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <span>All ({tourBookings.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Clean Light Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">
            Total Earned
          </span>
          <span className="text-base sm:text-xl font-black text-zinc-950 font-mono block mt-0.5 truncate">
            {formatCurrency(stats.totalCommission)}
          </span>
          <span className="text-[10px] text-zinc-500 font-semibold block">
            {stats.totalBookings} Bookings
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block truncate">
            Commission Paid Out
          </span>
          <span className="text-base sm:text-xl font-black text-emerald-600 font-mono block mt-0.5 truncate">
            {formatCurrency(stats.totalPaidOut)}
          </span>
          <span className="text-[10px] text-zinc-500 font-semibold block">
            {commissionPayouts.length} Payout Records
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase block truncate">
            Pending (Baaki)
          </span>
          <span className="text-base sm:text-xl font-black text-rose-600 font-mono block mt-0.5 truncate">
            {formatCurrency(stats.pendingCommission)}
          </span>
          <span className="text-[10px] text-zinc-500 font-semibold block">
            Remaining to Pay
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">
            Billable Pax (≥5 Yrs)
          </span>
          <span className="text-base sm:text-xl font-black text-amber-600 font-mono block mt-0.5 truncate">
            {stats.totalBillablePax} Pax
          </span>
          <span className="text-[10px] text-zinc-500 font-semibold block">
            @ ₹{ratePerPax} / Pax
          </span>
        </div>
      </div>

      {/* Date Folder-wise & Private Tour-wise Quick Cards / Pills */}
      {folderCommissionOptions.filter((o) => o.bookingsCount > 0).length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border-2 border-zinc-900 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <Folder size={14} className="text-amber-600" />
              <span>Date Folder &amp; Private Tour Breakdown (Click to Filter or Payout)</span>
            </h3>
            {selectedBatchId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedBatchId('ALL')}
                className="text-[11px] font-black text-blue-600 hover:underline cursor-pointer"
              >
                Show All Folders
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {folderCommissionOptions
              .filter((o) => o.bookingsCount > 0 && o.type !== 'private_all')
              .map((opt) => {
                const isSelected = selectedBatchId === opt.id;
                const isPriv = opt.type === 'private_single';

                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedBatchId(isSelected ? 'ALL' : opt.id)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                        : isPriv
                        ? 'bg-purple-50/60 hover:bg-purple-50 border-purple-200 text-zinc-900'
                        : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 text-zinc-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-amber-400 text-zinc-950'
                              : isPriv
                              ? 'bg-purple-200 text-purple-950'
                              : 'bg-amber-200 text-amber-950'
                          }`}
                        >
                          {isPriv ? '🚗 PRIVATE' : '📂 FOLDER'}
                        </span>
                        <span className="text-xs font-black truncate">
                          {opt.shortBadge.replace(/^[📂🚗]\s*/, '')}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] font-semibold mt-1 ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-600'
                        }`}
                      >
                        {opt.billablePax} Pax • Earned: {formatCurrency(opt.earned)}
                        {opt.paidOut > 0 ? ` • Paid: ${formatCurrency(opt.paidOut)}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <span
                          className={`text-xs font-black font-mono block ${
                            isSelected
                              ? 'text-amber-300'
                              : opt.pending > 0
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {opt.pending > 0 ? formatCurrency(opt.pending) : '✓ Paid'}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase block ${
                            isSelected ? 'text-zinc-400' : 'text-zinc-400'
                          }`}
                        >
                          {opt.pending > 0 ? 'Baaki' : 'Cleared'}
                        </span>
                      </div>
                      {opt.pending > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPayoutModal(opt.id);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
                              : 'bg-zinc-900 text-amber-300 hover:bg-black'
                          }`}
                          title="Payout Commission for this Folder / Private Tour"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Commission Payout History (Record Section) */}
      <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-zinc-100 border-b-2 border-zinc-900 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-900" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">
              Commission Payout Records ({commissionPayouts.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => openPayoutModal()}
            className="px-3 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-amber-300 text-[11px] font-black cursor-pointer transition-colors"
          >
            + Record New Payout
          </button>
        </div>

        {commissionPayouts.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            No commission payouts recorded yet. Click <strong>&quot;💸 Payout Commission&quot;</strong> above when you pay Mustak from Rizwan or Sahil account.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {commissionPayouts.map((p) => (
              <div
                key={p.id}
                className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-zinc-950">
                        {p.description || 'Commission Payout'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-amber-300 text-[10px] font-black">
                        Paid from {p.walletName || 'Tour Account'}
                      </span>
                      {p.tourTitle && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-black">
                          {p.tourTitle}
                        </span>
                      )}
                      {p.paymentMode && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          {p.paymentMode}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-medium mt-0.5 flex items-center gap-2">
                      <span>📅 {formatDate(p.date)}</span>
                      {p.destination && <span>• 📍 {p.destination}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-sm sm:text-base font-black font-mono text-emerald-700">
                      -{formatCurrency(p.amount)}
                    </span>
                    <span className="block text-[9px] font-bold uppercase text-zinc-400">
                      Recorded Payout
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditTourExpenseModal(p)}
                      title="Edit payout record"
                      className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-zinc-950 border border-amber-400 text-[11px] font-black inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={deletingPayoutId === p.id}
                      onClick={() => handleDeletePayout(p.id)}
                      title="Delete payout record & refund wallet"
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search & Folder / Private Tour Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search customer, phone, date, destination or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950 font-medium"
          />
        </div>

        <div className="relative">
          <Folder className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full sm:w-auto pl-8 pr-7 py-2 text-xs font-black bg-zinc-100 border-2 border-zinc-900 rounded-xl text-zinc-950 focus:outline-none cursor-pointer"
          >
            <option value="ALL">📂 All Date Folders &amp; Private Tours</option>
            <option value="ALL_PRIVATE">🚗 All Private Tour Bookings</option>
            <optgroup label="📅 Group Tour Date Folders">
              {tourBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  📂 {b.departureDate} • {b.title} ({b.destination})
                </option>
              ))}
            </optgroup>
            {folderCommissionOptions.filter((o) => o.type === 'private_single').length > 0 && (
              <optgroup label="🚗 Individual Private Tour Bookings">
                {folderCommissionOptions
                  .filter((o) => o.type === 'private_single')
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Commission Breakdown List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-900 p-10 text-center space-y-2">
          <Luggage className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-black text-zinc-900">No Bookings Found for {personFilter}</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            There are no tour bookings matching your current Date Folder or Private Tour filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
          {/* Mobile View: Compact Single-Line Expandable List */}
          <div className="sm:hidden divide-y divide-zinc-200">
            {filteredBookings.map((b) => {
              const billableCount = getBillablePaxCount(b);
              const totalPax = b.membersCount || b.members?.length || 1;
              const commAmount = billableCount * ratePerPax;
              const bookedByPerson = resolveBookedBy(b);
              const folderBadge = getBookingFolderBadge(b);
              const isExpanded = Boolean(expandedBookingIds[b.id]);

              return (
                <div key={b.id} className="bg-white">
                  {/* Single Line Closed Card */}
                  <div
                    onClick={() => toggleExpand(b.id)}
                    className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-zinc-50 active:bg-zinc-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0">
                        {b.bookingNumber}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-zinc-950 truncate">
                            {b.customerName}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                              bookedByPerson.toLowerCase().includes('mustak')
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            👤 {bookedByPerson}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                              folderBadge.isPrivate
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                            }`}
                          >
                            {folderBadge.text}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                          📍 {b.destination} • {totalPax} Pax ({billableCount} Billable)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        +{formatCurrency(commAmount)}
                      </span>
                      <span className="text-zinc-400 text-xs">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Expanded Details */}
                  {isExpanded && (
                    <div className="p-3 bg-zinc-50 border-t border-zinc-200 space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white p-2 rounded-xl border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Contact Number</span>
                          <a
                            href={`tel:${b.customerPhone}`}
                            className="text-blue-600 font-mono font-bold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            📞 {b.customerPhone}
                          </a>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                            {folderBadge.isPrivate ? 'Private Tour Date' : 'Folder Departure Date'}
                          </span>
                          <span className="font-bold text-zinc-900 block mt-0.5">{b.tourDate}</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-zinc-200 flex items-center justify-between text-[11px] font-mono">
                        <div>
                          <span className="text-zinc-500 text-[10px] uppercase font-bold block">Commission Formula</span>
                          <span className="font-bold text-zinc-900">{billableCount} pax × ₹{ratePerPax}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-800 text-[10px] uppercase font-bold block">Total Earned</span>
                          <span className="font-black text-amber-700 text-sm">{formatCurrency(commAmount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Data Grid View (Hidden on Mobile) */}
          <div className="hidden sm:block overflow-x-auto">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-zinc-100 border-b-2 border-zinc-900 text-[11px] font-black uppercase tracking-wider text-zinc-700">
              <div className="col-span-2">Booking &amp; Date</div>
              <div className="col-span-3">Customer Info</div>
              <div className="col-span-3">Date Folder / Private Tour</div>
              <div className="col-span-2 text-center">Pax Breakdown</div>
              <div className="col-span-2 text-right">Commission Earned</div>
            </div>

            <div className="divide-y divide-zinc-200">
              {filteredBookings.map((b) => {
                const billableCount = getBillablePaxCount(b);
                const totalPax = b.membersCount || b.members?.length || 1;
                const infantCount = Math.max(0, totalPax - billableCount);
                const commAmount = billableCount * ratePerPax;
                const bookedByPerson = resolveBookedBy(b);
                const folderBadge = getBookingFolderBadge(b);

                return (
                  <div
                    key={b.id}
                    className="p-3.5 sm:p-4 hover:bg-zinc-50 transition-colors grid grid-cols-12 gap-3 items-center"
                  >
                    {/* Booking Code & Date */}
                    <div className="col-span-2">
                      <span className="text-xs font-mono font-black text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                        {b.bookingNumber}
                      </span>
                      <div className="text-[10px] text-zinc-500 font-bold mt-1 flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{b.tourDate}</span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="col-span-3">
                      <h4 className="text-sm font-black text-zinc-950 flex items-center gap-1.5 flex-wrap">
                        <span>{b.customerName}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                            bookedByPerson.toLowerCase().includes('mustak')
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}
                        >
                          👤 {bookedByPerson}
                        </span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-zinc-600 mt-0.5">
                        <a href={`tel:${b.customerPhone}`} className="font-bold hover:underline flex items-center gap-1">
                          <Phone size={11} className="text-zinc-900" />
                          <span>{b.customerPhone}</span>
                        </a>
                        {b.city && <span className="text-[10px] text-zinc-500">• {b.city}</span>}
                      </div>
                    </div>

                    {/* Date Folder / Private Tour + Destination */}
                    <div className="col-span-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black border mb-1 ${
                          folderBadge.isPrivate
                            ? 'bg-purple-100 text-purple-950 border-purple-300'
                            : 'bg-amber-50 text-amber-950 border-amber-300'
                        }`}
                      >
                        {folderBadge.text}
                      </span>
                      <div className="text-xs font-black text-zinc-950 flex items-center gap-1">
                        <MapPin size={12} className="text-zinc-900" />
                        <span>{b.destination}</span>
                        <span className="text-[10px] text-zinc-500 font-semibold">
                          • {b.travelClass}
                        </span>
                      </div>
                    </div>

                    {/* Pax Breakdown */}
                    <div className="col-span-2 text-center">
                      <div className="inline-flex items-center gap-1 flex-wrap justify-center">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-900 text-white font-black text-[11px]">
                          {totalPax} Total Pax
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px]">
                          {billableCount} Pax (≥5 yrs)
                        </span>
                        {infantCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 text-[9px] font-bold">
                            {infantCount} Infant (&lt;5y)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Commission Calculation & Total */}
                    <div className="col-span-2 text-right">
                      <div className="text-[11px] font-bold text-zinc-600 font-mono">
                        {billableCount} pax × ₹{ratePerPax}
                      </div>
                      <strong className="text-sm sm:text-base font-black text-amber-700 font-mono">
                        {formatCurrency(commAmount)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
