import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { db } from '../services/db';
import { isCategoryBill, isCategoryActive } from '../utils/category';

export const useStatusDots = () => {
  const { profile } = useAuthStore();
  const [loans, setLoans] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatusData = async () => {
    if (!profile?.id) return;
    try {
      const [lns, exps, cats] = await Promise.all([
        db.getLoans(profile.id),
        db.getExpenses(profile.id),
        db.getCategories(profile.id),
      ]);
      setLoans(lns);
      setExpenses(exps);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load status indicator data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatusData();

    window.addEventListener('budget-buddy-data-change', loadStatusData);
    return () => {
      window.removeEventListener('budget-buddy-data-change', loadStatusData);
    };
  }, [profile?.id]);

  // Calculate active loans count
  const activeTakenLoansCount = loans.filter(l => l.status === 'active' && l.type === 'taken').length;

  // Calculate unpaid past bills count
  const getUnpaidPastBillsCount = () => {
    if (!profile) return 0;
    
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
    
    let unpaidCount = 0;
    let iterYear = startYear;
    let iterMonth = startMonth;
    
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

    while (iterYear < currentYear || (iterYear === currentYear && iterMonth < currentMonth)) {
      const monthKey = `${iterYear}-${String(iterMonth + 1).padStart(2, '0')}`;
      
      const billsToCheck = categories.filter(c => isCategoryBill(c) && isCategoryActive(c));
      
      for (const bill of billsToCheck) {
        if (!isBillLogged(bill.id, monthKey)) {
          unpaidCount++;
        }
      }
      
      iterMonth++;
      if (iterMonth > 11) {
        iterMonth = 0;
        iterYear++;
      }
    }
    
    return unpaidCount;
  };

  const unpaidBillsCount = getUnpaidPastBillsCount();

  // Calculate advanced paid bills count
  const getAdvancedPaidBillsCount = () => {
    if (!profile) return 0;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let count = 0;
    expenses.forEach(e => {
      if (!e.date) return;
      const match = e.notes?.match(/\[Bill Period:\s*(\d{4}-\d{2})\]/);
      if (match && match[1]) {
        const periodKey = match[1];
        if (periodKey > currentMonthKey) {
          const cat = categories.find(c => c.id === e.category_id);
          if (cat && isCategoryBill(cat)) {
            count++;
          }
        }
      }
    });
    return count;
  };

  const advancedPaidBillsCount = getAdvancedPaidBillsCount();

  // Calculate budget progress
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const monthlyBudget = profile?.monthly_budget || 700.00;
  const monthlySpending = thisMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const budgetUsedPercent = monthlyBudget > 0 ? (monthlySpending / monthlyBudget) * 100 : 0;

  return {
    showStatusDots: profile?.show_status_dots ?? true,
    statusDotsCount: profile?.status_dots_count ?? 40,
    activeTakenLoansCount,
    unpaidBillsCount,
    advancedPaidBillsCount,
    budgetUsedPercent,
    loading
  };
};
