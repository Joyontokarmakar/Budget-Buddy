export const getCategoryColor = (color: string | null | undefined): string => {
  if (!color) return '#6b7280';
  if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')) {
    return color;
  }
  const colorMap: { [key: string]: string } = {
    emerald: '#10b981',
    orange: '#f97316',
    amber: '#f59e0b',
    red: '#ef4444',
    blue: '#3b82f6',
    indigo: '#6366f1',
    violet: '#8b5cf6',
    pink: '#ec4899',
    rose: '#f43f5e',
    gray: '#6b7280',
    green: '#22c55e',
    yellow: '#eab308',
    purple: '#a855f7',
    sky: '#0ea5e9',
  };
  return colorMap[color.toLowerCase()] || color;
};
