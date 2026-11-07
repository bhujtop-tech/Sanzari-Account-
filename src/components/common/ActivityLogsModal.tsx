import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Search,
  Calendar,
  Filter,
  PlusCircle,
  Edit3,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  FolderPlus,
  FileText,
  Settings,
  User,
  RotateCcw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface HinglishLogEntry {
  id: string;
  timestamp: string;
  dateKey: string; // YYYY-MM-DD
  timeLabel: string; // e.g. "02:35 PM"
  category: 'booking' | 'payment' | 'expense' | 'folder_inquiry' | 'transfer_settings';
  actionType: 'add' | 'update' | 'delete';
  titleHinglish: string;
  detailHinglish: string;
  badgeText: string;
  userLabel: string;
  amount?: number;
}

const safeParseJson = (str?: string): Record<string, any> => {
  if (!str) return {};
  try {
    const parsed = JSON.parse(str);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const formatDateTimeParts = (isoOrDate?: string): { dateKey: string; timeLabel: string; sortMs: number } => {
  if (!isoOrDate) {
    const now = new Date();
    return {
      dateKey: now.toISOString().split('T')[0],
      timeLabel: '',
      sortMs: 0,
    };
  }
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) {
    const cleanDate = String(isoOrDate).substring(0, 10);
    return {
      dateKey: cleanDate,
      timeLabel: '',
      sortMs: 0,
    };
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}-${mm}-${dd}`;

  const hasTime = String(isoOrDate).includes('T') || String(isoOrDate).includes(':');
  const timeLabel = hasTime
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  return {
    dateKey,
    timeLabel,
    sortMs: d.getTime(),
  };
};

const formatHumanDateHeader = (dateKey: string): string => {
  const todayKey = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  const d = new Date(dateKey);
  const formatted = !isNaN(d.getTime())
    ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : dateKey;

  if (dateKey === todayKey) return `Aaj (${formatted})`;
  if (dateKey === yesterdayKey) return `Kal (${formatted})`;
  return formatted;
};

export const ActivityLogsModal: React.FC = () => {
  const {
    setActiveTab,
    auditLogs,
    tourBookings,
    tourExpenses,
    tourBatches,
    tourInquiries,
    transfers,
  } = useData();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Build unified Hinglish Logs from real-time auditLogs + historical records
  const allHinglishLogs = useMemo(() => {
    const entries: (HinglishLogEntry & { sortMs: number })[] = [];
    const bookingMap = new Map(tourBookings.map((b) => [b.id, b]));
    const batchMap = new Map(tourBatches.map((b) => [b.id, b]));
    const inquiryMap = new Map(tourInquiries.map((i) => [i.id, i]));

    const loggedCreatedBookingIds = new Set<string>();
    const loggedExpenseIds = new Set<string>();
    const loggedBatchIds = new Set<string>();
    const loggedTransferIds = new Set<string>();

    // 1. Convert every AuditLog into clear Hinglish
    auditLogs.forEach((log) => {
      const oldVal = safeParseJson(log.oldValue);
      const newVal = safeParseJson(log.newValue);
      const { dateKey, timeLabel, sortMs } = formatDateTimeParts(log.timestamp);
      const userLabel = (log.userEmail || 'Admin').split('@')[0];
      const action = (log.action || '').toUpperCase();

      const matchedBooking = bookingMap.get(log.recordId);
      const matchedBatch = batchMap.get(log.recordId);
      const matchedInquiry = inquiryMap.get(log.recordId);

      const custName =
        newVal.customerName ||
        newVal.customer ||
        oldVal.customerName ||
        matchedBooking?.customerName ||
        matchedInquiry?.customerName ||
        'Customer';
      const bkNum =
        newVal.bookingNumber ||
        oldVal.bookingNumber ||
        matchedBooking?.bookingNumber ||
        '';

      if (action === 'CREATE_TOUR_BOOKING') {
        loggedCreatedBookingIds.add(log.recordId);
        const total = Number(newVal.totalAmount ?? newVal.total ?? matchedBooking?.totalAmount ?? 0);
        const adv = Number(newVal.advancePaid ?? matchedBooking?.advancePaid ?? 0);
        const pax = newVal.membersCount ?? matchedBooking?.membersCount ?? '';
        const folder = newVal.tourBatchTitle ?? matchedBooking?.tourBatchTitle ?? '';
        const wallet = newVal.walletName ?? matchedBooking?.walletName ?? '';

        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'booking',
          actionType: 'add',
          badgeText: 'Nayi Booking',
          userLabel,
          amount: total,
          titleHinglish: `${custName} ki Nayi Tour Booking add ki ${bkNum ? `(${bkNum})` : ''}`,
          detailHinglish: [
            folder ? `Folder: ${folder}` : '',
            pax ? `${pax} Pax` : '',
            `Total: ₹${total.toLocaleString('en-IN')}`,
            adv > 0 ? `Advance: ₹${adv.toLocaleString('en-IN')} (${wallet || 'Wallet'} me)` : 'Advance: ₹0',
          ]
            .filter(Boolean)
            .join(' • '),
        });
      } else if (action === 'UPDATE_TOUR_BOOKING' || action === 'EDIT_TRANSACTION_TOURBOOKING') {
        const changes: string[] = [];
        if (oldVal.totalAmount !== undefined && newVal.totalAmount !== undefined && Number(oldVal.totalAmount) !== Number(newVal.totalAmount)) {
          changes.push(`Total: ₹${Number(oldVal.totalAmount).toLocaleString('en-IN')} ➔ ₹${Number(newVal.totalAmount).toLocaleString('en-IN')}`);
        } else if (newVal.totalAmount !== undefined) {
          changes.push(`Total: ₹${Number(newVal.totalAmount).toLocaleString('en-IN')}`);
        }

        if (oldVal.advancePaid !== undefined && newVal.advancePaid !== undefined && Number(oldVal.advancePaid) !== Number(newVal.advancePaid)) {
          changes.push(`Advance: ₹${Number(oldVal.advancePaid).toLocaleString('en-IN')} ➔ ₹${Number(newVal.advancePaid).toLocaleString('en-IN')}`);
        } else if (newVal.advancePaid !== undefined) {
          changes.push(`Advance: ₹${Number(newVal.advancePaid).toLocaleString('en-IN')}`);
        }

        if (oldVal.membersCount !== undefined && newVal.membersCount !== undefined && Number(oldVal.membersCount) !== Number(newVal.membersCount)) {
          changes.push(`Pax: ${oldVal.membersCount} ➔ ${newVal.membersCount}`);
        } else if (newVal.membersCount !== undefined) {
          changes.push(`${newVal.membersCount} Pax`);
        }

        if (oldVal.walletName && newVal.walletName && oldVal.walletName !== newVal.walletName) {
          changes.push(`Account: ${oldVal.walletName} ➔ ${newVal.walletName}`);
        } else if (newVal.walletName) {
          changes.push(`Account: ${newVal.walletName}`);
        }

        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'booking',
          actionType: 'update',
          badgeText: 'Booking Update',
          userLabel,
          amount: Number(newVal.totalAmount || matchedBooking?.totalAmount || 0),
          titleHinglish: `${custName} ki Booking me बदलाव (Update) kiya ${bkNum ? `(${bkNum})` : ''}`,
          detailHinglish: changes.length > 0 ? changes.join(' • ') : 'Booking details aur passenger list update ki gayi',
        });
      } else if (action === 'TOUR_PAYMENT_COLLECTED') {
        const amt = Number(newVal.amount || 0);
        const wallet = newVal.wallet || matchedBooking?.walletName || 'Tour Wallet';
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'payment',
          actionType: 'add',
          badgeText: 'Payment Received',
          userLabel,
          amount: amt,
          titleHinglish: `${custName} se ₹${amt.toLocaleString('en-IN')} Payment (+ Receive) liya`,
          detailHinglish: `${wallet} account me jama hua ${bkNum ? `• Booking: ${bkNum}` : ''}${newVal.notes ? ` • Note: ${newVal.notes}` : ''}`,
        });
      } else if (action === 'DELETE_TOUR_BOOKING') {
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'booking',
          actionType: 'delete',
          badgeText: 'Booking Deleted',
          userLabel,
          titleHinglish: `Tour Booking delete (hatayi) gayi ${custName !== 'Customer' ? `: ${custName}` : ''}`,
          detailHinglish: `Record ID: ${log.recordId} booking list se hata diya gaya`,
        });
      } else if (action === 'CREATE_TOUR_EXPENSE' || action === 'CREATE_EXPENSE') {
        loggedExpenseIds.add(log.recordId);
        const amt = Number(newVal.amount || 0);
        const cat = newVal.category || 'Expense';
        const wallet = newVal.walletName || newVal.wallet || 'Wallet';
        const desc = newVal.description || newVal.notes || '';
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'expense',
          actionType: 'add',
          badgeText: 'Kharcha (Expense)',
          userLabel,
          amount: amt,
          titleHinglish: `₹${amt.toLocaleString('en-IN')} ka Kharcha (${cat}) add kiya`,
          detailHinglish: `${wallet} account se kata ${desc ? `• "${desc}"` : ''}`,
        });
      } else if (action === 'DELETE_TOUR_EXPENSE' || action === 'EDIT_TRANSACTION_TOUREXPENSE' || action === 'EDIT_TRANSACTION_EXPENSE') {
        const isDel = action.includes('DELETE');
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'expense',
          actionType: isDel ? 'delete' : 'update',
          badgeText: isDel ? 'Expense Deleted' : 'Expense Updated',
          userLabel,
          titleHinglish: isDel ? `Tour Kharcha (Expense) delete kiya` : `Kharcha (Expense) update kiya`,
          detailHinglish: newVal.amount ? `Updated Amount: ₹${Number(newVal.amount).toLocaleString('en-IN')}` : `Expense record update kiya gaya`,
        });
      } else if (action === 'CREATE_TOUR_BATCH' || action === 'UPDATE_TOUR_BATCH' || action === 'DELETE_TOUR_BATCH') {
        if (action === 'CREATE_TOUR_BATCH') loggedBatchIds.add(log.recordId);
        const isAdd = action === 'CREATE_TOUR_BATCH';
        const isDel = action === 'DELETE_TOUR_BATCH';
        const folderTitle = newVal.title || matchedBatch?.title || 'Tour Date Folder';
        const depDate = newVal.departureDate || matchedBatch?.departureDate || '';
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'folder_inquiry',
          actionType: isAdd ? 'add' : isDel ? 'delete' : 'update',
          badgeText: isAdd ? 'Naya Folder' : isDel ? 'Folder Deleted' : 'Folder Update',
          userLabel,
          titleHinglish: isAdd
            ? `Naya Tour Date Folder banaya: "${folderTitle}"`
            : isDel
            ? `Tour Date Folder delete kiya: "${folderTitle}"`
            : `Tour Date Folder update kiya: "${folderTitle}"`,
          detailHinglish: depDate ? `Departure Date: ${depDate}` : `Tour folder record update hua`,
        });
      } else if (action.includes('INQUIRY')) {
        const isAdd = action.includes('ADD');
        const isDel = action.includes('DELETE');
        const dest = newVal.destination || matchedInquiry?.destination || 'Tour';
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'folder_inquiry',
          actionType: isAdd ? 'add' : isDel ? 'delete' : 'update',
          badgeText: isAdd ? 'Nayi Inquiry' : isDel ? 'Inquiry Deleted' : 'Inquiry Update',
          userLabel,
          titleHinglish: isAdd
            ? `${custName} ki Nayi Inquiry add ki (${dest})`
            : isDel
            ? `${custName} ki Inquiry delete ki`
            : `${custName} ki Inquiry update ki (${dest})`,
          detailHinglish: newVal.status ? `Status: ${newVal.status}` : `Inquiry record me बदलाव kiya gaya`,
        });
      } else if (action.includes('CUSTOM_TOUR_PACKAGE')) {
        const isAdd = action.includes('ADD');
        const isDel = action.includes('DELETE');
        const pkgName = newVal.packageName || 'Tour Package';
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'folder_inquiry',
          actionType: isAdd ? 'add' : isDel ? 'delete' : 'update',
          badgeText: 'Package PDF',
          userLabel,
          titleHinglish: isAdd
            ? `Naya Tour Package banaya: ${pkgName}`
            : isDel
            ? `Tour Package delete kiya`
            : `Tour Package update kiya: ${pkgName}`,
          detailHinglish: `Custom Tour Package catalog me save kiya gaya`,
        });
      } else if (action === 'CREATE_TRANSFER' || action === 'EDIT_TRANSACTION_TRANSFER') {
        loggedTransferIds.add(log.recordId);
        const amt = Number(newVal.amount || 0);
        const fromW = newVal.from || newVal.fromWalletName || 'Account';
        const toW = newVal.to || newVal.toWalletName || 'Account';
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'transfer_settings',
          actionType: action === 'CREATE_TRANSFER' ? 'add' : 'update',
          badgeText: 'Account Transfer',
          userLabel,
          amount: amt,
          titleHinglish: `₹${amt.toLocaleString('en-IN')} Transfer kiye: ${fromW} ➔ ${toW}`,
          detailHinglish: `${fromW} se nikal kar ${toW} account me jama kiye`,
        });
      } else if (action === 'UPDATE_TOUR_PRICING_SETTINGS') {
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'transfer_settings',
          actionType: 'update',
          badgeText: 'Rates Updated',
          userLabel,
          titleHinglish: `Tour Package Rates & Discount settings update ki`,
          detailHinglish: [
            newVal.acTrainPrice ? `3AC: ₹${Number(newVal.acTrainPrice).toLocaleString('en-IN')}` : '',
            newVal.sleeperPrice ? `Sleeper: ₹${Number(newVal.sleeperPrice).toLocaleString('en-IN')}` : '',
            newVal.coupleRoomSurcharge ? `Couple Room: +₹${Number(newVal.coupleRoomSurcharge).toLocaleString('en-IN')}` : '',
          ]
            .filter(Boolean)
            .join(' • '),
        });
      } else {
        // Fallback for any other action (Sale, Stock, Payment, etc.)
        entries.push({
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          dateKey,
          timeLabel,
          sortMs,
          category: 'transfer_settings',
          actionType: action.includes('DELETE') ? 'delete' : action.includes('UPDATE') || action.includes('EDIT') ? 'update' : 'add',
          badgeText: log.recordType || 'System Log',
          userLabel,
          titleHinglish: `${log.action.replace(/_/g, ' ')} (${log.recordType})`,
          detailHinglish: log.newValue ? log.newValue.slice(0, 120) : 'System record update hua',
        });
      }
    });

    // 2. Also include existing bookings, paymentHistory installments, expenses & transfers
    // so the user sees complete history even for records created before auditLogs
    tourBookings.forEach((b) => {
      if (!loggedCreatedBookingIds.has(b.id)) {
        const ts = b.createdAt || b.tourDate || new Date().toISOString();
        const { dateKey, timeLabel, sortMs } = formatDateTimeParts(ts);
        entries.push({
          id: `hist-bk-${b.id}`,
          timestamp: ts,
          dateKey,
          timeLabel,
          sortMs,
          category: 'booking',
          actionType: 'add',
          badgeText: 'Tour Booking',
          userLabel: b.bookedBy || 'Admin',
          amount: Number(b.totalAmount || 0),
          titleHinglish: `${b.customerName} ki Tour Booking (${b.bookingNumber}) — ${b.membersCount} Pax`,
          detailHinglish: `Folder: ${b.tourBatchTitle || b.destination} • Total: ₹${Number(b.totalAmount || 0).toLocaleString('en-IN')} • Received: ₹${Number(b.advancePaid || 0).toLocaleString('en-IN')} (${b.walletName || 'Tour Wallet'})`,
        });
      }

      // Include any updatedAt edit on booking if updatedAt !== createdAt
      if (b.updatedAt && b.createdAt && b.updatedAt !== b.createdAt) {
        const hasAuditUpdate = auditLogs.some(
          (l) => l.recordId === b.id && l.action === 'UPDATE_TOUR_BOOKING'
        );
        if (!hasAuditUpdate) {
          const { dateKey, timeLabel, sortMs } = formatDateTimeParts(b.updatedAt);
          entries.push({
            id: `hist-bk-upd-${b.id}`,
            timestamp: b.updatedAt,
            dateKey,
            timeLabel,
            sortMs,
            category: 'booking',
            actionType: 'update',
            badgeText: 'Booking Updated',
            userLabel: b.bookedBy || 'Admin',
            amount: Number(b.totalAmount || 0),
            titleHinglish: `${b.customerName} (${b.bookingNumber}) ki Booking update ki gayi`,
            detailHinglish: `Total: ₹${Number(b.totalAmount || 0).toLocaleString('en-IN')} • Received: ₹${Number(b.advancePaid || 0).toLocaleString('en-IN')} • Baaki: ₹${Number(b.pendingAmount || 0).toLocaleString('en-IN')}`,
          });
        }
      }

      // Include subsequent installments from paymentHistory
      if (Array.isArray(b.paymentHistory) && b.paymentHistory.length > 1) {
        b.paymentHistory.slice(1).forEach((ph, idx) => {
          const ts = ph.date || b.updatedAt || b.tourDate;
          const { dateKey, timeLabel, sortMs } = formatDateTimeParts(ts);
          entries.push({
            id: `hist-pay-${b.id}-${ph.id || idx}`,
            timestamp: ts,
            dateKey,
            timeLabel,
            sortMs,
            category: 'payment',
            actionType: 'add',
            badgeText: 'Kist / Payment',
            userLabel: ph.receivedBy || 'Admin',
            amount: Number(ph.amount || 0),
            titleHinglish: `${b.customerName} se ₹${Number(ph.amount || 0).toLocaleString('en-IN')} Payment (+ Receive) mila`,
            detailHinglish: `${ph.walletName || b.walletName} me jama • Mode: ${ph.paymentMode || 'Online'} (${b.bookingNumber})`,
          });
        });
      }
    });

    tourExpenses.forEach((e) => {
      if (!loggedExpenseIds.has(e.id)) {
        const ts = e.createdAt || e.date;
        const { dateKey, timeLabel, sortMs } = formatDateTimeParts(ts);
        entries.push({
          id: `hist-exp-${e.id}`,
          timestamp: ts,
          dateKey,
          timeLabel,
          sortMs,
          category: 'expense',
          actionType: 'add',
          badgeText: 'Tour Expense',
          userLabel: 'Admin',
          amount: Number(e.amount || 0),
          titleHinglish: `₹${Number(e.amount || 0).toLocaleString('en-IN')} ka Tour Kharcha (${e.category}) add kiya`,
          detailHinglish: `${e.walletName} se kata • ${e.description || e.notes || e.destination || ''}`,
        });
      }
    });

    transfers.forEach((t) => {
      if (!loggedTransferIds.has(t.id)) {
        const ts = t.createdAt || t.date;
        const { dateKey, timeLabel, sortMs } = formatDateTimeParts(ts);
        entries.push({
          id: `hist-trf-${t.id}`,
          timestamp: ts,
          dateKey,
          timeLabel,
          sortMs,
          category: 'transfer_settings',
          actionType: 'add',
          badgeText: 'Account Transfer',
          userLabel: (t.userEmail || 'Admin').split('@')[0],
          amount: Number(t.amount || 0),
          titleHinglish: `₹${Number(t.amount || 0).toLocaleString('en-IN')} Transfer: ${t.fromWalletName} ➔ ${t.toWalletName}`,
          detailHinglish: t.notes ? `Reason: ${t.notes}` : `${t.fromWalletName} se ${t.toWalletName} me transfer kiya`,
        });
      }
    });

    return entries.sort((a, b) => {
      if (b.dateKey !== a.dateKey) return b.dateKey.localeCompare(a.dateKey);
      return b.sortMs - a.sortMs;
    });
  }, [auditLogs, tourBookings, tourExpenses, tourBatches, tourInquiries, transfers]);

  // Apply Top Filters (Category, Action Type, Date, Search)
  const filteredLogs = useMemo(() => {
    return allHinglishLogs.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedActionType !== 'all' && item.actionType !== selectedActionType) return false;
      if (selectedDate && item.dateKey !== selectedDate) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${item.titleHinglish} ${item.detailHinglish} ${item.badgeText} ${item.userLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allHinglishLogs, selectedCategory, selectedActionType, selectedDate, searchQuery]);

  // Group filtered logs Date-wise
  const groupedByDate = useMemo(() => {
    const map = new Map<string, HinglishLogEntry[]>();
    filteredLogs.forEach((log) => {
      const key = log.dateKey || 'Unknown Date';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    });
    return Array.from(map.entries());
  }, [filteredLogs]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedActionType('all');
    setSelectedDate('');
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-24">
      {/* Full-Screen Page Header (like Tour Reports View) */}
      <div className="bg-zinc-950 text-white rounded-3xl p-4 sm:p-6 border-2 border-zinc-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-sm shrink-0">
            <History size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Activity &amp; Update Logs (Hinglish)
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                {filteredLogs.length} Logs
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Date-wise record: Jo bhi booking, payment, kharcha ya update aap karte hain uska poora hisaab
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>← Back to Dashboard</span>
        </button>
      </div>

      {/* Top Filter Bar Card */}
      <div className="p-4 sm:p-5 bg-white rounded-3xl border-2 border-zinc-900 shadow-2xs space-y-3">
        {/* Row 1: Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-1 mr-1 shrink-0">
            <Filter size={11} /> Filter:
          </span>
          {[
            { id: 'all', label: 'Sabhi (All)' },
            { id: 'booking', label: '📋 Bookings' },
            { id: 'payment', label: '💰 Payments (Cash In)' },
            { id: 'expense', label: '💸 Expenses (Kharcha)' },
            { id: 'folder_inquiry', label: '📁 Folders & Inquiries' },
            { id: 'transfer_settings', label: '🔄 Transfers & Rates' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 2: Search, Date Filter & Action Type Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Customer naam, booking ID ya wallet khojein..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
            />
          </div>

          {/* Specific Date Filter */}
          <div className="sm:col-span-3 flex items-center gap-1.5 bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5">
            <Calendar size={13} className="text-blue-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs font-bold text-zinc-900 bg-transparent focus:outline-none"
              title="Date-wise filter"
            />
          </div>

          {/* Action Type Filter (Added / Updated / Deleted) */}
          <div className="sm:col-span-4 flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'add', label: '+ Naya' },
              { id: 'update', label: '✏️ Update' },
              { id: 'delete', label: '🗑️ Delete' },
            ].map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => setSelectedActionType(act.id)}
                className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  selectedActionType === act.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-300'
                }`}
              >
                {act.label}
              </button>
            ))}

            {(selectedCategory !== 'all' || selectedActionType !== 'all' || selectedDate || searchQuery) && (
              <button
                type="button"
                onClick={resetFilters}
                title="Reset Filters"
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shrink-0"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date-wise Full Screen Log List */}
      <div className="space-y-5">
        {groupedByDate.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-zinc-900 py-16 text-center space-y-2">
            <History size={36} className="mx-auto text-zinc-300" />
            <p className="text-sm font-black text-zinc-700">Koi log record nahi mila</p>
            <p className="text-xs text-zinc-500">
              Upar diye gaye filter badlein ya reset karein.
            </p>
          </div>
        ) : (
          groupedByDate.map(([dateKey, logsForDate]) => (
            <div key={dateKey} className="space-y-2.5">
              {/* Date Header */}
              <div className="flex items-center justify-between bg-zinc-900 text-white px-4 py-2.5 rounded-2xl shadow-xs">
                <span className="text-xs sm:text-sm font-black flex items-center gap-2">
                  <Calendar size={14} className="text-emerald-400" />
                  <span>📅 {formatHumanDateHeader(dateKey)}</span>
                </span>
                <span className="text-xs font-mono font-bold text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-lg">
                  {logsForDate.length} {logsForDate.length === 1 ? 'Entry' : 'Entries'}
                </span>
              </div>

              {/* Log Cards for this Date */}
              <div className="space-y-2">
                {logsForDate.map((item) => {
                  const isDelete = item.actionType === 'delete';
                  const isUpdate = item.actionType === 'update';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 rounded-2xl bg-white border-2 transition-all flex items-start justify-between gap-3 shadow-2xs ${
                        isDelete
                          ? 'border-rose-300 bg-rose-50/30'
                          : isUpdate
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-zinc-200 hover:border-zinc-900'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Icon Badge */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isDelete
                              ? 'bg-rose-100 text-rose-700'
                              : isUpdate
                              ? 'bg-amber-100 text-amber-800'
                              : item.category === 'payment'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.category === 'expense'
                              ? 'bg-rose-100 text-rose-700'
                              : item.category === 'booking'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-zinc-100 text-zinc-800'
                          }`}
                        >
                          {isDelete ? (
                            <Trash2 size={17} />
                          ) : isUpdate ? (
                            <Edit3 size={17} />
                          ) : item.category === 'payment' ? (
                            <ArrowDownLeft size={18} />
                          ) : item.category === 'expense' ? (
                            <ArrowUpRight size={18} />
                          ) : item.category === 'folder_inquiry' ? (
                            <FolderPlus size={17} />
                          ) : item.category === 'transfer_settings' ? (
                            <ArrowRightLeft size={17} />
                          ) : (
                            <PlusCircle size={17} />
                          )}
                        </div>

                        {/* Hinglish Title & Details */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                isDelete
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : isUpdate
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : item.category === 'payment'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                              }`}
                            >
                              {item.badgeText}
                            </span>

                            {item.timeLabel && (
                              <span className="text-[11px] font-mono font-bold text-zinc-500">
                                🕒 {item.timeLabel}
                              </span>
                            )}

                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-0.5">
                              <User size={10} /> {item.userLabel}
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-black text-zinc-950 leading-snug">
                            {item.titleHinglish}
                          </h4>

                          <p className="text-xs font-semibold text-zinc-600 leading-relaxed">
                            {item.detailHinglish}
                          </p>
                        </div>
                      </div>

                      {/* Optional Right Amount Pill */}
                      {item.amount !== undefined && item.amount > 0 && (
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-black text-xs sm:text-sm ${
                              item.category === 'expense'
                                ? 'text-rose-600'
                                : item.category === 'payment'
                                ? 'text-emerald-600'
                                : 'text-zinc-900'
                            }`}
                          >
                            ₹{item.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
