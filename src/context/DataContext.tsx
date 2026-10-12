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
  BusinessMode,
  TourBatch,
  TourBooking,
  TourExpense,
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
  subscribeTourBatches,
  subscribeTourBookings,
  subscribeTourExpenses,
  deleteTourBooking,
  deleteTourBatch,
} from '../services/db';
import {
  INITIAL_WALLETS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  DEFAULT_SETTINGS,
  INITIAL_TOUR_BATCHES,
  INITIAL_TOUR_BOOKINGS,
  INITIAL_TOUR_EXPENSES,
} from '../data/initialData';
import { useAuth } from './AuthContext';

interface DataContextType {
  // Business Mode (Dry fruit store vs Tour & Travels)
  businessMode: BusinessMode;
  setBusinessMode: (mode: BusinessMode) => void;

  // Dry Fruit Store State
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

  // Tourism State
  tourBatches: TourBatch[];
  tourBookings: TourBooking[];
  tourExpenses: TourExpense[];
  selectedTourBatchId: string | null;
  setSelectedTourBatchId: (id: string | null) => void;
  selectedTourBookingId: string | null;
  setSelectedTourBookingId: (id: string | null) => void;
  isAddTourBookingOpen: boolean;
  setIsAddTourBookingOpen: (open: boolean) => void;
  editingTourBooking: TourBooking | null;
  setEditingTourBooking: (booking: TourBooking | null) => void;
  openEditTourBookingModal: (booking: TourBooking) => void;
  deleteTourBookingById: (id: string) => Promise<void>;
  isAddTourBatchOpen: boolean;
  setIsAddTourBatchOpen: (open: boolean) => void;
  deleteTourBatchById: (id: string) => Promise<void>;
  isAddTourExpenseOpen: boolean;
  setIsAddTourExpenseOpen: (open: boolean) => void;
  isTourReceiptOpen: boolean;
  setIsTourReceiptOpen: (open: boolean) => void;
  tourReceiptBooking: TourBooking | null;
  setTourReceiptBooking: (booking: TourBooking | null) => void;

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
  selectedActivityItem: ActivityItem | null;
  setSelectedActivityItem: (item: ActivityItem | null) => void;
  isViewAllActivityOpen: boolean;
  setIsViewAllActivityOpen: (open: boolean) => void;
  prefilledCustomerIdForPayment?: string;
  setPrefilledCustomerIdForPayment: (id?: string) => void;

  // Computed business positions (Dryfruit & Tourism)
  totalBalance: number;
  thisMonthSalesTotal: number;
  thisMonthCollectedTotal: number;
  thisMonthPendingTotal: number;
  thisMonthExpensesTotal: number;
  thisMonthTourRevenue: number;
  thisMonthTourAdvance: number;
  thisMonthTourPending: number;
  thisMonthTourExpenses: number;
  totalTourPassengers: number;
  upcomingTourBatches: TourBatch[];
  recentActivity: ActivityItem[];
  availableMonths: string[];

