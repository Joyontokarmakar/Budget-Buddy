import type { Category } from '../types';

/**
 * Checks if a category is flagged as a monthly bill (fixed recurring expense).
 * Handles boolean true/false, string "true"/"false", and numeric 1/0 safely.
 */
export const isCategoryBill = (c?: Partial<Category> | null): boolean => {
  if (!c) return false;
  return c.is_monthly_bill === true || (c.is_monthly_bill as any) === 'true' || (c.is_monthly_bill as any) === 1;
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
 */
export const getCategoryMonthlyAmount = (c?: Partial<Category> | null): number => {
  if (!c || c.monthly_amount === undefined || c.monthly_amount === null) return 0;
  const val = typeof c.monthly_amount === 'number' ? c.monthly_amount : parseFloat(String(c.monthly_amount));
  return isNaN(val) ? 0 : val;
};
