import React, { useState, useMemo } from 'react';
import {
  PhoneMissed,
  PhoneCall,
  MessageCircle,
  Search,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Save,
  Check,
  Calendar,
  Trash2,
  X,
  Pencil,
  FolderOpen,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { MissedCall, MissedCallStatus } from '../../types';
import {
  updateMissedCallStatus,
  updateMissedCallNotes,
  updateMissedCallCallerName,
  deleteMissedCall,
  formatMissedCallDateDDMMYY,
  formatMissedCallTime12Hr,
  parseDDMMYYToSortableMs,
  groupAndFormatMissedCalls,
} from '../../services/db';

const STATUS_OPTIONS: MissedCallStatus[] = [
  'PENDING',
  'CALLED BACK',
  'CONVERTED',
  'NOT INTERESTED',
];

const getStatusBadgeClasses = (status: MissedCallStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-950 border-amber-400';
    case 'CALLED BACK':
      return 'bg-blue-100 text-blue-900 border-blue-400';
    case 'CONVERTED':
      return 'bg-emerald-100 text-emerald-900 border-emerald-400';
    case 'NOT INTERESTED':
      return 'bg-zinc-200 text-zinc-700 border-zinc-400';
    default:
      return 'bg-amber-100 text-amber-950 border-amber-400';
  }
};

export const formatCleanWhatsAppPhone = (phone: string): string => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

export const buildMissedCallWhatsAppUrl = (phone: string): string => {
  const cleanPhone = formatCleanWhatsAppPhone(phone);
  return `https://wa.me/${cleanPhone}?text=Hello,%20Greetings%20from%20Sanzari%20Tours%20%26%20Travels!%20We%20noticed%20a%20missed%20call%20from%20your%20number.%20How%20can%20we%20help%20you%20today?`;
};

/**
 * Checks if callerName represents a real saved contact name vs Unknown Caller placeholder.
 */
export const hasSavedCallerName = (callerName?: string): boolean => {
  const clean = (callerName || '').trim();
  if (!clean) return false;
  const lower = clean.toLowerCase();
  if (lower === 'unknown caller' || lower.startsWith('unknown caller')) {
    return false;
  }
  return true;
};

