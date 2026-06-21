import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Account, ExpenseWithDetails, IncomeWithDetails } from '../../types';
import { Button, Card, CardHeader, CardTitle, CardContent, Progress, Spinner } from '../../components/ui';
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet, TrendingDown, TrendingUp, Receipt, AlertTriangle, CheckCircle, Flame, Coins } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { isInstallable, installApp } = usePWA();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [accs, exps, incs] = await Promise.all([
        db.getAccounts(profile.id),
        db.getExpenses(profile.id),
        db.getIncome(profile.id),
      ]);
      setAccounts(accs);
      setExpenses(exps);
      setIncomes(incs);
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

  return (
    <div className="space-y-6">
      {isInstallable && (
        <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-none shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 animate-bounce" />
              <div>
                <h4 className="text-xs font-bold text-white">Install BudgetBuddy</h4>
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">BudgetBuddy</h1>
          <p className="text-xs text-muted-foreground">Premium student dashboard overview</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={loadDashboardData}>
            Sync
          </Button>
        </div>
      </div>

      {/* Main KPI Grid - Revolut Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Assets (Span 2) */}
        <Card className="col-span-2 bg-gradient-to-tr from-primary to-violet-600 border-none text-white shadow-xl shadow-primary/10">
          <CardContent className="p-4 sm:p-6 flex flex-col justify-between min-h-[144px]">
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
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[144px]">
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
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[144px]">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Income & Savings */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-emerald-500/5 dark:bg-emerald-500/[0.02] border-emerald-500/10">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[112px]">
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
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between min-h-[112px]">
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
                    style={{ backgroundColor: tx.type === 'expense' ? (tx.categoryColor || '#f43f5e') : '#10b981' }}
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
