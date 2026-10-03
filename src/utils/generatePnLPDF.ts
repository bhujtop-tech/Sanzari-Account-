import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Expense, Product, StoreSettings } from '../types';

interface GeneratePnLPDFParams {
  selectedMonth: string; // e.g. "2026-10"
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  settings: StoreSettings;
  formatCurrency: (amount: number) => string;
}

export const generatePnLPDF = ({
  selectedMonth,
  sales,
  expenses,
  products,
  settings,
  formatCurrency,
}: GeneratePnLPDFParams) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Filter Month Data
  const monthSales = sales.filter((s) => s.monthKey === selectedMonth || s.date?.startsWith(selectedMonth));
  const monthExpenses = expenses.filter((e) => e.monthKey === selectedMonth || e.date?.startsWith(selectedMonth));

  // Calculations
  const grossSales = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const collectedCash = monthSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  const pendingSales = monthSales.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);

  let cogs = 0;
  monthSales.forEach((s) => {
    s.items?.forEach((item) => {
      if (item.purchaseCost && item.purchaseCost > 0) {
        cogs += item.purchaseCost * (item.quantity || 1);
      } else {
        const p = products.find((prod) => prod.id === item.productId);
        if (p && p.purchaseCost > 0) {
          cogs += p.purchaseCost * (item.quantity || 1);
        }
      }
    });
  });

  const grossProfit = grossSales - cogs;
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;
  const profitMarginPercent = grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : '0';

  const monthDate = new Date(`${selectedMonth}-01T00:00:00`);
  const monthTitle = isNaN(monthDate.getTime())
    ? selectedMonth
    : monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const generatedDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text((settings.businessName || 'SANZARI ACCOUNTS').toUpperCase(), 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('MONTHLY PROFIT & LOSS (P&L) FINANCIAL STATEMENT', 14, 22);
  doc.text(`Period: ${monthTitle.toUpperCase()}`, 14, 28);

  doc.setFontSize(8);
  doc.text(`Generated: ${generatedDate}`, 196, 28, { align: 'right' });

  // 2. Net Profit Highlight Card
  if (netProfit >= 0) {
    doc.setFillColor(240, 253, 244); // Light emerald
    doc.setDrawColor(187, 247, 208);
  } else {
    doc.setFillColor(255, 241, 242); // Light rose
    doc.setDrawColor(254, 205, 211);
  }

  doc.roundedRect(14, 42, 182, 28, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('NET MONTHLY PROFIT / LOSS', 22, 50);

  doc.setFontSize(18);
  if (netProfit >= 0) {
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`+ Rs. ${netProfit.toLocaleString('en-IN')} (${profitMarginPercent}% Net Margin)`, 22, 62);
  } else {
    doc.setTextColor(225, 29, 72); // Rose
    doc.text(`- Rs. ${Math.abs(netProfit).toLocaleString('en-IN')} (NET LOSS)`, 22, 62);
  }

  // 3. P&L Financial Ledger Table
  const summaryTableData = [
    ['Gross Revenue (Total Sales)', `${monthSales.length} Orders`, `Rs. ${grossSales.toLocaleString('en-IN')}`],
    ['Cost of Goods Sold (COGS)', 'Purchase cost of sold items', `- Rs. ${cogs.toLocaleString('en-IN')}`],
    ['ESTIMATED GROSS PROFIT', 'Sales minus stock cost', `Rs. ${grossProfit.toLocaleString('en-IN')}`],
    ['Operating Expenses', `${monthExpenses.length} Expense entries`, `- Rs. ${totalExpenses.toLocaleString('en-IN')}`],
    ['NET PROFIT / LOSS', 'Final bottom-line income', `Rs. ${netProfit.toLocaleString('en-IN')}`],
  ];

  autoTable(doc, {
    startY: 76,
    head: [['Financial Category', 'Description / Volume', 'Amount (Rs.)']],
    body: summaryTableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 62 },
      2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.row.index === 2) {
          data.cell.styles.fillColor = [240, 253, 244];
          data.cell.styles.textColor = [16, 185, 129];
        }
        if (data.row.index === 4) {
          data.cell.styles.fillColor = netProfit >= 0 ? [236, 253, 245] : [255, 241, 242];
          data.cell.styles.textColor = netProfit >= 0 ? [5, 150, 105] : [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Expense Breakdown Sub-Table
  if (monthExpenses.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Monthly Operating Expenses Breakdown', 14, currentY);

    const expenseTableRows = monthExpenses.map((e, idx) => [
      (idx + 1).toString(),
      e.date,
      e.category,
      e.description || 'General Expense',
      e.walletName || 'Wallet Account',
      `Rs. ${e.amount.toLocaleString('en-IN')}`,
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['#', 'Date', 'Category', 'Description', 'Wallet', 'Amount']],
      body: expenseTableRows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer Signature Line
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('For ' + (settings.businessName || 'Sanzari Accounts'), 150, currentY + 15);
  doc.line(145, currentY + 28, 195, currentY + 28);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', 155, currentY + 32);

  // Save the PDF
  const filename = `PnL_Report_${monthTitle.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};
