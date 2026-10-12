import React, { useRef } from 'react';
import {
  X,
  Printer,
  Share2,
  Copy,
  Check,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Phone,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CustomTourPackage, TourInquiry } from '../../types';

interface TourPackagePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: CustomTourPackage | null;
  inquiry: TourInquiry | null;
}

export const TourPackagePdfModal: React.FC<TourPackagePdfModalProps> = ({
  isOpen,
  onClose,
  pkg,
  inquiry,
}) => {
  const { formatCurrency, formatDate } = useData();
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !pkg) return null;

  const customerName = inquiry?.customerName || 'ગ્રાહક શ્રી';
  const customerPhone = inquiry?.customerPhone || '';
  const customerCity = inquiry?.fromCity || 'વડોદરા';
  const paxText = inquiry ? `${inquiry.paxAdults} પુખ્ત + ${inquiry.paxChildren} બાળક (કુલ ${inquiry.totalPax} વ્યક્તિ)` : 'ફેમિલી ગ્રૂપ';
  const todayGujarati = new Date().toLocaleDateString('gu-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Generate plain text for WhatsApp sharing in Gujarati
  const generateWhatsAppMessage = () => {
    let msg = `*संजरी टूरिज्म - वडोदरा (SANZARI TOURS)* 🚩\n`;
    msg += `-----------------------------------------\n`;
    msg += `नमस्ते *${customerName}* जी 🙏\n`;
    msg += `आपकी पूछताछ अनुसार टूर पैकेज की जानकारी नीचे दी गई है:\n\n`;
    msg += `📍 *टूर:* ${pkg.packageName} (${pkg.destination})\n`;
    msg += `⏱️ *अवधि:* ${pkg.durationDays} Days / ${pkg.durationNights} Nights\n`;
    msg += `🗺️ *गंतव्य:* ${pkg.destination}\n`;
    msg += `👥 *यात्री:* ${paxText}\n\n`;

    msg += `💰 *रेट चार्ट (प्रति व्यक्ति):*\n`;
    if (pkg.priceNonAcTrain) msg += `• स्लीपर ट्रेन: ${formatCurrency(pkg.priceNonAcTrain)} / व्यक्ति\n`;
    if (pkg.priceAcTrain) msg += `• 3AC ट्रेन: ${formatCurrency(pkg.priceAcTrain)} / व्यक्ति\n`;
    if (pkg.priceFlight) msg += `• फ्लाइट / विमान टूर: ${formatCurrency(pkg.priceFlight)} / व्यक्ति\n`;
    if (pkg.priceChildHalf) msg += `• बच्चा (5-11 वर्ष): ${formatCurrency(pkg.priceChildHalf)} / बच्चा\n\n`;

    msg += `🏨 *होटल & भोजन:* ${pkg.hotelCategory} • ${pkg.foodPlan}\n\n`;

    msg += `✅ *टूर में शामिल सुविधाएं:*\n`;
    pkg.inclusionsGujarati.slice(0, 5).forEach((inc) => {
      msg += `✓ ${inc}\n`;
    });
    msg += `\n`;

    msg += `📞 *संपर्क & बुकिंग ऑफिस:*\n`;
    msg += `*संजरी टूरिज्म (वडोदरा)*\n`;
    msg += `फोन: +91 98250 14522 / +91 94280 99881\n`;
    msg += `पता: वडोदरा (गुजरात)\n`;
    msg += `-----------------------------------------\n`;
    msg += `_अधिक जानकारी अथवा बुकिंग के लिए इस नंबर पर संपर्क करें._`;
    return msg;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateWhatsAppMessage());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppMessage());
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border-2 border-zinc-900 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Control Bar - Screen only */}
        <div className="no-print bg-zinc-950 p-4 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b-2 border-zinc-900">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                Tour Package Proposal &amp; PDF Brochure
              </h2>
              <p className="text-[11px] text-zinc-400">
                Sanzari Tours (Vadodara) • A4 Print &amp; WhatsApp Share
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-xs font-bold border border-zinc-700 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy Proposal Text"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Share2 size={14} />
              <span>Share on WhatsApp</span>
            </button>

            <button
              onClick={handlePrintPdf}
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Printer size={14} />
              <span>Download / Print PDF</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Document Area in Authentic Vadodara Font */}
        <div
          className="p-4 sm:p-8 overflow-y-auto flex-1 min-h-0 bg-[#ffffff] text-zinc-950"
          style={{ fontFamily: "'Hind', 'Noto Sans Devanagari', 'Noto Sans Gujarati', 'Inter', sans-serif" }}
          ref={printRef}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header: Sanzari Tourism Vadodara Branding */}
            <div className="border-b-2 border-zinc-900 pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white font-black flex items-center justify-center text-sm border-2 border-zinc-900">
                      SZ
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight leading-tight">
                        સંજરી ટૂર્સ એન્ડ ટ્રાવેલ્સ
                      </h1>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                        SANZARI TOURS &amp; TRAVELS • VADODARA (GUJARAT)
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-zinc-700 mt-2">
                    📍 રજિસ્ટર્ડ ઓફિસ: વડોદરા (ગુજરાત) • ફોન: +91 98250 14522 / +91 94280 99881
                  </p>
                  <p className="text-[11px] font-bold text-emerald-800">
                    🌱 ૧૦૦% શુદ્ધ શાકાહારી &amp; જૈન ભોજન સાથે શ્રેષ્ઠ ફેમિલી ટૂર સર્વિસ
                  </p>
                </div>

                <div className="bg-zinc-50 border-2 border-zinc-900 rounded-2xl p-3 text-right self-stretch sm:self-auto min-w-[200px]">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                    પેકેજ ક્વોટેશન / તારીખ
                  </span>
                  <span className="text-xs font-black text-zinc-950 block mt-0.5">
                    {todayGujarati}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-700 block mt-1">
                    કોડ: {pkg.packageCode}
                  </span>
                </div>
              </div>

              {/* Inquiry Customer Strip */}
              {inquiry && (
                <div className="mt-4 bg-zinc-100 rounded-xl p-3 border border-zinc-300 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block uppercase">ગ્રાહક શ્રી</span>
                    <strong className="text-zinc-950 font-black">{inquiry.customerName}</strong>
                    <span className="text-zinc-600 block text-[11px]">{inquiry.customerPhone} ({customerCity})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block uppercase">સભ્ય સંખ્યા</span>
                    <strong className="text-zinc-950 font-black">{paxText}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block uppercase">પૂછપરછ સંદર્ભ</span>
                    <span className="font-mono font-bold text-zinc-800">{inquiry.inquiryNumber}</span> • {inquiry.source}
                  </div>
                </div>
              )}
            </div>

            {/* Tour Title Banner */}
            <div className="bg-zinc-50 border-2 border-zinc-900 rounded-2xl p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 bg-zinc-950 text-white rounded-lg">
                  {pkg.durationTextGujarati}
                </span>
                <span className="text-xs font-bold text-zinc-700 bg-white px-2.5 py-1 rounded-lg border border-zinc-300">
                  {pkg.hotelCategory}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight pt-1">
                {pkg.packageNameGujarati}
              </h2>
              <p className="text-xs font-bold text-zinc-600">
                {pkg.packageName} • {pkg.destination}
              </p>

              {pkg.overviewGujarati && (
                <p className="text-xs text-zinc-800 leading-relaxed pt-2 border-t border-zinc-200">
                  {pkg.overviewGujarati}
                </p>
              )}
            </div>

            {/* Rates Table / ભાવ પત્રક */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>💰</span> ટૂર દર પત્રક (પ્રતિ વ્યક્તિ રેટ્સ)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white border-2 border-zinc-900 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase block">
                    સ્લીપર / નોન-એસી
                  </span>
                  <span className="text-lg font-black text-zinc-950 block mt-1">
                    {pkg.priceNonAcTrain ? formatCurrency(pkg.priceNonAcTrain) : '₹14,000'}
                  </span>
                  <span className="text-[9px] text-zinc-600 block">પ્રતિ વ્યક્તિ</span>
                </div>

                <div className="bg-zinc-50 border-2 border-zinc-900 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-extrabold text-zinc-700 uppercase block">
                    3AC ટ્રેન ટૂર
                  </span>
                  <span className="text-lg font-black text-zinc-950 block mt-1">
                    {pkg.priceAcTrain ? formatCurrency(pkg.priceAcTrain) : formatCurrency(pkg.priceNonAcTrain || 16000)}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-bold block">સૌથી લોકપ્રિય</span>
                </div>

                <div className="bg-white border-2 border-zinc-900 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase block">
                    ફ્લાઇટ / એર ટૂર
                  </span>
                  <span className="text-lg font-black text-zinc-950 block mt-1">
                    {pkg.priceFlight ? formatCurrency(pkg.priceFlight) : '₹22,000'}
                  </span>
                  <span className="text-[9px] text-zinc-600 block">ફ્લાઇટ ટિકિટ સહિત</span>
                </div>

                <div className="bg-zinc-50 border-2 border-zinc-900 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase block">
                    બાળક (૫-૧૧ વર્ષ)
                  </span>
                  <span className="text-lg font-black text-zinc-950 block mt-1">
                    {pkg.priceChildHalf ? formatCurrency(pkg.priceChildHalf) : '₹7,000'}
                  </span>
                  <span className="text-[9px] text-zinc-600 block">હાફ ટિકિટ</span>
                </div>
              </div>
            </div>

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Inclusions */}
              <div className="bg-zinc-50 border-2 border-zinc-900 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-700" />
                  ટૂરમાં સમાવિષ્ટ સુવિધાઓ (Inclusions)
                </h4>
                <ul className="space-y-1.5 text-xs text-zinc-800">
                  {pkg.inclusionsGujarati.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exclusions */}
              <div className="bg-zinc-50 border-2 border-zinc-900 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <XCircle size={15} className="text-rose-700" />
                  ટૂરમાં સમાવિષ્ટ નથી (Exclusions)
                </h4>
                <ul className="space-y-1.5 text-xs text-zinc-800">
                  {pkg.exclusionsGujarati.map((exc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-700 font-bold">✗</span>
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Day-wise Itinerary (દૈનિક કાર્યક્રમ) */}
            {pkg.itinerary && pkg.itinerary.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🗓️</span> દૈનિક પ્રવાસ કાર્યક્રમ (Day-by-Day Itinerary)
                </h3>
                <div className="space-y-2.5 border-2 border-zinc-900 rounded-2xl p-4 bg-white">
                  {pkg.itinerary.map((item, idx) => (
                    <div
                      key={idx}
                      className="pb-3 border-b border-zinc-200 last:border-b-0 last:pb-0 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-950 text-white">
                          દિવસ {item.day}
                        </span>
                        <h4 className="text-xs font-black text-zinc-950">{item.title}</h4>
                      </div>
                      <p className="text-[11px] text-zinc-700 pl-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Food & Hotel Plan Banner */}
            <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-500 block">ભોજન વ્યવસ્થા (Food Plan)</span>
                <span className="font-bold text-zinc-900 block mt-0.5">{pkg.foodPlan}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-500 block">વાહન વ્યવસ્થા (Transport)</span>
                <span className="font-bold text-zinc-900 block mt-0.5">{pkg.transportDetails}</span>
              </div>
            </div>

            {/* Footer & Booking Info */}
            <div className="border-t-2 border-zinc-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-extrabold text-zinc-950">સંજરી ટૂરિઝમ - વડોદરા (ગુજરાત)</p>
                <p className="text-zinc-600 text-[11px]">
                  હેલ્પલાઇન: +91 98250 14522 / +91 94280 99881 • ઈમેલ: sanzaritourism@gmail.com
                </p>
              </div>

              <div className="text-center sm:text-right">
                <span className="text-[10px] text-zinc-500 block">અધિકૃત સંજરી ટૂરિઝમ સીલ &amp; સિગ્નેચર</span>
                <div className="font-serif italic font-bold text-zinc-900 text-sm mt-0.5">
                  Sanzari Tours (Vadodara)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
