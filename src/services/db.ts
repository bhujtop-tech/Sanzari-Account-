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
} from '../types';
import { INITIAL_WALLETS, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, DEFAULT_SETTINGS } from '../data/initialData';

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

export async function initializeStoreDataIfEmpty(): Promise<boolean> {
  try {
    // Quick check: If store is already initialized locally, return immediately (0ms)
    if (localStorage.getItem('sanzari_store_initialized_v2') === 'true') {
      return false;
    }

    const currentDate = getCurrentDateString();
    const currentMonth = getMonthKey(currentDate);

    // Fetch snapshot checks in parallel for ultra-fast response
    const [walletsSnap, productsSnap, customersSnap, salesSnap, expensesSnap] = await Promise.all([
      getDocs(collection(db, 'wallets')),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'sales')),
      getDocs(collection(db, 'expenses')),
    ]);

    // 1. Wallets
    if (walletsSnap.empty) {
      console.log('Seeding initial wallets...');
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
    }

    // 2. Products
    if (productsSnap.empty) {
      console.log('Seeding initial products...');
      const batch = writeBatch(db);
      for (const p of INITIAL_PRODUCTS) {
        const pRef = doc(collection(db, 'products'));
        batch.set(pRef, {
          ...p,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Stock movement
        const mRef = doc(collection(db, 'stockMovements'));
        batch.set(mRef, {
          productId: pRef.id,
          productName: p.name,
          type: 'OPENING',
          quantity: p.currentStock,
          unit: p.unit,
          date: currentDate,
          notes: 'Opening physical stock setup',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    }

    // 3. Customers
    if (customersSnap.empty) {
      console.log('Seeding initial customers...');
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
    }

    // 4. Sales
    if (salesSnap.empty) {
      console.log('Seeding initial sales...');
      const batch = writeBatch(db);

      const sale1Ref = doc(collection(db, 'sales'));
      batch.set(sale1Ref, {
        saleNumber: 'SALE-1001',
        customerName: 'Aslam Bhai',
        items: [
          {
            productName: 'Keser (Pure Kashmiri Saffron)',
            quantity: 2,
            unit: '1g',
            sellingPrice: 500,
            purchaseCost: 350,
            lineTotal: 1000,
          },
          {
            productName: 'Mamra Badam',
            quantity: 2,
            unit: 'kg',
            sellingPrice: 2400,
            purchaseCost: 1800,
            lineTotal: 4800,
          },
        ],
        subtotal: 5800,
        discount: 0,
        total: 5800,
        paidAmount: 3300,
        pendingAmount: 2500,
        paymentStatus: 'Partial',
        paymentMethod: 'UPI',
        walletName: 'Rizwan',
        date: currentDate,
        monthKey: currentMonth,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const sale2Ref = doc(collection(db, 'sales'));
      batch.set(sale2Ref, {
        saleNumber: 'SALE-1002',
        customerName: 'Ahmed Khan',
        items: [
          {
            productName: 'Akhrot (Kashmiri Walnuts)',
            quantity: 3,
            unit: 'kg',
            sellingPrice: 800,
            purchaseCost: 550,
            lineTotal: 2400,
          },
          {
            productName: 'Crane bery (Cranberry)',
            quantity: 2,
            unit: 'kg',
            sellingPrice: 750,
            purchaseCost: 500,
            lineTotal: 1500,
          },
        ],
        subtotal: 3900,
        discount: 0,
        total: 3900,
        paidAmount: 3900,
        pendingAmount: 0,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        walletName: 'Avesh',
        date: currentDate,
        monthKey: currentMonth,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
    }

    // 5. Expenses
    if (expensesSnap.empty) {
      console.log('Seeding initial expenses...');
      const batch = writeBatch(db);

      const exp1Ref = doc(collection(db, 'expenses'));
      batch.set(exp1Ref, {
        category: 'Transport & Logistics',
        amount: 450,
        description: 'Dryfruit Parcel Transport to Surat',
        walletName: 'Rizwan',
        date: currentDate,
        monthKey: currentMonth,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
    }

    // Mark store initialized locally so subsequent app loads skip network checks
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
export function subscribeWallets(callback: (wallets: Wallet[]) => void) {
  const q = query(collection(db, 'wallets'));
  return onSnapshot(
    q,
    (snap) => {
      const rawWallets: Wallet[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Wallet, 'id'>),
      }));

      // Deduplicate by normalized wallet name
      const uniqueMap = new Map<string, Wallet>();
      rawWallets.forEach((w) => {
        const key = (w.name || '').toLowerCase().trim();
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

    let createdSale: Sale | null = null;

    await runTransaction(db, async (transaction) => {
      // 1. Fetch wallet
      const walletRef = doc(db, 'wallets', params.sale.walletId);
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) throw new Error('Selected Wallet not found');
      const currentWalletBalance = walletSnap.data().currentBalance || 0;

      // 2. Fetch customer (if existing)
      let customerRef = params.sale.customerId ? doc(db, 'customers', params.sale.customerId) : null;
      let customerData: Customer | null = null;
      if (customerRef) {
        const custSnap = await transaction.get(customerRef);
        if (custSnap.exists()) {
          customerData = { id: custSnap.id, ...(custSnap.data() as Omit<Customer, 'id'>) };
        }
      }

      // If customer doesn't exist yet, create a new customer doc ref
      if (!customerRef || !customerData) {
        customerRef = doc(collection(db, 'customers'));
      }

      // 3. Update customer stats
      const prevTotalSpent = customerData ? customerData.totalSpent : 0;
      const prevTotalOrders = customerData ? customerData.totalOrders : 0;
      const prevPending = customerData ? customerData.pendingBalance : 0;

      const newTotalSpent = prevTotalSpent + params.sale.total;
      const newTotalOrders = prevTotalOrders + 1;
      const newPending = prevPending + params.sale.pendingAmount;

      transaction.set(
        customerRef,
        {
          name: params.sale.customerName,
          phone: params.sale.customerPhone,
          totalSpent: newTotalSpent,
          totalOrders: newTotalOrders,
          pendingBalance: newPending,
          lastPurchaseDate: params.sale.date,
          updatedAt: new Date().toISOString(),
          ...(customerData ? {} : { createdAt: new Date().toISOString() }),
        },
        { merge: true }
      );

      // 4. Update Wallet balance if paidAmount > 0
      if (params.sale.paidAmount > 0) {
        transaction.update(walletRef, {
          currentBalance: currentWalletBalance + params.sale.paidAmount,
          updatedAt: new Date().toISOString(),
        });
      }

      // 5. Create Sale doc
      const saleRef = doc(collection(db, 'sales'));
      const fullSaleData: Omit<Sale, 'id'> = {
        ...params.sale,
        customerId: customerRef.id,
        saleNumber,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      transaction.set(saleRef, fullSaleData);
      createdSale = { id: saleRef.id, ...fullSaleData };

      // 6. If paidAmount > 0, log Payment
      if (params.sale.paidAmount > 0) {
        const paymentRef = doc(collection(db, 'payments'));
        const paymentData: Omit<Payment, 'id'> = {
          customerId: customerRef.id,
          customerName: params.sale.customerName,
          saleId: saleRef.id,
          walletId: params.sale.walletId,
          walletName: params.sale.walletName,
          amount: params.sale.paidAmount,
          paymentMethod: params.sale.paymentMethod,
          date: params.sale.date,
          monthKey,
          notes: `Payment for ${saleNumber}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        transaction.set(paymentRef, paymentData);
      }

      // 7. Update product stock & log movements
      for (const item of params.sale.items) {
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          const pSnap = await transaction.get(productRef);
          if (pSnap.exists()) {
            const currentStock = pSnap.data().currentStock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            transaction.update(productRef, {
              currentStock: newStock,
              updatedAt: new Date().toISOString(),
            });

            const stockMoveRef = doc(collection(db, 'stockMovements'));
            transaction.set(stockMoveRef, {
              productId: item.productId,
              productName: item.productName,
              type: 'SALE',
              quantity: -item.quantity,
              unit: item.unit,
              referenceId: saleRef.id,
              date: params.sale.date,
              notes: `Sale ${saleNumber} to ${params.sale.customerName}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // 8. Audit log
      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail: params.userEmail,
        action: 'CREATE_SALE',
        recordType: 'sale',
        recordId: saleRef.id,
        newValue: JSON.stringify({ saleNumber, total: params.sale.total, paid: params.sale.paidAmount }),
        timestamp: new Date().toISOString(),
      });
    });

    return createdSale!;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sales');
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
      // 1. Create return record
      const returnRef = doc(collection(db, 'returns'));
      newReturnId = returnRef.id;

      const returnData = {
        ...params.salesReturn,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      transaction.set(returnRef, returnData);

      // 2. Add returned quantity back to product stock
      const productRef = doc(db, 'products', params.salesReturn.productId);
      const productSnap = await transaction.get(productRef);
      if (productSnap.exists()) {
        const curStock = productSnap.data().currentStock || 0;
        transaction.update(productRef, {
          currentStock: curStock + params.salesReturn.quantity,
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Log stock movement (+ quantity returned)
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

      // 4. Handle refund action (Deduct customer pending balance OR Wallet Cash refund)
      if (
        params.salesReturn.refundMethod === 'DeductPending' &&
        params.salesReturn.customerId
      ) {
        const customerRef = doc(db, 'customers', params.salesReturn.customerId);
        const customerSnap = await transaction.get(customerRef);
        if (customerSnap.exists()) {
          const curPending = customerSnap.data().pendingBalance || 0;
          const newPending = Math.max(0, curPending - params.salesReturn.totalAmount);
          transaction.update(customerRef, {
            pendingBalance: newPending,
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (
        params.salesReturn.refundMethod === 'WalletRefund' &&
        params.salesReturn.walletId
      ) {
        const walletRef = doc(db, 'wallets', params.salesReturn.walletId);
        const walletSnap = await transaction.get(walletRef);
        if (walletSnap.exists()) {
          const curBal = walletSnap.data().currentBalance || 0;
          transaction.update(walletRef, {
            currentBalance: curBal - params.salesReturn.totalAmount,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 5. Audit log
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
    let newExpenseId = '';

    await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, 'wallets', params.expense.walletId);
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) throw new Error('Wallet not found');

      const currentBalance = walletSnap.data().currentBalance || 0;
      transaction.update(walletRef, {
        currentBalance: currentBalance - params.expense.amount,
        updatedAt: new Date().toISOString(),
      });

      const expenseRef = doc(collection(db, 'expenses'));
      newExpenseId = expenseRef.id;
      transaction.set(expenseRef, {
        ...params.expense,
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
        newValue: JSON.stringify({ category: params.expense.category, amount: params.expense.amount, wallet: params.expense.walletName }),
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
    let newPaymentId = '';

    await runTransaction(db, async (transaction) => {
      // 1. Update wallet balance (increase)
      const walletRef = doc(db, 'wallets', params.payment.walletId);
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) throw new Error('Wallet not found');

      const currentWalletBal = walletSnap.data().currentBalance || 0;
      transaction.update(walletRef, {
        currentBalance: currentWalletBal + params.payment.amount,
        updatedAt: new Date().toISOString(),
      });

      // 2. Update Customer pending balance (decrease)
      const customerRef = doc(db, 'customers', params.payment.customerId);
      const custSnap = await transaction.get(customerRef);
      if (custSnap.exists()) {
        const currentPending = custSnap.data().pendingBalance || 0;
        transaction.update(customerRef, {
          pendingBalance: Math.max(0, currentPending - params.payment.amount),
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Create Payment document
      const paymentRef = doc(collection(db, 'payments'));
      newPaymentId = paymentRef.id;
      transaction.set(paymentRef, {
        ...params.payment,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 4. Audit log
      const auditRef = doc(collection(db, 'auditLogs'));
      transaction.set(auditRef, {
        userEmail: params.userEmail,
        action: 'CREATE_PAYMENT',
        recordType: 'payment',
        recordId: paymentRef.id,
        newValue: JSON.stringify({ customer: params.payment.customerName, amount: params.payment.amount, wallet: params.payment.walletName }),
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
      // 1. Update product currentStock & cost trend
      const productRef = doc(db, 'products', params.purchase.productId);
      const productSnap = await transaction.get(productRef);
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

      // 2. If paid and wallet provided, decrease wallet balance
      if (params.purchase.paymentStatus === 'Paid' && params.purchase.walletId) {
        const walletRef = doc(db, 'wallets', params.purchase.walletId);
        const walletSnap = await transaction.get(walletRef);
        if (walletSnap.exists()) {
          const curBal = walletSnap.data().currentBalance || 0;
          transaction.update(walletRef, {
            currentBalance: curBal - params.purchase.totalCost,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. If vendor exists, update vendor totalPurchases and pending
      if (params.purchase.vendorId) {
        const vendorRef = doc(db, 'vendors', params.purchase.vendorId);
        const vSnap = await transaction.get(vendorRef);
        if (vSnap.exists()) {
          const prevPurchases = vSnap.data().totalPurchases || 0;
          const prevPending = vSnap.data().pendingPayment || 0;
          const pendingAdd = params.purchase.paymentStatus === 'Unpaid' ? params.purchase.totalCost : 0;
          transaction.update(vendorRef, {
            totalPurchases: prevPurchases + params.purchase.totalCost,
            pendingPayment: prevPending + pendingAdd,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 4. Create purchase record
      const purchaseRef = doc(collection(db, 'purchases'));
      newPurchaseId = purchaseRef.id;
      transaction.set(purchaseRef, {
        ...params.purchase,
        monthKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 5. Log Stock Movement
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

      // 6. Audit log
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
