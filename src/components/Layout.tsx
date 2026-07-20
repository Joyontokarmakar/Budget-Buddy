import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, LogOut, Laptop, Globe, Search, ChevronDown, User } from 'lucide-react';
import { Button } from './ui';
import { GlobalSearch } from './GlobalSearch';

import { StatusDots } from './StatusDots';

export const Layout: React.FC = () => {
  const { profile, signOut } = useAuthStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

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
        <header className="sticky top-0 z-40 h-[calc(4rem+env(safe-area-inset-top))] safe-pt border-b border-border/60 bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="relative">
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="group flex items-center gap-2.5 hover:bg-muted/50 p-1.5 rounded-xl transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/10 border-none"
            >
              <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
                <StatusDots />
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="h-[82%] w-[82%] absolute rounded-full object-cover border border-border/80 shadow-xs"
                  />
                ) : (
                  <div className="h-[82%] w-[82%] absolute rounded-full bg-gradient-to-tr from-primary/20 to-violet-500/20 border border-border/60 flex items-center justify-center text-primary font-black text-xs uppercase">
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
