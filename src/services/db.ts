import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  runTransaction,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
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
  AppUser,
  AuditLog,
  StoreSettings,
  TourBatch,
  TourBooking,
  TourExpense,
  TourInquiry,
  CustomTourPackage,
  PaymentMethod,
  PaymentStatus,
  ExpenseCategory,
  TourPaymentMode,
  TourPricingSettings,
  DEFAULT_TOUR_PRICING,
} from '../types';
import {
  INITIAL_WALLETS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  DEFAULT_SETTINGS,
  INITIAL_TOUR_BATCHES,
  INITIAL_TOUR_BOOKINGS,
  INITIAL_TOUR_EXPENSES,
} from '../data/initialData';

// Format current date helpers
export const getCurrentDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const getMonthKey = (dateStr?: string) => {
  if (!dateStr) return new Date().toISOString().substring(0, 7);
  return dateStr.substring(0, 7); // e.g. "2026-10"
};

// Generate human-friendly sale number (e.g. SALE-00101)
export const generateSaleNumber = () => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(10 + Math.random() * 90);
  return `SALE-${timestamp}${random}`;
};

// Recursively strip undefined values to prevent Firestore unsupported field value errors
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        cleanObj[key] = sanitizeForFirestore(val);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// ----------------------------------------------------
// INITIALIZATION / SEEDING SERVICE
// ----------------------------------------------------
export function getProductBaseKey(name: string): string {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('kesar') || n.includes('keser') || n.includes('saffron')) return 'keser';
  if (n.includes('mamra')) return 'mamra badam';
  if (n.includes('akhrot') || n.includes('walnut')) return 'akhrot';
  if (n.includes('crane') || n.includes('cranberry')) return 'cranberry';
  if (n.includes('red cherry') || n.includes('cherry')) return 'red cherry';
  if (n.includes('blackberry')) return 'blackberry';
  if (n.includes('blue berry') || n.includes('blueberry')) return 'blue berry';
  if (n.includes('lasan') || n.includes('garlic')) return 'lasan';
  if (n.includes('khajur') || n.includes('khajoor') || n.includes('date')) return 'khajur';
  if (n.includes('gulkand')) return 'gulkand';
  if (n.includes('kavo') || n.includes('kahwa')) return 'kavo';
  if (n.includes('rosewater') || n.includes('rose water')) return 'rosewater';
  if (n.includes('marchi') || n.includes('chilli')) return 'marchi';
  if (n.includes('pickel') || n.includes('pickle')) return 'pickel nuts';
  if (n.includes('musli') || n.includes('mousli')) return 'musli';
  if (n.includes('shilajit')) return 'shilajit';
  if (n.includes('black honey') || n.includes('honey')) return 'black honey';
  if (n.includes('serum')) return 'serum';
  if (n.includes('sefron cream') || n.includes('kesar cream') || n.includes('cream')) return 'sefron cream';
  if (n.includes('badam') || n.includes('almond')) return 'badam';
  if (n.includes('anjeer') || n.includes('fig')) return 'anjeer';
  return n;
}

export async function cleanDuplicateProductsInFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    const groups = new Map<string, Array<{ id: string; name: string; stock: number }>>();

    snap.docs.forEach((d) => {
      const data = d.data();
      const baseKey = getProductBaseKey(data.name || '');
      if (!groups.has(baseKey)) {
        groups.set(baseKey, []);
      }
      groups.get(baseKey)!.push({
        id: d.id,
        name: data.name || '',
        stock: Number(data.currentStock) || 0,
      });
    });

    for (const [key, items] of groups.entries()) {
      if (items.length > 1) {
        items.sort((a, b) => b.stock - a.stock);
        const keepItem = items[0];
        const duplicatesToDelete = items.slice(1);

        console.log(`Deduplicating "${key}": Keeping ${keepItem.id}, deleting ${duplicatesToDelete.length} duplicates`);
        for (const dup of duplicatesToDelete) {
          await deleteDoc(doc(db, 'products', dup.id));
        }
      }
    }
  } catch (err) {
    console.warn('Product cleanup warning:', err);
  }
}

export async function cleanDuplicateWalletsInFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'wallets'));
    const groups = new Map<string, Array<{ id: string; balance: number }>>();

    snap.docs.forEach((d) => {
      const data = d.data();
      const nameKey = (data.name || '').toLowerCase().trim();
      if (!groups.has(nameKey)) {
        groups.set(nameKey, []);
      }
      groups.get(nameKey)!.push({ id: d.id, balance: Number(data.currentBalance) || 0 });
    });

    for (const [key, items] of groups.entries()) {
      if (items.length > 1) {
        items.sort((a, b) => b.balance - a.balance);
        const keepItem = items[0];
        const duplicatesToDelete = items.slice(1);

        console.log(`Deduplicating wallet "${key}": Keeping ${keepItem.id}, deleting ${duplicatesToDelete.length} duplicates`);
        for (const dup of duplicatesToDelete) {
          await deleteDoc(doc(db, 'wallets', dup.id));
        }
      }
    }
  } catch (err) {
    console.warn('Wallet cleanup warning:', err);
  }
}

export async function cleanDuplicateCustomersInFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'customers'));
    const groups = new Map<string, Array<{ id: string; name: string }>>();

    snap.docs.forEach((d) => {
      const data = d.data();
      const key = (data.phone || data.name || '').toLowerCase().trim();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push({ id: d.id, name: data.name || '' });
    });

    for (const [key, items] of groups.entries()) {
      if (items.length > 1) {
        const keepItem = items[0];
        const duplicatesToDelete = items.slice(1);

        console.log(`Deduplicating customer "${key}": Keeping ${keepItem.id}, deleting ${duplicatesToDelete.length} duplicates`);
        for (const dup of duplicatesToDelete) {
          await deleteDoc(doc(db, 'customers', dup.id));
        }
      }
    }
  } catch (err) {
    console.warn('Customer cleanup warning:', err);
  }
}

