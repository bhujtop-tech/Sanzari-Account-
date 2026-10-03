import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { BottomSheet } from '../common/BottomSheet';
import {
  signInForGoogleSheets,
  createGoogleSheet,
  syncStoreDataToGoogleSheet,
  downloadCSV,
} from '../../services/googleSheets';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
  Boxes,
  ShoppingBag,
  Receipt,
  WalletCards,
  LogIn,
  Sparkles,
} from 'lucide-react';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({ isOpen, onClose }) => {
  const { products, sales, wallets, expenses, customers, settings } = useData();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('sanzari_google_sheet_id') || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('sanzari_google_sheet_url') || '';
  });

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sign in to Google
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMsg(null);
    try {
      const res = await signInForGoogleSheets();
      setAccessToken(res.accessToken);
      setGoogleEmail(res.email);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Auth failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Create new Google Sheet
  const handleCreateSheet = async () => {
    if (!accessToken) {
      setErrorMsg('Please connect your Google Account first.');
      return;
    }
    setIsCreatingSheet(true);
    setErrorMsg(null);
    try {
      const res = await createGoogleSheet(accessToken, settings.businessName || 'Sanzari Store');
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);
      localStorage.setItem('sanzari_google_sheet_id', res.spreadsheetId);
      localStorage.setItem('sanzari_google_sheet_url', res.spreadsheetUrl);

      // Immediately sync data
      await syncData(res.spreadsheetId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create Google Sheet');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Sync Data
  const syncData = async (targetSheetId?: string) => {
    const activeSheetId = targetSheetId || spreadsheetId;
    if (!accessToken) {
      setErrorMsg('Please connect your Google Account first.');
      return;
    }
    if (!activeSheetId) {
      setErrorMsg('Please create or select a Google Sheet first.');
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSyncSuccess(false);

    try {
      await syncStoreDataToGoogleSheet({
        accessToken,
        spreadsheetId: activeSheetId,
        products,
        sales,
        wallets,
        expenses,
        customers,
      });
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating Google Sheet');
    } finally {
      setIsSyncing(false);
    }
  };

  // Download Offline Excel / CSV
  const handleDownloadStockCSV = () => {
    const headers = ['Product Name', 'Category', 'Stock Qty', 'Unit', 'Purchase Cost (Rs)', 'Selling Price (Rs)', 'Total Stock Value (Rs)'];
    const rows = products.map((p) => [
      p.name,
      p.category,
      p.currentStock,
      p.unit,
      p.purchaseCost,
      p.sellingPrice,
      (p.currentStock || 0) * (p.purchaseCost || 0),
    ]);
    downloadCSV(`Sanzari_Stock_Inventory_${new Date().toISOString().substring(0, 10)}`, headers, rows);
  };

  const handleDownloadSalesCSV = () => {
    const headers = ['Sale Number', 'Date', 'Customer Name', 'Total (Rs)', 'Paid (Rs)', 'Pending (Rs)', 'Status', 'Sales Person'];
    const rows = sales.map((s) => [s.saleNumber, s.date, s.customerName, s.total, s.paidAmount, s.pendingAmount, s.paymentStatus, s.salesPerson]);
    downloadCSV(`Sanzari_Sales_Report_${new Date().toISOString().substring(0, 10)}`, headers, rows);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Google Sheets Auto-Sync & Excel Export">
      <div className="space-y-5 pb-4 text-zinc-900">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-950 via-zinc-900 to-emerald-950 text-white shadow-lg border border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-md shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Live Google Sheets &amp; Excel Sync</h3>
              <p className="text-xs text-emerald-300">
                Automatically export and sync your Stock, Sales, Expenses, and Wallet balances to Google Sheets.
              </p>
            </div>
          </div>
        </div>

        {/* Status / Account State */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {syncSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>Google Sheet successfully updated with live store data!</span>
          </div>
        )}

        {/* STEP 1: CONNECT GOOGLE ACCOUNT */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>Step 1: Connect Google Account</span>
            </span>
            {accessToken && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                Connected
              </span>
            )}
          </div>

          {!accessToken ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full py-3 px-4 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-extrabold flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-98 transition-all"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isAuthenticating ? 'Connecting to Google...' : 'Sign in with Google Account'}</span>
            </button>
          ) : (
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
              <span>Account: <strong className="text-zinc-950">{googleEmail}</strong></span>
              <span className="text-[10px] text-emerald-600 font-bold">Ready to Sync</span>
            </div>
          )}
        </div>

        {/* STEP 2: GOOGLE SPREADSHEET MANAGER */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
              Step 2: Google Spreadsheet
            </span>
          </div>

          {spreadsheetId ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                <p className="font-bold text-emerald-950">Active Connected Google Sheet:</p>
                <p className="font-mono text-[10px] text-emerald-800 truncate">{spreadsheetId}</p>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:underline pt-1"
                  >
                    <span>Open Live Sheet in Google Sheets</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => syncData()}
                disabled={isSyncing || !accessToken}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all disabled:opacity-50"
              >
                <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing Store Data to Sheet...' : 'Sync Live Data to Google Sheet Now'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCreateSheet}
                disabled={isCreatingSheet || !accessToken}
                className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all disabled:opacity-50"
              >
                <FileSpreadsheet size={16} />
                <span>{isCreatingSheet ? 'Creating Sheet...' : '+ Create New Google Sheet & Sync'}</span>
              </button>

              <div className="pt-2">
                <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                  Or paste existing Google Sheet ID:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono focus:ring-1 focus:ring-zinc-900 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('sanzari_google_sheet_id', spreadsheetId);
                      syncData(spreadsheetId);
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Save &amp; Sync
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: OFFLINE EXCEL / CSV DOWNLOADS */}
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2">
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
            Offline Excel / CSV Downloads
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadStockCSV}
              className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-900 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download size={14} className="text-emerald-600 shrink-0" />
              <span>Stock Inventory (.csv)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSalesCSV}
              className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-900 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download size={14} className="text-sky-600 shrink-0" />
              <span>Sales Orders (.csv)</span>
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
