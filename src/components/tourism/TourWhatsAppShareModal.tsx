import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  RotateCcw,
  QrCode,
  Upload,
  Trash2,
  Share2,
  Download,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TourBooking } from '../../types';

interface TourWhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: TourBooking | null;
  batchTitle?: string;
}

const QR_STORAGE_KEY = 'sz_payment_qr_image_v1';
const WA_PREFS_STORAGE_KEY = 'sz_wa_share_prefs_v1';

type MessagePreset = 'short' | 'compact' | 'full' | 'custom';

interface WhatsAppMessagePrefs {
  preset: MessagePreset;
  compactStyle: boolean;
  showGreeting: boolean;
  showTourDetails: boolean;
  showPassengers: boolean;
  showInstallments: boolean;
  includeDateNote: boolean;
  showDueRequest: boolean;
  includeQrNote: boolean;
}

const PRESET_CONFIGS: Record<Exclude<MessagePreset, 'custom'>, WhatsAppMessagePrefs> = {
  short: {
    preset: 'short',
    compactStyle: true,
    showGreeting: false,
    showTourDetails: false,
    showPassengers: false,
    showInstallments: true,
    includeDateNote: true,
    showDueRequest: true,
    includeQrNote: true,
  },
  compact: {
    preset: 'compact',
    compactStyle: true,
    showGreeting: false,
    showTourDetails: true,
    showPassengers: true,
    showInstallments: true,
    includeDateNote: true,
    showDueRequest: true,
    includeQrNote: true,
  },
  full: {
    preset: 'full',
    compactStyle: false,
    showGreeting: true,
    showTourDetails: true,
    showPassengers: true,
    showInstallments: true,
    includeDateNote: true,
    showDueRequest: true,
    includeQrNote: true,
  },
};

function loadSavedPrefs(): WhatsAppMessagePrefs {
  try {
    const raw = localStorage.getItem(WA_PREFS_STORAGE_KEY);
    if (!raw) return PRESET_CONFIGS.compact;
    const parsed = JSON.parse(raw);
    return {
      ...PRESET_CONFIGS.compact,
      ...parsed,
    };
  } catch {
    return PRESET_CONFIGS.compact;
  }
}

interface NormalizedInstallment {
  label: string;
  amount: number;
  dateLabel: string;
  mode: string;
}

