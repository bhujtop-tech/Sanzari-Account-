import { auth, googleProvider, signInWithPopup } from '../firebase/config';
import { GoogleAuthProvider } from 'firebase/auth';
import { Product, Sale, Wallet, Expense, Customer } from '../types';

let cachedAccessToken: string | null = null;

export const getCachedAccessToken = () => cachedAccessToken;

export const signInForGoogleSheets = async (): Promise<{ accessToken: string; email: string }> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth Access Token not returned. Please try signing in again.');
    }
    cachedAccessToken = credential.accessToken;
    return {
      accessToken: credential.accessToken,
      email: result.user.email || 'Google Account',
    };
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    throw new Error(error.message || 'Google Sign-In failed');
  }
};

/**
 * Creates a new Google Sheet named "Sanzari Store - Live Sync"
 */
export const createGoogleSheet = async (
  accessToken: string,
  title: string = 'Sanzari Store - Live Accounts & Stock'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  let response: Response;
  try {
    response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `${title} (${new Date().toLocaleDateString('en-IN')})`,
        },
        sheets: [
          { properties: { title: 'Stock Inventory' } },
          { properties: { title: 'Sales Orders' } },
          { properties: { title: 'Wallet Balances' } },
          { properties: { title: 'Expenses' } },
        ],
      }),
    });
  } catch (netErr) {
    console.warn('Network error creating Google Sheet:', netErr);
    throw new Error('Network error connecting to Google Sheets. Please check your internet connection.');
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Sheet: ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
};

interface SyncStoreDataParams {
  accessToken: string;
  spreadsheetId: string;
  products: Product[];
  sales: Sale[];
  wallets: Wallet[];
  expenses: Expense[];
  customers: Customer[];
}

/**
 * Syncs Store Data (Products, Sales, Wallets, Expenses) to the Google Sheet tabs
 */
export const syncStoreDataToGoogleSheet = async ({
  accessToken,
  spreadsheetId,
  products,
  sales,
  wallets,
  expenses,
}: SyncStoreDataParams): Promise<boolean> => {
  // 1. Stock Inventory Rows
  const stockHeaders = [
    ['S.No', 'Product Name', 'Category', 'Current Stock', 'Unit', 'Cost Rate (Rs.)', 'Selling Price (Rs.)', 'Valuation (Rs.)', 'Status'],
  ];
  const stockRows = products.map((p, idx) => [
    idx + 1,
    p.name,
    p.category || 'General',
    p.currentStock,
    p.unit,
    p.purchaseCost || 0,
    p.sellingPrice || 0,
    (p.currentStock || 0) * (p.purchaseCost || 0),
    p.currentStock <= 0 ? 'OUT OF STOCK' : p.currentStock <= p.lowStockThreshold ? 'LOW STOCK' : 'IN STOCK',
  ]);

  // 2. Sales Orders Rows
  const salesHeaders = [
    ['Sale Number', 'Date', 'Customer Name', 'Total Amount (Rs.)', 'Paid Amount (Rs.)', 'Pending (Rs.)', 'Payment Status', 'Sales Person'],
  ];
  const salesRows = sales.map((s) => [
    s.saleNumber,
    s.date,
    s.customerName,
    s.total,
    s.paidAmount,
    s.pendingAmount,
    s.paymentStatus,
    s.salesPerson,
  ]);

  // 3. Wallet Balances Rows
  const walletHeaders = [['Wallet Name', 'Current Balance (Rs.)', 'Partner Key']];
  const walletRows = wallets.map((w) => [w.name, w.currentBalance, w.partnerKey || 'General']);

  // 4. Expenses Rows
  const expenseHeaders = [['Expense Date', 'Category', 'Amount (Rs.)', 'Description', 'Wallet Account']];
  const expenseRows = expenses.map((e) => [
    e.date,
    e.category,
    e.amount,
    e.description || '',
    e.walletName || 'General Wallet',
  ]);

  // Helper to update range
  const updateSheetRange = async (sheetName: string, values: any[][]) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A1?valueInputOption=USER_ENTERED`;
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${sheetName}!A1`,
          majorDimension: 'ROWS',
          values,
        }),
      });
      return res.ok;
    } catch (netErr) {
      console.warn(`Network error updating sheet range ${sheetName}:`, netErr);
      return false;
    }
  };

  try {
    await updateSheetRange('Stock Inventory', [...stockHeaders, ...stockRows]);
    await updateSheetRange('Sales Orders', [...salesHeaders, ...salesRows]);
    await updateSheetRange('Wallet Balances', [...walletHeaders, ...walletRows]);
    await updateSheetRange('Expenses', [...expenseHeaders, ...expenseRows]);
    return true;
  } catch (error) {
    console.error('Error syncing to Google Sheet:', error);
    throw error;
  }
};

/**
 * Downloads data directly as a .csv file for offline Excel usage
 */
export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((val) => {
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
