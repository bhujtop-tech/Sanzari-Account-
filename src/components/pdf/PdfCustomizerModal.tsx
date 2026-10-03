import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BottomSheet } from '../common/BottomSheet';
import { generateCustomPdf, PdfExportOptions } from '../../utils/pdfGenerator';
import { Sale, Customer } from '../../types';
import {
  FileText,
  Printer,
  Download,
  Building2,
  Check,
  Eye,
  EyeOff,
  SlidersHorizontal,
  FileCheck,
  Receipt,
  UserCheck,
  Boxes,
  ShieldAlert,
} from 'lucide-react';

interface PdfCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: 'invoice' | 'ledger' | 'stock' | 'pnl';
  prefilledSale?: Sale;
  prefilledCustomer?: Customer;
}

export const PdfCustomizerModal: React.FC<PdfCustomizerModalProps> = ({
  isOpen,
  onClose,
  initialDocType = 'invoice',
  prefilledSale,
  prefilledCustomer,
}) => {
  const { sales, customers, products, expenses, wallets, settings } = useData();

  const [docType, setDocType] = useState<'invoice' | 'ledger' | 'stock' | 'pnl'>(initialDocType);

  // Targets
  const [selectedSaleId, setSelectedSaleId] = useState<string>(prefilledSale?.id || sales[0]?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    prefilledCustomer?.id || customers[0]?.id || ''
  );

  // Toggles ("Kya Chaiye / Kya Nahi Chaiye")
  const [includeHeaderBanner, setIncludeHeaderBanner] = useState(true);
  const [includeBusinessAddress, setIncludeBusinessAddress] = useState(true);
  const [includeGSTIN, setIncludeGSTIN] = useState(true);

  // Privacy: Hide purchase cost rate when giving invoice to customer
  const [includeCostPrice, setIncludeCostPrice] = useState(false);
  const [includePreviousBalance, setIncludePreviousBalance] = useState(true);
  const [includeCustomerInfo, setIncludeCustomerInfo] = useState(true);

  // Footer & Terms
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeTerms, setIncludeTerms] = useState(true);
  const [customTermsText, setCustomTermsText] = useState(
    'Goods once sold will not be taken back or exchanged. Subject to local jurisdiction. E&OE.'
  );

  const selectedSale = sales.find((s) => s.id === selectedSaleId) || prefilledSale || sales[0];
  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || prefilledCustomer || customers[0];

  const customerSales = selectedCustomer
    ? sales.filter((s) => s.customerId === selectedCustomer.id || s.customerName === selectedCustomer.name)
    : [];

  const handleGeneratePdf = () => {
    const options: PdfExportOptions = {
      docType,
      includeHeaderBanner,
      includeBusinessAddress,
      includeGSTIN,
      includeCustomerInfo,
      includePreviousBalance,
      includeCostPrice,
      includeItemDiscounts: true,
      includePaymentMethod: true,
      includePaymentQR: true,
      includeSignature,
      includeTerms,
      customTermsText,
      sale: selectedSale,
      customer: selectedCustomer,
      customerSales,
      products,
      expenses,
      wallets,
      settings,
    };

    generateCustomPdf(options);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="PDF Export & Customization Center">
      <div className="space-y-5 pb-4 text-zinc-900">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-lg border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Customize PDF Features</h3>
              <p className="text-xs text-slate-300">
                Choose what to include or exclude on your PDF document (Logo, Address, Cost Rates, Signature, Terms).
              </p>
            </div>
          </div>
        </div>

        {/* 1. DOCUMENT TYPE SELECTOR */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
            Select Document Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'invoice', label: 'Sales Invoice PDF', icon: Receipt },
              { id: 'ledger', label: 'Customer Khata PDF', icon: UserCheck },
              { id: 'stock', label: 'Stock Valuation PDF', icon: Boxes },
              { id: 'pnl', label: 'Monthly Report PDF', icon: FileText },
            ].map((type) => {
              const Icon = type.icon;
              const isSel = docType === type.id;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setDocType(type.id as any)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    isSel
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <Icon size={16} className={isSel ? 'text-amber-400' : 'text-zinc-500'} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. TARGET SELECTION (IF INVOICE OR LEDGER) */}
        {docType === 'invoice' && (
          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-600">Select Sale Invoice:</label>
            <select
              value={selectedSaleId}
              onChange={(e) => setSelectedSaleId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-semibold bg-white outline-hidden"
            >
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.saleNumber} — {s.customerName} (Rs. {s.total})
                </option>
              ))}
            </select>
          </div>
        )}

        {docType === 'ledger' && (
          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-600">Select Customer Khata:</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-semibold bg-white outline-hidden"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — Pending Due: Rs. {c.pendingBalance}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. FEATURE TOGGLES ("KYA CHAIYE / KYA NAHI CHAIYE") */}
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
          <span className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider block">
            Customization Toggles (Include / Exclude)
          </span>

          <div className="space-y-2.5">
            {/* Header Banner */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200/60 cursor-pointer">
              <span className="text-xs font-bold text-zinc-800">Include Store Header &amp; Branding</span>
              <input
                type="checkbox"
                checked={includeHeaderBanner}
                onChange={(e) => setIncludeHeaderBanner(e.target.checked)}
                className="w-4 h-4 accent-zinc-900 cursor-pointer"
              />
            </label>

            {/* Address & Phone */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200/60 cursor-pointer">
              <span className="text-xs font-bold text-zinc-800">Include Business Address &amp; Phone</span>
              <input
                type="checkbox"
                checked={includeBusinessAddress}
                onChange={(e) => setIncludeBusinessAddress(e.target.checked)}
                className="w-4 h-4 accent-zinc-900 cursor-pointer"
              />
            </label>

            {/* Hide Purchase Cost (Privacy) */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200/60 cursor-pointer">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-800">Show Purchase Cost Rates</span>
                {!includeCostPrice && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded-sm">
                    Hidden (Customer Safe)
                  </span>
                )}
              </div>
              <input
                type="checkbox"
                checked={includeCostPrice}
                onChange={(e) => setIncludeCostPrice(e.target.checked)}
                className="w-4 h-4 accent-zinc-900 cursor-pointer"
              />
            </label>

            {/* Customer Info */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200/60 cursor-pointer">
              <span className="text-xs font-bold text-zinc-800">Include Customer Name &amp; Phone</span>
              <input
                type="checkbox"
                checked={includeCustomerInfo}
                onChange={(e) => setIncludeCustomerInfo(e.target.checked)}
                className="w-4 h-4 accent-zinc-900 cursor-pointer"
              />
            </label>

            {/* Previous Balance */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200/60 cursor-pointer">
              <span className="text-xs font-bold text-zinc-800">Show Total Pending Remaining Due</span>
              <input
                type="checkbox"
                checked={includePreviousBalance}
                onChange={(e) => setIncludePreviousBalance(e.target.checked)}
                className="w-4 h-4 accent-zinc-900 cursor-pointer"
              />
            </label>

            {/* Signature Block */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200/60 cursor-pointer">
              <span className="text-xs font-bold text-zinc-800">Include Authorized Signatory Stamp</span>
              <input
                type="checkbox"
                checked={includeSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
                className="w-4 h-4 accent-zinc-900 cursor-pointer"
              />
            </label>

            {/* Terms & Conditions */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200/60 cursor-pointer">
              <span className="text-xs font-bold text-zinc-800">Include Terms &amp; Conditions</span>
              <input
                type="checkbox"
                checked={includeTerms}
                onChange={(e) => setIncludeTerms(e.target.checked)}
                className="w-4 h-4 accent-zinc-900 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* 4. TERMS TEXT EDITING */}
        {includeTerms && (
          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-600">Custom Terms Text:</label>
            <input
              type="text"
              value={customTermsText}
              onChange={(e) => setCustomTermsText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium"
            />
          </div>
        )}

        {/* 5. GENERATE BUTTON */}
        <button
          type="button"
          onClick={handleGeneratePdf}
          className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
        >
          <Download size={16} className="text-amber-400" />
          <span>Download Customized PDF Document</span>
        </button>
      </div>
    </BottomSheet>
  );
};
