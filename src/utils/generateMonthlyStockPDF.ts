import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, StockMovement, StoreSettings } from '../types';

interface StockReportPDFData {
  products: Product[];
  stockMovements: StockMovement[];
  settings: StoreSettings;
  selectedMonth: string; // e.g. "2026-10" or "October 2026"
  formatCurrency: (amount: number) => string;
}

export const generateMonthlyStockPDF = ({
  products,
  stockMovements,
  settings,
  selectedMonth,
  formatCurrency,
}: StockReportPDFData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Month Display Title
  const monthDate = new Date(`${selectedMonth}-01T00:00:00`);
  const monthTitle = isNaN(monthDate.getTime())
    ? selectedMonth
    : monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const generatedDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Calculate Summary
  const totalItems = products.length;
  const totalValuation = products.reduce(
    (sum, p) => sum + (p.currentStock || 0) * (p.purchaseCost || 0),
    0
  );
  const lowStockCount = products.filter((p) => p.currentStock <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  // Filter movements for selected month
  const monthMovements = stockMovements.filter((m) => {
    if (!m.date) return false;
    return m.date.startsWith(selectedMonth);
  });

  // 1. Header & Branding
  doc.setFillColor(15, 23, 42); // Dark slate bg
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(settings.businessName || 'SANZARI ACCOUNTS', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('MONTHLY STOCK & INVENTORY VALUATION REPORT', 14, 22);
  doc.text(`Report Period: ${monthTitle.toUpperCase()}`, 14, 28);

  doc.setFontSize(8);
  doc.text(`Generated: ${generatedDate}`, 196, 28, { align: 'right' });

  // 2. Executive KPI Cards Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 26, 3, 3, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  doc.text('TOTAL PRODUCTS', 22, 50);
  doc.text('TOTAL STOCK VALUE', 72, 50);
  doc.text('LOW STOCK ITEMS', 128, 50);
  doc.text('OUT OF STOCK', 168, 50);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');

  doc.text(`${totalItems} Items`, 22, 60);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`Rs. ${totalValuation.toLocaleString('en-IN')}`, 72, 60);

  doc.setTextColor(217, 119, 6); // Amber
  doc.text(`${lowStockCount} Items`, 128, 60);

  doc.setTextColor(225, 29, 72); // Rose
  doc.text(`${outOfStockCount} Items`, 168, 60);

  // 3. Inventory Table Section Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Inventory & Valuation List', 14, 76);

  // Prepare table rows
  const tableData = products.map((p, index) => {
    const valuation = (p.currentStock || 0) * (p.purchaseCost || 0);
    const status =
      p.currentStock <= 0
        ? 'OUT OF STOCK'
        : p.currentStock <= p.lowStockThreshold
        ? 'LOW STOCK'
        : 'IN STOCK';

    return [
      (index + 1).toString(),
      p.name,
      p.category || 'General',
      `${p.currentStock} ${p.unit}`,
      `Rs. ${p.purchaseCost || 0}`,
      `Rs. ${p.sellingPrice || 0}`,
      `Rs. ${valuation.toLocaleString('en-IN')}`,
      status,
    ];
  });

  // Render Table via autoTable
  autoTable(doc, {
    startY: 80,
    head: [
      [
        '#',
        'Product Name',
        'Category',
        'Current Stock',
        'Cost Rate',
        'Sell Rate',
        'Stock Valuation',
        'Status',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 24, fontStyle: 'bold' },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 26, fontStyle: 'bold', halign: 'right' },
      7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
    foot: [
      [
        '',
        'GRAND TOTAL VALUATION',
        '',
        '',
        '',
        '',
        `Rs. ${totalValuation.toLocaleString('en-IN')}`,
        '',
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
    },
    didParseCell: (data) => {
      // Colorize Status column
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'OUT OF STOCK') {
          data.cell.styles.textColor = [225, 29, 72];
        } else if (data.cell.raw === 'LOW STOCK') {
          data.cell.styles.textColor = [217, 119, 6];
        } else {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    },
  });

  // Footer Branding on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Sanzari Accounts • Confidential Monthly Stock Report • Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `Stock_Report_${monthTitle.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};
