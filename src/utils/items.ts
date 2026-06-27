/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Safely parses and returns transaction items.
 * Handles cases where items might be a JSON-stringified representation or direct array.
 */
export const getSafeItems = (items: any): any[] => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};
