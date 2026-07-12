import { supabase, isSupabaseConfigured } from './supabase';
import type { Account, Category, Store, Expense, ExpenseWithDetails, Income, IncomeWithDetails, Receipt, PermanentAsset, UserSession, Deposit, DepositWithDetails, Loan, LoanPayment, LoanWithDetails } from '../types';

// =========================================================================
// MOCK DATA SEED INITIALIZATION (FOR LOCAL OFFLINE / NO-SUPABASE MODE)
// =========================================================================

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', user_id: null, name: 'Food', icon: 'ShoppingCart', color: '#10b981', created_at: new Date().toISOString() },
  { id: 'c2', user_id: null, name: 'Kitchen ware', icon: 'Utensils', color: '#f97316', created_at: new Date().toISOString() },
  { id: 'c3', user_id: null, name: 'House rent', icon: 'Home', color: '#f59e0b', created_at: new Date().toISOString() },
  { id: 'c4', user_id: null, name: 'Health Insurance', icon: 'HeartPulse', color: '#ef4444', created_at: new Date().toISOString() },
  { id: 'c5', user_id: null, name: 'Radio Bill', icon: 'Tv', color: '#3b82f6', created_at: new Date().toISOString() },
  { id: 'c6', user_id: null, name: 'Mobile bill', icon: 'Smartphone', color: '#6366f1', created_at: new Date().toISOString() },
  { id: 'c7', user_id: null, name: 'Education', icon: 'BookOpen', color: '#8b5cf6', created_at: new Date().toISOString() },
  { id: 'c8', user_id: null, name: 'Shopping', icon: 'Tag', color: '#ec4899', created_at: new Date().toISOString() },
  { id: 'c9', user_id: null, name: 'Restaurant', icon: 'Coffee', color: '#f43f5e', created_at: new Date().toISOString() },
  { id: 'c10', user_id: null, name: 'Cosmetics', icon: 'Sparkles', color: '#d946ef', created_at: new Date().toISOString() },
  { id: 'c11', user_id: null, name: 'Medicine', icon: 'Activity', color: '#14b8a6', created_at: new Date().toISOString() },
  { id: 'c12', user_id: null, name: 'Book', icon: 'BookOpen', color: '#a855f7', created_at: new Date().toISOString() },
  { id: 'c13', user_id: null, name: 'Electronic', icon: 'Laptop', color: '#0ea5e9', created_at: new Date().toISOString() },
  { id: 'c14', user_id: null, name: 'Other', icon: 'HelpCircle', color: '#6b7280', created_at: new Date().toISOString() },
  { id: 'c15', user_id: null, name: 'Discount', icon: 'Percent', color: '#10b981', created_at: new Date().toISOString() },
];

const DEFAULT_STORES: (Store & { country?: string })[] = [
  // Germany
  { id: 's1', user_id: null, name: 'Lidl', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's2', user_id: null, name: 'Aldi Süd', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's3', user_id: null, name: 'Aldi Nord', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's4', user_id: null, name: 'REWE', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's5', user_id: null, name: 'EDEKA', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's6', user_id: null, name: 'Kaufland', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's7', user_id: null, name: 'dm-drogerie markt', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's8', user_id: null, name: 'Rossmann', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's9', user_id: null, name: 'Müller', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's10', user_id: null, name: 'IKEA', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's11', user_id: null, name: 'Decathlon', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's12', user_id: null, name: 'Penny', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's13', user_id: null, name: 'Netto', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's14', user_id: null, name: 'Washing Machine', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's15', user_id: null, name: 'Flink', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's16', user_id: null, name: 'Allan Pizza', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's17', user_id: null, name: '7 days curry & Pizza', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's18', user_id: null, name: 'Delhi Masala', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's19', user_id: null, name: 'Bollywood shop', country: 'Germany', created_at: new Date().toISOString() },
  { id: 's20', user_id: null, name: 'Fleischerei', country: 'Germany', created_at: new Date().toISOString() },

  // Bangladesh
  { id: 's21', user_id: null, name: 'Shwapno', country: 'Bangladesh', created_at: new Date().toISOString() },
  { id: 's22', user_id: null, name: 'Agora', country: 'Bangladesh', created_at: new Date().toISOString() },
  { id: 's23', user_id: null, name: 'Meena Bazar', country: 'Bangladesh', created_at: new Date().toISOString() },
  { id: 's24', user_id: null, name: 'Daily Shopping', country: 'Bangladesh', created_at: new Date().toISOString() },
  { id: 's25', user_id: null, name: 'Unimart', country: 'Bangladesh', created_at: new Date().toISOString() },
  { id: 's26', user_id: null, name: 'Prince Bazar', country: 'Bangladesh', created_at: new Date().toISOString() },
  { id: 's27', user_id: null, name: 'Aarong', country: 'Bangladesh', created_at: new Date().toISOString() },

  // India
  { id: 's28', user_id: null, name: 'Reliance Smart', country: 'India', created_at: new Date().toISOString() },
  { id: 's29', user_id: null, name: 'D-Mart', country: 'India', created_at: new Date().toISOString() },
  { id: 's30', user_id: null, name: 'Big Bazaar', country: 'India', created_at: new Date().toISOString() },
  { id: 's31', user_id: null, name: 'More Supermarket', country: 'India', created_at: new Date().toISOString() },
  { id: 's32', user_id: null, name: 'Spencer\'s', country: 'India', created_at: new Date().toISOString() },
  { id: 's33', user_id: null, name: 'Star Bazaar', country: 'India', created_at: new Date().toISOString() },
  { id: 's34', user_id: null, name: 'JioMart', country: 'India', created_at: new Date().toISOString() },

  // United States
  { id: 's35', user_id: null, name: 'Walmart', country: 'United States', created_at: new Date().toISOString() },
  { id: 's36', user_id: null, name: 'Target', country: 'United States', created_at: new Date().toISOString() },
  { id: 's37', user_id: null, name: 'Costco', country: 'United States', created_at: new Date().toISOString() },
  { id: 's38', user_id: null, name: 'Kroger', country: 'United States', created_at: new Date().toISOString() },
  { id: 's39', user_id: null, name: 'Whole Foods Market', country: 'United States', created_at: new Date().toISOString() },
  { id: 's40', user_id: null, name: 'Trader Joe\'s', country: 'United States', created_at: new Date().toISOString() },
  { id: 's41', user_id: null, name: 'Walgreens', country: 'United States', created_at: new Date().toISOString() },
  { id: 's42', user_id: null, name: 'CVS Pharmacy', country: 'United States', created_at: new Date().toISOString() },

  // United Kingdom
  { id: 's43', user_id: null, name: 'Tesco', country: 'United Kingdom', created_at: new Date().toISOString() },
  { id: 's44', user_id: null, name: 'Sainsbury\'s', country: 'United Kingdom', created_at: new Date().toISOString() },
  { id: 's45', user_id: null, name: 'Asda', country: 'United Kingdom', created_at: new Date().toISOString() },
  { id: 's46', user_id: null, name: 'Morrisons', country: 'United Kingdom', created_at: new Date().toISOString() },
  { id: 's47', user_id: null, name: 'Co-op Food', country: 'United Kingdom', created_at: new Date().toISOString() },
  { id: 's48', user_id: null, name: 'Marks & Spencer', country: 'United Kingdom', created_at: new Date().toISOString() },
  { id: 's49', user_id: null, name: 'Boots', country: 'United Kingdom', created_at: new Date().toISOString() },

  // Global Fallback Defaults
  { id: 's50', user_id: null, name: 'Amazon', created_at: new Date().toISOString() },
  { id: 's51', user_id: null, name: 'eBay', created_at: new Date().toISOString() },
  { id: 's52', user_id: null, name: 'AliExpress', created_at: new Date().toISOString() },
  { id: 's53', user_id: null, name: 'Uber / Rideshare', created_at: new Date().toISOString() },
  { id: 's54', user_id: null, name: 'Local Grocery', created_at: new Date().toISOString() },
  { id: 's55', user_id: null, name: 'Cafe & Restaurant', created_at: new Date().toISOString() },
];

