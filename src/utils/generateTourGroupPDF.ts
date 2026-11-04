import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TourBooking, TourBatch } from '../types';

export type MembersDisplayMode = 'all_members' | 'first_person_only' | 'one_row_per_member';
export type AmountDisplayPreset =
  | 'all_amounts'
  | 'due_only'
  | 'advance_only'
  | 'advance_and_due'
  | 'no_amounts';

export interface TourPDFCustomConfig {
  // Header & Metadata
  title?: string;
  subtitle?: string;
  batch?: TourBatch | null;
  filterLabel?: string;
  orientation?: 'portrait' | 'landscape';

  // Booking Status Filter inside generator
  paymentFilter?: 'ALL' | 'Due' | 'Paid';

  // Members Display Mode
  membersMode?: MembersDisplayMode;

  // Customer & Booking Detail Toggles
  showBookingIdAndDate?: boolean;
  showCustomerName?: boolean;
  showCustomerPhone?: boolean;
  showCity?: boolean;
  showPaxCount?: boolean;
  showTravelClass?: boolean;
  showSpecialNotes?: boolean;

  // Payment & Amount Toggles
  showTopSummaryCards?: boolean;
  showTotalAmount?: boolean;
  showAdvanceAmount?: boolean;
  showAccountAndMode?: boolean;
  showDueAmount?: boolean;
  showPaymentStatus?: boolean;
}

export const DEFAULT_PDF_CONFIG: Required<
  Omit<TourPDFCustomConfig, 'title' | 'subtitle' | 'batch' | 'filterLabel'>
> = {
  orientation: 'portrait', // Standard A4 Vertical by default
  paymentFilter: 'ALL',
  membersMode: 'all_members',
  showBookingIdAndDate: true,
  showCustomerName: true,
  showCustomerPhone: true,
  showCity: true,
  showPaxCount: true,
  showTravelClass: true,
  showSpecialNotes: true,
  showTopSummaryCards: true,
  showTotalAmount: true,
  showAdvanceAmount: true,
  showAccountAndMode: true,
  showDueAmount: true,
  showPaymentStatus: true,
};

const formatRs = (amount: number): string => {
  const num = Math.round(Number(amount || 0));
  return `Rs. ${num.toLocaleString('en-IN')}`;
};