export async function syncCacheToDefaultDatabase(): Promise<void> {
  try {
    const cacheKeys = [
      { key: 'sz_sales', col: 'sales' },
      { key: 'sz_expenses', col: 'expenses' },
      { key: 'sz_tour_bookings', col: 'tourBookings' },
      { key: 'sz_tour_expenses', col: 'tourExpenses' },
      { key: 'sz_tour_inquiries', col: 'tourInquiries' },
      { key: 'sz_custom_tour_packages', col: 'customTourPackages' },
      { key: 'sz_customers', col: 'customers' },
      { key: 'sz_products', col: 'products' },
      { key: 'sz_wallets', col: 'wallets' },
      { key: 'sz_transfers', col: 'transfers' },
      { key: 'sz_payments', col: 'payments' },
      { key: 'sz_purchases', col: 'purchases' },
    ];

    for (const { key, col } of cacheKeys) {
      try {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const items = JSON.parse(itemStr);
          if (Array.isArray(items)) {
            for (const entry of items) {
              if (entry && entry.id && !entry.id.startsWith('init_') && !entry.id.startsWith('def-') && !entry.id.startsWith('fallback-')) {
                const targetRef = doc(db, col, entry.id);
                const existsSnap = await getDoc(targetRef);
                if (!existsSnap.exists()) {
                  await setDoc(targetRef, sanitizeForFirestore(entry));
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Cache sync ${key} warning:`, err);
      }
    }
  } catch (err) {
    console.warn('syncCacheToDefaultDatabase warning:', err);
  }
}

export async function initializeStoreDataIfEmpty(): Promise<boolean> {
  try {
    // 1. Sync any local cache items to Firestore (default)
    await syncCacheToDefaultDatabase();

    const currentDate = getCurrentDateString();
    const currentMonth = getMonthKey(currentDate);

    // Fetch snapshot checks in parallel for ultra-fast response
    const [walletsSnap, productsSnap, customersSnap, salesSnap, expensesSnap, tourBatchesSnap, tourBookingsSnap, tourInquiriesSnap] = await Promise.all([
      getDocs(collection(db, 'wallets')),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'sales')),
      getDocs(collection(db, 'expenses')),
      getDocs(collection(db, 'tourBatches')),
      getDocs(collection(db, 'tourBookings')),
      getDocs(collection(db, 'tourInquiries')),
    ]);

    let seeded = false;

    // 1. Wallets
    if (walletsSnap.empty) {
      console.log('Seeding initial wallets into Firebase Firestore (default)...');
      const batch = writeBatch(db);
      for (const w of INITIAL_WALLETS) {
        const wRef = doc(collection(db, 'wallets'));
        batch.set(wRef, {
          ...w,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      seeded = true;
    }

    // 2. Products
    if (productsSnap.empty) {
      console.log('Seeding initial products into Firestore (default)...');
      const batch = writeBatch(db);
      for (const p of INITIAL_PRODUCTS) {
        const pRef = doc(collection(db, 'products'));
        batch.set(pRef, {
          ...p,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      seeded = true;
    }

    // 3. Customers
    if (customersSnap.empty) {
      console.log('Seeding initial customers into Firestore (default)...');
      const batch = writeBatch(db);
      for (const c of INITIAL_CUSTOMERS) {
        const cRef = doc(collection(db, 'customers'));
        batch.set(cRef, {
          ...c,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      seeded = true;
    }

    // 4. Tour Batches
    if (tourBatchesSnap.empty && INITIAL_TOUR_BATCHES?.length > 0) {
      console.log('Seeding initial tour batches...');
      const batch = writeBatch(db);
      for (const tb of INITIAL_TOUR_BATCHES) {
        const tbRef = doc(collection(db, 'tourBatches'));
        batch.set(tbRef, sanitizeForFirestore({
          ...tb,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
      await batch.commit();
    }

    // 5. Tour Bookings
    if (tourBookingsSnap.empty && INITIAL_TOUR_BOOKINGS?.length > 0) {
      console.log('Seeding initial tour bookings...');
      const batch = writeBatch(db);
      for (const tb of INITIAL_TOUR_BOOKINGS) {
        const tbRef = doc(collection(db, 'tourBookings'));
        batch.set(tbRef, sanitizeForFirestore({
          ...tb,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
      await batch.commit();
    }

    // Mark store initialized locally
    localStorage.setItem('sanzari_store_initialized_v2', 'true');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'initial_seed');
    return false;
  }
}

// ----------------------------------------------------
// USER & PERMISSIONS MANAGEMENT (appUsers)
// ----------------------------------------------------
export function subscribeAppUsers(callback: (users: AppUser[]) => void) {
  const q = query(collection(db, 'appUsers'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const users: AppUser[] = snap.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as Omit<AppUser, 'uid'>),
      }));
      callback(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appUsers');
    }
  );
}

export async function addAppUser(userData: Omit<AppUser, 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const userRef = doc(collection(db, 'appUsers'));
    await setDoc(userRef, {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return userRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'appUsers');
    throw error;
  }
}

export async function updateAppUser(uid: string, userData: Partial<AppUser>): Promise<void> {
  try {
    await updateDoc(doc(db, 'appUsers', uid), {
      ...userData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `appUsers/${uid}`);
    throw error;
  }
}

export async function deleteAppUser(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'appUsers', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `appUsers/${uid}`);
    throw error;
  }
}
export async function ensureAllDefaultWalletsExist(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'wallets'));
    const existing = snap.docs.map((d) => ({
      id: d.id,
      name: (d.data().name || '').toLowerCase().trim(),
      scope: d.data().scope,
    }));

    const defaultsToAdd = [
      {
        name: 'Rizwan',
        partnerKey: 'rizwan' as const,
        scope: 'dryfruit' as const,
        openingBalance: 31100,
        currentBalance: 31100,
        color: '#0284c7',
      },
      {
        name: 'Avesh',
        partnerKey: 'avesh' as const,
        scope: 'dryfruit' as const,
        openingBalance: 10950,
        currentBalance: 10950,
        color: '#10b981',
      },
      {
        name: 'Sahil',
        partnerKey: 'sahil' as const,
        scope: 'dryfruit' as const,
        openingBalance: 0,
        currentBalance: 0,
        color: '#8b5cf6',
      },
      {
        name: 'Rizwan (Tour)',
        partnerKey: 'rizwan' as const,
        scope: 'tourism' as const,
        openingBalance: 0,
        currentBalance: 0,
        color: '#0ea5e9',
      },
      {
        name: 'Sahil (Tour)',
        partnerKey: 'sahil' as const,
        scope: 'tourism' as const,
        openingBalance: 0,
        currentBalance: 0,
        color: '#a855f7',
      },
      {
        name: 'Bus (Tour)',
        partnerKey: 'bus' as const,
        scope: 'tourism' as const,
        openingBalance: 0,
        currentBalance: 0,
        color: '#f59e0b',
      },
    ];

    for (const dw of defaultsToAdd) {
      const targetName = dw.name.toLowerCase().trim();
      const alreadyExists = existing.some(
        (w) =>
          (w.name === targetName || (dw.scope === 'tourism' && dw.partnerKey === 'bus' && w.name.includes('bus'))) &&
          (!w.scope || w.scope === dw.scope)
      );
      if (!alreadyExists) {
        const wRef = doc(collection(db, 'wallets'));
        await setDoc(
          wRef,
          sanitizeForFirestore({
            ...dw,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }
    }
  } catch (err) {
    console.warn('ensureAllDefaultWalletsExist warning:', err);
  }
}

export function subscribeWallets(callback: (wallets: Wallet[]) => void) {
  // Ensure all default wallets exist in the background
  ensureAllDefaultWalletsExist().catch(() => {});

  const q = query(collection(db, 'wallets'));
  return onSnapshot(
    q,
    (snap) => {
      const rawWallets: Wallet[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Wallet, 'id'>),
      }));

      // Deduplicate by normalized name + scope key
      const uniqueMap = new Map<string, Wallet>();
      rawWallets.forEach((w) => {
        const key = `${(w.name || '').toLowerCase().trim()}__${w.scope || 'dryfruit'}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, w);
        } else {
          // If existing wallet has 0 balance and new has non-zero, keep non-zero
          const existing = uniqueMap.get(key)!;
          if (w.currentBalance !== 0 && existing.currentBalance === 0) {
            uniqueMap.set(key, w);
          }
        }
      });

      callback(Array.from(uniqueMap.values()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wallets');
    }
  );
}

export async function addWallet(data: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'wallets'), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'wallets');
    throw error;
  }
}

export async function updateWallet(id: string, data: Partial<Wallet>): Promise<void> {
  try {
    await updateDoc(doc(db, 'wallets', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `wallets/${id}`);
    throw error;
  }
}

export async function deleteWallet(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'wallets', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `wallets/${id}`);
    throw error;
  }
}

// ----------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------
export function subscribeCustomers(callback: (customers: Customer[]) => void) {
  const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const rawCustomers: Customer[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Customer, 'id'>),
      }));

      const uniqueMap = new Map<string, Customer>();
      rawCustomers.forEach((c) => {
        const key = (c.phone || c.name || '').toLowerCase().trim();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, c);
        }
      });

      callback(Array.from(uniqueMap.values()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customers');
    }
  );
}

export async function addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'customers'), {
      ...data,
      totalOrders: data.totalOrders || 0,
      totalSpent: data.totalSpent || 0,
      pendingBalance: data.pendingBalance || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'customers');
    throw error;
  }
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  try {
    await updateDoc(doc(db, 'customers', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
    throw error;
  }
}

// ----------------------------------------------------
// PRODUCTS & STOCK
// ----------------------------------------------------
export function subscribeProducts(callback: (products: Product[]) => void) {
  const q = query(collection(db, 'products'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const rawProducts: Product[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Product, 'id'>),
      }));

      // Deduplicate client-side
      const uniqueMap = new Map<string, Product>();
      rawProducts.forEach((p) => {
        const key = getProductBaseKey(p.name);
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, p);
        } else {
          // If existing key has lower stock, replace with higher stock entry
          const existing = uniqueMap.get(key)!;
          if ((p.currentStock || 0) > (existing.currentStock || 0)) {
            uniqueMap.set(key, p);
          }
        }
      });

      callback(Array.from(uniqueMap.values()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  );
}

export async function addProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Log opening stock movement
    if (data.currentStock > 0) {
      await addDoc(collection(db, 'stockMovements'), {
        productId: docRef.id,
        productName: data.name,
        type: 'OPENING',
        quantity: data.currentStock,
        unit: data.unit,
        date: getCurrentDateString(),
        notes: 'Initial Product Stock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'products');
    throw error;
  }
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    throw error;
  }
}

