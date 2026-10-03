import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  Wallet,
  Customer,
  Product,
  Sale,
  Payment,
  Expense,
  Transfer,
  Purchase,
  Vendor,
  StockMovement,
  SalesReturn,
  StoreSettings,
  ActivityItem,
  NavTab,
  MoreSection,
} from '../types';
import {
  initializeStoreDataIfEmpty,
  subscribeWallets,
  subscribeCustomers,
  subscribeProducts,
  subscribeSales,
  subscribePayments,
  subscribeExpenses,
  subscribeTransfers,
  subscribePurchases,
  subscribeVendors,
  subscribeStockMovements,
  subscribeReturns,
  subscribeSettings,
} from '../services/db';
import { INITIAL_WALLETS, INITIAL_CUSTOMERS, INITIAL_PRODUCTS } from '../data/initialData';
import { useAuth } from './AuthContext';

interface DataContextType {
  // State
  wallets: Wallet[];
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  expenses: Expense[];
  transfers: Transfer[];
  purchases: Purchase[];
  vendors: Vendor[];
  stockMovements: StockMovement[];
  returns: SalesReturn[];
  settings: StoreSettings;
  loading: boolean;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeMoreSection: MoreSection;
  setActiveMoreSection: (sec: MoreSection) => void;

  // Selected Month for monthly view
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;

  // Modals & Bottom Sheets state
  isAddSaleOpen: boolean;
  setIsAddSaleOpen: (open: boolean) => void;
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (open: boolean) => void;
  isAddPaymentOpen: boolean;
  setIsAddPaymentOpen: (open: boolean) => void;
  isAddPurchaseOpen: boolean;
  setIsAddPurchaseOpen: (open: boolean) => void;
  isReturnOpen: boolean;
  setIsReturnOpen: (open: boolean) => void;
  isTransferOpen: boolean;
  setIsTransferOpen: (open: boolean) => void;
  isAiAssistantOpen: boolean;
  setIsAiAssistantOpen: (open: boolean) => void;
  isGoogleSheetsOpen: boolean;
  setIsGoogleSheetsOpen: (open: boolean) => void;
  isPdfCustomizerOpen: boolean;
  setIsPdfCustomizerOpen: (open: boolean) => void;

  // Selected items for modal view
  selectedWalletId: string | null;
  setSelectedWalletId: (id: string | null) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedSaleId: string | null;
  setSelectedSaleId: (id: string | null) => void;
  prefilledCustomerIdForPayment?: string;
  setPrefilledCustomerIdForPayment: (id?: string) => void;

  // Computed business positions
  totalBalance: number;
  thisMonthSalesTotal: number;
  thisMonthCollectedTotal: number;
  thisMonthPendingTotal: number;
  thisMonthExpensesTotal: number;
  recentActivity: ActivityItem[];
  availableMonths: string[];

