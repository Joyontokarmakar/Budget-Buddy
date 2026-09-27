/**
 * Date parsing utilities for Budget Buddy.
 * Ensures consistent timezone-independent parsing of stored expense dates.
 */

export interface ParsedDate {
  year: number;
  month: number; // 0-indexed (0 = January, 8 = September, 11 = December)
  day: number;
}

/**
 * Safely parses a date string in various formats (YYYY-MM-DD, YYYY-MM, ISO string, DD.MM.YYYY)
 * without timezone rollover issues.
 */
export const parseExpenseDate = (dateStr: string | null | undefined): ParsedDate => {
  if (!dateStr) return { year: -1, month: -1, day: -1 };
  
  const cleanStr = String(dateStr).trim();
  // Strip time part if present
  const datePart = cleanStr.split('T')[0].split(' ')[0];
  const parts = datePart.split(/[-/.]/).map(Number);

  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    // Format: YYYY-MM-DD or YYYY-MM
    if (parts[0] > 1000) {
      return {
        year: parts[0],
        month: parts[1] - 1, // Convert 1-12 to 0-11
        day: parts[2] || 1,
      };
    }
    // Format: DD.MM.YYYY or DD/MM/YYYY
    if (parts.length >= 3 && parts[2] > 1000) {
      return {
        year: parts[2],
        month: parts[1] - 1,
        day: parts[0],
      };
    }
  }

  // Fallback to JS Date object
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
    };
  }

  return { year: -1, month: -1, day: -1 };
};