export async function adjustStock(
  productId: string,
  productName: string,
  newQuantity: number,
  type: 'DAMAGE' | 'LOSS' | 'ADJUSTMENT' | 'OPENING',
  notes: string,
  userEmail: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const pRef = doc(db, 'products', productId);
      const pSnap = await transaction.get(pRef);
      if (!pSnap.exists()) throw new Error('Product not found');

      const currentStock = pSnap.data().currentStock || 0;
      const difference = type === 'DAMAGE' || type === 'LOSS' ? -Math.abs(newQuantity) : newQuantity - currentStock;
      const finalStock = type === 'DAMAGE' || type === 'LOSS' ? Math.max(0, currentStock - Math.abs(newQuantity)) : newQuantity;

      transaction.update(pRef, {
        currentStock: finalStock,
        updatedAt: new Date().toISOString(),
      });

      const movementRef = doc(collection(db, 'stockMovements'));
      transaction.set(movementRef, {
        productId,
        productName,
        type,
        quantity: difference,
        unit: pSnap.data().unit || 'pcs',
        notes,
        date: getCurrentDateString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail,
        action: `STOCK_${type}`,
        recordType: 'product',
        recordId: productId,
        oldValue: JSON.stringify({ currentStock }),
        newValue: JSON.stringify({ currentStock: finalStock, adjustment: difference, notes }),
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${productId}`);
    throw error;
  }
}

// Safe number conversion helper to prevent NaN in Firestore writes
export function safeNum(val: any, defaultVal = 0): number {
  if (val === undefined || val === null || val === '') return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

// Wallet resolution helper to ensure a real Firestore document exists
export async function getOrResolveWalletDoc(walletId: string, walletName?: string) {
  if (walletId && !walletId.startsWith('init_')) {
    try {
      const wRef = doc(db, 'wallets', walletId);
      const snap = await getDoc(wRef);
      if (snap.exists()) {
        return { id: walletId, name: snap.data().name || walletName || 'Rizwan' };
      }
    } catch {
      // Fallback
    }
  }

  // Search existing wallets in Firestore
  try {
    const walletsSnap = await getDocs(collection(db, 'wallets'));
    if (!walletsSnap.empty) {
      const matched = walletName
        ? walletsSnap.docs.find((d) => (d.data().name || '').toLowerCase().trim() === walletName.toLowerCase().trim())
        : null;
      const targetDoc = matched || walletsSnap.docs[0];
      return { id: targetDoc.id, name: targetDoc.data().name || walletName || 'Rizwan' };
    }
  } catch {
    // Fallback
  }

  // Create default wallet doc if collection is empty
  const newWRef = await addDoc(collection(db, 'wallets'), {
    name: walletName || 'Rizwan',
    type: 'BANK',
    accountNumber: '',
    currentBalance: 0,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { id: newWRef.id, name: walletName || 'Rizwan' };
}

// ----------------------------------------------------
// SALES (ATOMIC CREATION & RECORDING)
// ----------------------------------------------------
export function subscribeSales(callback: (sales: Sale[]) => void) {
  const q = query(collection(db, 'sales'), orderBy('date', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const rawSales: Sale[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Sale, 'id'>),
      }));

      const uniqueSales = new Map<string, Sale>();
      rawSales.forEach((s) => {
        const key = s.saleNumber || s.id;
        if (!uniqueSales.has(key)) {
          uniqueSales.set(key, s);
        }
      });

      callback(Array.from(uniqueSales.values()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sales');
    }
  );
}

export async function createSale(params: {
  sale: Omit<Sale, 'id' | 'saleNumber' | 'monthKey' | 'createdAt' | 'updatedAt'>;
  userEmail: string;
}): Promise<Sale> {
  try {
    const saleNumber = generateSaleNumber();
    const monthKey = getMonthKey(params.sale.date);

    // Wallet resolution: use supplied wallet ID if valid, else resolve fast
    let walletId = params.sale.walletId;
    let walletName = params.sale.walletName || 'Rizwan';
    if (!walletId || walletId.startsWith('init_')) {
      const resolvedWallet = await getOrResolveWalletDoc(walletId, walletName);
      walletId = resolvedWallet.id;
      walletName = resolvedWallet.name;
    }

    // Product resolution: only fetch product collection if an item lacks a real Firestore ID
    const needsProductSearch = params.sale.items.some((item) => !item.productId || item.productId.startsWith('init_'));
    let allProductDocs: Array<{ id: string; name: string }> = [];
    if (needsProductSearch) {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        allProductDocs = productsSnap.docs.map((d) => ({ id: d.id, name: d.data().name || '' }));
      } catch {
        // Fallback
      }
    }

    const resolvedItems = params.sale.items.map((item) => {
      let pId = item.productId;
      if (!pId || pId.startsWith('init_')) {
        const match = allProductDocs.find(
          (pd) => getProductBaseKey(pd.name) === getProductBaseKey(item.productName)
        );
        if (match) pId = match.id;
      }
      const qty = safeNum(item.quantity, 1);
      const price = safeNum(item.sellingPrice, 0);
      return {
        ...item,
        productId: pId || '',
        quantity: qty,
        sellingPrice: price,
        purchaseCost: safeNum(item.purchaseCost, 0),
        lineTotal: safeNum(item.lineTotal, qty * price),
      };
    });

    // Customer resolution
    let customerId = params.sale.customerId;
    if (customerId && customerId.startsWith('init_')) {
      try {
        const custsSnap = await getDocs(collection(db, 'customers'));
        const matchCust = custsSnap.docs.find(
          (cd) => (cd.data().name || '').toLowerCase().trim() === (params.sale.customerName || '').toLowerCase().trim()
        );
        customerId = matchCust ? matchCust.id : '';
      } catch {
        customerId = '';
      }
    }

    const subtotal = safeNum(params.sale.subtotal);
    const discount = safeNum(params.sale.discount);
    const total = safeNum(params.sale.total);
    const paidAmount = safeNum(params.sale.paidAmount);
    const pendingAmount = safeNum(params.sale.pendingAmount);

    let createdSale: Sale | null = null;

    await runTransaction(db, async (transaction) => {
      // ========================================================
      // 1. ALL READS FIRST (Firestore requires reads before writes)
      // ========================================================

      // Read 1: Wallet
      const walletRef = doc(db, 'wallets', walletId);
      const walletSnap = await transaction.get(walletRef);
      const currentWalletBalance = walletSnap.exists() ? safeNum(walletSnap.data().currentBalance) : 0;

      // Read 2: Customer (if existing)
      let customerRef = customerId ? doc(db, 'customers', customerId) : null;
      let customerData: Customer | null = null;
      if (customerRef) {
        const custSnap = await transaction.get(customerRef);
        if (custSnap.exists()) {
          customerData = { id: custSnap.id, ...(custSnap.data() as Omit<Customer, 'id'>) };
        }
      }

      if (!customerRef || !customerData) {
        customerRef = doc(collection(db, 'customers'));
      }

      // Read 3: Products in parallel
      const validProductItems = resolvedItems.filter((i) => i.productId && !i.productId.startsWith('init_'));
      const productRefs = validProductItems.map((i) => doc(db, 'products', i.productId));
      const pSnaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

      const productSnapshots = validProductItems.map((item, idx) => ({
        item,
        ref: productRefs[idx],
        currentStock: pSnaps[idx].exists() ? safeNum(pSnaps[idx].data().currentStock) : 0,
      }));

      // ========================================================
      // 2. ALL WRITES AFTER ALL READS
      // ========================================================

      // Write 1: Customer stats
      const prevTotalSpent = customerData ? safeNum(customerData.totalSpent) : 0;
      const prevTotalOrders = customerData ? safeNum(customerData.totalOrders) : 0;
      const prevPending = customerData ? safeNum(customerData.pendingBalance) : 0;

      const newTotalSpent = prevTotalSpent + total;
      const newTotalOrders = prevTotalOrders + 1;
      const newPending = prevPending + pendingAmount;

      transaction.set(
        customerRef,
        {
          name: params.sale.customerName || 'Walk-in Customer',
          phone: params.sale.customerPhone || '',
          totalSpent: newTotalSpent,
          totalOrders: newTotalOrders,
          pendingBalance: newPending,
          lastPurchaseDate: params.sale.date,
          updatedAt: new Date().toISOString(),
          ...(customerData ? {} : { createdAt: new Date().toISOString() }),
        },
        { merge: true }
      );

      // Write 2: Wallet balance
      if (paidAmount > 0) {
        transaction.set(
          walletRef,
          {
            currentBalance: currentWalletBalance + paidAmount,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // Write 3: Create Sale document
      const saleRef = doc(collection(db, 'sales'));
      const fullSaleData: Omit<Sale, 'id'> = {
        ...params.sale,
        walletId,
        walletName,
        customerId: customerRef.id,
        subtotal,
        discount,
        total,
        paidAmount,
        pendingAmount,
        itemCount: resolvedItems.length,
        items: resolvedItems,
        saleNumber,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      transaction.set(saleRef, fullSaleData);
      createdSale = { id: saleRef.id, ...fullSaleData };

      // Write 4: Payment document
      if (paidAmount > 0) {
        const paymentRef = doc(collection(db, 'payments'));
        const paymentData: Omit<Payment, 'id'> = {
          customerId: customerRef.id,
          customerName: params.sale.customerName,
          saleId: saleRef.id,
          walletId,
          walletName,
          amount: paidAmount,
          paymentMethod: params.sale.paymentMethod || 'UPI',
          date: params.sale.date,
          monthKey,
          notes: `Payment for ${saleNumber}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        transaction.set(paymentRef, paymentData);
      }

      // Write 5: Stock update & movement log
      for (const ps of productSnapshots) {
        const newStock = Math.max(0, ps.currentStock - ps.item.quantity);
        transaction.update(ps.ref, {
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        });

        const stockMoveRef = doc(collection(db, 'stockMovements'));
        transaction.set(stockMoveRef, {
          productId: ps.item.productId,
          productName: ps.item.productName,
          type: 'SALE',
          quantity: -ps.item.quantity,
          unit: ps.item.unit,
          referenceId: saleRef.id,
          date: params.sale.date,
          notes: `Sale ${saleNumber} to ${params.sale.customerName}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Write 6: Audit log
      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail: params.userEmail,
        action: 'CREATE_SALE',
        recordType: 'sale',
        recordId: saleRef.id,
        newValue: JSON.stringify({ saleNumber, total, paid: paidAmount }),
        timestamp: new Date().toISOString(),
      });
    });

    return createdSale!;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sales');
    throw error;
  }
}

export async function deleteSale(saleId: string, userEmail: string): Promise<void> {
  try {
    const saleRef = doc(db, 'sales', saleId);
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) {
      throw new Error('Sale record not found');
    }

    const saleData = { id: saleSnap.id, ...(saleSnap.data() as Omit<Sale, 'id'>) };

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      let walletRef = saleData.walletId ? doc(db, 'wallets', saleData.walletId) : null;
      let walletSnap = null;
      let currentWalletBalance = 0;
      if (walletRef) {
        walletSnap = await transaction.get(walletRef);
        if (walletSnap.exists()) {
          currentWalletBalance = safeNum(walletSnap.data().currentBalance);
        }
      }

      let customerRef = saleData.customerId ? doc(db, 'customers', saleData.customerId) : null;
      let customerSnap = null;
      let customerData: Customer | null = null;
      if (customerRef) {
        customerSnap = await transaction.get(customerRef);
        if (customerSnap.exists()) {
          customerData = { id: customerSnap.id, ...(customerSnap.data() as Omit<Customer, 'id'>) };
        }
      }

      const items = saleData.items || [];
      const validItems = items.filter((i) => i.productId && !i.productId.startsWith('init_'));
      const productRefs = validItems.map((i) => doc(db, 'products', i.productId));
      const pSnaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

      // 2. ALL WRITES SECOND
      // Restore product stock
      validItems.forEach((item, idx) => {
        const pSnap = pSnaps[idx];
        if (pSnap.exists()) {
          const curStock = safeNum(pSnap.data().currentStock);
          transaction.update(productRefs[idx], {
            currentStock: curStock + safeNum(item.quantity),
            updatedAt: new Date().toISOString(),
          });

          const stockMoveRef = doc(collection(db, 'stockMovements'));
          transaction.set(stockMoveRef, {
            productId: item.productId,
            productName: item.productName,
            type: 'SALE_CANCELLED',
            quantity: safeNum(item.quantity),
            unit: item.unit,
            referenceId: saleId,
            date: getCurrentDateString(),
            notes: `Stock restored from deleted Sale ${saleData.saleNumber}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });

      // Deduct paid amount from wallet
      if (walletRef && walletSnap && walletSnap.exists() && safeNum(saleData.paidAmount) > 0) {
        transaction.update(walletRef, {
          currentBalance: Math.max(0, currentWalletBalance - safeNum(saleData.paidAmount)),
          updatedAt: new Date().toISOString(),
        });
      }

      // Revert customer statistics
      if (customerRef && customerData) {
        const newTotalSpent = Math.max(0, safeNum(customerData.totalSpent) - safeNum(saleData.total));
        const newTotalOrders = Math.max(0, safeNum(customerData.totalOrders) - 1);
        const newPending = Math.max(0, safeNum(customerData.pendingBalance) - safeNum(saleData.pendingAmount));

        transaction.update(customerRef, {
          totalSpent: newTotalSpent,
          totalOrders: newTotalOrders,
          pendingBalance: newPending,
          updatedAt: new Date().toISOString(),
        });
      }

      // Delete the sale document
      transaction.delete(saleRef);

      // Audit log
      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail,
        action: 'DELETE_SALE',
        recordType: 'sale',
        recordId: saleId,
        oldValue: JSON.stringify({ saleNumber: saleData.saleNumber, total: saleData.total }),
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `sales/${saleId}`);
    throw error;
  }
}