const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const generateTourGroupPDF = (
  bookings: TourBooking[],
  options: TourPDFCustomConfig = {}
) => {
  const cfg = {
    ...DEFAULT_PDF_CONFIG,
    ...options,
  };

  // Filter bookings by paymentFilter
  const filteredBookings = bookings.filter((b) => {
    const tot = Number(b.totalAmount || 0);
    const adv = Number(b.advancePaid || 0);
    const due = Math.max(0, tot - adv);
    const isFullPaid = due === 0 && tot > 0;
    if (cfg.paymentFilter === 'Paid' && !isFullPaid) return false;
    if (cfg.paymentFilter === 'Due' && isFullPaid) return false;
    return true;
  });

  // Sort bookings by tourDate then bookingNumber
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const dateCompare = (a.tourDate || '').localeCompare(b.tourDate || '');
    if (dateCompare !== 0) return dateCompare;
    return (a.bookingNumber || '').localeCompare(b.bookingNumber || '');
  });

  // Always A4 format (210mm x 297mm in portrait)
  const doc = new jsPDF({
    orientation: cfg.orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;

  // Compute Summary Metrics
  const totalBookings = sortedBookings.length;
  const totalPax = sortedBookings.reduce(
    (sum, b) =>
      sum + (Number(b.membersCount) || (Array.isArray(b.members) ? b.members.length : 1)),
    0
  );
  const totalPackageValue = sortedBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const totalAdvanceReceived = sortedBookings.reduce(
    (sum, b) => sum + Number(b.advancePaid || 0),
    0
  );
  const totalBaakiDue = sortedBookings.reduce((sum, b) => {
    const tot = Number(b.totalAmount || 0);
    const adv = Number(b.advancePaid || 0);
    return sum + Math.max(0, tot - adv);
  }, 0);

  let fullPaidCount = 0;
  let baakiCount = 0;

  const walletTotals: Record<string, number> = {
    'Sahil (Tour)': 0,
    'Rizwan (Tour)': 0,
  };

  sortedBookings.forEach((b) => {
    const tot = Number(b.totalAmount || 0);
    const adv = Number(b.advancePaid || 0);
    const due = Math.max(0, tot - adv);

    if (due === 0 && tot > 0) {
      fullPaidCount++;
    } else {
      baakiCount++;
    }

    if (Array.isArray(b.paymentHistory) && b.paymentHistory.length > 0) {
      b.paymentHistory.forEach((entry) => {
        const w = entry.walletName || b.walletName || 'Rizwan (Tour)';
        walletTotals[w] = (walletTotals[w] || 0) + Number(entry.amount || 0);
      });
    } else if (adv > 0) {
      const w = b.walletName || 'Rizwan (Tour)';
      walletTotals[w] = (walletTotals[w] || 0) + adv;
    }
  });

  // ---------------------------------------------------------
  // 1. MODERN EXECUTIVE HEADER BANNER (A4 PROPORTIONED)
  // ---------------------------------------------------------
  // Dark Navy Header Background
  doc.setFillColor(11, 17, 32); // #0B1120
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Gold Accent Stripe under Header
  doc.setFillColor(245, 158, 11); // #F59E0B Amber/Gold
  doc.rect(0, 30, pageWidth, 1.5, 'F');

  // Brand Title (Left)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SANZARI TOURS & TRAVELS', marginX, 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(251, 191, 36); // Amber Gold
  doc.text('BHUJ (KUTCH)  •  OFFICIAL GROUP BOOKINGS & PAYMENT STATEMENT', marginX, 16.5);

  const modeDesc =
    cfg.membersMode === 'first_person_only'
      ? 'Customer / Lead Person Summary Sheet'
      : cfg.membersMode === 'one_row_per_member'
      ? 'Passenger-Wise Serial Manifest'
      : 'Complete Booking-Wise & Family Members Manifest';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(modeDesc, marginX, 22.5);

  // Group / Folder Title Badge (Right Side)
  const reportTitle = options.batch
    ? `${options.batch.title.toUpperCase()} — ${options.batch.destination.toUpperCase()}`
    : options.title
    ? options.title.toUpperCase()
    : 'ALL CONFIRMED TOUR BOOKINGS';

  const reportSub = options.batch
    ? `Departure: ${formatDisplayDate(options.batch.departureDate)}  |  Mode: ${
        options.batch.travelMode || 'Train'
      }`
    : options.subtitle ||
      options.filterLabel ||
      `Active Bookings: ${totalBookings}  |  Total Travelers: ${totalPax} PAX`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(reportTitle, pageWidth - marginX, 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(reportSub, pageWidth - marginX, 17, { align: 'right' });

  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    pageWidth - marginX,
    22.5,
    { align: 'right' }
  );

  // ---------------------------------------------------------
  // 2. MODERN 4-CARD KPI SUMMARY STRIP
  // ---------------------------------------------------------
  let tableStartY = 36;
  const anyAmountShown = cfg.showTotalAmount || cfg.showAdvanceAmount || cfg.showDueAmount;

  if (cfg.showTopSummaryCards) {
    const boxY = 35;
    const boxHeight = 19;
    const gap = 3;

    if (anyAmountShown) {
      const boxWidth = (contentWidth - gap * 3) / 4;

      // Helper to draw a modern card with top colored accent bar
      const drawModernCard = (
        x: number,
        accentRgb: [number, number, number],
        bgRgb: [number, number, number],
        borderRgb: [number, number, number],
        label: string,
        mainValue: string,
        valueRgb: [number, number, number],
        subText: string
      ) => {
        doc.setFillColor(...bgRgb);
        doc.setDrawColor(...borderRgb);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

        // Top accent bar inside card
        doc.setFillColor(...accentRgb);
        doc.rect(x + 0.5, boxY + 0.5, boxWidth - 1, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 3, boxY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...valueRgb);
        doc.text(mainValue, x + 3, boxY + 12.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(subText, x + 3, boxY + 16.8);
      };

      const sahilAmt = walletTotals['Sahil (Tour)'] || 0;
      const rizwanAmt = walletTotals['Rizwan (Tour)'] || 0;

      // Card 1: Bookings & PAX
      drawModernCard(
        marginX,
        [15, 23, 42],
        [248, 250, 252],
        [203, 213, 225],
        'BOOKINGS & PAX',
        `${totalBookings} Bkgs  |  ${totalPax} PAX`,
        [15, 23, 42],
        `Full Paid: ${fullPaidCount}  •  Due: ${baakiCount}`
      );

      // Card 2: Total Package Value
      drawModernCard(
        marginX + (boxWidth + gap) * 1,
        [37, 99, 235],
        [248, 250, 252],
        [203, 213, 225],
        'TOTAL PACKAGE VALUE',
        cfg.showTotalAmount ? formatRs(totalPackageValue) : '-',
        [15, 23, 42],
        `Across ${totalBookings} confirmed bookings`
      );

      // Card 3: Advance / Received
      drawModernCard(
        marginX + (boxWidth + gap) * 2,
        [16, 185, 129],
        [240, 253, 244],
        [134, 239, 172],
        'ADVANCE / RECEIVED',
        cfg.showAdvanceAmount ? formatRs(totalAdvanceReceived) : '-',
        [4, 120, 87],
        cfg.showAccountAndMode
          ? `Sahil: ${formatRs(sahilAmt)} | Rizwan: ${formatRs(rizwanAmt)}`
          : 'Total Amount Collected'
      );

      // Card 4: Remaining Baaki (Due)
      drawModernCard(
        marginX + (boxWidth + gap) * 3,
        [244, 63, 94],
        [255, 241, 242],
        [253, 164, 175],
        'REMAINING BAAKI (DUE)',
        cfg.showDueAmount ? formatRs(totalBaakiDue) : '-',
        [190, 18, 60],
        baakiCount > 0 ? `Pending from ${baakiCount} booking(s)` : 'All bookings 100% Paid'
      );

      tableStartY = 58;
    } else {
      // Compact Summary Strip when Money is hidden (Hotel / Bus / Tour Manager Sheet)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, boxY, contentWidth, 11, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Total Confirmed Bookings: ${totalBookings}    •    Total Passengers (PAX): ${totalPax}`,
        marginX + 4,
        boxY + 7
      );
      tableStartY = 50;
    }
  }

  // ---------------------------------------------------------
  // 3. BUILD A4-OPTIMIZED COLUMNS & ROWS
  // ---------------------------------------------------------
  // On Portrait A4 (190mm content width), we combine Booking ID + Customer info cleanly so every column has generous breathing room!
  interface ColDef {
    key: string;
    header: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    widthWeight: number;
  }

  const columns: ColDef[] = [
    { key: 'index', header: '#', align: 'center', bold: true, widthWeight: 7 },
  ];

  const hasCustomerCol =
    cfg.showBookingIdAndDate || cfg.showCustomerName || cfg.showCustomerPhone || cfg.showCity;

  if (cfg.membersMode === 'one_row_per_member') {
    columns.push({
      key: 'passengerName',
      header: 'Passenger Name & Berth',
      bold: true,
      widthWeight: 38,
    });
    columns.push({
      key: 'passengerAgeGender',
      header: 'Age / Gender',
      align: 'center',
      widthWeight: 18,
    });
    if (hasCustomerCol) {
      columns.push({
        key: 'customerContact',
        header: 'Customer / Booking Info',
        widthWeight: 36,
      });
    }
  } else {
    if (hasCustomerCol) {
      columns.push({
        key: 'customerContact',
        header:
          cfg.membersMode === 'first_person_only'
            ? 'Customer / 1st Person & Contact'
            : 'Customer & Booking Details',
        bold: true,
        widthWeight: cfg.membersMode === 'first_person_only' ? 48 : 38,
      });
    }

    if (cfg.showPaxCount) {
      columns.push({
        key: 'pax',
        header: 'PAX',
        align: 'center',
        bold: true,
        widthWeight: 11,
      });
    }

    if (cfg.membersMode === 'all_members') {
      columns.push({
        key: 'membersList',
        header: 'Passengers List (Name, Age, Gender)',
        widthWeight: 54,
      });
    } else if (cfg.membersMode === 'first_person_only' && cfg.showSpecialNotes) {
      columns.push({
        key: 'notesOnly',
        header: 'Room / Special Notes',
        widthWeight: 32,
      });
    }
  }

  if (cfg.showTravelClass) {
    columns.push({
      key: 'travelClass',
      header: 'Class / Mode',
      align: 'center',
      widthWeight: 20,
    });
  }

  if (cfg.showTotalAmount) {
    columns.push({
      key: 'totalAmount',
      header: 'Total Package',
      align: 'right',
      bold: true,
      widthWeight: 22,
    });
  }

  if (cfg.showAdvanceAmount) {
    columns.push({
      key: 'advanceAmount',
      header: cfg.showAccountAndMode ? 'Received (Account & Mode)' : 'Advance / Recd',
      align: 'right',
      bold: true,
      widthWeight: cfg.showAccountAndMode ? 28 : 22,
    });
  } else if (cfg.showAccountAndMode) {
    columns.push({
      key: 'accountModeOnly',
      header: 'Account & Mode',
      align: 'center',
      widthWeight: 22,
    });
  }

  if (cfg.showDueAmount) {
    columns.push({
      key: 'dueAmount',
      header: 'Baaki (Due)',
      align: 'right',
      bold: true,
      widthWeight: 22,
    });
  }

  if (cfg.showPaymentStatus) {
    columns.push({
      key: 'paymentStatus',
      header: 'Status',
      align: 'center',
      bold: true,
      widthWeight: 18,
    });
  }

  // Build Body Rows
  const bodyRows: string[][] = [];
  const rowMeta: Array<{ isPaid: boolean; due: number }> = [];

  if (cfg.membersMode === 'one_row_per_member') {
    let pIndex = 1;
    sortedBookings.forEach((b) => {
      const total = Number(b.totalAmount || 0);
      const adv = Number(b.advancePaid || 0);
      const due = Math.max(0, total - adv);
      const isFullPaid = due === 0 && total > 0;

      const members: Array<{
        name: string;
        age?: number | string;
        gender?: string;
        seatBerthPreference?: string;
      }> =
        Array.isArray(b.members) && b.members.length > 0
          ? b.members
          : [{ name: b.customerName, age: 'Adult', gender: '', seatBerthPreference: '' }];

      members.forEach((m, mIdx) => {
        const isFirstInBooking = mIdx === 0;
        const row: string[] = [];

        columns.forEach((col) => {
          switch (col.key) {
            case 'index':
              row.push(String(pIndex++));
              break;
            case 'passengerName': {
              const berth =
                m.seatBerthPreference && m.seatBerthPreference !== 'No Preference'
                  ? ` [${m.seatBerthPreference}]`
                  : '';
              const notesStr =
                isFirstInBooking && cfg.showSpecialNotes && b.specialNotes
                  ? `\nNote: ${b.specialNotes}`
                  : '';
              row.push(`${m.name || '-'}${berth}${notesStr}`);
              break;
            }
            case 'passengerAgeGender': {
              const ageStr = m.age ? `${m.age} yrs` : 'Adult';
              const genStr = m.gender ? ` • ${m.gender.charAt(0).toUpperCase()}` : '';
              row.push(`${ageStr}${genStr}`);
              break;
            }
            case 'customerContact': {
              const parts: string[] = [];
              if (cfg.showCustomerName) parts.push(b.customerName || '-');
              if (cfg.showCustomerPhone && b.customerPhone) parts.push(`Ph: ${b.customerPhone}`);
              if (cfg.showBookingIdAndDate) {
                parts.push(`${b.bookingNumber || ''} • ${formatDisplayDate(b.tourDate)}`);
              }
              row.push(parts.join('\n') || '-');
              break;
            }
            case 'travelClass':
              row.push(`${b.travelClass || 'Train'}`);
              break;
            case 'totalAmount':
              row.push(isFirstInBooking ? formatRs(total) : '-');
              break;
            case 'advanceAmount': {
              if (!isFirstInBooking) {
                row.push('-');
              } else {
                const walletLabel = (b.walletName || 'Rizwan (Tour)').replace(' (Tour)', '');
                const modeLabel = b.paymentMode || 'UPI';
                row.push(
                  cfg.showAccountAndMode
                    ? `${formatRs(adv)}\n[${walletLabel} • ${modeLabel}]`
                    : formatRs(adv)
                );
              }
              break;
            }
            case 'accountModeOnly': {
              const walletLabel = (b.walletName || 'Rizwan (Tour)').replace(' (Tour)', '');
              const modeLabel = b.paymentMode || 'UPI';
              row.push(isFirstInBooking ? `${walletLabel} (${modeLabel})` : '-');
              break;
            }
            case 'dueAmount':
              row.push(isFirstInBooking ? (due === 0 ? 'Rs. 0' : formatRs(due)) : '-');
              break;
            case 'paymentStatus':
              row.push(isFirstInBooking ? (isFullPaid ? 'FULL PAID' : 'DUE') : '-');
              break;
            default:
              row.push('-');
          }
        });

        bodyRows.push(row);
        rowMeta.push({ isPaid: isFullPaid, due });
      });
    });
  } else {
    // Booking-wise rows ('all_members' or 'first_person_only')
    sortedBookings.forEach((b, idx) => {
      const total = Number(b.totalAmount || 0);
      const adv = Number(b.advancePaid || 0);
      const due = Math.max(0, total - adv);
      const isFullPaid = due === 0 && total > 0;
      const paxCount =
        Number(b.membersCount) || (Array.isArray(b.members) ? b.members.length : 1);

      const firstMemberName =
        Array.isArray(b.members) && b.members.length > 0 ? b.members[0].name : b.customerName;

      const memberLines =
        Array.isArray(b.members) && b.members.length > 0
          ? b.members
              .map((m, i) => {
                const ageStr = m.age ? `${m.age}y` : 'Ad';
                const genStr = m.gender ? m.gender.charAt(0).toUpperCase() : '';
                const berthStr =
                  m.seatBerthPreference && m.seatBerthPreference !== 'No Preference'
                    ? ` [${m.seatBerthPreference}]`
                    : '';
                return `${i + 1}. ${m.name} (${ageStr}${genStr ? `, ${genStr}` : ''})${berthStr}`;
              })
              .join('\n')
          : `1. ${b.customerName}`;

      const notesLine =
        cfg.showSpecialNotes && b.specialNotes ? `\nNote: ${b.specialNotes}` : '';

      // Payment & wallet info (Account + Payment Mode)
      const walletLabel = (b.walletName || 'Rizwan (Tour)').replace(' (Tour)', '');
      const modeLabel = b.paymentMode || 'UPI';
      const instList = Array.isArray(b.paymentHistory) ? b.paymentHistory : [];

      let receivedSub = formatRs(adv);
      if (cfg.showAccountAndMode) {
        if (instList.length > 1) {
          const instBreakdown = instList
            .map(
              (p, idxNum) =>
                `${idxNum + 1}) ${formatRs(p.amount)} [${(p.walletName || walletLabel).replace(
                  ' (Tour)',
                  ''
                )}-${p.paymentMode || modeLabel}]`
            )
            .join('\n');
          receivedSub = `${formatRs(adv)}\n${instBreakdown}`;
        } else if (instList.length === 1) {
          const p = instList[0];
          receivedSub = `${formatRs(adv)}\n[${(p.walletName || walletLabel).replace(
            ' (Tour)',
            ''
          )} • ${p.paymentMode || modeLabel}]`;
        } else {
          receivedSub = `${formatRs(adv)}\n[${walletLabel} • ${modeLabel}]`;
        }
      }

      const statusLabel = isFullPaid
        ? 'FULL PAID'
        : adv > 0
        ? `DUE\n(${Math.round((adv / Math.max(1, total)) * 100)}% Paid)`
        : 'UNPAID';

      const row: string[] = [];
      columns.forEach((col) => {
        switch (col.key) {
          case 'index':
            row.push(String(idx + 1));
            break;
          case 'customerContact': {
            const lines: string[] = [];
            if (cfg.showCustomerName) {
              const displayName =
                cfg.membersMode === 'first_person_only' &&
                firstMemberName &&
                firstMemberName.toLowerCase() !== (b.customerName || '').toLowerCase()
                  ? `${b.customerName} (${firstMemberName})`
                  : b.customerName || '-';
              lines.push(displayName);
            }
            if (cfg.showCustomerPhone && b.customerPhone) {
              lines.push(`Ph: ${b.customerPhone}${cfg.showCity && b.city ? ` • ${b.city}` : ''}`);
            } else if (cfg.showCity && b.city) {
              lines.push(`City: ${b.city}`);
            }
            if (cfg.showBookingIdAndDate) {
              lines.push(`${b.bookingNumber || '-'}  •  ${formatDisplayDate(b.tourDate)}`);
            }
            row.push(lines.join('\n') || '-');
            break;
          }
          case 'pax':
            row.push(`${paxCount}`);
            break;
          case 'membersList':
            row.push(`${memberLines}${notesLine}`);
            break;
          case 'notesOnly':
            row.push(b.specialNotes || '-');
            break;
          case 'travelClass':
            row.push(`${b.travelClass || 'Train'}`);
            break;
          case 'totalAmount':
            row.push(formatRs(total));
            break;
          case 'advanceAmount':
            row.push(receivedSub);
            break;
          case 'accountModeOnly':
            row.push(`${walletLabel}\n(${modeLabel})`);
            break;
          case 'dueAmount':
            row.push(due === 0 ? 'Rs. 0' : formatRs(due));
            break;
          case 'paymentStatus':
            row.push(statusLabel);
            break;
          default:
            row.push('-');
        }
      });

      bodyRows.push(row);
      rowMeta.push({ isPaid: isFullPaid, due });
    });
  }

  // Build Footer Row
  const footRow: string[] = columns.map((col, idx) => {
    if (idx === 0) return '';
    if (idx === 1) return `GRAND TOTAL (${totalBookings} Bookings)`;
    switch (col.key) {
      case 'pax':
        return `${totalPax} PAX`;
      case 'membersList':
        return `Total Travelers: ${totalPax} PAX   •   Paid: ${fullPaidCount}   •   Due: ${baakiCount}`;
      case 'totalAmount':
        return formatRs(totalPackageValue);
      case 'advanceAmount':
        return formatRs(totalAdvanceReceived);
      case 'dueAmount':
        return formatRs(totalBaakiDue);
      case 'paymentStatus':
        return totalBaakiDue === 0 ? 'ALL PAID' : 'DUE';
      default:
        return '';
    }
  });

  // Calculate Proportional Column Widths to fit 100% of contentWidth (190mm on A4 Portrait)
  const totalWeight = columns.reduce((sum, c) => sum + c.widthWeight, 0);
  const columnStyles: Record<number, any> = {};
  columns.forEach((col, i) => {
    const colWidth = Math.floor((col.widthWeight / totalWeight) * contentWidth * 10) / 10;
    columnStyles[i] = {
      cellWidth: colWidth,
      halign: col.align || 'left',
      fontStyle: col.bold ? 'bold' : 'normal',
    };
    if (col.key === 'advanceAmount') {
      columnStyles[i].textColor = [4, 120, 87];
    }
  });

  const dueColIdx = columns.findIndex((c) => c.key === 'dueAmount');
  const advColIdx = columns.findIndex((c) => c.key === 'advanceAmount');
  const statusColIdx = columns.findIndex((c) => c.key === 'paymentStatus');

  autoTable(doc, {
    startY: tableStartY,
    head: [columns.map((c) => c.header)],
    body: bodyRows,
    foot: [footRow],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: cfg.orientation === 'portrait' && columns.length >= 7 ? 7.6 : 8.4,
      cellPadding: 2.4,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.25,
      valign: 'middle',
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: cfg.orientation === 'portrait' && columns.length >= 7 ? 7.8 : 8.5,
      cellPadding: 2.8,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.2,
      lineColor: [15, 23, 42],
      lineWidth: 0.35,
      cellPadding: 2.8,
    },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'head') {
        const col = columns[data.column.index];
        if (col?.align) {
          data.cell.styles.halign = col.align;
        }
      }
      if (data.section === 'body') {
        const meta = rowMeta[data.row.index];
        if (meta) {
          if (data.column.index === dueColIdx) {
            data.cell.styles.textColor = meta.isPaid ? [4, 120, 87] : [190, 18, 60];
          }
          if (data.column.index === statusColIdx) {
            if (meta.isPaid) {
              data.cell.styles.fillColor = [209, 250, 229];
              data.cell.styles.textColor = [6, 95, 70];
            } else {
              data.cell.styles.fillColor = [255, 228, 230];
              data.cell.styles.textColor = [159, 18, 57];
            }
          }
        }
      }
      if (data.section === 'foot') {
        const col = columns[data.column.index];
        if (col?.align) {
          data.cell.styles.halign = col.align;
        }
        if (data.column.index === advColIdx) {
          data.cell.styles.textColor = [4, 120, 87];
        }
        if (data.column.index === dueColIdx) {
          data.cell.styles.textColor = totalBaakiDue > 0 ? [190, 18, 60] : [4, 120, 87];
        }
      }
    },
    margin: { left: marginX, right: marginX, bottom: 16 },
  });

  // ---------------------------------------------------------
  // 4. MODERN PAGE FOOTER ON ALL A4 PAGES
  // ---------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `SANZARI TOURS & TRAVELS  •  ${reportTitle}`,
      marginX,
      pageHeight - 5.5
    );
    doc.setFont('helvetica', 'normal');
    doc.text(
      `A4 Official Manifest  |  Page ${i} of ${pageCount}`,
      pageWidth - marginX,
      pageHeight - 5.5,
      { align: 'right' }
    );
  }

  const rawName = options.batch
    ? `Sanzari_Group_${options.batch.title}_${options.batch.destination}`
    : options.title
    ? `Sanzari_${options.title}`
    : `Sanzari_Tour_Bookings_List`;
  const cleanFileName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  const dateSuffix = new Date().toISOString().slice(0, 10);

  doc.save(`${cleanFileName}_${dateSuffix}.pdf`);
};
