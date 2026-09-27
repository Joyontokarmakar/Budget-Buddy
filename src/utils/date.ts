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
 * Safely parses a date string in various formats (YYYY-MM-DD, YYYY-MM, ISO string, DD.MM.YYYY, MM/DD/YYYY)
 * without timezone rollover issues.
 * If notes contain an explicit [Bill Period: YYYY-MM], that billing month is prioritized
 * so recurring, missed, or advanced bills reflect their actual period.
 */
export const parseExpenseDate = (dateStr: string | null | undefined, notes?: string | null): ParsedDate => {
  // If notes contain [Bill Period: YYYY-MM], that is the intentional billing month
  if (notes) {
    const match = notes.match(/\[Bill Period:\s*(\d{4})[-/.](\d{1,2})\]/i);
    if (match && match[1] && match[2]) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
        return { year, month, day: 1 };
      }
    }
  }

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
    // Format: DD.MM.YYYY, DD/MM/YYYY, or MM/DD/YYYY
    if (parts.length >= 3 && parts[2] > 1000) {
      let m = parts[1];
      let d = parts[0];
      // Disambiguate if month is in first position (MM/DD/YYYY where day > 12)
      if (parts[1] > 12 && parts[0] <= 12) {
        m = parts[0];
        d = parts[1];
      }
      return {
        year: parts[2],
        month: m - 1,
        day: d,
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
