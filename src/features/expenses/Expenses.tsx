import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { ExpenseWithDetails, Account, Category, Store } from '../../types';
import { cn } from '../../utils/cn';
import { getCategoryColor } from '../../utils/color';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent, Dialog, Spinner } from '../../components/ui';
import { ArrowUpRight, Plus, Calculator, Coins, AlertCircle, FileText, Upload, Check, Search, Trash2, ChevronDown, ChevronRight, Calendar } from 'lucide-react';

export const Expenses: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('0'); // Discount state

  // Itemized breakdown state
  const [items, setItems] = useState<{ name: string; amount: number; category_id?: string | null }[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [otherPurpose, setOtherPurpose] = useState('');
  
  // Store autocomplete state
  const [storeQuery, setStoreQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Custom Category State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Receipt & OCR State
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [ocrConfirmationData, setOcrConfirmationData] = useState<{
    storeName: string;
    date: string;
    amount: number;
    fileUrl: string;
    items?: any[];
    discount?: number;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'destructive' | 'secondary';
    showDatePicker?: boolean;
    initialDate?: string;
    onConfirm: (selectedDate?: string) => void;
  } | null>(null);
  const [modalDate, setModalDate] = useState('');

  useEffect(() => {
    if (confirmState?.isOpen && confirmState.initialDate) {
      setModalDate(confirmState.initialDate);
    }
  }, [confirmState]);
  const [viewMode, setViewMode] = useState<'list' | 'journal' | 'summary'>('journal');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expandedShops, setExpandedShops] = useState<string[]>([]);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  const toggleShopExpand = (shopName: string) => {
    if (expandedShops.includes(shopName)) {
      setExpandedShops(expandedShops.filter(s => s !== shopName));
    } else {
      setExpandedShops([...expandedShops, shopName]);
    }
  };

  const loadData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [expData, accData, catData, storeData] = await Promise.all([
        db.getExpenses(profile.id),
        db.getAccounts(profile.id),
        db.getCategories(profile.id),
        db.getStores(profile.id),
      ]);
      setExpenses(expData);
      setAccounts(accData);
      setCategories(catData);
      setStores(storeData);

      // Default payment account
      if (accData.length > 0 && !paymentAccountId) {
        setPaymentAccountId(accData[0].id);
      }
      // Default item category
      if (catData.length > 0 && !itemCategoryId) {
        setItemCategoryId(catData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    if (accounts.length > 0 && !paymentAccountId) {
      setPaymentAccountId(accounts[0].id);
    }
  }, [accounts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
        setShowStoreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    setStoreQuery(store.name);
    setShowStoreDropdown(false);
  };

  const handleCreateCustomStore = async () => {
    if (!profile || !storeQuery.trim()) return;
    try {
      const store = await db.createStore(profile.id, storeQuery.trim());
      setSelectedStore(store);
      setStoreQuery(store.name);
      setShowStoreDropdown(false);
      // Reload stores list
      const storeData = await db.getStores(profile.id);
      setStores(storeData);
    } catch (e) {
      console.error('Error creating custom store', e);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newCatName.trim()) return;

    try {
      setCreatingCategory(true);
      const newCat = await db.createCategory(profile.id, newCatName.trim(), 'Tag', newCatColor);
      setItemCategoryId(newCat.id);
      setNewCatName('');
      setIsCategoryDialogOpen(false);
      
      // Reload categories list
      const catData = await db.getCategories(profile.id);
      setCategories(catData);
    } catch (e: any) {
      console.error(e);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setUploadingReceipt(true);
      setError(null);
      
      const receiptData = await db.uploadReceipt(profile.id, file);
      
      if (receiptData.extracted_store_name && receiptData.extracted_amount) {
        setOcrConfirmationData({
          storeName: receiptData.extracted_store_name,
          date: receiptData.extracted_date || new Date().toISOString().split('T')[0],
          amount: receiptData.extracted_amount,
          fileUrl: receiptData.file_url || '',
          items: receiptData.extracted_items || [],
          discount: receiptData.extracted_discount || 0,
        });
      }
    } catch (err: any) {
      setError('Failed to extract OCR receipt data: ' + err.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleConfirmOcrPrefill = async () => {
    if (!ocrConfirmationData || !profile) return;

    setAmount(ocrConfirmationData.amount.toString());
    setDate(ocrConfirmationData.date);
    
    // Find or Create the store
    const store = await db.createStore(profile.id, ocrConfirmationData.storeName);
    setSelectedStore(store);
    setStoreQuery(store.name);

    if (ocrConfirmationData.discount) {
      setDiscount(ocrConfirmationData.discount.toString());
    } else {
      setDiscount('0');
    }

    if (ocrConfirmationData.items && ocrConfirmationData.items.length > 0) {
      const mappedItems = ocrConfirmationData.items.map(it => {
        const matchName = it.categoryName.toLowerCase();
        let cat = categories.find(c => c.name.toLowerCase() === matchName);
        if (!cat) {
          if (matchName.includes('grocer') || matchName === 'food') {
            cat = categories.find(c => c.name.toLowerCase() === 'food');
          } else {
            cat = categories.find(c => c.name.toLowerCase() === 'other');
          }
        }
        return {
          name: it.name,
          amount: it.amount,
          category_id: cat ? cat.id : null,
        };
      });
      setItems(mappedItems);
    } else {
      setItems([]);
    }

    // Auto set groceries/other based on keyword
    const groceryCat = categories.find(c => c.name.toLowerCase() === 'food' || c.name.toLowerCase() === 'groceries');
    if (groceryCat && ['rewe', 'lidl', 'aldi', 'edeka', 'kaufland', 'netto', 'penny'].some(k => ocrConfirmationData.storeName.toLowerCase().includes(k))) {
      setItemCategoryId(groceryCat.id);
    }

    setOcrConfirmationData(null);
    setSuccessMsg(t('expenses.receiptPrefillSuccess'));
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Recalculate amount dynamically when items or discount changes
  useEffect(() => {
    if (items.length > 0) {
      const itemsSum = items.reduce((sum, item) => sum + item.amount, 0);
      const discVal = parseFloat(discount) || 0;
      const finalTotal = Math.max(itemsSum - discVal, 0);
      setAmount(finalTotal.toFixed(2));
    }
  }, [items, discount]);

  const isBillLogged = (catName: string) => {
    if (!date) return false;
    const dateParts = date.split('-');
    const currentMonthKey = `${dateParts[0]}-${dateParts[1]}`;
    
    return expenses.some(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      const eMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return eMonthKey === currentMonthKey && e.category?.name === catName;
    });
  };

  const handleQuickLogBill = async (billName: string, catName: string, defaultAmount: number) => {
    if (!profile || !paymentAccountId) return;
    
    const account = accounts.find(a => a.id === paymentAccountId);
    const accountName = account ? account.name : 'selected account';
    
    const matchingExpenses = expenses.filter(e => e.category?.name === catName);
    const amountToLog = matchingExpenses.length > 0 ? matchingExpenses[0].amount : defaultAmount;
    
    setConfirmState({
      isOpen: true,
      title: `Log ${billName}`,
      description: `Log ${billName} of €${amountToLog.toFixed(2)} using ${accountName}?`,
      confirmText: 'Log Bill',
      confirmVariant: 'primary',
      showDatePicker: true,
      initialDate: date,
      onConfirm: async (selectedDate) => {
        try {
          setSaving(true);
          const billCat = categories.find(c => c.name === catName);
          const categoryId = billCat ? billCat.id : null;
          
          await db.createExpense(profile.id, {
            amount: amountToLog,
            date: selectedDate || date,
            category_id: categoryId,
            store_id: null,
            payment_account_id: paymentAccountId,
            notes: `${billName} - Recurring Bill`,
            receipt_url: null,
            items: null
          });
          
          setSuccessMsg(`${billName} logged successfully!`);
          setTimeout(() => setSuccessMsg(null), 3000);
          await loadData();
        } catch (err: any) {
          setError(err.message || 'Error logging bill');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleAddItem = () => {
    const selectedCat = categories.find(c => c.id === itemCategoryId);
    const isOther = selectedCat?.name.toLowerCase() === 'other';
    const nameToUse = isOther ? otherPurpose : itemName;

    if (!nameToUse.trim() || !itemAmount.trim() || !itemCategoryId) return;
    const val = parseFloat(itemAmount);
    if (isNaN(val) || val <= 0) return;

    const newItem = {
      name: nameToUse.trim(),
      amount: val,
      category_id: itemCategoryId,
    };

    setItems([...items, newItem]);

    setItemName('');
    setItemAmount('');
    setOtherPurpose('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, idx) => idx !== index);
    setItems(newItems);
    if (newItems.length === 0) {
      setAmount('');
    }
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    expenses.forEach(e => {
      if (e.date) {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });

    return Array.from(months).sort().reverse();
  };

  const formatMonthKey = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };



  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccessMsg(null);

    let activeItems = [...items];
    let activeAmount = amount;

    // Auto-add current un-added item in inputs if present
    const selectedCat = categories.find(c => c.id === itemCategoryId);
    const isOther = selectedCat?.name.toLowerCase() === 'other';
    const currentItemNameToUse = isOther ? otherPurpose : itemName;

    if (currentItemNameToUse.trim() && itemAmount.trim()) {
      const val = parseFloat(itemAmount);
      if (!isNaN(val) && val > 0) {
        const newItem = {
          name: currentItemNameToUse.trim(),
          amount: val,
          category_id: itemCategoryId,
        };
        activeItems.push(newItem);
        
        // Reset item input states
        setItemName('');
        setItemAmount('');
        setOtherPurpose('');
      }
    }

    // Append discount as a negative item if present
    const discVal = parseFloat(discount) || 0;
    if (discVal > 0 && activeItems.length > 0) {
      activeItems.push({
        name: 'Discount',
        amount: -discVal,
        category_id: null,
      });
    }

    // Recalculate amount if there are items to ensure discount is correctly applied
    if (activeItems.length > 0) {
      const itemsSum = activeItems.reduce((sum, item) => sum + item.amount, 0);
      activeAmount = Math.max(itemsSum, 0).toFixed(2);
    }

    if (!activeAmount.trim() || !date || !paymentAccountId) {
      setError('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(activeAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Amount must be greater than €0.00');
      return;
    }

    try {
      setSaving(true);

      // Finalize store if user wrote something but didn't select it
      let storeId: string | null = null;
      if (selectedStore) {
        storeId = selectedStore.id;
      } else if (storeQuery.trim()) {
        const queryText = storeQuery.trim().toLowerCase();
        // 1. Exact case-insensitive match
        const exactMatch = stores.find(s => s.name.toLowerCase() === queryText);
        if (exactMatch) {
          storeId = exactMatch.id;
        } else {
          // 2. Prefix match (e.g. "net" matches "Netto")
          const prefixMatch = stores.find(s => s.name.toLowerCase().startsWith(queryText));
          if (prefixMatch) {
            storeId = prefixMatch.id;
          } else {
            // 3. Fallback to creating a new custom store
            const store = await db.createStore(profile.id, storeQuery.trim());
            storeId = store.id;
          }
        }
      }

      // Determine dominant category from items
      let finalCategoryId: string | null = null;
      if (activeItems.length > 0) {
        const categorySums: { [key: string]: number } = {};
        activeItems.forEach(it => {
          const catId = it.category_id || 'other';
          categorySums[catId] = (categorySums[catId] || 0) + it.amount;
        });
        const dominantCatEntry = Object.entries(categorySums).sort((a, b) => b[1] - a[1])[0];
        finalCategoryId = dominantCatEntry && dominantCatEntry[0] !== 'other' ? dominantCatEntry[0] : null;
      }

      if (!finalCategoryId) {
        const otherCat = categories.find(c => c.name.toLowerCase() === 'other');
        finalCategoryId = otherCat ? otherCat.id : null;
      }

      await db.createExpense(profile.id, {
        amount: numericAmount,
        date,
        category_id: finalCategoryId,
        store_id: storeId,
        payment_account_id: paymentAccountId,
        notes: notes.trim() || null,
        receipt_url: ocrConfirmationData?.fileUrl || null,
        items: activeItems.length > 0 ? activeItems : null,
      });

      // Reset Form
      setAmount('');
      setStoreQuery('');
      setSelectedStore(null);
      setNotes('');
      setDiscount('0');
      setDate(new Date().toISOString().split('T')[0]);
      setItems([]);
      setSuccessMsg('Expense logged successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Error saving expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!profile) return;
    setConfirmState({
      isOpen: true,
      title: 'Delete Expense',
      description: 'Are you sure you want to delete this expense transaction? This will restore the account balance and cannot be undone.',
      confirmText: 'Delete',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          await db.deleteExpense(profile.id, id);
          await loadData();
        } catch (e: any) {
          console.error(e);
        }
      }
    });
  };

  // Filter stores for autocomplete
  const filteredStores = stores
    .filter(s => s.name.toLowerCase().includes(storeQuery.trim().toLowerCase()))
    .slice(0, 25);

  const filteredSummaryExpenses: ExpenseWithDetails[] = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    if (isNaN(d.getTime())) return false;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return monthKey === selectedMonth;
  });

  if (loading && expenses.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">{t('expenses.title')}</h1>
        <p className="text-xs text-muted-foreground">Log expenses immediately or snap a receipt to pre-fill</p>
      </div>

      {/* Loggers row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="sticky top-20 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Quick Expense Log
            </CardTitle>
            
            {/* Quick Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleReceiptUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadingReceipt}
            >
              <Upload className="h-3.5 w-3.5" />
              Scan
            </Button>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex gap-2.5 items-start">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  No payment account exists. You must create an asset account (e.g. Bank Account) before logging expenses.
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddExpense} className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold">
                    {successMsg}
                  </div>
                )}



                {/* 1. Date Input (On Top) */}
                <Input
                  type="date"
                  label={t('expenses.date')}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  icon={<Calculator className="h-4 w-4 text-muted-foreground" />}
                  required
                />

                {/* 2. Store Autocomplete Search */}
                <div ref={storeDropdownRef} className="relative flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-semibold text-muted-foreground ml-1">{t('expenses.store')}</label>
                  <div className="relative flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={storeQuery}
                      onChange={(e) => {
                        setStoreQuery(e.target.value);
                        setSelectedStore(null);
                        setShowStoreDropdown(true);
                      }}
                      onFocus={() => setShowStoreDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowStoreDropdown(false);
                        } else if (e.key === 'Enter') {
                          if (showStoreDropdown && filteredStores.length > 0) {
                            e.preventDefault();
                            handleStoreSelect(filteredStores[0]);
                          } else {
                            const exactMatch = stores.find(s => s.name.toLowerCase() === storeQuery.toLowerCase());
                            if (exactMatch) {
                              handleStoreSelect(exactMatch);
                            }
                          }
                          setShowStoreDropdown(false);
                        }
                      }}
                      placeholder="Search store (e.g., Lidl, REWE)..."
                      autoComplete="off"
                      className="flex h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {showStoreDropdown && (
                    <div className="absolute top-[68px] left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                      {filteredStores.length > 0 ? (
                        filteredStores.map(store => (
                          <div
                            key={store.id}
                            onClick={() => handleStoreSelect(store)}
                            className="px-4 py-2.5 hover:bg-muted text-sm cursor-pointer font-medium transition-colors"
                          >
                            {store.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-muted-foreground">
                          No matching stores found.
                        </div>
                      )}
                      {storeQuery.trim() !== '' && !filteredStores.some(s => s.name.toLowerCase() === storeQuery.toLowerCase()) && (
                        <div
                          onClick={handleCreateCustomStore}
                          className="px-4 py-2.5 hover:bg-muted text-xs cursor-pointer text-primary font-bold border-t border-border/50 flex items-center justify-between"
                        >
                          <span>{t('expenses.customStore')} "{storeQuery}"</span>
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Items Breakdown list builder */}
                <div className="border border-border/60 rounded-xl p-3 bg-muted/10 space-y-3">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Items Breakdown ({items.length})
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                        Sum: €{items.reduce((s, i) => s + i.amount, 0).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* List of current items */}
                  {items.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {items.map((item, idx) => {
                        const cat = categories.find(c => c.id === item.category_id);
                        return (
                          <div key={idx} className="flex items-center justify-between bg-card border border-border/40 p-2 rounded-lg text-xs font-semibold">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md shrink-0 text-white"
                                style={{ backgroundColor: getCategoryColor(cat?.color) }}
                              >
                                {cat ? t(`categories.${cat.name}`, cat.name) : 'Other'}
                              </span>
                              <span className="truncate text-foreground/90">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span>€{item.amount.toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-muted-foreground hover:text-rose-500 transition-colors p-0.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New Item Inputs */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {categories.find(c => c.id === itemCategoryId)?.name.toLowerCase() === 'other' ? (
                        <input
                          type="text"
                          placeholder="Specify Purpose (e.g. Taxi fare)"
                          value={otherPurpose}
                          onChange={(e) => setOtherPurpose(e.target.value)}
                          className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder="Item Name (e.g. Bread)"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      )}
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price (e.g. 1.20)"
                        value={itemAmount}
                        onChange={(e) => setItemAmount(e.target.value)}
                        className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                    
                    <div className="flex gap-2 items-center justify-between w-full">
                      {/* Item Category Dropdown Select */}
                      <div className="flex-1">
                        <select
                          value={itemCategoryId}
                          onChange={(e) => setItemCategoryId(e.target.value)}
                          className="flex h-9 w-full rounded-lg border border-border bg-card px-2 py-1 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-semibold text-foreground/80"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {t(`categories.${cat.name}`, cat.name)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Button
                        type="button"
                        onClick={handleAddItem}
                        variant="secondary"
                        size="sm"
                        className="h-9 text-[10px] font-extrabold px-3.5 py-1 gap-1 shrink-0"
                        disabled={
                          itemAmount.trim() === '' ||
                          itemCategoryId === '' ||
                          (categories.find(c => c.id === itemCategoryId)?.name.toLowerCase() === 'other'
                            ? otherPurpose.trim() === ''
                            : itemName.trim() === '')
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 4. Discount Input */}
                <Input
                  type="number"
                  step="0.01"
                  label="Discount on this Purchase (€)"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  icon={<Coins className="h-4 w-4 text-muted-foreground" />}
                />

                {/* 5. Amount Input (Total Amount) */}
                <Input
                  type="number"
                  step="0.01"
                  label="Total Amount (€)"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  icon={<Coins className="h-4 w-4 text-muted-foreground" />}
                />

                {/* 6. Payment Account Select */}
                <Select
                  label={t('expenses.paymentAccount')}
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  options={accounts.map(acc => ({
                    value: acc.id,
                    label: `${acc.name} (€${acc.balance.toFixed(2)})`,
                  }))}
                />

                {/* 7. Notes Input */}
                <Input
                  label={t('expenses.notes')}
                  placeholder="e.g., Weekly food shopping"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {/* 8. Submit Button */}
                <Button type="submit" className="w-full mt-2" loading={saving}>
                  {t('expenses.save')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Quick Log Recurring Bills Card */}
        <Card className="sticky top-20 shadow-md h-fit bg-card/75 backdrop-blur-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Quick Log Recurring Bills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
              Log common monthly student utilities in a single click with pre-filled amounts:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {[
                { name: 'House Rent', cat: 'House rent', amount: profile?.house_rent !== undefined && profile?.house_rent !== null ? Number(profile.house_rent) : 264.50 },
                { name: 'Health Insurance', cat: 'Health Insurance', amount: profile?.health_insurance !== undefined && profile?.health_insurance !== null ? Number(profile.health_insurance) : 151.42 },
                { name: 'Radio Bill', cat: 'Radio Bill', amount: profile?.radio_bill !== undefined && profile?.radio_bill !== null ? Number(profile.radio_bill) : 18.36 },
                { name: 'Mobile bill', cat: 'Mobile bill', amount: profile?.mobile_bill !== undefined && profile?.mobile_bill !== null ? Number(profile.mobile_bill) : 10.00 }
              ].map(bill => {
                const logged = isBillLogged(bill.cat);
                return (
                  <button
                    key={bill.name}
                    type="button"
                    disabled={logged}
                    onClick={() => handleQuickLogBill(bill.name, bill.cat, bill.amount)}
                    className={cn(
                      "p-4 rounded-2xl border text-xs font-bold transition-all flex flex-col justify-between h-24 text-left shadow-xs",
                      logged
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 opacity-70 cursor-not-allowed"
                        : "bg-muted/30 hover:bg-muted border-border/60 text-foreground cursor-pointer hover:border-primary/20"
                    )}
                  >
                    <span className="opacity-95">{bill.name}</span>
                    <span className="font-mono text-[11px] font-black block mt-2 text-primary">
                      {logged ? 'Logged' : `€${bill.amount.toFixed(2)}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/60 font-semibold leading-relaxed pt-2">
              Note: Quick logs process immediately to Giro account after a confirmation modal. Once logged, the button stays disabled for the active month.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expense History Timeline */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Expense History Log</h3>
          
          {/* View Toggle */}
          <div className="flex bg-secondary p-1 rounded-xl w-fit self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('journal')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                viewMode === 'journal'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Journal (Sheet)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                viewMode === 'summary'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Month Summary
            </button>
          </div>
        </div>

        {expenses.length === 0 ? (
          <Card className="py-12 text-center border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No expenses logged yet.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {expenses.map((exp) => (
              <Card key={exp.id} className="hover:border-primary/20 transition-all duration-200 group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold"
                      style={{ backgroundColor: getCategoryColor(exp.category?.color) }}
                    >
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">
                          {exp.store?.name || t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other')}
                        </h4>
                        {exp.receipt_url && (
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptUrl(exp.receipt_url)}
                            className="text-primary hover:text-primary/80 flex items-center justify-center p-0.5 rounded bg-primary/10 transition-colors"
                            title="View Receipt"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-2">
                        <span>{new Date(exp.date).toLocaleDateString('de-DE')}</span>
                        <span>•</span>
                        <span>{t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other')}</span>
                        <span>•</span>
                        <span>From: {exp.account?.name}</span>
                      </p>
                      {exp.notes && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{exp.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      -€{exp.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === 'journal' ? (
          /* Grouped Journal View (Sheet Style Modernized) */
          <div className="space-y-6">
            {Object.entries(
              expenses.reduce<{ [key: string]: ExpenseWithDetails[] }>((groups, exp) => {
                const dateStr = exp.date;
                if (!groups[dateStr]) groups[dateStr] = [];
                groups[dateStr].push(exp);
                return groups;
              }, {})
            )
              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([dateString, dateExpenses]) => {
                const formattedDate = new Date(dateString).toLocaleDateString('de-DE', {
                  day: 'numeric',
                  month: 'numeric',
                  year: '2-digit',
                });
                
                const dailyTotal = dateExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                return (
                  <Card key={dateString} className="border-border shadow-sm overflow-hidden bg-card/65 backdrop-blur-md">
                    <CardHeader className="bg-muted/40 py-3.5 px-5 flex flex-row justify-between items-center border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-foreground bg-primary/10 text-primary px-3 py-1 rounded-xl">
                          {formattedDate}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {dateExpenses.length} {dateExpenses.length === 1 ? 'Purchase' : 'Purchases'}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-foreground bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-xl border border-emerald-500/20">
                        Total: €{dailyTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </CardHeader>
                    
                    <CardContent className="p-0 divide-y divide-border/40">
                      {dateExpenses.map((exp) => {
                        const storeName = exp.store?.name || t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other');
                        
                        return (
                          <div key={exp.id} className="p-5 space-y-4 group">
                            {/* Market Title & Subtotal */}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-extrabold text-foreground tracking-tight">{storeName}</h4>
                                  {exp.receipt_url && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReceiptUrl(exp.receipt_url)}
                                      className="text-primary hover:text-primary/80 flex items-center justify-center p-0.5 rounded bg-primary/10 transition-colors"
                                      title="View Receipt"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Paid with {exp.account?.name || 'Account'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-3.5">
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Sub Total</span>
                                  <span className="text-sm font-extrabold text-foreground">
                                    €{exp.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                                  title="Delete transaction"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Nested Items details */}
                            <div className="rounded-xl border border-border/40 overflow-x-auto bg-muted/20">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/40">
                                    <th className="py-2.5 px-4 font-bold">Items</th>
                                    <th className="py-2.5 px-4 text-center w-28 font-bold">Category</th>
                                    <th className="py-2.5 px-4 text-right w-28 font-bold">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {exp.items && exp.items.length > 0 ? (
                                    exp.items.map((item, idx) => {
                                      const itemCat = item.category_id ? categories.find(c => c.id === item.category_id) : null;
                                      return (
                                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                          <td className="py-2.5 px-4 font-semibold text-foreground/90">{item.name}</td>
                                          <td className="py-2.5 px-4 text-center">
                                            <span
                                              className="inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-md text-white shadow-xs shrink-0"
                                              style={{ backgroundColor: getCategoryColor(itemCat?.color) }}
                                            >
                                              {itemCat ? t(`categories.${itemCat.name}`, itemCat.name) : 'Other'}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-4 text-right font-extrabold text-foreground">
                                            €{item.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    /* Single item placeholder row when there are no subitems */
                                    <tr className="hover:bg-muted/30 transition-colors">
                                      <td className="py-2.5 px-4 font-semibold text-foreground/90">{exp.notes || 'Transaction purchase'}</td>
                                      <td className="py-2.5 px-4 text-center">
                                        <span
                                          className="inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-md text-white shadow-xs shrink-0"
                                          style={{ backgroundColor: getCategoryColor(exp.category?.color) }}
                                        >
                                          {exp.category ? t(`categories.${exp.category.name}`, exp.category.name) : 'Other'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-extrabold text-foreground">
                                        €{exp.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        ) : (
          /* Month Summary View (Spreadsheet style) */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-foreground">Select Month Summary</h4>
                <p className="text-[10px] text-muted-foreground font-medium">Select calendar month to view transaction sheet</p>
              </div>
              <div className="w-48">
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  options={getAvailableMonths().map(mKey => ({
                    value: mKey,
                    label: formatMonthKey(mKey),
                  }))}
                />
              </div>
            </div>

            {filteredSummaryExpenses.length === 0 ? (
              <Card className="py-12 text-center border-dashed bg-card/40">
                <CardContent className="text-xs text-muted-foreground font-semibold">
                  No purchases logged for this month.
                </CardContent>
              </Card>
            ) : (
              <div className="border border-border rounded-2xl bg-card/75 backdrop-blur-md overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/60 text-muted-foreground border-b border-border/80 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-3 px-4 w-8"></th>
                        <th className="py-3 px-4">Shop / Merchant</th>
                        <th className="py-3 px-4 text-center w-36">Purchases</th>
                        <th className="py-3 px-4 text-right w-36">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {Object.values(
                        filteredSummaryExpenses.reduce((groups: { [key: string]: { shopName: string; totalAmount: number; expenses: ExpenseWithDetails[] } }, exp) => {
                          const shopName = exp.store?.name || (t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other') as string);
                          if (!groups[shopName]) {
                            groups[shopName] = {
                              shopName,
                              totalAmount: 0,
                              expenses: [],
                            };
                          }
                          groups[shopName].totalAmount += exp.amount;
                          groups[shopName].expenses.push(exp);
                          return groups;
                        }, {})
                      )
                        .sort((a, b) => b.totalAmount - a.totalAmount)
                        .map((shop) => {
                          const isExpanded = expandedShops.includes(shop.shopName);
                          return (
                            <React.Fragment key={shop.shopName}>
                              <tr
                                onClick={() => toggleShopExpand(shop.shopName)}
                                className="hover:bg-muted/40 transition-colors cursor-pointer font-semibold text-foreground/95"
                              >
                                <td className="py-3 px-4 text-center">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </td>
                                <td className="py-3 px-4 font-bold text-foreground text-sm">{shop.shopName}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold">
                                    {shop.expenses.length} {shop.expenses.length === 1 ? 'purchase' : 'purchases'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                                  -€{shop.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-muted/20">
                                  <td colSpan={4} className="py-4 px-6 border-b border-border/30">
                                    <div className="space-y-4">
                                      {shop.expenses
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((exp) => {
                                          const formattedDate = new Date(exp.date).toLocaleDateString('de-DE', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit',
                                          });
                                          return (
                                            <div key={exp.id} className="border border-border/40 rounded-xl bg-card overflow-x-auto shadow-xs">
                                              {/* Day Subtotal Header */}
                                              <div className="bg-muted/40 px-4 py-2.5 flex justify-between items-center border-b border-border/30">
                                                <div className="flex flex-wrap items-center gap-3">
                                                  <span className="text-[10px] font-extrabold text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg">
                                                    {formattedDate}
                                                  </span>
                                                  <span className="text-[11px] font-semibold text-muted-foreground">
                                                    Paid: <strong className="text-foreground">{exp.account?.name || 'Account'}</strong>
                                                  </span>
                                                  {exp.notes && (
                                                    <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                                                      • Notes: <strong className="text-foreground">{exp.notes}</strong>
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <span className="text-xs font-extrabold text-foreground">
                                                    Total: €{exp.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteExpense(exp.id);
                                                    }}
                                                    className="p-1 hover:text-destructive text-muted-foreground/60 transition-colors"
                                                    title="Delete Expense"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Items List Table */}
                                              <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                  <tr className="bg-muted/10 text-muted-foreground font-semibold border-b border-border/20 text-[10px] uppercase">
                                                    <th className="py-2 px-4">Item Name</th>
                                                    <th className="py-2 px-4 text-center w-28">Category</th>
                                                    <th className="py-2 px-4 text-right w-24">Price</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/20">
                                                  {exp.items && exp.items.length > 0 ? (
                                                    exp.items.map((item: any, idx: number) => {
                                                      const itemCat = item.category_id ? categories.find(c => c.id === item.category_id) : null;
                                                      return (
                                                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                          <td className="py-2 px-4 font-semibold text-foreground/80">{item.name}</td>
                                                          <td className="py-2 px-4 text-center">
                                                            <span
                                                              className="inline-block px-2 py-0.5 text-[9px] font-extrabold rounded-md text-white shadow-xs shrink-0"
                                                              style={{ backgroundColor: getCategoryColor(itemCat?.color) }}
                                                            >
                                                              {itemCat ? t(`categories.${itemCat.name}`, itemCat.name) : 'Other'}
                                                            </span>
                                                          </td>
                                                          <td className="py-2 px-4 text-right font-extrabold text-foreground/90">
                                                            €{item.amount.toFixed(2)}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })
                                                  ) : (
                                                    <tr>
                                                      <td className="py-2 px-4 font-semibold text-foreground/70">{exp.notes || 'Transaction purchase'}</td>
                                                      <td className="py-2 px-4 text-center">
                                                        <span
                                                          className="inline-block px-2 py-0.5 text-[9px] font-extrabold rounded-md text-white shadow-xs shrink-0"
                                                          style={{ backgroundColor: exp.category?.color || '#6b7280' }}
                                                        >
                                                          {exp.category ? t(`categories.${exp.category.name}`, exp.category.name) : 'Other'}
                                                        </span>
                                                      </td>
                                                      <td className="py-2 px-4 text-right font-extrabold text-foreground/90">
                                                        €{exp.amount.toFixed(2)}
                                                      </td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OCR PREFILL CONFIRMATION DIALOG */}
      <Dialog
        isOpen={ocrConfirmationData !== null}
        onClose={() => setOcrConfirmationData(null)}
        title="Confirm Receipt Scan Details"
        description="We automatically read the following details from your uploaded receipt. Would you like to pre-fill the form?"
      >
        {ocrConfirmationData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5 p-4 bg-muted/60 rounded-xl">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Store Detected</span>
                <p className="text-sm font-extrabold text-foreground">{ocrConfirmationData.storeName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Amount</span>
                <p className="text-sm font-extrabold text-foreground">€{ocrConfirmationData.amount.toFixed(2)}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Transaction Date</span>
                <p className="text-sm font-extrabold text-foreground">{new Date(ocrConfirmationData.date).toLocaleDateString('de-DE')}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setOcrConfirmationData(null)}>
                Discard
              </Button>
              <Button onClick={handleConfirmOcrPrefill} className="gap-2">
                <Check className="h-4 w-4" />
                Fill Form
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* CREATE CATEGORY DIALOG */}
      <Dialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        title="Create Custom Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g., Subscriptions, Books"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground ml-1">Theme Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="h-10 w-16 bg-card border border-border rounded-xl cursor-pointer"
              />
              <span className="text-xs font-bold font-mono text-muted-foreground">{newCatColor}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)} disabled={creatingCategory}>
              Cancel
            </Button>
            <Button type="submit" loading={creatingCategory}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>

      {/* RECEIPT VIEW DIALOG */}
      <Dialog
        isOpen={selectedReceiptUrl !== null}
        onClose={() => setSelectedReceiptUrl(null)}
        title="Receipt View"
      >
        <div className="flex flex-col items-center gap-4 py-2">
          {selectedReceiptUrl && (
            <div className="max-w-full rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
              <img
                src={selectedReceiptUrl}
                alt="Uploaded Receipt"
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
          )}
          <div className="flex justify-end w-full">
            <Button type="button" onClick={() => setSelectedReceiptUrl(null)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

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
                confirmState?.onConfirm(modalDate);
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
          {confirmState?.showDatePicker && (
            <div className="pt-2">
              <Input
                type="date"
                label="Select Date for Log"
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                required
              />
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