// ----------------------------------------------------
// RETURNS & STOCK RETURN MANAGEMENT
// ----------------------------------------------------
export function subscribeReturns(callback: (returns: SalesReturn[]) => void) {
  const q = query(collection(db, 'returns'), orderBy('date', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const returns: SalesReturn[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SalesReturn, 'id'>),
      }));
      callback(returns);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'returns');
    }
  );
}

export async function recordSalesReturn(params: {
  salesReturn: Omit<SalesReturn, 'id' | 'monthKey' | 'createdAt' | 'updatedAt'>;
  userEmail: string;
}): Promise<string> {
  try {
    const monthKey = getMonthKey(params.salesReturn.date);
    let newReturnId = '';

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const productRef = params.salesReturn.productId ? doc(db, 'products', params.salesReturn.productId) : null;
      let productSnap = null;
      if (productRef) {
        productSnap = await transaction.get(productRef);
      }

      let customerRef = null;
      let customerSnap = null;
      if (params.salesReturn.refundMethod === 'DeductPending' && params.salesReturn.customerId) {
        customerRef = doc(db, 'customers', params.salesReturn.customerId);
        customerSnap = await transaction.get(customerRef);
      }

      let walletRef = null;
      let walletSnap = null;
      if (params.salesReturn.refundMethod === 'WalletRefund' && params.salesReturn.walletId) {
        walletRef = doc(db, 'wallets', params.salesReturn.walletId);
        walletSnap = await transaction.get(walletRef);
      }

      // 2. ALL WRITES SECOND
      const returnRef = doc(collection(db, 'returns'));
      newReturnId = returnRef.id;

      const returnData = {
        ...params.salesReturn,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      transaction.set(returnRef, returnData);

      if (productRef && productSnap && productSnap.exists()) {
        const curStock = productSnap.data().currentStock || 0;
        transaction.update(productRef, {
          currentStock: curStock + params.salesReturn.quantity,
          updatedAt: new Date().toISOString(),
        });
      }

      const stockMoveRef = doc(collection(db, 'stockMovements'));
      transaction.set(stockMoveRef, {
        productId: params.salesReturn.productId,
        productName: params.salesReturn.productName,
        type: 'RETURN',
        quantity: params.salesReturn.quantity,
        unit: params.salesReturn.unit,
        referenceId: returnRef.id,
        date: params.salesReturn.date,
        notes: `Customer Return from ${params.salesReturn.customerName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (customerRef && customerSnap && customerSnap.exists()) {
        const curPending = customerSnap.data().pendingBalance || 0;
        const newPending = Math.max(0, curPending - params.salesReturn.totalAmount);
        transaction.update(customerRef, {
          pendingBalance: newPending,
          updatedAt: new Date().toISOString(),
        });
      } else if (walletRef && walletSnap && walletSnap.exists()) {
        const curBal = walletSnap.data().currentBalance || 0;
        transaction.update(walletRef, {
          currentBalance: curBal - params.salesReturn.totalAmount,
          updatedAt: new Date().toISOString(),
        });
      }

      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail: params.userEmail,
        action: 'CUSTOMER_RETURN',
        recordType: 'returns',
        recordId: returnRef.id,
        newValue: JSON.stringify({
          customer: params.salesReturn.customerName,
          product: params.salesReturn.productName,
          qty: params.salesReturn.quantity,
          total: params.salesReturn.totalAmount,
        }),
        timestamp: new Date().toISOString(),
      });
    });

    return newReturnId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'returns');
    throw error;
  }
}
export function subscribeExpenses(callback: (expenses: Expense[]) => void) {
  const q = query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const expenses: Expense[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Expense, 'id'>),
      }));
      callback(expenses);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    }
  );
}

export async function createExpense(params: {
  expense: Omit<Expense, 'id' | 'monthKey' | 'createdAt' | 'updatedAt'>;
  userEmail: string;
}): Promise<string> {
  try {
    const monthKey = getMonthKey(params.expense.date);
    const resolvedWallet = await getOrResolveWalletDoc(params.expense.walletId, params.expense.walletName);
    const expAmount = safeNum(params.expense.amount);
    let newExpenseId = '';

    await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, 'wallets', resolvedWallet.id);
      const walletSnap = await transaction.get(walletRef);

      const currentBalance = walletSnap.exists() ? safeNum(walletSnap.data().currentBalance) : 0;
      transaction.set(
        walletRef,
        {
          currentBalance: currentBalance - expAmount,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const expenseRef = doc(collection(db, 'expenses'));
      newExpenseId = expenseRef.id;
      transaction.set(expenseRef, {
        ...params.expense,
        walletId: resolvedWallet.id,
        walletName: resolvedWallet.name,
        amount: expAmount,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail: params.userEmail,
        action: 'CREATE_EXPENSE',
        recordType: 'expense',
        recordId: expenseRef.id,
        newValue: JSON.stringify({ category: params.expense.category, amount: expAmount, wallet: resolvedWallet.name }),
        timestamp: new Date().toISOString(),
      });
    });

    return newExpenseId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'expenses');
    throw error;
  }
}

// ----------------------------------------------------
// PAYMENTS (CUSTOMER SETTLEMENTS)
// ----------------------------------------------------
export function subscribePayments(callback: (payments: Payment[]) => void) {
  const q = query(collection(db, 'payments'), orderBy('date', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const payments: Payment[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Payment, 'id'>),
      }));
      callback(payments);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payments');
    }
  );
}

export async function createPayment(params: {
  payment: Omit<Payment, 'id' | 'monthKey' | 'createdAt' | 'updatedAt'>;
  userEmail: string;
}): Promise<string> {
  try {
    const monthKey = getMonthKey(params.payment.date);
    const resolvedWallet = await getOrResolveWalletDoc(params.payment.walletId, params.payment.walletName);
    const payAmount = safeNum(params.payment.amount);
    let newPaymentId = '';

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const walletRef = doc(db, 'wallets', resolvedWallet.id);
      const walletSnap = await transaction.get(walletRef);
      const currentWalletBal = walletSnap.exists() ? safeNum(walletSnap.data().currentBalance) : 0;

      let customerRef = params.payment.customerId && !params.payment.customerId.startsWith('init_')
        ? doc(db, 'customers', params.payment.customerId)
        : null;
      let customerSnap = null;
      if (customerRef) {
        customerSnap = await transaction.get(customerRef);
      }

      // 2. ALL WRITES SECOND
      transaction.set(
        walletRef,
        {
          currentBalance: currentWalletBal + payAmount,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (customerRef && customerSnap && customerSnap.exists()) {
        const currentPending = safeNum(customerSnap.data().pendingBalance);
        transaction.update(customerRef, {
          pendingBalance: Math.max(0, currentPending - payAmount),
          updatedAt: new Date().toISOString(),
        });
      }

      const paymentRef = doc(collection(db, 'payments'));
      newPaymentId = paymentRef.id;
      transaction.set(paymentRef, {
        ...params.payment,
        walletId: resolvedWallet.id,
        walletName: resolvedWallet.name,
        amount: payAmount,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail: params.userEmail,
        action: 'CREATE_PAYMENT',
        recordType: 'payment',
        recordId: paymentRef.id,
        newValue: JSON.stringify({ customer: params.payment.customerName, amount: payAmount, wallet: resolvedWallet.name }),
        timestamp: new Date().toISOString(),
      });
    });

    return newPaymentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'payments');
    throw error;
  }
}

// ----------------------------------------------------
// TRANSFERS (INTERNAL WALLET TRANSFERS)
// ----------------------------------------------------
export function subscribeTransfers(callback: (transfers: Transfer[]) => void) {
  const q = query(collection(db, 'transfers'), orderBy('date', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const transfers: Transfer[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Transfer, 'id'>),
      }));
      callback(transfers);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transfers');
    }
  );
}

export async function createTransfer(params: {
  transfer: Omit<Transfer, 'id' | 'monthKey' | 'createdAt' | 'updatedAt'>;
  userEmail: string;
}): Promise<string> {
  try {
    const monthKey = getMonthKey(params.transfer.date);
    let newTransferId = '';

    await runTransaction(db, async (transaction) => {
      const fromRef = doc(db, 'wallets', params.transfer.fromWalletId);
      const toRef = doc(db, 'wallets', params.transfer.toWalletId);

      const fromSnap = await transaction.get(fromRef);
      const toSnap = await transaction.get(toRef);

      if (!fromSnap.exists() || !toSnap.exists()) {
        throw new Error('One or both wallets were not found');
      }

      const fromBal = fromSnap.data().currentBalance || 0;
      const toBal = toSnap.data().currentBalance || 0;

      // Transfer decreases fromWallet, increases toWallet
      // Total business balance remains identical!
      transaction.update(fromRef, {
        currentBalance: fromBal - params.transfer.amount,
        updatedAt: new Date().toISOString(),
      });

      transaction.update(toRef, {
        currentBalance: toBal + params.transfer.amount,
        updatedAt: new Date().toISOString(),
      });

      const transferRef = doc(collection(db, 'transfers'));
      newTransferId = transferRef.id;
      transaction.set(transferRef, {
        ...params.transfer,
        monthKey,
        createdBy: params.userEmail || 'system',
        userEmail: params.userEmail || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail: params.userEmail,
        action: 'CREATE_TRANSFER',
        recordType: 'transfer',
        recordId: transferRef.id,
        newValue: JSON.stringify({ from: params.transfer.fromWalletName, to: params.transfer.toWalletName, amount: params.transfer.amount }),
        timestamp: new Date().toISOString(),
      });
    });

    return newTransferId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'transfers');
    throw error;
  }
}

// ----------------------------------------------------
// PURCHASES & VENDORS
// ----------------------------------------------------
export function subscribePurchases(callback: (purchases: Purchase[]) => void) {
  const q = query(collection(db, 'purchases'), orderBy('date', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const purchases: Purchase[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Purchase, 'id'>),
      }));
      callback(purchases);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'purchases');
    }
  );
}

export function subscribeVendors(callback: (vendors: Vendor[]) => void) {
  const q = query(collection(db, 'vendors'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const vendors: Vendor[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Vendor, 'id'>),
      }));
      callback(vendors);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    }
  );
}

export async function addVendor(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'vendors'), {
      ...data,
      totalPurchases: data.totalPurchases || 0,
      pendingPayment: data.pendingPayment || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'vendors');
    throw error;
  }
}

export async function createPurchase(params: {
  purchase: Omit<Purchase, 'id' | 'monthKey' | 'createdAt' | 'updatedAt'>;
  userEmail: string;
}): Promise<string> {
  try {
    const monthKey = getMonthKey(params.purchase.date);
    let newPurchaseId = '';

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const productRef = doc(db, 'products', params.purchase.productId);
      const productSnap = await transaction.get(productRef);

      let walletRef = null;
      let walletSnap = null;
      if (params.purchase.paymentStatus === 'Paid' && params.purchase.walletId) {
        walletRef = doc(db, 'wallets', params.purchase.walletId);
        walletSnap = await transaction.get(walletRef);
      }

      let vendorRef = null;
      let vendorSnap = null;
      if (params.purchase.vendorId) {
        vendorRef = doc(db, 'vendors', params.purchase.vendorId);
        vendorSnap = await transaction.get(vendorRef);
      }

      // 2. ALL WRITES SECOND
      if (productSnap.exists()) {
        const pData = productSnap.data();
        const curStock = pData.currentStock || 0;
        const oldCost = pData.purchaseCost || 0;
        const newCost = params.purchase.purchaseCost;

        let costTrend: 'hike' | 'low' | 'stable' = 'stable';
        if (oldCost > 0) {
          if (newCost > oldCost) costTrend = 'hike';
          else if (newCost < oldCost) costTrend = 'low';
        }

        transaction.update(productRef, {
          currentStock: curStock + params.purchase.quantity,
          purchaseCost: newCost,
          previousPurchaseCost: oldCost > 0 ? oldCost : newCost,
          costTrend,
          lastCostChangeDate: params.purchase.date,
          updatedAt: new Date().toISOString(),
        });
      }

      if (walletRef && walletSnap && walletSnap.exists()) {
        const curBal = walletSnap.data().currentBalance || 0;
        transaction.update(walletRef, {
          currentBalance: curBal - params.purchase.totalCost,
          updatedAt: new Date().toISOString(),
        });
      }

      if (vendorRef && vendorSnap && vendorSnap.exists()) {
        const prevPurchases = vendorSnap.data().totalPurchases || 0;
        const prevPending = vendorSnap.data().pendingPayment || 0;
        const pendingAdd = params.purchase.paymentStatus === 'Unpaid' ? params.purchase.totalCost : 0;
        transaction.update(vendorRef, {
          totalPurchases: prevPurchases + params.purchase.totalCost,
          pendingPayment: prevPending + pendingAdd,
          updatedAt: new Date().toISOString(),
        });
      }

      const purchaseRef = doc(collection(db, 'purchases'));
      newPurchaseId = purchaseRef.id;
      transaction.set(purchaseRef, {
        ...params.purchase,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const stockMoveRef = doc(collection(db, 'stockMovements'));
      transaction.set(stockMoveRef, {
        productId: params.purchase.productId,
        productName: params.purchase.productName,
        type: 'PURCHASE',
        quantity: params.purchase.quantity,
        unit: params.purchase.unit,
        referenceId: purchaseRef.id,
        date: params.purchase.date,
        notes: `Purchase from ${params.purchase.vendorName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail: params.userEmail,
        action: 'CREATE_PURCHASE',
        recordType: 'purchase',
        recordId: purchaseRef.id,
        newValue: JSON.stringify({ product: params.purchase.productName, qty: params.purchase.quantity, cost: params.purchase.totalCost }),
        timestamp: new Date().toISOString(),
      });
    });

    return newPurchaseId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'purchases');
    throw error;
  }
}

