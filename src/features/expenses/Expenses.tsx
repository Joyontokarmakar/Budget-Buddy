/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { ExpenseWithDetails, Account, Category, Store } from '../../types';
import { cn } from '../../utils/cn';
import { isCategoryBill, isCategoryActive, getCategoryMonthlyAmount } from '../../utils/category';
import { getCategoryColor } from '../../utils/color';
import { getSafeItems } from '../../utils/items';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent, Dialog, Spinner } from '../../components/ui';
import { ArrowUpRight, Plus, Calculator, Coins, AlertCircle, FileText, Upload, Check, Search, Trash2, ChevronDown, ChevronRight, Calendar, Sparkles, Pencil, Key } from 'lucide-react';

export const Expenses: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile, updateProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

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
  const [items, setItems] = useState<{ id: string; name: string; amount: number; category_id?: string | null }[]>([]);
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

  // Gemini API Key Setup Dialog State
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [modalApiKey, setModalApiKey] = useState('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Edit Mode State
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPaymentAccountId, setEditPaymentAccountId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editItems, setEditItems] = useState<{ id: string; name: string; amount: number; category_id?: string | null }[]>([]);
  const [editItemName, setEditItemName] = useState('');
  const [editItemAmount, setEditItemAmount] = useState('');
  const [editItemCategoryId, setEditItemCategoryId] = useState('');
  const [editOtherPurpose, setEditOtherPurpose] = useState('');
  const [editStoreQuery, setEditStoreQuery] = useState('');
  const [editSelectedStore, setEditSelectedStore] = useState<Store | null>(null);
  const [editShowStoreDropdown, setEditShowStoreDropdown] = useState(false);
  const editStoreDropdownRef = useRef<HTMLDivElement>(null);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    showAccountPicker?: boolean;
    initialAccountId?: string;
    showAmountInput?: boolean;
    initialAmount?: number;
    onConfirm: (selectedDate?: string, selectedAccountId?: string, selectedAmount?: number) => void;
    onAdvanced?: (selectedDate?: string, selectedAccountId?: string, selectedAmount?: number) => void;
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
      // Default item category (prioritizing Food/Groceries)
      if (catData.length > 0 && !itemCategoryId) {
        const allowedCats = catData.filter(cat => !isCategoryBill(cat) && cat.name.toLowerCase() !== 'discount');
        const foodCat = allowedCats.find(cat => cat.name.toLowerCase() === 'food' || cat.name.toLowerCase() === 'groceries');
        if (foodCat) {
          setItemCategoryId(foodCat.id);
          setEditItemCategoryId(foodCat.id);
        } else if (allowedCats.length > 0) {
          setItemCategoryId(allowedCats[0].id);
          setEditItemCategoryId(allowedCats[0].id);
        } else {
          setItemCategoryId(catData[0].id);
          setEditItemCategoryId(catData[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredEditStores = editStoreQuery.trim() === ''
    ? stores
    : stores.filter(store => store.name.toLowerCase().includes(editStoreQuery.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editStoreDropdownRef.current && !editStoreDropdownRef.current.contains(event.target as Node)) {
        setEditShowStoreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Recalculate editAmount dynamically when editing items or discount changes
  useEffect(() => {
    if (editingExpense) {
      const discVal = parseFloat(editDiscount) || 0;
      if (editItems.length > 0) {
        const itemsSum = editItems.reduce((sum, item) => sum + Number(item.amount), 0);
        const finalTotal = Math.max(itemsSum - discVal, 0);
        setEditAmount(finalTotal.toFixed(2));
      }
    }
  }, [editItems, editDiscount, editingExpense]);

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

  const handleScanClick = () => {
    if (!profile?.gemini_api_key) {
      setApiKeyError(null);
      setModalApiKey('');
      setIsApiKeyDialogOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSaveApiKey = async () => {
    if (!modalApiKey.trim() || !profile) return;
    setIsSavingApiKey(true);
    setApiKeyError(null);
    try {
      const { error: updateError } = await updateProfile({
        gemini_api_key: modalApiKey.trim()
      });
      if (updateError) throw new Error(updateError);
      setIsApiKeyDialogOpen(false);
      // Wait briefly for state updates, then trigger scanning
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 200);
    } catch (err: any) {
      setApiKeyError(err.message || 'Failed to save API Key');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleUseMockMode = () => {
    setIsApiKeyDialogOpen(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 200);
  };

  const handleOcrDemo = async () => {
    if (!profile) return;
    try {
      setUploadingReceipt(true);
      setError(null);
      const receiptData = await db.getOcrDemoReceipt(profile.id);
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
      setError('Failed to load OCR demo data: ' + err.message);
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
        const matchName = (it.categoryName || it.category || 'Other').toLowerCase();
        let cat = categories.find(c => c.name.toLowerCase() === matchName);
        if (!cat) {
          if (matchName.includes('grocer') || matchName === 'food') {
            cat = categories.find(c => c.name.toLowerCase() === 'food');
          } else {
            cat = categories.find(c => c.name.toLowerCase() === 'other');
          }
        }
        return {
          id: crypto.randomUUID(),
          name: it.name,
          amount: Number(it.amount) || 0,
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
      const itemsSum = items.reduce((sum, item) => sum + Number(item.amount), 0);
      const discVal = parseFloat(discount) || 0;
      const finalTotal = Math.max(itemsSum - discVal, 0);
      setAmount(finalTotal.toFixed(2));
    }
  }, [items, discount]);

  // Prefill state from React Router location (e.g. redirected from Dashboard "Advanced Log")
  useEffect(() => {
    if (location.state && (location.state as any).prefilledBill) {
      const { name, categoryId, amount: billAmt, notes: billNotes, date: billDate, preferredAccountId } = (location.state as any).prefilledBill;
      
      // Prefill main form
      setAmount(billAmt.toString());
      if (billDate) setDate(billDate);
      if (preferredAccountId) setPaymentAccountId(preferredAccountId);
      setNotes(billNotes || '');
      setItems([{
        id: crypto.randomUUID(),
        name: `${name} - Recurring Bill`,
        amount: billAmt,
        category_id: categoryId
      }]);
      if (categoryId) setItemCategoryId(categoryId);
      
      // Clear location state so it doesn't prefill again on refresh
      window.history.replaceState({}, document.title);
      
      // Scroll to form
      setTimeout(() => {
        const formEl = document.querySelector('form');
        if (formEl) {
          formEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  const isBillLogged = (categoryId: string, monthKey?: string) => {
    let targetMonthKey = monthKey;
    if (!targetMonthKey) {
      if (!date) return false;
      const dateParts = date.split('-');
      targetMonthKey = `${dateParts[0]}-${dateParts[1]}`;
    }
    
    return expenses.some(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      const eMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const isSameCategory = e.category_id === categoryId;
      const isInTargetMonth = eMonthKey === targetMonthKey;
      const isExplicitPeriod = e.notes?.includes(`[Bill Period: ${targetMonthKey}]`);
      
      return isSameCategory && (isInTargetMonth || isExplicitPeriod);
    });
  };

  const getLoggedBillExpense = (categoryId: string, monthKey?: string) => {
    let targetMonthKey = monthKey;
    if (!targetMonthKey) {
      if (!date) return undefined;
      const dateParts = date.split('-');
      targetMonthKey = `${dateParts[0]}-${dateParts[1]}`;
    }
    
    return expenses.find(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      const eMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const isSameCategory = e.category_id === categoryId;
      const isInTargetMonth = eMonthKey === targetMonthKey;
      const isExplicitPeriod = e.notes?.includes(`[Bill Period: ${targetMonthKey}]`);
      
      return isSameCategory && (isInTargetMonth || isExplicitPeriod);
    });
  };

  const handleQuickLogBill = async (billName: string, categoryId: string, defaultAmount: number, preferredAccountId?: string | null) => {
    if (!profile || !paymentAccountId) return;
    
    const accountIdToUse = preferredAccountId || paymentAccountId;
    const account = accounts.find(a => a.id === accountIdToUse) || accounts.find(a => a.id === paymentAccountId);
    const accountName = account ? account.name : 'selected account';
    
    const matchingExpenses = expenses.filter(e => e.category_id === categoryId);
    const amountToLog = matchingExpenses.length > 0 ? matchingExpenses[0].amount : defaultAmount;
    
    setConfirmState({
      isOpen: true,
      title: `Log ${billName}`,
      description: `Log ${billName} using ${accountName}? You can verify or adjust the date, payment account, and amount below.`,
      confirmText: 'Log Bill',
      confirmVariant: 'primary',
      showDatePicker: true,
      initialDate: date,
      showAccountPicker: true,
      initialAccountId: accountIdToUse,
      showAmountInput: true,
      initialAmount: amountToLog,
      onAdvanced: (selectedDate, selectedAccountId, selectedAmount) => {
        const finalAmount = selectedAmount !== undefined ? selectedAmount : amountToLog;
        const finalDate = selectedDate || date;
        const dateParts = finalDate.split('-');
        const monthKey = `${dateParts[0]}-${dateParts[1]}`;
        const finalAccountId = selectedAccountId || accountIdToUse;

        setAmount(finalAmount.toString());
        setDate(finalDate);
        setPaymentAccountId(finalAccountId);
        setNotes(`${billName} - Recurring Bill [Bill Period: ${monthKey}]`);
        setItems([{
          id: crypto.randomUUID(),
          name: `${billName} - Recurring Bill`,
          amount: finalAmount,
          category_id: categoryId
        }]);
        setItemCategoryId(categoryId);

        setTimeout(() => {
          const formEl = document.querySelector('form');
          if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      },
      onConfirm: async (selectedDate, selectedAccountId, selectedAmount) => {
        try {
          setSaving(true);
          const finalDate = selectedDate || date;
          const dateParts = finalDate.split('-');
          const monthKey = `${dateParts[0]}-${dateParts[1]}`;
          const finalAmount = selectedAmount !== undefined ? selectedAmount : amountToLog;
          
          await db.createExpense(profile.id, {
            amount: finalAmount,
            date: finalDate,
            category_id: categoryId,
            store_id: null,
            payment_account_id: selectedAccountId || accountIdToUse,
            notes: `${billName} - Recurring Bill [Bill Period: ${monthKey}]`,
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


  const getUnpaidPastBills = () => {
    if (!profile || !profile.created_at) return [];
    
    // Parse start month from profile creation as fallback
    let startD = new Date(profile.created_at);
    let earliestTime = startD.getTime();
    
    // Check if there are earlier historical expenses logged
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
    const startMonth = startD.getMonth(); // 0-indexed
    
    // Current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    const unpaidList: {
      name: string;
      cat: string;
      amount: number;
      month: string;
      preferredAccountId?: string | null;
    }[] = [];
    
    // Iterate from start month to one month before current month
    let iterYear = startYear;
    let iterMonth = startMonth;
    
    while (iterYear < currentYear || (iterYear === currentYear && iterMonth < currentMonth)) {
      const monthKey = `${iterYear}-${String(iterMonth + 1).padStart(2, '0')}`;
      
      const billsToCheck = categories.filter(c => isCategoryBill(c) && isCategoryActive(c));
      
      for (const bill of billsToCheck) {
        if (!isBillLogged(bill.id, monthKey)) {
          unpaidList.push({
            name: bill.name,
            cat: bill.id,
            amount: getCategoryMonthlyAmount(bill),
            month: monthKey,
            preferredAccountId: bill.preferred_account_id
          });
        }
      }
      
      // Increment month
      iterMonth++;
      if (iterMonth > 11) {
        iterMonth = 0;
        iterYear++;
      }
    }
    
    return unpaidList;
  };

  const handlePayMissedBill = async (bill: { name: string; cat: string; amount: number; month: string; preferredAccountId?: string | null }) => {
    if (!profile || !paymentAccountId) return;
    
    const accountIdToUse = bill.preferredAccountId || paymentAccountId;
    const account = accounts.find(a => a.id === accountIdToUse) || accounts.find(a => a.id === paymentAccountId);
    const accountName = account ? account.name : 'selected account';
    
    setConfirmState({
      isOpen: true,
      title: `Pay Missed ${bill.name}`,
      description: `Log payment for missed ${bill.name} using ${accountName}? It will be logged under today's date. You can verify or adjust the date, payment account, and amount below.`,
      confirmText: 'Pay Missed Bill',
      confirmVariant: 'primary',
      showDatePicker: true,
      initialDate: date,
      showAccountPicker: true,
      initialAccountId: accountIdToUse,
      showAmountInput: true,
      initialAmount: bill.amount,
      onAdvanced: (selectedDate, selectedAccountId, selectedAmount) => {
        const finalAmount = selectedAmount !== undefined ? selectedAmount : bill.amount;
        const finalDate = selectedDate || date;
        const finalAccountId = selectedAccountId || accountIdToUse;

        setAmount(finalAmount.toString());
        setDate(finalDate);
        setPaymentAccountId(finalAccountId);
        setNotes(`${bill.name} - Missed Bill for ${bill.month} [Bill Period: ${bill.month}]`);
        setItems([{
          id: crypto.randomUUID(),
          name: `${bill.name} - Missed Bill`,
          amount: finalAmount,
          category_id: bill.cat
        }]);
        setItemCategoryId(bill.cat);

        setTimeout(() => {
          const formEl = document.querySelector('form');
          if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      },
      onConfirm: async (selectedDate, selectedAccountId, selectedAmount) => {
        try {
          setSaving(true);
          const categoryId = bill.cat;
          const finalAmount = selectedAmount !== undefined ? selectedAmount : bill.amount;
          
          await db.createExpense(profile.id, {
            amount: finalAmount,
            date: selectedDate || date,
            category_id: categoryId,
            store_id: null,
            payment_account_id: selectedAccountId || accountIdToUse,
            notes: `${bill.name} - Missed Bill for ${bill.month} [Bill Period: ${bill.month}]`,
            receipt_url: null,
            items: null
          });
          
          setSuccessMsg(`${bill.name} for ${bill.month} logged successfully!`);
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
      id: crypto.randomUUID(),
      name: nameToUse.trim(),
      amount: val,
      category_id: itemCategoryId,
    };

    setItems([...items, newItem]);

    setItemName('');
    setItemAmount('');
    setOtherPurpose('');
  };
  const handleRemoveItem = (itemId: string) => {
    const newItems = items.filter((item) => item.id !== itemId);
    setItems(newItems);
    if (newItems.length === 0) {
      setAmount('');
    }
  };
  const handleEditItem = (item: { id: string; name: string; amount: number; category_id?: string | null }) => {
    const cat = categories.find(c => c.id === item.category_id);
    const isOther = cat?.name.toLowerCase() === 'other';
    
    if (isOther) {
      setOtherPurpose(item.name);
      setItemName('');
    } else {
      setItemName(item.name);
      setOtherPurpose('');
    }
    setItemAmount(item.amount.toString());
    setItemCategoryId(item.category_id || '');
    
    setItems(items.filter(i => i.id !== item.id));
  };

  const handleEditItemInEditMode = (item: { id: string; name: string; amount: number; category_id?: string | null }) => {
    const cat = categories.find(c => c.id === item.category_id);
    const isOther = cat?.name.toLowerCase() === 'other';

    if (isOther) {
      setEditOtherPurpose(item.name);
      setEditItemName('');
    } else {
      setEditItemName(item.name);
      setEditOtherPurpose('');
    }
    setEditItemAmount(item.amount.toString());
    setEditItemCategoryId(item.category_id || '');

    setEditItems(editItems.filter(i => i.id !== item.id));
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
    return date.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
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
          id: crypto.randomUUID(),
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
      const discountCat = categories.find(c => c.name.toLowerCase() === 'discount');
      activeItems.push({
        id: crypto.randomUUID(),
        name: 'Discount',
        amount: -discVal,
        category_id: discountCat ? discountCat.id : null,
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
        discount: parseFloat(discount) || 0,
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

  const handleCloseEdit = () => {
    setEditingExpense(null);
    setEditAmount('');
    setEditDate('');
    setEditStoreQuery('');
    setEditSelectedStore(null);
    setEditItems([]);
    setEditItemName('');
    setEditItemAmount('');
    setEditOtherPurpose('');
    setEditDiscount('0');
    setEditCategoryId('');
    setEditNotes('');
    setEditError(null);
  };

  const handleStartEdit = (exp: ExpenseWithDetails) => {
    setEditingExpense(exp);
    setEditDate(exp.date);
    setEditStoreQuery(exp.store?.name || '');
    setEditSelectedStore(exp.store || null);
    
    // Parse items to ignore the discount item which is added on submit
    const safeItems = getSafeItems(exp.items);
    const discountItem = safeItems.find(it => it.name.toLowerCase() === 'discount');
    const displayItems = safeItems.filter(it => it.name.toLowerCase() !== 'discount');
    
    setEditItems(displayItems);
    setEditDiscount(discountItem ? Math.abs(discountItem.amount).toString() : '0');
    setEditAmount(exp.amount.toString());
    setEditCategoryId(exp.category_id || '');
    setEditPaymentAccountId(exp.payment_account_id);
    setEditNotes(exp.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editingExpense) return;
    setEditError(null);

    let activeItems = [...editItems];
    let activeAmount = editAmount;

    // Auto-add current un-added item in edit inputs if present
    const selectedCat = categories.find(c => c.id === editItemCategoryId);
    const isOther = selectedCat?.name.toLowerCase() === 'other';
    const currentItemNameToUse = isOther ? editOtherPurpose : editItemName;

    if (currentItemNameToUse.trim() && editItemAmount.trim()) {
      const val = parseFloat(editItemAmount);
      if (!isNaN(val) && val > 0) {
        const newItem = {
          id: crypto.randomUUID(),
          name: currentItemNameToUse.trim(),
          amount: val,
          category_id: editItemCategoryId,
        };
        activeItems.push(newItem);
        
        // Reset item input states
        setEditItemName('');
        setEditItemAmount('');
        setEditOtherPurpose('');
      }
    }

    // Append discount as a negative item if present
    const discVal = parseFloat(editDiscount) || 0;
    if (discVal > 0 && activeItems.length > 0) {
      const discountCat = categories.find(c => c.name.toLowerCase() === 'discount');
      activeItems.push({
        id: crypto.randomUUID(),
        name: 'Discount',
        amount: -discVal,
        category_id: discountCat ? discountCat.id : null,
      });
    }

    // Recalculate amount if there are items to ensure discount is correctly applied
    if (activeItems.length > 0) {
      const itemsSum = activeItems.reduce((sum, item) => sum + item.amount, 0);
      activeAmount = Math.max(itemsSum, 0).toFixed(2);
    }

    if (!activeAmount.trim() || !editDate || !editPaymentAccountId) {
      setEditError('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(activeAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setEditError('Amount must be greater than €0.00');
      return;
    }

    try {
      setEditSaving(true);

      // Finalize store in edit mode
      let storeId: string | null = null;
      if (editSelectedStore) {
        storeId = editSelectedStore.id;
      } else if (editStoreQuery.trim()) {
        const queryText = editStoreQuery.trim().toLowerCase();
        const exactMatch = stores.find(s => s.name.toLowerCase() === queryText);
        if (exactMatch) {
          storeId = exactMatch.id;
        } else {
          const prefixMatch = stores.find(s => s.name.toLowerCase().startsWith(queryText));
          if (prefixMatch) {
            storeId = prefixMatch.id;
          } else {
            const store = await db.createStore(profile.id, editStoreQuery.trim());
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
      } else {
        finalCategoryId = editCategoryId;
      }

      if (!finalCategoryId) {
        const otherCat = categories.find(c => c.name.toLowerCase() === 'other');
        finalCategoryId = otherCat ? otherCat.id : null;
      }

      await db.updateExpense(profile.id, editingExpense.id, {
        amount: numericAmount,
        date: editDate,
        category_id: finalCategoryId,
        store_id: storeId,
        payment_account_id: editPaymentAccountId,
        notes: editNotes.trim() || null,
        items: activeItems.length > 0 ? activeItems : null,
        discount: parseFloat(editDiscount) || 0,
      });

      handleCloseEdit();
      await loadData();
    } catch (err: any) {
      setEditError(err.message || 'Error updating expense');
    } finally {
      setEditSaving(false);
    }
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

  const activeBills = categories
    .filter(c => isCategoryBill(c) && isCategoryActive(c))
    .map(c => ({
      name: c.name,
      cat: c.id,
      amount: getCategoryMonthlyAmount(c),
      preferredAccountId: c.preferred_account_id
    }));

  const allBillsLogged = activeBills.length > 0 && activeBills.every(bill => isBillLogged(bill.cat));

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
        <Card className="lg:sticky lg:top-20 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Quick Expense Log
            </CardTitle>
            
            {/* Quick Upload Button */}
            <div className="flex gap-2">
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
                onClick={handleScanClick}
                loading={uploadingReceipt}
              >
                <Upload className="h-3.5 w-3.5" />
                Scan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20"
                onClick={handleOcrDemo}
                loading={uploadingReceipt}
              >
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Try Demo
              </Button>
            </div>
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
                {!profile?.gemini_api_key && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10.5px] leading-relaxed font-semibold flex items-start gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      Running in <strong className="text-amber-700 dark:text-amber-300">Mock Scanner Mode</strong>. Uploading real receipts will generate randomized demo data. To parse your actual receipts accurately, add a free <Link to="/settings" className="underline font-bold text-primary hover:text-primary/80 transition-colors">Gemini API Key in Settings</Link>.
                    </div>
                  </div>
                )}
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
                      {items.map((item) => {
                        const cat = categories.find(c => c.id === item.category_id);
                        return (
                          <div key={item.id} className="flex items-center justify-between bg-card border border-border/40 p-2 rounded-lg text-xs font-semibold">
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
                              <span>€{Number(item.amount).toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => handleEditItem(item)}
                                className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                                title="Edit item"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
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
                          {categories
                            .filter(cat => !cat.is_monthly_bill && cat.name.toLowerCase() !== 'discount')
                            .map((cat) => (
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

        {/* Monthly Bills Checklist Column Stack */}
        <div className="lg:sticky lg:top-20 flex flex-col gap-6 h-fit">
          {/* Monthly Bills Checklist Card */}
          <Card className="shadow-md h-fit bg-card/75 backdrop-blur-md">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t('expenses.monthlyBillsTitle')}
                </span>
                {allBillsLogged && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="h-3 w-3 stroke-[3]" />
                    Done
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                {t('expenses.monthlyBillsSubtitle')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {activeBills.map(bill => {
                  const loggedExpense = getLoggedBillExpense(bill.cat);
                  const logged = !!loggedExpense;
                  return (
                    <button
                      key={bill.name}
                      type="button"
                      disabled={logged}
                      onClick={() => handleQuickLogBill(bill.name, bill.cat, bill.amount, bill.preferredAccountId)}
                      className={cn(
                        "p-4 rounded-2xl border text-xs font-bold transition-all flex flex-col justify-between h-24 text-left shadow-xs w-full relative overflow-hidden",
                        logged
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 opacity-70 cursor-not-allowed"
                          : "bg-muted/30 hover:bg-muted border-border/60 text-foreground cursor-pointer hover:border-primary/20"
                      )}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <span className="opacity-95">{bill.name}</span>
                        {logged && (
                          <span className="bg-emerald-500 dark:bg-emerald-600 text-white rounded-full p-0.5 shrink-0 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "font-mono text-[11px] font-black block mt-2",
                        logged ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                      )}>
                        {logged && loggedExpense ? (
                          <>
                            <div>{new Date(loggedExpense.date).toLocaleDateString('de-DE')}</div>
                            <div className="text-[10px] font-semibold opacity-85 mt-0.5">
                              €{loggedExpense.amount.toFixed(2)} By {loggedExpense.account?.name || 'Account'}
                            </div>
                          </>
                        ) : (
                          `€${bill.amount.toFixed(2)}`
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/60 font-semibold leading-relaxed pt-2">
                {t('expenses.monthlyBillsNote')}
              </p>
            </CardContent>
          </Card>

          {/* Unpaid Past Bills Card */}
          {getUnpaidPastBills().length > 0 && (
            <Card className="shadow-md h-fit bg-destructive/5 border-destructive/20 border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                  {t('expenses.unpaidBillsTitle')}
                </CardTitle>
                <span className="text-[10px] font-extrabold bg-destructive/10 text-destructive px-2.5 py-0.5 rounded-full border border-destructive/20 tracking-wide uppercase">
                  {getUnpaidPastBills().length} {t('expenses.pending')}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                  {t('expenses.unpaidBillsSubtitle')}
                </p>
                <div className="space-y-2.5 pt-1 max-h-64 overflow-y-auto pr-1">
                  {getUnpaidPastBills().map((bill) => (
                    <div key={`${bill.cat}-${bill.month}`} className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs">
                      <div className="flex flex-col">
                        <span className="text-xs font-extrabold text-foreground">{bill.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                          {formatMonthKey(bill.month)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black text-foreground">
                          €{bill.amount.toFixed(2)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handlePayMissedBill(bill)}
                          className="h-7 text-[10px] font-extrabold px-3 bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-xs rounded-xl border border-destructive/30"
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
        </div>
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
                          {profile?.show_shop_name === false
                            ? t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other')
                            : (exp.store?.rendering_name || exp.store?.name || t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other'))}
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
                      onClick={() => handleStartEdit(exp)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      title="Edit transaction"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
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
                
                const dailyTotal = dateExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

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
                        Total: €{Number(dailyTotal).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </CardHeader>
                    
                    <CardContent className="p-0 divide-y divide-border/40">
                      {dateExpenses.map((exp) => {
                        const storeName = profile?.show_shop_name === false
                          ? t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other')
                          : (exp.store?.rendering_name || exp.store?.name || t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other'));
                        
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
                                    €{Number(exp.amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleStartEdit(exp)}
                                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200"
                                  title="Edit transaction"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200"
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
                                  {(() => {
                                    const safeItems = getSafeItems(exp.items);
                                    return safeItems.length > 0 ? (
                                      safeItems.map((item, idx) => {
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
                                              €{Number(item.amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
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
                                          €{Number(exp.amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    );
                                  })()}
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
                          const shopName = profile?.show_shop_name === false
                            ? (t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other') as string)
                            : (exp.store?.rendering_name || exp.store?.name || (t(`categories.${exp.category?.name || 'Other'}`, exp.category?.name || 'Other') as string));
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
                                                      handleStartEdit(exp);
                                                    }}
                                                    className="p-1 hover:text-primary text-muted-foreground/60 transition-colors"
                                                    title="Edit Expense"
                                                  >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                  </button>
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
                                                  {(() => {
                                                    const safeItems = getSafeItems(exp.items);
                                                    return safeItems.length > 0 ? (
                                                      safeItems.map((item: any, idx: number) => {
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
                                                              €{Number(item.amount).toFixed(2)}
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
                                                            style={{ backgroundColor: getCategoryColor(exp.category?.color) }}
                                                          >
                                                            {exp.category ? t(`categories.${exp.category.name}`, exp.category.name) : 'Other'}
                                                          </span>
                                                        </td>
                                                        <td className="py-2 px-4 text-right font-extrabold text-foreground/90">
                                                          €{Number(exp.amount).toFixed(2)}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })()}
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

      {/* GEMINI API KEY SETUP DIALOG */}
      <Dialog
        isOpen={isApiKeyDialogOpen}
        onClose={() => setIsApiKeyDialogOpen(false)}
        title="Gemini API Key Required"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-normal">
            To scan and extract details from real receipts, you need a Gemini API Key.{' '}
            <Link
              to="/settings/gemini-guide"
              className="text-primary hover:underline font-bold"
            >
              Don't know how to get API key?
            </Link>
          </p>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
            <div className="flex gap-2.5 items-start">
              <Key className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">How to get a free Gemini API Key:</h4>
                <ol className="text-[11px] text-muted-foreground list-decimal list-inside mt-2 space-y-1.5 leading-relaxed">
                  <li>
                    Go to{' '}
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-bold"
                    >
                      Google AI Studio <span className="inline-block text-[9px] font-normal px-1 bg-primary/10 text-primary rounded ml-0.5">External link</span>
                    </a>.
                  </li>
                  <li>Sign in with your Google account.</li>
                  <li>Click on the <strong>"Create API Key"</strong> button.</li>
                  <li>Copy your key (starts with <code>AIzaSy...</code>) and paste it below.</li>
                </ol>
              </div>
            </div>
          </div>

          {apiKeyError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
              {apiKeyError}
            </div>
          )}

          <div className="space-y-2">
            <Input
              type="password"
              label="Enter Gemini API Key"
              placeholder="Paste your key here (AIzaSy...)"
              value={modalApiKey}
              onChange={(e) => setModalApiKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUseMockMode}
              className="text-muted-foreground hover:text-foreground text-xs h-9 order-3 sm:order-1"
            >
              Try Mock Mode
            </Button>
            <div className="flex gap-2 order-1 sm:order-2">
              <Button variant="outline" size="sm" onClick={() => setIsApiKeyDialogOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleSaveApiKey}
                loading={isSavingApiKey}
                disabled={!modalApiKey.trim()}
                size="sm"
                className="h-9 text-xs gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Save & Scan
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

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

      {/* EDIT EXPENSE DIALOG */}
      <Dialog
        isOpen={!!editingExpense}
        onClose={handleCloseEdit}
        title="Edit Expense"
        description="Update transaction details, items breakdown, or payment method."
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {editError}
            </div>
          )}

          {/* Date Input */}
          <Input
            type="date"
            label="Transaction Date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            icon={<Calculator className="h-4 w-4 text-muted-foreground" />}
            required
          />

          {/* Store Autocomplete Search */}
          <div ref={editStoreDropdownRef} className="relative flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-muted-foreground ml-1">Store / Merchant</label>
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={editStoreQuery}
                onChange={(e) => {
                  setEditStoreQuery(e.target.value);
                  setEditSelectedStore(null);
                  setEditShowStoreDropdown(true);
                }}
                onFocus={() => setEditShowStoreDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditShowStoreDropdown(false);
                  } else if (e.key === 'Enter') {
                    if (editShowStoreDropdown && filteredEditStores.length > 0) {
                      e.preventDefault();
                      setEditSelectedStore(filteredEditStores[0]);
                      setEditStoreQuery(filteredEditStores[0].name);
                    } else {
                      const exactMatch = stores.find(s => s.name.toLowerCase() === editStoreQuery.toLowerCase());
                      if (exactMatch) {
                        setEditSelectedStore(exactMatch);
                        setEditStoreQuery(exactMatch.name);
                      }
                    }
                    setEditShowStoreDropdown(false);
                  }
                }}
                placeholder="Search store (e.g., Lidl, REWE)..."
                autoComplete="off"
                className="flex h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold"
              />
            </div>

            {editShowStoreDropdown && (
              <div className="absolute top-[68px] left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                {filteredEditStores.length > 0 ? (
                  filteredEditStores.map(store => (
                    <div
                      key={store.id}
                      onClick={() => {
                        setEditSelectedStore(store);
                        setEditStoreQuery(store.name);
                        setEditShowStoreDropdown(false);
                      }}
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
              </div>
            )}
          </div>

          {/* Items Breakdown list builder */}
          <div className="border border-border/60 rounded-xl p-3 bg-muted/10 space-y-3">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Items Breakdown ({editItems.length})
              </span>
              {editItems.length > 0 && (
                <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                  Sum: €{editItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}
                </span>
              )}
            </div>

            {/* List of current items */}
            {editItems.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {editItems.map((item) => {
                  const cat = categories.find(c => c.id === item.category_id);
                  return (
                    <div key={item.id} className="flex items-center justify-between bg-card border border-border/40 p-2 rounded-lg text-xs font-semibold">
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
                        <span>€{Number(item.amount).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleEditItemInEditMode(item)}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                          title="Edit item"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditItems(editItems.filter(i => i.id !== item.id))}
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
                {categories.find(c => c.id === editItemCategoryId)?.name.toLowerCase() === 'other' ? (
                  <input
                    type="text"
                    placeholder="Specify Purpose (e.g. Taxi fare)"
                    value={editOtherPurpose}
                    onChange={(e) => setEditOtherPurpose(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Item Name (e.g. Bread)"
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  />
                )}
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price (e.g. 1.20)"
                  value={editItemAmount}
                  onChange={(e) => setEditItemAmount(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>

              <div className="flex gap-2 items-center justify-between w-full">
                <div className="flex-1">
                  <select
                    value={editItemCategoryId}
                    onChange={(e) => setEditItemCategoryId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-2 py-1 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-semibold text-foreground/80"
                  >
                    {categories
                      .filter(cat => !cat.is_monthly_bill && cat.name.toLowerCase() !== 'discount')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {t(`categories.${cat.name}`, cat.name)}
                        </option>
                      ))}
                  </select>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    const selectedCat = categories.find(c => c.id === editItemCategoryId);
                    const isOther = selectedCat?.name.toLowerCase() === 'other';
                    const nameToUse = isOther ? editOtherPurpose : editItemName;
                    if (!nameToUse.trim() || !editItemAmount.trim()) return;
                    const val = parseFloat(editItemAmount);
                    if (isNaN(val) || val <= 0) return;

                    setEditItems([...editItems, {
                      id: crypto.randomUUID(),
                      name: nameToUse.trim(),
                      amount: val,
                      category_id: editItemCategoryId
                    }]);
                    setEditItemName('');
                    setEditItemAmount('');
                    setEditOtherPurpose('');
                  }}
                  variant="secondary"
                  size="sm"
                  className="h-9 text-[10px] font-extrabold px-3.5 py-1 gap-1 shrink-0"
                  disabled={
                    editItemAmount.trim() === '' ||
                    (categories.find(c => c.id === editItemCategoryId)?.name.toLowerCase() === 'other'
                      ? editOtherPurpose.trim() === ''
                      : editItemName.trim() === '')
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Conditional Category Select (only if no items breakdown exists) */}
          {editItems.length === 0 ? (
            <Select
              label="Expense Category"
              value={editCategoryId}
              onChange={(e) => setEditCategoryId(e.target.value)}
              options={categories
                .filter(cat => !cat.is_monthly_bill && cat.name.toLowerCase() !== 'discount')
                .map((cat) => ({
                  value: cat.id,
                  label: t(`categories.${cat.name}`, cat.name),
                }))}
            />
          ) : (
            <div className="p-3 bg-primary/5 border border-primary/20 text-primary rounded-xl text-xs font-semibold leading-normal">
              Category will be dynamically determined based on the items breakdown.
            </div>
          )}

          {/* Discount Input */}
          <Input
            type="number"
            step="0.01"
            label="Discount on this Purchase (€)"
            placeholder="0.00"
            value={editDiscount}
            onChange={(e) => setEditDiscount(e.target.value)}
            icon={<Coins className="h-4 w-4 text-muted-foreground" />}
          />

          {/* Total Amount Input */}
          <Input
            type="number"
            step="0.01"
            label="Total Amount (€)"
            placeholder="0.00"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            icon={<Coins className="h-4 w-4 text-muted-foreground" />}
          />

          {/* Payment Account */}
          <Select
            label="Payment Account"
            value={editPaymentAccountId}
            onChange={(e) => setEditPaymentAccountId(e.target.value)}
            options={accounts.map(acc => ({
              value: acc.id,
              label: `${acc.name} (€${acc.balance.toFixed(2)})`,
            }))}
          />

          {/* Notes Input */}
          <Input
            label={t('expenses.notes')}
            placeholder="e.g., Weekly food shopping"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />

          {/* Dialog Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseEdit}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={editSaving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* CONFIRMATION DIALOG */}
      <Dialog
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title || ''}
        footer={
          <div className="flex gap-2.5 w-full justify-between items-center">
            <div>
              {confirmState?.onAdvanced && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    const amtVal = parseFloat(modalAmount);
                    confirmState.onAdvanced?.(
                      modalDate, 
                      modalAccountId, 
                      isNaN(amtVal) ? undefined : amtVal
                    );
                    setConfirmState(null);
                  }}
                  className="text-primary hover:bg-primary/5 font-extrabold text-xs px-3 h-9 rounded-xl"
                >
                  Advanced Options
                </Button>
              )}
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" type="button" onClick={() => setConfirmState(null)} className="h-9 text-xs rounded-xl">
                {t('common.cancel')}
              </Button>
              <Button 
                variant={confirmState?.confirmVariant || 'primary'} 
                type="button"
                onClick={() => {
                  const amtVal = parseFloat(modalAmount);
                  confirmState?.onConfirm(
                    modalDate, 
                    modalAccountId, 
                    isNaN(amtVal) ? undefined : amtVal
                  );
                  setConfirmState(null);
                }}
                className="h-9 text-xs rounded-xl font-bold"
              >
                {confirmState?.confirmText || 'Confirm'}
              </Button>
            </div>
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
    </div>
  );
};
