import {
  Wallet,
  Product,
  Customer,
  StoreSettings,
  TourBatch,
  TourBooking,
  TourExpense,
  TourInquiry,
  CustomTourPackage,
} from '../types';

export const INITIAL_WALLETS: Omit<Wallet, 'id'>[] = [
  // --- DRY FRUIT STORE WALLETS ---
  {
    name: 'Rizwan',
    partnerKey: 'rizwan',
    scope: 'dryfruit',
    openingBalance: 31100,
    currentBalance: 31100,
    color: '#0284c7', // Sky blue
  },
  {
    name: 'Avesh',
    partnerKey: 'avesh',
    scope: 'dryfruit',
    openingBalance: 10950,
    currentBalance: 10950,
    color: '#10b981', // Emerald green
  },
  {
    name: 'Sahil',
    partnerKey: 'sahil',
    scope: 'dryfruit',
    openingBalance: 0,
    currentBalance: 0,
    color: '#8b5cf6', // Violet
  },
  // --- TOUR & TRAVEL WALLETS (Sanzari Tours) ---
  {
    name: 'Rizwan (Tour)',
    partnerKey: 'rizwan',
    scope: 'tourism',
    openingBalance: 0,
    currentBalance: 0,
    color: '#0ea5e9', // Sky blue
  },
  {
    name: 'Sahil (Tour)',
    partnerKey: 'sahil',
    scope: 'tourism',
    openingBalance: 0,
    currentBalance: 0,
    color: '#a855f7', // Purple
  },
  {
    name: 'Bus (Tour)',
    partnerKey: 'bus',
    scope: 'tourism',
    openingBalance: 0,
    currentBalance: 0,
    color: '#f59e0b', // Amber Bus Yellow
  },
];

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: 'Keser (Pure Kashmiri Saffron)',
    category: 'Spices & Herbs',
    unit: '1g',
    sellingPrice: 500,
    purchaseCost: 350,
    currentStock: 120,
    lowStockThreshold: 20,
  },
  {
    name: 'Mamra Badam',
    category: 'Dry Fruits',
    unit: 'kg',
    sellingPrice: 2400,
    purchaseCost: 1800,
    currentStock: 15,
    lowStockThreshold: 3,
  },
  {
    name: 'Akhrot (Kashmiri Walnuts)',
    category: 'Dry Fruits',
    unit: 'kg',
    sellingPrice: 800,
    purchaseCost: 550,
    currentStock: 25,
    lowStockThreshold: 5,
  },
  {
    name: 'Crane bery (Cranberry)',
    category: 'Dry Fruits',
    unit: 'kg',
    sellingPrice: 750,
    purchaseCost: 500,
    currentStock: 18,
    lowStockThreshold: 4,
  },
  {
    name: 'Red Cherry',
    category: 'Dry Fruits',
    unit: 'kg',
    sellingPrice: 650,
    purchaseCost: 420,
    currentStock: 14,
    lowStockThreshold: 3,
  },
  {
    name: 'Blackberry',
    category: 'Dry Fruits',
    unit: 'kg',
    sellingPrice: 850,
    purchaseCost: 580,
    currentStock: 12,
    lowStockThreshold: 3,
  },
  {
    name: 'Blue Berry',
    category: 'Dry Fruits',
    unit: 'kg',
    sellingPrice: 950,
    purchaseCost: 650,
    currentStock: 10,
    lowStockThreshold: 2,
  },
  {
    name: 'Lasan (Kashmiri Garlic)',
    category: 'Spices & Herbs',
    unit: 'kg',
    sellingPrice: 350,
    purchaseCost: 220,
    currentStock: 20,
    lowStockThreshold: 4,
  },
  {
    name: 'Khajur (Dates)',
    category: 'Dry Fruits',
    unit: 'kg',
    sellingPrice: 450,
    purchaseCost: 300,
    currentStock: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Gulkand',
    category: 'Sweets & Preserves',
    unit: 'kg',
    sellingPrice: 380,
    purchaseCost: 240,
    currentStock: 16,
    lowStockThreshold: 4,
  },
  {
    name: 'Kavo (Kahwa Mix)',
    category: 'Beverages',
    unit: 'packs',
    sellingPrice: 350,
    purchaseCost: 200,
    currentStock: 35,
    lowStockThreshold: 8,
  },
  {
    name: 'Rosewater',
    category: 'Personal Care',
    unit: 'bottle',
    sellingPrice: 180,
    purchaseCost: 100,
    currentStock: 40,
    lowStockThreshold: 10,
  },
  {
    name: 'Marchi (Kashmiri Red Chilli)',
    category: 'Spices & Herbs',
    unit: 'kg',
    sellingPrice: 400,
    purchaseCost: 260,
    currentStock: 22,
    lowStockThreshold: 5,
  },
  {
    name: 'Pickel Nuts',
    category: 'Snacks',
    unit: 'packs',
    sellingPrice: 350,
    purchaseCost: 220,
    currentStock: 28,
    lowStockThreshold: 6,
  },
  {
    name: 'Musli (Safed Musli)',
    category: 'Wellness',
    unit: 'g',
    sellingPrice: 850,
    purchaseCost: 550,
    currentStock: 15,
    lowStockThreshold: 3,
  },
  {
    name: 'Shilajit',
    category: 'Wellness',
    unit: 'pcs',
    sellingPrice: 1100,
    purchaseCost: 700,
    currentStock: 20,
    lowStockThreshold: 4,
  },
  {
    name: 'Black Honey',
    category: 'Honey & Natural',
    unit: 'bottle',
    sellingPrice: 850,
    purchaseCost: 580,
    currentStock: 18,
    lowStockThreshold: 4,
  },
  {
    name: 'Serum (Kashmiri Beauty Serum)',
    category: 'Personal Care',
    unit: 'bottle',
    sellingPrice: 650,
    purchaseCost: 380,
    currentStock: 15,
    lowStockThreshold: 3,
  },
  {
    name: 'Sefron Cream (Saffron Cream)',
    category: 'Personal Care',
    unit: 'pcs',
    sellingPrice: 450,
    purchaseCost: 260,
    currentStock: 25,
    lowStockThreshold: 5,
  },
];

