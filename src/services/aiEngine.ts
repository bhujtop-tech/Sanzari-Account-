import { Wallet, Customer, Product, Sale, Expense, Payment, Purchase, Vendor } from '../types';

export interface AiProposedAction {
  type: 'sale' | 'expense' | 'payment' | 'transfer' | 'purchase';
  description: string;
  data?: any;
}

export interface AiEngineResponse {
  answer: string;
  proposedAction?: AiProposedAction;
  suggestions?: string[];
}

export interface StoreContextData {
  wallets: Wallet[];
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  payments: Payment[];
  purchases: Purchase[];
  vendors: Vendor[];
  currentMonth: string;
}

/**
 * Custom Built-in Financial Intelligence & NLP Algorithm Engine
 * Grounded 100% in real-time Sanzari Accounts Firestore state.
 * Supports English, Hindi, Urdu, and Hinglish queries.
 */
export function processSanzariAiQuery(
  rawQuery: string,
  context: StoreContextData
): AiEngineResponse {
  const q = rawQuery.toLowerCase().trim();

  const totalBalance = context.wallets.reduce((s, w) => s + (w.currentBalance || 0), 0);
  const totalPendingDues = context.customers.reduce((s, c) => s + (c.pendingBalance || 0), 0);

  // Month filtering
  const currentMonthSales = context.sales.filter(
    (s) => s.monthKey === context.currentMonth || s.date?.startsWith(context.currentMonth)
  );
  const currentMonthSalesTotal = currentMonthSales.reduce((s, item) => s + (item.total || 0), 0);
  const currentMonthCollected = currentMonthSales.reduce((s, item) => s + (item.paidAmount || 0), 0);
  const currentMonthPending = currentMonthSales.reduce((s, item) => s + (item.pendingAmount || 0), 0);

  const currentMonthExpenses = context.expenses.filter(
    (e) => e.monthKey === context.currentMonth || e.date?.startsWith(context.currentMonth)
  );
  const currentMonthExpensesTotal = currentMonthExpenses.reduce((s, item) => s + (item.amount || 0), 0);

  const currentMonthPurchases = context.purchases.filter(
    (p) => p.monthKey === context.currentMonth || p.date?.startsWith(context.currentMonth)
  );
  const currentMonthPurchasesTotal = currentMonthPurchases.reduce((s, item) => s + (item.totalCost || 0), 0);

  // Profit calculation
  let totalCostOfSoldItems = 0;
  context.sales.forEach((s) => {
    s.items?.forEach((i) => {
      totalCostOfSoldItems += (i.purchaseCost || 0) * (i.quantity || 0);
    });
  });
  const totalRevenueAllTime = context.sales.reduce((s, sale) => s + (sale.total || 0), 0);
  const totalGrossProfitAllTime = totalRevenueAllTime - totalCostOfSoldItems;

  // ----------------------------------------------------
  // 1. WALLET / PARTNER BALANCE QUERIES
  // ----------------------------------------------------
  if (
    q.includes('balance') ||
    q.includes('wallet') ||
    q.includes('paisa') ||
    q.includes('paise') ||
    q.includes('cash') ||
    q.includes('rizwan') ||
    q.includes('avesh') ||
    q.includes('sahil')
  ) {
    // Check specific partner
    const partners = ['rizwan', 'avesh', 'sahil'];
    const matchedPartner = partners.find((p) => q.includes(p));

    if (matchedPartner) {
      const w = context.wallets.find(
        (wal) => wal.partnerKey === matchedPartner || wal.name.toLowerCase().includes(matchedPartner)
      );
      if (w) {
        return {
          answer: `💰 **${w.name}'s Wallet Balance**: ₹${w.currentBalance.toLocaleString(
            'en-IN'
          )}\n\n• Opening Balance: ₹${w.openingBalance.toLocaleString(
            'en-IN'
          )}\n• Live Wallet Cash: ₹${w.currentBalance.toLocaleString(
            'en-IN'
          )}\n• Status: Active & Operational`,
          suggestions: [
            'Total balance kitna hai?',
            'Transfer karna hai',
            'Is mahine ki sales kitni hai?',
          ],
        };
      }
    }

    // Combined All Wallets Summary
    const walletBreakdown = context.wallets
      .map((w) => `• **${w.name}**: ₹${w.currentBalance.toLocaleString('en-IN')}`)
      .join('\n');

    return {
      answer: `📊 **Sanzari Total Combined Balance**: **₹${totalBalance.toLocaleString(
        'en-IN'
      )}**\n\n**Partner Breakdown:**\n${walletBreakdown}\n\n*Note: Total cash is distributed across Rizwan, Avesh & Sahil partner wallets.*`,
      suggestions: [
        'Rizwan ke paas kitna hai?',
        'Avesh ke paas kitna hai?',
        'Sahil ke paas kitna hai?',
      ],
    };
  }

  // ----------------------------------------------------
  // 2. CUSTOMER & PENDING DUES (UDHARI / JAMA) QUERIES
  // ----------------------------------------------------
  if (
    q.includes('udhari') ||
    q.includes('due') ||
    q.includes('pending') ||
    q.includes('jama') ||
    q.includes('customer') ||
    q.includes('grahak') ||
    q.includes('baki') ||
    q.includes('baaki') ||
    q.includes('vasool')
  ) {
    // Check if user named a specific customer
    const matchedCustomer = context.customers.find((c) => q.includes(c.name.toLowerCase()));

    if (matchedCustomer) {
      return {
        answer: `👤 **Customer**: **${matchedCustomer.name}** (${matchedCustomer.phone})\n• **Pending Due Balance**: **₹${matchedCustomer.pendingBalance.toLocaleString(
          'en-IN'
        )}**\n• Total Orders: ${matchedCustomer.totalOrders}\n• Total Spent: ₹${matchedCustomer.totalSpent.toLocaleString(
          'en-IN'
        )}${
          matchedCustomer.pendingBalance > 0
            ? '\n\n💡 *Tip: Quick Payment modal se inka due receive kar sakte hain.*'
            : '\n\n✅ *Sabhi hisab chukta hain.*'
        }`,
        proposedAction:
          matchedCustomer.pendingBalance > 0
            ? {
                type: 'payment',
                description: `Receive payment from ${matchedCustomer.name}`,
                data: { customerId: matchedCustomer.id },
              }
            : undefined,
      };
    }

    // List all customers with pending balances
    const pendingList = context.customers.filter((c) => c.pendingBalance > 0);

    if (pendingList.length === 0) {
      return {
        answer: `🎉 **Shabaash!** Market me kisi bhi customer ki udhari baaki nahi hai. Sabhi payments clear hain!`,
      };
    }

    const formattedList = pendingList
      .map((c) => `• **${c.name}**: ₹${c.pendingBalance.toLocaleString('en-IN')} (${c.phone})`)
      .join('\n');

    return {
      answer: `📋 **Customers With Pending Dues (Total: ₹${totalPendingDues.toLocaleString(
        'en-IN'
      )})**:\n\n${formattedList}\n\n💡 *Aap Quick Actions me 'Receive Due' par tap karke vasooli entry kar sakte hain.*`,
      suggestions: ['Payment receive karna hai', 'Sales history dikhao', 'Total balance kitna hai?'],
    };
  }

  // ----------------------------------------------------
  // 3. PRODUCT & STOCK INVENTORY QUERIES
  // ----------------------------------------------------
  if (
    q.includes('stock') ||
    q.includes('product') ||
    q.includes('item') ||
    q.includes('maal') ||
    q.includes('kesar') ||
    q.includes('saffron') ||
    q.includes('badam') ||
    q.includes('akhrot') ||
    q.includes('anjeer') ||
    q.includes('price') ||
    q.includes('rate') ||
    q.includes('cost') ||
    q.includes('hike')
  ) {
    // Check specific product match
    const matchedProd = context.products.find((p) =>
      q.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(q)
    );

    if (matchedProd) {
      const isHike = matchedProd.costTrend === 'hike';
      const isLow = matchedProd.costTrend === 'low';

      return {
        answer: `📦 **Product Details: ${matchedProd.name}**\n\n• **Physical Stock**: **${
          matchedProd.currentStock
        } ${matchedProd.unit}**\n• **Selling Price**: ₹${matchedProd.sellingPrice.toLocaleString(
          'en-IN'
        )}/${matchedProd.unit}\n• **Last Purchase Cost**: ₹${matchedProd.purchaseCost.toLocaleString(
          'en-IN'
        )}/${matchedProd.unit}\n• **Status**: ${
          matchedProd.currentStock <= matchedProd.lowStockThreshold
            ? '⚠️ LOW STOCK ALERT'
            : '✅ Stock Available'
        }${
          isHike
            ? `\n\n🚨 **Price Trend**: Cost price hiked from ₹${matchedProd.previousPurchaseCost?.toLocaleString(
                'en-IN'
              )} to ₹${matchedProd.purchaseCost.toLocaleString('en-IN')}`
            : isLow
            ? `\n\n📉 **Price Trend**: Cost price reduced from ₹${matchedProd.previousPurchaseCost?.toLocaleString(
                'en-IN'
              )} to ₹${matchedProd.purchaseCost.toLocaleString('en-IN')}`
            : ''
        }`,
        suggestions: [
          `Naya purchase add karein`,
          `Sabhi low stock products dikhao`,
          `Stock audit check karein`,
        ],
      };
    }

    // Low stock overview query
    const lowStockItems = context.products.filter(
      (p) => p.currentStock <= p.lowStockThreshold
    );

    if (q.includes('low') || q.includes('khatam') || q.includes('kam')) {
      if (lowStockItems.length === 0) {
        return {
          answer: `✅ **Stock Status**: All store products have sufficient physical stock levels. None are below thresholds!`,
        };
      }

      const lowList = lowStockItems
        .map(
          (p) =>
            `• **${p.name}**: Stock **${p.currentStock} ${p.unit}** (Min: ${p.lowStockThreshold} ${p.unit})`
        )
        .join('\n');

      return {
        answer: `⚠️ **Low Stock Alert (${lowStockItems.length} Items)**:\n\n${lowList}\n\n💡 *Purchase section se inka inward stock order add karein.*`,
        proposedAction: {
          type: 'purchase',
          description: 'Record new inward purchase for stock replenishment',
        },
      };
    }

    // General Catalog list
    const catalogList = context.products
      .slice(0, 8)
      .map(
        (p) =>
          `• **${p.name}**: Stock ${p.currentStock} ${p.unit} | Cost: ₹${p.purchaseCost} | Sell: ₹${p.sellingPrice}`
      )
      .join('\n');

    return {
      answer: `📦 **Sanzari Product Catalog Snapshot**:\n\n${catalogList}\n\n*(Total Products in Catalog: ${context.products.length})*`,
    };
  }

  // ----------------------------------------------------
  // 4. SALES, BIKRI & REVENUE QUERIES
  // ----------------------------------------------------
  if (
    q.includes('sale') ||
    q.includes('bikri') ||
    q.includes('revenue') ||
    q.includes('bill') ||
    q.includes('order') ||
    q.includes('total sale')
  ) {
    // Check salesperson
    if (q.includes('rizwan')) {
      const pSales = context.sales.filter((s) => s.salesPerson?.toLowerCase() === 'rizwan');
      const pTot = pSales.reduce((sum, s) => sum + s.total, 0);
      return {
        answer: `📈 **Rizwan's Total Billed Sales**: **₹${pTot.toLocaleString(
          'en-IN'
        )}** (${pSales.length} Orders)`,
      };
    }
    if (q.includes('avesh')) {
      const pSales = context.sales.filter((s) => s.salesPerson?.toLowerCase() === 'avesh');
      const pTot = pSales.reduce((sum, s) => sum + s.total, 0);
      return {
        answer: `📈 **Avesh's Total Billed Sales**: **₹${pTot.toLocaleString(
          'en-IN'
        )}** (${pSales.length} Orders)`,
      };
    }
    if (q.includes('sahil')) {
      const pSales = context.sales.filter((s) => s.salesPerson?.toLowerCase() === 'sahil');
      const pTot = pSales.reduce((sum, s) => sum + s.total, 0);
      return {
        answer: `📈 **Sahil's Total Billed Sales**: **₹${pTot.toLocaleString(
          'en-IN'
        )}** (${pSales.length} Orders)`,
      };
    }

    return {
      answer: `📊 **Monthly Sales Summary (${context.currentMonth})**:\n\n• **Total Billed Sales**: **₹${currentMonthSalesTotal.toLocaleString(
        'en-IN'
      )}**\n• **Cash Collected**: ₹${currentMonthCollected.toLocaleString(
        'en-IN'
      )}\n• **Pending Customer Dues**: ₹${currentMonthPending.toLocaleString(
        'en-IN'
      )}\n• Total Orders Billed: ${currentMonthSales.length}`,
      suggestions: ['Nayi sale entry add karein', 'Expenses kitne hue?', 'Kis customer ki udhari baaki hai?'],
    };
  }

  // ----------------------------------------------------
  // 5. EXPENSES & KHARCHA QUERIES
  // ----------------------------------------------------
  if (q.includes('expense') || q.includes('kharcha') || q.includes('expenses')) {
    const expenseBreakdown: Record<string, number> = {};
    currentMonthExpenses.forEach((e) => {
      expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
    });

    const categoryText = Object.entries(expenseBreakdown)
      .map(([cat, amt]) => `• **${cat}**: ₹${amt.toLocaleString('en-IN')}`)
      .join('\n');

    return {
      answer: `💸 **Monthly Expenses (${
        context.currentMonth
      })**: **₹${currentMonthExpensesTotal.toLocaleString('en-IN')}**\n\n**Category Breakdown:**\n${
        categoryText || '• Abhi tak koi kharcha record nahi hua'
      }`,
      suggestions: ['Kharcha add karein', 'Sales kitni hui?', 'Total balance kitna hai?'],
    };
  }

  // ----------------------------------------------------
  // 6. PURCHASES & VENDOR / SUPPLIER QUERIES
  // ----------------------------------------------------
  if (
    q.includes('purchase') ||
    q.includes('vendor') ||
    q.includes('supplier') ||
    q.includes('khareed') ||
    q.includes('inward')
  ) {
    const totalVendorPending = context.vendors.reduce((s, v) => s + (v.pendingPayment || 0), 0);

    const vendorList = context.vendors
      .map(
        (v) =>
          `• **${v.name}**: Total Purchases ₹${v.totalPurchases.toLocaleString(
            'en-IN'
          )} | Payable: ₹${v.pendingPayment.toLocaleString('en-IN')}`
      )
      .join('\n');

    return {
      answer: `🚚 **Supplies & Vendor Summary (${context.currentMonth})**:\n\n• **This Month Inward Purchases**: **₹${currentMonthPurchasesTotal.toLocaleString(
        'en-IN'
      )}**\n• **Total Payable To Vendors**: ₹${totalVendorPending.toLocaleString(
        'en-IN'
      )}\n\n**Suppliers Ledger:**\n${vendorList || '• Koi vendor recorded nahi hai'}`,
      suggestions: ['Inward stock purchase add karein', 'Kaunsa stock low hai?'],
    };
  }

  // ----------------------------------------------------
  // 7. PROFIT / MUNAFA & GENERAL STORE OVERVIEW
  // ----------------------------------------------------
  if (q.includes('profit') || q.includes('munafa') || q.includes('margin') || q.includes('net')) {
    return {
      answer: `💹 **Sanzari Profitability & Accounts Summary**:\n\n• **Total All-Time Revenue**: ₹${totalRevenueAllTime.toLocaleString(
        'en-IN'
      )}\n• **Gross Estimated Profit**: **₹${totalGrossProfitAllTime.toLocaleString(
        'en-IN'
      )}**\n• **This Month Billed Sales**: ₹${currentMonthSalesTotal.toLocaleString(
        'en-IN'
      )}\n• **This Month Expenses**: ₹${currentMonthExpensesTotal.toLocaleString(
        'en-IN'
      )}\n• **Net Operating Cash Balance**: ₹${totalBalance.toLocaleString('en-IN')}`,
    };
  }

  // ----------------------------------------------------
  // DEFAULT / GENERAL ASSISTANT SUMMARY
  // ----------------------------------------------------
  const walletsSummary = context.wallets
    .map((w) => `${w.name}: ₹${w.currentBalance.toLocaleString('en-IN')}`)
    .join(' | ');

  return {
    answer: `✨ **Sanzari Store Real-time Financial Snapshot**:\n\n• 💰 **Total Combined Cash**: **₹${totalBalance.toLocaleString(
      'en-IN'
    )}**\n  *(${walletsSummary})*\n• 📈 **This Month Billed Sales**: ₹${currentMonthSalesTotal.toLocaleString(
      'en-IN'
    )}\n• 💸 **This Month Expenses**: ₹${currentMonthExpensesTotal.toLocaleString(
      'en-IN'
    )}\n• ⏳ **Outstanding Customer Dues**: ₹${totalPendingDues.toLocaleString(
      'en-IN'
    )}\n\n*Aap mujhse kisi bhi grahak ki udhari, partner balance, product stock ya purchase cost ke baare me English ya Hinglish me pooch sakte hain!*`,
    suggestions: [
      'Rizwan ke paas kitna balance hai?',
      'Kis customer ki udhari baaki hai?',
      'Kaunsa stock low hai?',
      'Is mahine ki sales kitni hai?',
    ],
  };
}
