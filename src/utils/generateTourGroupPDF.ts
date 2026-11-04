import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TourBooking, TourBatch } from '../types';

export type MembersDisplayMode = 'all_members' | 'first_person_only' | 'one_row_per_member';
export type AmountDisplayPreset = 'all_amounts' | 'due_only' | 'advance_only' | 'advance_and_due' | 'no_amounts';

export interface TourPDFCustomConfig {
  // Header & Metadata
  title?: string;
  subtitle?: string;
  batch?: TourBatch | null;
  filterLabel?: string;
  orientation?: 'landscape' | 'portrait';

  // Booking Status Filter inside generator (optional)
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
  orientation: 'landscape',
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

  // Filter bookings by paymentFilter if requested
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

  const doc = new jsPDF({
    orientation: cfg.orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Compute Summary Metrics
  const totalBookings = sortedBookings.length;
  const totalPax = sortedBookings.reduce(
    (sum, b) => sum + (Number(b.membersCount) || (Array.isArray(b.members) ? b.members.length : 1)),
    0
  );
  const totalPackageValue = sortedBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const totalAdvanceReceived = sortedBookings.reduce((sum, b) => sum + Number(b.advancePaid || 0), 0);
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
  // 1. TOP HEADER BANNER
  // ---------------------------------------------------------
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SANZARI TOURS & TRAVELS', 12, 11);

  const modeDesc =
    cfg.membersMode === 'first_person_only'
      ? 'Customer / Lead Person Summary List'
      : cfg.membersMode === 'one_row_per_member'
      ? 'Individual Passenger-Wise Manifest'
      : 'Group Bookings & All Passengers Manifest';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(modeDesc, 12, 17.5);

  const reportTitle = options.batch
    ? `GROUP: ${options.batch.title.toUpperCase()} (${options.batch.destination.toUpperCase()})`
    : options.title
    ? options.title.toUpperCase()
    : 'CONFIRMED TOUR BOOKINGS LIST';

  const reportSub = options.batch
    ? `Departure: ${formatDisplayDate(options.batch.departureDate)}  |  ${totalBookings} Bookings (${totalPax} PAX)`
    : options.subtitle ||
      options.filterLabel ||
      `${totalBookings} Bookings  |  ${totalPax} Passengers (PAX)`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(250, 204, 21);
  doc.text(reportTitle, pageWidth - 12, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(reportSub, pageWidth - 12, 17, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Printed: ${new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    pageWidth - 12,
    22.5,
    { align: 'right' }
  );

  // ---------------------------------------------------------
  // 2. KPI SUMMARY BOXES (Optional)
  // ---------------------------------------------------------
  let tableStartY = 31;
  const anyAmountShown = cfg.showTotalAmount || cfg.showAdvanceAmount || cfg.showDueAmount;

  if (cfg.showTopSummaryCards) {
    const boxY = 30;
    const boxHeight = 18;
    const gap = 3.5;
    const availableWidth = pageWidth - 24;

    if (anyAmountShown) {
      const boxWidth = (availableWidth - gap * 3) / 4;

      // Box 1: Bookings & PAX
      const x1 = 12;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.roundedRect(x1, boxY, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('BOOKINGS & TRAVELERS', x1 + 3.5, boxY + 5.5);
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${totalBookings} Bookings | ${totalPax} PAX`, x1 + 3.5, boxY + 12.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Paid: ${fullPaidCount}  •  Due: ${baakiCount}`, x1 + 3.5, boxY + 16.5);

      // Box 2: Total Package
      const x2 = x1 + boxWidth + gap;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x2, boxY, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL PACKAGE AMOUNT', x2 + 3.5, boxY + 5.5);
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cfg.showTotalAmount ? formatRs(totalPackageValue) : '-', x2 + 3.5, boxY + 12.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Booked Package Value`, x2 + 3.5, boxY + 16.5);

      // Box 3: Advance / Received
      const x3 = x2 + boxWidth + gap;
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(x3, boxY, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(6, 95, 70);
      doc.text('ADVANCE / RECEIVED', x3 + 3.5, boxY + 5.5);
      doc.setFontSize(11.5);
      doc.setTextColor(4, 120, 87);
      doc.text(cfg.showAdvanceAmount ? formatRs(totalAdvanceReceived) : '-', x3 + 3.5, boxY + 12.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(6, 95, 70);
      const sahilAmt = walletTotals['Sahil (Tour)'] || 0;
      const rizwanAmt = walletTotals['Rizwan (Tour)'] || 0;
      doc.text(
        cfg.showAccountAndMode
          ? `Sahil: ${formatRs(sahilAmt)} | Rizwan: ${formatRs(rizwanAmt)}`
          : 'Total Payment Received',
        x3 + 3.5,
        boxY + 16.5
      );

      // Box 4: Remaining Baaki (Due)
      const x4 = x3 + boxWidth + gap;
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(244, 63, 94);
      doc.roundedRect(x4, boxY, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(159, 18, 57);
      doc.text('REMAINING BAAKI (DUE)', x4 + 3.5, boxY + 5.5);
      doc.setFontSize(11.5);
      doc.setTextColor(190, 18, 60);
      doc.text(cfg.showDueAmount ? formatRs(totalBaakiDue) : '-', x4 + 3.5, boxY + 12.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(159, 18, 57);
      doc.text(
        baakiCount > 0 ? `Pending from ${baakiCount} booking(s)` : 'All bookings Full Paid',
        x4 + 3.5,
        boxY + 16.5
      );
    } else {
      // No-amount summary bar (For Hotel / Tour Manager / Bus Sheet)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(12, boxY, availableWidth, 12, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Total Confirmed Bookings: ${totalBookings}   |   Total Passengers (PAX): ${totalPax}`,
        16,
        boxY + 7.5
      );
      tableStartY = 46;
    }

    if (anyAmountShown) {
      tableStartY = 52;
    }
  }

  // ---------------------------------------------------------
  // 3. BUILD DYNAMIC COLUMNS & ROWS
  // ---------------------------------------------------------
  interface ColDef {
    key: string;
    header: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
  }

  const columns: ColDef[] = [{ key: 'index', header: '#', align: 'center', bold: true }];

  if (cfg.showBookingIdAndDate) {
    columns.push({ key: 'bookingInfo', header: 'Booking ID & Date', bold: true });
  }

  if (cfg.membersMode === 'one_row_per_member') {
    columns.push({ key: 'passengerName', header: 'Passenger Name', bold: true });
    columns.push({ key: 'passengerAgeGender', header: 'Age / Gender', align: 'center' });
    if (cfg.showCustomerName || cfg.showCustomerPhone || cfg.showCity) {
      columns.push({ key: 'customerContact', header: 'Booked By (Main Customer)' });
    }
  } else {
    if (cfg.showCustomerName || cfg.showCustomerPhone || cfg.showCity) {
      const custHeader =
        cfg.membersMode === 'first_person_only'
          ? 'Main Customer / First Person'
          : 'Customer & Contact';
      columns.push({ key: 'customerContact', header: custHeader, bold: true });
    }

    if (cfg.showPaxCount) {
      columns.push({ key: 'pax', header: 'PAX', align: 'center', bold: true });
    }

    if (cfg.membersMode === 'all_members') {
      columns.push({
        key: 'membersList',
        header: 'All Members (Name, Age, Gender)',
      });
    } else if (cfg.membersMode === 'first_person_only' && cfg.showSpecialNotes) {
      columns.push({
        key: 'notesOnly',
        header: 'Room / Special Notes',
      });
    }
  }

  if (cfg.showTravelClass) {
    columns.push({ key: 'travelClass', header: 'Travel Mode' });
  }

  if (cfg.showTotalAmount) {
    columns.push({ key: 'totalAmount', header: 'Total Amount', align: 'right', bold: true });
  }

  if (cfg.showAdvanceAmount) {
    columns.push({
      key: 'advanceAmount',
      header: cfg.showAccountAndMode ? 'Advance / Recd (Account & Mode)' : 'Advance / Recd',
      align: 'right',
      bold: true,
    });
  } else if (cfg.showAccountAndMode) {
    columns.push({
      key: 'accountModeOnly',
      header: 'Account & Mode',
      align: 'center',
    });
  }

  if (cfg.showDueAmount) {
    columns.push({ key: 'dueAmount', header: 'Baaki (Due)', align: 'right', bold: true });
  }

  if (cfg.showPaymentStatus) {
    columns.push({ key: 'paymentStatus', header: 'Status', align: 'center', bold: true });
  }

  // Build Body Rows
  const bodyRows: string[][] = [];
  // Track row metadata for coloring Due / Status cells
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
            case 'bookingInfo':
              row.push(`${b.bookingNumber || '-'}\n${formatDisplayDate(b.tourDate)}`);
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
              const genStr = m.gender ? ` • ${m.gender}` : '';
              row.push(`${ageStr}${genStr}`);
              break;
            }
            case 'customerContact': {
              const parts: string[] = [];
              if (cfg.showCustomerName) parts.push(b.customerName || '-');
              if (cfg.showCustomerPhone && b.customerPhone) parts.push(`Ph: ${b.customerPhone}`);
              if (cfg.showCity && b.city) parts.push(`City: ${b.city}`);
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
                    ? `${formatRs(adv)}\n(${walletLabel} • ${modeLabel})`
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
              row.push(
                isFirstInBooking ? (isFullPaid ? 'FULL PAID' : 'BAAKI DUE') : '"'
              );
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
      const paxCount = Number(b.membersCount) || (Array.isArray(b.members) ? b.members.length : 1);

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

      const notesLine = cfg.showSpecialNotes && b.specialNotes ? `\nNote: ${b.specialNotes}` : '';

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
                `${idxNum + 1}) ${formatRs(p.amount)} [${(p.walletName || walletLabel).replace(' (Tour)', '')}-${p.paymentMode || modeLabel}]`
            )
            .join('\n');
          receivedSub = `${formatRs(adv)}\n${instBreakdown}`;
        } else if (instList.length === 1) {
          const p = instList[0];
          receivedSub = `${formatRs(adv)}\n(${(p.walletName || walletLabel).replace(' (Tour)', '')} • ${p.paymentMode || modeLabel})`;
        } else {
          receivedSub = `${formatRs(adv)}\n(${walletLabel} • ${modeLabel})`;
        }
      }