// ----------------------------------------------------
// STOCK MOVEMENTS
// ----------------------------------------------------
export function subscribeStockMovements(callback: (movements: StockMovement[]) => void) {
  const q = query(collection(db, 'stockMovements'), orderBy('date', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const movements: StockMovement[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StockMovement, 'id'>),
      }));
      callback(movements);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stockMovements');
    }
  );
}

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
export function subscribeSettings(callback: (settings: StoreSettings) => void) {
  const ref = doc(db, 'settings', 'store_config');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...(snap.data() as StoreSettings) });
      } else {
        callback(DEFAULT_SETTINGS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/store_config');
    }
  );
}

export async function updateStoreSettings(data: Partial<StoreSettings>): Promise<void> {
  try {
    const ref = doc(db, 'settings', 'store_config');
    await setDoc(
      ref,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/store_config');
    throw error;
  }
}

// ----------------------------------------------------
// TOUR PRICING & DISCOUNT SETTINGS (Synced with Firestore)
// ----------------------------------------------------
export function subscribeTourPricingSettings(callback: (settings: TourPricingSettings) => void) {
  const tourPricingRef = doc(db, 'settings', 'tourPricing');
  return onSnapshot(
    tourPricingRef,
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          ...DEFAULT_TOUR_PRICING,
          ...data,
          sleeperPrice: Number(data.sleeperPrice || DEFAULT_TOUR_PRICING.sleeperPrice),
          acTrainPrice: Number(data.acTrainPrice || DEFAULT_TOUR_PRICING.acTrainPrice),
          coupleRoomSurcharge: Number(data.coupleRoomSurcharge ?? DEFAULT_TOUR_PRICING.coupleRoomSurcharge),
          child5To7Percent: Number(data.child5To7Percent ?? DEFAULT_TOUR_PRICING.child5To7Percent),
          child8To11Percent: Number(data.child8To11Percent ?? DEFAULT_TOUR_PRICING.child8To11Percent),
        });
      } else {
        // Fallback: check if store_config has tourPricing
        try {
          const storeSnap = await getDoc(doc(db, 'settings', 'store_config'));
          if (storeSnap.exists() && storeSnap.data().tourPricing) {
            const data = storeSnap.data().tourPricing;
            callback({
              ...DEFAULT_TOUR_PRICING,
              ...data,
              sleeperPrice: Number(data.sleeperPrice || DEFAULT_TOUR_PRICING.sleeperPrice),
              acTrainPrice: Number(data.acTrainPrice || DEFAULT_TOUR_PRICING.acTrainPrice),
              coupleRoomSurcharge: Number(data.coupleRoomSurcharge ?? DEFAULT_TOUR_PRICING.coupleRoomSurcharge),
              child5To7Percent: Number(data.child5To7Percent ?? DEFAULT_TOUR_PRICING.child5To7Percent),
              child8To11Percent: Number(data.child8To11Percent ?? DEFAULT_TOUR_PRICING.child8To11Percent),
            });
            return;
          }
        } catch {
          // Ignore
        }
        callback(DEFAULT_TOUR_PRICING);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/tourPricing');
      callback(DEFAULT_TOUR_PRICING);
    }
  );
}

export async function updateTourPricingSettings(
  data: Partial<TourPricingSettings>,
  userEmail?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const cleanData = sanitizeForFirestore({
      ...data,
      updatedAt: now,
      updatedBy: userEmail || 'system',
    });

    // 1. Save in settings/tourPricing
    const tourPricingRef = doc(db, 'settings', 'tourPricing');
    await setDoc(tourPricingRef, cleanData, { merge: true });

    // 2. Also merge into settings/store_config.tourPricing without deleting anything
    const storeConfigRef = doc(db, 'settings', 'store_config');
    await setDoc(
      storeConfigRef,
      {
        tourPricing: cleanData,
        updatedAt: now,
      },
      { merge: true }
    );

    // Audit log
    if (userEmail) {
      await addDoc(collection(db, 'auditLogs'), {
        userEmail,
        action: 'UPDATE_TOUR_PRICING_SETTINGS',
        recordType: 'settings',
        recordId: 'tourPricing',
        newValue: JSON.stringify(cleanData),
        timestamp: now,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/tourPricing');
    throw error;
  }
}

// ----------------------------------------------------
// SANZARI TOURISM: TOUR BATCHES (Tour Folders / Dates)
// ----------------------------------------------------
export function subscribeTourBatches(callback: (batches: TourBatch[]) => void) {
  const q = query(collection(db, 'tourBatches'));
  return onSnapshot(
    q,
    (snap) => {
      const batches: TourBatch[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TourBatch, 'id'>),
      }));
      batches.sort((a, b) => (a.departureDate || '').localeCompare(b.departureDate || ''));
      callback(batches);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tourBatches');
    }
  );
}

