import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { ExpenseWithDetails, IncomeWithDetails } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Spinner } from '../../components/ui';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { PieChart as PieIcon, LineChart as LineIcon, BarChart2, Coins } from 'lucide-react';
export const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

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
  const categoryData = Object.values(categoryDataMap);

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
          
          {/* CATEGORY BREAKDOWN PIE */}
          <Card className="hover:border-primary/20 transition-all">
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
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
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
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'semibold' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* WEEKLY TREND LINE */}
          <Card className="hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <LineIcon className="h-4.5 w-4.5 text-rose-500" />
                {t('analytics.weeklyTrend')}
              </CardTitle>
              <CardDescription>Spending trajectory over the last 4 weeks</CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="week" stroke={textColor} style={{ fontSize: '10px', fontWeight: 'semibold' }} />
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
                    dot={{ r: 4, strokeWidth: 2 }}
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

        </div>
      )}
    </div>
  );
};