  // Helpers
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    businessName: 'Sanzari Store',
    currency: '₹',
    dateFormat: 'DD-MM-YYYY',
    allowNegativeStock: false,
    allowNegativeWallet: false,
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeMoreSection, setActiveMoreSection] = useState<MoreSection>('customers');

  // Month Key: e.g. "2026-10"
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Modals
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [isPdfCustomizerOpen, setIsPdfCustomizerOpen] = useState(false);

  // Selections
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [prefilledCustomerIdForPayment, setPrefilledCustomerIdForPayment] = useState<string | undefined>();

  // Subscribe to collections
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Attempt seed on mount
    initializeStoreDataIfEmpty().catch(console.error);

    const unsubWallets = subscribeWallets((w) => setWallets(w));
    const unsubCustomers = subscribeCustomers((c) => setCustomers(c));
    const unsubProducts = subscribeProducts((p) => setProducts(p));
    const unsubSales = subscribeSales((s) => setSales(s));
    const unsubPayments = subscribePayments((p) => setPayments(p));
    const unsubExpenses = subscribeExpenses((e) => setExpenses(e));
    const unsubTransfers = subscribeTransfers((t) => setTransfers(t));
    const unsubPurchases = subscribePurchases((p) => setPurchases(p));
    const unsubVendors = subscribeVendors((v) => setVendors(v));
    const unsubStock = subscribeStockMovements((m) => setStockMovements(m));
    const unsubReturns = subscribeReturns((r) => setReturns(r));
    const unsubSettings = subscribeSettings((s) => setSettings(s));

    const timer = setTimeout(() => setLoading(false), 300);

    return () => {
      unsubWallets();
      unsubCustomers();
      unsubProducts();
      unsubSales();
      unsubPayments();
      unsubExpenses();
      unsubTransfers();
      unsubPurchases();
      unsubVendors();
      unsubStock();
      unsubReturns();
      unsubSettings();
      clearTimeout(timer);
    };
  }, [user]);

  // Compute Total Balance
  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + (Number(w.currentBalance) || 0), 0);
  }, [wallets]);

  // Compute This Month KPIs
  const thisMonthSalesTotal = useMemo(() => {
    return sales
      .filter((s) => s.monthKey === currentMonthKey || s.date?.startsWith(currentMonthKey))
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [sales, currentMonthKey]);

  const thisMonthCollectedTotal = useMemo(() => {
    return sales
      .filter((s) => s.monthKey === currentMonthKey || s.date?.startsWith(currentMonthKey))
      .reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
  }, [sales, currentMonthKey]);

  const thisMonthPendingTotal = useMemo(() => {
    return sales
      .filter((s) => s.monthKey === currentMonthKey || s.date?.startsWith(currentMonthKey))
      .reduce((sum, s) => sum + (Number(s.pendingAmount) || 0), 0);
  }, [sales, currentMonthKey]);

  const thisMonthExpensesTotal = useMemo(() => {
    return expenses
      .filter((e) => e.monthKey === currentMonthKey || e.date?.startsWith(currentMonthKey))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, currentMonthKey]);

  // Compute Available Months for folders
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);
    sales.forEach((s) => s.monthKey && monthsSet.add(s.monthKey));
    expenses.forEach((e) => e.monthKey && monthsSet.add(e.monthKey));
    payments.forEach((p) => p.monthKey && monthsSet.add(p.monthKey));
    purchases.forEach((p) => p.monthKey && monthsSet.add(p.monthKey));

    return Array.from(monthsSet).sort().reverse();
  }, [sales, expenses, payments, purchases, currentMonthKey]);

  // Format Currency
  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount || 0).toLocaleString('en-IN');
    return `${settings.currency || '₹'} ${formatted}`;
  };

  // Format Date (DD-MM-YYYY or "02 Oct")
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate().toString().padStart(2, '0');
      const monthShort = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${monthShort} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Recent Activity (Latest 5 Transactions)
  const recentActivity = useMemo(() => {
    const items: ActivityItem[] = [];

    // Sales
    sales.forEach((s) => {
      items.push({
        id: s.id,
        type: 'sale',
        title: `Sale • ${s.saleNumber}`,
        subtitle: s.customerName || 'Customer',
        amount: s.paidAmount > 0 ? s.paidAmount : s.total,
        isPositive: true,
        date: formatDate(s.date),
        rawDate: s.date || s.createdAt || '',
        walletName: s.walletName,
      });
    });

    // Expenses
    expenses.forEach((e) => {
      items.push({
        id: e.id,
        type: 'expense',
        title: `Expense • ${e.category}`,
        subtitle: e.description || e.walletName || 'Expense',
        amount: e.amount,
        isPositive: false,
        date: formatDate(e.date),
        rawDate: e.date || e.createdAt || '',
        walletName: e.walletName,
      });
    });

    // Payments
    payments.forEach((p) => {
      items.push({
        id: p.id,
        type: 'payment',
        title: 'Payment Received',
        subtitle: p.customerName || 'Customer',
        amount: p.amount,
        isPositive: true,
        date: formatDate(p.date),
        rawDate: p.date || p.createdAt || '',
        walletName: p.walletName,
      });
    });

    // Purchases
    purchases.forEach((p) => {
      items.push({
        id: p.id,
        type: 'purchase',
        title: `Purchase • ${p.productName}`,
        subtitle: p.vendorName || 'Vendor',
        amount: p.totalCost,
        isPositive: false,
        date: formatDate(p.date),
        rawDate: p.date || p.createdAt || '',
        walletName: p.walletName,
      });
    });

    // Sort by rawDate descending and take top 5
    return items
      .sort((a, b) => (b.rawDate > a.rawDate ? 1 : b.rawDate < a.rawDate ? -1 : 0))
      .slice(0, 5);
  }, [sales, expenses, payments, purchases, settings]);

  return (
    <DataContext.Provider
      value={{
        wallets,
        customers,
        products,
        sales,
        payments,
        expenses,
        transfers,
        purchases,
        vendors,
        stockMovements,
        returns,
        settings,
        loading,
        activeTab,
        setActiveTab,
        activeMoreSection,
        setActiveMoreSection,
        selectedMonth,
        setSelectedMonth,
        isAddSaleOpen,
        setIsAddSaleOpen,
        isAddExpenseOpen,
        setIsAddExpenseOpen,
        isAddPaymentOpen,
        setIsAddPaymentOpen,
        isAddPurchaseOpen,
        setIsAddPurchaseOpen,
        isReturnOpen,
        setIsReturnOpen,
        isTransferOpen,
        setIsTransferOpen,
        isAiAssistantOpen,
        setIsAiAssistantOpen,
        isGoogleSheetsOpen,
        setIsGoogleSheetsOpen,
        isPdfCustomizerOpen,
        setIsPdfCustomizerOpen,
        selectedWalletId,
        setSelectedWalletId,
        selectedCustomerId,
        setSelectedCustomerId,
        selectedProductId,
        setSelectedProductId,
        selectedSaleId,
        setSelectedSaleId,
        prefilledCustomerIdForPayment,
        setPrefilledCustomerIdForPayment,
        totalBalance,
        thisMonthSalesTotal,
        thisMonthCollectedTotal,
        thisMonthPendingTotal,
        thisMonthExpensesTotal,
        recentActivity,
        availableMonths,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
