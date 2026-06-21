import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, TrendingDown, TrendingUp, Wallet, PieChart, Settings, FileText, Gem, Menu, X } from 'lucide-react';
import { cn } from '../utils/cn';

export const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/expenses', label: t('nav.expenses'), icon: TrendingDown },
    { to: '/income', label: t('nav.income'), icon: TrendingUp },
    { to: '/accounts', label: t('nav.accounts'), icon: Wallet },
    { to: '/analytics', label: t('nav.analytics'), icon: PieChart },
    { to: '/reports', label: t('nav.reports'), icon: FileText },
    { to: '/assets', label: t('nav.assets'), icon: Gem },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  // Mobile Bottom Tab Bar items (max 4 primary links + 1 "More" button)
  const primaryItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/expenses', label: t('nav.expenses'), icon: TrendingDown },
    { to: '/income', label: t('nav.income'), icon: TrendingUp },
    { to: '/reports', label: t('nav.reports'), icon: FileText },
  ];

  const secondaryItems = [
    { to: '/accounts', label: t('nav.accounts'), icon: Wallet },
    { to: '/analytics', label: t('nav.analytics'), icon: PieChart },
    { to: '/assets', label: t('nav.assets'), icon: Gem },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const isSecondaryActive = secondaryItems.some(item => location.pathname === item.to);

  return (
    <>
      {/* Mobile Sticky Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-1 pt-2 pb-safe md:hidden shadow-lg shadow-black/5">
        <div className="flex items-center justify-around h-12 max-w-lg mx-auto">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors relative',
                    isActive ? 'text-primary' : 'hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-5 w-5 transition-transform duration-200 active:scale-95" />
                    <span className="text-[10px] font-semibold mt-1 tracking-tight truncate max-w-[65px]">{item.label}</span>
                    {isActive && (
                      <span className="absolute top-0 w-1.5 h-1.5 rounded-full bg-primary -translate-y-1" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* More trigger button on mobile */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors relative',
              isSecondaryActive || isMoreOpen ? 'text-primary' : 'hover:text-foreground'
            )}
          >
            <Menu className="h-5 w-5 transition-transform duration-200 active:scale-95" />
            <span className="text-[10px] font-semibold mt-1 tracking-tight truncate">{t('common.more')}</span>
            {isSecondaryActive && (
              <span className="absolute top-0 w-1.5 h-1.5 rounded-full bg-primary -translate-y-1" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Sheet Drawer Menu */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMoreOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-[24px] px-6 pt-4 pb-8 md:hidden transition-transform duration-300 ease-out shadow-2xl safe-pb",
          isMoreOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drawer Drag Bar */}
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5 cursor-pointer" onClick={() => setIsMoreOpen(false)} />

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">{t('common.moreFeatures')}</h3>
          <button
            type="button"
            onClick={() => setIsMoreOpen(false)}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2-column grid of options */}
        <div className="grid grid-cols-2 gap-3.5">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 px-4 h-12 rounded-xl text-sm font-semibold transition-all border border-transparent active:scale-[0.98]",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "bg-secondary/50 text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Mobile Drawer Footer Credit */}
        <div className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground/60 font-medium text-center">
          <div>BudgetBuddy Student v1.0.0</div>
          <div>© {new Date().getFullYear()} <NavLink to="/developer" onClick={() => setIsMoreOpen(false)} className="font-semibold text-foreground hover:text-primary transition-colors underline">Joyonto Karmakar</NavLink>.</div>
        </div>
      </div>

      {/* Desktop Responsive Sidebar */}
      <aside className="fixed top-0 bottom-0 left-0 z-40 hidden w-64 border-r border-border bg-card/50 backdrop-blur-md p-6 md:flex flex-col">
        {/* App Branding */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <img src="/budget-buddy.svg" className="h-9 w-9 rounded-xl shadow-md shrink-0" alt="BudgetBuddy Logo" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight">BudgetBuddy</span>
            <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest leading-none">Student</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex flex-col gap-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3.5 px-4 h-11 rounded-xl text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer Credit */}
        <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground/60 font-medium text-center space-y-1">
          <div>BudgetBuddy Student v1.0.0</div>
          <div>© {new Date().getFullYear()} <NavLink to="/developer" className="font-semibold text-foreground hover:text-primary transition-colors underline">Joyonto Karmakar</NavLink>.</div>
        </div>
      </aside>
    </>
  );
};
