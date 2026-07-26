import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { db } from '../services/db';
import { isCategoryBill, isCategoryActive, getCategoryMonthlyAmount } from '../utils/category';
import { getEmiMonthsRange } from '../utils/emi';

export const NotificationChecker: React.FC = () => {
  const { profile } = useAuthStore();
  const { addNotification, loadNotifications } = useNotificationStore();
  const location = useLocation();
  const lastCheckTime = useRef<number>(0);

  const runComebackCheck = async () => {
    if (!profile?.id) return;
    
    // Rate limit checks to once every 10 seconds to avoid spamming db/API queries during rapid route changes
    const now = Date.now();
    if (now - lastCheckTime.current < 10000) return;
    lastCheckTime.current = now;

    try {
      // 1. Fetch latest data
      const [categories, expenses, loans, emis] = await Promise.all([
        db.getCategories(profile.id),
        db.getExpenses(profile.id),
        db.getLoans(profile.id),
        db.getEmis(profile.id)
      ]);

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth(); // 0-indexed
      const currentDay = currentDate.getDate();
      const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

      // Helper to check if a bill category is logged for current month
      const isBillLogged = (catId: string) => {
        return expenses.some(e => {
          if (!e.date || e.category_id !== catId) return false;
          const d = new Date(e.date);
          const eMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const isExplicitPeriod = e.notes?.includes(`[Bill Period: ${currentMonthKey}]`);
          return eMonthKey === currentMonthKey || isExplicitPeriod;
        });
      };

      // Helper to check if an EMI is logged for current month
      const isEmiLogged = (emiId: string) => {
        return expenses.some(e => {
          if (!e.date || e.emi_id !== emiId) return false;
          const d = new Date(e.date);
          const eMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const isExplicitPeriod = e.notes?.includes(`[Bill Period: ${currentMonthKey}]`);
          return eMonthKey === currentMonthKey || isExplicitPeriod;
        });
      };

      // 2. Check Unpaid Bills
      const activeBills = categories.filter(c => isCategoryBill(c) && isCategoryActive(c));
      activeBills.forEach(bill => {
        if (!isBillLogged(bill.id)) {
          const payDay = bill.estimated_pay_day;
          if (payDay && payDay > 0) {
            // Notify if we are 2 days before the estimated pay day, or past it (unpaid)
            if (currentDay >= payDay - 2) {
              const isOverdue = currentDay > payDay;
              const title = isOverdue ? `Overdue Bill: ${bill.name}` : `Bill Due Soon: ${bill.name}`;
              const message = isOverdue
                ? `Your monthly bill for ${bill.name} was estimated for day ${payDay} and remains unpaid.`
                : `Your monthly bill for ${bill.name} is due around day ${payDay} (Estimated: €${getCategoryMonthlyAmount(bill).toFixed(2)}).`;

              addNotification(
                profile.id,
                'bill',
                title,
                message,
                `${currentMonthKey}-${payDay}`
              );
            }
          }
        }
      });

      // 3. Check Active Loans (due within 2 days)
      const activeTakenLoans = loans.filter(l => l.status === 'active' && l.type === 'taken');
      activeTakenLoans.forEach(loan => {
        if (loan.estimated_pay_date) {
          const dueDate = new Date(loan.estimated_pay_date);
          if (!isNaN(dueDate.getTime())) {
            // Calculate time difference in days
            const timeDiff = dueDate.getTime() - currentDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            // Notify if due in 2 days or less
            if (daysDiff <= 2) {
              const isOverdue = daysDiff < 0;
              const title = isOverdue ? `Overdue Loan: ${loan.person}` : `Loan Repayment Due: ${loan.person}`;
              const message = isOverdue
                ? `Repayment of €${loan.remaining_amount.toFixed(2)} to ${loan.person} was due by ${dueDate.toLocaleDateString('de-DE')}.`
                : `Repayment of €${loan.remaining_amount.toFixed(2)} to ${loan.person} is due in ${daysDiff} days (by ${dueDate.toLocaleDateString('de-DE')}).`;

              addNotification(
                profile.id,
                'loan',
                title,
                message,
                loan.estimated_pay_date
              );
            }
          }
        }
      });

      // 4. Check Active EMIs
      const activeEmis = emis.filter(emi => {
        const paidCount = expenses.filter(e => e.emi_id === emi.id).length;
        return paidCount < emi.emi_months;
      });

      activeEmis.forEach(emi => {
        const range = getEmiMonthsRange(emi.buy_date, emi.emi_months);
        // Only verify if EMI is active in the current month
        if (range.includes(currentMonthKey) && !isEmiLogged(emi.id)) {
          const buyDateObj = new Date(emi.buy_date);
          const payDay = buyDateObj.getDate(); // e.g. 15th of the month
          
          if (currentDay >= payDay - 2) {
            const isOverdue = currentDay > payDay;
            const installmentIndex = range.indexOf(currentMonthKey) + 1;
            const title = isOverdue ? `Overdue EMI: ${emi.item_name}` : `EMI Installment Due: ${emi.item_name}`;
            const message = isOverdue
              ? `Installment ${installmentIndex}/${emi.emi_months} of €${emi.installment_amount.toFixed(2)} for ${emi.item_name} was estimated for day ${payDay} and remains unpaid.`
              : `Installment ${installmentIndex}/${emi.emi_months} of €${emi.installment_amount.toFixed(2)} for ${emi.item_name} is due around day ${payDay}.`;

            addNotification(
              profile.id,
              'emi',
              title,
              message,
              `${emi.id}-${currentMonthKey}`
            );
          }
        }
      });
    } catch (err) {
      console.error('Error running comeback notification check:', err);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadNotifications(profile.id);
      runComebackCheck();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      runComebackCheck();
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && profile?.id) {
        runComebackCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('budget-buddy-data-change', runComebackCheck);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('budget-buddy-data-change', runComebackCheck);
    };
  }, [profile?.id]);

  return null;
};