export async function addTourBatch(
  batchData: Omit<TourBatch, 'id' | 'createdAt' | 'updatedAt' | 'bookedSeats'>,
  userEmail: string
): Promise<string> {
  try {
    const batchRef = doc(collection(db, 'tourBatches'));
    const monthKey = getMonthKey(batchData.departureDate);
    
    await setDoc(batchRef, sanitizeForFirestore({
      ...batchData,
      notes: batchData.notes || '',
      bookedSeats: 0,
      monthKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Audit log
    await addDoc(collection(db, 'auditLogs'), sanitizeForFirestore({
      userEmail,
      action: 'CREATE_TOUR_BATCH',
      recordType: 'tourBatches',
      recordId: batchRef.id,
      newValue: JSON.stringify({ title: batchData.title, departureDate: batchData.departureDate }),
      timestamp: new Date().toISOString(),
    }));

    return batchRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'tourBatches');
    throw error;
  }
}

export async function updateTourBatch(
  id: string,
  batchData: Partial<TourBatch>,
  userEmail: string
): Promise<void> {
  try {
    const batchRef = doc(db, 'tourBatches', id);
    await updateDoc(batchRef, sanitizeForFirestore({
      ...batchData,
      updatedAt: new Date().toISOString(),
    }));

    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'UPDATE_TOUR_BATCH',
      recordType: 'tourBatches',
      recordId: id,
      newValue: JSON.stringify(batchData),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tourBatches/${id}`);
    throw error;
  }
}

export async function deleteTourBatch(id: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tourBatches', id));
    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'DELETE_TOUR_BATCH',
      recordType: 'tourBatches',
      recordId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tourBatches/${id}`);
    throw error;
  }
}

// ----------------------------------------------------
// SANZARI TOURISM: TOUR BOOKINGS
// ----------------------------------------------------
export function subscribeTourBookings(callback: (bookings: TourBooking[]) => void) {
  const q = query(collection(db, 'tourBookings'));
  return onSnapshot(
    q,
    (snap) => {
      const bookings: TourBooking[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TourBooking, 'id'>),
      }));
      // Safe client-side sorting: newest created/tour date first
      bookings.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.tourDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.tourDate || 0).getTime();
        return timeB - timeA;
      });
      callback(bookings);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tourBookings');
    }
  );
}

export async function addTourBooking(
  bookingData: Omit<TourBooking, 'id' | 'createdAt' | 'updatedAt' | 'pendingAmount' | 'paymentStatus'> & { bookingNumber?: string; balanceDue?: number },
  userEmail: string
): Promise<string> {
  try {
    const bookingRef = doc(collection(db, 'tourBookings'));
    const bookingNumber = bookingData.bookingNumber || `SZ-TOUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const pendingAmount = Math.max(0, Number(bookingData.totalAmount) - Number(bookingData.advancePaid || 0));
    const balanceDue = pendingAmount;
    const paymentStatus =
      pendingAmount === 0 ? 'Paid' : Number(bookingData.advancePaid) > 0 ? 'Partial' : 'Due';
    const monthKey = getMonthKey(bookingData.tourDate);

    // Resolve target wallet ID outside transaction
    let targetWalletId = '';
    if (Number(bookingData.advancePaid) > 0 && bookingData.walletName) {
      try {
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const targetWallet = walletsSnap.docs.find(
          (w) => (w.data().name || '').toLowerCase() === (bookingData.walletName || '').toLowerCase()
        );
        if (targetWallet) targetWalletId = targetWallet.id;
      } catch {
        // Fallback
      }
    }

    const cleanPayload = sanitizeForFirestore({
      ...bookingData,
      bookingNumber,
      monthKey,
      pendingAmount,
      balanceDue,
      paymentStatus,
      bookingStatus: bookingData.bookingStatus || 'Confirmed',
      packageCategory: bookingData.packageCategory || 'Deluxe',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      await runTransaction(db, async (transaction) => {
        // READS FIRST
        let batchRef = null;
        let batchSnap = null;
        if (bookingData.tourBatchId) {
          batchRef = doc(db, 'tourBatches', bookingData.tourBatchId);
          batchSnap = await transaction.get(batchRef);
        }

        let wRef = null;
        let wSnap = null;
        if (targetWalletId) {
          wRef = doc(db, 'wallets', targetWalletId);
          wSnap = await transaction.get(wRef);
        }

        // WRITES SECOND
        if (batchRef && batchSnap && batchSnap.exists()) {
          const currentBooked = Number(batchSnap.data().bookedSeats || 0);
          const newBooked = currentBooked + Number(bookingData.membersCount || 1);
          transaction.update(batchRef, {
            bookedSeats: newBooked,
            updatedAt: new Date().toISOString(),
          });
        }

        if (wRef && wSnap && wSnap.exists()) {
          const currentBal = Number(wSnap.data().currentBalance || 0);
          transaction.update(wRef, {
            currentBalance: currentBal + Number(bookingData.advancePaid),
            updatedAt: new Date().toISOString(),
          });
        }

        transaction.set(bookingRef, cleanPayload);
      });
    } catch (txErr) {
      console.warn('Transaction failed, saving booking directly with setDoc fallback:', txErr);
      // Guarantee booking is NEVER lost: direct setDoc
      await setDoc(bookingRef, cleanPayload);

      // Best effort update for batch & wallet
      if (bookingData.tourBatchId) {
        try {
          const bRef = doc(db, 'tourBatches', bookingData.tourBatchId);
          const bSnap = await getDoc(bRef);
          if (bSnap.exists()) {
            await updateDoc(bRef, {
              bookedSeats: Number(bSnap.data().bookedSeats || 0) + Number(bookingData.membersCount || 1),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('Batch update fallback error:', e);
        }
      }
      if (targetWalletId && Number(bookingData.advancePaid) > 0) {
        try {
          const wRef = doc(db, 'wallets', targetWalletId);
          const wSnap = await getDoc(wRef);
          if (wSnap.exists()) {
            await updateDoc(wRef, {
              currentBalance: Number(wSnap.data().currentBalance || 0) + Number(bookingData.advancePaid),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('Wallet balance fallback error:', e);
        }
      }
    }

    // Audit log
    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'CREATE_TOUR_BOOKING',
      recordType: 'tourBookings',
      recordId: bookingRef.id,
      newValue: JSON.stringify({ bookingNumber, customer: bookingData.customerName, total: bookingData.totalAmount }),
      timestamp: new Date().toISOString(),
    });

    return bookingRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'tourBookings');
    throw error;
  }
}

export async function recordTourBookingPayment(params: {
  bookingId: string;
  amount: number;
  walletName: string;
  paymentMethod: PaymentMethod;
  paymentMode: TourPaymentMode;
  notes?: string;
  userEmail: string;
}): Promise<void> {
  try {
    let targetWalletId = '';
    if (params.walletName) {
      try {
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const targetWallet = walletsSnap.docs.find(
          (w) => (w.data().name || '').toLowerCase() === (params.walletName || '').toLowerCase()
        );
        if (targetWallet) targetWalletId = targetWallet.id;
      } catch {
        // Fallback
      }
    }

    await runTransaction(db, async (transaction) => {
      // READS FIRST
      const bookingRef = doc(db, 'tourBookings', params.bookingId);
      const bSnap = await transaction.get(bookingRef);
      if (!bSnap.exists()) throw new Error('Tour booking not found');

      let wRef = null;
      let wSnap = null;
      if (targetWalletId) {
        wRef = doc(db, 'wallets', targetWalletId);
        wSnap = await transaction.get(wRef);
      }

      // WRITES SECOND
      const bData = bSnap.data() as TourBooking;
      const newAdvance = Number(bData.advancePaid || 0) + Number(params.amount);
      const newPending = Math.max(0, Number(bData.totalAmount || 0) - newAdvance);
      const newPaymentStatus = newPending === 0 ? 'Paid' : 'Partial';

      transaction.update(bookingRef, {
        advancePaid: newAdvance,
        pendingAmount: newPending,
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString(),
      });

      if (wRef && wSnap && wSnap.exists()) {
        const currentBal = Number(wSnap.data().currentBalance || 0);
        transaction.update(wRef, {
          currentBalance: currentBal + Number(params.amount),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    await addDoc(collection(db, 'auditLogs'), {
      userEmail: params.userEmail,
      action: 'TOUR_PAYMENT_COLLECTED',
      recordType: 'tourBookings',
      recordId: params.bookingId,
      newValue: JSON.stringify({ amount: params.amount, wallet: params.walletName }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tourBookings/${params.bookingId}/payment`);
    throw error;
  }
}

