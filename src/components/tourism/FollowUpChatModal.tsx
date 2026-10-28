import React, { useState } from 'react';
import {
  X,
  Send,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { TourInquiry, InquiryFollowUpNote, InquiryStatus } from '../../types';

interface FollowUpChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: TourInquiry | null;
  initialNextDate?: string;
  onSaveFollowUp: (
    inquiry: TourInquiry,
    replyNote: string,
    nextDate: string,
    newStatus?: InquiryStatus
  ) => Promise<void>;
  onWhatsAppSend: (inquiry: TourInquiry, isFollowUpMsg?: boolean) => void;
  onConvertToBooking: (inquiry: TourInquiry) => void;
}

export const FollowUpChatModal: React.FC<FollowUpChatModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  initialNextDate,
  onSaveFollowUp,
  onWhatsAppSend,
  onConvertToBooking,
}) => {
  if (!isOpen || !inquiry) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const getDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Form State
  const [replyNote, setReplyNote] = useState('');
  const [selectedNextDate, setSelectedNextDate] = useState<string>(
    initialNextDate || inquiry.followUpDate || getDateOffset(1)
  );
  const [isCustomDate, setIsCustomDate] = useState<boolean>(() => {
    if (!initialNextDate) return false;
    return (
      initialNextDate !== getDateOffset(1) &&
      initialNextDate !== getDateOffset(3) &&
      initialNextDate !== getDateOffset(7)
    );
  });
  const [selectedStatus, setSelectedStatus] = useState<InquiryStatus>(
    inquiry.status === 'New' ? 'Follow-up' : inquiry.status
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compile Chronological Timeline Messages
  const historyList: InquiryFollowUpNote[] = React.useMemo(() => {
    const rawList = Array.isArray(inquiry.followUpHistory) ? [...inquiry.followUpHistory] : [];

    // If history is empty but discussionSummary exists, use it as the first message
    if (rawList.length === 0 && inquiry.discussionSummary) {
      rawList.push({
        id: `init_${inquiry.id}`,
        date: inquiry.createdAt || inquiry.updatedAt || todayStr,
        note: inquiry.discussionSummary,
        nextFollowUpDate: inquiry.followUpDate,
        status: inquiry.status,
        loggedBy: inquiry.assignedTo || 'Office Staff',
      });
    }

    return rawList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [inquiry, todayStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyNote.trim() && !selectedNextDate) return;

    setIsSubmitting(true);
    try {
      await onSaveFollowUp(inquiry, replyNote.trim(), selectedNextDate, selectedStatus);
      setReplyNote('');
      onClose();
    } catch (err) {
      console.error('Error saving follow-up note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white text-zinc-950 rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-zinc-950 text-white p-4 sm:p-5 border-b-2 border-zinc-900 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-amber-400 text-zinc-950 px-2 py-0.5 rounded-md">
                  {inquiry.inquiryNumber}
                </span>
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  Follow-up &amp; Chat Timeline
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1">
                {inquiry.customerName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-zinc-300 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 font-semibold">
                  <MapPin size={12} className="text-amber-400" />
                  {inquiry.destination} ({inquiry.totalPax || 2} Pax)
                </span>
                {inquiry.fromCity && <span>• {inquiry.fromCity}</span>}
                <span className="text-zinc-500">•</span>
                <span className="font-mono text-zinc-300">{inquiry.customerPhone}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Call Direct */}
              <a
                href={`tel:${inquiry.customerPhone}`}
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors"
                title="Direct Phone Call"
              >
                <Phone size={14} />
              </a>
              {/* WhatsApp Direct */}
              <button
                type="button"
                onClick={() => onWhatsAppSend(inquiry, true)}
                className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Send WhatsApp Follow-up"
              >
                <MessageCircle size={14} />
              </button>
              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Conversation Timeline (Chat Style) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-zinc-100/70 space-y-3 min-h-[180px]">
          <div className="text-center my-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 bg-zinc-200/80 px-2.5 py-0.5 rounded-full border border-zinc-300">
              💬 Customer Discussion &amp; Reply History
            </span>
          </div>

          {historyList.length === 0 ? (
            <div className="text-center py-6 text-zinc-400 text-xs">
              No previous notes recorded yet. Type what was discussed below to start the timeline!
            </div>
          ) : (
            historyList.map((item, idx) => {
              const isLatest = idx === historyList.length - 1;

              return (
                <div key={item.id || idx} className="flex flex-col items-start space-y-1">
                  {/* Chat Meta Line */}
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-bold ml-1">
                    <span className="w-4 h-4 rounded-full bg-zinc-900 text-white text-[9px] flex items-center justify-center font-bold">
                      {item.loggedBy ? item.loggedBy[0].toUpperCase() : 'S'}
                    </span>
                    <span className="text-zinc-800">{item.loggedBy || 'Staff'}</span>
                    <span>•</span>
                    <span className="font-mono">{formatTimestamp(item.date)}</span>
                    {isLatest && (
                      <span className="text-[9px] font-black bg-blue-100 text-blue-900 px-1.5 rounded">
                        Latest
                      </span>
                    )}
                  </div>

                  {/* Message Bubble (WhatsApp style) */}
                  <div className="bg-white text-zinc-950 p-3 sm:p-3.5 rounded-2xl rounded-tl-xs border border-zinc-300 shadow-2xs max-w-[92%] sm:max-w-[85%] space-y-1.5">
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed text-zinc-900 whitespace-pre-wrap">
                      {item.note}
                    </p>

                    {item.nextFollowUpDate && (
                      <div className="pt-1 border-t border-zinc-100 flex items-center gap-1 text-[10px] text-amber-900 font-bold">
                        <Clock size={11} className="text-amber-700" />
                        <span>Next Follow-up Due: </span>
                        <span className="font-mono bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                          {item.nextFollowUpDate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input & Reschedule Form (Chat Style Reply Box) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 bg-white border-t-2 border-zinc-900 shrink-0 space-y-3">
          {/* Customer Reply Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1">
                <span>💬 Customer Reply / Kya Baat Hui:</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-medium">Auto appends to timeline</span>
            </div>
            <textarea
              required
              rows={2}
              placeholder="e.g. Finel kari ne call kar se haju 1 2 cupele halse / Booking confirm karva call karvano che..."
              value={replyNote}
              onChange={(e) => setReplyNote(e.target.value)}
              className="w-full p-2.5 text-xs bg-zinc-50 border-2 border-zinc-900 rounded-xl text-zinc-950 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-none shadow-2xs"
            />
          </div>

          {/* Next Follow-up Options: +1 Day, +3 Days, +7 Days, and Custom Date */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-zinc-700 flex items-center gap-1">
                <Calendar size={12} className="text-zinc-900" />
                <span>Next Follow-up Date (Schedule):</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                Due: {selectedNextDate}
              </span>
            </div>

            {/* Quick Pills */}
            <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
              {/* +1 Day */}
              <button
                type="button"
                onClick={() => {
                  setSelectedNextDate(getDateOffset(1));
                  setIsCustomDate(false);
                }}
                className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  !isCustomDate && selectedNextDate === getDateOffset(1)
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                }`}
              >
                +1 Day
              </button>

              {/* +3 Days */}
              <button
                type="button"
                onClick={() => {
                  setSelectedNextDate(getDateOffset(3));
                  setIsCustomDate(false);
                }}
                className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  !isCustomDate && selectedNextDate === getDateOffset(3)
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                }`}
              >
                +3 Days
              </button>

              {/* +7 Days */}
              <button
                type="button"
                onClick={() => {
                  setSelectedNextDate(getDateOffset(7));
                  setIsCustomDate(false);
                }}
                className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  !isCustomDate && selectedNextDate === getDateOffset(7)
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                }`}
              >
                +7 Days
              </button>

              {/* Custom Date Button */}
              <button
                type="button"
                onClick={() => setIsCustomDate(true)}
                className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isCustomDate
                    ? 'bg-amber-400 text-zinc-950 border-zinc-950 font-black shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                }`}
              >
                <Calendar size={11} />
                <span>Custom</span>
              </button>
            </div>

            {/* Custom Date Input (Visible when Custom is chosen) */}
            {isCustomDate && (
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 flex items-center justify-between gap-2 animate-in fade-in">
                <span className="text-[11px] font-bold text-amber-950">Pick Custom Date:</span>
                <input
                  type="date"
                  min={todayStr}
                  required
                  value={selectedNextDate}
                  onChange={(e) => setSelectedNextDate(e.target.value)}
                  className="bg-white border-2 border-zinc-900 rounded-lg px-2 py-1 text-xs font-bold text-zinc-950 cursor-pointer focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onConvertToBooking(inquiry);
              }}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
              title="Convert this lead into a booking directly"
            >
              <CheckCircle2 size={13} />
              <span>✓ Book Tour</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !replyNote.trim()}
                className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Send size={13} />
                <span>{isSubmitting ? 'Saving...' : 'Save Reply & Reschedule'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