  // Helpers
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Helper to load cache with fallback
  const getCache = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as T;
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed as T;
      }
    } catch {
      // ignore
    }
    return fallback;
  };

  // Business Mode (defaults to saved or 'dryfruit')
  const [businessMode, setBusinessModeState] = useState<BusinessMode>(() => {
    return (localStorage.getItem('sz_business_mode') as BusinessMode) || 'dryfruit';
  });

  const setBusinessMode = (mode: BusinessMode) => {
    setBusinessModeState(mode);
    localStorage.setItem('sz_business_mode', mode);
  };

  const initialWallets: Wallet[] = INITIAL_WALLETS.map((w, idx) => ({ ...w, id: `init_w_${idx}` }));
  const initialProducts: Product[] = INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `init_p_${idx}` }));
  const initialCustomers: Customer[] = INITIAL_CUSTOMERS.map((c, idx) => ({ ...c, id: `init_c_${idx}` }));
  const initialTourBatches: TourBatch[] = INITIAL_TOUR_BATCHES.map((b, idx) => ({ ...b, id: `init_tb_${idx}` }));
  const initialTourBookings: TourBooking[] = INITIAL_TOUR_BOOKINGS.map((b, idx) => ({ ...b, id: `init_bk_${idx}` }));
  const initialTourExpenses: TourExpense[] = INITIAL_TOUR_EXPENSES.map((e, idx) => ({ ...e, id: `init_te_${idx}` }));

  // State Declarations with instant LocalStorage caching
  const [wallets, setWallets] = useState<Wallet[]>(() => getCache('sz_wallets', initialWallets));
  const [customers, setCustomers] = useState<Customer[]>(() => getCache('sz_customers', initialCustomers));
  const [products, setProducts] = useState<Product[]>(() => getCache('sz_products', initialProducts));
  const [sales, setSales] = useState<Sale[]>(() => getCache('sz_sales', []));
  const [payments, setPayments] = useState<Payment[]>(() => getCache('sz_payments', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => getCache('sz_expenses', []));
  const [transfers, setTransfers] = useState<Transfer[]>(() => getCache('sz_transfers', []));
  const [purchases, setPurchases] = useState<Purchase[]>(() => getCache('sz_purchases', []));
  const [vendors, setVendors] = useState<Vendor[]>(() => getCache('sz_vendors', []));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => getCache('sz_stock', []));
  const [returns, setReturns] = useState<SalesReturn[]>(() => getCache('sz_returns', []));
  const [settings, setSettings] = useState<StoreSettings>(() => getCache('sz_settings', DEFAULT_SETTINGS));

  // Tourism State
  const [tourBatches, setTourBatches] = useState<TourBatch[]>(() => getCache('sz_tour_batches', initialTourBatches));
  const [tourBookings, setTourBookings] = useState<TourBooking[]>(() => getCache('sz_tour_bookings', initialTourBookings));
  const [tourExpenses, setTourExpenses] = useState<TourExpense[]>(() => getCache('sz_tour_expenses', initialTourExpenses));
  const [selectedTourBatchId, setSelectedTourBatchId] = useState<string | null>(null);
  const [selectedTourBookingId, setSelectedTourBookingId] = useState<string | null>(null);
  const [isAddTourBookingOpen, setIsAddTourBookingOpen] = useState(false);
  const [editingTourBooking, setEditingTourBooking] = useState<TourBooking | null>(null);
  const [isAddTourBatchOpen, setIsAddTourBatchOpen] = useState(false);
  const [isAddTourExpenseOpen, setIsAddTourExpenseOpen] = useState(false);
  const [isTourReceiptOpen, setIsTourReceiptOpen] = useState(false);
  const [tourReceiptBooking, setTourReceiptBooking] = useState<TourBooking | null>(null);

  const openEditTourBookingModal = (booking: TourBooking) => {
    setEditingTourBooking(booking);
    setIsAddTourBookingOpen(true);
  };

  const deleteTourBookingById = async (id: string) => {
    if (!id) return;
    setTourBookings((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      localStorage.setItem('sz_tour_bookings', JSON.stringify(updated));
      return updated;
    });
    try {
      await deleteTourBooking(id, user?.email || 'admin@sanzari.com');
    } catch (err) {
      console.warn('Delete tour booking error:', err);
    }
  };

  const deleteTourBatchById = async (id: string) => {
    if (!id) return;
    setTourBatches((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      localStorage.setItem('sz_tour_batches', JSON.stringify(updated));
      return updated;
    });
    try {
      await deleteTourBatch(id, user?.email || 'admin@sanzari.com');
    } catch (err) {
      console.warn('Delete tour batch error:', err);
    }
  };

  const [loading, setLoading] = useState(false);
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
  const [selectedActivityItem, setSelectedActivityItem] = useState<ActivityItem | null>(null);
  const [isViewAllActivityOpen, setIsViewAllActivityOpen] = useState(false);
  const [prefilledCustomerIdForPayment, setPrefilledCustomerIdForPayment] = useState<string | undefined>();

  // Subscribe to collections with instant cache sync
  useEffect(() => {
    if (!user) return;

    // Non-blocking background seeding
    initializeStoreDataIfEmpty().catch(console.warn);

    const unsubWallets = subscribeWallets((w) => {
      setWallets(w);
      localStorage.setItem('sz_wallets', JSON.stringify(w));
    });

    const unsubCustomers = subscribeCustomers((c) => {
      setCustomers(c);
      localStorage.setItem('sz_customers', JSON.stringify(c));
    });

    const unsubProducts = subscribeProducts((p) => {
      setProducts(p);
      localStorage.setItem('sz_products', JSON.stringify(p));
    });

    const unsubSales = subscribeSales((s) => {
      setSales(s);
      localStorage.setItem('sz_sales', JSON.stringify(s));
    });

    const unsubPayments = subscribePayments((p) => {
      setPayments(p);
      localStorage.setItem('sz_payments', JSON.stringify(p));
    });

    const unsubExpenses = subscribeExpenses((e) => {
      setExpenses(e);
      localStorage.setItem('sz_expenses', JSON.stringify(e));
    });

    const unsubTransfers = subscribeTransfers((t) => {
      setTransfers(t);
      localStorage.setItem('sz_transfers', JSON.stringify(t));
    });

    const unsubPurchases = subscribePurchases((p) => {
      setPurchases(p);
      localStorage.setItem('sz_purchases', JSON.stringify(p));
    });

    const unsubVendors = subscribeVendors((v) => {
      setVendors(v);
      localStorage.setItem('sz_vendors', JSON.stringify(v));
    });

    const unsubStock = subscribeStockMovements((m) => {
      setStockMovements(m);
      localStorage.setItem('sz_stock', JSON.stringify(m));
    });

    const unsubReturns = subscribeReturns((r) => {
      setReturns(r);
      localStorage.setItem('sz_returns', JSON.stringify(r));
    });

    const unsubSettings = subscribeSettings((s) => {
      if (s) {
        setSettings(s);
        localStorage.setItem('sz_settings', JSON.stringify(s));
      }
    });

    // Tourism Subscriptions
    const unsubTourBatches = subscribeTourBatches((batches) => {
      setTourBatches(batches);
      localStorage.setItem('sz_tour_batches', JSON.stringify(batches));
    });

    const unsubTourBookings = subscribeTourBookings((bookings) => {
      setTourBookings(bookings);
      localStorage.setItem('sz_tour_bookings', JSON.stringify(bookings));
    });

    const unsubTourExpenses = subscribeTourExpenses((expenses) => {
      setTourExpenses(expenses);
      localStorage.setItem('sz_tour_expenses', JSON.stringify(expenses));
    });

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
      unsubTourBatches();
      unsubTourBookings();
      unsubTourExpenses();
    };
  }, [user]);

  // Compute Total Wallet Balance (Shared across businesses)
  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + (Number(w.currentBalance) || 0), 0);
  }, [wallets]);

  // Compute This Month Dryfruit KPIs
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

  // Compute This Month Tourism KPIs
  const thisMonthTourRevenue = useMemo(() => {
    return tourBookings
      .filter((b) => b.monthKey === currentMonthKey || b.tourDate?.startsWith(currentMonthKey))
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  }, [tourBookings, currentMonthKey]);

  const thisMonthTourAdvance = useMemo(() => {
    return tourBookings
      .filter((b) => b.monthKey === currentMonthKey || b.tourDate?.startsWith(currentMonthKey))
      .reduce((sum, b) => sum + (Number(b.advancePaid) || 0), 0);
  }, [tourBookings, currentMonthKey]);

  const thisMonthTourPending = useMemo(() => {
    return tourBookings
      .filter((b) => b.monthKey === currentMonthKey || b.tourDate?.startsWith(currentMonthKey))
      .reduce((sum, b) => sum + (Number(b.pendingAmount) || 0), 0);
  }, [tourBookings, currentMonthKey]);

  const thisMonthTourExpenses = useMemo(() => {
    return tourExpenses
      .filter((e) => e.monthKey === currentMonthKey || e.date?.startsWith(currentMonthKey))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [tourExpenses, currentMonthKey]);

  const totalTourPassengers = useMemo(() => {
    return tourBookings.reduce((sum, b) => sum + (Number(b.membersCount) || 1), 0);
  }, [tourBookings]);

  const upcomingTourBatches = useMemo(() => {
    return tourBatches.filter((b) => b.status === 'Upcoming' || b.status === 'Ongoing');
  }, [tourBatches]);

  // Compute Available Months for folders
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);
    sales.forEach((s) => s.monthKey && monthsSet.add(s.monthKey));
    expenses.forEach((e) => e.monthKey && monthsSet.add(e.monthKey));
    payments.forEach((p) => p.monthKey && monthsSet.add(p.monthKey));
    purchases.forEach((p) => p.monthKey && monthsSet.add(p.monthKey));
    tourBookings.forEach((b) => b.monthKey && monthsSet.add(b.monthKey));
    tourExpenses.forEach((e) => e.monthKey && monthsSet.add(e.monthKey));

    return Array.from(monthsSet).sort().reverse();
  }, [sales, expenses, payments, purchases, tourBookings, tourExpenses, currentMonthKey]);

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

  // Recent Activity (dynamically based on current businessMode or mixed)
  const recentActivity = useMemo(() => {
    const items: ActivityItem[] = [];

    if (businessMode === 'tourism') {
      // Tour Bookings
      tourBookings.forEach((b) => {
        items.push({
          id: b.id,
          type: 'tourBooking',
          title: `Tour • ${b.destination}`,
          subtitle: `${b.customerName} (${b.membersCount} Pax • ${b.travelClass})`,
          amount: b.advancePaid > 0 ? b.advancePaid : b.totalAmount,
          isPositive: true,
          date: formatDate(b.tourDate),
          rawDate: b.tourDate || b.createdAt || '',
          walletName: b.walletName,
          customerName: b.customerName,
          notes: b.specialNotes,
          paymentStatus: b.paymentStatus,
          paymentMethod: b.paymentMode,
          originalData: b,
        });
      });

      // Tour Expenses
      tourExpenses.forEach((e) => {
        items.push({
          id: e.id,
          type: 'tourExpense',
          title: `Tour Expense • ${e.category}`,
          subtitle: e.description || e.destination || 'Expense',
          amount: e.amount,
          isPositive: false,
          date: formatDate(e.date),
          rawDate: e.date || e.createdAt || '',
          walletName: e.walletName,
          notes: e.notes || e.description,
          category: e.category,
          originalData: e,
        });
      });
    } else {
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
          walletId: s.walletId,
          notes: s.notes,
          customerName: s.customerName,
          paymentMethod: s.paymentMethod,
          paymentStatus: s.paymentStatus,
          items: s.items,
          originalData: s,
        });
      });

      // Expenses
      expenses.forEach((e) => {
        items.push({
          id: e.id,
          type: 'expense',
          title: `Expense • ${e.category}`,
          subtitle: e.description || e.notes || e.walletName || 'Expense',
          amount: e.amount,
          isPositive: false,
          date: formatDate(e.date),
          rawDate: e.date || e.createdAt || '',
          walletName: e.walletName,
          walletId: e.walletId,
          notes: e.notes || e.description,
          category: e.category,
          originalData: e,
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
          walletId: p.walletId,
          notes: p.notes,
          customerName: p.customerName,
          paymentMethod: p.paymentMethod,
          originalData: p,
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
          walletId: p.walletId,
          notes: p.notes,
          vendorName: p.vendorName,
          paymentStatus: p.paymentStatus,
          originalData: p,
        });
      });

      // Account-to-Account Transfers
      transfers.forEach((t) => {
        items.push({
          id: t.id,
          type: 'transfer',
          title: `Transfer • ${t.fromWalletName} ➔ ${t.toWalletName}`,
          subtitle: t.notes ? `Reason: ${t.notes}` : 'Internal Account Transfer',
          amount: t.amount,
          isPositive: true,
          date: formatDate(t.date),
          rawDate: t.date || t.createdAt || '',
          walletName: `${t.fromWalletName} ➔ ${t.toWalletName}`,
          fromWalletName: t.fromWalletName,
          toWalletName: t.toWalletName,
          fromWalletId: t.fromWalletId,
          toWalletId: t.toWalletId,
          notes: t.notes,
          createdBy: t.createdBy || t.userEmail,
          userEmail: t.userEmail,
          originalData: t,
        });
      });
    }

    return items.sort((a, b) => (b.rawDate > a.rawDate ? 1 : b.rawDate < a.rawDate ? -1 : 0));
  }, [businessMode, sales, expenses, payments, purchases, transfers, tourBookings, tourExpenses]);

  return (
    <DataContext.Provider
      value={{
        businessMode,
        setBusinessMode,
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
        tourBatches,
        tourBookings,
        tourExpenses,
        selectedTourBatchId,
        setSelectedTourBatchId,
        selectedTourBookingId,
        setSelectedTourBookingId,
        isAddTourBookingOpen,
        setIsAddTourBookingOpen,
        editingTourBooking,
        setEditingTourBooking,
        openEditTourBookingModal,
        deleteTourBookingById,
        isAddTourBatchOpen,
        setIsAddTourBatchOpen,
        deleteTourBatchById,
        isAddTourExpenseOpen,
        setIsAddTourExpenseOpen,
        isTourReceiptOpen,
        setIsTourReceiptOpen,
        tourReceiptBooking,
        setTourReceiptBooking,
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
        selectedActivityItem,
        setSelectedActivityItem,
        isViewAllActivityOpen,
        setIsViewAllActivityOpen,
        prefilledCustomerIdForPayment,
        setPrefilledCustomerIdForPayment,
        totalBalance,
        thisMonthSalesTotal,
        thisMonthCollectedTotal,
        thisMonthPendingTotal,
        thisMonthExpensesTotal,
        thisMonthTourRevenue,
        thisMonthTourAdvance,
        thisMonthTourPending,
        thisMonthTourExpenses,
        totalTourPassengers,
        upcomingTourBatches,
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
