import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Language, ThemeMode } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { Settings as SettingsIcon, User, Shield, Palette, Languages, PiggyBank, LogOut, Check, Camera, Upload } from 'lucide-react';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { profile, updateProfile, updatePassword, signOut } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State
  const [name, setName] = useState(profile?.name || '');
  const [email] = useState(profile?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const avatarUrl = await db.uploadAvatar(profile.id, file);
      const { error } = await updateProfile({ avatar_url: avatarUrl });
      if (error) throw new Error(error);
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSecuritySuccess(false);
    setSecurityError(null);
    setSecurityLoading(true);

    const { error } = await updatePassword(password.trim());
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
        <Card className="bg-card/75 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-muted-foreground" />
              {t('settings.profile')}
            </CardTitle>
            <CardDescription>Update your personal details and photo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Profile Avatar Uploader */}
            <div className="flex flex-col items-center gap-3 pb-3 border-b border-border/50">
              <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile Avatar"
                    className="h-24 w-24 rounded-full object-cover border-2 border-primary shadow-md group-hover:opacity-75 transition-opacity"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-primary/10 to-violet-500/10 border-2 border-dashed border-primary/50 flex flex-col items-center justify-center text-primary group-hover:bg-primary/5 transition-colors">
                    <User className="h-8 w-8 text-primary/60 mb-0.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">Upload</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200">
                  <Camera className="h-6 w-6" />
                </div>
                {avatarUploading && (
                  <div className="absolute inset-0 bg-background/70 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary animate-pulse">Saving...</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  className="h-8 text-xs gap-1.5"
                  disabled={avatarUploading}
                >
                  <Upload className="h-3.5 w-3.5" /> Change Photo
                </Button>
                {avatarError && (
                  <p className="text-[10px] text-destructive mt-1 font-semibold">{avatarError}</p>
                )}
              </div>
            </div>

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
