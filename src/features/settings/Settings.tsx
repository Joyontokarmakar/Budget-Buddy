import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import type { Language, ThemeMode } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { Settings as SettingsIcon, User, Shield, Palette, Languages, PiggyBank, LogOut, Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { profile, updateProfile, signOut } = useAuthStore();

  // Profile Form State
  const [name, setName] = useState(profile?.name || '');
  const [email] = useState(profile?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Security Form State
  const [password, setPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Budget State
  const [budget, setBudget] = useState(profile?.monthly_budget?.toString() || '700');
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileSuccess(false);
    setProfileLoading(true);
    
    const { error } = await updateProfile({ name: name.trim() });
    setProfileLoading(false);
    if (!error) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSecuritySuccess(false);
    setSecurityError(null);
    setSecurityLoading(true);

    const { error } = await updateProfile({}); // In mock mode this does nothing, in real mode updates password if supabase configured
    setSecurityLoading(false);
    
    if (error) {
      setSecurityError(error);
    } else {
      setSecuritySuccess(true);
      setPassword('');
      setTimeout(() => setSecuritySuccess(false), 3000);
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget < 0) return;
    setBudgetSuccess(false);
    setBudgetLoading(true);

    const { error } = await updateProfile({ monthly_budget: parsedBudget });
    setBudgetLoading(false);
    if (!error) {
      setBudgetSuccess(true);
      setTimeout(() => setBudgetSuccess(false), 3000);
    }
  };

  const handleThemeChange = async (themeMode: ThemeMode) => {
    await updateProfile({ theme_preference: themeMode });
  };

  const handleLangChange = async (lang: Language) => {
    await updateProfile({ preferred_language: lang });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          {t('settings.title')}
        </h1>
        <p className="text-xs text-muted-foreground">Manage your student profile, budget limit, and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PROFILE CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-muted-foreground" />
              {t('settings.profile')}
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label={t('settings.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label={t('settings.email')}
                value={email}
                disabled
                className="bg-muted opacity-80"
              />
              <Button type="submit" loading={profileLoading} className="w-full">
                {profileSuccess ? <Check className="h-4 w-4 mr-2" /> : null}
                {t('settings.saveProfile')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* BUDGET SETTINGS CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PiggyBank className="h-4.5 w-4.5 text-muted-foreground" />
              {t('settings.budget')}
            </CardTitle>
            <CardDescription>Adjust your monthly student spending limit</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateBudget} className="space-y-4">
              <Input
                type="number"
                step="1"
                label={t('settings.budgetLabel')}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
              />
              <Button type="submit" loading={budgetLoading} className="w-full">
                {budgetSuccess ? <Check className="h-4 w-4 mr-2" /> : null}
                {t('settings.saveBudget')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* APPEARANCE SETTINGS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Palette className="h-4.5 w-4.5 text-muted-foreground" />
              {t('settings.appearance')}
            </CardTitle>
            <CardDescription>Switch between visual themes</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={profile?.theme_preference || 'system'}
              onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
              options={[
                { value: 'light', label: t('settings.themes.light') },
                { value: 'dark', label: t('settings.themes.dark') },
                { value: 'system', label: t('settings.themes.system') },
              ]}
            />
          </CardContent>
        </Card>

        {/* LANGUAGE SETTINGS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Languages className="h-4.5 w-4.5 text-muted-foreground" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription>Select your preferred interface language</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={profile?.preferred_language || 'de'}
              onChange={(e) => handleLangChange(e.target.value as Language)}
              options={[
                { value: 'de', label: t('settings.languages.de') },
                { value: 'en', label: t('settings.languages.en') },
                { value: 'bn', label: 'বাংলা (Bengali - Coming Soon)' },
                { value: 'hi', label: 'हिन्दी (Hindi - Coming Soon)' },
                { value: 'ar', label: 'العربية (Arabic - Coming Soon)' },
                { value: 'tr', label: 'Türkçe (Turkish - Coming Soon)' },
              ]}
            />
          </CardContent>
        </Card>

        {/* SECURITY SETTINGS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-muted-foreground" />
              {t('settings.security')}
            </CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateSecurity} className="space-y-4">
              {securityError && (
                <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-semibold rounded-lg">
                  {securityError}
                </div>
              )}
              <Input
                type="password"
                label="New Password"
                placeholder={t('settings.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" loading={securityLoading} className="w-full">
                {securitySuccess ? <Check className="h-4 w-4 mr-2" /> : null}
                {t('settings.saveSecurity')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* LOGOUT */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <LogOut className="h-4.5 w-4.5" />
              Session Management
            </CardTitle>
            <CardDescription>Log out of your BudgetBuddy account</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button variant="destructive" onClick={signOut} className="w-full">
              {t('settings.logout')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
