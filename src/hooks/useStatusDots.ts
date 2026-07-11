import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { db } from '../services/db';

export const useStatusDots = () => {
  const { profile } = useAuthStore();
  const [loans, setLoans] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatusData = async () => {
    if (!profile?.id) return;
    try {
      const [lns, exps] = await Promise.all([
        db.getLoans(profile.id),
        db.getExpenses(profile.id),
      ]);
      setLoans(lns);
      setExpenses(exps);
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
    if (!profile || !profile.created_at) return 0;
    
    let startD = new Date(profile.created_at);
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
    
    const isBillLogged = (catName: string, monthKey: string) => {
      return expenses.some(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        const eMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const isSameCategory = e.category?.name.toLowerCase() === catName.toLowerCase();
        const isInTargetMonth = eMonthKey === monthKey;
        const isExplicitPeriod = e.notes?.includes(`[Bill Period: ${monthKey}]`);
        
        return isSameCategory && (isInTargetMonth || isExplicitPeriod);
      });
    };

    while (iterYear < currentYear || (iterYear === currentYear && iterMonth < currentMonth)) {
      const monthKey = `${iterYear}-${String(iterMonth + 1).padStart(2, '0')}`;
      
      const billsToCheck = [
        { cat: 'House rent', disabled: profile?.disabled_categories?.includes('house_rent') },
        { cat: 'Health Insurance', disabled: profile?.disabled_categories?.includes('health_insurance') },
        { cat: 'Radio Bill', disabled: profile?.disabled_categories?.includes('radio_bill') },
        { cat: 'Mobile bill', disabled: profile?.disabled_categories?.includes('mobile_bill') },
        ...(profile?.show_semester_fee
          ? [{
              cat: 'Education',
              disabled: profile?.disabled_categories?.includes('semester_fee')
            }]
          : [])
      ].filter(bill => !bill.disabled);
      
      for (const bill of billsToCheck) {
        if (!isBillLogged(bill.cat, monthKey)) {
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
    budgetUsedPercent,
    loading
  };
};
