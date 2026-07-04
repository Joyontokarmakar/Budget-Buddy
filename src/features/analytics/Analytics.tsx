import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { ExpenseWithDetails, IncomeWithDetails } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Spinner } from '../../components/ui';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { PieChart as PieIcon, LineChart as LineIcon, BarChart2, Coins, Store, ShoppingBag } from 'lucide-react';
export const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendView, setTrendView] = useState<'weekly' | 'daily'>('weekly');

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

  const categoryDataMap: { [key: string]: { name: string; value: number; color: string } } = {};
  expenses.forEach(e => {
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

      const storeName = e.store?.name || 'Other/Unknown';
      storeSpendingMap[storeName] = (storeSpendingMap[storeName] || 0) + e.amount;
    }
  });

  const topStores = Object.entries(storeSpendingMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CATEGORY BREAKDOWN PIE & LIST */}
          {/* CATEGORY BREAKDOWN PIE */}
          <Card className="hover:border-primary/20 transition-all flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <PieIcon className="h-4.5 w-4.5 text-primary" />
                {t('analytics.byCategory')}
              </CardTitle>
              <CardDescription>All-time categorized spending allocation</CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2">
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

          {/* INCOME VS EXPENSE CASHFLOW AREA */}
          <Card className="hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Coins className="h-4.5 w-4.5 text-emerald-500" />
                {t('analytics.cashFlow')}
              </CardTitle>
              <CardDescription>Monthly inflows vs outflows comparison</CardDescription>
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

          {/* MONTHLY COMPARISON TREND */}
          <Card className="hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart2 className="h-4.5 w-4.5 text-primary" />
                Monthly Spending Comparison
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

          {/* TOP STORES THIS MONTH */}
          <Card className="hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Store className="h-4.5 w-4.5 text-indigo-500" />
                Top Stores (This Month)
              </CardTitle>
              <CardDescription>Top 5 stores you spent the most at this month</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {topStores.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center font-medium">No store purchases logged this month.</p>
              ) : (
                <div className="space-y-2.5">
                  {topStores.map((store, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20 font-semibold text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-[10px]">
                          {index + 1}
                        </span>
                        <span className="text-foreground/90">{store.name}</span>
                      </div>
                      <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                        €{store.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
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
      )}
    </div>
  );
};
