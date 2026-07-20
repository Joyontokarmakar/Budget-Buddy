import type { Category } from '../types';

const DEFAULT_BILL_NAMES = ['house rent', 'health insurance', 'radio bill', 'mobile bill'];

/**
 * Checks if a category is flagged as a monthly bill (fixed recurring expense).
 * Handles boolean true/false, string "true"/"false", numeric 1/0, and default bill names safely.
 */
export const isCategoryBill = (c?: Partial<Category> | null): boolean => {
  if (!c) return false;
  if (c.is_monthly_bill === true || (c.is_monthly_bill as any) === 'true' || (c.is_monthly_bill as any) === 1) {
    return true;
  }
  const nameLower = (c.name || '').toLowerCase().trim();
  if (DEFAULT_BILL_NAMES.includes(nameLower)) {
    // If it's a known default recurring bill name, treat as a bill unless user explicitly cleared amount AND disabled bill flag
    if ((c.is_monthly_bill === false || (c.is_monthly_bill as any) === 'false') && (c.monthly_amount === 0 || c.monthly_amount === null)) {
      return false;
    }
    return true;
  }
  return false;
};

/**
 * Checks if a category is active.
 * Defaults to true if is_active is undefined or null.
 * Handles boolean, string "false", and numeric 0 safely.
 */
export const isCategoryActive = (c?: Partial<Category> | null): boolean => {
  if (!c) return true;
  return c.is_active !== false && (c.is_active as any) !== 'false' && (c.is_active as any) !== 0;
};

/**
 * Safely parses and returns the monthly budget amount for a category as a number.
 * If 0 or missing, returns standard student default amounts for default recurring bills.
 */
export const getCategoryMonthlyAmount = (c?: Partial<Category> | null): number => {
  if (!c) return 0;
  const val = typeof c.monthly_amount === 'number' ? c.monthly_amount : parseFloat(String(c.monthly_amount));
  if (!isNaN(val) && val > 0) return val;

  const nameLower = (c.name || '').toLowerCase().trim();
  if (nameLower === 'house rent') return 264.50;
  if (nameLower === 'health insurance') return 151.42;
  if (nameLower === 'radio bill') return 18.00;
  if (nameLower === 'mobile bill') return 8.99;
  if (nameLower === 'education') return 350.00;

  return 0;
};
