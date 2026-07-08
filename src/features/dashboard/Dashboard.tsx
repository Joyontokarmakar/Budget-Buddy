import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Account, ExpenseWithDetails, IncomeWithDetails, Category } from '../../types';
import { Button, Card, CardHeader, CardTitle, CardContent, Progress, Spinner } from '../../components/ui';
import { usePWA } from '../../hooks/usePWA';
import { getCategoryColor } from '../../utils/color';
import { getSafeItems } from '../../utils/items';
import { cn } from '../../utils/cn';
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Flame, Coins, BrainCircuit, Sparkles, Store, ShoppingBag } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { isInstallable, installApp } = usePWA();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [accs, exps, incs, cats] = await Promise.all([
        db.getAccounts(profile.id),
        db.getExpenses(profile.id),
        db.getIncome(profile.id),
        db.getCategories(profile.id),
      ]);
      setAccounts(accs);
      setExpenses(exps);
      setIncomes(incs);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  if (loading && accounts.length === 0) {
    return <Spinner />;
  }

  // Calculate stats for current calendar month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const thisMonthIncomes = incomes.filter(i => {
    const d = new Date(i.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const totalAssets = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const monthlyBudget = profile?.monthly_budget || 700.00;
  const monthlySpending = thisMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const thisMonthIncome = thisMonthIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const remainingBudget = Math.max(monthlyBudget - monthlySpending, 0);
  
  // Savings is total month income minus spending
  const thisMonthSavings = thisMonthIncome - monthlySpending;

  // Sum up discounts in the current month
  const thisMonthDiscounts = thisMonthExpenses.reduce((acc, curr) => acc + (curr.discount || 0), 0);

  // Percentage calculations
  const budgetUsedPercent = monthlyBudget > 0 ? (monthlySpending / monthlyBudget) * 100 : 0;

  // Recent transactions (merged and sorted)
  const recentTransactions: {
    id: string;
    type: 'expense' | 'income';
    title: string;
    amount: number;
    date: string;
    categoryColor?: string;
    accountName: string;
  }[] = [
    ...expenses.map(e => ({
      id: e.id,
      type: 'expense' as const,
      title: e.store?.name || t(`categories.${e.category?.name || 'Other'}`, e.category?.name || 'Other'),
      amount: e.amount,
      date: e.date,
      categoryColor: e.category?.color || '#3b82f6',
      accountName: e.account?.name || 'Account',
    })),
    ...incomes.map(i => ({
      id: i.id,
      type: 'income' as const,
      title: t(`income.${i.type}`, i.type),
      amount: i.amount,
      date: i.date,
      accountName: i.account?.name || 'Account',
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Status limits checking
  const getBudgetStatus = () => {
    if (budgetUsedPercent < 75) {
      return {
        label: t('dashboard.statusSafe'),
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        icon: <CheckCircle className="h-4 w-4" />,
      };
    }
    if (budgetUsedPercent < 100) {
      return {
        label: t('dashboard.statusWarning'),
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        icon: <AlertTriangle className="h-4 w-4" />,
      };
    }
    return {
      label: t('dashboard.statusExceeded'),
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      icon: <Flame className="h-4 w-4" />,
    };
  };

  const status = getBudgetStatus();

  // Daily Average Spending (excluding common bills)
  const commonBillsCategories = ['house rent', 'health insurance', 'radio bill', 'mobile bill'];
  const commonBillsCategoryIds = ['c3', 'c4', 'c5', 'c6'];
  const nonBillExpenses = thisMonthExpenses.filter(e => {
    // 1. Exclude by category ID
    if (e.category_id && commonBillsCategoryIds.includes(e.category_id)) {
      return false;
    }
    // 2. Exclude by category name
    const catName = e.category?.name?.toLowerCase();
    if (catName && commonBillsCategories.includes(catName)) {
      return false;
    }
    // 3. Exclude by notes keyword matching
    const notes = e.notes?.toLowerCase() || '';
    if (notes.includes('rent') || notes.includes('insurance') || notes.includes('radio bill') || notes.includes('mobile bill')) {
      return false;
    }
    return true;
  });
  const nonBillSpending = nonBillExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const daysElapsed = Math.max(now.getDate(), 1);
  const dailyAverage = nonBillSpending / daysElapsed;
  const targetDailyLimit = monthlyBudget / 30;

  // Groceries Trajectory calculations
  const groceriesCats = categories.filter(c => c.name.toLowerCase() === 'food' || c.name.toLowerCase() === 'groceries');
  const groceriesCatIds = groceriesCats.map(c => c.id);

  const groceriesThisMonthSum = thisMonthExpenses.reduce((acc, curr) => {
    const isMainGroceries = curr.category_id && groceriesCatIds.includes(curr.category_id);
    const safeItems = getSafeItems(curr.items);
    if (safeItems.length > 0) {
      return acc + safeItems.reduce((sum, item) => {
        const isItemGroceries = item.category_id && groceriesCatIds.includes(item.category_id);
        return isItemGroceries ? sum + Number(item.amount) : sum;
      }, 0);
    }
    return isMainGroceries ? acc + Number(curr.amount) : acc;
  }, 0);

  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthYear = lastMonthDate.getFullYear();
  const lastMonthMonth = lastMonthDate.getMonth();

  const lastMonthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonthMonth;
  });

  const groceriesLastMonthSum = lastMonthExpenses.reduce((acc, curr) => {
    const isMainGroceries = curr.category_id && groceriesCatIds.includes(curr.category_id);
    const safeItems = getSafeItems(curr.items);
    if (safeItems.length > 0) {
      return acc + safeItems.reduce((sum, item) => {
        const isItemGroceries = item.category_id && groceriesCatIds.includes(item.category_id);
        return isItemGroceries ? sum + Number(item.amount) : sum;
      }, 0);
    }
    return isMainGroceries ? acc + Number(curr.amount) : acc;
  }, 0);

  let groceriesDiffPercent = 0;
  let groceriesComparisonText = '';
  if (groceriesLastMonthSum > 0) {
    groceriesDiffPercent = ((groceriesThisMonthSum - groceriesLastMonthSum) / groceriesLastMonthSum) * 100;
    if (groceriesDiffPercent > 0) {
      groceriesComparisonText = `You spent ${groceriesDiffPercent.toFixed(0)}% more on groceries this month compared to last month.`;
    } else if (groceriesDiffPercent < 0) {
      groceriesComparisonText = `You spent ${Math.abs(groceriesDiffPercent).toFixed(0)}% less on groceries this month compared to last month.`;
    } else {
      groceriesComparisonText = `Your groceries spending matches last month's exactly.`;
    }
  } else {
    groceriesComparisonText = `Groceries spending is €${groceriesThisMonthSum.toFixed(2)} this month (no previous month comparison available).`;
  }

  // Store Analytics: Top 5 stores this month with amount (excluding common bills)
  const storeSpendingMap: { [key: string]: number } = {};
  nonBillExpenses.forEach(e => {
    const storeName = e.store?.name || 'Other/Unknown';
    storeSpendingMap[storeName] = (storeSpendingMap[storeName] || 0) + e.amount;
  });

  const topStores = Object.entries(storeSpendingMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Product Analytics: Top bought Products (Product, Month, Amount) scanning items (excluding common bills)
  const productMap: { [key: string]: { name: string; month: string; amount: number } } = {};
  const nonBillExpensesAll = expenses.filter(e => {
    if (e.category_id && commonBillsCategoryIds.includes(e.category_id)) return false;
    const catName = e.category?.name?.toLowerCase();
    if (catName && commonBillsCategories.includes(catName)) return false;
    const notes = e.notes?.toLowerCase() || '';
    if (notes.includes('rent') || notes.includes('insurance') || notes.includes('radio bill') || notes.includes('mobile bill')) return false;
    return true;
  });

  nonBillExpensesAll.forEach(e => {
    if (!e.date) return;
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {isInstallable && (
        <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-none shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 animate-bounce">
                <svg
                  viewBox="0 0 100 100"
                  className="w-5 h-5 text-white"
                >
                  <path
                    d="M 32 26 L 32 78 M 32 26 C 46 26 46 54 32 54 C 18 54 18 78 32 78"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 52 26 L 52 78 M 52 26 C 66 26 66 54 52 54 C 66 54 66 78 52 78"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Install Budget buddy</h4>
                <p className="text-[10px] text-white/80">Add to your home screen for quick offline access!</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={installApp} className="bg-white text-indigo-700 hover:bg-white/90">
              Install
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Welcome Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Budget buddy</h1>
          <p className="text-xs text-muted-foreground">Premium student dashboard overview</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={loadDashboardData}>
            Sync
          </Button>
        </div>
      </div>

      {/* Main KPI Grid - Revolut Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Assets (Span 2) */}
        <Card className="col-span-2 bg-gradient-to-tr from-primary to-violet-600 border-none text-white shadow-xl shadow-primary/10">
          <CardContent className="p-4 sm:p-6 flex flex-col justify-between min-h-[120px] sm:min-h-[144px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                {t('dashboard.currentMoney')}
              </span>
              <Wallet className="h-5 w-5 text-white/80" />
            </div>
            <div className="mt-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                €{totalAssets.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span className="text-[10px] text-white/60 font-semibold mt-1">Across all synced assets</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Spending */}
        <Card className="hover:border-primary/20 transition-all">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[120px] sm:min-h-[144px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {t('dashboard.monthlySpending')}
              </span>
              <TrendingDown className="h-4.5 w-4.5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">
                €{monthlySpending.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">This Month</p>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Budget */}
        <Card className="hover:border-primary/20 transition-all">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[120px] sm:min-h-[144px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {t('dashboard.remainingBudget')}
              </span>
              <Coins className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">
                €{remainingBudget.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Of €{monthlyBudget.toFixed(0)} limit</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Financial Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        
        {/* Income, Savings & Discounts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-emerald-500/5 dark:bg-emerald-500/[0.02] border-emerald-500/10">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[96px] sm:min-h-[112px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t('dashboard.thisMonthIncome')}
              </span>
              <div>
                <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  +€{thisMonthIncome.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[9px] text-muted-foreground mt-0.5">Werkstudent + Support</p>
              </div>
            </CardContent>
          </Card>

          <Card className={thisMonthSavings >= 0 ? "bg-blue-500/5 dark:bg-blue-500/[0.02] border-blue-500/10" : "bg-rose-500/5 dark:bg-rose-500/[0.02] border-rose-500/10"}>
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[96px] sm:min-h-[112px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {t('dashboard.thisMonthSavings')}
              </span>
              <div>
                <span className={`text-base sm:text-lg font-extrabold ${thisMonthSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`}>
                  {thisMonthSavings >= 0 ? '+' : ''}€{thisMonthSavings.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[9px] text-muted-foreground mt-0.5">Net Cash Flow</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-violet-500/5 dark:bg-violet-500/[0.02] border-violet-500/10">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[96px] sm:min-h-[112px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Monthly Discounts
              </span>
              <div>
                <span className="text-base sm:text-lg font-extrabold text-violet-600 dark:text-violet-400">
                  +€{thisMonthDiscounts.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[9px] text-muted-foreground mt-0.5">Total Saved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Progress Bar */}
        <Card className="flex flex-col justify-center px-6 py-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">{t('dashboard.budgetProgress')}</span>
            <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase flex items-center gap-1.5 ${status.color}`}>
              {status.icon}
              {status.label}
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={budgetUsedPercent} />
            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold mt-1">
              <span>{budgetUsedPercent.toFixed(0)}% Used</span>
              <span>€{monthlySpending.toFixed(0)} / €{monthlyBudget.toFixed(0)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Smart Spending Insights */}
      <Card className="bg-gradient-to-tr from-violet-500/5 to-indigo-500/5 border border-violet-500/10 shadow-sm animate-fade-in">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BrainCircuit className="h-4.5 w-4.5 text-primary shrink-0" />
            Smart Spending Insights
          </CardTitle>
          <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <Sparkles className="h-3 w-3 animate-pulse" /> AI Engine
          </span>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Grocery comparison insight */}
          <div className="flex gap-3 items-start bg-card/65 p-3 rounded-xl border border-border/40">
            <div className={cn(
              "h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-white",
              groceriesDiffPercent > 0 ? "bg-rose-500" : groceriesDiffPercent < 0 ? "bg-emerald-500" : "bg-primary"
            )}>
              {groceriesDiffPercent > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
            <div>
              <h5 className="text-[11px] font-bold text-foreground">Groceries Trajectory</h5>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5 leading-relaxed">
                {groceriesComparisonText}
              </p>
            </div>
          </div>

          {/* Daily average insight */}
          <div className="flex gap-3 items-start bg-card/65 p-3 rounded-xl border border-border/40">
            <div className={cn(
              "h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-white bg-primary"
            )}>
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h5 className="text-[11px] font-bold text-foreground">Daily Avg Spending</h5>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5 leading-relaxed">
                Your daily avg spending is <strong className="text-foreground">€{dailyAverage.toFixed(2)}</strong>. To stay within budget, keep daily average under €{targetDailyLimit.toFixed(2)}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store & Product Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Top Stores */}
        <Card className="hover:border-primary/20 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Store className="h-4.5 w-4.5 text-indigo-500" />
              Top Stores (This Month)
            </CardTitle>
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

        {/* Top Products */}
        <Card className="hover:border-primary/20 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-violet-500" />
              Product Purchases Analysis
            </CardTitle>
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

      {/* Quick Actions Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Button variant="outline" className="flex flex-col items-center justify-center h-20 rounded-2xl gap-1 text-[10px] sm:text-xs font-semibold" onClick={() => navigate('/expenses')}>
            <TrendingDown className="h-5 w-5 text-rose-500" />
            + Expense
          </Button>
          <Button variant="outline" className="flex flex-col items-center justify-center h-20 rounded-2xl gap-1 text-[10px] sm:text-xs font-semibold" onClick={() => navigate('/income')}>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            + Income
          </Button>
          <Button variant="outline" className="flex flex-col items-center justify-center h-20 rounded-2xl gap-1 text-[10px] sm:text-xs font-semibold" onClick={() => navigate('/accounts')}>
            <Plus className="h-5 w-5 text-primary" />
            + Account
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.recentTransactions')}</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary" onClick={() => navigate('/expenses')}>
            View All
          </Button>
        </div>

        {recentTransactions.length === 0 ? (
          <Card className="py-8 text-center border-dashed">
            <CardContent className="text-sm text-muted-foreground">
              {t('dashboard.noTransactions')}
            </CardContent>
          </Card>
        ) : (
          recentTransactions.map((tx) => (
            <Card key={tx.id} className="hover:border-primary/10 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-white shrink-0`}
                    style={{ backgroundColor: tx.type === 'expense' ? getCategoryColor(tx.categoryColor) : '#10b981' }}
                  >
                    {tx.type === 'expense' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground truncate max-w-[150px] sm:max-w-xs">{tx.title}</h4>
                    <p className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1.5">
                      <span>{new Date(tx.date).toLocaleDateString('de-DE')}</span>
                      <span>•</span>
                      <span>{tx.accountName}</span>
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-extrabold ${tx.type === 'expense' ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {tx.type === 'expense' ? '-' : '+'}€{tx.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
