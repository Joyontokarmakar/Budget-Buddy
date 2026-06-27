import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { ExpenseWithDetails, Category } from '../../types';
import { Button, Card, CardHeader, CardTitle, CardContent, Spinner } from '../../components/ui';
import { cn } from '../../utils/cn';
import { getCategoryColor } from '../../utils/color';
import { getSafeItems } from '../../utils/items';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Table, Calendar, Calculator, Info, Download, FileText, Store, ShoppingBag } from 'lucide-react';

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

  const loadData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [expData, catData] = await Promise.all([
        db.getExpenses(profile.id),
        db.getCategories(profile.id),
      ]);
      setExpenses(expData);
      setCategories(catData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);



  const formatMonthKey = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  // Filter expenses for current month
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Distinguish Fixed Bills vs Daily Shopping
  const fixedBillCategories = ['House rent', 'Health Insurance', 'Radio Bill', 'Mobile bill'];

  const fixedBills = useMemo(() => {
    return currentMonthExpenses.filter(e => {
      const catName = e.category?.name || '';
      return fixedBillCategories.includes(catName);
    });
  }, [currentMonthExpenses]);

  const shoppingExpenses = useMemo(() => {
    return currentMonthExpenses.filter(e => {
      const catName = e.category?.name || '';
      return !fixedBillCategories.includes(catName);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [currentMonthExpenses]);

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
      const formattedDate = new Date(dateStr).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'numeric',
        year: '2-digit'
      });

      // Count total items on this date for rowSpan
      let totalDateItems = 0;
      dayExpenses.forEach(exp => {
        const safeItems = getSafeItems(exp.items);
        totalDateItems += safeItems.length > 0 ? safeItems.length : 1;
      });

      let dateItemCounter = 0;

      dayExpenses.forEach(exp => {
        const storeName = exp.store?.name || t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other');
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
      } else if (e.category?.name === 'Food') {
        sum += Number(e.amount);
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
      } else if (e.category?.name === 'Kitchen ware') {
        sum += Number(e.amount);
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
      } else if (e.category?.name === 'Restaurant') {
        sum += Number(e.amount);
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
      } else if (e.category?.name === 'Shopping') {
        sum += Number(e.amount);
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
        return cat ? !['Food', 'Kitchen ware', 'Restaurant', 'Shopping', ...fixedBillCategories].includes(cat.name) : true;
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

  // Fixed bills summaries
  const rentBill = useMemo(() => fixedBills.find(b => b.category?.name === 'House rent'), [fixedBills]);
  const insuranceBill = useMemo(() => fixedBills.find(b => b.category?.name === 'Health Insurance'), [fixedBills]);
  const radioBill = useMemo(() => fixedBills.find(b => b.category?.name === 'Radio Bill'), [fixedBills]);
  const mobileBill = useMemo(() => fixedBills.find(b => b.category?.name === 'Mobile bill'), [fixedBills]);

  const rentAmount = rentBill?.amount || 0;
  const insuranceAmount = insuranceBill?.amount || 0;
  const radioAmount = radioBill?.amount || 0;
  const mobileAmount = mobileBill?.amount || 0;

  const totalCommonBill = useMemo(() => {
    return rentAmount + insuranceAmount + radioAmount + mobileAmount;
  }, [rentAmount, insuranceAmount, radioAmount, mobileAmount]);

  const totalExpenses = useMemo(() => {
    return shoppingSubTotal + totalCommonBill;
  }, [shoppingSubTotal, totalCommonBill]);

  const monthlyBudget = profile?.monthly_budget || 0;
  const remainingBudgetRest = monthlyBudget - totalExpenses;

  // Store Analytics for selected month (excluding common bills)
  const topStores = useMemo(() => {
    const storeSpendingMap: { [key: string]: number } = {};
    shoppingExpenses.forEach(e => {
      const storeName = e.store?.name || 'Other/Unknown';
      storeSpendingMap[storeName] = (storeSpendingMap[storeName] || 0) + e.amount;
    });

    return Object.entries(storeSpendingMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [shoppingExpenses]);

  // Product Analytics for selected month (excluding common bills)
  const topProducts = useMemo(() => {
    const productMap: { [key: string]: { name: string; amount: number } } = {};
    shoppingExpenses.forEach(e => {
      if (e.items && e.items.length > 0) {
        e.items.forEach(item => {
          const name = item.name.trim();
          if (!name || name.toLowerCase() === 'discount') return;
          if (productMap[name.toLowerCase()]) {
            productMap[name.toLowerCase()].amount += item.amount;
          } else {
            productMap[name.toLowerCase()] = { name, amount: item.amount };
          }
        });
      }
    });

    return Object.values(productMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [shoppingExpenses]);

  // Monthly stats for Bill Analyzer (filtering category payments month-over-month)
  const billHistory = useMemo(() => {
    if (!selectedBillCategory) return [];

    if (selectedBillCategory === 'Total Expense') {
      const monthlySums: { [monthKey: string]: { timestamp: number; monthLabel: string; date: string; amount: number; notes: string | null } } = {};
      
      expenses.forEach(e => {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlySums[monthKey]) {
            monthlySums[monthKey] = {
              timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
              monthLabel: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
              date: 'Full Month',
              amount: 0,
              notes: 'Combined monthly total'
            };
          }
          monthlySums[monthKey].amount += e.amount;
        }
      });
      
      return Object.values(monthlySums).sort((a, b) => b.timestamp - a.timestamp);
    }

    const history: { timestamp: number; monthLabel: string; date: string; amount: number; notes: string | null }[] = [];
    expenses.forEach(e => {
      if (e.category?.name === selectedBillCategory) {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          history.push({
            timestamp: d.getTime(),
            monthLabel: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
            date: d.toLocaleDateString('de-DE'),
            amount: e.amount,
            notes: e.notes
          });
        }
      }
    });

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }, [expenses, selectedBillCategory]);

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
    link.setAttribute("download", `budget_buddy_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading && expenses.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6 printable-report-area">
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* Total Expense Button First */}
            <button
              type="button"
              onClick={() => setSelectedBillCategory(selectedBillCategory === 'Total Expense' ? null : 'Total Expense')}
              className={cn(
                "p-3 rounded-xl border text-[10px] sm:text-xs font-bold text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-20",
                selectedBillCategory === 'Total Expense'
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10"
                  : "bg-card hover:bg-muted border-border/80 text-foreground"
              )}
            >
              <span className="opacity-90">Total Expense</span>
              <span className={cn(
                "text-[9px] sm:text-[10px] font-black font-mono block mt-1",
                selectedBillCategory === 'Total Expense' ? "text-primary-foreground/90" : "text-muted-foreground"
              )}>
                Current: €{totalExpenses.toFixed(2)}
              </span>
            </button>

            {fixedBillCategories.map((catName) => {
              const isActive = selectedBillCategory === catName;
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedBillCategory(isActive ? null : catName)}
                  className={cn(
                    "p-3 rounded-xl border text-[10px] sm:text-xs font-bold text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-20",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10"
                      : "bg-card hover:bg-muted border-border/80 text-foreground"
                  )}
                >
                  <span className="opacity-90">{catName}</span>
                  {/* Show current month value under the button */}
                  <span className={cn(
                    "text-[9px] sm:text-[10px] font-black font-mono block mt-1",
                    isActive ? "text-primary-foreground/90" : "text-muted-foreground"
                  )}>
                    Current: €{
                      catName === 'House rent' ? rentAmount.toFixed(2) :
                      catName === 'Health Insurance' ? insuranceAmount.toFixed(2) :
                      catName === 'Radio Bill' ? radioAmount.toFixed(2) :
                      mobileAmount.toFixed(2)
                    }
                  </span>
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
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground flex justify-between">
                      <span>House Rent</span>
                      {rentBill && <span className="text-[10px] text-muted-foreground/60">{new Date(rentBill.date).toLocaleDateString('de-DE')}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{rentAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground flex justify-between">
                      <span>Health Insurance</span>
                      {insuranceBill && <span className="text-[10px] text-muted-foreground/60">{new Date(insuranceBill.date).toLocaleDateString('de-DE')}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{insuranceAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground flex justify-between">
                      <span>Radio Bill</span>
                      {radioBill && <span className="text-[10px] text-muted-foreground/60">{new Date(radioBill.date).toLocaleDateString('de-DE')}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{radioAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10">
                    <td className="py-2.5 px-4 text-muted-foreground flex justify-between">
                      <span>Mobile bill</span>
                      {mobileBill && <span className="text-[10px] text-muted-foreground/60">{new Date(mobileBill.date).toLocaleDateString('de-DE')}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      €{mobileAmount.toFixed(2)}
                    </td>
                  </tr>
                  
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
                      <span className="text-muted-foreground">{idx + 1}. {store.name}</span>
                      <span className="font-mono text-rose-500 font-bold">
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
        </div>
      </div>
    </div>
  );
};