const DEFAULT_ACCOUNTS = (userId: string): Account[] => [
  { id: 'a1', user_id: userId, name: 'Sparkasse Giro', type: 'bank', balance: 450.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'a2', user_id: userId, name: 'Revolut Asset', type: 'bank', balance: 1200.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'a3', user_id: userId, name: 'Cash Wallet', type: 'cash', balance: 45.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'a4', user_id: userId, name: 'Tagesgeld Savings', type: 'savings', balance: 3500.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const DEFAULT_EXPENSES = (userId: string): Expense[] => [
  {
    id: 'e1',
    user_id: userId,
    date: '2026-06-03',
    amount: 12.56,
    category_id: 'c8', // Shopping
    store_id: 's8', // Rossmann
    payment_account_id: 'a2',
    notes: 'Weleda Hair Serum',
    receipt_url: null,
    items: [
      { name: 'Weleda Hair Serum', amount: 12.555, category_id: 'c8' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e2',
    user_id: userId,
    date: '2026-06-03',
    amount: 5.81,
    category_id: 'c1', // Food
    store_id: 's12', // Penny
    payment_account_id: 'a1',
    notes: 'Penny Grocery Run',
    receipt_url: '/mock-receipt.png',
    items: [
      { name: 'Buttertoast', amount: 0.89, category_id: 'c1' },
      { name: 'Paratha (Tortillas Weizen)', amount: 1.59, category_id: 'c1' },
      { name: 'Milch - 1.5%', amount: 0.85, category_id: 'c1' },
      { name: 'Orange Curd (Solbella)', amount: 1.69, category_id: 'c1' },
      { name: 'Natur Joghurt 500g', amount: 0.79, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e3',
    user_id: userId,
    date: '2026-06-05',
    amount: 1.89,
    category_id: 'c1', // Food
    store_id: 's12', // Penny
    payment_account_id: 'a1',
    notes: 'Penny snacks',
    receipt_url: null,
    items: [
      { name: 'Apfel rot - 1kg', amount: 1.00, category_id: 'c1' },
      { name: 'Erdnuesse 0 Salz (Nutts)', amount: 0.89, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e4',
    user_id: userId,
    date: '2026-06-06',
    amount: 5.38,
    category_id: 'c1', // Food
    store_id: 's13', // Netto
    payment_account_id: 'a2',
    notes: 'Netto groceries',
    receipt_url: null,
    items: [
      { name: 'Bisc. Schokobrötchen (Bread - 12pcs)', amount: 1.99, category_id: 'c1' },
      { name: 'Gurken + Knotenbeutel (Cucumber)', amount: 0.71, category_id: 'c1' },
      { name: 'GL Naturjo. sort. 500g (Yoghurt)', amount: 0.69, category_id: 'c1' },
      { name: 'Erdäpfel 2kg (Potato)', amount: 1.99, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e5',
    user_id: userId,
    date: '2026-06-06',
    amount: 3.11,
    category_id: 'c1', // Food
    store_id: 's12', // Penny
    payment_account_id: 'a1',
    notes: 'Penny eggs & tomato',
    receipt_url: null,
    items: [
      { name: 'Rispentomaten 0.388kg', amount: 0.61692, category_id: 'c1' },
      { name: 'Eier BH 10ER OKT', amount: 2.49, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e6',
    user_id: userId,
    date: '2026-06-06',
    amount: 0.67,
    category_id: 'c10', // Other
    store_id: 's18', // Delhi Masala
    payment_account_id: 'a3',
    notes: 'Shared sweets',
    receipt_url: null,
    items: [
      { name: 'Sweet (for Sumon Da\'s house) - shared', amount: 0.666666667, category_id: 'c10' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e7',
    user_id: userId,
    date: '2026-06-06',
    amount: 1.33,
    category_id: 'c10', // Other
    store_id: 's4', // REWE
    payment_account_id: 'a1',
    notes: 'Shared ice cream',
    receipt_url: null,
    items: [
      { name: 'Ice Cream - 2pcs (II) - shared', amount: 1.33, category_id: 'c10' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e8',
    user_id: userId,
    date: '2026-06-07',
    amount: 17.40,
    category_id: 'c1', // Food
    store_id: 's15', // Flink
    payment_account_id: 'a1',
    notes: 'Basmati Rice 10kg',
    receipt_url: null,
    items: [
      { name: 'Basmati Rice (10kg)', amount: 17.40, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e9',
    user_id: userId,
    date: '2026-06-08',
    amount: 16.00,
    category_id: 'c10', // Other
    store_id: 's16', // Allan Pizza
    payment_account_id: 'a2',
    notes: 'Pizza and collagen',
    receipt_url: null,
    items: [
      { name: 'Pizza + Collagen', amount: 16.00, category_id: 'c10' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e10',
    user_id: userId,
    date: '2026-06-09',
    amount: 2.70,
    category_id: 'c10', // Other
    store_id: 's14', // Washing Machine
    payment_account_id: 'a3',
    notes: 'Laundry',
    receipt_url: null,
    items: [
      { name: 'Cloth Wash', amount: 2.70, category_id: 'c10' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e11',
    user_id: userId,
    date: '2026-06-10',
    amount: 4.00,
    category_id: 'c1', // Food
    store_id: 's17', // 7 Days Curry
    payment_account_id: 'a1',
    notes: 'Jackfruit & chili',
    receipt_url: null,
    items: [
      { name: 'Jackfruit', amount: 3.00, category_id: 'c1' },
      { name: 'Green Chili 100gm', amount: 1.00, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e12',
    user_id: userId,
    date: '2026-06-12',
    amount: 5.03,
    category_id: 'c1', // Food
    store_id: 's6', // Kaufland
    payment_account_id: 'a2',
    notes: 'Fisch & Ketchup',
    receipt_url: null,
    items: [
      { name: 'Sardine Fisch (Shared)', amount: 2.45, category_id: 'c1' },
      { name: 'Tomatenketchup hot', amount: 1.29, category_id: 'c1' },
      { name: 'KLC. Rapsöl', amount: 1.29, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e13',
    user_id: userId,
    date: '2026-06-16',
    amount: 3.98,
    category_id: 'c1', // Food
    store_id: 's13', // Netto
    payment_account_id: 'a2',
    notes: 'Netto groceries',
    receipt_url: null,
    items: [
      { name: 'Gemuse (Pf. Asia Sort 740gm)', amount: 1.99, category_id: 'c1' },
      { name: 'Bisc. Schokobrötchen (Bread - 12pcs)', amount: 1.99, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e14',
    user_id: userId,
    date: '2026-06-16',
    amount: 8.43,
    category_id: 'c1', // Food
    store_id: 's12', // Penny
    payment_account_id: 'a1',
    notes: 'Penny shopping',
    receipt_url: null,
    items: [
      { name: 'Banana(0.774gm) - 6pcs', amount: 1.00, category_id: 'c1' },
      { name: 'Rispentomaten 0.490kg', amount: 0.49, category_id: 'c1' },
      { name: 'Buttertoast', amount: 0.89, category_id: 'c1' },
      { name: 'Tortillas Weizen (Ruti) - 8pcs', amount: 1.59, category_id: 'c1' },
      { name: 'Zwiebeln 2kg', amount: 1.69, category_id: 'c1' },
      { name: 'Cherry Romatom', amount: 0.99, category_id: 'c1' },
      { name: 'Erdnuesse - 2 pkts', amount: 1.78, category_id: 'c1' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e15',
    user_id: userId,
    date: '2026-06-08',
    amount: 264.50,
    category_id: 'c3', // House rent
    store_id: null,
    payment_account_id: 'a1',
    notes: 'House Rent Payment',
    receipt_url: null,
    items: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e16',
    user_id: userId,
    date: '2026-06-15',
    amount: 151.42,
    category_id: 'c4', // Health Insurance
    store_id: null,
    payment_account_id: 'a1',
    notes: 'AOK Health Insurance',
    receipt_url: null,
    items: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e17',
    user_id: userId,
    date: '2026-06-19',
    amount: 10.00,
    category_id: 'c6', // Mobile bill
    store_id: null,
    payment_account_id: 'a1',
    notes: 'Aldi Talk Mobile Pre-paid',
    receipt_url: null,
    items: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_INCOME = (_userId: string): Income[] => [
];

// Ensure local storage tables exist
function initLocalStorage(userId: string) {
  if (!localStorage.getItem('bb-accounts')) {
    localStorage.setItem('bb-accounts', JSON.stringify(DEFAULT_ACCOUNTS(userId)));
  }
  
  const localCats = localStorage.getItem('bb-categories');
  if (!localCats) {
    const initialCats = DEFAULT_CATEGORIES.map(c => {
      const isBill = ['House rent', 'Health Insurance', 'Radio Bill', 'Mobile bill'].includes(c.name);
      const isEdu = c.name === 'Education';
      let amt = 0.00;
      if (c.name === 'House rent') amt = 264.50;
      else if (c.name === 'Health Insurance') amt = 151.42;
      else if (c.name === 'Radio Bill') amt = 18.36;
      else if (c.name === 'Mobile bill') amt = 10.00;
      else if (c.name === 'Education') amt = 350.00;
      
      return {
        ...c,
        user_id: userId,
        is_monthly_bill: isBill,
        monthly_amount: amt,
        preferred_account_id: null,
        is_active: isEdu ? false : true
      };
    });
    localStorage.setItem('bb-categories', JSON.stringify(initialCats));
  } else {
    try {
      const parsedCats = JSON.parse(localCats) as Category[];
      let updated = false;
      const migratedCats = parsedCats.map(c => {
        if (c.is_monthly_bill === undefined) {
          updated = true;
          const isBill = ['House rent', 'Health Insurance', 'Radio Bill', 'Mobile bill'].includes(c.name);
          const isEdu = c.name === 'Education';
          let amt = 0.00;
          if (c.name === 'House rent') amt = 264.50;
          else if (c.name === 'Health Insurance') amt = 151.42;
          else if (c.name === 'Radio Bill') amt = 18.36;
          else if (c.name === 'Mobile bill') amt = 10.00;
          else if (c.name === 'Education') amt = 350.00;

          return {
            ...c,
            user_id: c.user_id || userId,
            is_monthly_bill: isBill,
            monthly_amount: amt,
            preferred_account_id: null,
            is_active: isEdu ? false : true
          };
        }
        return c;
      });

      const missingCats = DEFAULT_CATEGORIES.filter(dc => !migratedCats.some(pc => pc.name.toLowerCase() === dc.name.toLowerCase()));
      if (missingCats.length > 0 || updated) {
        const added = missingCats.map(c => {
          const isBill = ['House rent', 'Health Insurance', 'Radio Bill', 'Mobile bill'].includes(c.name);
          const isEdu = c.name === 'Education';
          let amt = 0.00;
          if (c.name === 'House rent') amt = 264.50;
          else if (c.name === 'Health Insurance') amt = 151.42;
          else if (c.name === 'Radio Bill') amt = 18.36;
          else if (c.name === 'Mobile bill') amt = 10.00;
          else if (c.name === 'Education') amt = 350.00;
          return {
            ...c,
            user_id: userId,
            is_monthly_bill: isBill,
            monthly_amount: amt,
            preferred_account_id: null,
            is_active: isEdu ? false : true
          };
        });
        localStorage.setItem('bb-categories', JSON.stringify([...migratedCats, ...added]));
      }
    } catch (e) {
      localStorage.setItem('bb-categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
  }

  const localStores = localStorage.getItem('bb-stores');
  // Get user's residence country
  const mockProfileStr = localStorage.getItem('bb-mock-profile');
  let userCountry: string | null = null;
  if (mockProfileStr) {
    try {
      const prof = JSON.parse(mockProfileStr);
      userCountry = prof.residence_country || null;
    } catch (e) {}
  }

  // Filter default stores by country
  let filteredDefaults = DEFAULT_STORES.filter(s => s.country === userCountry);
  if (filteredDefaults.length === 0) {
    // Fallback to global defaults (stores with no country specified)
    filteredDefaults = DEFAULT_STORES.filter(s => !s.country);
  }

  if (!localStores) {
    const initialStores = filteredDefaults.map(s => ({
      id: s.id,
      name: s.name,
      user_id: userId,
      rendering_name: null,
      created_at: s.created_at
    }));
    localStorage.setItem('bb-stores', JSON.stringify(initialStores));
  } else {
    try {
      const parsedStores = JSON.parse(localStores) as Store[];
      let updated = false;
      const migratedStores = parsedStores.map(s => {
        if (!s.user_id) {
          updated = true;
          return { ...s, user_id: userId };
        }
        return s;
      });
      const missingStores = filteredDefaults.filter(ds => !migratedStores.some(ps => ps.name.toLowerCase() === ds.name.toLowerCase()));
      if (missingStores.length > 0 || updated) {
        const added = missingStores.map(s => ({
          id: s.id,
          name: s.name,
          user_id: userId,
          rendering_name: null,
          created_at: s.created_at
        }));
        localStorage.setItem('bb-stores', JSON.stringify([...migratedStores, ...added]));
      }
    } catch (e) {
      const initialStores = filteredDefaults.map(s => ({
        id: s.id,
        name: s.name,
        user_id: userId,
        rendering_name: null,
        created_at: s.created_at
      }));
      localStorage.setItem('bb-stores', JSON.stringify(initialStores));
    }
  }

  if (!localStorage.getItem('bb-expenses')) {
    localStorage.setItem('bb-expenses', JSON.stringify(DEFAULT_EXPENSES(userId)));
  }
  if (!localStorage.getItem('bb-income')) {
    localStorage.setItem('bb-income', JSON.stringify(DEFAULT_INCOME(userId)));
  }
  if (!localStorage.getItem('bb-receipts')) {
    localStorage.setItem('bb-receipts', JSON.stringify([]));
  }
  if (!localStorage.getItem('bb-permanent-assets')) {
    localStorage.setItem('bb-permanent-assets', JSON.stringify([
      {
        id: 'pa1',
        user_id: userId,
        name: 'Washing Machine',
        store: 'Saturn',
        price: 299.99,
        date: '2026-06-09',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ]));
  }
  if (!localStorage.getItem('bb-deposits')) {
    localStorage.setItem('bb-deposits', JSON.stringify([]));
  }
  if (!localStorage.getItem('bb-loans')) {
    localStorage.setItem('bb-loans', JSON.stringify([]));
  }
}

// Helper to get raw items
function getLocalItems<T>(key: string): T[] {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

// Helper to save raw items
function setLocalItems<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

const notifyDataChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('budget-buddy-data-change'));
  }
};

// =========================================================================
// DATA ACCESS LAYER EXPORTS
// =========================================================================

export const db = {
  // ACCOUNTS
  getAccounts: async (userId: string): Promise<Account[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      return getLocalItems<Account>('bb-accounts');
    }
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  createAccount: async (userId: string, account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Account> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const accounts = getLocalItems<Account>('bb-accounts');
      const newAcc: Account = {
        ...account,
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      accounts.push(newAcc);
      setLocalItems('bb-accounts', accounts);
      notifyDataChange();
      return newAcc;
    }
    const { data, error } = await supabase
      .from('accounts')
      .insert({ user_id: userId, ...account })
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  // CATEGORIES
  getCategories: async (userId: string): Promise<Category[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      return getLocalItems<Category>('bb-categories');
    }
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    
    if (data && data.length > 0) {
      return data;
    }
    
    // Fallback: seed/fetch global defaults
    const { data: globalData, error: gError } = await supabase
      .from('categories')
      .select('*')
      .is('user_id', null)
      .order('name', { ascending: true });
    if (gError) throw gError;
    return globalData || [];
  },

  createCategory: async (
    userId: string, 
    name: string, 
    icon: string, 
    color: string,
    isMonthlyBill = false,
    monthlyAmount = 0.00,
    preferredAccountId: string | null = null
  ): Promise<Category> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const categories = getLocalItems<Category>('bb-categories');
      const newCat: Category = {
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        icon,
        color,
        is_monthly_bill: isMonthlyBill,
        monthly_amount: monthlyAmount,
        preferred_account_id: preferredAccountId,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      categories.push(newCat);
      setLocalItems('bb-categories', categories);
      notifyDataChange();
      return newCat;
    }
    const { data, error } = await supabase
      .from('categories')
      .insert({ 
        user_id: userId, 
        name, 
        icon, 
        color,
        is_monthly_bill: isMonthlyBill,
        monthly_amount: monthlyAmount,
        preferred_account_id: preferredAccountId
      })
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  updateCategory: async (userId: string, categoryId: string, updates: Partial<Category>): Promise<Category> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const categories = getLocalItems<Category>('bb-categories');
      const idx = categories.findIndex(c => c.id === categoryId);
      if (idx === -1) throw new Error('Category not found');
      
      const updatedCat = {
        ...categories[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };
      categories[idx] = updatedCat;
      setLocalItems('bb-categories', categories);
      notifyDataChange();
      return updatedCat;
    }
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  deleteCategory: async (userId: string, categoryId: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      let categories = getLocalItems<Category>('bb-categories');
      categories = categories.filter(c => c.id !== categoryId);
      setLocalItems('bb-categories', categories);
      notifyDataChange();
      return;
    }
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);
    if (error) throw error;
    notifyDataChange();
  },

  // STORES
  getStores: async (userId: string): Promise<Store[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      return getLocalItems<Store>('bb-stores').filter(s => s.user_id === userId);
    }
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  createStore: async (userId: string, name: string): Promise<Store> => {
    // Normalize store name (e.g., Net -> Netto)
    const normalizeStoreName = (n: string): string => {
      const trimmed = n.trim();
      if (/^net(to)?$/i.test(trimmed)) {
        return 'Netto';
      }
      return trimmed;
    };
    const normalizedName = normalizeStoreName(name);

    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const stores = getLocalItems<Store>('bb-stores');
      // Case insensitive check
      const existing = stores.find(s => s.user_id === userId && s.name.toLowerCase() === normalizedName.toLowerCase());
      if (existing) return existing;

      const newStore: Store = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: normalizedName,
        rendering_name: null,
        created_at: new Date().toISOString(),
      };
      stores.push(newStore);
      setLocalItems('bb-stores', stores);
      notifyDataChange();
      return newStore;
    }
    // Try to find first or insert
    const { data: existing } = await supabase
      .from('stores')
      .select('*')
      .eq('name', normalizedName)
      .eq('user_id', userId);
      
    if (existing && existing.length > 0) {
      return existing[0];
    }

    const { data, error } = await supabase
      .from('stores')
      .insert({ user_id: userId, name: normalizedName })
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  updateStore: async (userId: string, storeId: string, updates: Partial<Store>): Promise<Store> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const stores = getLocalItems<Store>('bb-stores');
      const idx = stores.findIndex(s => s.id === storeId);
      if (idx === -1) throw new Error('Store not found');
      
      const updatedStore = {
        ...stores[idx],
        ...updates,
      };
      stores[idx] = updatedStore;
      setLocalItems('bb-stores', stores);
      notifyDataChange();
      return updatedStore;
    }
    const { data, error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', storeId)
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  deleteStore: async (userId: string, storeId: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      let stores = getLocalItems<Store>('bb-stores');
      stores = stores.filter(s => s.id !== storeId);
      setLocalItems('bb-stores', stores);
      notifyDataChange();
      return;
    }
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId);
    if (error) throw error;
    notifyDataChange();
  },

  // EXPENSES
  getExpenses: async (userId: string): Promise<ExpenseWithDetails[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const expenses = getLocalItems<Expense>('bb-expenses');
      const categories = getLocalItems<Category>('bb-categories');
      const stores = getLocalItems<Store>('bb-stores');
      const accounts = getLocalItems<Account>('bb-accounts');

      return expenses
        .filter(e => e.user_id === userId)
        .map(e => ({
          ...e,
          category: categories.find(c => c.id === e.category_id) || null,
          store: stores.find(s => s.id === e.store_id) || null,
          account: accounts.find(a => a.id === e.payment_account_id) || null,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:category_id(*), store:store_id(*), account:payment_account_id(*)')
      .order('date', { ascending: false });

    if (error) throw error;
    return (data as any) || [];
  },

  createExpense: async (userId: string, expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const expenses = getLocalItems<Expense>('bb-expenses');
      const accounts = getLocalItems<Account>('bb-accounts');

      const newExp: Expense = {
        ...expense,
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      expenses.push(newExp);
      setLocalItems('bb-expenses', expenses);

      // Adjust account balance manually
      const updatedAccounts = accounts.map(a => {
        if (a.id === expense.payment_account_id) {
          return { ...a, balance: a.balance - expense.amount, updated_at: new Date().toISOString() };
        }
        return a;
      });
      setLocalItems('bb-accounts', updatedAccounts);

      notifyDataChange();
      return newExp;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expense, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  updateExpense: async (userId: string, expenseId: string, updates: Partial<Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Expense> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const expenses = getLocalItems<Expense>('bb-expenses');
      const accounts = getLocalItems<Account>('bb-accounts');

      const expIdx = expenses.findIndex(e => e.id === expenseId && e.user_id === userId);
      if (expIdx === -1) throw new Error('Expense not found');

      const oldExp = expenses[expIdx];
      const newExp = { ...oldExp, ...updates, updated_at: new Date().toISOString() };
      expenses[expIdx] = newExp;
      setLocalItems('bb-expenses', expenses);

      // Adjust balances manually
      let updatedAccounts = [...accounts];
      if (updates.amount !== undefined || updates.payment_account_id !== undefined) {
        const targetAccountId = updates.payment_account_id || oldExp.payment_account_id;
        const targetAmount = updates.amount !== undefined ? updates.amount : oldExp.amount;

        if (oldExp.payment_account_id === targetAccountId) {
          // Adjust single account
          updatedAccounts = updatedAccounts.map(a => {
            if (a.id === targetAccountId) {
              return { ...a, balance: a.balance + oldExp.amount - targetAmount, updated_at: new Date().toISOString() };
            }
            return a;
          });
        } else {
          // Revert old account
          updatedAccounts = updatedAccounts.map(a => {
            if (a.id === oldExp.payment_account_id) {
              return { ...a, balance: a.balance + oldExp.amount, updated_at: new Date().toISOString() };
            }
            // Subtract from new account
            if (a.id === targetAccountId) {
              return { ...a, balance: a.balance - targetAmount, updated_at: new Date().toISOString() };
            }
            return a;
          });
        }
        setLocalItems('bb-accounts', updatedAccounts);
      }

      notifyDataChange();
      return newExp;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  deleteExpense: async (userId: string, expenseId: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const expenses = getLocalItems<Expense>('bb-expenses');
      const accounts = getLocalItems<Account>('bb-accounts');

      const exp = expenses.find(e => e.id === expenseId && e.user_id === userId);
      if (!exp) return;

      setLocalItems('bb-expenses', expenses.filter(e => e.id !== expenseId));

      // Revert account balance
      const updatedAccounts = accounts.map(a => {
        if (a.id === exp.payment_account_id) {
          return { ...a, balance: a.balance + exp.amount, updated_at: new Date().toISOString() };
        }
        return a;
      });
      setLocalItems('bb-accounts', updatedAccounts);
      notifyDataChange();
      return;
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    if (error) throw error;
    notifyDataChange();
  },

  // INCOME
  getIncome: async (userId: string): Promise<IncomeWithDetails[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const income = getLocalItems<Income>('bb-income');
      const accounts = getLocalItems<Account>('bb-accounts');

      return income
        .filter(i => i.user_id === userId)
        .map(i => ({
          ...i,
          account: accounts.find(a => a.id === i.destination_account_id) || null,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const { data, error } = await supabase
      .from('income')
      .select('*, account:destination_account_id(*)')
      .order('date', { ascending: false });

    if (error) throw error;
    return (data as any) || [];
  },

  createIncome: async (userId: string, income: Omit<Income, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Income> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const incomes = getLocalItems<Income>('bb-income');
      const accounts = getLocalItems<Account>('bb-accounts');

      const newInc: Income = {
        ...income,
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      incomes.push(newInc);
      setLocalItems('bb-income', incomes);

      // Adjust account balance manually
      const updatedAccounts = accounts.map(a => {
        if (a.id === income.destination_account_id) {
          return { ...a, balance: a.balance + income.amount, updated_at: new Date().toISOString() };
        }
        return a;
      });
      setLocalItems('bb-accounts', updatedAccounts);

      notifyDataChange();
      return newInc;
    }

    const { data, error } = await supabase
      .from('income')
      .insert({ ...income, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  deleteIncome: async (userId: string, incomeId: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const incomes = getLocalItems<Income>('bb-income');
      const accounts = getLocalItems<Account>('bb-accounts');

      const inc = incomes.find(i => i.id === incomeId && i.user_id === userId);
      if (!inc) return;

      setLocalItems('bb-income', incomes.filter(i => i.id !== incomeId));

      // Revert account balance
      const updatedAccounts = accounts.map(a => {
        if (a.id === inc.destination_account_id) {
          return { ...a, balance: a.balance - inc.amount, updated_at: new Date().toISOString() };
        }
        return a;
      });
      setLocalItems('bb-accounts', updatedAccounts);
      notifyDataChange();
      return;
    }

    const { error } = await supabase
      .from('income')
      .delete()
      .eq('id', incomeId);
    if (error) throw error;
    notifyDataChange();
  },

  // RECEIPTS & OCR PREFILL MOCKUP
  uploadReceipt: async (userId: string, file: File): Promise<Partial<Receipt> & { extracted_items?: any[]; extracted_discount?: number }> => {
    const previewUrl = URL.createObjectURL(file);
    let apiKey = '';
    if (!isSupabaseConfigured) {
      const savedProfile = localStorage.getItem('bb-mock-profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          apiKey = parsed.gemini_api_key || '';
        } catch (e) {
          console.error('Error parsing mock profile for API key:', e);
        }
      }
    } else {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gemini_api_key')
          .eq('id', userId)
          .single();
        apiKey = profile?.gemini_api_key || '';
      } catch (e) {
        console.error('Error fetching profile for API key:', e);
      }
    }

    const fileToBase64 = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    };

    let extractedStore = '';
    let extractedAmount = 0;
    let extractedDate = new Date().toISOString().split('T')[0];
    let extractedDiscount = 0;
    let extractedItems: any[] = [];

    if (apiKey) {
      try {
        const base64Data = await fileToBase64(file);
        const base64Content = base64Data.split(',')[1];
        const mimeType = file.type || 'image/jpeg';

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `Analyze this receipt image and extract:
1. Store/merchant name (e.g. Lidl, REWE, Aldi, dm, Rossmann, Netto, Penny, etc.)
2. Transaction date in YYYY-MM-DD format
3. Total amount (number)
4. Total discount on this purchase (number, positive value, 0 if none)
5. Items breakdown list. For each item, extract its name, category classification (categorize into one of: 'Food', 'Kitchen ware', 'Shopping', 'Restaurant', 'Other'), and price/amount.

Output your response as a raw JSON object ONLY (do not wrap in markdown or backticks) matching this typescript interface:
interface ReceiptAnalysis {
  storeName: string;
  date: string;
  amount: number;
  discount: number;
  items: { name: string; amount: number; categoryName: 'Food' | 'Kitchen ware' | 'Shopping' | 'Restaurant' | 'Other' }[];
}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Content,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Failed to extract text from Gemini response');
        }

        // Clean the text to parse JSON
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);

        extractedStore = parsed.storeName || '';
        extractedDate = parsed.date || new Date().toISOString().split('T')[0];
        extractedAmount = parsed.amount || 0;
        extractedDiscount = parsed.discount || 0;
        extractedItems = parsed.items || [];
      } catch (err) {
        console.error('Gemini OCR scan failed, falling back to mock:', err);
        // Fallback to mock
        const mockStores = ['REWE', 'Lidl', 'Aldi Süd', 'dm-drogerie markt', 'Rossmann', 'EDEKA'];
        extractedStore = mockStores[Math.floor(Math.random() * mockStores.length)];
        extractedAmount = parseFloat((Math.random() * 45 + 5).toFixed(2));
        extractedDate = new Date().toISOString().split('T')[0];
      }
    } else {
      // Mock processing delay of 1.5 seconds for OCR extraction
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockStores = ['REWE', 'Lidl', 'Aldi Süd', 'dm-drogerie markt', 'Rossmann', 'EDEKA'];
      extractedStore = mockStores[Math.floor(Math.random() * mockStores.length)];
      extractedAmount = parseFloat((Math.random() * 45 + 5).toFixed(2));
      extractedDate = new Date().toISOString().split('T')[0];
    }

    // Now normalize the store name
    const normalizeStoreName = (name: string): string => {
      const trimmed = name.trim();
      if (/^net(to)?$/i.test(trimmed)) {
        return 'Netto';
      }
      return trimmed;
    };

    extractedStore = normalizeStoreName(extractedStore);

    if (!isSupabaseConfigured) {
      const receipts = getLocalItems<Receipt>('bb-receipts');
      const newRec: Receipt = {
        id: crypto.randomUUID(),
        user_id: userId,
        file_url: previewUrl,
        extracted_store_name: extractedStore,
        extracted_date: extractedDate,
        extracted_amount: extractedAmount,
        status: 'processed',
        created_at: new Date().toISOString(),
      };
      receipts.push(newRec);
      setLocalItems('bb-receipts', receipts);
      return { ...newRec, extracted_items: extractedItems, extracted_discount: extractedDiscount };
    }

    try {
      // 1. Upload to Supabase Storage Bucket 'receipts'
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // 2. Insert into receipts table
      const { data: receipt, error: dbError } = await supabase
        .from('receipts')
        .insert({
          user_id: userId,
          file_url: publicUrl,
          extracted_store_name: extractedStore,
          extracted_date: extractedDate,
          extracted_amount: extractedAmount,
          status: 'processed',
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return { ...receipt, extracted_items: extractedItems, extracted_discount: extractedDiscount };
    } catch (e) {
      console.error('Supabase Receipt upload/OCR error, falling back to local simulation:', e);
      // Fallback
      return {
        file_url: previewUrl,
        extracted_store_name: extractedStore,
        extracted_date: extractedDate,
        extracted_amount: extractedAmount,
        status: 'processed',
        extracted_items: extractedItems,
        extracted_discount: extractedDiscount,
      };
    }
  },

  // AVATARS
  uploadAvatar: async (userId: string, file: File): Promise<string> => {
    if (!isSupabaseConfigured) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (e) {
      console.error('Supabase avatar upload error, falling back to local simulation:', e);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  },

  // PERMANENT ASSETS
  getPermanentAssets: async (userId: string): Promise<PermanentAsset[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      return getLocalItems<PermanentAsset>('bb-permanent-assets');
    }
    const { data, error } = await supabase
      .from('permanent_assets')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  createPermanentAsset: async (userId: string, asset: Omit<PermanentAsset, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PermanentAsset> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const assets = getLocalItems<PermanentAsset>('bb-permanent-assets');
      const newAsset: PermanentAsset = {
        ...asset,
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      assets.push(newAsset);
      setLocalItems('bb-permanent-assets', assets);
      notifyDataChange();
      return newAsset;
    }
    const { data, error } = await supabase
      .from('permanent_assets')
      .insert({ ...asset, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  deletePermanentAsset: async (userId: string, id: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const assets = getLocalItems<PermanentAsset>('bb-permanent-assets');
      const filtered = assets.filter(a => a.id !== id);
      setLocalItems('bb-permanent-assets', filtered);
      notifyDataChange();
      return;
    }
    const { error } = await supabase
      .from('permanent_assets')
      .delete()
      .eq('id', id);
    if (error) throw error;
    notifyDataChange();
  },

  // USER SESSIONS / DEVICES
  getUserSessions: async (userId: string): Promise<UserSession[]> => {
    if (!isSupabaseConfigured) {
      return getLocalItems<UserSession>('bb-sessions').filter(s => s.user_id === userId);
    }
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  createUserSession: async (userId: string, session: { session_key: string, device_name: string, user_agent: string }): Promise<UserSession> => {
    if (!isSupabaseConfigured) {
      const sessions = getLocalItems<UserSession>('bb-sessions');
      const existingIdx = sessions.findIndex(s => s.user_id === userId && s.session_key === session.session_key);
      
      if (existingIdx !== -1) {
        sessions[existingIdx] = {
          ...sessions[existingIdx],
          user_agent: session.user_agent,
          device_name: session.device_name,
          last_active_at: new Date().toISOString()
        };
        setLocalItems('bb-sessions', sessions);
        return sessions[existingIdx];
      }

      const newSession: UserSession = {
        id: crypto.randomUUID(),
        user_id: userId,
        session_key: session.session_key,
        user_agent: session.user_agent,
        device_name: session.device_name,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      sessions.push(newSession);
      setLocalItems('bb-sessions', sessions);
      return newSession;
    }

    const { data, error } = await supabase
      .from('user_sessions')
      .upsert({
        user_id: userId,
        session_key: session.session_key,
        device_name: session.device_name,
        user_agent: session.user_agent,
        last_active_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,session_key'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteUserSession: async (userId: string, sessionId: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      const sessions = getLocalItems<UserSession>('bb-sessions');
      const filtered = sessions.filter(s => s.id !== sessionId);
      setLocalItems('bb-sessions', filtered);
      return;
    }
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  updateUserSessionActivity: async (userId: string, sessionKey: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      const sessions = getLocalItems<UserSession>('bb-sessions');
      const idx = sessions.findIndex(s => s.user_id === userId && s.session_key === sessionKey);
      if (idx !== -1) {
        sessions[idx].last_active_at = new Date().toISOString();
        setLocalItems('bb-sessions', sessions);
      }
      return;
    }
    const { error } = await supabase
      .from('user_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('session_key', sessionKey);
    if (error) throw error;
  },

  // DEPOSITS
  getDeposits: async (userId: string): Promise<DepositWithDetails[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const deposits = getLocalItems<Deposit>('bb-deposits');
      const accounts = getLocalItems<Account>('bb-accounts');
      return deposits
        .filter(d => d.user_id === userId)
        .map(d => ({
          ...d,
          account: accounts.find(a => a.id === d.to_account_id) || null,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const { data, error } = await supabase
      .from('deposits')
      .select('*, account:to_account_id(*)')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as unknown as DepositWithDetails[]) || [];
  },

  createDeposit: async (userId: string, deposit: Omit<Deposit, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Deposit> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const deposits = getLocalItems<Deposit>('bb-deposits');
      const accounts = getLocalItems<Account>('bb-accounts');

      const newDep: Deposit = {
        ...deposit,
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      deposits.push(newDep);
      setLocalItems('bb-deposits', deposits);

      const updatedAccounts = accounts.map(a => {
        if (a.id === deposit.to_account_id) {
          return { ...a, balance: a.balance + deposit.amount, updated_at: new Date().toISOString() };
        }
        return a;
      });
      setLocalItems('bb-accounts', updatedAccounts);
      notifyDataChange();
      return newDep;
    }
    const { data, error } = await supabase
      .from('deposits')
      .insert({ ...deposit, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  updateDeposit: async (userId: string, depositId: string, updates: Partial<Omit<Deposit, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Deposit> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const deposits = getLocalItems<Deposit>('bb-deposits');
      const accounts = getLocalItems<Account>('bb-accounts');

      const depIdx = deposits.findIndex(d => d.id === depositId && d.user_id === userId);
      if (depIdx === -1) throw new Error('Deposit not found');

      const oldDep = deposits[depIdx];
      const newDep = { ...oldDep, ...updates, updated_at: new Date().toISOString() };
      deposits[depIdx] = newDep;
      setLocalItems('bb-deposits', deposits);

      let updatedAccounts = [...accounts];
      if (updates.amount !== undefined || updates.to_account_id !== undefined) {
        const targetAccountId = updates.to_account_id || oldDep.to_account_id;
        const targetAmount = updates.amount !== undefined ? updates.amount : oldDep.amount;

        if (oldDep.to_account_id === targetAccountId) {
          updatedAccounts = updatedAccounts.map(a => {
            if (a.id === targetAccountId) {
              return { ...a, balance: a.balance - oldDep.amount + targetAmount, updated_at: new Date().toISOString() };
            }
            return a;
          });
        } else {
          updatedAccounts = updatedAccounts.map(a => {
            if (a.id === oldDep.to_account_id) {
              return { ...a, balance: a.balance - oldDep.amount, updated_at: new Date().toISOString() };
            }
            if (a.id === targetAccountId) {
              return { ...a, balance: a.balance + targetAmount, updated_at: new Date().toISOString() };
            }
            return a;
          });
        }
        setLocalItems('bb-accounts', updatedAccounts);
      }
      notifyDataChange();
      return newDep;
    }
    const { data, error } = await supabase
      .from('deposits')
      .update(updates)
      .eq('id', depositId)
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  deleteDeposit: async (userId: string, depositId: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const deposits = getLocalItems<Deposit>('bb-deposits');
      const accounts = getLocalItems<Account>('bb-accounts');

      const dep = deposits.find(d => d.id === depositId && d.user_id === userId);
      if (!dep) return;

      setLocalItems('bb-deposits', deposits.filter(d => d.id !== depositId));

      const updatedAccounts = accounts.map(a => {
        if (a.id === dep.to_account_id) {
          return { ...a, balance: a.balance - dep.amount, updated_at: new Date().toISOString() };
        }
        return a;
      });
      setLocalItems('bb-accounts', updatedAccounts);
      notifyDataChange();
      return;
    }
    const { error } = await supabase
      .from('deposits')
      .delete()
      .eq('id', depositId);
    if (error) throw error;
    notifyDataChange();
  },

  // LOANS
  getLoans: async (userId: string): Promise<LoanWithDetails[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const loans = getLocalItems<Loan>('bb-loans');
      const accounts = getLocalItems<Account>('bb-accounts');
      return loans
        .filter(l => l.user_id === userId)
        .map(l => ({
          ...l,
          account: accounts.find(a => a.id === l.account_id) || null,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const { data, error } = await supabase
      .from('loans')
      .select('*, account:account_id(*)')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as unknown as LoanWithDetails[]) || [];
  },

  createLoan: async (userId: string, loan: Omit<Loan, 'id' | 'user_id' | 'remaining_amount' | 'status' | 'payments' | 'created_at' | 'updated_at'>): Promise<Loan> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const loans = getLocalItems<Loan>('bb-loans');
      const accounts = getLocalItems<Account>('bb-accounts');

      const newLoan: Loan = {
        ...loan,
        id: crypto.randomUUID(),
        user_id: userId,
        remaining_amount: loan.amount,
        status: 'active',
        payments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      loans.push(newLoan);
      setLocalItems('bb-loans', loans);

      const updatedAccounts = accounts.map(a => {
        if (a.id === loan.account_id) {
          const change = loan.type === 'taken' ? loan.amount : -loan.amount;
          return { ...a, balance: a.balance + change, updated_at: new Date().toISOString() };
        }
        return a;
      });
      setLocalItems('bb-accounts', updatedAccounts);
      notifyDataChange();
      return newLoan;
    }
    const { data, error } = await supabase
      .from('loans')
      .insert({ 
        ...loan, 
        user_id: userId, 
        remaining_amount: loan.amount, 
        status: 'active', 
        payments: [] 
      })
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  updateLoan: async (userId: string, loanId: string, updates: Partial<Omit<Loan, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Loan> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const loans = getLocalItems<Loan>('bb-loans');
      const accounts = getLocalItems<Account>('bb-accounts');

      const idx = loans.findIndex(l => l.id === loanId && l.user_id === userId);
      if (idx === -1) throw new Error('Loan not found');

      const oldLoan = loans[idx];
      const newLoan = { ...oldLoan, ...updates, updated_at: new Date().toISOString() };
      
      if (updates.amount !== undefined) {
        const totalPaid = (oldLoan.payments || []).reduce((sum, p) => sum + p.amount, 0);
        newLoan.remaining_amount = Math.max(updates.amount - totalPaid, 0);
        newLoan.status = newLoan.remaining_amount <= 0 ? 'settled' : 'active';
      }

      loans[idx] = newLoan;
      setLocalItems('bb-loans', loans);

      let updatedAccounts = [...accounts];
      if (updates.amount !== undefined || updates.account_id !== undefined || updates.type !== undefined) {
        const targetAccountId = updates.account_id || oldLoan.account_id;
        const targetType = updates.type || oldLoan.type;
        const targetAmount = updates.amount !== undefined ? updates.amount : oldLoan.amount;

        const oldFactor = oldLoan.type === 'taken' ? 1 : -1;
        const newFactor = targetType === 'taken' ? 1 : -1;

        if (oldLoan.account_id === targetAccountId) {
          updatedAccounts = updatedAccounts.map(a => {
            if (a.id === targetAccountId) {
              return { 
                ...a, 
                balance: a.balance - (oldLoan.amount * oldFactor) + (targetAmount * newFactor), 
                updated_at: new Date().toISOString() 
              };
            }
            return a;
          });
        } else {
          updatedAccounts = updatedAccounts.map(a => {
            if (a.id === oldLoan.account_id) {
              return { ...a, balance: a.balance - (oldLoan.amount * oldFactor), updated_at: new Date().toISOString() };
            }
            if (a.id === targetAccountId) {
              return { ...a, balance: a.balance + (targetAmount * newFactor), updated_at: new Date().toISOString() };
            }
            return a;
          });
        }
        setLocalItems('bb-accounts', updatedAccounts);
      }
      notifyDataChange();
      return newLoan;
    }

    const { data, error } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', loanId)
      .select()
      .single();
    if (error) throw error;
    notifyDataChange();
    return data;
  },

  deleteLoan: async (userId: string, loanId: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const loans = getLocalItems<Loan>('bb-loans');
      const accounts = getLocalItems<Account>('bb-accounts');

      const loan = loans.find(l => l.id === loanId && l.user_id === userId);
      if (!loan) return;

      setLocalItems('bb-loans', loans.filter(l => l.id !== loanId));

      let updatedAccounts = [...accounts];
      const factor = loan.type === 'taken' ? 1 : -1;

      updatedAccounts = updatedAccounts.map(a => {
        if (a.id === loan.account_id) {
          return { ...a, balance: a.balance - (loan.amount * factor), updated_at: new Date().toISOString() };
        }
        return a;
      });

      if (loan.payments && loan.payments.length > 0) {
        loan.payments.forEach(p => {
          updatedAccounts = updatedAccounts.map(a => {
            if (a.id === p.account_id) {
              const change = loan.type === 'taken' ? p.amount : -p.amount;
              return { ...a, balance: a.balance + change, updated_at: new Date().toISOString() };
            }
            return a;
          });
        });
      }

      setLocalItems('bb-accounts', updatedAccounts);
      notifyDataChange();
      return;
    }
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', loanId);
    if (error) throw error;
    notifyDataChange();
  },

  createLoanPayment: async (userId: string, loanId: string, payment: Omit<LoanPayment, 'id'>): Promise<Loan> => {
    const newPayment: LoanPayment = {
      ...payment,
      id: crypto.randomUUID(),
    };

    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const loans = getLocalItems<Loan>('bb-loans');
      const accounts = getLocalItems<Account>('bb-accounts');

      const idx = loans.findIndex(l => l.id === loanId && l.user_id === userId);
      if (idx === -1) throw new Error('Loan not found');

      const loan = loans[idx];
      const payments = loan.payments || [];
      payments.push(newPayment);

      const remainingAmount = Math.max(loan.remaining_amount - payment.amount, 0);
      const status: 'active' | 'settled' = remainingAmount <= 0 ? 'settled' : 'active';

      const updatedLoan = {
        ...loan,
        payments,
        remaining_amount: remainingAmount,
        status,
        updated_at: new Date().toISOString(),
      };
      loans[idx] = updatedLoan;
      setLocalItems('bb-loans', loans);

      const updatedAccounts = accounts.map(a => {
        if (a.id === payment.account_id) {
          const change = loan.type === 'taken' ? -payment.amount : payment.amount;
          return { ...a, balance: a.balance + change, updated_at: new Date().toISOString() };
        }
        return a;
      });
      setLocalItems('bb-accounts', updatedAccounts);
      notifyDataChange();
      return updatedLoan;
    }

    const { data: loan, error: getError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();
    if (getError) throw getError;

    const payments = loan.payments || [];
    payments.push(newPayment);

    const remainingAmount = Math.max(loan.remaining_amount - payment.amount, 0);
    const status: 'active' | 'settled' = remainingAmount <= 0 ? 'settled' : 'active';

    const { data: updatedLoan, error: updateError } = await supabase
      .from('loans')
      .update({
        payments,
        remaining_amount: remainingAmount,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .select()
      .single();
    if (updateError) throw updateError;

    const change = loan.type === 'taken' ? -payment.amount : payment.amount;
    const { data: account, error: accGetError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', payment.account_id)
      .single();
    if (accGetError) throw accGetError;

    const { error: accUpdateError } = await supabase
      .from('accounts')
      .update({ balance: (account.balance || 0) + change })
      .eq('id', payment.account_id);
    if (accUpdateError) throw accUpdateError;

    notifyDataChange();
    return updatedLoan;
  },

  getOcrDemoReceipt: async (userId: string): Promise<Partial<Receipt> & { extracted_items?: any[]; extracted_discount?: number }> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockReceiptOptions = [
      {
        store: 'REWE',
        items: [
          { name: 'Apfel Bio 1kg', amount: 2.99 },
          { name: 'Frische Vollmilch 1L', amount: 1.15 },
          { name: 'Vollkornbrot 500g', amount: 1.89 },
          { name: 'Pasta Spaghetti 500g', amount: 0.99 },
          { name: 'Tomaten gehackt', amount: 0.85 },
          { name: 'Studentenfutter 200g', amount: 2.49 }
        ],
        discount: 0.50
      },
      {
        store: 'Lidl',
        items: [
          { name: 'Bananen 1kg', amount: 1.69 },
          { name: 'Haferflocken 500g', amount: 0.79 },
          { name: 'Frischkäse 200g', amount: 1.49 },
          { name: 'Eier Freiland 10 Stk', amount: 2.29 },
          { name: 'Tiefkühl-Erdbeeren', amount: 2.99 }
        ],
        discount: 0.00
      },
      {
        store: 'Aldi Süd',
        items: [
          { name: 'Müsli Erdbeer 500g', amount: 3.29 },
          { name: 'H-Milch 1.5% 1L', amount: 1.09 },
          { name: 'Kartoffeln 2.5kg', amount: 2.49 },
          { name: 'Karotten 1kg', amount: 1.29 },
          { name: 'Käse Aufschnitt 250g', amount: 1.99 }
        ],
        discount: 0.25
      }
    ];

    const option = mockReceiptOptions[Math.floor(Math.random() * mockReceiptOptions.length)];
    const rawSum = option.items.reduce((sum, item) => sum + item.amount, 0);
    const amount = parseFloat((rawSum - option.discount).toFixed(2));
    
    const previewUrl = '/mock-receipt.png';
    const date = new Date().toISOString().split('T')[0];

    if (!isSupabaseConfigured) {
      const receipts = getLocalItems<any>('bb-receipts');
      const newRec = {
        id: crypto.randomUUID(),
        user_id: userId,
        file_url: previewUrl,
        extracted_store_name: option.store,
        extracted_date: date,
        extracted_amount: amount,
        status: 'processed' as const,
        created_at: new Date().toISOString(),
      };
      receipts.push(newRec);
      setLocalItems('bb-receipts', receipts);
      return { ...newRec, extracted_items: option.items, extracted_discount: option.discount };
    }

    try {
      const { data: receipt, error: dbError } = await supabase
        .from('receipts')
        .insert({
          user_id: userId,
          file_url: previewUrl,
          extracted_store_name: option.store,
          extracted_date: date,
          extracted_amount: amount,
          status: 'processed',
        })
        .select()
        .single();
      if (dbError) throw dbError;
      return { ...receipt, extracted_items: option.items, extracted_discount: option.discount };
    } catch (e) {
      return {
        extracted_store_name: option.store,
        extracted_date: date,
        extracted_amount: amount,
        extracted_items: option.items,
        extracted_discount: option.discount,
        file_url: previewUrl
      };
    }
  },
};


