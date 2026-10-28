export type BusinessMode = 'dryfruit' | 'tourism';

export type PartnerKey = 'rizwan' | 'avesh' | 'sahil' | 'bus' | 'other';

export type WalletScope = 'dryfruit' | 'tourism' | 'all';

export interface Wallet {
  id: string;
  name: string;
  partnerKey: PartnerKey;
  scope?: WalletScope;
  openingBalance: number;
  currentBalance: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// SANZARI TOURISM & TRAVEL TYPES
// ==========================================
export type TourStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
export type TourType = 'Group Tour' | 'Private Tour' | 'Custom Package';
export type TravelClass = 'AC Train' | '3AC Train' | 'Sleeper Train' | 'Non-AC Train' | 'Non-AC Sleeper' | 'Flight' | 'Volvo Bus' | 'Self Drive';
export type TourPaymentMode = 'Online' | 'Offline' | 'UPI' | 'Cash';
export type TourBookingStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';

export interface TourMember {
  id?: string;
  name: string;
  age: number | string;
  gender: 'Male' | 'Female' | 'Child';
  phone?: string;
  idProof?: string; // Aadhaar / Voter / Passport / DL
  seatBerthPreference?: string; // e.g. Lower, Middle, Upper, Side Lower
  notes?: string;
}

export interface TourBatch {
  id: string;
  title: string; // e.g. "Kashmir Autumn Deluxe Tour"
  destination: string; // e.g. "Kashmir (Srinagar - Gulmarg - Pahalgam)"
  departureDate: string; // YYYY-MM-DD e.g. "2026-10-10"
  returnDate: string; // YYYY-MM-DD e.g. "2026-10-17"
  durationDays: number; // e.g. 7
  tourType: TourType; // 'Group Tour' | 'Private Tour'
  basePricePerPerson: number;
  // Multi-tier prices
  priceNonAcTrain?: number;
  priceAcTrain?: number;
  priceFlight?: number;
  priceChildHalf?: number;
  totalSeats: number;
  bookedSeats: number;
  status: TourStatus;
  travelMode: TravelClass | string;
  pickupCity: string; // e.g. "Ahmedabad / Surat / Mumbai"
  hotelDetails?: string;
  inclusions?: string[];
  monthKey: string; // YYYY-MM
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TourBooking {
  id: string;
  bookingNumber: string; // e.g. "SZ-TOUR-2518"
  tourBatchId?: string;
  tourBatchTitle?: string;
  tourTitle: string;
  destination: string;
  tourDate: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  
  // Primary Customer
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city?: string;
  emergencyContact?: string;
  
  // Members & Passenger list
  membersCount: number;
  adultsCount?: number;
  kidsCount?: number;
  couplesCount?: number;
  members: TourMember[];
  
  // Tour & Travel Options
  tourType: TourType; // 'Group Tour' | 'Private Tour'
  travelClass: TravelClass; // 'AC Train' | 'Sleeper Train' etc.
  packageCategory?: 'Standard' | 'Deluxe' | 'Super Deluxe' | 'Luxury';
  
  // Financials
  totalAmount: number;
  advancePaid: number;
  pendingAmount: number;
  balanceDue?: number; // Exactly matched with Booking Receipt Generator
  paymentStatus: PaymentStatus | 'Due'; // 'Paid' | 'Partial' | 'Pending' | 'Due'
  paymentMode: TourPaymentMode; // 'Online' | 'Offline' | 'UPI' | 'Cash'
  paymentMethod: PaymentMethod; // 'UPI' | 'Cash' | 'Bank' | 'Other'
  walletId?: string;
  walletName: string; // e.g. "Rizwan (Tour)", "Sahil (Tour)"
  
  // Additional Notes & Status
  bookingStatus: TourBookingStatus;
  bookedBy?: string;
  specialNotes?: string;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface TourExpense {
  id: string;
  tourBatchId?: string;
  tourTitle?: string;
  destination?: string;
  category: 'Hotel & Stay' | 'Train & Transport' | 'Food & Meals' | 'Sightseeing & Entry' | 'Guide & Staff' | 'Other';
  amount: number;
  walletId?: string;
  walletName: string;
  date: string;
  monthKey: string;
  description: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// INQUIRY & CUSTOM TOUR PACKAGE MANAGEMENT
// ==========================================
export type InquirySource = 'Instagram' | 'WhatsApp' | 'Phone Call' | 'Walk-in' | 'Reference' | 'Other';
export type InquiryStatus = 'New' | 'In Discussion' | 'Package Sent' | 'Follow-up' | 'Converted' | 'Lost';

export interface InquiryFollowUpNote {
  id: string;
  date: string; // ISO timestamp
  note: string; // customer reply or discussion note
  nextFollowUpDate?: string; // YYYY-MM-DD
  status?: InquiryStatus;
  loggedBy?: string; // staff name
}

export interface TourInquiry {
  id: string;
  inquiryNumber: string; // e.g. "INQ-101"
  customerName: string;
  customerPhone: string;
  source: InquirySource;
  destination: string; // e.g. "Kashmir", "Shimla Manali", "Goa", "Dubai"
  fromCity?: string; // e.g. "Vadodara", "Ahmedabad", "Surat"
  discussionSummary: string; // "kya baat hui"
  followUpHistory?: InquiryFollowUpNote[]; // chat-style date-wise reply & follow-up timeline
  paxAdults: number;
  paxChildren: number;
  totalPax: number;
  travelMode?: 'Train' | 'Flight' | 'Bus' | 'Self Drive' | 'Any';
  travelClass?: TravelClass | string;
  preferredDate?: string; // approximate date or month e.g. "2026-11-15" or "Diwali Vacation"
  budget?: string | number;
  packageCategory?: 'Standard' | 'Deluxe' | 'Super Deluxe' | 'Luxury';
  notes?: string; // extra notes
  status: InquiryStatus;
  followUpDate?: string;
  assignedTo?: string; // employee / staff name
  linkedPackageId?: string; // selected custom tour package
  linkedPackageTitle?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageItineraryDay {
  day: number;
  title: string; // e.g. "શ્રીનગર આગમન & દાલ લેક શિકારા રાઇડ"
  description: string;
}

export interface CustomTourPackage {
  id: string;
  packageCode: string; // e.g. "SZ-PKG-KASHMIR"
  packageName: string; // e.g. "Kashmir Autumn Deluxe Tour"
  packageNameGujarati: string; // e.g. "શ્રી કાશ્મીર હેવન સ્પેશિયલ ફેમિલી ટૂર"
  destination: string; // e.g. "કાશ્મીર (શ્રીનગર, ગુલમર્ગ, પહેલગામ, સોનમર્ગ)"
  durationNights: number; // 6
  durationDays: number; // 7
  durationTextGujarati: string; // "૬ રાત / ૭ દિવસ"
  
  // Pricing per person
  priceNonAcTrain?: number;
  priceAcTrain?: number;
  priceFlight?: number;
  priceChildHalf?: number;
  
  // Details in Gujarati (Vadodara Tour Style)
  overviewGujarati: string;
  inclusionsGujarati: string[];
  exclusionsGujarati: string[];
  itinerary: PackageItineraryDay[];
  
  hotelCategory: string; // e.g. "3 સ્ટાર & 4 સ્ટાર પ્રીમિયમ હોટેલ / લક્ઝરી હાઉસબોટ"
  foodPlan: string; // e.g. "શુદ્ધ શાકાહારી ભોજન (સવારનો નાસ્તો, બપોરે & રાત્રે ગરમાગરમ જમવાનું)"
  transportDetails: string; // e.g. "પ્રાઇવેટ એસી ઇનોવા / ટેમ્પો ટ્રાવેલર સાઇટસીઇંગ માટે"
  pickupCity: string; // e.g. "વડોદરા / અમદાવાદ / સુરત"
  specialNotesGujarati?: string;
  
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
  createdBy?: string;
  userEmail?: string;
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
export type MoreSection = 'customers' | 'products' | 'expenses' | 'purchases' | 'vendors' | 'users' | 'reports' | 'monthly' | 'settings' | 'ai' | 'inquiries' | 'packages';

export interface ActivityItem {
  id: string;
  type: 'sale' | 'expense' | 'payment' | 'purchase' | 'transfer' | 'tourBooking' | 'tourExpense';
  title: string;
  subtitle: string;
  amount: number;
  isPositive: boolean;
  date: string;
  rawDate: string;
  walletName?: string;
  walletId?: string;
  notes?: string;
  customerName?: string;
  vendorName?: string;
  category?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdBy?: string;
  userEmail?: string;
  items?: SaleItem[];
  fromWalletName?: string;
  toWalletName?: string;
  fromWalletId?: string;
  toWalletId?: string;
  originalData?: any;
}
