import { supabase, isSupabaseConfigured } from './supabase';
import type { Account, Category, Store, Expense, ExpenseWithDetails, Income, IncomeWithDetails, Receipt, PermanentAsset } from '../types';

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
  { id: 'c10', user_id: null, name: 'Other', icon: 'HelpCircle', color: '#6b7280', created_at: new Date().toISOString() },
];

const DEFAULT_STORES: Store[] = [
  { id: 's1', user_id: null, name: 'Lidl', created_at: new Date().toISOString() },
  { id: 's2', user_id: null, name: 'Aldi Süd', created_at: new Date().toISOString() },
  { id: 's3', user_id: null, name: 'Aldi Nord', created_at: new Date().toISOString() },
  { id: 's4', user_id: null, name: 'REWE', created_at: new Date().toISOString() },
  { id: 's5', user_id: null, name: 'EDEKA', created_at: new Date().toISOString() },
  { id: 's6', user_id: null, name: 'Kaufland', created_at: new Date().toISOString() },
  { id: 's7', user_id: null, name: 'dm-drogerie markt', created_at: new Date().toISOString() },
  { id: 's8', user_id: null, name: 'Rossmann', created_at: new Date().toISOString() },
  { id: 's9', user_id: null, name: 'Müller', created_at: new Date().toISOString() },
  { id: 's10', user_id: null, name: 'IKEA', created_at: new Date().toISOString() },
  { id: 's11', user_id: null, name: 'Decathlon', created_at: new Date().toISOString() },
  { id: 's12', user_id: null, name: 'Penny', created_at: new Date().toISOString() },
  { id: 's13', user_id: null, name: 'Netto', created_at: new Date().toISOString() },
  { id: 's14', user_id: null, name: 'Washing Machine', created_at: new Date().toISOString() },
  { id: 's15', user_id: null, name: 'Flink', created_at: new Date().toISOString() },
  { id: 's16', user_id: null, name: 'Allan Pizza', created_at: new Date().toISOString() },
  { id: 's17', user_id: null, name: '7 Days Curry', created_at: new Date().toISOString() },
  { id: 's18', user_id: null, name: 'Delhi Masala', created_at: new Date().toISOString() },
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
  if (!localStorage.getItem('bb-categories')) {
    localStorage.setItem('bb-categories', JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem('bb-stores')) {
    localStorage.setItem('bb-stores', JSON.stringify(DEFAULT_STORES));
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
}

// Helper to get raw items
function getLocalItems<T>(key: string): T[] {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

// Helper to save raw items
function setLocalItems<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

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
      return newAcc;
    }
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...account, user_id: userId })
      .select()
      .single();
    if (error) throw error;
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
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  createCategory: async (userId: string, name: string, icon: string, color: string): Promise<Category> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const categories = getLocalItems<Category>('bb-categories');
      const newCat: Category = {
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        icon,
        color,
        created_at: new Date().toISOString(),
      };
      categories.push(newCat);
      setLocalItems('bb-categories', categories);
      return newCat;
    }
    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name, icon, color })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // STORES
  getStores: async (userId: string): Promise<Store[]> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      return getLocalItems<Store>('bb-stores');
    }
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  createStore: async (userId: string, name: string): Promise<Store> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const stores = getLocalItems<Store>('bb-stores');
      // Case insensitive check
      const existing = stores.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;

      const newStore: Store = {
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        created_at: new Date().toISOString(),
      };
      stores.push(newStore);
      setLocalItems('bb-stores', stores);
      return newStore;
    }
    // Try to find first or insert
    const { data: existing } = await supabase
      .from('stores')
      .select('*')
      .eq('name', name)
      .or(`user_id.is.null,user_id.eq.${userId}`);
      
    if (existing && existing.length > 0) {
      return existing[0];
    }

    const { data, error } = await supabase
      .from('stores')
      .insert({ user_id: userId, name })
      .select()
      .single();
    if (error) throw error;
    return data;
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

      return newExp;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expense, user_id: userId })
      .select()
      .single();
    if (error) throw error;
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

      return newExp;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .select()
      .single();
    if (error) throw error;
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
      return;
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    if (error) throw error;
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

      return newInc;
    }

    const { data, error } = await supabase
      .from('income')
      .insert({ ...income, user_id: userId })
      .select()
      .single();
    if (error) throw error;
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
      return;
    }

    const { error } = await supabase
      .from('income')
      .delete()
      .eq('id', incomeId);
    if (error) throw error;
  },

  // RECEIPTS & OCR PREFILL MOCKUP
  uploadReceipt: async (userId: string, file: File): Promise<Partial<Receipt>> => {
    // Generate object URL for preview
    const previewUrl = URL.createObjectURL(file);

    // Mock processing delay of 1.5 seconds for OCR extraction
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Choose random stores for student receipts
    const mockStores = ['REWE', 'Lidl', 'Aldi Süd', 'dm-drogerie markt', 'Rossmann', 'EDEKA'];
    const extractedStore = mockStores[Math.floor(Math.random() * mockStores.length)];
    const extractedAmount = parseFloat((Math.random() * 45 + 5).toFixed(2)); // €5.00 - €50.00
    const extractedDate = new Date().toISOString().split('T')[0]; // today

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
      return newRec;
    }

    try {
      // 1. Upload to Supabase Storage Bucket 'receipts'
      // Path: receipts/<user_id>/<timestamp>-<name>
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
      return receipt;
    } catch (e) {
      console.error('Supabase Receipt upload/OCR error, falling back to local simulation:', e);
      // Fallback
      return {
        file_url: previewUrl,
        extracted_store_name: extractedStore,
        extracted_date: extractedDate,
        extracted_amount: extractedAmount,
        status: 'processed',
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
      return newAsset;
    }
    const { data, error } = await supabase
      .from('permanent_assets')
      .insert({ ...asset, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deletePermanentAsset: async (userId: string, id: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      initLocalStorage(userId);
      const assets = getLocalItems<PermanentAsset>('bb-permanent-assets');
      const filtered = assets.filter(a => a.id !== id);
      setLocalItems('bb-permanent-assets', filtered);
      return;
    }
    const { error } = await supabase
      .from('permanent_assets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