export async function updateTourBooking(
  id: string,
  bookingData: Partial<TourBooking>,
  userEmail: string
): Promise<void> {
  try {
    const bookingRef = doc(db, 'tourBookings', id);
    const bSnap = await getDoc(bookingRef);
    if (!bSnap.exists()) {
      throw new Error('Tour booking not found');
    }
    const existing = bSnap.data() as TourBooking;

    const totalAmount =
      bookingData.totalAmount !== undefined ? Number(bookingData.totalAmount) : Number(existing.totalAmount || 0);
    const advancePaid =
      bookingData.advancePaid !== undefined ? Number(bookingData.advancePaid) : Number(existing.advancePaid || 0);
    const pendingAmount = Math.max(0, totalAmount - advancePaid);
    const paymentStatus = pendingAmount === 0 ? 'Paid' : advancePaid > 0 ? 'Partial' : 'Pending';

    const oldAdvance = Number(existing.advancePaid || 0);
    const diffAdvance = advancePaid - oldAdvance;

    let targetWalletRef = null;
    if (diffAdvance !== 0 && (bookingData.walletName || existing.walletName)) {
      const targetWalletName = bookingData.walletName || existing.walletName;
      try {
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const targetWallet = walletsSnap.docs.find(
          (w) => (w.data().name || '').toLowerCase() === (targetWalletName || '').toLowerCase()
        );
        if (targetWallet) {
          targetWalletRef = doc(db, 'wallets', targetWallet.id);
        }
      } catch {
        // Fallback
      }
    }

    const oldBatchId = existing.tourBatchId;
    const newBatchId = bookingData.tourBatchId !== undefined ? bookingData.tourBatchId : existing.tourBatchId;
    const oldMembers = Number(existing.membersCount || 1);
    const newMembers = bookingData.membersCount !== undefined ? Number(bookingData.membersCount) : oldMembers;

    const oldBatchRef = oldBatchId ? doc(db, 'tourBatches', oldBatchId) : null;
    const newBatchRef = newBatchId && newBatchId !== oldBatchId ? doc(db, 'tourBatches', newBatchId) : null;

      const cleanPayload = sanitizeForFirestore({
        ...bookingData,
        pendingAmount,
        balanceDue: pendingAmount,
        paymentStatus,
        updatedAt: new Date().toISOString(),
      });

      try {
        await runTransaction(db, async (transaction) => {
          let wSnap = null;
          if (targetWalletRef) {
            wSnap = await transaction.get(targetWalletRef);
          }

          let oldBatchSnap = null;
          if (oldBatchRef) {
            oldBatchSnap = await transaction.get(oldBatchRef);
          }

          let newBatchSnap = null;
          if (newBatchRef) {
            newBatchSnap = await transaction.get(newBatchRef);
          }

          // WRITES SECOND
          if (targetWalletRef && wSnap && wSnap.exists()) {
            const currentBal = Number(wSnap.data().currentBalance || 0);
            transaction.update(targetWalletRef, {
              currentBalance: currentBal + diffAdvance,
              updatedAt: new Date().toISOString(),
            });
          }

          if (oldBatchRef && oldBatchSnap && oldBatchSnap.exists()) {
            if (oldBatchId === newBatchId && oldMembers !== newMembers) {
              const diffSeats = newMembers - oldMembers;
              const booked = Number(oldBatchSnap.data().bookedSeats || 0);
              transaction.update(oldBatchRef, {
                bookedSeats: Math.max(0, booked + diffSeats),
                updatedAt: new Date().toISOString(),
              });
            } else if (oldBatchId !== newBatchId) {
              const booked = Number(oldBatchSnap.data().bookedSeats || 0);
              transaction.update(oldBatchRef, {
                bookedSeats: Math.max(0, booked - oldMembers),
                updatedAt: new Date().toISOString(),
              });
            }
          }

          if (newBatchRef && newBatchSnap && newBatchSnap.exists() && oldBatchId !== newBatchId) {
            const booked = Number(newBatchSnap.data().bookedSeats || 0);
            transaction.update(newBatchRef, {
              bookedSeats: booked + newMembers,
              updatedAt: new Date().toISOString(),
            });
          }

          transaction.update(bookingRef, cleanPayload);
        });
      } catch (txErr) {
        console.warn('Transaction update failed, using direct updateDoc fallback:', txErr);
        await updateDoc(bookingRef, cleanPayload);
      }

      await addDoc(collection(db, 'auditLogs'), {
        userEmail,
        action: 'UPDATE_TOUR_BOOKING',
        recordType: 'tourBookings',
        recordId: id,
        newValue: JSON.stringify(bookingData),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tourBookings/${id}`);
      throw error;
    }
  }

export async function deleteTourBooking(id: string, userEmail: string): Promise<void> {
  if (!id) return;
  try {
    const bookingRef = doc(db, 'tourBookings', id);
    const bSnap = await getDoc(bookingRef);

    if (bSnap.exists()) {
      const existing = bSnap.data() as TourBooking;

      // 1. Adjust batch seats (best effort)
      if (existing.tourBatchId) {
        try {
          const batchRef = doc(db, 'tourBatches', existing.tourBatchId);
          const batchSnap = await getDoc(batchRef);
          if (batchSnap.exists()) {
            const booked = Number(batchSnap.data().bookedSeats || 0);
            await updateDoc(batchRef, {
              bookedSeats: Math.max(0, booked - Number(existing.membersCount || 1)),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('Batch seat adjustment error on delete:', e);
        }
      }

      // 2. Adjust wallet balance (best effort)
      if (Number(existing.advancePaid || 0) > 0 && existing.walletName) {
        try {
          const walletsSnap = await getDocs(collection(db, 'wallets'));
          const targetWallet = walletsSnap.docs.find(
            (w) => (w.data().name || '').toLowerCase() === (existing.walletName || '').toLowerCase()
          );
          if (targetWallet) {
            const wRef = doc(db, 'wallets', targetWallet.id);
            const wSnap = await getDoc(wRef);
            if (wSnap.exists()) {
              const currentBal = Number(wSnap.data().currentBalance || 0);
              await updateDoc(wRef, {
                currentBalance: Math.max(0, currentBal - Number(existing.advancePaid || 0)),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        } catch (e) {
          console.warn('Wallet adjustment error on delete:', e);
        }
      }
    }

    // 3. Delete booking document directly
    await deleteDoc(bookingRef);

    // 4. Audit Log (best effort)
    try {
      await addDoc(collection(db, 'auditLogs'), {
        userEmail: userEmail || 'admin@sanzari.com',
        action: 'DELETE_TOUR_BOOKING',
        recordType: 'tourBookings',
        recordId: id,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  } catch (error) {
    console.error('deleteTourBooking failed:', error);
    handleFirestoreError(error, OperationType.DELETE, `tourBookings/${id}`);
    throw error;
  }
}

// ----------------------------------------------------
// SANZARI TOURISM: TOUR EXPENSES
// ----------------------------------------------------
export function subscribeTourExpenses(callback: (expenses: TourExpense[]) => void) {
  const q = query(collection(db, 'tourExpenses'), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const expenses: TourExpense[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TourExpense, 'id'>),
      }));
      callback(expenses);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tourExpenses');
    }
  );
}

export async function addTourExpense(
  expenseData: Omit<TourExpense, 'id' | 'createdAt' | 'updatedAt'>,
  userEmail: string
): Promise<string> {
  try {
    const expenseRef = doc(collection(db, 'tourExpenses'));
    const monthKey = getMonthKey(expenseData.date);

    await runTransaction(db, async (transaction) => {
      // Deduct from wallet
      if (expenseData.walletName) {
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const targetWallet = walletsSnap.docs.find(
          (w) => (w.data().name || '').toLowerCase() === (expenseData.walletName || '').toLowerCase()
        );
        if (targetWallet) {
          const wRef = doc(db, 'wallets', targetWallet.id);
          const wSnap = await transaction.get(wRef);
          if (wSnap.exists()) {
            const currentBal = Number(wSnap.data().currentBalance || 0);
            transaction.update(wRef, {
              currentBalance: currentBal - Number(expenseData.amount),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      transaction.set(expenseRef, sanitizeForFirestore({
        ...expenseData,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'CREATE_TOUR_EXPENSE',
      recordType: 'tourExpenses',
      recordId: expenseRef.id,
      newValue: JSON.stringify(expenseData),
      timestamp: new Date().toISOString(),
    });

    return expenseRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'tourExpenses');
    throw error;
  }
}

export async function deleteTourExpense(id: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tourExpenses', id));
    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'DELETE_TOUR_EXPENSE',
      recordType: 'tourExpenses',
      recordId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tourExpenses/${id}`);
    throw error;
  }
}

// ----------------------------------------------------
// GENERIC TRANSACTION EDIT & UPDATE FUNCTION
// ----------------------------------------------------
export async function updateTransactionRecord(params: {
  id: string;
  type: 'sale' | 'expense' | 'payment' | 'purchase' | 'transfer' | 'tourBooking' | 'tourExpense';
  updates: {
    amount?: number;
    date?: string;
    walletId?: string;
    walletName?: string;
    notes?: string;
    description?: string;
    category?: string;
    customerName?: string;
    vendorName?: string;
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
    fromWalletId?: string;
    fromWalletName?: string;
    toWalletId?: string;
    toWalletName?: string;
  };
  userEmail: string;
}): Promise<void> {
  try {
    const { id, type, updates, userEmail } = params;
    const updatedAt = new Date().toISOString();

    if (type === 'expense') {
      const ref = doc(db, 'expenses', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const oldData = snap.data();
        const oldAmt = Number(oldData.amount || 0);
        const newAmt = updates.amount !== undefined ? Number(updates.amount) : oldAmt;
        const oldWalletId = oldData.walletId;
        const newWalletId = updates.walletId || oldWalletId;

        // Adjust wallet balance if amount changed on same wallet
        if (oldWalletId && oldWalletId === newWalletId && newAmt !== oldAmt) {
          const diff = newAmt - oldAmt;
          const wRef = doc(db, 'wallets', oldWalletId);
          const wSnap = await getDoc(wRef);
          if (wSnap.exists()) {
            const curBal = Number(wSnap.data().currentBalance || 0);
            await updateDoc(wRef, { currentBalance: curBal - diff, updatedAt });
          }
        }

        await updateDoc(ref, {
          ...(updates.amount !== undefined && { amount: Number(updates.amount) }),
          ...(updates.date && { date: updates.date, monthKey: getMonthKey(updates.date) }),
          ...(updates.walletId && { walletId: updates.walletId }),
          ...(updates.walletName && { walletName: updates.walletName }),
          ...(updates.category && { category: updates.category as ExpenseCategory }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          ...(updates.description !== undefined && { description: updates.description }),
          updatedAt,
        });
      }
    } else if (type === 'payment') {
      const ref = doc(db, 'payments', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const oldData = snap.data();
        const oldAmt = Number(oldData.amount || 0);
        const newAmt = updates.amount !== undefined ? Number(updates.amount) : oldAmt;
        const oldWalletId = oldData.walletId;

        if (oldWalletId && newAmt !== oldAmt) {
          const diff = newAmt - oldAmt;
          const wRef = doc(db, 'wallets', oldWalletId);
          const wSnap = await getDoc(wRef);
          if (wSnap.exists()) {
            const curBal = Number(wSnap.data().currentBalance || 0);
            await updateDoc(wRef, { currentBalance: curBal + diff, updatedAt });
          }
        }

        await updateDoc(ref, {
          ...(updates.amount !== undefined && { amount: Number(updates.amount) }),
          ...(updates.date && { date: updates.date, monthKey: getMonthKey(updates.date) }),
          ...(updates.walletId && { walletId: updates.walletId }),
          ...(updates.walletName && { walletName: updates.walletName }),
          ...(updates.customerName && { customerName: updates.customerName }),
          ...(updates.paymentMethod && { paymentMethod: updates.paymentMethod }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          updatedAt,
        });
      }
    } else if (type === 'transfer') {
      const ref = doc(db, 'transfers', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const oldData = snap.data();
        const oldAmt = Number(oldData.amount || 0);
        const newAmt = updates.amount !== undefined ? Number(updates.amount) : oldAmt;
        const fromWId = oldData.fromWalletId;
        const toWId = oldData.toWalletId;

        if (newAmt !== oldAmt && fromWId && toWId) {
          const diff = newAmt - oldAmt;
          const fromRef = doc(db, 'wallets', fromWId);
          const toRef = doc(db, 'wallets', toWId);

          const fromSnap = await getDoc(fromRef);
          const toSnap = await getDoc(toRef);

          if (fromSnap.exists()) {
            const curBal = Number(fromSnap.data().currentBalance || 0);
            await updateDoc(fromRef, { currentBalance: curBal - diff, updatedAt });
          }
          if (toSnap.exists()) {
            const curBal = Number(toSnap.data().currentBalance || 0);
            await updateDoc(toRef, { currentBalance: curBal + diff, updatedAt });
          }
        }

        await updateDoc(ref, {
          ...(updates.amount !== undefined && { amount: Number(updates.amount) }),
          ...(updates.date && { date: updates.date, monthKey: getMonthKey(updates.date) }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          ...(updates.fromWalletId && { fromWalletId: updates.fromWalletId }),
          ...(updates.fromWalletName && { fromWalletName: updates.fromWalletName }),
          ...(updates.toWalletId && { toWalletId: updates.toWalletId }),
          ...(updates.toWalletName && { toWalletName: updates.toWalletName }),
          updatedAt,
        });
      }
    } else if (type === 'sale') {
      const ref = doc(db, 'sales', id);
      await updateDoc(ref, {
        ...(updates.date && { date: updates.date, monthKey: getMonthKey(updates.date) }),
        ...(updates.customerName && { customerName: updates.customerName }),
        ...(updates.walletId && { walletId: updates.walletId }),
        ...(updates.walletName && { walletName: updates.walletName }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.paymentMethod && { paymentMethod: updates.paymentMethod }),
        ...(updates.paymentStatus && { paymentStatus: updates.paymentStatus }),
        updatedAt,
      });
    } else if (type === 'purchase') {
      const ref = doc(db, 'purchases', id);
      await updateDoc(ref, {
        ...(updates.date && { date: updates.date, monthKey: getMonthKey(updates.date) }),
        ...(updates.vendorName && { vendorName: updates.vendorName }),
        ...(updates.amount !== undefined && { totalCost: Number(updates.amount) }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.paymentStatus && { paymentStatus: updates.paymentStatus as 'Paid' | 'Unpaid' | 'Partial' }),
        updatedAt,
      });
    } else if (type === 'tourBooking') {
      const ref = doc(db, 'tourBookings', id);
      await updateDoc(ref, {
        ...(updates.date && { tourDate: updates.date, monthKey: getMonthKey(updates.date) }),
        ...(updates.customerName && { customerName: updates.customerName }),
        ...(updates.walletName && { walletName: updates.walletName }),
        ...(updates.amount !== undefined && { advancePaid: Number(updates.amount) }),
        ...(updates.notes !== undefined && { specialNotes: updates.notes }),
        ...(updates.paymentStatus && { paymentStatus: updates.paymentStatus }),
        updatedAt,
      });
    } else if (type === 'tourExpense') {
      const ref = doc(db, 'tourExpenses', id);
      await updateDoc(ref, {
        ...(updates.amount !== undefined && { amount: Number(updates.amount) }),
        ...(updates.date && { date: updates.date, monthKey: getMonthKey(updates.date) }),
        ...(updates.walletName && { walletName: updates.walletName }),
        ...(updates.category && { category: updates.category as any }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.description !== undefined && { description: updates.description }),
        updatedAt,
      });
    }

    // Log audit
    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: `EDIT_TRANSACTION_${type.toUpperCase()}`,
      recordType: type,
      recordId: id,
      newValue: JSON.stringify(updates),
      timestamp: updatedAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${params.type}/${params.id}`);
    throw error;
  }
}

// ----------------------------------------------------
// SANZARI TOURISM: TOUR INQUIRIES
// ----------------------------------------------------
export function subscribeTourInquiries(callback: (inquiries: TourInquiry[]) => void) {
  const q = query(collection(db, 'tourInquiries'));
  return onSnapshot(
    q,
    (snap) => {
      const inquiries: TourInquiry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TourInquiry, 'id'>),
      }));
      inquiries.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.followUpDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.followUpDate || 0).getTime();
        return timeB - timeA;
      });
      callback(inquiries);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tourInquiries');
    }
  );
}

export async function addTourInquiry(
  inquiryData: Omit<TourInquiry, 'id' | 'inquiryNumber' | 'createdAt' | 'updatedAt'>,
  userEmail: string
): Promise<string> {
  try {
    const inquiryRef = doc(collection(db, 'tourInquiries'));
    const inquiryNumber = `INQ-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const record: Omit<TourInquiry, 'id'> = {
      ...inquiryData,
      inquiryNumber,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(inquiryRef, sanitizeForFirestore(record));

    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'ADD_TOUR_INQUIRY',
      recordType: 'tourInquiries',
      recordId: inquiryRef.id,
      newValue: JSON.stringify(record),
      timestamp: now,
    });

    return inquiryRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'tourInquiries');
    throw error;
  }
}

export async function updateTourInquiry(
  id: string,
  updates: Partial<TourInquiry>,
  userEmail: string
): Promise<void> {
  try {
    const ref = doc(db, 'tourInquiries', id);
    const now = new Date().toISOString();
    await updateDoc(ref, sanitizeForFirestore({
      ...updates,
      updatedAt: now,
    }));

    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'UPDATE_TOUR_INQUIRY',
      recordType: 'tourInquiries',
      recordId: id,
      newValue: JSON.stringify(updates),
      timestamp: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tourInquiries/${id}`);
    throw error;
  }
}

export async function deleteTourInquiry(id: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tourInquiries', id));
    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'DELETE_TOUR_INQUIRY',
      recordType: 'tourInquiries',
      recordId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tourInquiries/${id}`);
    throw error;
  }
}

// ----------------------------------------------------
// SANZARI TOURISM: CUSTOM TOUR PACKAGES
// ----------------------------------------------------
export function subscribeCustomTourPackages(callback: (packages: CustomTourPackage[]) => void) {
  const q = query(collection(db, 'customTourPackages'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const pkgs: CustomTourPackage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CustomTourPackage, 'id'>),
      }));
      callback(pkgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customTourPackages');
    }
  );
}

