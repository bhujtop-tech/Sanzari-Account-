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
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { InquirySource, InquiryStatus, TourInquiry } from '../../types';
import { InquiriesSkeleton } from '../common/Skeleton';

export const TourInquiriesView: React.FC = () => {
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
      const matchStatus = selectedStatus === 'ALL' || inq.status === selectedStatus;

      return matchSearch && matchSource && matchStatus;
    });
  }, [tourInquiries, searchQuery, selectedSource, selectedStatus]);

  if (loading) {
    return <InquiriesSkeleton />;
  }

  // Stats Counters
  const totalCount = tourInquiries.length;
  const newCount = tourInquiries.filter((i) => i.status === 'New').length;
  const followUpCount = tourInquiries.filter((i) => i.status === 'Follow-up' || i.status === 'In Discussion').length;
  const convertedCount = tourInquiries.filter((i) => i.status === 'Converted').length;

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
    // Open AddTourBookingModal with prefilled customer data
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

  const handleWhatsAppSend = (inq: TourInquiry) => {
    const linkedPkg = customTourPackages.find((p) => p.id === inq.linkedPackageId) || customTourPackages[0];
    const customerName = inq.customerName;
    const cleanPhone = inq.customerPhone.replace(/[^0-9]/g, '');

    let text = `नमस्ते ${customerName} जी 🙏\n`;
    text += `*संजरी टूरिज्म - वडोदरा (SANZARI TOURS)* की तरफ से आपकी *${inq.destination}* टूर पूछताछ के लिए हार्दिक आभार।\n\n`;
    if (linkedPkg) {
      text += `📍 *टूर पैकेज:* ${linkedPkg.packageName} (${linkedPkg.destination})\n`;
      text += `⏱️ *अवधि:* ${linkedPkg.durationDays} Days / ${linkedPkg.durationNights} Nights\n`;
      text += `👥 *सवारी / यात्री:* ${inq.totalPax} व्यक्ति (${inq.paxAdults} Adults, ${inq.paxChildren} Children)\n\n`;
      if (linkedPkg.priceAcTrain) text += `• 3AC ट्रेन किराया: ₹${linkedPkg.priceAcTrain.toLocaleString('en-IN')} / व्यक्ति\n`;
      if (linkedPkg.priceFlight) text += `• फ्लाइट / विमान पैकेज: ₹${linkedPkg.priceFlight.toLocaleString('en-IN')} / व्यक्ति\n`;
      text += `\n✅ 100% शुद्ध शाकाहारी / स्वादिष्ट भोजन और डीलक्स होटल स्टे शामिल है।\n`;
    }
    text += `\n📞 *संपर्क & बुकिंग (वडोदरा ऑफिस):*\nफोन: +91 98250 14522 / +91 94280 99881\nपता: वडोदरा (गुजरात)।`;

    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
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
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">New</span>;
      case 'In Discussion':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 border border-zinc-400">Discussion</span>;
      case 'Package Sent':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-300">PDF Sent</span>;
      case 'Follow-up':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-orange-50 text-orange-900 border border-orange-300">Follow-up</span>;
      case 'Converted':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-400">✓ Booked</span>;
      case 'Lost':
        return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-300">Lost</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-48 sm:pb-24">
      {/* Top Stats Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">Total Inquiries</span>
            <span className="text-xl font-black text-zinc-950">{totalCount}</span>
          </div>
          <span className="text-xl">📋</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-amber-700 block">New Leads</span>
            <span className="text-xl font-black text-amber-900">{newCount}</span>
          </div>
          <span className="text-xl">🟡</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-zinc-600 block">In Follow-up</span>
            <span className="text-xl font-black text-zinc-900">{followUpCount}</span>
          </div>
          <span className="text-xl">⏳</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Converted (Booked)</span>
            <span className="text-xl font-black text-emerald-800">{convertedCount}</span>
          </div>
          <span className="text-xl">🎉</span>
        </div>
      </div>

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

      {/* Filter Tabs: Source & Status */}
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

        <div className="w-[1px] h-4 bg-zinc-300 shrink-0 mx-1" />

        <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0">Status:</span>
        {['ALL', 'New', 'In Discussion', 'Package Sent', 'Follow-up', 'Converted'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`text-[11px] font-bold px-3 py-1 rounded-xl shrink-0 transition-all cursor-pointer ${
              selectedStatus === st
                ? 'bg-zinc-950 text-white border-2 border-zinc-900'
                : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100'
            }`}
          >
            {st === 'ALL' ? 'All Status' : st}
          </button>
        ))}
      </div>

      {/* Inquiries Cards List - Crisp White Background & Black Border (2 per row on mobile) */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-900 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto border border-zinc-300">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Inquiries Found</h3>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto">
            No inquiries match this filter. Click "+ New Inquiry" to log a customer lead!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredInquiries.map((inq) => {
            const linkedPkg = customTourPackages.find((p) => p.id === inq.linkedPackageId);

            return (
              <div
                key={inq.id}
                className="bg-white text-zinc-950 rounded-2xl border-2 border-zinc-900 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Inquiry No, Source & Status */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                        {inq.inquiryNumber}
                      </span>
                      {getSourceBadge(inq.source)}
                    </div>
                    {getStatusBadge(inq.status)}
                  </div>

                  {/* Customer Info & City */}
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-zinc-950 tracking-tight">
                      {inq.customerName}
                    </h3>
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
                          🗓️ {inq.preferredDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Core Box: "Kya Baat Hui" / Discussion Summary */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 flex items-center justify-between">
                      <span>Conversation Details (Kya Baat Hui):</span>
                      <span className="text-zinc-500 font-semibold">{inq.assignedTo}</span>
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

                {/* Bottom Actions: WhatsApp Share, Package Info Gujarati PDF, Convert, Edit, Delete */}
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
                      <span>Gujarati PDF</span>
                    </button>

                    {/* WhatsApp Proposal Share Button */}
                    <button
                      type="button"
                      onClick={() => handleWhatsAppSend(inq)}
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                      title="Share proposal on WhatsApp"
                    >
                      <Share2 size={13} />
                      <span>WhatsApp Share</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {/* Convert to Booking */}
                    <button
                      type="button"
                      onClick={() => handleConvertToBooking(inq)}
                      className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Convert to Booking &rarr;</span>
                    </button>

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
    </div>
  );
};
