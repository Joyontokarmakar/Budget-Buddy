import { Outlet, useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, LogOut, Laptop, Globe } from 'lucide-react';
import { Button } from './ui';

export const Layout: React.FC = () => {
  const { profile, signOut } = useAuthStore();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

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
        <header className="sticky top-0 z-30 h-16 border-b border-border/60 bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-semibold">Willkommen / Welcome</span>
            <span className="text-sm font-bold truncate max-w-[180px] sm:max-w-[300px]">
              {profile?.name || 'Student'}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
        <main className="flex-1 px-4 py-6 md:p-8 pb-20 md:pb-8 max-w-5xl w-full mx-auto safe-pb">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