export const INITIAL_CUSTOMERS: Omit<Customer, 'id'>[] = [
  {
    name: 'Aslam Bhai',
    phone: '+91 98250 12345',
    city: 'Bhuj',
    totalOrders: 3,
    totalSpent: 9800,
    pendingBalance: 2500,
    lastPurchaseDate: '2026-10-01',
    notes: 'Regular wholesale buyer for Keser & Dry fruits',
  },
  {
    name: 'Ahmed Khan',
    phone: '+91 98791 54321',
    city: 'Ahmedabad',
    totalOrders: 2,
    totalSpent: 5200,
    pendingBalance: 0,
    lastPurchaseDate: '2026-09-28',
    notes: 'Always pays on time via UPI',
  },
  {
    name: 'Irfan Memon',
    phone: '+91 94264 88990',
    city: 'Surat',
    totalOrders: 1,
    totalSpent: 3500,
    pendingBalance: 1200,
    lastPurchaseDate: '2026-09-22',
  },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  businessName: 'Sanzari Store & Tourism',
  currency: '₹',
  dateFormat: 'DD-MM-YYYY',
  allowNegativeStock: false,
  allowNegativeWallet: false,
};

// ==========================================
// INITIAL TOURISM DATA (Sanzari Tours) - Set to empty array so no mock data is seeded
// ==========================================
export const INITIAL_TOUR_BATCHES: Omit<TourBatch, 'id'>[] = [];

export const INITIAL_TOUR_BOOKINGS: Omit<TourBooking, 'id'>[] = [];

export const INITIAL_TOUR_EXPENSES: Omit<TourExpense, 'id'>[] = [];