      const statusLabel = isFullPaid
        ? 'FULL PAID\n(Rs. 0 Due)'
        : adv > 0
        ? `BAAKI DUE\n(${Math.round((adv / Math.max(1, total)) * 100)}% Paid)`
        : 'UNPAID DUE';

      const row: string[] = [];
      columns.forEach((col) => {
        switch (col.key) {
          case 'index':
            row.push(String(idx + 1));
            break;
          case 'bookingInfo':
            row.push(
              `${b.bookingNumber || '-'}\n${formatDisplayDate(b.tourDate)}${
                b.destination ? `\n${b.destination}` : ''
              }`
            );
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
              lines.push(`Ph: ${b.customerPhone}`);
            }
            if (cfg.showCity && b.city) {
              lines.push(`City: ${b.city}`);
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
            row.push(`${b.travelClass || 'Train'}\n(${b.tourType || 'Group'})`);
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
    if (idx === 1) return 'GRAND TOTAL';
    switch (col.key) {
      case 'customerContact':
        return `${totalBookings} Bookings`;
      case 'pax':
        return `${totalPax} PAX`;
      case 'membersList':
        return `Total Travelers: ${totalPax} PAX  |  Full Paid: ${fullPaidCount}  |  Baaki Due: ${baakiCount}`;
      case 'totalAmount':
        return formatRs(totalPackageValue);
      case 'advanceAmount':
        return formatRs(totalAdvanceReceived);
      case 'dueAmount':
        return formatRs(totalBaakiDue);
      case 'paymentStatus':
        return totalBaakiDue === 0 ? 'ALL PAID' : 'DUE PENDING';
      default:
        return '';
    }
  });

  // Dynamic Column Styles
  const columnStyles: Record<number, any> = {};
  columns.forEach((col, i) => {
    columnStyles[i] = {
      halign: col.align || 'left',
      fontStyle: col.bold ? 'bold' : 'normal',
    };
    if (col.key === 'index') {
      columnStyles[i].cellWidth = 9;
    } else if (col.key === 'pax') {
      columnStyles[i].cellWidth = 13;
    } else if (col.key === 'Advance' || col.key === 'advanceAmount') {
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
      fontSize: columns.length > 8 ? 8 : 8.8,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: columns.length > 8 ? 8.2 : 9,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: [15, 23, 42],
      lineWidth: 0.35,
    },
    columnStyles,
    didParseCell: (data) => {
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
    margin: { left: 12, right: 12, bottom: 14 },
  });

  // ---------------------------------------------------------
  // 4. PAGE FOOTER
  // ---------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `SANZARI TOURS & TRAVELS  •  ${reportTitle} (${modeDesc})`,
      12,
      pageHeight - 5.5
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 12, pageHeight - 5.5, { align: 'right' });
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
