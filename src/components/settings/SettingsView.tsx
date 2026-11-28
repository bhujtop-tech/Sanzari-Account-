import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { updateStoreSettings } from '../../services/db';
import { Settings, Download, ShieldCheck, Database, FileSpreadsheet, Check, Smartphone } from 'lucide-react';
import { PricingDiscountSettingsPanel } from '../tourism/PricingDiscountSettingsPanel';

export const SettingsView: React.FC = () => {
  const {
    settings,
    sales,
    customers,
    expenses,
    products,
    wallets,
    formatCurrency,
    mobileQuickActions,
    updateMobileQuickActions,
  } = useData();

  const [businessName, setBusinessName] = useState(settings.businessName || 'Sanzari Store');
  const [currency, setCurrency] = useState(settings.currency || '₹');
  const [dateFormat, setDateFormat] = useState(settings.dateFormat || 'DD-MM-YYYY');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateStoreSettings({
        businessName,
        currency,
        dateFormat,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // CSV Export utility
  const exportToCsv = (filename: string, rows: object[]) => {
    if (!rows || !rows.length) {
      alert('No records available to export.');
      return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows
        .map((row: any) => {
          return keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? '' : row[k];
              cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator);
        })
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSales = () => {
    const formatted = sales.map((s) => ({
      InvoiceNumber: s.saleNumber,
      Date: s.date,
      CustomerName: s.customerName,
      Phone: s.customerPhone,
      SalesPerson: s.salesPerson,
      Wallet: s.walletName,
      TotalAmount: s.total,
      PaidAmount: s.paidAmount,
      PendingAmount: s.pendingAmount,
      PaymentStatus: s.paymentStatus,
      PaymentMethod: s.paymentMethod,
    }));
    exportToCsv(`sanzari_sales_${new Date().toISOString().split('T')[0]}.csv`, formatted);
  };

  const handleExportExpenses = () => {
    const formatted = expenses.map((e) => ({
      Date: e.date,
      Category: e.category,
      Amount: e.amount,
      Wallet: e.walletName,
      Description: e.description,
      Notes: e.notes || '',
    }));
    exportToCsv(`sanzari_expenses_${new Date().toISOString().split('T')[0]}.csv`, formatted);
  };

  const handleExportCustomers = () => {
    const formatted = customers.map((c) => ({
      CustomerName: c.name,
      Phone: c.phone,
      City: c.city || '',
      TotalOrders: c.totalOrders,
      TotalSpent: c.totalSpent,
      PendingDue: c.pendingBalance,
      LastPurchaseDate: c.lastPurchaseDate || '',
    }));
    exportToCsv(`sanzari_customers_${new Date().toISOString().split('T')[0]}.csv`, formatted);
  };

  const handleExportInventory = () => {
    const formatted = products.map((p) => ({
      ProductName: p.name,
      Category: p.category,
      Unit: p.unit,
      CurrentStock: p.currentStock,
      PurchaseCost: p.purchaseCost,
      SellingPrice: p.sellingPrice,
      TotalStockValue: p.currentStock * p.purchaseCost,
      LowStockThreshold: p.lowStockThreshold,
    }));
    exportToCsv(`sanzari_inventory_${new Date().toISOString().split('T')[0]}.csv`, formatted);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-32 md:pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="pt-1">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950">Settings &amp; Data</h2>
        <p className="text-xs text-zinc-600 font-medium">Business configurations and Excel/CSV data exports</p>
      </div>

      {/* Mobile Bottom Quick Action Bar Toggles (Mobile Only) */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-zinc-200/80 shadow-2xs space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} className="text-zinc-900 shrink-0" />
              <span>Mobile Bottom Quick Buttons</span>
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
              Show or hide the floating bottom buttons (+ New Inquiry, + Booking, Date) on mobile screens. PC is unaffected.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={mobileQuickActions.enabled}
            aria-label="Toggle Mobile Bottom Quick Action Bar"
            onClick={() => updateMobileQuickActions({ enabled: !mobileQuickActions.enabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
              mobileQuickActions.enabled ? 'bg-zinc-950' : 'bg-zinc-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                mobileQuickActions.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div
          className={`divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 overflow-hidden transition-opacity ${
            mobileQuickActions.enabled ? 'opacity-100' : 'opacity-55'
          }`}
        >
          {(
            [
              {
                key: 'showInquiry',
                label: '+ New Inquiry Button',
                desc: 'Quickly create a new tour inquiry from bottom bar',
              },
              {
                key: 'showBooking',
                label: '+ Booking Button',
                desc: 'Quickly open Add Tour Booking from bottom bar',
              },
              {
                key: 'showDate',
                label: '+ Date Folder Button',
                desc: 'Quickly add a new tour departure date folder',
              },
            ] as const
          ).map((item) => {
            const isOn = mobileQuickActions.enabled && mobileQuickActions[item.key];
            return (
              <div
                key={item.key}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white/80"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900">{item.label}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={`Toggle ${item.label}`}
                  onClick={() => {
                    const nextVal = !mobileQuickActions[item.key];
                    updateMobileQuickActions({
                      [item.key]: nextVal,
                      ...(nextVal ? { enabled: true } : {}),
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    isOn ? 'bg-zinc-950' : 'bg-zinc-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                      isOn ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Store Preferences Form */}
      <form onSubmit={handleSaveSettings} className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
          Store Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Currency Symbol</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">Date Format</label>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold focus:ring-1 focus:ring-zinc-900 outline-hidden"
          >
            <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 02-10-2026)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-02)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          {isSaved ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span>Saved Successfully</span>
            </>
          ) : (
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          )}
        </button>
      </form>

      {/* Tour Pricing & Discount Settings (Sanzari Tours) */}
      <PricingDiscountSettingsPanel />

      {/* Backup & CSV Exports */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet size={15} className="text-emerald-600" />
          <span>Data Export &amp; Backup (CSV / Excel)</span>
        </h3>
        <p className="text-xs text-zinc-500">
          Download complete, clean spreadsheets of your business transactions and master data.
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            onClick={handleExportSales}
            className="p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-left transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-zinc-900">Export Sales</p>
              <p className="text-[10px] text-zinc-500">{sales.length} records</p>
            </div>
            <Download size={15} className="text-zinc-500" />
          </button>

          <button
            onClick={handleExportExpenses}
            className="p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-left transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-zinc-900">Export Expenses</p>
              <p className="text-[10px] text-zinc-500">{expenses.length} records</p>
            </div>
            <Download size={15} className="text-zinc-500" />
          </button>

          <button
            onClick={handleExportCustomers}
            className="p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-left transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-zinc-900">Export Customers</p>
              <p className="text-[10px] text-zinc-500">{customers.length} contacts</p>
            </div>
            <Download size={15} className="text-zinc-500" />
          </button>

          <button
            onClick={handleExportInventory}
            className="p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-left transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-zinc-900">Export Inventory</p>
              <p className="text-[10px] text-zinc-500">{products.length} SKUs</p>
            </div>
            <Download size={15} className="text-zinc-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
