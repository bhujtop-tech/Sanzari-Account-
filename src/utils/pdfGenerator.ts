import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Customer, Product, Expense, Wallet, StoreSettings } from '../types';

export interface PdfExportOptions {
  docType: 'invoice' | 'ledger' | 'stock' | 'pnl';
  // Branding
  includeHeaderBanner: boolean;
  includeBusinessAddress: boolean;
  includeGSTIN: boolean;
  // Customer & Ledger
  includeCustomerInfo: boolean;
  includePreviousBalance: boolean;
  // Columns
  includeCostPrice: boolean; // Hide cost prices when printing for customers!
  includeItemDiscounts: boolean;
  includePaymentMethod: boolean;
  // Footer
  includePaymentQR: boolean;
  includeSignature: boolean;
  includeTerms: boolean;
  customTermsText?: string;
  // Data targets
  sale?: Sale;
  customer?: Customer;
  customerSales?: Sale[];
  products?: Product[];
  expenses?: Expense[];
  wallets?: Wallet[];
  selectedMonth?: string;
  settings: StoreSettings;
}

export const generateCustomPdf = (options: PdfExportOptions) => {
  const {
    docType,
    includeHeaderBanner,
    includeBusinessAddress,
    includeGSTIN,
    includeCustomerInfo,
    includePreviousBalance,
    includeCostPrice,
    includePaymentMethod,
    includePaymentQR,
    includeSignature,
    includeTerms,
    customTermsText = 'Goods once sold will not be taken back or exchanged. E&OE.',
    sale,
    customer,
    customerSales = [],
    products = [],
    expenses = [],
    selectedMonth = new Date().toISOString().substring(0, 7),
    settings,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const generatedDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let startY = 15;

  // ----------------------------------------------------
  // 1. BRANDING HEADER (Top Section)
  // ----------------------------------------------------
  if (includeHeaderBanner) {
    doc.setFillColor(15, 23, 42); // Dark slate
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text((settings.businessName || 'SANZARI ACCOUNTS').toUpperCase(), 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);

    let headerSub = 'FINANCIAL & STORE MANAGEMENT REPORT';
    if (docType === 'invoice') headerSub = 'TAX SALES INVOICE / RECEIPT';
    if (docType === 'ledger') headerSub = 'CUSTOMER KHATA & LEDGER STATEMENT';
    if (docType === 'stock') headerSub = 'INVENTORY & STOCK VALUATION REPORT';
    if (docType === 'pnl') headerSub = 'MONTHLY PROFIT & LOSS STATEMENT';

    doc.text(headerSub, 14, 22);

    if (includeBusinessAddress && (settings.address || settings.phone)) {
      doc.setFontSize(8);
      const addrStr = [settings.address, settings.phone ? `Ph: ${settings.phone}` : '']
        .filter(Boolean)
        .join(' | ');
      doc.text(addrStr, 14, 28);
    }

    doc.setFontSize(8);
    doc.text(`Generated: ${generatedDate}`, 196, 28, { align: 'right' });

    startY = 44;
  } else {
    // Minimal Header
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.businessName || 'SANZARI STORE', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${generatedDate}`, 196, 16, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 20, 196, 20);
    startY = 26;
  }

  // GSTIN / Tax No
  if (includeGSTIN && settings.taxNumber) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`GSTIN / TAX ID: ${settings.taxNumber}`, 14, startY);
    startY += 6;
  }

  // ----------------------------------------------------
  // 2. DOCUMENT SPECIFIC CONTENT
  // ----------------------------------------------------

  // === TYPE A: SALES INVOICE PDF ===
  if (docType === 'invoice' && sale) {
    // Invoice Meta Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, 182, 22, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice No: ${sale.saleNumber}`, 20, startY + 8);
    doc.text(`Date: ${sale.date}`, 20, startY + 15);

    if (includeCustomerInfo) {
      doc.text(`Customer: ${sale.customerName}`, 110, startY + 8);
      doc.text(`Status: ${sale.paymentStatus.toUpperCase()}`, 110, startY + 15);
    }

    startY += 28;

    // Items Table
    const tableBody = (sale.items || []).map((item, idx) => {
      const row = [
        (idx + 1).toString(),
        item.productName,
        `${item.quantity} ${item.unit}`,
        `Rs. ${item.sellingPrice}`,
      ];

      if (includeCostPrice) {
        row.push(`Rs. ${item.purchaseCost || 0}`);
      }

      row.push(`Rs. ${item.lineTotal}`);
      return row;
    });

    const tableHead = ['#', 'Item Description', 'Qty / Unit', 'Selling Price'];
    if (includeCostPrice) tableHead.push('Cost Rate');
    tableHead.push('Total (Rs.)');

    autoTable(doc, {
      startY,
      head: [tableHead],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    // Invoice Summary Box
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Bill Amount: Rs. ${sale.total.toLocaleString('en-IN')}`, 140, startY);
    doc.text(`Paid Amount: Rs. ${sale.paidAmount.toLocaleString('en-IN')}`, 140, startY + 6);

    if (sale.pendingAmount > 0) {
      doc.setTextColor(225, 29, 72); // Rose
      doc.text(`Pending Due: Rs. ${sale.pendingAmount.toLocaleString('en-IN')}`, 140, startY + 12);
    } else {
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`Payment Cleared`, 140, startY + 12);
    }

    if (includePreviousBalance && customer) {
      startY += 18;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Customer Total Remaining Balance: Rs. ${customer.pendingBalance.toLocaleString('en-IN')}`, 14, startY);
    }
  }

  // === TYPE B: CUSTOMER KHATA LEDGER PDF ===
  if (docType === 'ledger' && customer) {
    // Customer Info Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, startY, 182, 22, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Customer: ${customer.name}`, 20, startY + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Phone: ${customer.phone || 'N/A'} | City: ${customer.city || 'N/A'}`, 20, startY + 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72);
    doc.text(`Net Pending Due: Rs. ${customer.pendingBalance.toLocaleString('en-IN')}`, 120, startY + 12);

    startY += 28;

    // Customer Ledger Table
    const ledgerRows = customerSales.map((s, idx) => [
      (idx + 1).toString(),
      s.saleNumber,
      s.date,
      `Rs. ${s.total.toLocaleString('en-IN')}`,
      `Rs. ${s.paidAmount.toLocaleString('en-IN')}`,
      `Rs. ${s.pendingAmount.toLocaleString('en-IN')}`,
      s.paymentStatus,
    ]);

    autoTable(doc, {
      startY,
      head: [['#', 'Invoice #', 'Date', 'Total Bill', 'Paid Amount', 'Pending Due', 'Status']],
      body: ledgerRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  // === TYPE C: STOCK INVENTORY PDF ===
  if (docType === 'stock') {
    const totalValuation = products.reduce((s, p) => s + (p.currentStock || 0) * (p.purchaseCost || 0), 0);

    const stockRows = products.map((p, idx) => {
      const row = [
        (idx + 1).toString(),
        p.name,
        p.category || 'General',
        `${p.currentStock} ${p.unit}`,
      ];

      if (includeCostPrice) {
        row.push(`Rs. ${p.purchaseCost || 0}`);
      }

      row.push(`Rs. ${p.sellingPrice || 0}`);

      if (includeCostPrice) {
        row.push(`Rs. ${((p.currentStock || 0) * (p.purchaseCost || 0)).toLocaleString('en-IN')}`);
      }

      row.push(
        p.currentStock <= 0
          ? 'OUT OF STOCK'
          : p.currentStock <= p.lowStockThreshold
          ? 'LOW STOCK'
          : 'IN STOCK'
      );

      return row;
    });

    const stockHead = ['#', 'Product Name', 'Category', 'Stock Qty'];
    if (includeCostPrice) stockHead.push('Cost Rate');
    stockHead.push('Selling Rate');
    if (includeCostPrice) stockHead.push('Valuation');
    stockHead.push('Status');

    autoTable(doc, {
      startY,
      head: [stockHead],
      body: stockRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    if (includeCostPrice) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`TOTAL INVENTORY VALUATION: Rs. ${totalValuation.toLocaleString('en-IN')}`, 14, startY);
      startY += 10;
    }
  }

  // ----------------------------------------------------
  // 3. FOOTER, QR CODE & SIGNATURE (Bottom Section)
  // ----------------------------------------------------
  if (startY < 240) {
    startY = 240;
  }

  // Terms & Conditions
  if (includeTerms && customTermsText) {
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS:', 14, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(customTermsText, 14, startY + 4);
  }

  // === TYPE D: MONTHLY PROFIT & LOSS AUDIT PDF ===
  if (docType === 'pnl') {
    const monthSales = (customerSales.length ? customerSales : sale ? [sale] : []); // fallback
    const monthSalesTotal = monthSales.reduce((s, item) => s + (item.total || 0), 0);

    let totalCogs = 0;
    products.forEach((p) => {
      // estimated or actual
    });

    // P&L Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, 182, 32, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`FINANCIAL STATEMENT FOR: ${selectedMonth}`, 20, startY + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Sales Revenue: Rs. ${monthSalesTotal.toLocaleString('en-IN')}`, 20, startY + 16);
    doc.text(`Total Operating Expenses: Rs. ${expenses.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString('en-IN')}`, 20, startY + 22);

    startY += 38;

    // Expense Categories Breakdown
    const expRows = expenses.map((e, idx) => [
      (idx + 1).toString(),
      e.date,
      e.category,
      e.description || 'General',
      `Rs. ${e.amount.toLocaleString('en-IN')}`,
    ]);

    autoTable(doc, {
      startY,
      head: [['#', 'Date', 'Category', 'Description', 'Amount']],
      body: expRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Signature Block
  if (includeSignature) {
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('For ' + (settings.businessName || 'Sanzari Accounts'), 150, startY);
    doc.line(145, startY + 16, 195, startY + 16);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', 155, startY + 20);
  }

  // Save / Print PDF
  const filename = `${docType.toUpperCase()}_Report_${new Date().toISOString().substring(0, 10)}.pdf`;
  doc.save(filename);
};