function formatReadableDate(raw?: string | number): string {
  if (!raw) return '';
  try {
    const str = String(raw).trim();
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    const d = isoMatch
      ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
      : new Date(str);
    if (isNaN(d.getTime())) return str.slice(0, 10);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function extractInstallments(b: TourBooking): NormalizedInstallment[] {
  const adv = Number(b.advancePaid || 0);
  const rawHistory = Array.isArray(b.paymentHistory) ? b.paymentHistory : [];
  const items: { amount: number; date?: string; mode: string }[] = [];

  if (rawHistory.length > 0) {
    const histSum = rawHistory.reduce((s, h) => s + Number(h.amount || 0), 0);
    if (adv > histSum) {
      items.push({
        amount: adv - histSum,
        date: b.createdAt || b.tourDate,
        mode: b.paymentMode || 'Online',
      });
    }
    rawHistory.forEach((h) => {
      const amt = Number(h.amount || 0);
      if (amt > 0) {
        items.push({
          amount: amt,
          date: h.date || b.lastPaymentDate || b.createdAt,
          mode: h.paymentMode || h.paymentMethod || b.paymentMode || 'Online',
        });
      }
    });
  } else if (adv > 0) {
    items.push({
      amount: adv,
      date: b.lastPaymentDate || b.createdAt || b.tourDate,
      mode: b.paymentMode || 'Online',
    });
  }

  return items.map((item, idx) => ({
    label: idx === 0 ? 'Advance' : `Inst. #${idx + 1}`,
    amount: item.amount,
    dateLabel: formatReadableDate(item.date) || 'Approx. Date',
    mode: item.mode,
  }));
}

function buildBookingWhatsAppMessage(
  b: TourBooking,
  prefs: WhatsAppMessagePrefs,
  batchTitle?: string
): string {
  const total = Number(b.totalAmount || 0);
  const adv = Number(b.advancePaid || 0);
  const due = Math.max(0, total - adv);
  const installments = extractInstallments(b);
  const members =
    b.members && b.members.length > 0
      ? b.members
      : [{ name: b.customerName, age: '', gender: 'Male' }];

  const tourDateFormatted = formatReadableDate(b.tourDate) || b.tourDate || '';
  const tourLabel = batchTitle
    ? `${b.destination} (${batchTitle}${tourDateFormatted ? ` • ${tourDateFormatted}` : ''})`
    : `${b.destination}${tourDateFormatted ? ` (${tourDateFormatted})` : ''}`;

  const lines: string[] = [];

  if (prefs.compactStyle) {
    lines.push(`*✨ SANZARI TOURS & TRAVELS ✨*`);
  } else {
    lines.push(`*✨ SANZARI TOURS & TRAVELS ✨*`);
    lines.push(`*Tour Booking & Payment Details*`);
  }

  if (prefs.showGreeting) {
    if (!prefs.compactStyle) lines.push(``);
    lines.push(`Assalam-o-Alaikum / Namaste *${b.customerName}* ji, 🙏`);
    if (!prefs.compactStyle) {
      lines.push(`Aapki tour booking aur payment ki poori details niche di gayi hain:`);
    }
  }

  lines.push(``);

  if (prefs.compactStyle) {
    lines.push(`📌 *${b.bookingNumber}* · *${b.customerName}* (${b.customerPhone})`);
    if (prefs.showTourDetails) {
      lines.push(
        `📍 *${tourLabel}* · ${b.travelClass}${b.city ? ` · ${b.city}` : ''} · *${b.membersCount} Pax*`
      );
    } else {
      lines.push(`📍 *${b.destination}*${tourDateFormatted ? ` (${tourDateFormatted})` : ''} · *${b.membersCount} Pax*`);
    }
  } else {
    lines.push(`📌 *Booking ID:* ${b.bookingNumber}`);
    lines.push(`👤 *Name:* *${b.customerName}* (${b.customerPhone})`);
    if (prefs.showTourDetails) {
      lines.push(`📍 *Tour:* ${tourLabel}`);
      lines.push(`🚆 *Travel Class:* ${b.travelClass}`);
      if (b.city) {
        lines.push(`🏙️ *City:* ${b.city}`);
      }
    } else {
      lines.push(`📍 *Tour:* ${b.destination}${tourDateFormatted ? ` (${tourDateFormatted})` : ''}`);
    }
    lines.push(`👥 *Total Passengers:* ${b.membersCount} Pax`);
  }

  if (prefs.showPassengers) {
    if (prefs.compactStyle) {
      const compactMembers = members
        .map((m) => `*${m.name || 'Passenger'}*${m.age ? ` (${m.age})` : ''}`)
        .join(', ');
      lines.push(`👥 *Members:* ${compactMembers}`);
    } else {
      lines.push(``);
      lines.push(`*👥 Passenger Details:*`);
      members.forEach((m, i) => {
        lines.push(
          `${i + 1}. *${m.name || 'Passenger'}* (${m.age ? `${m.age} yrs` : 'Adult'} • ${m.gender || 'Member'})`
        );
      });
    }
  }

  lines.push(``);

  if (prefs.compactStyle) {
    lines.push(`💰 *Total Package:* *₹${total.toLocaleString('en-IN')}*`);
  } else {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`💰 *PAYMENT SUMMARY*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`• *Total Package Amount:* ₹${total.toLocaleString('en-IN')}`);
    lines.push(``);
  }

  if (prefs.showInstallments) {
    if (installments.length > 0) {
      if (!prefs.compactStyle) {
        lines.push(`*📅 Advance & Installments (Date-wise):*`);
      }
      installments.forEach((inst, i) => {
        const prefix = prefs.compactStyle ? '•' : `${i + 1}.`;
        const displayLabel =
          !prefs.compactStyle && i > 0 ? `Installment #${i + 1}` : inst.label;
        lines.push(
          `${prefix} *${displayLabel}:* *₹${inst.amount.toLocaleString('en-IN')}* — _${inst.dateLabel}_ (${inst.mode})`
        );
      });
      if (!prefs.compactStyle) lines.push(``);
    } else {
      lines.push(`• *Advance Received:* ₹0`);
      if (!prefs.compactStyle) lines.push(``);
    }
  }

  lines.push(`✅ *Total Received:* *₹${adv.toLocaleString('en-IN')}*`);
  if (due === 0) {
    lines.push(`🎉 *Status:* *FULL PAID (₹0 Baaki)*`);
  } else {
    lines.push(`⏳ *Baaki Due:* *₹${due.toLocaleString('en-IN')}*`);
  }

  if (prefs.includeDateNote && prefs.showInstallments && installments.length > 0) {
    if (!prefs.compactStyle) lines.push(``);
    lines.push(
      prefs.compactStyle
        ? `_*Note:* Payment dates system-generated (approx.) hain — 1–2 din aage-piche ho toh please ignore karein._`
        : `_*Note:* Upar di gayi payment dates hamare system-generated (approx.) dates hain — agar koi date 1–2 din aage-piche ho toh please ignore karein._`
    );
  }

  if (b.specialNotes && !prefs.compactStyle) {
    lines.push(``);
    lines.push(`📝 *Note:* ${b.specialNotes}`);
  }

  if (due > 0) {
    if (prefs.showDueRequest) {
      lines.push(``);
      if (prefs.compactStyle) {
        lines.push(
          `🙏 Please baaki *₹${due.toLocaleString('en-IN')}* jald clear karwa dein taaki booking & tickets confirm rahein.`
        );
      } else {
        lines.push(`🙏 *Payment Clear Request:*`);
        lines.push(
          `Aapse humble request hai ki apna baaki pending payment *₹${due.toLocaleString('en-IN')}* jald se jald clear karwa dein, taaki aapki tour arrangements aur tickets smoothly confirm rahein.`
        );
      }
    }

    if (prefs.includeQrNote) {
      if (!prefs.showDueRequest || !prefs.compactStyle) lines.push(``);
      lines.push(
        prefs.compactStyle
          ? `📲 *QR Code attached hai* — payment ke baad *screenshot share karein.*`
          : `📲 *Payment QR Code attach kiya gaya hai* — aap QR scan karke payment kar sakte hain aur payment karne ke baad *screenshot zaroor share kar dein.*`
      );
    }
  } else if (prefs.showDueRequest) {
    lines.push(``);
    lines.push(`Aapka poora payment clear ho chuka hai. Safar ke liye shukriya! 🌟`);
  }

  lines.push(``);
  lines.push(
    prefs.compactStyle
      ? `Shukriya! 🙏 — *Team Sanzari Tours & Travels*`
      : `Shukriya! 🙏\n*Team Sanzari Tours & Travels*`
  );

  return lines.join('\n');
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