// ==========================================
// INITIAL CUSTOM TOUR PACKAGES (Vadodara Tour Style)
// ==========================================
export const INITIAL_CUSTOM_TOUR_PACKAGES: Omit<CustomTourPackage, 'id'>[] = [
  {
    packageCode: 'SZ-PKG-KASHMIR-01',
    packageName: 'Kashmir Autumn & Snow Deluxe Special',
    packageNameGujarati: 'શ્રી કાશ્મીર હેવન સ્પેશિયલ ફેમિલી ટૂર',
    destination: 'કાશ્મીર (શ્રીનગર, ગુલમર્ગ, પહેલગામ, સોનમર્ગ)',
    durationNights: 6,
    durationDays: 7,
    durationTextGujarati: '૬ રાત / ૭ દિવસ',
    priceNonAcTrain: 14500,
    priceAcTrain: 18500,
    priceFlight: 24500,
    priceChildHalf: 8500,
    overviewGujarati:
      'સંજરી ટૂરિઝમ (વડોદરા) પ્રસ્તુત કાશ્મીરની અદ્ભુત કુદરતી સુંદરતા, બરફાચ્છાદિત પર્વતો, દાલ લેક હાઉસબોટ અને શુદ્ધ શાકાહારી ગુજરાતી ભોજન સાથેની યાદગાર ફેમિલી ટૂર.',
    inclusionsGujarati: [
      'ડીલક્સ હોટેલ (શ્રીનગર & પહેલગામ) + ૧ રાત રોયલ હાઉસબોટ સ્ટે (દાલ લેક)',
      'સવારનો ગરમાગરમ નાસ્તો, બપોરે & રાત્રે ૧૦૦% શુદ્ધ શાકાહારી ગુજરાતી ભોજન (મહારાજ સાથે)',
      'તમામ સાઇટસીઇંગ માટે પ્રાઇવેટ એસી ગાડી / પુશબેક લક્ઝરી બસ',
      'દાલ લેકમાં રોમેન્ટિક શિકારા રાઇડ (૧ કલાક)',
      'તમામ ટોલ ટેક્સ, પાર્કિંગ, ડ્રાઇવર ભથ્થું & સ્ટેટ પરમિટ',
      '૨૪ કલાક વડોદરા ઓફિસ હેલ્પલાઇન અને અનુભવી ટૂર મેનેજર સહાય',
    ],
    exclusionsGujarati: [
      'ગુલમર્ગ ગોંડોલા કેબલ કાર ટિકિટ અને પહેલગામ લોકલ ટટ્ટુ / ઘોડા સવારી ખર્ચ',
      'વ્યક્તિગત શોપિંગ, લોન્ડ્રી, મિનરલ વોટર & વધારાનો અંગત ખર્ચ',
      'કોઈપણ કુદરતી આફત કે ટ્રેન/ફ્લાઇટ ડીલે થવાથી થતો વધારાનો હોટેલ ખર્ચ',
    ],
    itinerary: [
      {
        day: 1,
        title: 'શ્રીનગર આગમન & દાલ લેક રોયલ હાઉસબોટ',
        description: 'શ્રીનગર પહોંચી હાઉસબોટમાં ચેક-ઇન. સાંજે દાલ લેકમાં શિકારા રાઇડ અને ફ્લોટિંગ માર્કેટ વિઝિટ. રાત્રિ ભોજન & હાઉસબોટ રોકાણ.',
      },
      {
        day: 2,
        title: 'શ્રીનગર લોકલ મોગલ ગાર્ડન્સ & શંકરાચાર્ય મંદિર',
        description: 'શાલીમાર બાગ, નિશાત બાગ, ચશ્મેશાહી અને શંકરાચાર્ય હિલ ટોપ મંદિર દર્શન. લોકલ ડ્રાયફ્રૂટ્સ & કેસર શોપિંગ.',
      },
      {
        day: 3,
        title: 'સોનમર્ગ ડે ટૂર - ગોલ્ડન મિડો & થાજીવાસ ગ્લેશિયર',
        description: 'સોનમર્ગ તરફ સુંદર સિંધ નદીના કિનારે પ્રવાસ. સ્નો પોઇન્ટ / થાજીવાસ ગ્લેશિયર આનંદ. સાંજે શ્રીનગર પરત.',
      },
      {
        day: 4,
        title: 'ગુલમર્ગ - એશિયાની સૌથી ઊંચી ગોંડોલા કેબલ કાર & સ્નો વર્લ્ડ',
        description: 'વિશ્વપ્રસિદ્ધ ગુલમર્ગ તરફ પ્રયાણ. અફરવત પીક સુધી કેબલ કાર રાઇડ, બરફમાં સ્લેજિંગ & ફોટોગ્રાફી.',
      },
      {
        day: 5,
        title: 'પહેલગામ - બેતાબ વેલી, અરુ વેલી & ચંદનવાડી',
        description: 'લીડર નદીના કિનારે પહેલગામ તરફ પ્રયાણ. કેસરના ખેતરો, સફરજનની વાડીઓ અને ફિલ્મી લોકેશન્સ દર્શન.',
      },
      {
        day: 6,
        title: 'પહેલગામ રિલેક્સેશન & શ્રીનગર પરત',
        description: 'કુદરતી નજારો માણવો. બપોર પછી શ્રીનગર પરત આવી લાલ ચોક & લોકલ માર્કેટ શોપિંગ.',
      },
      {
        day: 7,
        title: 'મીઠી યાદો સાથે શ્રીનગરથી વડોદરા/ઘર તરફ રવાના',
        description: 'સવારનો નાસ્તો કરી એરપોર્ટ / રેલવે સ્ટેશન ડ્રોપ. કાશ્મીર ટૂરની અવિસ્મરણીય યાદો સાથે યાત્રા સંપન્ન.',
      },
    ],
    hotelCategory: '3-સ્ટાર & 4-સ્ટાર પ્રીમિયમ હોટેલ + સુપર ડીલક્સ હાઉસબોટ',
    foodPlan: '૧૦૦% શુદ્ધ શાકાહારી ગુજરાતી & જૈન ભોજન (સવાર, બપોર, સાંજ)',
    transportDetails: 'પ્રાઇવેટ એસી ઇનોવા / ટેમ્પો ટ્રાવેલર',
    pickupCity: 'વડોદરા / અમદાવાદ / દિલ્હી / શ્રીનગર',
    specialNotesGujarati: 'દિવાળી વેકેશન માટે એડવાન્સ બુકિંગ કરાવવું જરૂરી છે. આધાર કાર્ડ સાથે રાખવું.',
  },
  {
    packageCode: 'SZ-PKG-MANALI-02',
    packageName: 'Manali - Shimla - Kullu Snow Fantasy Tour',
    packageNameGujarati: 'મનાલી - શિમલા - કુલ્લુ હિમાચલ ફેમિલી ટૂર',
    destination: 'હિમાચલ પ્રદેશ (મનાલી, શિમલા, સોલાંગ વેલી, કુલ્લુ)',
    durationNights: 5,
    durationDays: 6,
    durationTextGujarati: '૫ રાત / ૬ દિવસ',
    priceNonAcTrain: 11500,
    priceAcTrain: 14500,
    priceFlight: 21000,
    priceChildHalf: 6500,
    overviewGujarati:
      'શિમલા મોલ રોડ, કુફરી, મનાલી સોલાંગ વેલી બરફનો આનંદ, હિડિંબા મંદિર અને બિયાસ નદીમાં રિવર રાફ્ટિંગ સાથે સંપૂર્ણ ફેમિલી પેકેજ.',
    inclusionsGujarati: [
      '૨ રાત શિમલા + ૩ રાત મનાલી ડીલક્સ હોટેલ સ્ટે',
      'સવારનો નાસ્તો અને રાત્રિનું સ્વાદિષ્ટ ગુજરાતી / પંજાબી ભોજન',
      'દિલ્હી / ચંદીગઢથી સંપૂર્ણ ટૂર માટે પ્રાઇવેટ વાહન',
      'સોલાંગ વેલી, કુલ્લુ શાલ ફેક્ટરી, હિડિંબા દેવી મંદિર સાઇટસીઇંગ',
      'ડીજે નાઇટ & કેમ્પફાયર (મનાલી હોટેલમાં)',
    ],
    exclusionsGujarati: [
      'રોહતાંગ પાસ એનજીટી પરમિટ & રિવર રાફ્ટિંગ / પેરાગ્લાઇડિંગ ટિકિટ',
      'બપોરનું લંચ અને વ્યક્તિગત ખર્ચ',
    ],
    itinerary: [
      {
        day: 1,
        title: 'દિલ્હી / ચંદીગઢથી શિમલા આગમન',
        description: 'પિકઅપ બાદ પહાડી રસ્તે શિમલા પ્રયાણ. હોટેલ ચેક-ઇન અને સાંજે મોલ રોડ & ક્રાઇસ્ટ ચર્ચ વૉક.',
      },
      {
        day: 2,
        title: 'કુફરી સ્નો પોઇન્ટ & ચાઈલ સાઇટસીઇંગ',
        description: 'કુફરીમાં યાક રાઇડ, એડવેન્ચર પાર્ક અને હિમાલયન વાઇલ્ડલાઇફ ઝૂ મુલાકાત.',
      },
      {
        day: 3,
        title: 'શિમલાથી મનાલી - વાયા કુલ્લુ & પંડોહ ડેમ',
        description: 'સુંદર ખીણો વચ્ચેથી મનાલી પ્રયાણ. કુલ્લુ શાલ ફેક્ટરી & રિવર રાફ્ટિંગ પોઇન્ટ સ્ટોપ.',
      },
      {
        day: 4,
        title: 'સોલાંગ વેલી સ્નો પોઇન્ટ & અટલ ટનલ',
        description: 'સોલાંગ ખીણમાં પેરાગ્લાઇડિંગ, સ્નો સ્કૂટર અને વિશ્વપ્રસિદ્ધ અટલ ટનલ - સિસ્સુ મુલાકાત.',
      },
      {
        day: 5,
        title: 'મનાલી લોકલ દર્શન - હિડિંબા મંદિર & વશિષ્ઠ કુંડ',
        description: 'હિડિંબા દેવી મંદિર, ક્લબ હાઉસ, વશિષ્ઠ ગરમ પાણીના કુંડ અને તિબેટીયન મોનેસ્ટ્રી.',
      },
      {
        day: 6,
        title: 'મનાલીથી દિલ્હી / ચંદીગઢ વાપસી',
        description: 'સવારનો નાસ્તો કરી શોપિંગ બાદ દિલ્હી/ચંદીગઢ તરફ રવાના.',
      },
    ],
    hotelCategory: '3-સ્ટાર વેલી વ્યુ રિસોર્ટ',
    foodPlan: 'શુદ્ધ શાકાહારી ભોજન (બ્રેકફાસ્ટ & ડિનર)',
    transportDetails: 'પ્રાઇવેટ એસી સેડાન / એસયુવી / વોલ્વો કોચ',
    pickupCity: 'વડોદરા / અમદાવાદ / દિલ્હી / ચંદીગઢ',
  },
  {
    packageCode: 'SZ-PKG-GOA-03',
    packageName: 'Goa Beach Fun & Mandovi Cruise Tour',
    packageNameGujarati: 'ગોવા બીચ, ફોર્ટ અગુઆડા & ક્રૂઝ હોલિડે પેકેજ',
    destination: 'ગોવા (નોર્થ ગોવા & સાઉથ ગોવા)',
    durationNights: 4,
    durationDays: 5,
    durationTextGujarati: '૪ રાત / ૫ દિવસ',
    priceNonAcTrain: 9500,
    priceAcTrain: 13500,
    priceFlight: 19500,
    priceChildHalf: 5500,
    overviewGujarati:
      'કેલંગુટ બીચ, બાગા બીચ, અગુઆડા કિલ્લો, વોટર સ્પોર્ટ્સ અને માંડોવી નદીમાં ડીજે ક્રૂઝ સાથેની મજેદાર ગોવા ટૂર.',
    inclusionsGujarati: [
      '૪ રાત સ્વિમિંગ પુલ વાળી પ્રીમિયમ રિસોર્ટ (કેલંગુટ / બાગા બીચ નજીક)',
      'દરરોજ સવારનો સ્વાદિષ્ટ બુફે નાસ્તો & ૧ રાત ડિનર ક્રૂઝ',
      'નોર્થ ગોવા & સાઉથ ગોવા સાઇટસીઇંગ એસી ગાડીમાં',
      'ગોવા એરપોર્ટ / મદગાંવ રેલવે સ્ટેશન પિકઅપ અને ડ્રોપ',
    ],
    exclusionsGujarati: [
      'વોટર સ્પોર્ટ્સ (સ્કૂબા ડાઇવિંગ, બનાના રાઇડ, પેરાસેલિંગ)',
      'બપોર અને રાત્રિનું જમવાનું (ઇચ્છા મુજબ લોકલ રેસ્ટોરન્ટમાં)',
    ],
    itinerary: [
      {
        day: 1,
        title: 'ગોવા આગમન & બીચ રિલેક્સ',
        description: 'પિકઅપ બાદ રિસોર્ટ ચેક-ઇન. સાંજે કેલંગુટ બીચ પર સૂર્યાસ્ત અને રિલેક્સેશન.',
      },
      {
        day: 2,
        title: 'નોર્થ ગોવા બીચ ટૂર & ફોર્ટ અગુઆડા',
        description: 'ફોર્ટ અગુઆડા લાઈટહાઉસ, બાગા બીચ, અંજુના બીચ અને વાગાટોર બીચ (દિલ ચાહતા હૈ પોઇન્ટ).',
      },
      {
        day: 3,
        title: 'સાઉથ ગોવા હેરિટેજ ચર્ચિસ & માંડોવી ક્રૂઝ',
        description: 'ઓલ્ડ ગોવા બેસિલિકા ઓફ બોમ જીસસ ચર્ચ, મંગેશી મંદિર, મીરામાર બીચ અને સાંજે લાઈવ ડીજે ક્રૂઝ.',
      },
      {
        day: 4,
        title: 'વોટર સ્પોર્ટ્સ / દૂધસાગર વોટરફોલ (ઓપ્શનલ)',
        description: 'ગ્રાન્ડ આઇલેન્ડ સ્નોર્કલિંગ અથવા બીચ વોટર સ્પોર્ટ્સ & નાઇટ માર્કેટ એક્સપ્લોર.',
      },
      {
        day: 5,
        title: 'ગોવા એરપોર્ટ / સ્ટેશન ડ્રોપ',
        description: 'સવારનો નાસ્તો કરી શોપિંગ અને વિદાય.',
      },
    ],
    hotelCategory: 'પ્રીમિયમ સ્વિમિંગ પૂલ રિસોર્ટ',
    foodPlan: 'બ્રેકફાસ્ટ સામેલ (ગુજરાતી રેસ્ટોરન્ટ ઉપલબ્ધ)',
    transportDetails: 'પ્રાઇવેટ એસી વાહન',
    pickupCity: 'વડોદરા / અમદાવાદ / મુંબઈ / ગોવા',
  },
];

// ==========================================
// INITIAL TOUR INQUIRIES - Empty so no mock data is seeded
// ==========================================
export const INITIAL_TOUR_INQUIRIES: Omit<TourInquiry, 'id'>[] = [];
