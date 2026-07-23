import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { ExpenseWithDetails, Category, DepositWithDetails, LoanWithDetails } from '../../types';
import { Button, Card, CardHeader, CardTitle, CardContent, Spinner } from '../../components/ui';
import { cn } from '../../utils/cn';
import { isCategoryBill, isCategoryActive } from '../../utils/category';
import { getCategoryColor } from '../../utils/color';
import { getSafeItems } from '../../utils/items';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Table, Calendar, Calculator, Info, Download, FileText, Store, ShoppingBag, Coins, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export const Reports: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deposits, setDeposits] = useState<DepositWithDetails[]>([]);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const selectedDate = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1);
  }, [selectedMonth]);

  const handleDateChange = (date: Date | null) => {
    if (!date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
  };

  // Bill Analyzer state
  const [selectedBillCategory, setSelectedBillCategory] = useState<string | null>('Total Expense');

  const loadData = useCallback(async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [expData, catData, depData, loanData] = await Promise.all([
        db.getExpenses(profile.id),
        db.getCategories(profile.id),
        db.getDeposits(profile.id),
        db.getLoans(profile.id),
      ]);
      setExpenses(expData);
      setCategories(catData);
      setDeposits(depData);
      setLoans(loanData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    window.addEventListener('budget-buddy-data-change', loadData);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('budget-buddy-data-change', loadData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);



  const formatMonthKey = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  // Filter expenses for current month
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.date) return false;
      // Extract year-month string safely without timezone offsets (e.g. "2026-06-03" -> "2026-06")
      const monthKey = e.date.substring(0, 7);
      return monthKey === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Filter deposits and loans for current month
  const currentMonthDeposits = useMemo(() => {
    return deposits.filter(d => d.date && d.date.substring(0, 7) === selectedMonth);
  }, [deposits, selectedMonth]);

  const currentMonthLoans = useMemo(() => {
    return loans.filter(l => l.date && l.date.substring(0, 7) === selectedMonth);
  }, [loans, selectedMonth]);

  // Aggregate deposits and loans details
  const depositsMonthTotal = useMemo(() => {
    return currentMonthDeposits.reduce((sum, d) => sum + d.amount, 0);
  }, [currentMonthDeposits]);

  const currentMonthDiscounts = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + (e.discount || 0), 0);
  }, [currentMonthExpenses]);

  const loansTakenMonthTotal = useMemo(() => {
    return currentMonthLoans.filter(l => l.type === 'taken').reduce((sum, l) => sum + l.amount, 0);
  }, [currentMonthLoans]);

  const loansProvidedMonthTotal = useMemo(() => {
    return currentMonthLoans.filter(l => l.type === 'provided').reduce((sum, l) => sum + l.amount, 0);
  }, [currentMonthLoans]);

  const activeLoansTakenOutstanding = useMemo(() => {
    return loans.filter(l => l.type === 'taken' && l.status === 'active').reduce((sum, l) => sum + l.remaining_amount, 0);
  }, [loans]);

  const activeLoansProvidedOutstanding = useMemo(() => {
    return loans.filter(l => l.type === 'provided' && l.status === 'active').reduce((sum, l) => sum + l.remaining_amount, 0);
  }, [loans]);



  const fixedBills = useMemo(() => {
    return currentMonthExpenses.filter(e => {
      const cat = categories.find(c => c.id === e.category_id) || e.category;
      return isCategoryBill(cat);
    });
  }, [currentMonthExpenses, categories]);

  const shoppingExpenses = useMemo(() => {
    return currentMonthExpenses.filter(e => {
      const cat = categories.find(c => c.id === e.category_id) || e.category;
      return !isCategoryBill(cat);
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [currentMonthExpenses, categories]);

  // Construct Google Sheet grid items structure
  const sheetData = useMemo(() => {
    const itemsList: {
      date: string;
      formattedDate: string;
      marketName: string;
      itemName: string;
      categoryCode: string;
      categoryColor: string;
      amount: number;
      subTotal: number;
      // Span counts for layout
      dateSpan: number;
      marketSpan: number;
      isFirstOfDate: boolean;
      isFirstOfMarket: boolean;
    }[] = [];

    // Group shopping expenses by date string
    const dateGroups: { [date: string]: ExpenseWithDetails[] } = {};
    shoppingExpenses.forEach(exp => {
      const dateStr = exp.date;
      if (!dateGroups[dateStr]) dateGroups[dateStr] = [];
      dateGroups[dateStr].push(exp);
    });

    // Sort dates ascending
    const sortedDates = Object.keys(dateGroups).sort();

    sortedDates.forEach(dateStr => {
      const dayExpenses = dateGroups[dateStr];
      const [y, m, d] = dateStr.split('-');
      const formattedDate = `${parseInt(d)}.${parseInt(m)}.${y.substring(2)}`;

      // Count total items on this date for rowSpan
      let totalDateItems = 0;
      dayExpenses.forEach(exp => {
        const safeItems = getSafeItems(exp.items);
        totalDateItems += safeItems.length > 0 ? safeItems.length : 1;
      });

      let dateItemCounter = 0;

      dayExpenses.forEach(exp => {
        const storeName = profile?.show_shop_name === false
          ? t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other')
          : (exp.store?.rendering_name || exp.store?.name || t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other'));
        const safeItems = getSafeItems(exp.items);
        const items = safeItems.length > 0 
          ? safeItems 
          : [{ name: exp.notes || 'Purchase', amount: Number(exp.amount), category_id: exp.category_id }];

        const totalMarketItems = items.length;

        items.forEach((item, itemIdx) => {
          const itemCat = item.category_id ? categories.find(c => c.id === item.category_id) : null;
          const catName = itemCat?.name || exp.category?.name || 'Other';
          
          // Category abbreviation codes for column
          let code = 'O';
          if (catName === 'Food') code = 'F';
          else if (catName === 'Kitchen ware') code = 'K';
          else if (catName === 'House rent') code = 'HR';
          else if (catName === 'Health Insurance') code = 'HI';
          else if (catName === 'Radio Bill') code = 'RB';
          else if (catName === 'Mobile bill') code = 'MB';
          else if (catName === 'Education') code = 'E';
          else if (catName === 'Shopping') code = 'S';
          else if (catName === 'Restaurant') code = 'R';
          else if (catName === 'Cosmetics') code = 'C';
          else if (catName === 'Medicine') code = 'Med';
          else if (catName === 'Book') code = 'B';
          else if (catName === 'Electronic') code = 'EL';

          itemsList.push({
            date: dateStr,
            formattedDate,
            marketName: storeName,
            itemName: item.name,
            categoryCode: code,
            categoryColor: itemCat?.color || exp.category?.color || '#6b7280',
            amount: item.amount,
            subTotal: exp.amount,
            dateSpan: totalDateItems,
            marketSpan: totalMarketItems,
            isFirstOfDate: dateItemCounter === 0,
            isFirstOfMarket: itemIdx === 0
          });

          dateItemCounter++;
        });
      });
    });

    return itemsList;
  }, [shoppingExpenses, categories, t]);

  // Calculations for bottom summaries
  const foodTotal = useMemo(() => {
    let sum = 0;
    shoppingExpenses.forEach(e => {
      const safeItems = getSafeItems(e.items);
      if (safeItems.length > 0) {
        safeItems.forEach(it => {
          const cat = it.category_id ? categories.find(c => c.id === it.category_id) : null;
          if (cat?.name === 'Food') sum += Number(it.amount);
        });
      } else {
        const cat = categories.find(c => c.id === e.category_id) || e.category;
        if (cat?.name === 'Food') sum += Number(e.amount);
      }
    });
    return sum;
  }, [shoppingExpenses, categories]);

  const kitchenTotal = useMemo(() => {
    let sum = 0;
    shoppingExpenses.forEach(e => {
      const safeItems = getSafeItems(e.items);
      if (safeItems.length > 0) {
        safeItems.forEach(it => {
          const cat = it.category_id ? categories.find(c => c.id === it.category_id) : null;
          if (cat?.name === 'Kitchen ware') sum += Number(it.amount);
        });
      } else {
        const cat = categories.find(c => c.id === e.category_id) || e.category;
        if (cat?.name === 'Kitchen ware') sum += Number(e.amount);
      }
    });
    return sum;
  }, [shoppingExpenses, categories]);

  const restaurantTotal = useMemo(() => {
    let sum = 0;
    shoppingExpenses.forEach(e => {
      const safeItems = getSafeItems(e.items);
      if (safeItems.length > 0) {
        safeItems.forEach(it => {
          const cat = it.category_id ? categories.find(c => c.id === it.category_id) : null;
          if (cat?.name === 'Restaurant') sum += Number(it.amount);
        });
      } else {
        const cat = categories.find(c => c.id === e.category_id) || e.category;
        if (cat?.name === 'Restaurant') sum += Number(e.amount);
      }
    });
    return sum;
  }, [shoppingExpenses, categories]);

  const shoppingTotalCategory = useMemo(() => {
    let sum = 0;
    shoppingExpenses.forEach(e => {
      const safeItems = getSafeItems(e.items);
      if (safeItems.length > 0) {
        safeItems.forEach(it => {
          const cat = it.category_id ? categories.find(c => c.id === it.category_id) : null;
          if (cat?.name === 'Shopping') sum += Number(it.amount);
        });
      } else {
        const cat = categories.find(c => c.id === e.category_id) || e.category;
        if (cat?.name === 'Shopping') sum += Number(e.amount);
      }
    });
    return sum;
  }, [shoppingExpenses, categories]);

  const othersTotal = useMemo(() => {
    let sum = 0;
    shoppingExpenses.forEach(e => {
      const checkOther = (catId?: string | null) => {
        if (!catId) return true;
        const cat = categories.find(c => c.id === catId);
        if (!cat) return true;
        const name = cat.name.toLowerCase();
        if (['food', 'kitchen ware', 'restaurant', 'shopping'].includes(name)) return false;
        if (cat.is_monthly_bill) return false;
        return true;
      };

      const safeItems = getSafeItems(e.items);
      if (safeItems.length > 0) {
        safeItems.forEach(it => {
          if (checkOther(it.category_id)) sum += Number(it.amount);
        });
      } else {
        if (checkOther(e.category_id)) sum += Number(e.amount);
      }
    });
    return sum;
  }, [shoppingExpenses, categories]);

  const shoppingSubTotal = useMemo(() => {
    return foodTotal + kitchenTotal + restaurantTotal + shoppingTotalCategory + othersTotal;
  }, [foodTotal, kitchenTotal, restaurantTotal, shoppingTotalCategory, othersTotal]);

  // Fixed bills summaries (Dynamic)
  const dynamicFixedBillsList = useMemo(() => {
    const activeCats = categories.filter(c => isCategoryBill(c) && isCategoryActive(c));
    return activeCats.map(cat => {
      const matchingExps = fixedBills.filter(b => b.category_id === cat.id || b.category?.name === cat.name);
      const totalAmount = matchingExps.reduce((sum, b) => sum + Number(b.amount), 0);
      const loggedDate = matchingExps.find(b => b.date)?.date || null;
      const accountName = matchingExps.find(b => b.account?.name)?.account?.name || null;
      return {
        id: cat.id,
        name: cat.name,
        amount: totalAmount,
        date: loggedDate,
        accountName,
      };
    });
  }, [categories, fixedBills]);

  const totalCommonBill = useMemo(() => {
    return dynamicFixedBillsList.reduce((sum, b) => sum + b.amount, 0);
  }, [dynamicFixedBillsList]);

  const totalExpenses = useMemo(() => {
    return shoppingSubTotal + totalCommonBill;
  }, [shoppingSubTotal, totalCommonBill]);

  const monthlyBudget = profile?.monthly_budget || 0;
  const remainingBudgetRest = monthlyBudget - totalExpenses;

  // Store Analytics for selected month (excluding common bills)
  const topStores = useMemo(() => {
    const storeSpendingMap: { [key: string]: number } = {};
    const storeDailySpendingMap: { [key: string]: { [date: string]: number } } = {};

    shoppingExpenses.forEach(e => {
      const storeName = e.store?.rendering_name || e.store?.name || 'Other/Unknown';
      storeSpendingMap[storeName] = (storeSpendingMap[storeName] || 0) + e.amount;

      if (e.date) {
        if (!storeDailySpendingMap[storeName]) {
          storeDailySpendingMap[storeName] = {};
        }
        storeDailySpendingMap[storeName][e.date] = (storeDailySpendingMap[storeName][e.date] || 0) + e.amount;
      }
    });

    return Object.entries(storeSpendingMap)
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
      .slice(0, 5);
  }, [shoppingExpenses, i18n.language]);

  // Product Analytics for selected month (excluding common bills)
  const topProducts = useMemo(() => {
    const productMap: { [key: string]: { name: string; amount: number } } = {};
    shoppingExpenses.forEach(e => {
      const safeItems = getSafeItems(e.items);
      if (safeItems.length > 0) {
        safeItems.forEach(item => {
          const name = item.name.trim();
          if (!name || name.toLowerCase() === 'discount') return;
          if (productMap[name.toLowerCase()]) {
            productMap[name.toLowerCase()].amount += item.amount;
          } else {
            productMap[name.toLowerCase()] = { name, amount: item.amount };
          }
        });
      } else {
        // Fallback for single item purchases (using notes, category or fallback)
        const cat = categories.find(c => c.id === e.category_id) || e.category;
        const name = (e.notes || cat?.name || 'Purchase').trim();
        if (name && name.toLowerCase() !== 'discount') {
          if (productMap[name.toLowerCase()]) {
            productMap[name.toLowerCase()].amount += e.amount;
          } else {
            productMap[name.toLowerCase()] = { name, amount: e.amount };
          }
        }
      }
    });

    return Object.values(productMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [shoppingExpenses, categories]);

  const billHistory = useMemo(() => {
    if (!selectedBillCategory) return [];

    const normCategory = selectedBillCategory.toLowerCase().trim();

    if (normCategory === 'total expense') {
      const monthlySums: { [monthKey: string]: { timestamp: number; monthLabel: string; date: string; amount: number; notes: string | null } } = {};
      
      expenses.forEach(e => {
        if (!e.date) return;
        const [yearStr, monthStr] = e.date.split('-');
        const monthKey = `${yearStr}-${monthStr}`;
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        
        if (!monthlySums[monthKey]) {
          const localDate = new Date(year, month - 1, 1);
          monthlySums[monthKey] = {
            timestamp: localDate.getTime(),
            monthLabel: localDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
            date: 'Full Month',
            amount: 0,
            notes: 'Combined monthly total'
          };
        }
        monthlySums[monthKey].amount += e.amount;
      });
      
      return Object.values(monthlySums).sort((a, b) => b.timestamp - a.timestamp);
    }

    if (normCategory === 'total discounts') {
      const monthlySums: { [monthKey: string]: { timestamp: number; monthLabel: string; date: string; amount: number; notes: string | null } } = {};
      
      expenses.forEach(e => {
        if (!e.date || !e.discount || Number(e.discount) <= 0) return;
        const [yearStr, monthStr] = e.date.split('-');
        const monthKey = `${yearStr}-${monthStr}`;
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        
        if (!monthlySums[monthKey]) {
          const localDate = new Date(year, month - 1, 1);
          monthlySums[monthKey] = {
            timestamp: localDate.getTime(),
            monthLabel: localDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
            date: 'Full Month',
            amount: 0,
            notes: 'Combined discounts'
          };
        }
        monthlySums[monthKey].amount += Number(e.discount);
      });
      
      return Object.values(monthlySums).sort((a, b) => b.timestamp - a.timestamp);
    }

    const history: { timestamp: number; monthLabel: string; date: string; amount: number; notes: string | null }[] = [];
    expenses.forEach(e => {
      const cat = categories.find(c => c.id === e.category_id) || e.category;
      if (cat && cat.name.toLowerCase().trim() === normCategory) {
        if (!e.date) return;
        const [yearStr, monthStr, dayStr] = e.date.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const day = parseInt(dayStr);
        const localDate = new Date(year, month - 1, day);
        
        history.push({
          timestamp: localDate.getTime(),
          monthLabel: localDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
          date: localDate.toLocaleDateString('de-DE'),
          amount: e.amount,
          notes: e.notes
        });
      }
    });

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }, [expenses, selectedBillCategory, categories]);

  const handleExportExcel = () => {
    // Generate CSV data for Detailed Shopping Sheet
    const headers = ['Date', 'Market', 'Items', 'Type', 'Amount', 'Sub Total'];
    const rows = sheetData.map(row => [
      row.formattedDate,
      row.marketName,
      row.itemName,
      row.categoryCode,
      row.amount.toFixed(2),
      row.subTotal.toFixed(2)
    ]);
    
    // Combine headers and rows, wrap each value in quotes to escape commas
    const csvRows = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ];
    
    // Add UTF-8 BOM so Excel opens it with correct characters
    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `budgetbuddy_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const monthLabel = formatMonthKey(selectedMonth);
    const userName = profile?.name || profile?.email || 'Student';
    
    // Generate shopping categories list
    const categoryRowsHtml = `
      <tr><td>Food (Lebensmittel)</td><td class="amount">€${foodTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      <tr><td>Crockery / Kitchen ware</td><td class="amount">€${kitchenTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      <tr><td>Restaurant</td><td class="amount">€${restaurantTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      <tr><td>Shopping</td><td class="amount">€${shoppingTotalCategory.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      <tr><td>Others</td><td class="amount">€${othersTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      <tr class="total-row"><td>Shopping Sub Total</td><td class="amount">€${shoppingSubTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
    `;

    // Generate common bills rows (Dynamic)
    let commonBillsRowsHtml = '';
    dynamicFixedBillsList.forEach(b => {
      commonBillsRowsHtml += `<tr><td>${b.name}</td><td class="amount">€${b.amount.toFixed(2)}</td></tr>\n`;
    });
    commonBillsRowsHtml += `<tr class="total-row"><td>Total Common Bill</td><td class="amount">€${totalCommonBill.toFixed(2)}</td></tr>`;

    // Detailed Shopping list rows
    let shoppingListRowsHtml = '';
    sheetData.forEach((row) => {
      shoppingListRowsHtml += `
        <tr>
          <td>${row.formattedDate}</td>
          <td>${row.marketName}</td>
          <td>${row.itemName}</td>
          <td style="text-align: center;">${row.categoryCode}</td>
          <td class="amount">€${row.amount.toFixed(2)}</td>
        </tr>
      `;
    });

    if (sheetData.length === 0) {
      shoppingListRowsHtml = '<tr><td colspan="5" style="text-align: center; color: #888;">No transactions logged for this month.</td></tr>';
    }

    // Top Stores
    let topStoresHtml = '';
    topStores.slice(0, 5).forEach((store, idx) => {
      const smallDateInfo = store.maxDate 
        ? `<div style="font-size: 8px; color: #64748b; font-weight: 500; margin-left: 12px; margin-top: 2px;">Most on ${store.maxDate} (€${store.maxDateAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</div>` 
        : '';
      topStoresHtml += `
        <tr>
          <td style="vertical-align: middle;">
            ${idx + 1}. ${store.name}
            ${smallDateInfo}
          </td>
          <td class="amount" style="vertical-align: middle;">€${store.amount.toFixed(2)}</td>
        </tr>
      `;
    });
    if (topStores.length === 0) {
      topStoresHtml = '<tr><td colspan="2" style="text-align: center; color: #888;">No store logs.</td></tr>';
    }

    // Top Products
    let topProductsHtml = '';
    topProducts.slice(0, 5).forEach((prod, idx) => {
      topProductsHtml += `
        <tr>
          <td>${idx + 1}. ${prod.name}</td>
          <td class="amount">€${prod.amount.toFixed(2)}</td>
        </tr>
      `;
    });
    if (topProducts.length === 0) {
      topProductsHtml = '<tr><td colspan="2" style="text-align: center; color: #888;">No item logs.</td></tr>';
    }

    const totalShopping = foodTotal + kitchenTotal + restaurantTotal + shoppingTotalCategory + othersTotal;
    let conicGradientStyle = '#cbd5e1 0% 100%';
    let dynamicChartHtml = '';

    if (totalShopping > 0) {
      let currentAccumulator = 0;
      const segments: string[] = [];
      
      const addSegment = (amount: number, color: string) => {
        if (amount <= 0) return;
        const pct = (amount / totalShopping) * 100;
        const start = currentAccumulator;
        const end = currentAccumulator + pct;
        segments.push(`${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`);
        currentAccumulator = end;
      };
      
      addSegment(foodTotal, '#10b981'); // Emerald
      addSegment(kitchenTotal, '#3b82f6'); // Blue
      addSegment(restaurantTotal, '#f59e0b'); // Amber
      addSegment(shoppingTotalCategory, '#ec4899'); // Pink
      addSegment(othersTotal, '#64748b'); // Slate
      
      if (segments.length > 0) {
        conicGradientStyle = segments.join(', ');
      }

      dynamicChartHtml = `
        <div class="chart-container">
          <div class="chart-donut" style="background: conic-gradient(${conicGradientStyle});">
            <div class="chart-center">
              <span>Expenses</span>
            </div>
          </div>
          <div class="chart-legend">
            <div class="chart-legend-title">Shopping Category Share</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${foodTotal > 0 ? `<div class="legend-item"><div class="dot" style="background-color: #10b981;"></div><span><strong>Food:</strong> ${(foodTotal/totalShopping*100).toFixed(0)}% (€${foodTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></div>` : ''}
              ${kitchenTotal > 0 ? `<div class="legend-item"><div class="dot" style="background-color: #3b82f6;"></div><span><strong>Kitchen:</strong> ${(kitchenTotal/totalShopping*100).toFixed(0)}% (€${kitchenTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></div>` : ''}
              ${restaurantTotal > 0 ? `<div class="legend-item"><div class="dot" style="background-color: #f59e0b;"></div><span><strong>Restaurant:</strong> ${(restaurantTotal/totalShopping*100).toFixed(0)}% (€${restaurantTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></div>` : ''}
              ${shoppingTotalCategory > 0 ? `<div class="legend-item"><div class="dot" style="background-color: #ec4899;"></div><span><strong>Shopping:</strong> ${(shoppingTotalCategory/totalShopping*100).toFixed(0)}% (€${shoppingTotalCategory.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></div>` : ''}
              ${othersTotal > 0 ? `<div class="legend-item"><div class="dot" style="background-color: #64748b;"></div><span><strong>Others:</strong> ${(othersTotal/totalShopping*100).toFixed(0)}% (€${othersTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></div>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Financial Report - ${monthLabel}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
            margin: 40px;
            background: #fff;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .header h1 {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .header .subtitle {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .branding {
            text-align: right;
          }
          .branding-logo {
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
          }
          .branding-sub {
            font-size: 10px;
            color: #64748b;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .summary-banner {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            text-align: center;
          }
          .summary-card.accent {
            background: #f0fdf4;
            border-color: #bbf7d0;
          }
          .summary-card.danger {
            background: #fef2f2;
            border-color: #fecaca;
          }
          .summary-val {
            font-size: 18px;
            font-weight: 800;
            font-family: monospace;
            color: #0f172a;
          }
          .summary-card.accent .summary-val {
            color: #16a34a;
          }
          .summary-card.danger .summary-val {
            color: #dc2626;
          }
          .summary-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 2px;
          }
          
          /* Visual Budget Progress Bar */
          .budget-progress-container {
            margin-top: 6px;
            background: #cbd5e1;
            border-radius: 4px;
            height: 6px;
            width: 100%;
            overflow: hidden;
            display: inline-block;
          }
          .budget-progress-bar {
            height: 100%;
            border-radius: 4px;
          }

          /* Visual Conic Gradient Donut Chart styling */
          .chart-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 24px;
            margin-bottom: 25px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            page-break-inside: avoid;
          }
          .chart-donut {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            position: relative;
            flex-shrink: 0;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          }
          .chart-center {
            position: absolute;
            width: 64px;
            height: 64px;
            background: #f8fafc;
            border-radius: 50%;
            top: 18px;
            left: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.06);
          }
          .chart-center span {
            font-size: 9px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .chart-legend {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 100%;
          }
          .chart-legend-title {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2px;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 9px;
            color: #334155;
          }
          .legend-item .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .section-title {
            font-size: 11px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 20px 0 10px 0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            border-bottom: 1.5px solid #cbd5e1;
            padding: 6px 8px;
            background: #f8fafc;
          }
          td {
            font-size: 10px;
            padding: 6px 8px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          .amount {
            text-align: right;
            font-family: monospace;
            font-weight: 700;
          }
          .total-row {
            font-weight: 800;
            background: #f8fafc;
          }
          .total-row td {
            border-top: 1.5px solid #cbd5e1;
            color: #0f172a;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .page-break {
            page-break-before: always;
          }
          @media print {
            body {
              margin: 15px;
            }
            .grid-2, .summary-banner, .chart-container {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Financial Report</h1>
            <div class="subtitle">Month: <strong>${monthLabel}</strong> &bull; Generated for: <strong>${userName}</strong></div>
          </div>
          <div class="branding">
            <div class="branding-logo">Budget buddy</div>
            <div class="branding-sub">PWA Tracker</div>
          </div>
        </div>

        <div class="summary-banner">
          <div class="summary-card">
            <div class="summary-val">€${monthlyBudget.toFixed(2)}</div>
            <div class="summary-label">Budget Limit</div>
          </div>
          <div class="summary-card danger">
            <div class="summary-val">€${totalExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="summary-label">Total Expenses</div>
            <div class="budget-progress-container">
              <div class="budget-progress-bar" style="background-color: ${remainingBudgetRest >= 0 ? '#10b981' : '#ef4444'}; width: ${Math.min(100, Math.max(0, (totalExpenses / monthlyBudget) * 100))}%;"></div>
            </div>
          </div>
          <div class="summary-card ${remainingBudgetRest >= 0 ? 'accent' : 'danger'}">
            <div class="summary-val">€${remainingBudgetRest.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="summary-label">Remaining Rest</div>
          </div>
        </div>

        ${dynamicChartHtml}

        <div class="grid-2">
          <div>
            <div class="section-title">Common Fixed Bills</div>
            <table>
              <tbody>
                ${commonBillsRowsHtml}
              </tbody>
            </table>
          </div>

          <div>
            <div class="section-title">Shopping Categories Sum</div>
            <table>
              <tbody>
                ${categoryRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid-2" style="margin-top: 15px;">
          <div>
            <div class="section-title">Top Stores (This Month)</div>
            <table>
              <tbody>
                ${topStoresHtml}
              </tbody>
            </table>
          </div>

          <div>
            <div class="section-title">Top Bought Products</div>
            <table>
              <tbody>
                ${topProductsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div class="page-break"></div>

        <div class="section-title" style="margin-top: 10px;">Detailed Shopping Sheet</div>
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Date</th>
              <th style="width: 120px;">Market</th>
              <th>Item Description</th>
              <th style="width: 50px; text-align: center;">Type</th>
              <th style="width: 80px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${shoppingListRowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Create an iframe to print the clean HTML
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
    }

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print failed:', err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 500);
  };

  if (loading && expenses.length === 0) {
    return <Spinner />;
  }

  return (
    <div key={selectedMonth} className="space-y-6 printable-report-area">
      <style>{`
        @media print {
          /* 1. Hide unwanted UI components */
          header, 
          nav, 
          aside, 
          footer, 
          .no-print, 
          button, 
          input, 
          select,
          .react-datepicker-popper,
          [role="navigation"],
          .fixed,
          [class*="fixed"] {
            display: none !important;
          }

          /* 2. Reset margins, paddings & widths for standard printing layout */
          html, body {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Reset desktop sidebar offset pl-64 */
          .md\\:pl-64,
          div[class*="md:pl-64"],
          div[class*="pl-64"],
          main {
            padding-left: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* 3. Style printable area container */
          .printable-report-area {
            display: block !important;
            position: static !important; /* Critical for multipage document breaking */
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
          }

          /* 4. Table page break configurations */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          thead {
            display: table-header-group !important; /* Repeats table header on next pages */
          }
          tr {
            page-break-inside: avoid !important; /* Prevents rows from breaking half-way */
            page-break-after: auto !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px 12px !important;
            font-size: 10pt !important;
            color: #0f172a !important;
            background: transparent !important;
          }

          /* Keep badges and backgrounds filled in print */
          [style*="background-color"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: white !important;
          }

          @page {
            size: portrait;
            margin: 1.5cm 1.2cm 1.5cm 1.2cm;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">{t('nav.reports')}</h1>
          <p className="text-xs text-muted-foreground">Month-by-month spreadsheet breakdowns and bill historical analysis.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-11 text-xs gap-1.5 px-3 rounded-xl border border-border"
            onClick={handleExportExcel}
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Excel (CSV)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-11 text-xs gap-1.5 px-3 rounded-xl border border-border"
            onClick={handleExportPDF}
          >
            <FileText className="h-4 w-4 text-primary" />
            <span>Print PDF</span>
          </Button>

          {/* Month Selector */}
          <div className="w-52 shrink-0 relative flex items-center">
            <Calculator className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              className="flex h-11 w-52 rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold cursor-pointer"
              popperPlacement="bottom-end"
            />
          </div>
        </div>
      </div>

      {/* TOP SECTION: Bill & Expense History Analyzer (Full Width) */}
      <Card className="shadow-lg border-border/80 bg-card/65 backdrop-blur-md">
        <CardHeader className="bg-muted/30 border-b border-border/50 py-4 px-5">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Bill & Expense History Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-xs text-muted-foreground font-semibold">
            Click on a button below to analyze all past payments, invoices, and total monthly expenses.
          </p>

          {/* Bill Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {/* Total Expense Button First */}
            <button
              type="button"
              onClick={() => setSelectedBillCategory('Total Expense')}
              className={cn(
                "p-3 rounded-xl border text-[10px] sm:text-xs font-bold text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-20",
                selectedBillCategory?.toLowerCase() === 'total expense'
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10"
                  : "bg-card hover:bg-muted border-border/80 text-foreground"
              )}
            >
              <span className="opacity-90">Total Expense</span>
              <span className={cn(
                "text-[9px] sm:text-[10px] font-black font-mono block mt-1",
                selectedBillCategory?.toLowerCase() === 'total expense' ? "text-primary-foreground/90" : "text-muted-foreground"
              )}>
                Current: €{totalExpenses.toFixed(2)}
              </span>
            </button>

            {/* Total Discounts Button Second */}
            <button
              type="button"
              onClick={() => setSelectedBillCategory('Total Discounts')}
              className={cn(
                "p-3 rounded-xl border text-[10px] sm:text-xs font-bold text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-20",
                selectedBillCategory?.toLowerCase() === 'total discounts'
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10"
                  : "bg-card hover:bg-muted border-border/80 text-foreground"
              )}
            >
              <span className="opacity-90">Total Discounts</span>
              <span className={cn(
                "text-[9px] sm:text-[10px] font-black font-mono block mt-1",
                selectedBillCategory?.toLowerCase() === 'total discounts' ? "text-primary-foreground/90" : "text-muted-foreground"
              )}>
                Current: €{currentMonthDiscounts.toFixed(2)}
              </span>
            </button>

            {dynamicFixedBillsList.map((bill) => {
              const isActive = selectedBillCategory?.toLowerCase().trim() === bill.name.toLowerCase().trim();
              return (
                <button
                  key={bill.id}
                  type="button"
                  onClick={() => setSelectedBillCategory(bill.name)}
                  className={cn(
                    "p-3 rounded-xl border text-[10px] sm:text-xs font-bold text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-20",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10"
                      : "bg-card hover:bg-muted border-border/80 text-foreground"
                  )}
                >
                  <span className="opacity-90">{bill.name}</span>
                  {/* Show current month value under the button */}
                  <div>
                    <span className={cn(
                      "text-[9px] sm:text-[10px] font-black font-mono block mt-1",
                      isActive ? "text-primary-foreground/90" : "text-muted-foreground"
                    )}>
                      Current: €{bill.amount.toFixed(2)}
                    </span>
                    {bill.amount > 0 && bill.accountName && (
                      <span className={cn(
                        "text-[8px] font-semibold opacity-75 block mt-0.5",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        By {bill.accountName}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* History Table */}
          {selectedBillCategory ? (
            <div className="space-y-3.5 pt-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  History for {selectedBillCategory}
                </span>
                <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                  {billHistory.length} logs
                </span>
              </div>

              {billHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No records found for this category.
                </div>
              ) : (
                <div className="border border-border/50 rounded-xl overflow-x-auto bg-card/40">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[9px] uppercase">
                        <th className="py-2.5 px-3">Billing Month</th>
                        <th className="py-2.5 px-3">{selectedBillCategory === 'Total Expense' ? 'Period' : 'Date Paid'}</th>
                        <th className="py-2.5 px-3 text-right w-36">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 font-semibold text-foreground/90">
                      {billHistory.map((item, index) => (
                        <tr key={index} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 text-foreground font-bold">{item.monthLabel}</td>
                          <td className="py-2.5 px-3 text-muted-foreground/80 font-medium">{item.date}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                            €{item.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              Select a category or total expense above to view past invoices/totals list.
            </div>
          )}
        </CardContent>
      </Card>

      {/* BOTTOM SECTION: Detailed sheet and stacked summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tab 1: Detailed Google Sheet (Double Width) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-border/80 overflow-hidden bg-card/65 backdrop-blur-md">
            <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between py-4 px-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Table className="h-5 w-5 text-primary" />
                Detailed Shopping Sheet - {formatMonthKey(selectedMonth)}
              </CardTitle>
              <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted/65 px-2 py-0.5 rounded-lg border border-border/30">
                <Info className="h-3 w-3 text-primary" />
                <span>Pills: Food (F), Kitchen (K), Shopping (S), Restaurant (R), Other (O)</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {sheetData.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground font-semibold">
                  No shopping transactions logged for this month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[10px] uppercase">
                        <th className="py-3 px-4 border-r border-border/40 w-24">Date</th>
                        <th className="py-3 px-4 border-r border-border/40 w-36">Market</th>
                        <th className="py-3 px-4 border-r border-border/40">Items</th>
                        <th className="py-3 px-4 border-r border-border/40 text-center w-16">Type</th>
                        <th className="py-3 px-4 border-r border-border/40 text-right w-24">Amount</th>
                        <th className="py-3 px-4 text-right w-24">Sub Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 font-semibold text-foreground/90">
                      {sheetData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          {/* Date span */}
                          {row.isFirstOfDate && (
                            <td
                              rowSpan={row.dateSpan}
                              className="py-3 px-4 border-r border-b border-border/40 align-top text-muted-foreground font-bold text-center bg-muted/10"
                            >
                              {row.formattedDate}
                            </td>
                          )}
                          
                          {/* Market Span */}
                          {row.isFirstOfMarket && (
                            <td
                              rowSpan={row.marketSpan}
                              className="py-3 px-4 border-r border-b border-border/40 align-top font-bold text-foreground bg-muted/5"
                            >
                              {row.marketName}
                            </td>
                          )}

                          {/* Item Name */}
                          <td className="py-2.5 px-4 border-r border-border/40 text-foreground/80 font-medium">
                            {row.itemName}
                          </td>

                          {/* Category Shorthand Badge */}
                          <td className="py-2.5 px-4 border-r border-border/40 text-center">
                            <span
                              className="inline-block w-5 h-5 leading-5 text-[9px] font-black rounded-full text-white text-center shadow-xs"
                              style={{ backgroundColor: getCategoryColor(row.categoryColor) }}
                              title={row.categoryCode}
                            >
                              {row.categoryCode}
                            </span>
                          </td>

                          {/* Item Amount */}
                          <td className="py-2.5 px-4 border-r border-border/40 text-right font-mono">
                            €{row.amount.toFixed(2)}
                          </td>

                          {/* Transaction Subtotal Span */}
                          {row.isFirstOfMarket && (
                            <td
                              rowSpan={row.marketSpan}
                              className="py-3 px-4 text-right border-b border-border/40 align-middle font-mono font-black text-foreground bg-muted/5"
                            >
                              €{row.subTotal.toFixed(2)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tab 2: Summaries stacked vertically */}
        <div className="lg:col-span-1 space-y-6">
          {/* Category Subtotals Card */}
          <Card className="shadow-md overflow-hidden bg-card/65 backdrop-blur-md">
            <CardHeader className="bg-muted/20 border-b border-border/50 py-3.5 px-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Shopping Categories Sum
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-xs font-semibold">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-border/30">
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground">Food (Lebensmittel)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{foodTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground">Crockery / Kitchen ware</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{kitchenTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground">Restaurant</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{restaurantTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground">Shopping</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{shoppingTotalCategory.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground">Others</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{othersTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                  </tr>
                  <tr className="bg-primary/5 font-extrabold text-sm border-t border-border">
                    <td className="py-3 px-4 text-primary">Shopping Sub Total</td>
                    <td className="py-3 px-4 text-right font-mono text-primary">
                      €{shoppingSubTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Store Analytics for Selected Month */}
          <Card className="shadow-md overflow-hidden bg-card/65 backdrop-blur-md no-print">
            <CardHeader className="bg-muted/20 border-b border-border/50 py-3 px-4 flex flex-row items-center gap-2">
              <Store className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Top Stores (This Month)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {topStores.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">No purchases this month.</p>
              ) : (
                <div className="space-y-2">
                  {topStores.map((store, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                      <div className="min-w-0">
                        <span className="text-muted-foreground">{idx + 1}. {store.name}</span>
                        {store.maxDate && (
                          <p className="text-[10px] text-muted-foreground font-medium truncate ml-3.5">
                            Most on {store.maxDate} (€{store.maxDateAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-rose-500 font-bold shrink-0 ml-2">
                        €{store.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Analytics for Selected Month */}
          <Card className="shadow-md overflow-hidden bg-card/65 backdrop-blur-md no-print">
            <CardHeader className="bg-muted/20 border-b border-border/50 py-3 px-4 flex flex-row items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Top Bought Products
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {topProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">No items logged this month.</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((prod, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-muted-foreground truncate max-w-[120px]">{idx + 1}. {prod.name}</span>
                      <span className="font-mono text-rose-500 font-bold">
                        €{prod.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deposits & Loans Overview Card */}
          <Card className="shadow-md overflow-hidden bg-card/65 backdrop-blur-md">
            <CardHeader className="bg-muted/20 border-b border-border/50 py-3 px-4 flex flex-row items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Deposits & Loans Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-xs font-semibold">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-border/30">
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground flex items-center justify-between">
                      <span>Deposits (This Month)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +€{depositsMonthTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground flex items-center justify-between">
                      <span>Total Discounts (This Month)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                      €{currentMonthDiscounts.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1"><ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" /> Loans Taken (Outstanding)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{activeLoansTakenOutstanding.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5 text-violet-500" /> Loans Provided (Outstanding)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{activeLoansProvidedOutstanding.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-muted/10 hover:bg-muted/20">
                    <td className="py-2.5 px-4 text-muted-foreground flex justify-between">
                      <span>New Loans Added (This Month)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground/80">
                      €{(loansTakenMonthTotal + loansProvidedMonthTotal).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Total Balance Sheet Card */}
          <Card className="shadow-md overflow-hidden bg-card/65 backdrop-blur-md">
            <CardHeader className="bg-muted/20 border-b border-border/50 py-3.5 px-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Common Bills & Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-xs font-semibold">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-border/30">
                  {dynamicFixedBillsList.map((bill) => (
                    <tr key={bill.id} className="hover:bg-muted/10">
                      <td className="py-2.5 px-4 text-muted-foreground flex justify-between">
                        <span>{bill.name}</span>
                        {bill.date && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {bill.date.split('-').reverse().join('.')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                        €{bill.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  
                  <tr className="bg-muted/30 font-bold">
                    <td className="py-2.5 px-4 text-foreground/80">Total Common Bill</td>
                    <td className="py-2.5 px-4 text-right font-mono text-foreground/95">
                      €{totalCommonBill.toFixed(2)}
                    </td>
                  </tr>

                  <tr className="bg-rose-600/10 dark:bg-rose-500/10 font-black border-t border-rose-500/20 text-rose-600 dark:text-rose-400">
                    <td className="py-2.5 px-4">Total Expenses</td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      €{totalExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                  </tr>

                  <tr className="bg-primary/10 border-t border-primary/20 text-primary font-black">
                    <td className="py-2.5 px-4">Monthly Budget Limit</td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      €{monthlyBudget.toFixed(2)}
                    </td>
                  </tr>

                  <tr className={cn(
                    "font-black border-t text-sm py-3 px-4",
                    remainingBudgetRest >= 0 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  )}>
                    <td className="py-3 px-4">Remaining Rest</td>
                    <td className="py-3 px-4 text-right font-mono">
                      €{remainingBudgetRest.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
