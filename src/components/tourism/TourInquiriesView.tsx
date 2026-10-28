import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Phone,
  MessageCircle,
  FileText,
  MapPin,
  Calendar,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
  Share2,
  Instagram,
  Sparkles,
  ArrowRight,
  Luggage,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { updateTourInquiry } from '../../services/db';
import { InquirySource, InquiryStatus, TourInquiry, InquiryFollowUpNote } from '../../types';
import { InquiriesSkeleton } from '../common/Skeleton';
import { FollowUpChatModal } from './FollowUpChatModal';

export const TourInquiriesView: React.FC = () => {
  const { user } = useAuth();
  const {
    loading,
    tourInquiries,
    customTourPackages,
    formatDate,
    setIsAddTourInquiryOpen,
    openEditTourInquiryModal,
    deleteTourInquiryById,
    openInquiryPdf,
    setIsAddTourBookingOpen,
    setEditingTourBooking,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Follow-up Chat & Timeline Modal State
  const [chatModalInquiry, setChatModalInquiry] = useState<TourInquiry | null>(null);
  const [chatModalInitialDate, setChatModalInitialDate] = useState<string>('');

  // Today date string (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's follow-ups: pending leads scheduled for today or overdue
  const todayFollowUps = useMemo(() => {
    return tourInquiries.filter((inq) => {
      if (inq.status === 'Converted' || inq.status === 'Lost') return false;
      if (!inq.followUpDate) return false;
      return inq.followUpDate <= todayStr;
    });
  }, [tourInquiries, todayStr]);

  // Filtered Inquiries
  const filteredInquiries = useMemo(() => {
    return tourInquiries.filter((inq) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        inq.customerName.toLowerCase().includes(q) ||
        inq.customerPhone.includes(q) ||
        inq.destination.toLowerCase().includes(q) ||
        (inq.fromCity && inq.fromCity.toLowerCase().includes(q)) ||
        (inq.discussionSummary && inq.discussionSummary.toLowerCase().includes(q));

      const matchSource = selectedSource === 'ALL' || inq.source === selectedSource;

      let matchStatus = true;
      if (selectedStatus === 'ALL') {
        matchStatus = true;
      } else if (selectedStatus === 'Today Follow-up') {
        matchStatus = Boolean(
          inq.followUpDate &&
          inq.followUpDate <= todayStr &&
          inq.status !== 'Converted' &&
          inq.status !== 'Lost'
        );
      } else {
        matchStatus = inq.status === selectedStatus;
      }

      return matchSearch && matchSource && matchStatus;
    });
  }, [tourInquiries, searchQuery, selectedSource, selectedStatus, todayStr]);

  if (loading) {
    return <InquiriesSkeleton />;
  }

  // Stats Counters
  const totalCount = tourInquiries.length;
  const newCount = tourInquiries.filter((i) => i.status === 'New').length;
  const followUpCount = tourInquiries.filter((i) => i.status === 'Follow-up' || i.status === 'In Discussion').length;
  const convertedCount = tourInquiries.filter((i) => i.status === 'Converted').length;
  const lostCount = tourInquiries.filter((i) => i.status === 'Lost').length;

  const handleUpdateStatus = async (inqId: string, newStatus: InquiryStatus) => {
    setUpdatingId(inqId);
    try {
      await updateTourInquiry(
        inqId,
        { status: newStatus },
        user?.email || 'admin@sanzari.com'
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenChatModal = (inq: TourInquiry, initialDate?: string) => {
    setChatModalInquiry(inq);
    setChatModalInitialDate(initialDate || inq.followUpDate || getDateOffset(1));
  };

  const handleSaveFollowUp = async (
    inq: TourInquiry,
    replyNote: string,
    nextDate: string,
    newStatus?: InquiryStatus
  ) => {
    setUpdatingId(inq.id);
    const now = new Date();
    const newNote: InquiryFollowUpNote = {
      id: `fup_${Date.now()}`,
      date: now.toISOString(),
      note: replyNote.trim() || `Follow-up updated for ${nextDate}`,
      nextFollowUpDate: nextDate,
      status: newStatus || inq.status,
      loggedBy: user?.displayName || user?.email?.split('@')[0] || 'Office Staff',
    };

    const existingHistory: InquiryFollowUpNote[] = Array.isArray(inq.followUpHistory)
      ? [...inq.followUpHistory]
      : [];

    if (existingHistory.length === 0 && inq.discussionSummary) {
      existingHistory.push({
        id: `init_${inq.id}`,
        date: inq.createdAt || inq.updatedAt || now.toISOString(),
        note: inq.discussionSummary,
        nextFollowUpDate: inq.followUpDate,
        status: inq.status,
        loggedBy: inq.assignedTo || 'Office Staff',
      });
    }

    const updatedHistory = [...existingHistory, newNote];

    try {
      await updateTourInquiry(
        inq.id,
        {
          discussionSummary: replyNote.trim() || inq.discussionSummary,
          followUpDate: nextDate,
          status: newStatus || (inq.status === 'New' ? 'Follow-up' : inq.status),
          followUpHistory: updatedHistory,
        },
        user?.email || 'admin@sanzari.com'
      );
    } catch (err) {
      console.error('Failed to update follow-up note:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateFollowUpDate = async (inqId: string, newDate: string, noteText?: string) => {
    const targetInq = tourInquiries.find((i) => i.id === inqId);
    if (targetInq) {
      await handleSaveFollowUp(
        targetInq,
        noteText || `Rescheduled follow-up to ${newDate}`,
        newDate,
        'Follow-up'
      );
      return;
    }
    setUpdatingId(inqId);
    try {
      await updateTourInquiry(
        inqId,
        {
          followUpDate: newDate,
          status: 'Follow-up',
        },
        user?.email || 'admin@sanzari.com'
      );
    } catch (err) {
      console.error('Failed to update follow-up date:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (inq: TourInquiry) => {
    if (window.confirm(`Are you sure you want to delete inquiry for ${inq.customerName}?`)) {
      try {
        await deleteTourInquiryById(inq.id);
      } catch (err) {
        console.error('Delete inquiry error:', err);
      }
    }
  };

  const handleConvertToBooking = (inq: TourInquiry) => {
    setEditingTourBooking({
      id: '',
      bookingNumber: '',
      tourTitle: inq.destination,
      destination: inq.destination,
      tourDate: inq.preferredDate || new Date().toISOString().split('T')[0],
      monthKey: new Date().toISOString().substring(0, 7),
      customerName: inq.customerName,
      customerPhone: inq.customerPhone,
      city: inq.fromCity || 'Vadodara',
      membersCount: inq.totalPax || 2,
      members: Array.from({ length: inq.totalPax || 2 }).map((_, idx) => ({
        name: idx === 0 ? inq.customerName : `Family Member ${idx + 1}`,
        age: 30,
        gender: 'Male',
      })),
      tourType: 'Group Tour',
      travelClass: (inq.travelClass as any) || 'AC Train',
      totalAmount: 32000,
      advancePaid: 10000,
      pendingAmount: 22000,
      paymentStatus: 'Partial',
      paymentMode: 'Online',
      paymentMethod: 'UPI',
      walletName: 'Rizwan',
      specialNotes: `Converted from Inquiry ${inq.inquiryNumber}: ${inq.discussionSummary}`,
      bookingStatus: 'Confirmed',
    });
    setIsAddTourBookingOpen(true);
  };

  const handleWhatsAppSend = (inq: TourInquiry, isFollowUpMsg = false) => {
    const linkedPkg = customTourPackages.find((p) => p.id === inq.linkedPackageId) || customTourPackages[0];
    const customerName = inq.customerName;
    const cleanPhone = inq.customerPhone.replace(/[^0-9]/g, '');

    let text = '';
    if (isFollowUpMsg) {
      text = `नमस्ते ${customerName} जी 🙏\n` +
        `*संजरी टूरिज्म - वडोदरा (SANZARI TOURS)*\n\n` +
        `हम आपके *${inq.destination}* टूर के सिलसिले में फॉलो-अप कर रहे थे।\n` +
        `क्या आपने अपने टूर प्लान के बारे में कोई फैसला लिया है? हमारी सीट्स तेजी से भर रही हैं।\n\n` +
        (linkedPkg ? `📍 *पैकेज:* ${linkedPkg.packageName}\n⏱️ *अवधि:* ${linkedPkg.durationDays} Days / ${linkedPkg.durationNights} Nights\n\n` : '') +
        `यदि आपके कोई प्रश्न हैं या बुकिंग कन्फर्म करना चाहते हैं, तो कृपया हमें बताएं!\n\n` +
        `📞 *संपर्क:* 7874635992 (Rizwan Khalifa)\nसंजरी टूरिज्म - गुजरात`;
    } else {
      text = `नमस्ते ${customerName} जी 🙏\n`;
      text += `*संजरी टूरिज्म - वडोदरा (SANZARI TOURS)* की तरफ से आपकी *${inq.destination}* टूर पूछताछ के लिए हार्दिक आभार।\n\n`;

      if (linkedPkg) {
        text += `📍 *टूर पैकेज:* ${linkedPkg.packageName} (${linkedPkg.destination})\n`;
        text += `⏱️ *अवधि:* ${linkedPkg.durationDays} Days / ${linkedPkg.durationNights} Nights\n`;
        text += `👥 *सवारी / यात्री:* ${inq.totalPax} व्यक्ति (${inq.paxAdults} Adults, ${inq.paxChildren} Children)\n\n`;
        if (linkedPkg.priceAcTrain) text += `• 3AC ट्रेन किराया: ₹${linkedPkg.priceAcTrain.toLocaleString('en-IN')} / व्यक्ति\n`;
        if (linkedPkg.priceFlight) text += `• फ्लाइट / विमान पैकेज: ₹${linkedPkg.priceFlight.toLocaleString('en-IN')} / व्यक्ति\n`;
        text += `\n✅ 100% शुद्ध शाकाहारी / स्वादिष्ट भोजन और डीलक्स होटल स्टे शामिल है।\n`;
      }
      text += `\n📞 *संपर्क & बुकिंग (वडोदरा ऑफिस):*\nफोन: +91 7874635992 (Rizwan Khalifa)\nपता: वडोदरा (गुजरात)।`;
    }

    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const getSourceBadge = (source: InquirySource) => {
    switch (source) {
      case 'Instagram':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-300 flex items-center gap-1">
            <span>📷</span> Instagram
          </span>
        );
      case 'WhatsApp':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <span>💬</span> WhatsApp
          </span>
        );
      case 'Phone Call':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900 border border-zinc-300 flex items-center gap-1">
            <Phone size={10} /> Call
          </span>
        );
      case 'Walk-in':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
            <span>🚶</span> Walk-in
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-300">
            {source}
          </span>
        );
    }
  };

  const getStatusBadge = (status: InquiryStatus) => {
    switch (status) {
      case 'New':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">🟡 New</span>;
      case 'In Discussion':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-300">🔵 Discussion</span>;
      case 'Package Sent':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-300">🟣 PDF Sent</span>;
      case 'Follow-up':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-orange-50 text-orange-900 border border-orange-300">🟠 Follow-up</span>;
      case 'Converted':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-400">🟢 ✓ Booked</span>;
      case 'Lost':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-300">🔴 Lost</span>;
      default:
        return null;
    }
  };

  // Helper date offset
  const getDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-5 pb-48 sm:pb-24">
      {/* Top Stats Chips Grid (5 Metric Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div
          onClick={() => setSelectedStatus('ALL')}
          className={`bg-white p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            selectedStatus === 'ALL' ? 'border-zinc-950 bg-zinc-50' : 'border-zinc-900 hover:border-zinc-950'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">Total Leads</span>
            <span className="text-xl font-black text-zinc-950">{totalCount}</span>
          </div>
          <span className="text-xl">📋</span>
        </div>

        <div
          onClick={() => setSelectedStatus('Today Follow-up')}
          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            selectedStatus === 'Today Follow-up'
              ? 'bg-amber-100 border-amber-600 ring-2 ring-amber-400'
              : todayFollowUps.length > 0
              ? 'bg-amber-50 border-amber-400 hover:bg-amber-100'
              : 'bg-white border-zinc-900'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase text-amber-900 block flex items-center gap-1">
              <span>Today Follow-up</span>
              {todayFollowUps.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />}
            </span>
            <span className="text-xl font-black text-amber-950">{todayFollowUps.length}</span>
          </div>
          <span className="text-xl">🔔</span>
        </div>

        <div
          onClick={() => setSelectedStatus('Follow-up')}
          className={`bg-white p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            selectedStatus === 'Follow-up' ? 'border-zinc-950 bg-zinc-50' : 'border-zinc-900 hover:border-zinc-950'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase text-zinc-600 block">In Follow-up</span>
            <span className="text-xl font-black text-zinc-900">{followUpCount}</span>
          </div>
          <span className="text-xl">⏳</span>
        </div>

        <div
          onClick={() => setSelectedStatus('Converted')}
          className={`bg-white p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            selectedStatus === 'Converted' ? 'border-emerald-700 bg-emerald-50' : 'border-zinc-900 hover:border-zinc-950'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Converted</span>
            <span className="text-xl font-black text-emerald-800">{convertedCount}</span>
          </div>
          <span className="text-xl">🎉</span>
        </div>

        <div
          onClick={() => setSelectedStatus('Lost')}
          className={`bg-white p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-sm flex items-center justify-between col-span-2 sm:col-span-1 ${
            selectedStatus === 'Lost' ? 'border-rose-600 bg-rose-50' : 'border-zinc-900 hover:border-zinc-950'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase text-rose-700 block">Lost Leads</span>
            <span className="text-xl font-black text-rose-900">{lostCount}</span>
          </div>
          <span className="text-xl">🔴</span>
        </div>
      </div>

      {/* PINNED SECTION: Today's Follow-up Calls & Priority Leads */}
      {todayFollowUps.length > 0 && selectedStatus !== 'Lost' && (
        <div className="bg-amber-50/80 rounded-3xl border-2 border-amber-400 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center font-black text-base shadow-xs">
                🔔
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-950 flex items-center gap-1.5">
                  <span>Today's Follow-up Calls</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold">
                    {todayFollowUps.length} Pending Today
                  </span>
                </h3>
                <p className="text-xs text-amber-900 font-medium">
                  Aaj in customers ko call / WhatsApp karna hai taki booking confirm ho sake
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayFollowUps.map((inq) => (
              <div
                key={`today-${inq.id}`}
                className="bg-white rounded-2xl border-2 border-amber-300 p-3.5 shadow-xs flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-mono">
                      {inq.inquiryNumber} • 🗓️ Due: {inq.followUpDate}
                    </span>
                    {getStatusBadge(inq.status)}
                  </div>

                  <h4 className="text-sm font-black text-zinc-950 mt-1.5">{inq.customerName}</h4>
                  <p className="text-xs text-zinc-600 font-bold flex items-center gap-1">
                    <MapPin size={11} className="text-zinc-900" />
                    <span>{inq.destination} ({inq.totalPax || 2} Pax)</span>
                    {inq.fromCity && <span>• {inq.fromCity}</span>}
                  </p>

                  {inq.discussionSummary && (
                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 mt-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-800 font-black flex items-center gap-1">
                          <span>💬 Kya baat hui:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenChatModal(inq)}
                          className="text-[10px] font-black text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Timeline ({Array.isArray(inq.followUpHistory) ? inq.followUpHistory.length : 1})</span>
                          <ChevronRight size={10} />
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-900 font-medium leading-relaxed line-clamp-2">
                        {inq.discussionSummary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick 1-Click Priority Follow-up Actions */}
                <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* Call Direct */}
                    <a
                      href={`tel:${inq.customerPhone}`}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
                      title="Direct Phone Call"
                    >
                      <Phone size={12} />
                      <span>Call</span>
                    </a>
                    {/* WhatsApp Direct */}
                    <button
                      type="button"
                      onClick={() => handleWhatsAppSend(inq, true)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
                      title="Send WhatsApp Follow-up"
                    >
                      <MessageCircle size={12} />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Next Follow-up Quick Reschedule: +1 Day */}
                    <button
                      type="button"
                      onClick={() => handleOpenChatModal(inq, getDateOffset(1))}
                      className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[10px] font-black border border-zinc-300 transition-colors cursor-pointer"
                      title="Follow up tomorrow (+1 Day)"
                    >
                      +1 Day
                    </button>

                    {/* +3 Days */}
                    <button
                      type="button"
                      onClick={() => handleOpenChatModal(inq, getDateOffset(3))}
                      className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[10px] font-black border border-zinc-300 transition-colors cursor-pointer"
                      title="Follow up in 3 days (+3 Days)"
                    >
                      +3 Days
                    </button>

                    {/* Custom Date Option */}
                    <button
                      type="button"
                      onClick={() => handleOpenChatModal(inq, inq.followUpDate || todayStr)}
                      className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] font-black border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Pick custom date & log reply note"
                    >
                      <Calendar size={11} />
                      <span>Custom Date</span>
                    </button>

                    {/* Chat Timeline & Reply Note */}
                    <button
                      type="button"
                      onClick={() => handleOpenChatModal(inq)}
                      className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 text-[10px] font-black border border-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="View conversation timeline & add reply notes"
                    >
                      <MessageSquare size={11} />
                      <span>Chat ({Array.isArray(inq.followUpHistory) ? inq.followUpHistory.length : inq.discussionSummary ? 1 : 0})</span>
                    </button>

                    {/* 1-Click Lost */}
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(inq.id, 'Lost')}
                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-300 cursor-pointer transition-colors"
                      title="Customer said no / cancelled"
                    >
                      🔴 Lost
                    </button>

                    {/* Convert */}
                    <button
                      type="button"
                      onClick={() => handleConvertToBooking(inq)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[10px] font-black border border-emerald-400 cursor-pointer flex items-center gap-1 transition-colors"
                      title="Convert to Confirmed Tour Booking"
                    >
                      <CheckCircle2 size={11} />
                      <span>✓ Book</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 bg-white p-2.5 rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-500 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="Search inquiries by customer name, phone, destination, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-zinc-900 focus:outline-none placeholder:text-zinc-400 font-medium"
          />
        </div>

        {/* New Inquiry Button */}
        <button
          type="button"
          onClick={() => setIsAddTourInquiryOpen(true)}
          className="px-4 py-2.5 bg-zinc-950 hover:bg-black text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>+ New Inquiry</span>
        </button>
      </div>

      {/* Filter Tabs: Source & Status (including Lost & Today's Follow-up) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0">Status:</span>
          {[
            { id: 'ALL', label: 'All Leads' },
            { id: 'Today Follow-up', label: `🔔 Today's Follow-up (${todayFollowUps.length})` },
            { id: 'New', label: 'New Lead' },
            { id: 'In Discussion', label: 'In Discussion' },
            { id: 'Package Sent', label: 'PDF Sent' },
            { id: 'Follow-up', label: 'Follow-up' },
            { id: 'Converted', label: '✓ Booked' },
            { id: 'Lost', label: '🔴 Lost Leads' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`text-[11px] font-bold px-3 py-1 rounded-xl shrink-0 transition-all cursor-pointer ${
                selectedStatus === st.id
                  ? 'bg-zinc-950 text-white border-2 border-zinc-900 shadow-xs'
                  : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0">Source:</span>
          {['ALL', 'Phone Call', 'WhatsApp', 'Instagram', 'Walk-in', 'Reference'].map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              className={`text-[11px] font-bold px-3 py-1 rounded-xl shrink-0 transition-all cursor-pointer ${
                selectedSource === src
                  ? 'bg-zinc-950 text-white border-2 border-zinc-900'
                  : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100'
              }`}
            >
              {src === 'ALL' ? 'All Sources' : src}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries Cards List */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-900 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto border border-zinc-300">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Inquiries Found</h3>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto">
            {selectedStatus === 'Lost'
              ? 'No inquiries are marked as Lost.'
              : selectedStatus === 'Today Follow-up'
              ? 'No follow-up calls are due for today!'
              : 'No inquiries match this filter. Click "+ New Inquiry" to log a customer lead!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredInquiries.map((inq) => {
            const linkedPkg = customTourPackages.find((p) => p.id === inq.linkedPackageId);
            const isDueToday = inq.followUpDate && inq.followUpDate <= todayStr && inq.status !== 'Converted' && inq.status !== 'Lost';

            return (
              <div
                key={inq.id}
                className={`bg-white text-zinc-950 rounded-2xl border-2 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-all group ${
                  inq.status === 'Lost'
                    ? 'border-zinc-300 opacity-80 bg-zinc-50/50'
                    : isDueToday
                    ? 'border-amber-500 ring-1 ring-amber-400'
                    : 'border-zinc-900'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Inquiry No, Source & Status Dropdown */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                        {inq.inquiryNumber}
                      </span>
                      {getSourceBadge(inq.source)}
                    </div>

                    {/* Quick Status Dropdown Directly on Card */}
                    <div className="relative">
                      <select
                        value={inq.status}
                        onChange={(e) => handleUpdateStatus(inq.id, e.target.value as InquiryStatus)}
                        disabled={updatingId === inq.id}
                        className={`text-[10px] font-black px-2 py-0.5 rounded border cursor-pointer outline-none ${
                          inq.status === 'Lost'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : inq.status === 'Converted'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                            : inq.status === 'Follow-up'
                            ? 'bg-orange-50 text-orange-900 border-orange-300'
                            : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                        }`}
                      >
                        <option value="New">🟡 New Lead</option>
                        <option value="In Discussion">🔵 In Discussion</option>
                        <option value="Package Sent">🟣 PDF Sent</option>
                        <option value="Follow-up">🟠 Follow-up</option>
                        <option value="Converted">🟢 ✓ Booked</option>
                        <option value="Lost">🔴 Lost Lead</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer Info & City */}
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm sm:text-base font-black text-zinc-950 tracking-tight">
                        {inq.customerName}
                      </h3>
                      {inq.status === 'Lost' && (
                        <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                          Lost Lead
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <a
                        href={`tel:${inq.customerPhone}`}
                        className="font-bold text-zinc-900 hover:underline flex items-center gap-1"
                      >
                        <Phone size={12} className="shrink-0" />
                        <span>{inq.customerPhone}</span>
                      </a>
                      {inq.fromCity && (
                        <span className="text-zinc-500 font-medium">
                          • {inq.fromCity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Destination & Pax Badges */}
                  <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-zinc-950 flex items-center gap-1">
                        <MapPin size={13} className="text-zinc-900 shrink-0" />
                        <span>{inq.destination}</span>
                      </span>
                      <span className="font-extrabold text-[10px] bg-white px-2 py-0.5 rounded border border-zinc-300">
                        {inq.travelClass || 'AC Train'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-700">
                      <div className="flex items-center gap-1">
                        <Users size={12} className="text-zinc-900 shrink-0" />
                        <span className="font-extrabold text-zinc-900">
                          {inq.paxAdults} Adults, {inq.paxChildren} Child ({inq.totalPax} Pax)
                        </span>
                      </div>
                      {inq.preferredDate && (
                        <span className="text-zinc-500 font-medium text-[10px]">
                          🗓️ Tour: {inq.preferredDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Follow-up Date Row with 1-Click Update, +1 Day, +3 Days, Custom Date, and Chat Timeline */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 font-bold text-zinc-900">
                        <Clock size={12} className="text-amber-700 shrink-0" />
                        <span>Follow-up Due:</span>
                        <input
                          type="date"
                          value={inq.followUpDate || ''}
                          onChange={(e) => handleUpdateFollowUpDate(inq.id, e.target.value)}
                          className="bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-zinc-900 cursor-pointer"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenChatModal(inq)}
                        className="text-[10px] font-black text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <MessageSquare size={10} />
                        <span>Chat ({Array.isArray(inq.followUpHistory) ? inq.followUpHistory.length : inq.discussionSummary ? 1 : 0})</span>
                      </button>
                    </div>

                    {/* Quick Reschedule Action Buttons: +1 Day, +3 Days, Custom Date */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenChatModal(inq, getDateOffset(1))}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[10px] font-black border border-zinc-300 transition-colors cursor-pointer"
                        title="Follow up tomorrow (+1 Day)"
                      >
                        +1 Day
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenChatModal(inq, getDateOffset(3))}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[10px] font-black border border-zinc-300 transition-colors cursor-pointer"
                        title="Follow up in 3 days (+3 Days)"
                      >
                        +3 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenChatModal(inq, inq.followUpDate || todayStr)}
                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] font-black border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Custom Date Pick & Chat Reply"
                      >
                        <Calendar size={10} />
                        <span>Custom Date</span>
                      </button>
                    </div>
                  </div>

                  {/* Core Box: "Kya Baat Hui" / Discussion Summary */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between">
                      <span>💬 Kya Baat Hui (Discussion):</span>
                      <button
                        type="button"
                        onClick={() => handleOpenChatModal(inq)}
                        className="text-[10px] font-black text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Timeline History &rarr;</span>
                      </button>
                    </div>
                    <p className="text-xs text-zinc-900 leading-relaxed font-medium line-clamp-3">
                      {inq.discussionSummary || 'No discussion notes.'}
                    </p>
                  </div>

                  {/* Linked Package or Extra Note */}
                  {inq.notes && (
                    <div className="text-[11px] text-zinc-600 bg-zinc-100 px-2 py-1 rounded-lg border border-zinc-200 truncate">
                      <strong>Note:</strong> {inq.notes}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 mt-3 border-t border-zinc-200 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Gujarati PDF / Package Info Button */}
                    <button
                      type="button"
                      onClick={() => openInquiryPdf(inq, linkedPkg)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                      title="View Gujarati Package Brochure & PDF"
                    >
                      <FileText size={13} />
                      <span>Brochure PDF</span>
                    </button>

                    {/* WhatsApp Proposal Share Button */}
                    <button
                      type="button"
                      onClick={() => handleWhatsAppSend(inq, false)}
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                      title="Share proposal on WhatsApp"
                    >
                      <Share2 size={13} />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {/* Convert or Mark Lost */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConvertToBooking(inq)}
                        className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Convert to Booking &rarr;</span>
                      </button>

                      {inq.status !== 'Lost' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(inq.id, 'Lost')}
                          className="text-[10px] font-black text-rose-700 hover:text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
                          title="Mark inquiry as lost"
                        >
                          Mark Lost
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(inq.id, 'Follow-up')}
                          className="text-[10px] font-black text-zinc-700 hover:text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300 cursor-pointer"
                          title="Reopen inquiry"
                        >
                          Reopen
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditTourInquiryModal(inq)}
                        title="Edit Inquiry"
                        className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-colors cursor-pointer"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(inq)}
                        title="Delete Inquiry"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-up & Chat Timeline Modal */}
      <FollowUpChatModal
        isOpen={Boolean(chatModalInquiry)}
        onClose={() => setChatModalInquiry(null)}
        inquiry={chatModalInquiry}
        initialNextDate={chatModalInitialDate}
        onSaveFollowUp={handleSaveFollowUp}
        onWhatsAppSend={handleWhatsAppSend}
        onConvertToBooking={handleConvertToBooking}
      />
    </div>
  );
};
