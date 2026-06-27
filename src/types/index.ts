export type Language = 'en' | 'de' | 'bn' | 'hi' | 'ar' | 'tr';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccountType = 'bank' | 'savings' | 'cash';
export type IncomeType = 'werkstudent' | 'scholarship' | 'family' | 'freelance' | 'other';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  preferred_language: Language;
  theme_preference: ThemeMode;
  monthly_budget: number;
  avatar_url?: string | null;
  gemini_api_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null; // null for system defaults
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  user_id: string | null; // null for system defaults
  name: string;
  created_at: string;
}

export interface ExpenseItem {
  name: string;
  amount: number;
  category_id?: string | null;
}

export interface Expense {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  category_id: string | null;
  store_id: string | null;
  payment_account_id: string;
  notes: string | null;
  receipt_url: string | null;
  items?: ExpenseItem[] | null;
  discount?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithDetails extends Expense {
  category?: Category | null;
  store?: Store | null;
  account?: Account | null;
}

export interface Income {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  type: IncomeType;
  notes: string | null;
  source_name: string | null;
  destination_account_id: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeWithDetails extends Income {
  account?: Account | null;
}

export interface Receipt {
  id: string;
  user_id: string;
  file_url: string;
  extracted_store_name: string | null;
  extracted_date: string | null;
  extracted_amount: number | null;
  status: 'pending' | 'processed' | 'failed';
  created_at: string;
}

export interface TransactionSummary {
  id: string;
  type: 'expense' | 'income';
  date: string;
  amount: number;
  title: string;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  accountName: string;
  notes?: string | null;
}

export interface PermanentAsset {
  id: string;
  user_id: string;
  name: string;
  store: string;
  price: number;
  date: string;
  created_at: string;
  updated_at: string;
}
