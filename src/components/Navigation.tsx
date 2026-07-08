import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, TrendingDown, TrendingUp, Wallet, PieChart, Settings, FileText, Gem, Menu, X, Trash2, UserPlus, LogOut, ChevronUp, ChevronDown, Coins } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuthStore } from '../stores/authStore';

export const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredDesktopIndex, setHoveredDesktopIndex] = useState<number | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileProfileMenuOpen, setIsMobileProfileMenuOpen] = useState(false);

  const { profile, switchAccount, addAnotherAccount, signOutAccount, signOut } = useAuthStore();

  const savedProfilesJson = localStorage.getItem('bb_saved_profiles');
  const savedProfiles = savedProfilesJson ? JSON.parse(savedProfilesJson) : [];
  const otherProfiles = savedProfiles.filter((p: any) => p.id !== profile?.id);

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/expenses', label: t('nav.expenses'), icon: TrendingDown },
    { to: '/income', label: t('nav.income'), icon: TrendingUp },
    { to: '/accounts', label: t('nav.accounts'), icon: Wallet },
    { to: '/deposits-loans', label: t('nav.depositsLoans') || 'Deposits & Loans', icon: Coins },
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
    { to: '/deposits-loans', label: t('nav.depositsLoans') || 'Deposits & Loans', icon: Coins },
    { to: '/analytics', label: t('nav.analytics'), icon: PieChart },
    { to: '/assets', label: t('nav.assets'), icon: Gem },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const isSecondaryActive = secondaryItems.some(item => location.pathname === item.to);

  const getActiveIndex = () => {
    if (isSecondaryActive || isMoreOpen) return 4;
    if (location.pathname === '/') return 0;
    if (location.pathname === '/expenses') return 1;
    if (location.pathname === '/income') return 2;
    if (location.pathname === '/reports') return 3;
    return -1;
  };
  const activeIndex = getActiveIndex();

  const getDesktopActiveIndex = () => {
    if (location.pathname === '/') return 0;
    if (location.pathname === '/expenses') return 1;
    if (location.pathname === '/income') return 2;
    if (location.pathname === '/accounts') return 3;
    if (location.pathname === '/deposits-loans') return 4;
    if (location.pathname === '/analytics') return 5;
    if (location.pathname === '/reports') return 6;
    if (location.pathname === '/assets') return 7;
    if (location.pathname === '/settings') return 8;
    return -1;
  };
  const desktopActiveIndex = getDesktopActiveIndex();

  return (
    <>
      <nav className="fixed bottom-5 left-4 right-4 z-40 md:hidden max-w-md mx-auto bg-card/85 dark:bg-card/75 backdrop-blur-xl border border-border/80 rounded-full shadow-xl shadow-black/10 px-2 py-1.5 transition-all duration-300">
        <div className="flex items-center justify-around h-11 max-w-lg mx-auto gap-1 relative">
          
          {/* Active Tab Indicator (Regular Inset Sized Pill) */}
          {activeIndex !== -1 && (
            <div
              className="absolute inset-y-0 rounded-full bg-secondary/85 dark:bg-muted/80 border border-black/5 dark:border-white/5 transition-all duration-450 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-0 shadow-xs"
              style={{
                width: 'calc(20% - 4px)',
                left: `calc(${activeIndex} * 20% + 2px)`,
              }}
            />
          )}

          {/* Hover Tab Indicator (Larger Bulging Liquid Sized Pill) */}
          <div
            className={cn(
              "absolute inset-y-0 rounded-full bg-secondary/40 dark:bg-secondary/20 border-2 border-primary/25 dark:border-white/25 backdrop-blur-xs transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-0 shadow-md",
              hoveredIndex !== null && hoveredIndex !== activeIndex ? "opacity-100 scale-110" : "opacity-0 scale-95"
            )}
            style={{
              width: 'calc(20% - 4px)',
              left: `calc(${hoveredIndex ?? 0} * 20% + 2px)`,
            }}
          />

          {primaryItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center flex-1 h-full py-1 px-2 rounded-xl text-muted-foreground transition-all duration-300 relative cursor-pointer z-10',
                    isActive 
                      ? 'text-primary font-bold scale-102' 
                      : 'hover:text-foreground active:scale-95'
                  )
                }
              >
                <Icon className="h-4.5 w-4.5 transition-transform duration-200" />
                <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-[65px]">{item.label}</span>
              </NavLink>
            );
          })}

          {/* More trigger button on mobile */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            onMouseEnter={() => setHoveredIndex(4)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 px-2 rounded-xl text-muted-foreground transition-all duration-300 relative cursor-pointer z-10',
              isSecondaryActive || isMoreOpen 
                ? 'text-primary font-bold scale-102' 
                : 'hover:text-foreground active:scale-95'
            )}
          >
            <Menu className="h-4.5 w-4.5 transition-transform duration-200" />
            <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate">{t('common.more')}</span>
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

        {/* User Profile / Account Switcher (Mobile) */}
        {profile && (
          <div className="mb-4 bg-muted/40 border border-border/60 rounded-2xl p-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
                  {profile.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">{profile.name}</div>
                  <div className="text-[10px] text-muted-foreground">{profile.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileProfileMenuOpen(!isMobileProfileMenuOpen)}
                className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg hover:bg-primary/20 active:scale-95 transition-all"
              >
                {isMobileProfileMenuOpen ? 'Close' : 'Switch'}
              </button>
            </div>

            {isMobileProfileMenuOpen && (
              <div className="mt-3 pt-3 border-t border-border/40 space-y-2.5 max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">Switch Account</div>
                
                {otherProfiles.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-muted/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => switchAccount(p.id)}
                      className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                    >
                      <div className="h-7 w-7 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold text-xs">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{p.name}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{p.email}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => signOutAccount(p.id)}
                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      title="Remove Account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={async () => {
                    setIsMoreOpen(false);
                    await addAnotherAccount();
                    window.location.reload();
                  }}
                  className="flex items-center gap-2.5 w-full p-1.5 rounded-xl hover:bg-primary/5 text-primary text-xs font-bold text-left transition-colors"
                >
                  <div className="h-7 w-7 rounded-full border border-dashed border-primary/40 flex items-center justify-center shrink-0">
                    <UserPlus className="h-3.5 w-3.5" />
                  </div>
                  <span>Add Another Account</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsMoreOpen(false);
                    await signOut();
                    window.location.reload();
                  }}
                  className="flex items-center gap-2.5 w-full p-1.5 rounded-xl hover:bg-destructive/5 text-destructive text-xs font-bold text-left transition-colors"
                >
                  <div className="h-7 w-7 rounded-full border border-dashed border-destructive/40 flex items-center justify-center shrink-0">
                    <LogOut className="h-3.5 w-3.5" />
                  </div>
                  <span>Sign Out Active</span>
                </button>
              </div>
            )}
          </div>
        )}

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
          <div>Budgetbuddy Student v1.0.0</div>
          <div>© {new Date().getFullYear()} <NavLink to="/developer" onClick={() => setIsMoreOpen(false)} className="font-semibold text-foreground hover:text-primary transition-colors underline">Joyonto Karmakar</NavLink>.</div>
        </div>
      </div>

      {/* Desktop Responsive Sidebar */}
      <aside className="fixed top-0 bottom-0 left-0 z-40 hidden w-64 border-r border-border bg-card/50 backdrop-blur-md p-6 md:flex flex-col">
        {/* App Branding */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <img src="/budget-buddy.svg" className="h-9 w-9 rounded-xl shadow-md shrink-0" alt="Budgetbuddy Logo" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight">Budgetbuddy</span>
            <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest leading-none">Student</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex flex-col gap-1.5 flex-1 relative">
          {/* Desktop Sliding Active Indicator */}
          {desktopActiveIndex !== -1 && (
            <div
              className="absolute left-0 right-0 h-11 rounded-xl bg-primary shadow-md shadow-primary/10 transition-all duration-450 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-0"
              style={{
                top: `${desktopActiveIndex * 50}px`,
              }}
            />
          )}

          {/* Desktop Sliding Hover Indicator */}
          <div
            className={cn(
              "absolute left-0 right-0 h-11 rounded-xl bg-secondary dark:bg-muted transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-0",
              hoveredDesktopIndex !== null && hoveredDesktopIndex !== desktopActiveIndex ? "opacity-100 scale-102" : "opacity-0 scale-95"
            )}
            style={{
              top: `${(hoveredDesktopIndex ?? 0) * 50}px`,
            }}
          />

          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => setHoveredDesktopIndex(idx)}
                onMouseLeave={() => setHoveredDesktopIndex(null)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3.5 px-4 h-11 rounded-xl text-sm font-semibold transition-all duration-200 relative cursor-pointer z-10',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Profile / Account Switcher (Desktop) */}
        {profile && (
          <div className="border-t border-border/50 pt-4 mb-4 relative z-20">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-secondary/80 active:scale-[0.98] transition-all text-left"
            >
              <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md">
                {profile.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate">{profile.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{profile.email}</div>
              </div>
              {isProfileMenuOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl p-3 shadow-xl space-y-2.5 max-h-56 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">Switch Account</div>
                
                {otherProfiles.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-muted/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => switchAccount(p.id)}
                      className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                    >
                      <div className="h-7 w-7 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold text-xs">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{p.name}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{p.email}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => signOutAccount(p.id)}
                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      title="Remove Account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={async () => {
                    await addAnotherAccount();
                    window.location.reload();
                  }}
                  className="flex items-center gap-2.5 w-full p-1.5 rounded-xl hover:bg-primary/5 text-primary text-xs font-bold text-left transition-colors"
                >
                  <div className="h-7 w-7 rounded-full border border-dashed border-primary/40 flex items-center justify-center shrink-0">
                    <UserPlus className="h-3.5 w-3.5" />
                  </div>
                  <span>Add Another Account</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    window.location.reload();
                  }}
                  className="flex items-center gap-2.5 w-full p-1.5 rounded-xl hover:bg-destructive/5 text-destructive text-xs font-bold text-left transition-colors"
                >
                  <div className="h-7 w-7 rounded-full border border-dashed border-destructive/40 flex items-center justify-center shrink-0">
                    <LogOut className="h-3.5 w-3.5" />
                  </div>
                  <span>Sign Out Active</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Credit */}
        <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground/60 font-medium text-center space-y-1">
          <div>Budgetbuddy Student v1.0.0</div>
          <div>© {new Date().getFullYear()} <NavLink to="/developer" className="font-semibold text-foreground hover:text-primary transition-colors underline">Joyonto Karmakar</NavLink>.</div>
        </div>
      </aside>
    </>
  );
};
