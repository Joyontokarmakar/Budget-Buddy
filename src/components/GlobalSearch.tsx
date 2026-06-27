import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { db } from '../services/db';
import type { Account, ExpenseWithDetails, IncomeWithDetails, Store, PermanentAsset } from '../types';
import { cn } from '../utils/cn';
import { 
  Search, 
  X, 
  Calendar, 
  ShoppingBag, 
  Store as StoreIcon, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Gem, 
  PieChart, 
  Settings, 
  FileText, 
  LayoutDashboard, 
  ArrowRight,
  Terminal
} from 'lucide-react';
import { Badge } from './ui';

interface SearchResultItem {
  id: string;
  type: 'page' | 'month' | 'product' | 'shop' | 'transaction';
  category: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  onClick: () => void;
  icon?: React.ReactNode;
}

export const GlobalSearch: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Data cache
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [assets, setAssets] = useState<PermanentAsset[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load all user data when modal is opened for instant in-memory filtering
  const loadSearchData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [accs, exps, incs, asts, strs] = await Promise.all([
        db.getAccounts(profile.id),
        db.getExpenses(profile.id),
        db.getIncome(profile.id),
        db.getPermanentAssets(profile.id),
        db.getStores(profile.id),
      ]);
      setAccounts(accs);
      setExpenses(exps);
      setIncomes(incs);
      setAssets(asts);
      setStores(strs);
    } catch (e) {
      console.error('Error loading search database:', e);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Event listener to open when custom global-search event is fired
  useEffect(() => {
    const handleOpenSearch = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-global-search', handleOpenSearch);
    return () => window.removeEventListener('open-global-search', handleOpenSearch);
  }, []);

  // Load data & focus input when search is opened
  useEffect(() => {
    if (isOpen) {
      loadSearchData();
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 150);
      // Disable body scroll when modal open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle arrow key navigation in results
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen || flatResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        flatResults[selectedIndex]?.onClick();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, selectedIndex, query, expenses, incomes, assets, stores, accounts]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Computations for Search Matching
  const getSearchResults = (): SearchResultItem[] => {
    const results: SearchResultItem[] = [];
    const lowerQuery = query.trim().toLowerCase();

    // 1. Pages/Navigation match
    const pageItems = [
      { to: '/', label: t('nav.dashboard'), icon: <LayoutDashboard className="h-4.5 w-4.5 text-primary" /> },
      { to: '/expenses', label: t('nav.expenses'), icon: <TrendingDown className="h-4.5 w-4.5 text-rose-500" /> },
      { to: '/income', label: t('nav.income'), icon: <TrendingUp className="h-4.5 w-4.5 text-emerald-500" /> },
      { to: '/accounts', label: t('nav.accounts'), icon: <Wallet className="h-4.5 w-4.5 text-sky-500" /> },
      { to: '/analytics', label: t('nav.analytics'), icon: <PieChart className="h-4.5 w-4.5 text-violet-500" /> },
      { to: '/reports', label: t('nav.reports'), icon: <FileText className="h-4.5 w-4.5 text-indigo-500" /> },
      { to: '/assets', label: t('nav.assets'), icon: <Gem className="h-4.5 w-4.5 text-amber-500" /> },
      { to: '/settings', label: t('nav.settings'), icon: <Settings className="h-4.5 w-4.5 text-slate-500" /> },
      { to: '/developer', label: t('nav.developer'), icon: <Terminal className="h-4.5 w-4.5 text-teal-500" /> },
    ];

    const matchedPages = pageItems.filter(item => 
      item.label.toLowerCase().includes(lowerQuery)
    ).map(item => ({
      id: `page-${item.to}`,
      type: 'page' as const,
      category: t('search.pages'),
      title: item.label,
      subtitle: t('search.clickToVisit'),
      onClick: () => {
        navigate(item.to);
        setIsOpen(false);
      },
      icon: item.icon
    }));

    results.push(...matchedPages);

    if (!lowerQuery) {
      // If query is empty, return only page links as shortcuts
      return results;
    }

    // 1.5. Accounts match
    const matchedAccounts = accounts.filter(a =>
      a.name.toLowerCase().includes(lowerQuery) ||
      a.type.toLowerCase().includes(lowerQuery)
    ).map(a => ({
      id: `account-${a.id}`,
      type: 'transaction' as const,
      category: t('accounts.title'),
      title: a.name,
      subtitle: `${t('accounts.type')}: ${t(`accounts.${a.type}`, a.type)} | Balance: €${a.balance.toFixed(2)}`,
      badge: `€${a.balance.toFixed(2)}`,
      badgeVariant: 'outline' as const,
      onClick: () => {
        navigate('/accounts');
        setIsOpen(false);
      },
      icon: <Wallet className="h-4.5 w-4.5 text-sky-500" />
    }));
    results.push(...matchedAccounts);

    // 2. Monthly summaries search match
    const monthsMap = new Map<string, { expenses: number; income: number; txCount: number }>();
    expenses.forEach(e => {
      const monthKey = e.date.substring(0, 7); // YYYY-MM
      const cur = monthsMap.get(monthKey) || { expenses: 0, income: 0, txCount: 0 };
      cur.expenses += e.amount;
      cur.txCount += 1;
      monthsMap.set(monthKey, cur);
    });
    incomes.forEach(i => {
      const monthKey = i.date.substring(0, 7); // YYYY-MM
      const cur = monthsMap.get(monthKey) || { expenses: 0, income: 0, txCount: 0 };
      cur.income += i.amount;
      cur.txCount += 1;
      monthsMap.set(monthKey, cur);
    });

    const locale = i18n.language || 'de';
    const matchedMonths: SearchResultItem[] = [];

    monthsMap.forEach((stats, monthKey) => {
      const [year, monthStr] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(monthStr) - 1, 1);
      const localizedMonthName = date.toLocaleDateString(locale, { month: 'long' });
      const localizedMonthYear = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      
      const searchString = `${localizedMonthName} ${year} ${monthKey} ${monthStr}`.toLowerCase();
      
      if (searchString.includes(lowerQuery)) {
        matchedMonths.push({
          id: `month-${monthKey}`,
          type: 'month' as const,
          category: t('search.monthlySummaries'),
          title: localizedMonthYear,
          subtitle: `${t('search.income')}: +€${stats.income.toFixed(2)} | ${t('search.expenses')}: -€${stats.expenses.toFixed(2)} | ${t('search.savings')}: €${(stats.income - stats.expenses).toFixed(2)}`,
          badge: `${stats.txCount} txs`,
          badgeVariant: 'outline',
          onClick: () => {
            navigate(`/reports?month=${monthKey}`);
            setIsOpen(false);
          },
          icon: <Calendar className="h-4.5 w-4.5 text-amber-500" />
        });
      }
    });

    results.push(...matchedMonths);

    // 3. Products & prices match
    const matchedProducts: SearchResultItem[] = [];
    
    // Check inside expense items list (e.g. Lidl receipt items list)
    expenses.forEach(e => {
      if (e.items && Array.isArray(e.items)) {
        e.items.forEach((item, idx) => {
          if (item.name.toLowerCase().includes(lowerQuery)) {
            const storeName = e.store?.name || 'Unknown Store';
            matchedProducts.push({
              id: `product-exp-${e.id}-${idx}`,
              type: 'product' as const,
              category: t('search.products'),
              title: item.name,
              subtitle: t('search.spentAt', {
                amount: `€${item.amount.toFixed(2)}`,
                store: storeName,
                date: e.date
              }),
              badge: `€${item.amount.toFixed(2)}`,
              badgeVariant: 'secondary',
              onClick: () => {
                navigate('/expenses');
                setIsOpen(false);
              },
              icon: <ShoppingBag className="h-4.5 w-4.5 text-violet-500" />
            });
          }
        });
      }
    });

    // Check inside permanent assets
    assets.forEach(a => {
      if (a.name.toLowerCase().includes(lowerQuery)) {
        matchedProducts.push({
          id: `product-asset-${a.id}`,
          type: 'product' as const,
          category: t('search.products'),
          title: a.name,
          subtitle: t('search.assetAt', {
            name: a.name,
            price: `€${a.price.toFixed(2)}`,
            store: a.store,
            date: a.date
          }),
          badge: `€${a.price.toFixed(2)}`,
          badgeVariant: 'primary',
          onClick: () => {
            navigate('/assets');
            setIsOpen(false);
          },
          icon: <Gem className="h-4.5 w-4.5 text-cyan-500" />
        });
      }
    });

    results.push(...matchedProducts);

    // 4. Shops data match
    const matchedShops: SearchResultItem[] = [];
    stores.forEach(s => {
      if (s.name.toLowerCase().includes(lowerQuery)) {
        const shopExpenses = expenses.filter(e => 
          e.store_id === s.id || 
          (e.store?.name && e.store.name.toLowerCase() === s.name.toLowerCase())
        );
        const totalSpent = shopExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        matchedShops.push({
          id: `shop-${s.id}`,
          type: 'shop' as const,
          category: t('search.shops'),
          title: s.name,
          subtitle: `${shopExpenses.length} purchases | Total spent: €${totalSpent.toFixed(2)}`,
          badge: `€${totalSpent.toFixed(2)}`,
          badgeVariant: totalSpent > 0 ? 'destructive' : 'outline',
          onClick: () => {
            navigate('/expenses');
            setIsOpen(false);
          },
          icon: <StoreIcon className="h-4.5 w-4.5 text-emerald-500" />
        });
      }
    });

    results.push(...matchedShops);

    // 5. Transactions search match (by notes, categories, etc.)
    const matchedTransactions: SearchResultItem[] = [];
    
    expenses.forEach(e => {
      const categoryName = e.category?.name || 'Other';
      const notesMatch = e.notes && e.notes.toLowerCase().includes(lowerQuery);
      const categoryMatch = categoryName.toLowerCase().includes(lowerQuery);
      const amountMatch = e.amount.toString().includes(lowerQuery);
      
      if (notesMatch || categoryMatch || amountMatch) {
        const storeName = e.store?.name || 'Unknown Store';
        matchedTransactions.push({
          id: `tx-exp-${e.id}`,
          type: 'transaction' as const,
          category: t('search.transactions'),
          title: e.notes || `${categoryName} Expense`,
          subtitle: `Expense: €${e.amount.toFixed(2)} at ${storeName} on ${e.date}`,
          badge: `-€${e.amount.toFixed(2)}`,
          badgeVariant: 'destructive',
          onClick: () => {
            navigate('/expenses');
            setIsOpen(false);
          },
          icon: <TrendingDown className="h-4.5 w-4.5 text-rose-500" />
        });
      }
    });

    incomes.forEach(i => {
      const typeName = t(`income.${i.type}`, i.type);
      const notesMatch = i.notes && i.notes.toLowerCase().includes(lowerQuery);
      const typeMatch = typeName.toLowerCase().includes(lowerQuery);
      const sourceMatch = i.source_name && i.source_name.toLowerCase().includes(lowerQuery);
      const amountMatch = i.amount.toString().includes(lowerQuery);
      
      if (notesMatch || typeMatch || sourceMatch || amountMatch) {
        const sourceDisp = i.source_name || typeName;
        matchedTransactions.push({
          id: `tx-inc-${i.id}`,
          type: 'transaction' as const,
          category: t('search.transactions'),
          title: i.notes || `${sourceDisp} Income`,
          subtitle: `Income: €${i.amount.toFixed(2)} from ${sourceDisp} on ${i.date}`,
          badge: `+€${i.amount.toFixed(2)}`,
          badgeVariant: 'success',
          onClick: () => {
            navigate('/income');
            setIsOpen(false);
          },
          icon: <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
        });
      }
    });

    results.push(...matchedTransactions);

    return results;
  };

  const flatResults = getSearchResults();

  // Group flat items by category for rendering headers
  const groupedResults: { [category: string]: SearchResultItem[] } = {};
  flatResults.forEach((item) => {
    if (!groupedResults[item.category]) {
      groupedResults[item.category] = [];
    }
    groupedResults[item.category].push(item);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 md:px-0">
      {/* Dark overlay backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-200" 
        onClick={() => setIsOpen(false)}
      />

      {/* Main Command Palette Dialog */}
      <div className="relative w-full max-w-2xl bg-card/90 dark:bg-slate-900/90 border border-border/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Input Box */}
        <div className="flex items-center gap-3 border-b border-border/50 dark:border-slate-800/80 px-4 py-3.5">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base border-none p-0 focus:ring-0"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
          <span className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-muted px-1.5 font-mono text-[9px] font-bold text-muted-foreground">
            ESC
          </span>
        </div>

        {/* Search Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 min-h-[150px] max-h-[50vh] scrollbar-thin"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-sm font-semibold">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
              <span>{t('common.loading')}</span>
            </div>
          ) : flatResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-muted-foreground text-sm font-semibold mb-1">
                {t('search.noResults', { query })}
              </span>
              <span className="text-[11px] text-muted-foreground/60 max-w-xs">
                Try searching for store name like 'Lidl', product name like 'Toast' or month name like 'June'.
              </span>
            </div>
          ) : (
            Object.keys(groupedResults).map((categoryName) => (
              <div key={categoryName} className="mb-3">
                {/* Section Header */}
                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {categoryName}
                </div>

                {/* Section Results */}
                <div className="space-y-0.5 mt-1">
                  {groupedResults[categoryName].map((item) => {
                    const globalIndex = flatResults.findIndex(r => r.id === item.id);
                    const isActive = globalIndex === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        data-active={isActive}
                        onClick={item.onClick}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border border-transparent",
                          isActive 
                            ? "bg-gradient-to-r from-primary/10 to-violet-500/10 dark:from-primary/20 dark:to-violet-500/20 border-primary/20" 
                            : "hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "flex items-center justify-center h-8.5 w-8.5 rounded-xl border shrink-0",
                            isActive 
                              ? "bg-card border-primary/20 text-primary shadow-xs" 
                              : "bg-muted/40 border-border/40 text-muted-foreground"
                          )}>
                            {item.icon}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold truncate text-foreground leading-tight">
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <span className="text-[11px] text-muted-foreground/80 truncate leading-normal mt-0.5">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <Badge variant={item.badgeVariant || 'secondary'} className="text-[10px] font-bold px-2 py-0">
                              {item.badge}
                            </Badge>
                          )}
                          {isActive && (
                            <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 animate-in slide-in-from-left-1 duration-150" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="border-t border-border/50 dark:border-slate-800/80 px-4 py-2 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
          <span>{t('search.searchHelp')}</span>
          <span className="flex items-center gap-1.5">
            <kbd className="h-4 select-none items-center gap-0.5 rounded border border-border/60 bg-muted px-1 font-mono text-[9px] font-bold text-muted-foreground">⌘K</kbd> / <kbd className="h-4 select-none items-center gap-0.5 rounded border border-border/60 bg-muted px-1 font-mono text-[9px] font-bold text-muted-foreground">Ctrl+K</kbd> to toggle
          </span>
        </div>

      </div>
    </div>
  );
};
