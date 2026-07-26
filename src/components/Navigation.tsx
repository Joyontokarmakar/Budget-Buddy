import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, TrendingDown, TrendingUp, Wallet, PieChart, Settings, FileText, Gem, X, Trash2, UserPlus, LogOut, ChevronUp, ChevronDown, Coins, Sun, Moon, Laptop, Globe } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui';

interface NavigationProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const { profile, switchAccount, addAnotherAccount, signOutAccount, signOut } = useAuthStore();

  const savedProfilesJson = localStorage.getItem('bb_saved_profiles');
  const savedProfiles = savedProfilesJson ? JSON.parse(savedProfilesJson) : [];
  const otherProfiles = savedProfiles.filter((p: any) => p.id !== profile?.id);

  const currentTheme = profile?.theme_preference || 'system';
  const currentLang = profile?.preferred_language || i18n.language || 'de';

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

  const toggleTheme = async () => {
    if (!profile) return;
    const nextTheme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
    try {
      await useAuthStore.getState().updateProfile({ theme_preference: nextTheme });
    } catch (err) {
      console.error('Failed to toggle theme:', err);
    }
  };

  const toggleLanguage = async () => {
    if (!profile) return;
    const nextLang = currentLang === 'de' ? 'en' : 'de';
    try {
      await useAuthStore.getState().updateProfile({ preferred_language: nextLang });
      i18n.changeLanguage(nextLang);
    } catch (err) {
      console.error('Failed to toggle language:', err);
    }
  };

  const getThemeIcon = () => {
    if (currentTheme === 'light') return <Sun className="h-4 w-4" />;
    if (currentTheme === 'dark') return <Moon className="h-4 w-4" />;
    return <Laptop className="h-4 w-4" />;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* App Branding */}
      <div className="flex items-center justify-between mb-6 px-2 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/budget-buddy.svg" className="h-9 w-9 rounded-xl shadow-md shrink-0" alt="Budget buddy Logo" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm tracking-tight text-foreground">Budget buddy</span>
            <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest leading-none">Student</span>
          </div>
        </div>
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile} 
            className="md:hidden p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sidebar Nav Links */}
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center gap-3.5 px-4 h-11 rounded-xl text-sm font-semibold transition-all duration-200 relative cursor-pointer z-10',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/15 font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 dark:hover:bg-muted/40 font-medium'
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* User Profile / Account Switcher */}
      {profile && (
        <div className="border-t border-border/50 pt-4 mb-3 shrink-0 relative z-20">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-secondary/80 dark:hover:bg-muted/80 active:scale-[0.98] transition-all text-left cursor-pointer"
          >
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md shrink-0">
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
                <div key={p.id} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-muted/85 transition-colors">
                  <button
                    type="button"
                    onClick={() => {
                      switchAccount(p.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="flex items-center gap-2.5 flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold text-xs shrink-0">
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
                    className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0 cursor-pointer"
                    title="Remove Account"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={async () => {
                  if (onCloseMobile) onCloseMobile();
                  await addAnotherAccount();
                  window.location.reload();
                }}
                className="flex items-center gap-2.5 w-full p-1.5 rounded-xl hover:bg-primary/5 text-primary text-xs font-bold text-left transition-colors cursor-pointer"
              >
                <div className="h-7 w-7 rounded-full border border-dashed border-primary/40 flex items-center justify-center shrink-0">
                  <UserPlus className="h-3.5 w-3.5" />
                </div>
                <span>Add Another Account</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (onCloseMobile) onCloseMobile();
                  await signOut();
                  window.location.reload();
                }}
                className="flex items-center gap-2.5 w-full p-1.5 rounded-xl hover:bg-destructive/5 text-destructive text-xs font-bold text-left transition-colors cursor-pointer"
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

      {/* Quick Settings & Toggles inside Mobile Menu */}
      <div className="flex items-center justify-around border-t border-border/50 pt-3 pb-2 shrink-0 md:hidden">
        <Button variant="ghost" size="icon" onClick={toggleLanguage} className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer">
          <Globe className="h-4 w-4 mr-0.5" />
          <span className="text-[10px] font-bold uppercase">{currentLang.slice(0, 2)}</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer">
          {getThemeIcon()}
        </Button>
        <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9 text-muted-foreground hover:text-destructive cursor-pointer">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Footer Credit */}
      <div className="pt-3 border-t border-border/50 text-[10px] text-muted-foreground/60 font-medium text-center space-y-0.5 shrink-0">
        <div>Budget buddy Student v1.0.0</div>
        <div>© {new Date().getFullYear()} <NavLink to="/developer" onClick={onCloseMobile} className="font-semibold text-foreground hover:text-primary transition-colors underline">Joyonto Karmakar</NavLink>.</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (Hamburger Menu Sidebar) */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity md:hidden animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-card border-r border-border p-5 z-50 md:hidden animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </div>
        </>
      )}

      {/* Desktop Responsive Sidebar */}
      <aside className="fixed top-0 bottom-0 left-0 z-40 hidden w-64 border-r border-border bg-card/50 backdrop-blur-md p-6 md:flex flex-col">
        <SidebarContent />
      </aside>
    </>
  );
};