export const TourMissedCallsView: React.FC = () => {
  const {
    missedCalls,
    setMissedCalls,
    setEditingTourInquiry,
    setPrefilledInquiryPhone,
    setPrefilledInquiryName,
    setPrefilledInquiryNotes,
    setIsAddTourInquiryOpen,
  } = useData();
  const { currentUserProfile } = useAuth();

  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MissedCallStatus>('ALL');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteIds, setSavingNoteIds] = useState<Record<string, boolean>>({});
  const [savedNoteIds, setSavedNoteIds] = useState<Record<string, boolean>>({});
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Record<string, boolean>>({});

  // Save / Edit Caller Name modal state
  const [callToEditName, setCallToEditName] = useState<MissedCall | null>(null);
  const [callerNameInput, setCallerNameInput] = useState('');
  const [isSavingCallerName, setIsSavingCallerName] = useState(false);

  // Delete confirmation modal state
  const [callToDelete, setCallToDelete] = useState<MissedCall | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const userEmail = currentUserProfile?.email || 'sanzaritourism@gmail.com';

  // Ensure calls are grouped by (phoneNumber + DD-MM-YY date) with summed callCount & 12hr time
  const groupedCalls = useMemo(() => {
    return groupAndFormatMissedCalls(missedCalls);
  }, [missedCalls]);

  // Unique Dates list in DD-MM-YY format, sorted by callTimestamp DESC (newest first)
  const dateFolders = useMemo(() => {
    const folderMap: Record<
      string,
      { date: string; count: number; maxTimestamp: number; dateSortableMs: number }
    > = {};

    groupedCalls.forEach((call) => {
      const dateStr = formatMissedCallDateDDMMYY(call.callDate, call.callTimestamp);
      if (!dateStr) return;
      const callTs = Number(call.callTimestamp || 0);
      const dateMs = parseDDMMYYToSortableMs(dateStr, callTs);

      if (!folderMap[dateStr]) {
        folderMap[dateStr] = {
          date: dateStr,
          count: 1,
          maxTimestamp: callTs,
          dateSortableMs: dateMs,
        };
      } else {
        folderMap[dateStr].count += 1;
        if (callTs > folderMap[dateStr].maxTimestamp) {
          folderMap[dateStr].maxTimestamp = callTs;
        }
      }
    });

    return Object.values(folderMap).sort((a, b) => {
      // Primary sort: dateSortableMs DESC (so 07-11-26 is always before 31-10-26)
      if (b.dateSortableMs !== a.dateSortableMs) {
        return b.dateSortableMs - a.dateSortableMs;
      }
      // Secondary sort: max callTimestamp DESC
      return b.maxTimestamp - a.maxTimestamp;
    });
  }, [groupedCalls]);

  // Summary KPI counts
  const kpiStats = useMemo(() => {
    let total = 0;
    let pending = 0;
    let calledBack = 0;
    let converted = 0;
    let notInterested = 0;

    groupedCalls.forEach((call) => {
      total += 1;
      const st = (call.status || 'PENDING').toUpperCase() as MissedCallStatus;
      if (st === 'PENDING') pending += 1;
      else if (st === 'CALLED BACK') calledBack += 1;
      else if (st === 'CONVERTED') converted += 1;
      else if (st === 'NOT INTERESTED') notInterested += 1;
    });

    return { total, pending, calledBack, converted, notInterested };
  }, [groupedCalls]);

  // Filtered list sorted by callTimestamp DESC (newest first)
  const filteredCalls = useMemo(() => {
    const filtered = groupedCalls.filter((call) => {
      const formattedDate = formatMissedCallDateDDMMYY(call.callDate, call.callTimestamp);

      // 1. Date Folder filter
      if (selectedDateFilter !== 'ALL' && formattedDate !== selectedDateFilter) {
        return false;
      }

      // 2. Status filter
      const st = (call.status || 'PENDING').toUpperCase() as MissedCallStatus;
      if (statusFilter !== 'ALL' && st !== statusFilter) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const phone = (call.phoneNumber || '').toLowerCase();
        const date = formattedDate.toLowerCase();
        const rawDate = (call.callDate || '').toLowerCase();
        const emp = (call.employeeName || '').toLowerCase();
        const dev = (call.deviceName || '').toLowerCase();
        const notes = (call.notes || '').toLowerCase();
        const caller = (call.callerName || '').toLowerCase();

        return (
          phone.includes(q) ||
          date.includes(q) ||
          rawDate.includes(q) ||
          emp.includes(q) ||
          dev.includes(q) ||
          notes.includes(q) ||
          caller.includes(q)
        );
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const dateMsDiff =
        parseDDMMYYToSortableMs(b.callDate, b.callTimestamp) -
        parseDDMMYYToSortableMs(a.callDate, a.callTimestamp);
      if (dateMsDiff !== 0) return dateMsDiff;
      return (Number(b.callTimestamp) || 0) - (Number(a.callTimestamp) || 0);
    });
  }, [groupedCalls, selectedDateFilter, statusFilter, searchQuery]);

  const handleStatusChange = async (call: MissedCall, newStatus: MissedCallStatus) => {
    const docId = call.id || call.uniqueCallId;
    if (!docId) return;
    const targetIds =
      call.mergedDocIds && call.mergedDocIds.length > 0 ? call.mergedDocIds : [docId];

    // Optimistic UI update
    setMissedCalls((prev) =>
      prev.map((c) =>
        targetIds.includes(c.id || c.uniqueCallId) ? { ...c, status: newStatus } : c
      )
    );

    setUpdatingStatusIds((prev) => ({ ...prev, [docId]: true }));
    try {
      await updateMissedCallStatus(docId, newStatus, userEmail, targetIds);
    } catch (err) {
      console.error('Failed to update missed call status:', err);
    } finally {
      setUpdatingStatusIds((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleOpenEditNameModal = (call: MissedCall) => {
    setCallToEditName(call);
    setCallerNameInput(hasSavedCallerName(call.callerName) ? (call.callerName || '').trim() : '');
  };

  const handleSaveCallerName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callToEditName) return;
    const docId = callToEditName.id || callToEditName.uniqueCallId;
    if (!docId) {
      setCallToEditName(null);
      return;
    }
    const targetIds =
      callToEditName.mergedDocIds && callToEditName.mergedDocIds.length > 0
        ? callToEditName.mergedDocIds
        : [docId];

    const cleanName = callerNameInput.trim() || 'Unknown Caller';
    const isRealName = hasSavedCallerName(cleanName);
    const currentStatus = (callToEditName.status || 'PENDING') as MissedCallStatus;
    const nextStatus: MissedCallStatus =
      isRealName && currentStatus === 'PENDING' ? 'CALLED BACK' : currentStatus;

    setIsSavingCallerName(true);

    // Optimistic UI update
    setMissedCalls((prev) =>
      prev.map((c) =>
        targetIds.includes(c.id || c.uniqueCallId)
          ? { ...c, callerName: cleanName, status: nextStatus }
          : c
      )
    );

    try {
      await updateMissedCallCallerName(docId, cleanName, currentStatus, userEmail, targetIds);
      setCallToEditName(null);
    } catch (err) {
      console.error('Failed to save caller name:', err);
    } finally {
      setIsSavingCallerName(false);
    }
  };

  const handleSaveNotes = async (call: MissedCall, customValue?: string) => {
    const docId = call.id || call.uniqueCallId;
    if (!docId) return;
    const targetIds =
      call.mergedDocIds && call.mergedDocIds.length > 0 ? call.mergedDocIds : [docId];

    const noteVal =
      customValue !== undefined
        ? customValue
        : noteDrafts[docId] !== undefined
        ? noteDrafts[docId]
        : call.notes || '';

    if (noteVal === (call.notes || '') && customValue === undefined) {
      return;
    }

    // Optimistic update
    setMissedCalls((prev) =>
      prev.map((c) =>
        targetIds.includes(c.id || c.uniqueCallId) ? { ...c, notes: noteVal } : c
      )
    );

    setSavingNoteIds((prev) => ({ ...prev, [docId]: true }));
    try {
      await updateMissedCallNotes(docId, noteVal, userEmail, targetIds);
      setSavedNoteIds((prev) => ({ ...prev, [docId]: true }));
      setTimeout(() => {
        setSavedNoteIds((prev) => ({ ...prev, [docId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to update missed call notes:', err);
    } finally {
      setSavingNoteIds((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleConvertToInquiry = async (call: MissedCall) => {
    const docId = call.id || call.uniqueCallId;
    const currentNote =
      (docId && noteDrafts[docId] !== undefined ? noteDrafts[docId] : call.notes) || '';
    const displayDate = formatMissedCallDateDDMMYY(call.callDate, call.callTimestamp);
    const displayTime = formatMissedCallTime12Hr(call.callTime, call.callTimestamp);

    // 1. Mark missed call status as "CONVERTED" in Firestore
    if (docId && call.status !== 'CONVERTED') {
      await handleStatusChange(call, 'CONVERTED');
    }

    // 2. Open New Inquiry modal pre-filled with customerName (if saved), phoneNumber & notes
    setEditingTourInquiry(null);
    setPrefilledInquiryPhone(call.phoneNumber || '');
    setPrefilledInquiryName(hasSavedCallerName(call.callerName) ? (call.callerName || '').trim() : '');
    setPrefilledInquiryNotes(
      currentNote
        ? `${currentNote} (Detected on ${call.deviceName || call.employeeName || 'Android'} at ${displayDate} ${displayTime})`
        : `Missed call detected on ${call.deviceName || call.employeeName || 'Rizwan Phone'} on ${displayDate} at ${displayTime}`
    );
    setIsAddTourInquiryOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!callToDelete) return;
    const docId = callToDelete.id || callToDelete.uniqueCallId;
    if (!docId) {
      setCallToDelete(null);
      return;
    }
    const targetIds =
      callToDelete.mergedDocIds && callToDelete.mergedDocIds.length > 0
        ? callToDelete.mergedDocIds
        : [docId];

    setIsDeleting(true);
    // Optimistically remove from state
    setMissedCalls((prev) =>
      prev.filter((c) => !targetIds.includes(c.id || c.uniqueCallId))
    );

    try {
      await deleteMissedCall(docId, userEmail, targetIds);
      setCallToDelete(null);
    } catch (err) {
      console.error('Failed to delete missed call:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-48 sm:pb-24">
      {/* Save / Edit Customer Name Modal */}
      {callToEditName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden">
            <div className="bg-zinc-950 px-5 py-4 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-sm font-black">
                  <Pencil className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">
                    {hasSavedCallerName(callToEditName.callerName)
                      ? '✏️ Edit Saved Contact Name'
                      : '✏️ Save Customer Name (Baat Ho Gayi)'}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Updates `callerName` in Firestore &amp; marks status as CALLED BACK
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCallToEditName(null)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCallerName} className="p-5 space-y-4 text-zinc-800">
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase text-zinc-400">
                    Caller Number
                  </div>
                  <div className="text-sm font-black font-mono text-zinc-950 flex items-center gap-2">
                    <span>📞 {callToEditName.phoneNumber}</span>
                    {Number(callToEditName.callCount || 1) > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white">
                        📞 {callToEditName.callCount} Times
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-zinc-500">
                    📅 {formatMissedCallDateDDMMYY(callToEditName.callDate, callToEditName.callTimestamp)}
                  </div>
                  <div className="text-[10px] font-bold text-zinc-500">
                    ⏰ {formatMissedCallTime12Hr(callToEditName.callTime, callToEditName.callTimestamp)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1.5">
                  Customer / Contact Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Ramesh Bhai Kashmir 4 Pax"
                  value={callerNameInput}
                  onChange={(e) => setCallerNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold bg-white border-2 border-zinc-900 rounded-xl text-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-emerald-700 font-bold mt-1.5">
                  ✅ Naam save karte hi status automatically &quot;CALLED BACK&quot; ho jayega.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSavingCallerName}
                  onClick={() => setCallToEditName(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCallerName}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isSavingCallerName ? 'Saving...' : 'Save Contact Name'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {callToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden">
            <div className="bg-zinc-950 px-5 py-4 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Delete Missed Call?</h3>
                  <p className="text-[10px] text-zinc-400">Permanent deletion from database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCallToDelete(null)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-zinc-800">
              <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                Kya aap sach me is missed call record ko delete karna chahte hain?
              </p>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                {hasSavedCallerName(callToDelete.callerName) && (
                  <div className="text-xs font-black text-emerald-800">
                    👤 {callToDelete.callerName}
                  </div>
                )}
                <div className="text-sm font-black font-mono text-zinc-950 flex items-center gap-2">
                  <span>📞 {callToDelete.phoneNumber}</span>
                  {Number(callToDelete.callCount || 1) > 1 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white">
                      📞 {callToDelete.callCount} Times
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-bold text-zinc-600">
                  📅 {formatMissedCallDateDDMMYY(callToDelete.callDate, callToDelete.callTimestamp)} • ⏰{' '}
                  {formatMissedCallTime12Hr(callToDelete.callTime, callToDelete.callTimestamp)}
                </div>
                <div className="text-[10px] font-semibold text-zinc-500">
                  📱 {callToDelete.deviceName || `${callToDelete.employeeName || 'Rizwan'} Phone`}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCallToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap bg-white p-3 sm:p-4 rounded-2xl border-2 border-zinc-900 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-400 text-zinc-950 border border-zinc-900 inline-flex shadow-2xs">
              <PhoneMissed size={20} className="stroke-[2.5]" />
            </span>
            <span>📞 Missed Calls</span>
            {kpiStats.pending > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-xs font-black border border-zinc-900">
                {kpiStats.pending} Pending
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-600 font-semibold mt-1">
            Real-time unknown missed calls &amp; Google Contacts sync from Android (`missed_calls`)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Android &amp; Contacts Sync</span>
          </span>
        </div>
      </div>

      {/* 4 Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Total Missed Calls */}
        <div className="bg-zinc-950 text-white p-4 rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Total Missed Calls
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-white block mt-1">
              {kpiStats.total}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">All detected calls</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0">
            <PhoneMissed size={20} />
          </div>
        </div>

        {/* 2. Pending Callbacks (Yellow/Orange) */}
        <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-400 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
              Pending Callbacks
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-950 block mt-1">
              {kpiStats.pending}
            </span>
            <span className="text-[11px] text-amber-800 font-bold">Needs callback</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center shrink-0 border border-amber-500">
            <AlertCircle size={20} className="stroke-[2.5]" />
          </div>
        </div>

        {/* 3. Called Back (Blue) */}
        <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-400 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
              Called Back
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-blue-950 block mt-1">
              {kpiStats.calledBack}
            </span>
            <span className="text-[11px] text-blue-800 font-bold">Baat ho gayi / Saved</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <PhoneCall size={20} />
          </div>
        </div>

        {/* 4. Converted to Lead/Booking (Green) */}
        <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-400 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
              Converted to Lead
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-950 block mt-1">
              {kpiStats.converted}
            </span>
            <span className="text-[11px] text-emerald-800 font-bold">Converted to inquiry</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Date-Wise Folders & Filter Pills + Search Bar + Status Tabs */}
      <div className="bg-white p-3.5 rounded-2xl border-2 border-zinc-900 shadow-xs space-y-3">
        {/* 1. DATE-WISE FOLDERS & FILTER PILLS (Above Search Bar, formatted as DD-MM-YY) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1">
              <FolderOpen size={12} className="text-amber-600" />
              <span>Date-Wise Call Folders (DD-MM-YY)</span>
            </span>
            {selectedDateFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter('ALL')}
                className="text-[11px] font-black text-rose-600 hover:underline cursor-pointer"
              >
                Show All Dates
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedDateFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border-2 flex items-center gap-1.5 ${
                selectedDateFilter === 'ALL'
                  ? 'bg-amber-400 text-zinc-950 border-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-200'
              }`}
            >
              <span>📁 All Dates ({groupedCalls.length})</span>
            </button>

            {dateFolders.map((folder) => {
              const isSelected = selectedDateFilter === folder.date;
              return (
                <button
                  key={folder.date}
                  type="button"
                  onClick={() => setSelectedDateFilter(folder.date)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border-2 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400 text-zinc-950 border-zinc-900 shadow-2xs'
                      : 'bg-zinc-50 text-zinc-800 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <span>
                    📅 {folder.date} ({folder.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Search Input */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-1 border-t border-zinc-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by Saved Contact Name, Phone Number (+91...), Date (07-11-26), Employee (Rizwan), or Notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:bg-white focus:border-zinc-950"
            />
          </div>
        </div>

        {/* 3. Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: `All (${kpiStats.total})` },
            { id: 'PENDING', label: `🟡 PENDING (${kpiStats.pending})` },
            { id: 'CALLED BACK', label: `🔵 CALLED BACK (${kpiStats.calledBack})` },
            { id: 'CONVERTED', label: `🟢 CONVERTED (${kpiStats.converted})` },
            { id: 'NOT INTERESTED', label: `⚪ NOT INTERESTED (${kpiStats.notInterested})` },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
                  active
                    ? 'bg-zinc-950 text-amber-300 border-zinc-950 shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Missed Calls Table / List */}
      {filteredCalls.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-900 p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center mx-auto">
            <PhoneMissed className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-zinc-950">No Missed Calls Found</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {groupedCalls.length === 0
              ? 'Waiting for new unknown missed calls from the Android Call Detection app in the "missed_calls" collection.'
              : 'No missed calls match your selected date folder, search query, or status filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-100 border-b-2 border-zinc-900 text-[11px] font-black uppercase tracking-wider text-zinc-700">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Caller / Contact Details</th>
                  <th className="py-3 px-4">Detected On Device</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                  <th className="py-3 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs">
                {filteredCalls.map((call) => {
                  const docId = call.id || call.uniqueCallId;
                  const draftNote =
                    noteDrafts[docId] !== undefined ? noteDrafts[docId] : call.notes || '';
                  const isSavingNote = Boolean(savingNoteIds[docId]);
                  const isSavedNote = Boolean(savedNoteIds[docId]);
                  const isUpdatingStatus = Boolean(updatingStatusIds[docId]);
                  const isContactSaved = hasSavedCallerName(call.callerName);
                  const callCount = Math.max(1, Number(call.callCount || 1));
                  const displayDate = formatMissedCallDateDDMMYY(call.callDate, call.callTimestamp);
                  const displayTime = formatMissedCallTime12Hr(call.callTime, call.callTimestamp);

                  return (
                    <tr
                      key={docId}
                      className={`transition-colors ${
                        isContactSaved
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                          : 'hover:bg-zinc-50/80'
                      }`}
                    >
                      {/* 1. Date (DD-MM-YY) & 12-Hour AM/PM Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-black text-zinc-950 flex items-center gap-1.5">
                          <Calendar size={13} className="text-zinc-500" />
                          <span>{displayDate || '—'}</span>
                        </div>
                        <div className="text-[11px] font-mono font-bold text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          <span>{displayTime || '—'}</span>
                        </div>
                      </td>

                      {/* 2. Caller / Saved Contact Name + Multiple Calls Count Badge */}
                      <td className="py-3.5 px-4">
                        {isContactSaved ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-black text-emerald-700 tracking-tight">
                                👤 {call.callerName}
                              </span>
                              {callCount > 1 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white border border-orange-700 shadow-2xs">
                                  📞 {callCount} Times
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold font-mono text-zinc-700">
                              {call.phoneNumber || 'Unknown'}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-400">
                                ✅ Contact Saved • Baat Ho Gayi
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditNameModal(call)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 cursor-pointer transition-colors"
                                title="Edit Saved Customer Name"
                              >
                                <span>✏️ Edit Name</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black font-mono text-zinc-950">
                                {call.phoneNumber || 'Unknown'}
                              </span>
                              {callCount > 1 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white border border-orange-700 shadow-2xs">
                                  📞 {callCount} Times
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-400">
                                ⚠️ Unknown Caller (Baat Baki Hai)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditNameModal(call)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-zinc-900 hover:bg-black text-amber-300 border border-zinc-900 cursor-pointer transition-colors shadow-2xs"
                                title="Save Customer Name in CRM"
                              >
                                <span>✏️ Save Name</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 3. Detected On Device */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-zinc-900 flex items-center gap-1.5">
                          <Smartphone size={14} className="text-zinc-700" />
                          <span>{call.deviceName || `${call.employeeName || 'Rizwan'} Phone`}</span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 block mt-0.5">
                          👤 Staff: {call.employeeName || 'Rizwan'}
                        </span>
                      </td>

                      {/* 4. Status Dropdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={call.status || 'PENDING'}
                          disabled={isUpdatingStatus}
                          onChange={(e) =>
                            handleStatusChange(call, e.target.value as MissedCallStatus)
                          }
                          className={`text-xs font-black px-2.5 py-1.5 rounded-xl border-2 cursor-pointer focus:outline-none transition-colors ${getStatusBadgeClasses(
                            call.status || 'PENDING'
                          )}`}
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st} className="bg-white text-zinc-950 font-bold">
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 5. Notes / Remarks */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Add callback remark..."
                            value={draftNote}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({ ...prev, [docId]: e.target.value }))
                            }
                            onBlur={() => handleSaveNotes(call)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs font-medium bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:bg-white focus:border-zinc-950 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(call, draftNote)}
                            disabled={isSavingNote}
                            title="Save Note"
                            className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                              isSavedNote
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-zinc-100 hover:bg-zinc-900 text-zinc-700 hover:text-white border-zinc-300'
                            }`}
                          >
                            {isSavedNote ? <Check size={14} /> : <Save size={14} />}
                          </button>
                        </div>
                      </td>

                      {/* 6. Quick Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditNameModal(call)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-zinc-950 font-black text-[11px] inline-flex items-center gap-1 border border-amber-400 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                            title={isContactSaved ? 'Edit Customer Name' : 'Save Customer Name'}
                          >
                            <span>{isContactSaved ? '✏️ Edit Name' : '✏️ Save Name'}</span>
                          </button>

                          <a
                            href={buildMissedCallWhatsAppUrl(call.phoneNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] inline-flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                            title="Send WhatsApp greeting message"
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={`tel:${call.phoneNumber}`}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] inline-flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                            title="Call Number"
                          >
                            <PhoneCall size={13} />
                            <span>Call</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleConvertToInquiry(call)}
                            className="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-black text-amber-300 font-black text-[11px] inline-flex items-center gap-1 border border-zinc-800 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                            title="Pre-fill New Tour Inquiry and mark as CONVERTED"
                          >
                            <UserPlus size={13} />
                            <span>+ Convert to Inquiry</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCallToDelete(call)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition-colors cursor-pointer"
                            title="Delete Missed Call Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card List View */}
          <div className="lg:hidden divide-y divide-zinc-200">
            {filteredCalls.map((call) => {
              const docId = call.id || call.uniqueCallId;
              const draftNote =
                noteDrafts[docId] !== undefined ? noteDrafts[docId] : call.notes || '';
              const isSavingNote = Boolean(savingNoteIds[docId]);
              const isSavedNote = Boolean(savedNoteIds[docId]);
              const isUpdatingStatus = Boolean(updatingStatusIds[docId]);
              const isContactSaved = hasSavedCallerName(call.callerName);
              const callCount = Math.max(1, Number(call.callCount || 1));
              const displayDate = formatMissedCallDateDDMMYY(call.callDate, call.callTimestamp);
              const displayTime = formatMissedCallTime12Hr(call.callTime, call.callTimestamp);

              return (
                <div
                  key={docId}
                  className={`p-3.5 sm:p-4 space-y-3 ${
                    isContactSaved ? 'bg-emerald-50/30' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      {isContactSaved ? (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black text-emerald-700">
                              👤 {call.callerName}
                            </span>
                            {callCount > 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white border border-orange-700 shadow-2xs">
                                📞 {callCount} Times
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold font-mono text-zinc-800">
                            {call.phoneNumber || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-400">
                              ✅ Contact Saved • Baat Ho Gayi
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditNameModal(call)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white text-zinc-800 border border-zinc-300 cursor-pointer"
                            >
                              ✏️ Edit Name
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black font-mono text-zinc-950">
                              {call.phoneNumber || 'Unknown'}
                            </span>
                            {callCount > 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white border border-orange-700 shadow-2xs">
                                📞 {callCount} Times
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-400">
                              ⚠️ Unknown Caller (Baat Baki Hai)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditNameModal(call)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-black bg-zinc-900 text-amber-300 border border-zinc-900 cursor-pointer"
                            >
                              ✏️ Save Name
                            </button>
                          </div>
                        </>
                      )}

                      <div className="text-[11px] text-zinc-500 font-bold pt-1 flex items-center gap-2 flex-wrap">
                        <span>📅 {displayDate || '—'}</span>
                        <span>⏰ {displayTime || '—'}</span>
                        <span>📱 {call.deviceName || `${call.employeeName || 'Rizwan'} Phone`}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={call.status || 'PENDING'}
                        disabled={isUpdatingStatus}
                        onChange={(e) =>
                          handleStatusChange(call, e.target.value as MissedCallStatus)
                        }
                        className={`text-[11px] font-black px-2.5 py-1.5 rounded-xl border-2 cursor-pointer focus:outline-none ${getStatusBadgeClasses(
                          call.status || 'PENDING'
                        )}`}
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st} className="bg-white text-zinc-950 font-bold">
                            {st}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setCallToDelete(call)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer"
                        title="Delete Missed Call Record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Editable Note Input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Add callback remark / notes..."
                      value={draftNote}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [docId]: e.target.value }))
                      }
                      onBlur={() => handleSaveNotes(call)}
                      className="flex-1 px-3 py-2 text-xs font-medium bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:bg-white focus:border-zinc-950 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveNotes(call, draftNote)}
                      disabled={isSavingNote}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                        isSavedNote
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      {isSavedNote ? <Check size={14} /> : <Save size={14} />}
                      <span>{isSavedNote ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditNameModal(call)}
                      className="py-2 px-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-zinc-950 border border-amber-400 font-black text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <span>{isContactSaved ? '✏️ Edit Name' : '✏️ Save Name'}</span>
                    </button>

                    <a
                      href={buildMissedCallWhatsAppUrl(call.phoneNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href={`tel:${call.phoneNumber}`}
                      className="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <PhoneCall size={14} />
                      <span>Call</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleConvertToInquiry(call)}
                      className="py-2 px-2.5 rounded-xl bg-zinc-950 hover:bg-black text-amber-300 font-black text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <UserPlus size={14} />
                      <span className="truncate">+ Inquiry</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
