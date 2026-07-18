import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../stores/authStore';
import { getCategoryColor } from '../../utils/color';
import { db } from '../../services/db';
import type { ExpenseWithDetails, IncomeWithDetails } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Spinner, Button, Dialog } from '../../components/ui';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { PieChart as PieIcon, LineChart as LineIcon, BarChart2, Coins, Store, ShoppingBag, Calendar, Search, X } from 'lucide-react';
export const Analytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();

  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendView, setTrendView] = useState<'weekly' | 'daily'>('weekly');
  const [categoryYear, setCategoryYear] = useState<number>(new Date().getFullYear());
  const [categoryMonth, setCategoryMonth] = useState<string>('all');

  // Activity Calendar selectors state
  const [activityYear, setActivityYear] = useState<number>(new Date().getFullYear());
  const [activityMonth, setActivityMonth] = useState<number>(new Date().getMonth());
  const [activeTooltipDate, setActiveTooltipDate] = useState<string | null>(null);

  // Search states for store analytics
  const [searchThisMonthQuery, setSearchThisMonthQuery] = useState('');
  const [isSearchThisMonthOpen, setIsSearchThisMonthOpen] = useState(false);
  const [searchAllTimeQuery, setSearchAllTimeQuery] = useState('');
  const [isSearchAllTimeOpen, setIsSearchAllTimeOpen] = useState(false);

  // Show All modals state
  const [isShowAllThisMonthOpen, setIsShowAllThisMonthOpen] = useState(false);
  const [isShowAllAllTimeOpen, setIsShowAllAllTimeOpen] = useState(false);

  // Selected store chart modal state
  const [selectedStoreChart, setSelectedStoreChart] = useState<{ storeName: string; type: 'thisMonth' | 'allTime' } | null>(null);

  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveTooltipDate(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        setLoading(true);
        const [exps, incs] = await Promise.all([
          db.getExpenses(profile.id),
          db.getIncome(profile.id),
        ]);
        setExpenses(exps);
        setIncomes(incs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  if (loading && expenses.length === 0) {
    return <Spinner />;
  }

  // Theme support colors
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  // 1. Spending by Category
  const UNIQUE_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#f43f5e', // rose
    '#8b5cf6', // violet
    '#0ea5e9', // sky
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f97316', // orange
    '#a855f7', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#a1a1aa'  // gray
  ];

  const currentYearVal = new Date().getFullYear();
  const years = Array.from(new Set([
    currentYearVal,
    ...expenses.map(e => e.date ? new Date(e.date).getFullYear() : currentYearVal),
    ...incomes.map(i => i.date ? new Date(i.date).getFullYear() : currentYearVal)
  ])).sort((a, b) => b - a);

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  const categoryFilteredExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    const yMatches = d.getFullYear() === categoryYear;
    const mMatches = categoryMonth === 'all' || d.getMonth() === parseInt(categoryMonth, 10);
    return yMatches && mMatches;
  });

  const categoryDataMap: { [key: string]: { name: string; value: number; color: string } } = {};
  categoryFilteredExpenses.forEach(e => {
    const catName = e.category?.name || 'Other';
    const catColor = e.category?.color || '#6b7280';
    const transName = t(`categories.${catName}`, catName);
    
    if (categoryDataMap[catName]) {
      categoryDataMap[catName].value += e.amount;
    } else {
      categoryDataMap[catName] = {
        name: transName,
        value: e.amount,
        color: catColor,
      };
    }
  });
  const categoryData = Object.values(categoryDataMap).map((item, idx) => ({
    ...item,
    color: UNIQUE_COLORS[idx % UNIQUE_COLORS.length]
  }));

  // 2. Weekly Spending Trend (last 4 weeks)
  const getWeekNumber = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const weeklySpendingMap: { [key: string]: number } = {};
  const currentYear = new Date().getFullYear();

  // Initialize past 4 weeks
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const wNum = getWeekNumber(d);
    weeklySpendingMap[`W${wNum}`] = 0;
  }

  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() === currentYear) {
      const wName = `W${getWeekNumber(d)}`;
      if (weeklySpendingMap[wName] !== undefined) {
        weeklySpendingMap[wName] += e.amount;
      }
    }
  });

  const weeklyTrendData = Object.entries(weeklySpendingMap).map(([week, amount]) => ({
    week,
    amount: parseFloat(amount.toFixed(2)),
  }));

  // Daily Spending Trend (last 30 days)
  const dailySpendingMap: { [key: string]: number } = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dailySpendingMap[dateStr] = 0;
  }

  expenses.forEach(e => {
    if (dailySpendingMap[e.date] !== undefined) {
      dailySpendingMap[e.date] += e.amount;
    }
  });

  const dailyTrendData = Object.entries(dailySpendingMap).map(([dateStr, amount]) => {
    const d = new Date(dateStr);
    const formattedDate = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return {
      date: formattedDate,
      amount: parseFloat(amount.toFixed(2)),
    };
  });

  // 3. Monthly Spending Comparison (Last 3 Months)
  const monthlySpendingMap: { [key: string]: { month: string; expenses: number; income: number } } = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Init last 3 months
  for (let i = 2; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    monthlySpendingMap[label] = { month: label, expenses: 0, income: 0 };
  }

  expenses.forEach(e => {
    const d = new Date(e.date);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    if (monthlySpendingMap[label]) {
      monthlySpendingMap[label].expenses += e.amount;
    }
  });

  incomes.forEach(i => {
    const d = new Date(i.date);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    if (monthlySpendingMap[label]) {
      monthlySpendingMap[label].income += i.amount;
    }
  });

  const monthlyComparisonData = Object.values(monthlySpendingMap).map(m => ({
    month: m.month,
    expenses: parseFloat(m.expenses.toFixed(2)),
    income: parseFloat(m.income.toFixed(2)),
  }));
  // 4. Store Analytics: Top 3 stores this month with amount (excluding common bills)
  const storeSpendingMap: { [key: string]: number } = {};
  const storeDailySpendingMap: { [key: string]: { [date: string]: number } } = {};
  const activeYear = new Date().getFullYear();
  const activeMonth = new Date().getMonth();
  
  const commonBillsCategories = ['house rent', 'health insurance', 'radio bill', 'mobile bill'];
  const commonBillsCategoryIds = ['c3', 'c4', 'c5', 'c6'];
  
  expenses.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date);
    if (d.getFullYear() === activeYear && d.getMonth() === activeMonth) {
      // Exclude common bills
      if (e.category_id && commonBillsCategoryIds.includes(e.category_id)) return;
      const catName = e.category?.name?.toLowerCase();
      if (catName && commonBillsCategories.includes(catName)) return;
      const notes = e.notes?.toLowerCase() || '';
      if (notes.includes('rent') || notes.includes('insurance') || notes.includes('radio bill') || notes.includes('mobile bill')) return;

      const storeName = e.store?.rendering_name || e.store?.name || 'Other/Unknown';
      storeSpendingMap[storeName] = (storeSpendingMap[storeName] || 0) + e.amount;

      if (!storeDailySpendingMap[storeName]) {
        storeDailySpendingMap[storeName] = {};
      }
      storeDailySpendingMap[storeName][e.date] = (storeDailySpendingMap[storeName][e.date] || 0) + e.amount;
    }
  });

  const allStoresThisMonth = Object.entries(storeSpendingMap)
    .map(([name, amount]) => {
      const dailyMap = storeDailySpendingMap[name] || {};
      let maxDateKey = '';
      let maxDateAmount = 0;

      Object.entries(dailyMap).forEach(([dateKey, dailyAmount]) => {
        if (dailyAmount > maxDateAmount) {
          maxDateAmount = dailyAmount;
          maxDateKey = dateKey;
        }
      });

      let formattedDate = '';
      if (maxDateKey) {
        const d = new Date(maxDateKey);
        formattedDate = d.toLocaleDateString(i18n.language || 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      return {
        name,
        amount,
        maxDate: formattedDate,
        maxDateAmount
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .map((store, index) => ({
      ...store,
      rank: index + 1
    }));

  const topStores = allStoresThisMonth.slice(0, 5);

  // Top Stores of All Time (excluding common bills)
  interface TopStoreOfAllTime {
    name: string;
    totalAmount: number;
    maxMonth: string;
    maxMonthAmount: number;
    rank: number;
  }

  const allStoresOfAllTime: TopStoreOfAllTime[] = (() => {
    if (expenses.length === 0) return [];

    const commonBillsCategories = ['house rent', 'health insurance', 'radio bill', 'mobile bill'];
    const commonBillsCategoryIds = ['c3', 'c4', 'c5', 'c6'];

    const storeTotalSpending: { [key: string]: number } = {};
    const storeMonthlySpending: { [key: string]: { [monthKey: string]: number } } = {};

    expenses.forEach(e => {
      const storeName = e.store?.rendering_name || e.store?.name;
      if (!storeName || storeName === 'Other/Unknown') return;

      // Exclude common bills
      if (e.category?.is_monthly_bill) return;
      if (e.category_id && commonBillsCategoryIds.includes(e.category_id)) return;
      const catName = e.category?.name?.toLowerCase();
      if (catName && commonBillsCategories.includes(catName)) return;
      const notes = e.notes?.toLowerCase() || '';
      if (notes.includes('rent') || notes.includes('insurance') || notes.includes('radio bill') || notes.includes('mobile bill')) return;

      if (!e.date) return;

      storeTotalSpending[storeName] = (storeTotalSpending[storeName] || 0) + e.amount;

      const d = new Date(e.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!storeMonthlySpending[storeName]) {
        storeMonthlySpending[storeName] = {};
      }
      storeMonthlySpending[storeName][monthKey] = (storeMonthlySpending[storeName][monthKey] || 0) + e.amount;
    });

    const sortedStores = Object.entries(storeTotalSpending)
      .map(([name, totalAmount]) => {
        const monthlyMap = storeMonthlySpending[name] || {};
        let maxMonthKey = '';
        let maxMonthAmount = 0;

        Object.entries(monthlyMap).forEach(([monthKey, amount]) => {
          if (amount > maxMonthAmount) {
            maxMonthAmount = amount;
            maxMonthKey = monthKey;
          }
        });

        let formattedMonth = '';
        if (maxMonthKey) {
          const [yearStr, monthStr] = maxMonthKey.split('-');
          const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
          formattedMonth = dateObj.toLocaleDateString(i18n.language || 'en-US', { month: 'long', year: 'numeric' });
        }

        return {
          name,
          totalAmount,
          maxMonth: formattedMonth,
          maxMonthAmount,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((store, index) => ({
        ...store,
        rank: index + 1
      }));

    return sortedStores;
  })();

  const topStoresOfAllTime = allStoresOfAllTime.slice(0, 5);

  // Dynamic Chart calculations for the selected store modal
  const getChartDataAndTotal = () => {
    if (!selectedStoreChart) return { chartData: [], totalStoreSpent: 0 };

    const commonBillsCategories = ['house rent', 'health insurance', 'radio bill', 'mobile bill'];
    const commonBillsCategoryIds = ['c3', 'c4', 'c5', 'c6'];

    const isBillExpense = (e: ExpenseWithDetails) => {
      if (e.category?.is_monthly_bill) return true;
      if (e.category_id && commonBillsCategoryIds.includes(e.category_id)) return true;
      const catName = e.category?.name?.toLowerCase();
      if (catName && commonBillsCategories.includes(catName)) return true;
      const notes = e.notes?.toLowerCase() || '';
      if (notes.includes('rent') || notes.includes('insurance') || notes.includes('radio bill') || notes.includes('mobile bill')) return true;
      return false;
    };

    const storeExpenses = expenses.filter(e => {
      if (isBillExpense(e)) return false;
      const name = e.store?.rendering_name || e.store?.name || 'Other/Unknown';
      return name === selectedStoreChart.storeName;
    });

    if (selectedStoreChart.type === 'allTime') {
      // Group by month YYYY-MM
      const monthlySums: { [key: string]: number } = {};
      storeExpenses.forEach(e => {
        if (!e.date) return;
        const d = new Date(e.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlySums[monthKey] = (monthlySums[monthKey] || 0) + e.amount;
      });

      const data = Object.entries(monthlySums)
        .map(([monthKey, amount]) => {
          const [yearStr, monthStr] = monthKey.split('-');
          const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
          const label = dateObj.toLocaleDateString(i18n.language || 'en-US', { month: 'short', year: 'numeric' });
          return {
            key: monthKey,
            label,
            amount: parseFloat(amount.toFixed(2))
          };
        })
        .sort((a, b) => a.key.localeCompare(b.key));

      const total = data.reduce((sum, item) => sum + item.amount, 0);
      return { chartData: data, totalStoreSpent: total };
    } else {
      // Group by day YYYY-MM-DD for this month
      const activeYear = new Date().getFullYear();
      const activeMonth = new Date().getMonth();

      const thisMonthStoreExpenses = storeExpenses.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d.getFullYear() === activeYear && d.getMonth() === activeMonth;
      });

      const dailySums: { [key: string]: number } = {};
      thisMonthStoreExpenses.forEach(e => {
        if (!e.date) return;
        dailySums[e.date] = (dailySums[e.date] || 0) + e.amount;
      });

      const data = Object.entries(dailySums)
        .map(([dateKey, amount]) => {
          const d = new Date(dateKey);
          const label = d.toLocaleDateString(i18n.language || 'en-US', { day: 'numeric', month: 'short' });
          return {
            key: dateKey,
            label,
            amount: parseFloat(amount.toFixed(2))
          };
        })
        .sort((a, b) => a.key.localeCompare(b.key));

      const total = data.reduce((sum, item) => sum + item.amount, 0);
      return { chartData: data, totalStoreSpent: total };
    }
  };

  const { chartData, totalStoreSpent } = getChartDataAndTotal();

  const displayedStoresThisMonth = isSearchThisMonthOpen && searchThisMonthQuery
    ? allStoresThisMonth.filter(s => s.name.toLowerCase().includes(searchThisMonthQuery.toLowerCase()))
    : topStores;

  const displayedStoresAllTime = isSearchAllTimeOpen && searchAllTimeQuery
    ? allStoresOfAllTime.filter(s => s.name.toLowerCase().includes(searchAllTimeQuery.toLowerCase()))
    : topStoresOfAllTime;

  // 5. Product Analytics: Top bought Products (Product, Month, Amount) scanning items (excluding common bills)
  const productMap: { [key: string]: { name: string; month: string; amount: number } } = {};
  
  expenses.forEach(e => {
    if (!e.date) return;
    
    // Exclude common bills
    if (e.category_id && commonBillsCategoryIds.includes(e.category_id)) return;
    const catName = e.category?.name?.toLowerCase();
    if (catName && commonBillsCategories.includes(catName)) return;
    const notes = e.notes?.toLowerCase() || '';
    if (notes.includes('rent') || notes.includes('insurance') || notes.includes('radio bill') || notes.includes('mobile bill')) return;

    const d = new Date(e.date);
    const monthLabel = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    
    if (e.items && e.items.length > 0) {
      e.items.forEach(item => {
        const name = item.name.trim();
        if (!name || name.toLowerCase() === 'discount') return;
        const key = `${name.toLowerCase()}_${monthLabel}`;
        if (productMap[key]) {
          productMap[key].amount += item.amount;
        } else {
          productMap[key] = {
            name,
            month: monthLabel,
            amount: item.amount
          };
        }
      });
    }
  });

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Find month with max active spending days (timezone-agnostic)
  const maxActiveDaysInfo = (() => {
    if (expenses.length === 0) return null;
    
    const monthlyActiveDates: { [monthKey: string]: Set<string> } = {};
    expenses.forEach(e => {
      if (!e.date) return;
      const parts = e.date.split('-');
      if (parts.length < 2) return;
      const monthKey = `${parts[0]}-${parts[1].padStart(2, '0')}`;
      
      if (!monthlyActiveDates[monthKey]) {
        monthlyActiveDates[monthKey] = new Set<string>();
      }
      monthlyActiveDates[monthKey].add(e.date);
    });
    
    let bestMonthKey = '';
    let maxDays = 0;
    
    Object.entries(monthlyActiveDates).forEach(([monthKey, datesSet]) => {
      if (datesSet.size > maxDays) {
        maxDays = datesSet.size;
        bestMonthKey = monthKey;
      }
    });
    
    if (!bestMonthKey) return null;
    
    const [yearStr, monthStr] = bestMonthKey.split('-');
    const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    const monthLabel = dateObj.toLocaleDateString(i18n.language || 'en-US', { month: 'long', year: 'numeric' });
    
    return {
      monthLabel,
      daysCount: maxDays
    };
  })();

  const hasData = expenses.length > 0 || incomes.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('analytics.title')}</h1>
        <p className="text-xs text-muted-foreground">Visualize your student budget performance and spending trends</p>
      </div>

      {!hasData ? (
        <Card className="py-20 text-center border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <BarChart2 className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-muted-foreground">{t('analytics.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ROW 1: CATEGORY BREAKDOWN & TREND LINE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CATEGORY BREAKDOWN PIE */}
            <Card className="hover:border-primary/20 transition-all flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <PieIcon className="h-4.5 w-4.5 text-primary" />
                    {t('analytics.byCategory')}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <select
                      value={categoryMonth}
                      onChange={(e) => setCategoryMonth(e.target.value)}
                      className="bg-card border border-border/80 text-foreground text-[10px] sm:text-xs font-semibold rounded-xl px-2.5 py-1 focus:ring-1 focus:ring-primary focus:border-primary shrink-0 focus:outline-none"
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={categoryYear}
                      onChange={(e) => setCategoryYear(parseInt(e.target.value, 10))}
                      className="bg-card border border-border/80 text-foreground text-[10px] sm:text-xs font-semibold rounded-xl px-2.5 py-1 focus:ring-1 focus:ring-primary focus:border-primary shrink-0 focus:outline-none"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <CardDescription>Categorized spending allocation</CardDescription>
              </CardHeader>
              <CardContent className="h-64 pt-2 flex flex-col justify-center">
                {categoryData.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground font-semibold py-12">
                    No categorized expenses logged for the selected period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderColor: isDark ? '#334155' : '#e2e8f0',
                          borderRadius: '12px',
                        }}
                        itemStyle={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 'bold' }}
                        formatter={(value) => [`€${Number(value).toFixed(2)}`]}
                      />
                      <Legend 
                        iconSize={8} 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'semibold' }} 
                        formatter={(value, entry: any) => `${value}: €${Number(entry.payload?.value || 0).toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* WEEKLY & DAILY TREND LINE */}
            <Card className="hover:border-primary/20 transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <LineIcon className="h-4.5 w-4.5 text-rose-500" />
                    {trendView === 'weekly' ? t('analytics.weeklyTrend') : 'Daily Spending Trend'}
                  </CardTitle>
                  <CardDescription>
                    {trendView === 'weekly' ? 'Spending trajectory over the last 4 weeks' : 'Daily spending trajectory over the last 30 days'}
                  </CardDescription>
                </div>
                <div className="flex bg-muted/65 p-0.5 rounded-lg border border-border/40">
                  <button
                    type="button"
                    onClick={() => setTrendView('weekly')}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer",
                      trendView === 'weekly' 
                        ? "bg-background text-foreground shadow-xs border border-border/30" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendView('daily')}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer",
                      trendView === 'daily' 
                        ? "bg-background text-foreground shadow-xs border border-border/30" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Daily
                  </button>
                </div>
              </CardHeader>
              <CardContent className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={(trendView === 'weekly' ? weeklyTrendData : dailyTrendData) as any[]} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                      dataKey={trendView === 'weekly' ? 'week' : 'date'} 
                      stroke={textColor} 
                      style={{ fontSize: '10px', fontWeight: 'semibold' }} 
                    />
                    <YAxis stroke={textColor} style={{ fontSize: '10px', fontWeight: 'semibold' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                      }}
                      itemStyle={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 'bold' }}
                      formatter={(value) => [`€${Number(value).toFixed(2)}`, t('analytics.expenses')]}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={trendView === 'weekly' ? { r: 4, strokeWidth: 2 } : false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ROW 2: 3 COLUMNS FOR CASHFLOW, CALENDAR, AND HISTORY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* INCOME VS EXPENSE CASHFLOW AREA */}
            <Card className="hover:border-primary/20 transition-all flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Coins className="h-4.5 w-4.5 text-emerald-500" />
                  {t('analytics.cashFlow')}
                </CardTitle>
                <CardDescription>Monthly inflows vs outflows</CardDescription>
              </CardHeader>
              <CardContent className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" stroke={textColor} style={{ fontSize: '10px', fontWeight: 'semibold' }} />
                    <YAxis stroke={textColor} style={{ fontSize: '10px', fontWeight: 'semibold' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                      }}
                      itemStyle={{ fontWeight: 'bold' }}
                      formatter={(value) => [`€${Number(value).toFixed(2)}`]}
                    />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'semibold' }} />
                    <Bar dataKey="income" name={t('analytics.income')} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name={t('analytics.expenses')} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* MONTHLY ACTIVITY CALENDAR */}
            <Card className="hover:border-primary/20 transition-all flex flex-col justify-between overflow-visible">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-1.5">
                  <CardTitle className="text-[13px] font-bold flex items-center gap-1.5 truncate">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    Activity Calendar
                  </CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={activityMonth}
                      onChange={(e) => setActivityMonth(parseInt(e.target.value, 10))}
                      className="bg-card border border-border/80 text-foreground text-[9px] font-semibold rounded-lg px-1.5 py-0.5 focus:ring-1 focus:ring-primary focus:border-primary shrink-0 focus:outline-none"
                    >
                      {months.filter(m => m.value !== 'all').map(m => (
                        <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>
                      ))}
                    </select>
                    <select
                      value={activityYear}
                      onChange={(e) => setActivityYear(parseInt(e.target.value, 10))}
                      className="bg-card border border-border/80 text-foreground text-[9px] font-semibold rounded-lg px-1.5 py-0.5 focus:ring-1 focus:ring-primary focus:border-primary shrink-0 focus:outline-none"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <CardDescription className="text-[10px] leading-tight mt-0.5">Daily spending view. Hover cells for details.</CardDescription>
              </CardHeader>
              <CardContent className="pt-1 pb-3 flex-1 flex flex-col justify-center">
                {/* Calendar Grid Container */}
                <div className="border border-border/60 rounded-xl bg-muted/10 overflow-visible">
                  {/* Weekdays Header */}
                  <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-center py-1.5 font-bold text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-wider rounded-t-xl">
                    <div>M</div>
                    <div>T</div>
                    <div>W</div>
                    <div>T</div>
                    <div>F</div>
                    <div className="text-indigo-500/85">S</div>
                    <div className="text-rose-500/85">S</div>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-0.5 p-1">
                    {/* Previous month padding cells */}
                    {(() => {
                      const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
                      const getFirstDayIndex = (y: number, m: number) => {
                        const day = new Date(y, m, 1).getDay();
                        return day === 0 ? 6 : day - 1;
                      };
                      const startPadding = getFirstDayIndex(activityYear, activityMonth);
                      const prevMonthDate = new Date(activityYear, activityMonth - 1, 1);
                      const prevMonthYear = prevMonthDate.getFullYear();
                      const prevMonthMonth = prevMonthDate.getMonth();
                      const prevMonthDaysCount = getDaysInMonth(prevMonthYear, prevMonthMonth);
                      
                      const pad = [];
                      for (let i = startPadding - 1; i >= 0; i--) {
                        const dayNum = prevMonthDaysCount - i;
                        pad.push(
                          <div 
                            key={`prev-${dayNum}`} 
                            className="aspect-square flex items-center justify-center text-[9px] text-muted-foreground/30 font-bold border border-border/5 rounded-lg bg-muted/5 select-none"
                          >
                            {dayNum}
                          </div>
                        );
                      }
                      return pad;
                    })()}

                    {/* Active month day cells */}
                    {(() => {
                      const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
                      const daysInMonth = getDaysInMonth(activityYear, activityMonth);
                      const getFirstDayIndex = (y: number, m: number) => {
                        const day = new Date(y, m, 1).getDay();
                        return day === 0 ? 6 : day - 1;
                      };
                      const startPadding = getFirstDayIndex(activityYear, activityMonth);
                      
                      const monthlyActivityExpenses = expenses.filter(e => {
                        if (!e.date) return false;
                        const parts = e.date.split('-');
                        if (parts.length < 2) return false;
                        const y = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10) - 1;
                        return y === activityYear && m === activityMonth;
                      });

                      return Array.from({ length: daysInMonth }).map((_, idx) => {
                        const d = idx + 1;
                        const dateStr = `${activityYear}-${String(activityMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dayExpenses = monthlyActivityExpenses.filter(e => e.date === dateStr);

                        // Group expenses by category
                        const catSums: { [catId: string]: { category: any; amount: number } } = {};
                        dayExpenses.forEach(exp => {
                          const cat = exp.category;
                          if (!cat) return;
                          if (!catSums[cat.id]) {
                            catSums[cat.id] = { category: cat, amount: 0 };
                          }
                          catSums[cat.id].amount += exp.amount;
                        });

                        const sortedCats = Object.values(catSums).sort((a, b) => b.amount - a.amount);
                        const hasExpenses = dayExpenses.length > 0;

                        let cellStyle: React.CSSProperties = {};
                        if (hasExpenses) {
                          if (sortedCats.length === 0) {
                            const defaultCol = '#6b7280';
                            cellStyle = {
                              backgroundColor: defaultCol,
                              color: '#ffffff',
                              borderColor: defaultCol,
                            };
                          } else if (sortedCats.length === 1) {
                            const catCol = getCategoryColor(sortedCats[0].category?.color);
                            cellStyle = {
                              backgroundColor: catCol,
                              color: '#ffffff',
                              borderColor: catCol,
                            };
                          } else {
                            const colors = sortedCats.map(c => getCategoryColor(c.category?.color));
                            cellStyle = {
                              background: `linear-gradient(135deg, ${colors.join(', ')})`,
                              color: '#ffffff',
                              borderColor: 'transparent',
                            };
                          }
                        } else {
                          cellStyle = {
                            borderColor: 'transparent',
                          };
                        }

                        const gridIndex = startPadding + d - 1;
                        const colIndex = gridIndex % 7;
                        const rowIndex = Math.floor(gridIndex / 7);

                        // Position tooltip based on grid coordinates to avoid clipping
                        let tooltipPositionClass = "bottom-full left-1/2 -translate-x-1/2 mb-2";
                        if (colIndex <= 1) {
                          tooltipPositionClass = "bottom-full left-0 mb-2";
                        } else if (colIndex >= 5) {
                          tooltipPositionClass = "bottom-full right-0 mb-2";
                        }
                        
                        if (rowIndex <= 1) {
                          if (colIndex <= 1) {
                            tooltipPositionClass = "top-full left-0 mt-2";
                          } else if (colIndex >= 5) {
                            tooltipPositionClass = "top-full right-0 mt-2";
                          } else {
                            tooltipPositionClass = "top-full left-1/2 -translate-x-1/2 mt-2";
                          }
                        }

                        const today = new Date();
                        const isToday = 
                          today.getFullYear() === activityYear && 
                          today.getMonth() === activityMonth && 
                          today.getDate() === d;

                        return (
                          <div
                            key={`day-${d}`}
                            onClick={(e) => {
                              if (hasExpenses) {
                                e.stopPropagation();
                                setActiveTooltipDate(prev => prev === dateStr ? null : dateStr);
                              }
                            }}
                            className={cn(
                              "group relative flex items-center justify-center aspect-square border transition-all duration-200 cursor-pointer select-none rounded-full overflow-visible hover:z-30",
                              hasExpenses 
                                ? "hover:scale-105 hover:shadow-md" 
                                : "border-border/20 hover:bg-muted/20",
                              isToday && "ring-2 ring-primary/80 ring-offset-1 dark:ring-offset-slate-900 z-30",
                              isToday && !hasExpenses && "bg-primary/10 dark:bg-primary/20 border-primary/30",
                              activeTooltipDate === dateStr && "ring-2 ring-primary ring-offset-2 z-35"
                            )}
                            style={cellStyle}
                          >
                            <span className={cn(
                              "text-[10px] font-bold text-center leading-none", 
                              hasExpenses 
                                ? "text-white font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" 
                                : isToday 
                                  ? "text-primary font-black scale-105" 
                                  : "text-muted-foreground/75"
                            )}>
                              {d}
                            </span>

                            {isToday && (
                              <span className={cn(
                                "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                                hasExpenses ? "bg-white" : "bg-primary"
                              )} />
                            )}

                            {/* CSS Tooltip */}
                            {hasExpenses && (
                              <div className={cn(
                                "absolute w-48 sm:w-52 p-3 rounded-xl border shadow-xl pointer-events-none z-50 animate-in fade-in duration-200",
                                isDark 
                                  ? "bg-slate-800 border-slate-700 text-slate-100" 
                                  : "bg-white border-slate-200 text-slate-900",
                                tooltipPositionClass,
                                activeTooltipDate === dateStr ? "block" : "hidden group-hover:block"
                              )}>
                                <p className={cn(
                                  "text-[10px] font-extrabold pb-1.5 mb-1.5",
                                  isDark 
                                    ? "text-slate-400 border-b border-slate-700/60" 
                                    : "text-slate-500 border-b border-slate-200/60"
                                )}>
                                  {new Date(activityYear, activityMonth, d).toLocaleDateString(i18n.language || undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                                  {dayExpenses.map(exp => (
                                    <div key={exp.id} className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold">
                                      <div className="flex items-center gap-1.5 truncate max-w-[110px]">
                                        <span 
                                          className="h-1.5 w-1.5 rounded-full shrink-0" 
                                          style={{ backgroundColor: getCategoryColor(exp.category?.color) }}
                                        />
                                        <span className={cn(
                                          "truncate font-semibold",
                                          isDark ? "text-slate-200" : "text-slate-800"
                                        )}>
                                          {profile?.show_shop_name === false
                                            ? t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other')
                                            : (exp.store?.rendering_name || exp.store?.name || exp.notes || t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other'))}
                                        </span>
                                      </div>
                                      <span className="font-mono text-rose-500 font-extrabold shrink-0">
                                        -€{exp.amount.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className={cn(
                                  "text-[10px] font-black pt-1.5 mt-1.5 flex justify-between font-bold",
                                  isDark 
                                    ? "text-slate-50 border-t border-slate-700/60" 
                                    : "text-slate-900 border-t border-slate-200/60"
                                )}>
                                  <span>Daily Total:</span>
                                  <span className="font-mono">€{dayExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}

                    {/* Next month padding cells */}
                    {(() => {
                      const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
                      const getFirstDayIndex = (y: number, m: number) => {
                        const day = new Date(y, m, 1).getDay();
                        return day === 0 ? 6 : day - 1;
                      };
                      const startPadding = getFirstDayIndex(activityYear, activityMonth);
                      const daysInMonth = getDaysInMonth(activityYear, activityMonth);
                      const totalCells = startPadding + daysInMonth;
                      const remainingCells = (7 - (totalCells % 7)) % 7;
                      const pad = [];
                      for (let i = 1; i <= remainingCells; i++) {
                        pad.push(
                          <div 
                            key={`next-${i}`} 
                            className="aspect-square flex items-center justify-center text-[9px] text-muted-foreground/30 font-bold border border-border/5 rounded-lg bg-muted/5 select-none"
                          >
                            {i}
                          </div>
                        );
                      }
                      return pad;
                    })()}
                  </div>
                </div>
                {(() => {
                  // Find selected month's active spending days (timezone-agnostic)
                  const currentSelectedMonthActiveDays = (() => {
                    const activeDates = new Set<string>();
                    expenses.forEach(e => {
                      if (!e.date) return;
                      const parts = e.date.split('-');
                      if (parts.length < 2) return;
                      const y = parseInt(parts[0], 10);
                      const m = parseInt(parts[1], 10) - 1;
                      if (y === activityYear && m === activityMonth) {
                        activeDates.add(e.date);
                      }
                    });
                    return activeDates.size;
                  })();

                  const currentSelectedMonthName = (() => {
                    const dateObj = new Date(activityYear, activityMonth, 1);
                    return dateObj.toLocaleDateString(i18n.language || 'en-US', { month: 'long', year: 'numeric' });
                  })();

                  return (
                    <div className="mt-4 pt-3.5 border-t border-border/50 space-y-2 animate-in fade-in duration-200">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Active Days
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                          <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
                          <div>
                            <span className="text-[10px] block text-muted-foreground">Selected Month ({currentSelectedMonthName})</span>
                            <strong className="text-foreground text-xs font-extrabold">{currentSelectedMonthActiveDays} {currentSelectedMonthActiveDays === 1 ? 'day' : 'days'}</strong>
                          </div>
                        </div>
                        {maxActiveDaysInfo && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            <div>
                              <span className="text-[10px] block text-muted-foreground">Peak Month ({maxActiveDaysInfo.monthLabel})</span>
                              <strong className="text-foreground text-xs font-extrabold">{maxActiveDaysInfo.daysCount} {maxActiveDaysInfo.daysCount === 1 ? 'day' : 'days'}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* MONTHLY COMPARISON TREND */}
            <Card className="hover:border-primary/20 transition-all flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart2 className="h-4.5 w-4.5 text-primary" />
                  Spending Comparison
                </CardTitle>
                <CardDescription>Expense historical tracking totals</CardDescription>
              </CardHeader>
              <CardContent className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" stroke={textColor} style={{ fontSize: '10px', fontWeight: 'semibold' }} />
                    <YAxis stroke={textColor} style={{ fontSize: '10px', fontWeight: 'semibold' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                      }}
                      itemStyle={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 'bold' }}
                      formatter={(value) => [`€${Number(value).toFixed(2)}`, t('analytics.expenses')]}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorExp)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ROW 3: TOP STORES & PRODUCTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* TOP STORE OF ALL TIME */}
             <Card className="hover:border-primary/20 transition-all">
               <CardHeader className="pb-2">
                 <div className="flex items-center justify-between gap-2">
                   {isSearchAllTimeOpen ? (
                     <div className="flex items-center gap-1.5 w-full">
                       <input
                         type="text"
                         placeholder="Search store..."
                         value={searchAllTimeQuery}
                         onChange={(e) => setSearchAllTimeQuery(e.target.value)}
                         className="flex h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-foreground"
                         autoFocus
                       />
                       <button
                         className="h-8 w-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                         onClick={() => {
                           setIsSearchAllTimeOpen(false);
                           setSearchAllTimeQuery('');
                         }}
                       >
                         <X className="h-4 w-4" />
                       </button>
                     </div>
                   ) : (
                     <>
                       <div className="min-w-0">
                         <CardTitle className="text-sm font-bold flex items-center gap-2">
                           <Store className="h-4.5 w-4.5 text-indigo-500" />
                           <span>
                             Top Stores (All Time)
                             <span className="text-[10px] text-muted-foreground font-normal ml-1">({allStoresOfAllTime.length})</span>
                           </span>
                         </CardTitle>
                         <CardDescription className="truncate">Top 5 stores you spent the most at of all time</CardDescription>
                       </div>
                       <button
                         className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                         onClick={() => setIsSearchAllTimeOpen(true)}
                       >
                         <Search className="h-4 w-4" />
                       </button>
                     </>
                   )}
                 </div>
               </CardHeader>
               <CardContent className="pt-2">
                 {displayedStoresAllTime.length === 0 ? (
                   <p className="text-xs text-muted-foreground py-4 text-center font-medium">
                     {searchAllTimeQuery ? "No matching stores found." : "No store purchases logged yet."}
                   </p>
                 ) : (
                   <div className="space-y-2.5">
                     {displayedStoresAllTime.map((store, index) => (
                       <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20 font-semibold text-xs">
                         <div className="flex items-center gap-2.5 min-w-0">
                           <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-[10px] shrink-0">
                             {store.rank}
                           </span>
                           <div className="min-w-0">
                             <p 
                               className="text-foreground/90 font-bold truncate cursor-pointer hover:underline hover:text-primary transition-colors"
                               onClick={() => setSelectedStoreChart({ storeName: store.name, type: 'allTime' })}
                             >
                               {store.name}
                             </p>
                             <p className="text-[10px] text-muted-foreground font-medium truncate">
                               Most in {store.maxMonth} (€{store.maxMonthAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                             </p>
                           </div>
                         </div>
                         <span className="font-mono text-rose-600 dark:text-rose-400 font-bold shrink-0 ml-2">
                           €{store.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                       </div>
                     ))}
                     {allStoresOfAllTime.length > 5 && (
                       <Button
                         variant="ghost"
                         size="sm"
                         className="w-full text-xs text-primary font-semibold hover:bg-muted/50 transition-colors mt-3"
                         onClick={() => setIsShowAllAllTimeOpen(true)}
                       >
                         View All Stores
                       </Button>
                     )}
                   </div>
                 )}
               </CardContent>
             </Card>

             {/* TOP STORES THIS MONTH */}
             <Card className="hover:border-primary/20 transition-all">
               <CardHeader className="pb-2">
                 <div className="flex items-center justify-between gap-2">
                   {isSearchThisMonthOpen ? (
                     <div className="flex items-center gap-1.5 w-full">
                       <input
                         type="text"
                         placeholder="Search store..."
                         value={searchThisMonthQuery}
                         onChange={(e) => setSearchThisMonthQuery(e.target.value)}
                         className="flex h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-foreground"
                         autoFocus
                       />
                       <button
                         className="h-8 w-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                         onClick={() => {
                           setIsSearchThisMonthOpen(false);
                           setSearchThisMonthQuery('');
                         }}
                       >
                         <X className="h-4 w-4" />
                       </button>
                     </div>
                   ) : (
                     <>
                       <div className="min-w-0">
                         <CardTitle className="text-sm font-bold flex items-center gap-2">
                           <Store className="h-4.5 w-4.5 text-indigo-500" />
                           <span>
                             Top Stores (This Month)
                             <span className="text-[10px] text-muted-foreground font-normal ml-1">({allStoresThisMonth.length})</span>
                           </span>
                         </CardTitle>
                         <CardDescription className="truncate">Top 5 stores you spent the most at this month</CardDescription>
                       </div>
                       <button
                         className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                         onClick={() => setIsSearchThisMonthOpen(true)}
                       >
                         <Search className="h-4 w-4" />
                       </button>
                     </>
                   )}
                 </div>
               </CardHeader>
               <CardContent className="pt-2">
                 {displayedStoresThisMonth.length === 0 ? (
                   <p className="text-xs text-muted-foreground py-4 text-center font-medium">
                     {searchThisMonthQuery ? "No matching stores found." : "No store purchases logged this month."}
                   </p>
                 ) : (
                   <div className="space-y-2.5">
                     {displayedStoresThisMonth.map((store, index) => (
                       <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20 font-semibold text-xs">
                         <div className="flex items-center gap-2.5 min-w-0">
                           <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-[10px] shrink-0">
                             {store.rank}
                           </span>
                           <div className="min-w-0 font-semibold">
                             <p 
                               className="text-foreground/90 font-bold truncate cursor-pointer hover:underline hover:text-primary transition-colors"
                               onClick={() => setSelectedStoreChart({ storeName: store.name, type: 'thisMonth' })}
                             >
                               {store.name}
                             </p>
                             {store.maxDate && (
                               <p className="text-[10px] text-muted-foreground font-medium truncate">
                                 Most on {store.maxDate} (€{store.maxDateAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                               </p>
                             )}
                           </div>
                         </div>
                         <span className="font-mono text-rose-600 dark:text-rose-400 font-bold shrink-0 ml-2">
                           €{store.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                       </div>
                     ))}
                     {allStoresThisMonth.length > 5 && (
                       <Button
                         variant="ghost"
                         size="sm"
                         className="w-full text-xs text-primary font-semibold hover:bg-muted/50 transition-colors mt-3"
                         onClick={() => setIsShowAllThisMonthOpen(true)}
                       >
                         View All Stores
                       </Button>
                     )}
                   </div>
                 )}
               </CardContent>
             </Card>

            {/* TOP BOUGHT PRODUCTS */}
            <Card className="hover:border-primary/20 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShoppingBag className="h-4.5 w-4.5 text-violet-500" />
                  Product Purchases Analysis
                </CardTitle>
                <CardDescription>Top products bought by item breakdown</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {topProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center font-medium">No itemized products logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topProducts.map((prod, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-muted/10 font-semibold text-xs">
                        <div>
                          <p className="text-foreground/90 font-bold">{prod.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{prod.month}</p>
                        </div>
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                          €{prod.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modals for viewing all stores */}
      <Dialog
        isOpen={isShowAllThisMonthOpen}
        onClose={() => setIsShowAllThisMonthOpen(false)}
        title="All Stores (This Month)"
        description="Full list of stores you spent at this month, sorted by spending amount."
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsShowAllThisMonthOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                <th className="py-2 w-12 text-center">Rank</th>
                <th className="py-2">Store Name</th>
                <th className="py-2 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {allStoresThisMonth.map((store) => (
                <tr key={store.rank} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-2.5 text-center font-bold text-muted-foreground">{store.rank}</td>
                  <td 
                    className="py-2.5 font-medium text-foreground cursor-pointer hover:underline hover:text-primary transition-colors"
                    onClick={() => {
                      setIsShowAllThisMonthOpen(false);
                      setSelectedStoreChart({ storeName: store.name, type: 'thisMonth' });
                    }}
                  >
                    <div>
                      <p className="font-bold">{store.name}</p>
                      {store.maxDate && (
                        <p className="text-[10px] text-muted-foreground font-medium normal-case">
                          Most on {store.maxDate} (€{store.maxDateAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-rose-500 font-bold">
                    €{store.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Dialog>

      <Dialog
        isOpen={isShowAllAllTimeOpen}
        onClose={() => setIsShowAllAllTimeOpen(false)}
        title="All Stores (All Time)"
        description="Full list of stores you spent at of all time, sorted by spending amount."
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsShowAllAllTimeOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                <th className="py-2 w-12 text-center">Rank</th>
                <th className="py-2">Store Name</th>
                <th className="py-2 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {allStoresOfAllTime.map((store) => (
                <tr key={store.rank} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-2.5 text-center font-bold text-muted-foreground">{store.rank}</td>
                  <td 
                    className="py-2.5 font-medium text-foreground cursor-pointer hover:underline hover:text-primary transition-colors"
                    onClick={() => {
                      setIsShowAllAllTimeOpen(false);
                      setSelectedStoreChart({ storeName: store.name, type: 'allTime' });
                    }}
                  >
                    <div>
                      <p className="font-bold">{store.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium normal-case">
                        Most in {store.maxMonth} (€{store.maxMonthAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </p>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-rose-500 font-bold">
                    €{store.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Dialog>

      {/* Modal for store purchase history chart */}
      <Dialog
        isOpen={selectedStoreChart !== null}
        onClose={() => setSelectedStoreChart(null)}
        title={selectedStoreChart?.storeName || ''}
        description={
          selectedStoreChart?.type === 'allTime'
            ? `All time monthly spending history. Total: €${totalStoreSpent.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `Daily spending history for this month. Total: €${totalStoreSpent.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
        footer={
          <Button variant="outline" size="sm" onClick={() => setSelectedStoreChart(null)}>
            Close
          </Button>
        }
      >
        <div className="pt-2">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center font-medium">No purchase data available to draw chart.</p>
          ) : (
            <div className="w-full h-[260px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="label" stroke={textColor} style={{ fontSize: '10px', fontWeight: 'semibold' }} />
                  <YAxis stroke={textColor} style={{ fontSize: '10px', fontWeight: 'semibold' }} tickFormatter={(val) => `€${val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                    }}
                    labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}
                    itemStyle={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 'bold' }}
                    formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Spent']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