export const TourWhatsAppShareModal: React.FC<TourWhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  booking,
  batchTitle,
}) => {
  const [prefs, setPrefs] = useState<WhatsAppMessagePrefs>(() => loadSavedPrefs());
  const [showCustomize, setShowCustomize] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [savedQrDataUrl, setSavedQrDataUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(QR_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const total = Number(booking?.totalAmount || 0);
  const adv = Number(booking?.advancePaid || 0);
  const due = Math.max(0, total - adv);

  const canNativeShareFiles = useMemo(() => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
    return typeof navigator.canShare === 'function';
  }, []);

  const persistAndApplyPrefs = (nextPrefs: WhatsAppMessagePrefs, targetBooking: TourBooking | null = booking) => {
    setPrefs(nextPrefs);
    try {
      localStorage.setItem(WA_PREFS_STORAGE_KEY, JSON.stringify(nextPrefs));
    } catch {
      // ignore storage errors
    }
    if (targetBooking) {
      setMessageText(
        buildBookingWhatsAppMessage(
          targetBooking,
          nextPrefs,
          batchTitle || targetBooking.tourBatchTitle
        )
      );
    }
  };

  // Generate fresh message from saved prefs whenever modal opens for a booking
  useEffect(() => {
    if (!isOpen || !booking) return;
    const saved = loadSavedPrefs();
    setPrefs(saved);
    setCopied(false);
    setShareFeedback(null);
    setMessageText(
      buildBookingWhatsAppMessage(
        booking,
        saved,
        batchTitle || booking.tourBatchTitle
      )
    );
  }, [isOpen, booking, batchTitle]);

  if (!isOpen || !booking) return null;

  const lineCount = messageText ? messageText.split('\n').length : 0;

  const handleSelectPreset = (presetKey: Exclude<MessagePreset, 'custom'>) => {
    const nextPrefs = { ...PRESET_CONFIGS[presetKey] };
    persistAndApplyPrefs(nextPrefs);
  };

  const handleToggleOption = (
    key: keyof Omit<WhatsAppMessagePrefs, 'preset'>
  ) => {
    const nextPrefs: WhatsAppMessagePrefs = {
      ...prefs,
      [key]: !prefs[key],
      preset: 'custom',
    };
    persistAndApplyPrefs(nextPrefs);
  };

  const handleReset = () => {
    setMessageText(
      buildBookingWhatsAppMessage(
        booking,
        prefs,
        batchTitle || booking.tourBatchTitle
      )
    );
    setShareFeedback('Message regenerated from selected options');
    window.setTimeout(() => setShareFeedback(null), 1800);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setShareFeedback('Could not copy automatically — please select and copy.');
    }
  };

  const handleOpenWhatsApp = () => {
    const phoneClean = (booking.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCode = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleUploadQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Compress/resize to max 720px so it stays crisp and fits comfortably in localStorage
        const maxSide = 720;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          const ratio = Math.min(maxSide / width, maxSide / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          try {
            localStorage.setItem(QR_STORAGE_KEY, compressed);
          } catch {
            // ignore quota issues
          }
          setSavedQrDataUrl(compressed);
          setShareFeedback('Payment QR saved for quick sharing!');
          window.setTimeout(() => setShareFeedback(null), 2200);
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveQr = () => {
    try {
      localStorage.removeItem(QR_STORAGE_KEY);
    } catch {
      // ignore
    }
    setSavedQrDataUrl(null);
  };

  const handleDownloadQr = () => {
    if (!savedQrDataUrl) return;
    const a = document.createElement('a');
    a.href = savedQrDataUrl;
    a.download = 'Sanzari_Payment_QR.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareWithQr = async () => {
    if (!savedQrDataUrl) {
      handleOpenWhatsApp();
      return;
    }
    const qrFile = dataUrlToFile(savedQrDataUrl, 'Sanzari_Payment_QR.jpg');
    if (qrFile && canNativeShareFiles && navigator.canShare({ files: [qrFile] })) {
      try {
        await navigator.share({
          title: `Sanzari Payment Details - ${booking.customerName}`,
          text: messageText,
          files: [qrFile],
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback for desktop browsers: copy message & open WhatsApp so user can attach QR directly
    try {
      await navigator.clipboard.writeText(messageText);
    } catch {
      // ignore
    }
    setShareFeedback('Message copied! Attach saved QR in WhatsApp.');
    handleOpenWhatsApp();
  };

  const customizeItems: {
    key: keyof Omit<WhatsAppMessagePrefs, 'preset'>;
    label: string;
    hidden?: boolean;
  }[] = [
    { key: 'compactStyle', label: 'Tight / No Dividers' },
    { key: 'showGreeting', label: 'Greeting' },
    { key: 'showTourDetails', label: 'Class & City' },
    { key: 'showPassengers', label: 'Passenger Names' },
    { key: 'showInstallments', label: 'Installments (Dates)' },
    { key: 'includeDateNote', label: 'Approx Date *Note' },
    { key: 'showDueRequest', label: 'Payment Request' },
    { key: 'includeQrNote', label: 'QR Attach Line', hidden: due === 0 },
  ];

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs overflow-hidden"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl bg-white text-zinc-950 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-zinc-900 overflow-hidden max-h-[93dvh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-white shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-300" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-zinc-200 flex items-center justify-between gap-2 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageCircle size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-zinc-950 tracking-tight truncate">
                WhatsApp Message &amp; Payment Reminder
              </h3>
              <p className="text-[11px] text-zinc-600 font-semibold truncate">
                {booking.customerName} · {booking.customerPhone} ·{' '}
                <span className="font-mono font-bold">
                  {due === 0 ? 'FULL PAID' : `Baaki ₹${due.toLocaleString('en-IN')}`}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain space-y-2.5 flex-1 bg-zinc-50/60">
          {/* Format Size Presets & Customize Bar */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-2 sm:p-2.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              {/* 3 Length Presets */}
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-xl">
                {(
                  [
                    { id: 'short', label: 'Short' },
                    { id: 'compact', label: 'Compact' },
                    { id: 'full', label: 'Full' },
                  ] as const
                ).map((p) => {
                  const active = prefs.preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-zinc-950 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCustomize((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
                    showCustomize || prefs.preset === 'custom'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <SlidersHorizontal size={11} />
                  <span>Customize</span>
                  {showCustomize ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Reset edited text"
                >
                  <RotateCcw size={11} />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Expandable Section Toggles */}
            {showCustomize && (
              <div className="pt-2 border-t border-zinc-100 flex flex-wrap gap-1.5">
                {customizeItems
                  .filter((item) => !item.hidden)
                  .map((item) => {
                    const active = Boolean(prefs[item.key]);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleToggleOption(item.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-zinc-950 text-white border-zinc-950'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-300 hover:bg-zinc-100'
                        }`}
                      >
                        {active ? `✓ ${item.label}` : `+ ${item.label}`}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Editable WhatsApp Message Textarea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 px-0.5">
              <span>Editable Message (*bold* supported)</span>
              <span className="font-mono text-[10px]">
                {lineCount} lines · {messageText.length} chars
              </span>
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={11}
              className="w-full p-3 rounded-2xl bg-white border border-zinc-300 focus:border-zinc-950 focus:outline-none text-xs sm:text-[13px] text-zinc-900 font-medium leading-relaxed resize-y font-sans shadow-2xs"
            />
          </div>

          {/* Optional Payment QR Image Attachment Strip */}
          {due > 0 && (
            <div className="p-3 rounded-2xl bg-white border border-zinc-200 flex items-center justify-between gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadQr}
                className="hidden"
              />

              <div className="flex items-center gap-2.5 min-w-0">
                {savedQrDataUrl ? (
                  <img
                    src={savedQrDataUrl}
                    alt="Payment QR"
                    className="w-11 h-11 rounded-xl object-cover border border-zinc-200 shrink-0 bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center shrink-0">
                    <QrCode size={18} />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs font-black text-zinc-950 truncate">
                    {savedQrDataUrl ? 'Payment QR Saved' : 'Attach Payment QR (Optional)'}
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-snug">
                    {savedQrDataUrl
                      ? 'Mobile par 1-tap me QR + Message ek saath share karein'
                      : 'Ek baar QR upload karein, har payment reminder ke saath ready rahega'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {savedQrDataUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      title="Download QR Image"
                      className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 cursor-pointer"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Change QR Image"
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveQr}
                      title="Remove Saved QR"
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Upload size={12} />
                    <span>Upload QR</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {shareFeedback && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold text-center">
              ✓ {shareFeedback}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-3.5 py-3 sm:px-5 bg-white border-t border-zinc-200 flex items-center justify-between gap-2 shrink-0 safe-bottom sm:pb-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 sm:px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Msg'}</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {due > 0 && savedQrDataUrl && (
              <button
                type="button"
                onClick={handleShareWithQr}
                className="px-3 sm:px-3.5 py-2.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
              >
                <Share2 size={14} />
                <span>Share QR + Msg</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-3.5 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
            >
              <MessageCircle size={15} />
              <span className="sm:hidden">WhatsApp</span>
              <span className="hidden sm:inline">Send on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
