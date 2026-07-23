import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Account, ExpenseWithDetails, IncomeWithDetails, Category } from '../../types';
import { Button, Card, CardHeader, CardTitle, CardContent, Progress, Spinner, Dialog, Input, Select } from '../../components/ui';
import { usePWA } from '../../hooks/usePWA';
import { getCategoryColor } from '../../utils/color';
import { getSafeItems } from '../../utils/items';
import { cn } from '../../utils/cn';
import { isCategoryBill, isCategoryActive } from '../../utils/category';
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Flame, Coins, BrainCircuit, Sparkles, Store, ShoppingBag, AlertCircle, ChevronDown, Calendar, Search, X } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { isInstallable, installApp } = usePWA();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<'bills' | 'loans' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [quickLogMsg, setQuickLogMsg] = useState<string | null>(null);

  // Search states for store analytics
  const [searchThisMonthQuery, setSearchThisMonthQuery] = useState('');
  const [isSearchThisMonthOpen, setIsSearchThisMonthOpen] = useState(false);
  const [searchAllTimeQuery, setSearchAllTimeQuery] = useState('');
  const [isSearchAllTimeOpen, setIsSearchAllTimeOpen] = useState(false);

  // Onboarding Wizard State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedBills, setSelectedBills] = useState<{ [key: string]: boolean }>({
    'House rent': true,
    'Health Insurance': true,
    'Radio Bill': false,
    'Mobile bill': true,
    'Education': false,
  });
  const [billAmounts, setBillAmounts] = useState<{ [key: string]: string }>({
    'House rent': '264.50',
    'Health Insurance': '151.42',
    'Radio Bill': '18.36',
    'Mobile bill': '10.00',
    'Education': '350.00',
  });
  const [customOnboardingBills, setCustomOnboardingBills] = useState<{ name: string; amount: string; icon: string; color: string }[]>([]);
  const [newCustomBillName, setNewCustomBillName] = useState('');
  const [newCustomBillAmount, setNewCustomBillAmount] = useState('');

  useEffect(() => {
    if (profile && profile.onboarded === false) {
      const localOnboarded = localStorage.getItem(`bb-onboarded-${profile.id}`);
      if (localOnboarded !== 'true') {
        setShowOnboarding(true);
      }
    }
  }, [profile]);

  const handleAddCustomOnboardingBill = () => {
    if (!newCustomBillName.trim() || !newCustomBillAmount.trim()) return;
    setCustomOnboardingBills([
      ...customOnboardingBills,
      {
        name: newCustomBillName.trim(),
        amount: newCustomBillAmount.trim(),
        icon: 'HelpCircle',
        color: '#8b5cf6',
      }
    ]);
    setNewCustomBillName('');
    setNewCustomBillAmount('');
  };

  const handleRemoveCustomOnboardingBill = (index: number) => {
    setCustomOnboardingBills(customOnboardingBills.filter((_, i) => i !== index));
  };

  const handleFinishOnboarding = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const { updateProfile } = useAuthStore.getState();
      
      let totalBillsBudget = 0;
      
      for (const catName of Object.keys(selectedBills)) {
        const isActive = selectedBills[catName];
        const amount = parseFloat(billAmounts[catName]) || 0;
        
        const cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (cat) {
          await db.updateCategory(profile.id, cat.id, {
            is_monthly_bill: isActive,
            monthly_amount: amount,
            is_active: true,
          });
          if (isActive) {
            totalBillsBudget += amount;
          }
        }
      }
      
      for (const customBill of customOnboardingBills) {
        const amt = parseFloat(customBill.amount) || 0;
        await db.createCategory(
          profile.id,
          customBill.name,
          customBill.icon,
          customBill.color,
          true,
          amt,
          null
        );
        totalBillsBudget += amt;
      }
      
      const calculatedBudget = totalBillsBudget + 300;
      
      localStorage.setItem(`bb-onboarded-${profile.id}`, 'true');
      await updateProfile({
        monthly_budget: calculatedBudget,
        onboarded: true,
      });
      
      setShowOnboarding(false);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to save onboarding settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'destructive' | 'secondary';
    showDatePicker?: boolean;
    initialDate?: string;
    showAccountPicker?: boolean;
    initialAccountId?: string;
    showAmountInput?: boolean;
    initialAmount?: number;
    onConfirm: (selectedDate?: string, selectedAccountId?: string, selectedAmount?: number) => void;
  } | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalAccountId, setModalAccountId] = useState('');
  const [modalAmount, setModalAmount] = useState('');

  useEffect(() => {
    if (confirmState?.isOpen) {
      if (confirmState.initialDate) {
        setModalDate(confirmState.initialDate);
      }
      if (confirmState.initialAccountId) {
        setModalAccountId(confirmState.initialAccountId);
      }
      if (confirmState.initialAmount !== undefined) {
        setModalAmount(confirmState.initialAmount.toString());
      }
    }
  }, [confirmState]);

  const loadDashboardData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [accs, exps, incs, cats, lns] = await Promise.all([
        db.getAccounts(profile.id),
        db.getExpenses(profile.id),
        db.getIncome(profile.id),
        db.getCategories(profile.id),
        db.getLoans(profile.id),
      ]);
      setAccounts(accs);
      setExpenses(exps);
      setIncomes(incs);
      setCategories(cats);
      setLoans(lns);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLog = async (type: 'groceries' | 'cosmetics' | 'restaurant') => {
    if (!profile) return;
    
    // Check accounts
    if (accounts.length === 0) {
      setQuickLogMsg('Please create an asset account (e.g. Bank Account) first!');
      setTimeout(() => setQuickLogMsg(null), 4000);
      return;
    }
    
    // Select first account as default
    const defaultAccount = accounts[0];
    
    // Resolve category
    let targetCategory = categories.find(c => c.name.toLowerCase() === type);
    
    // Fallbacks
    if (!targetCategory) {
      if (type === 'groceries') {
        targetCategory = categories.find(c => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('grocery'));
      } else if (type === 'cosmetics') {
        targetCategory = categories.find(c => c.name.toLowerCase().includes('shop') || c.name.toLowerCase().includes('others') || c.name.toLowerCase().includes('cosm'));
      } else if (type === 'restaurant') {
        targetCategory = categories.find(c => c.name.toLowerCase().includes('rest') || c.name.toLowerCase().includes('food'));
      }
    }
    
    if (!targetCategory) {
      targetCategory = categories.find(c => c.name.toLowerCase() === 'other') || categories[0];
    }
    
    // Log expense
    let amount = 15.00;
    let label = 'Groceries';
    let notes = 'Quick Groceries';
    
    if (type === 'cosmetics') {
      amount = 8.50;
      label = 'Cosmetics';
      notes = 'Cosmetics Log';
    } else if (type === 'restaurant') {
      amount = 25.00;
      label = 'Restaurant';
      notes = 'Restaurant Dinner';
    }
    
    try {
      await db.createExpense(profile.id, {
        amount,
        date: new Date().toISOString().split('T')[0],
        category_id: targetCategory?.id || null,
        store_id: null,
        payment_account_id: defaultAccount.id,
        notes,
        receipt_url: null,
        items: null
      });
      
      setQuickLogMsg(`Logged €${amount.toFixed(2)} for ${label} successfully!`);
      setTimeout(() => setQuickLogMsg(null), 3000);
      setIsFabOpen(false);
      
      // Reload Dashboard data
      await loadDashboardData();
    } catch (e: any) {
      setQuickLogMsg('Failed to log quick purchase: ' + e.message);
      setTimeout(() => setQuickLogMsg(null), 4000);
    }
  };
  const formatMonthKey = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString(i18n.language || 'en', { month: 'long', year: 'numeric' });
  };

  const isBillLogged = (categoryId: string, monthKey: string) => {
    return expenses.some(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      const eMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const isSameCategory = e.category_id === categoryId;
      const isInTargetMonth = eMonthKey === monthKey;
      const isExplicitPeriod = e.notes?.includes(`[Bill Period: ${monthKey}]`);
      
      return isSameCategory && (isInTargetMonth || isExplicitPeriod);
    });
  };

  const getUnpaidPastBills = () => {
    if (!profile) return [];
    
    let startD = new Date(profile.created_at || new Date().toISOString());
    if (isNaN(startD.getTime())) {
      startD = new Date();
    }
    let earliestTime = startD.getTime();
    
    expenses.forEach(e => {
      if (e.date) {
        const d = new Date(e.date);
        if (!isNaN(d.getTime()) && d.getTime() < earliestTime) {
          earliestTime = d.getTime();
        }
      }
    });
    
    startD = new Date(earliestTime);
    const startYear = startD.getFullYear();
    const startMonth = startD.getMonth();
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const unpaidList: {
      name: string;
      cat: string;
      categoryId: string;
      amount: number;
      month: string;
      preferredAccountId?: string | null;
    }[] = [];
    
    let iterYear = startYear;
    let iterMonth = startMonth;
    
    while (iterYear < currentYear || (iterYear === currentYear && iterMonth < currentMonth)) {
      const monthKey = `${iterYear}-${String(iterMonth + 1).padStart(2, '0')}`;
      
      const billsToCheck = categories.filter(c => isCategoryBill(c) && isCategoryActive(c));
      
      for (const bill of billsToCheck) {
        if (!isBillLogged(bill.id, monthKey)) {
          unpaidList.push({
            name: bill.name,
            cat: bill.name,
            categoryId: bill.id,
            amount: bill.monthly_amount || 0,
            month: monthKey,
            preferredAccountId: bill.preferred_account_id
          });
        }
      }
      
      iterMonth++;
      if (iterMonth > 11) {
        iterMonth = 0;
        iterYear++;
      }
    }
    
    return unpaidList;
  };

  const handlePayMissedBillDirect = async (bill: { name: string; cat: string; categoryId: string; amount: number; month: string; preferredAccountId?: string | null }) => {
    if (!profile) return;
    if (accounts.length === 0) {
      setQuickLogMsg('Please create an asset account (e.g. Bank Account) first!');
      setTimeout(() => setQuickLogMsg(null), 4000);
      return;
    }
    
    const accountIdToUse = bill.preferredAccountId || accounts[0].id;
    const account = accounts.find(a => a.id === accountIdToUse) || accounts[0];
    const accountName = account ? account.name : 'selected account';
    
    setConfirmState({
      isOpen: true,
      title: `Pay Missed ${bill.name}`,
      description: `Log payment for missed ${bill.name} using ${accountName}? It will be logged under today's date and deducted from the current month's ledger. You can verify or adjust the date, payment account, and amount below.`,
      confirmText: 'Pay Missed Bill',
      confirmVariant: 'primary',
      showDatePicker: true,
      initialDate: new Date().toISOString().split('T')[0],
      showAccountPicker: true,
      initialAccountId: accountIdToUse,
      showAmountInput: true,
      initialAmount: bill.amount,
      onConfirm: async (selectedDate, selectedAccountId, selectedAmount) => {
        const finalDate = selectedDate || new Date().toISOString().split('T')[0];
        const finalAccountId = selectedAccountId || accountIdToUse;
        const categoryId = bill.categoryId;
        const finalAmount = selectedAmount !== undefined ? selectedAmount : bill.amount;
        
        try {
          await db.createExpense(profile.id, {
            amount: finalAmount,
            date: finalDate,
            category_id: categoryId,
            store_id: null,
            payment_account_id: finalAccountId,
            notes: `${bill.name} - Missed Bill for ${bill.month} [Bill Period: ${bill.month}]`,
            receipt_url: null,
            items: null
          });
          
          setQuickLogMsg(`${bill.name} for ${formatMonthKey(bill.month)} paid and logged successfully!`);
          setTimeout(() => setQuickLogMsg(null), 3000);
          
          await loadDashboardData();
        } catch (e: any) {
          setQuickLogMsg('Failed to pay missed bill: ' + e.message);
          setTimeout(() => setQuickLogMsg(null), 4000);
        }
      }
    });
  };

  useEffect(() => {
    loadDashboardData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData();
      }
    };

    window.addEventListener('budget-buddy-data-change', loadDashboardData);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('budget-buddy-data-change', loadDashboardData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  // Active taken loans
  const activeTakenLoans = loans.filter(l => l.status === 'active' && l.type === 'taken');

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
      title: profile?.show_shop_name === false
        ? t(`categories.${e.category?.name || 'Other'}`, e.category?.name || 'Other')
        : (e.store?.rendering_name || e.store?.name || t(`categories.${e.category?.name || 'Other'}`, e.category?.name || 'Other')),
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

  // Daily Average Spending (excluding dynamic monthly bills)
  const nonBillExpenses = thisMonthExpenses.filter(e => {
    // 1. Exclude if category is flagged as monthly bill
    if (isCategoryBill(e.category)) {
      return false;
    }
    // 2. Exclude by category ID reference check
    const cat = categories.find(c => c.id === e.category_id);
    if (isCategoryBill(cat)) {
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
  if (groceriesLastMonthSum > 0) {
    groceriesDiffPercent = ((groceriesThisMonthSum - groceriesLastMonthSum) / groceriesLastMonthSum) * 100;
  }

  // Store Analytics: Top 5 stores this month with amount (excluding common bills)
  const storeSpendingMap: { [key: string]: number } = {};
  const storeDailySpendingMap: { [key: string]: { [date: string]: number } } = {};
  nonBillExpenses.forEach(e => {
    const storeName = e.store?.rendering_name || e.store?.name || 'Other/Unknown';
    storeSpendingMap[storeName] = (storeSpendingMap[storeName] || 0) + e.amount;

    if (e.date) {
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
      if (isCategoryBill(e.category)) return;
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

  const displayedStoresThisMonth = isSearchThisMonthOpen && searchThisMonthQuery
    ? allStoresThisMonth.filter(s => s.name.toLowerCase().includes(searchThisMonthQuery.toLowerCase()))
    : topStores;

  const displayedStoresAllTime = isSearchAllTimeOpen && searchAllTimeQuery
    ? allStoresOfAllTime.filter(s => s.name.toLowerCase().includes(searchAllTimeQuery.toLowerCase()))
    : topStoresOfAllTime;

  // Product Analytics: Top bought Products (Product, Month, Amount) scanning items (excluding common bills)
  const productMap: { [key: string]: { name: string; month: string; amount: number } } = {};
  const nonBillExpensesAll = expenses.filter(e => {
    if (isCategoryBill(e.category)) {
      return false;
    }
    const cat = categories.find(c => c.id === e.category_id);
    if (isCategoryBill(cat)) {
      return false;
    }
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
          <p className="text-xs text-muted-foreground">Student dashboard overview</p>
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

      {/* Pending Actions Overview Grid */}
      {(getUnpaidPastBills().length > 0 || activeTakenLoans.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* Unpaid Bills Box */}
          {getUnpaidPastBills().length > 0 && (
            <div
              onClick={() => setExpandedSection(expandedSection === 'bills' ? null : 'bills')}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between shadow-xs select-none active:scale-[0.99] bg-card/60 backdrop-blur-xs",
                expandedSection === 'bills' 
                  ? "bg-destructive/10 border-destructive/40 ring-2 ring-destructive/20" 
                  : "hover:bg-muted/40 border-border/80"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shadow-inner">
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Unpaid Past Bills
                  </span>
                  <span className="text-sm font-extrabold text-destructive mt-0.5 block">
                    {getUnpaidPastBills().length} {t('expenses.pending')}
                  </span>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground/60 transition-transform duration-200", expandedSection === 'bills' ? 'rotate-180 text-destructive' : '')} />
            </div>
          )}

          {/* Unsettled Loans Box */}
          {activeTakenLoans.length > 0 && (
            <div
              onClick={() => setExpandedSection(expandedSection === 'loans' ? null : 'loans')}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between shadow-xs select-none active:scale-[0.99] bg-card/60 backdrop-blur-xs",
                expandedSection === 'loans' 
                  ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20" 
                  : "hover:bg-muted/40 border-border/80"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Outstanding Loans
                  </span>
                  <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
                    {activeTakenLoans.length} Unsettled
                  </span>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground/60 transition-transform duration-200", expandedSection === 'loans' ? 'rotate-180 text-amber-500' : '')} />
            </div>
          )}
        </div>
      )}

      {/* Expanded Bills Details Panel */}
      {expandedSection === 'bills' && getUnpaidPastBills().length > 0 && (
        <Card className="bg-destructive/5 border-destructive/20 border shadow-xs mt-4 animate-in fade-in slide-in-from-top-3 duration-250">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              {t('expenses.unpaidBillsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[10px] text-muted-foreground font-semibold leading-normal">
              {t('expenses.unpaidBillsSubtitle')} Click "Pay Now" to quickly record them using your default account.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {getUnpaidPastBills().map((bill) => (
                <div key={`${bill.cat}-${bill.month}`} className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-extrabold text-foreground truncate">{bill.name}</span>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                      {formatMonthKey(bill.month)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-black text-foreground">
                      €{bill.amount.toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handlePayMissedBillDirect(bill)}
                      className="h-6 text-[9px] font-extrabold px-2.5 bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-xs rounded-xl border border-destructive/30 shrink-0"
                    >
                      {t('expenses.payNow')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expanded Loans Details Panel */}
      {expandedSection === 'loans' && activeTakenLoans.length > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/20 border shadow-xs mt-4 animate-in fade-in slide-in-from-top-3 duration-250">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
              Outstanding Borrowed Loans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[10px] text-muted-foreground font-semibold leading-normal">
              You have outstanding borrowed loans that need to be paid back. Click "Repay Loan" to manage them.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {activeTakenLoans.map((loan) => {
                const percentPaid = Math.min(((loan.amount - loan.remaining_amount) / loan.amount) * 100, 100);
                return (
                  <div key={loan.id} className="flex flex-col p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs justify-between gap-2.5">
                    <div className="flex justify-between items-start min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-extrabold text-foreground truncate">{loan.person}</span>
                        <span className="text-[9px] text-muted-foreground font-bold mt-0.5">
                          Borrowed: €{loan.amount.toFixed(2)}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-black text-rose-500 shrink-0">
                        Owed: €{loan.remaining_amount.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-muted-foreground">
                        <span>Repaid Progress</span>
                        <span>{percentPaid.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 transition-all duration-300" 
                          style={{ width: `${percentPaid}%` }} 
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigate('/deposits-loans')}
                      className="h-6 text-[9px] font-extrabold w-full bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs rounded-xl border border-amber-600/30 mt-1 shrink-0"
                    >
                      Repay Loan
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="flex flex-col bg-card/40 hover:bg-card/60 transition-colors p-4 rounded-2xl border border-border/50 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Groceries Trajectory</span>
              <div className={cn(
                "h-7 w-7 rounded-lg shrink-0 flex items-center justify-center text-white",
                groceriesDiffPercent > 0 ? "bg-rose-500" : groceriesLastMonthSum > 0 && groceriesDiffPercent < 0 ? "bg-emerald-500" : "bg-slate-500"
              )}>
                {groceriesDiffPercent > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : groceriesLastMonthSum > 0 && groceriesDiffPercent < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
              </div>
            </div>
            
            <div className="mt-3 flex items-baseline gap-2">
              <span className={cn(
                "text-3xl font-extrabold tracking-tight",
                groceriesDiffPercent > 0 ? "text-rose-600 dark:text-rose-400" : groceriesLastMonthSum > 0 && groceriesDiffPercent < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}>
                {groceriesLastMonthSum > 0 
                  ? `${groceriesDiffPercent > 0 ? '+' : ''}${groceriesDiffPercent.toFixed(0)}%`
                  : `€${groceriesThisMonthSum.toFixed(2)}`
                }
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">this month</span>
            </div>

            <p className="text-[10px] font-medium text-muted-foreground mt-1.5 leading-normal">
              {groceriesLastMonthSum > 0 
                ? `You spent ${Math.abs(groceriesDiffPercent).toFixed(0)}% ${groceriesDiffPercent > 0 ? 'more' : 'less'} compared to last month (€${groceriesLastMonthSum.toFixed(0)}).`
                : 'No previous month grocery records available for trend analysis.'
              }
            </p>
          </div>

          {/* Daily average insight */}
          <div className="flex flex-col bg-card/40 hover:bg-card/60 transition-colors p-4 rounded-2xl border border-border/50 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Daily Avg Spending</span>
              <div className="h-7 w-7 rounded-lg shrink-0 flex items-center justify-center text-white bg-primary">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                €{dailyAverage.toFixed(2)}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">/ day</span>
            </div>

            <p className="text-[10px] font-medium text-muted-foreground mt-1.5 leading-normal">
              To stay within your budget limit, keep your daily average spending under <strong className="text-foreground font-semibold">€{targetDailyLimit.toFixed(2)}</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Store & Product Analytics widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Top Stores (All Time) */}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setIsSearchAllTimeOpen(false);
                      setSearchAllTimeQuery('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Store className="h-4.5 w-4.5 text-indigo-500" />
                    <span>
                      Top Stores (All Time)
                      <span className="text-[10px] text-muted-foreground font-normal ml-1">({allStoresOfAllTime.length})</span>
                    </span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => setIsSearchAllTimeOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
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
                        <p className="text-foreground/90 font-bold truncate">{store.name}</p>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Stores */}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setIsSearchThisMonthOpen(false);
                      setSearchThisMonthQuery('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Store className="h-4.5 w-4.5 text-indigo-500" />
                    <span>
                      Top Stores (This Month)
                      <span className="text-[10px] text-muted-foreground font-normal ml-1">({allStoresThisMonth.length})</span>
                    </span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => setIsSearchThisMonthOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
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
                        <p className="text-foreground/90 font-bold truncate">{store.name}</p>
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

      {/* Floating Quick Log Actions Menu */}
      <div className="fixed bottom-6 right-6 z-50 hidden md:flex flex-col items-end gap-3.5">
        {/* Success / Error notification toast banner */}
        {quickLogMsg && (
          <div className="mr-2 py-2.5 px-4 bg-slate-900/90 dark:bg-card/95 text-white dark:text-foreground text-xs font-bold rounded-2xl shadow-xl backdrop-blur-md border border-white/10 dark:border-border/80 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-ping"></span>
            {quickLogMsg}
          </div>
        )}

        {/* Action Menu Items (slide out when open) */}
        {isFabOpen && (
          <div className="flex flex-col gap-2.5 items-end animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
            {/* Restaurant shortcut */}
            <button
              onClick={() => handleQuickLog('restaurant')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-card border border-border/80 text-foreground text-xs font-bold shadow-lg hover:bg-slate-50 dark:hover:bg-accent/40 active:scale-[0.97] transition-all group shrink-0"
            >
              <span className="text-sm">🍽️</span>
              Restaurant <span className="text-muted-foreground/80 font-medium">(€25.00)</span>
            </button>

            {/* Cosmetics shortcut */}
            <button
              onClick={() => handleQuickLog('cosmetics')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-card border border-border/80 text-foreground text-xs font-bold shadow-lg hover:bg-slate-50 dark:hover:bg-accent/40 active:scale-[0.97] transition-all group shrink-0"
            >
              <span className="text-sm">🧴</span>
              Cosmetics <span className="text-muted-foreground/80 font-medium">(€8.50)</span>
            </button>

            {/* Groceries shortcut */}
            <button
              onClick={() => handleQuickLog('groceries')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-card border border-border/80 text-foreground text-xs font-bold shadow-lg hover:bg-slate-50 dark:hover:bg-accent/40 active:scale-[0.97] transition-all group shrink-0"
            >
              <span className="text-sm">🛒</span>
              Groceries <span className="text-muted-foreground/80 font-medium">(€15.00)</span>
            </button>
          </div>
        )}

        {/* Main Circular Floating button */}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={cn(
            "h-12 w-12 rounded-full text-white bg-primary hover:bg-primary/95 flex items-center justify-center shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.95] transition-all transform duration-300 relative z-50 focus:outline-none",
            isFabOpen ? "rotate-45 bg-slate-800 hover:bg-slate-900" : ""
          )}
          title="Quick Log Purchases"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* CONFIRMATION DIALOG */}
      <Dialog
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title || ''}
        footer={
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => setConfirmState(null)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant={confirmState?.confirmVariant || 'primary'} 
              onClick={() => {
                const amtVal = parseFloat(modalAmount);
                confirmState?.onConfirm(
                  modalDate, 
                  modalAccountId, 
                  isNaN(amtVal) ? undefined : amtVal
                );
                setConfirmState(null);
              }}
            >
              {confirmState?.confirmText || 'Confirm'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">
            {confirmState?.description}
          </p>
          {confirmState?.showAmountInput && (
            <div className="pt-2">
              <Input
                type="number"
                step="0.01"
                label="Amount (€)"
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                required
              />
            </div>
          )}
          {confirmState?.showDatePicker && (
            <div className="pt-2">
              <Input
                type="date"
                label={t('expenses.date')}
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                required
              />
            </div>
          )}
          {confirmState?.showAccountPicker && (
            <div className="pt-2">
              <Select
                label={t('expenses.paymentAccount')}
                value={modalAccountId}
                onChange={(e) => setModalAccountId(e.target.value)}
                options={accounts.map(a => ({ value: a.id, label: a.name }))}
                required
              />
            </div>
          )}
        </div>
      </Dialog>

      {/* ONBOARDING SETUP WIZARD DIALOG */}
      <Dialog
        isOpen={showOnboarding}
        onClose={() => {}} 
        title="Setup Your Student Budget Buddy"
        footer={
          <div className="flex gap-2.5 justify-end w-full">
            {onboardingStep > 1 && (
              <Button variant="outline" onClick={() => setOnboardingStep(onboardingStep - 1)} className="rounded-xl h-9.5 text-xs font-bold px-4">
                Back
              </Button>
            )}
            {onboardingStep === 1 ? (
              <Button onClick={() => setOnboardingStep(2)} className="rounded-xl h-9.5 text-xs font-bold px-4">
                Next: Custom Expenses
              </Button>
            ) : (
              <Button onClick={handleFinishOnboarding} loading={loading} className="rounded-xl h-9.5 text-xs font-bold px-4">
                Finish Setup
              </Button>
            )}
          </div>
        }
      >
        {/* Visual Progress Steps */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/30 mb-4.5">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-extrabold h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300", onboardingStep === 1 ? "bg-primary text-white shadow-sm shadow-primary/20" : "bg-muted text-muted-foreground")}>1</span>
            <span className={cn("text-xs font-bold transition-all duration-300", onboardingStep === 1 ? "text-foreground" : "text-muted-foreground")}>Recurring Bills</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-muted relative rounded-full overflow-hidden">
            <div className={cn("absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out", onboardingStep === 2 ? "w-full" : "w-1/2")} />
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-extrabold h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300", onboardingStep === 2 ? "bg-primary text-white shadow-sm shadow-primary/20" : "bg-muted text-muted-foreground")}>2</span>
            <span className={cn("text-xs font-bold transition-all duration-300", onboardingStep === 2 ? "text-foreground" : "text-muted-foreground")}>Custom Expenses</span>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {onboardingStep === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-extrabold text-sm tracking-wide">
                <Calendar className="h-5 w-5 text-primary" />
                Step 1: Monthly Recurring Bills
              </div>
              <p className="text-xs text-muted-foreground font-semibold leading-normal">
                Select which recurring bills apply to your budget and set their expected monthly amounts:
              </p>
              
              <div className="space-y-3 pt-1">
                {Object.keys(selectedBills).map(billName => {
                  const isChecked = selectedBills[billName];
                  const label = billName === 'House rent' ? 'House Rent' : 
                                billName === 'Health Insurance' ? 'Health Insurance' : 
                                billName === 'Radio Bill' ? 'Radio Bill (GEZ)' : 
                                billName === 'Mobile bill' ? 'Mobile Bill' : 'Education / Semester Fee';
                  
                  return (
                    <div 
                      key={billName} 
                      className={cn(
                        "p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer",
                        isChecked 
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/5" 
                          : "border-border/50 bg-muted/15 hover:border-border hover:bg-muted/30"
                      )}
                      onClick={() => setSelectedBills({
                        ...selectedBills,
                        [billName]: !isChecked
                      })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-5 w-5 rounded-md border flex items-center justify-center transition-all duration-200",
                          isChecked 
                            ? "bg-primary border-primary text-white" 
                            : "border-border bg-card"
                        )}>
                          {isChecked && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {label}
                        </span>
                      </div>
                      {isChecked && (
                        <div className="w-28 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            step="0.01"
                            value={billAmounts[billName]}
                            onChange={(e) => setBillAmounts({
                              ...billAmounts,
                              [billName]: e.target.value
                            })}
                            className="h-9 font-mono text-right text-xs rounded-xl focus:ring-primary/20"
                            placeholder="0.00"
                            icon={<span className="text-xs text-muted-foreground">€</span>}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-extrabold text-sm tracking-wide">
                <Plus className="h-5 w-5 text-primary" />
                Step 2: Add Custom Monthly Bills
              </div>
              <p className="text-xs text-muted-foreground font-semibold leading-normal">
                If you have other fixed monthly expenses (e.g. Spotify, Gym, Netflix), you can add them below:
              </p>

              {customOnboardingBills.length > 0 && (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-0.5 pt-1">
                  {customOnboardingBills.map((bill, index) => (
                    <div key={index} className="flex justify-between items-center p-3 rounded-xl border border-border/40 bg-primary/5 text-xs font-bold transition-all hover:bg-primary/10">
                      <span className="flex items-center gap-2 text-foreground">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        {bill.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-primary font-bold">€{parseFloat(bill.amount).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomOnboardingBill(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10 cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-2xl border border-border/50 bg-muted/10 space-y-3.5 pt-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Add Custom Bill</span>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="text"
                    label="Bill Name"
                    placeholder="e.g. Spotify"
                    value={newCustomBillName}
                    onChange={(e) => setNewCustomBillName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    label="Monthly Cost"
                    placeholder="e.g. 10.99"
                    value={newCustomBillAmount}
                    onChange={(e) => setNewCustomBillAmount(e.target.value)}
                    className="h-9 text-xs font-mono rounded-xl"
                    icon={<span className="text-xs text-muted-foreground">€</span>}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomOnboardingBill}
                  className="w-full text-xs font-bold h-9 cursor-pointer rounded-xl bg-card hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Item
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
