/**
 * Generates an array of YYYY-MM keys representing the active months of an EMI,
 * starting from the buy date's month and spanning for emiMonths.
 */
export const getEmiMonthsRange = (buyDateStr: string, emiMonths: number): string[] => {
  if (!buyDateStr) return [];
  const buyDate = new Date(buyDateStr);
  if (isNaN(buyDate.getTime())) return [];
  
  const range: string[] = [];
  const year = buyDate.getFullYear();
  const month = buyDate.getMonth(); // 0-indexed
  
  for (let i = 0; i < emiMonths; i++) {
    const d = new Date(year, month + i, 1);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    range.push(mKey);
  }
  return range;
};
