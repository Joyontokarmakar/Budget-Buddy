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
  show_status_dots?: boolean | null;
  status_dots_count?: number | null;
  show_shop_name?: boolean | null;
  onboarded: boolean;
  residence_country?: string | null;
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

export interface UserSession {
  id: string;
  user_id: string;
  session_key: string;
  user_agent: string;
  device_name: string;
  last_active_at: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string | null; // null for system defaults
  name: string;
  icon: string | null;
  color: string | null;
  is_monthly_bill?: boolean;
  monthly_amount?: number;
  preferred_account_id?: string | null;
  is_active?: boolean;
  created_at: string;
}

export interface Store {
  id: string;
  user_id: string | null; // null for system defaults
  name: string;
  rendering_name?: string | null;
  created_at: string;
}

export interface ExpenseItem {
  id?: string;
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

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  time: string;
  to_account_id: string;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepositWithDetails extends Deposit {
  account?: Account | null;
}

export interface LoanPayment {
  id: string;
  date: string;
  amount: number;
  account_id: string;
  notes: string | null;
}

export interface Loan {
  id: string;
  user_id: string;
  type: 'taken' | 'provided';
  person: string;
  amount: number;
  remaining_amount: number;
  date: string;
  notes: string | null;
  account_id: string;
  status: 'active' | 'settled';
  payments: LoanPayment[] | null;
  created_at: string;
  updated_at: string;
}

export interface LoanWithDetails extends Loan {
  account?: Account | null;
}

