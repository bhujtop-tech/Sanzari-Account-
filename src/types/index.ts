export type PartnerKey = 'rizwan' | 'avesh' | 'sahil';

export interface Wallet {
  id: string;
  name: string;
  partnerKey: PartnerKey;
  openingBalance: number;
  currentBalance: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  city?: string;
  totalOrders: number;
  totalSpent: number;
  pendingBalance: number;
  lastPurchaseDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  sellingPrice: number;
  purchaseCost: number;
  previousPurchaseCost?: number;
  costTrend?: 'hike' | 'low' | 'stable';
  lastCostChangeDate?: string;
  currentStock: number;
  lowStockThreshold: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  sellingPrice: number;
  purchaseCost?: number;
  lineTotal: number;
}

export type PaymentStatus = 'Paid' | 'Partial' | 'Pending';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank' | 'Other';

export interface Sale {
  id: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  salesPerson: string;
  walletId: string;
  walletName: string;
  date: string; // YYYY-MM-DD or ISO
  monthKey: string; // YYYY-MM (e.g. "2026-10")
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  itemCount: number;
  items: SaleItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  saleId?: string;
  walletId: string;
  walletName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  monthKey: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseCategory =
  | 'Courier'
  | 'Packaging'
  | 'Advertising'
  | 'Travel'
  | 'Salary'
  | 'Commission'
  | 'Office'
  | 'Vendor'
  | 'Other';

export interface Expense {
  id: string;
  walletId: string;
  walletName: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  monthKey: string;
  description: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transfer {
  id: string;
  fromWalletId: string;
  fromWalletName: string;
  toWalletId: string;
  toWalletName: string;
  amount: number;
  date: string;
  monthKey: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Purchase {
  id: string;
  vendorId?: string;
  vendorName: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  purchaseCost: number;
  totalCost: number;
  walletId?: string;
  walletName?: string;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paidAmount?: number;
  date: string;
  monthKey: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  city?: string;
  productsSupplied?: string;
  totalPurchases: number;
  pendingPayment: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StockMovementType =
  | 'OPENING'
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'DAMAGE'
  | 'LOSS'
  | 'ADJUSTMENT';

export interface SalesReturn {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  rate: number;
  totalAmount: number;
  refundMethod: 'DeductPending' | 'WalletRefund';
  walletId?: string;
  walletName?: string;
  date: string;
  monthKey: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number; // positive or negative
  unit: string;
  referenceId?: string;
  notes?: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  recordType: string;
  recordId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface StoreSettings {
  id?: string;
  businessName: string;
  currency: string;
  dateFormat: string;
  allowNegativeStock: boolean;
  allowNegativeWallet: boolean;
  address?: string;
  phone?: string;
  taxNumber?: string;
  updatedAt?: string;
}

export type UserRole = 'Admin' | 'Staff';

export interface UserPermissions {
  canAddSale: boolean;
  canAddPurchase: boolean;
  canAddExpense: boolean;
  canViewCostPrice: boolean; // "kitne me aata hai" purchase cost & profit margin visibility
  canViewWalletBalances: boolean; // total financial balance & wallet amounts visibility
  canViewReports: boolean;
  canManageUsers: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: UserPermissions;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NavTab = 'home' | 'sales' | 'stock' | 'accounts' | 'more';
export type MoreSection = 'customers' | 'products' | 'expenses' | 'purchases' | 'vendors' | 'users' | 'reports' | 'monthly' | 'settings' | 'ai';

export interface ActivityItem {
  id: string;
  type: 'sale' | 'expense' | 'payment' | 'purchase' | 'transfer';
  title: string;
  subtitle: string;
  amount: number;
  isPositive: boolean;
  date: string;
  rawDate: string;
  walletName?: string;
}
