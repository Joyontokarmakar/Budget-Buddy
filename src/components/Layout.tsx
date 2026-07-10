import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, LogOut, Laptop, Globe, Search, ChevronDown, User } from 'lucide-react';
import { Button } from './ui';
import { GlobalSearch } from './GlobalSearch';
import { db } from '../services/db';

export const Layout: React.FC = () => {
  const { profile, signOut } = useAuthStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Status Dots State
  const [loans, setLoans] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
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
        console.error('Failed to load layout status indicator data:', err);
      }
    };

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

  // SVG Status Dots drawing
  const renderStatusDots = () => {
    const totalDots = 32;
    let loanDots = activeTakenLoansCount;
    let billDots = unpaidBillsCount;

    // Cap if we have too many loans + bills to ensure at least 2 dots always represent the budget
    if (loanDots + billDots > totalDots - 2) {
      const scale = (totalDots - 2) / (loanDots + billDots);
      loanDots = Math.round(loanDots * scale);
      billDots = Math.round(billDots * scale);
      if (loanDots + billDots > totalDots - 2) {
        if (loanDots > billDots) {
          loanDots--;
        } else {
          billDots--;
        }
      }
    }

    const dots = [];
    const radius = 17.6;
    const centerX = 22;
    const centerY = 22;

    for (let i = 0; i < totalDots; i++) {
      const angle = (2 * Math.PI * i) / totalDots;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      let fill = '#34d399'; // default safe (emerald-400)
      let title = 'Budget: Safe';
      
      if (i < loanDots) {
        fill = '#fbbf24'; // Loan color (amber-400)
        title = `Loan Outstanding (${activeTakenLoansCount} total)`;
      } else if (i < loanDots + billDots) {
        fill = '#fb7185'; // Unpaid bill color (rose-400)
        title = `Unpaid Past Bill (${unpaidBillsCount} total)`;
      } else {
        // Budget progress color
        if (budgetUsedPercent < 75) {
          fill = '#34d399';
          title = `Budget Progress: Safe (${budgetUsedPercent.toFixed(0)}% used)`;
        } else if (budgetUsedPercent < 100) {
          fill = '#fbbf24';
          title = `Budget Progress: Near Limit (${budgetUsedPercent.toFixed(0)}% used)`;
        } else {
          fill = '#fb7185';
          title = `Budget Progress: Exceeded (${budgetUsedPercent.toFixed(0)}% used)`;
        }
      }

      dots.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r={1.0}
          fill={fill}
          className="transition-colors duration-300"
        >
          <title>{title}</title>
        </circle>
      );
    }

    return (
      <svg className="absolute inset-0 h-full w-full rotate-[-90deg] transition-transform duration-700 ease-out group-hover:rotate-[270deg]">
        {dots}
      </svg>
    );
  };

  const currentTheme = profile?.theme_preference || 'system';
  const currentLang = profile?.preferred_language || i18n.language || 'de';

  const toggleTheme = () => {
    const { updateProfile } = useAuthStore.getState();
    const nextTheme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
    updateProfile({ theme_preference: nextTheme });
  };

  const toggleLanguage = () => {
    const { updateProfile } = useAuthStore.getState();
    const nextLang = currentLang.startsWith('de') ? 'en' : 'de';
    updateProfile({ preferred_language: nextLang });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getThemeIcon = () => {
    if (currentTheme === 'light') return <Sun className="h-4 w-4" />;
    if (currentTheme === 'dark') return <Moon className="h-4 w-4" />;
    return <Laptop className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar on Desktop / Bottom Bar on Mobile */}
      <Navigation />

      {/* Main content area */}
      <div className="md:pl-64 min-h-screen flex flex-col transition-all duration-200">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-[calc(4rem+env(safe-area-inset-top))] safe-pt border-b border-border/60 bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="relative">
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="group flex items-center gap-2.5 hover:bg-muted/50 p-1.5 rounded-xl transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/10 border-none"
            >
              <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
                {renderStatusDots()}
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="h-8.5 w-8.5 rounded-full object-cover border border-border/80 shadow-xs"
                  />
                ) : (
                  <div className="h-8.5 w-8.5 rounded-full bg-gradient-to-tr from-primary/20 to-violet-500/20 border border-border/60 flex items-center justify-center text-primary font-black text-xs uppercase">
                    {(profile?.name || 'S').charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0 pr-0.5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider leading-none mb-0.5">Welcome</span>
                <span className="text-xs font-extrabold truncate max-w-[100px] sm:max-w-[150px] leading-tight">
                  {profile?.name || 'Student'}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileDropdownOpen && (
              <>
                {/* Backdrop overlay */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsProfileDropdownOpen(false)} 
                />
                
                <div className="absolute left-0 mt-2 w-48 rounded-xl border border-border/80 bg-card p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer border-none text-left"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile Settings
                  </button>
                  <div className="h-px bg-border/60 my-1" />
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer border-none text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Desktop Search trigger */}
          <div className="flex-1 max-w-sm mx-8 hidden md:block">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs animate-in fade-in duration-200"
            >
              <Search className="h-4 w-4 text-muted-foreground/60" />
              <span className="truncate">{t('search.placeholder')}</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-muted px-1.5 font-mono text-[9px] font-bold text-muted-foreground/80">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search Toggle for Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
              title="Search"
              className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Quick Language Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              title={`Switch to ${currentLang === 'de' ? 'English' : 'Deutsch'}`}
              className="text-muted-foreground hover:text-foreground h-9 w-9"
            >
              <Globe className="h-4 w-4 mr-0.5" />
              <span className="text-[10px] font-bold uppercase">{currentLang.slice(0, 2)}</span>
            </Button>

            {/* Quick Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={`Theme: ${currentTheme}`}
              className="text-muted-foreground hover:text-foreground h-9 w-9"
            >
              {getThemeIcon()}
            </Button>

            {/* Quick Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="text-muted-foreground hover:text-destructive h-9 w-9"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content Router Slot */}
        <main className="flex-1 px-4 py-6 md:p-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Search command palette */}
      <GlobalSearch />
    </div>
  );
};
