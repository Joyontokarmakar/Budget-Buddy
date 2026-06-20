import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, TrendingDown, TrendingUp, Wallet, PieChart, Settings, FileText, Gem } from 'lucide-react';
import { cn } from '../utils/cn';

export const Navigation: React.FC = () => {
  const { t } = useTranslation();

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

  return (
    <>
      {/* Mobile Sticky Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border px-2 pt-2 pb-safe md:hidden shadow-lg shadow-black/5">
        <div className="flex items-center justify-around h-12 max-w-lg mx-auto">
          {navItems.map((item) => {
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
        </div>
      </nav>

      {/* Desktop Responsive Sidebar */}
      <aside className="fixed top-0 bottom-0 left-0 z-40 hidden w-64 border-r border-border bg-card/50 backdrop-blur-md p-6 md:flex flex-col">
        {/* App Branding */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-extrabold shadow-md shadow-primary/20">
            BB
          </div>
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
        <div className="pt-4 border-t border-border/50 text-[10px] text-muted-foreground/60 font-medium text-center space-y-1">
          <div>BudgetBuddy Student v1.0.0</div>
          <div>© {new Date().getFullYear()} Joyonto Karmakar.</div>
          <a
            href="https://joyontokarmakar.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors underline"
          >
            joyontokarmakar.netlify.app
          </a>
        </div>
      </aside>
    </>
  );
};