export async function addCustomTourPackage(
  pkgData: Omit<CustomTourPackage, 'id' | 'createdAt' | 'updatedAt'>,
  userEmail: string
): Promise<string> {
  try {
    const pkgRef = doc(collection(db, 'customTourPackages'));
    const now = new Date().toISOString();
    const record: Omit<CustomTourPackage, 'id'> = {
      ...pkgData,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(pkgRef, sanitizeForFirestore(record));

    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'ADD_CUSTOM_TOUR_PACKAGE',
      recordType: 'customTourPackages',
      recordId: pkgRef.id,
      newValue: JSON.stringify(record),
      timestamp: now,
    });

    return pkgRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'customTourPackages');
    throw error;
  }
}

export async function updateCustomTourPackage(
  id: string,
  updates: Partial<CustomTourPackage>,
  userEmail: string
): Promise<void> {
  try {
    const ref = doc(db, 'customTourPackages', id);
    const now = new Date().toISOString();
    await updateDoc(ref, sanitizeForFirestore({
      ...updates,
      updatedAt: now,
    }));

    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'UPDATE_CUSTOM_TOUR_PACKAGE',
      recordType: 'customTourPackages',
      recordId: id,
      newValue: JSON.stringify(updates),
      timestamp: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customTourPackages/${id}`);
    throw error;
  }
}

export async function deleteCustomTourPackage(id: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'customTourPackages', id));
    await addDoc(collection(db, 'auditLogs'), {
      userEmail,
      action: 'DELETE_CUSTOM_TOUR_PACKAGE',
      recordType: 'customTourPackages',
      recordId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `customTourPackages/${id}`);
    throw error;
  }
}

