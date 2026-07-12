/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Language, ThemeMode, Account, UserSession, Category } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, Dialog } from '../../components/ui';
import { cn } from '../../utils/cn';
import { StatusDots } from '../../components/StatusDots';
import { Settings as SettingsIcon, User, Shield, Palette, PiggyBank, LogOut, Check, Camera, Upload, Laptop, Smartphone, Trash2, Calculator } from 'lucide-react';

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

  // Common Bills State
  // Category Budgets State
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [catColorInput, setCatColorInput] = useState('#8b5cf6');
  const [catIconInput, setCatIconInput] = useState('HelpCircle');
  const [catIsBillInput, setCatIsBillInput] = useState(false);
  const [catBillAmtInput, setCatBillAmtInput] = useState('0.00');
  const [catPrefAccInput, setCatPrefAccInput] = useState('');

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Gemini API Key State
  const [geminiApiKey, setGeminiApiKey] = useState(profile?.gemini_api_key || '');

  // Status Dots settings state
  const [showStatusDots, setShowStatusDots] = useState(profile?.show_status_dots ?? true);

  // Session / Device states
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [currentSessionKey, setCurrentSessionKey] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!profile) return;
    try {
      setLoadingSessions(true);
      const data = await db.getUserSessions(profile.id);
      setSessions(data);
      const key = localStorage.getItem('bb_device_session_key');
      setCurrentSessionKey(key);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!profile) return;
    try {
      await db.deleteUserSession(profile.id, sessionId);
      await fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadFinancialData = async () => {
      if (profile) {
        try {
          const [accs, cats] = await Promise.all([
            db.getAccounts(profile.id),
            db.getCategories(profile.id)
          ]);
          setAccounts(accs);
          setCategories(cats);
        } catch (err) {
          console.error(err);
        }
      }
    };
    loadFinancialData();
    fetchSessions();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBudget(profile.monthly_budget?.toString() || '700');
      setGeminiApiKey(profile.gemini_api_key || '');
      // Removed static profile bills settings loading
      setShowStatusDots(profile.show_status_dots ?? true);
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileSuccess(false);
    setProfileLoading(true);
    
    const { error } = await updateProfile({ 
      name: name.trim(),
      gemini_api_key: geminiApiKey.trim() || null,
      show_status_dots: showStatusDots,
    });
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

  const calculateTotalPlannedBudget = () => {
    const activeBillsSum = categories
      .filter(c => c.is_monthly_bill && c.is_active !== false)
      .reduce((sum, c) => sum + (c.monthly_amount || 0), 0);
      
    const foodCat = categories.find(c => c.name.toLowerCase() === 'food');
    const otherCat = categories.find(c => c.name.toLowerCase() === 'other' || c.name.toLowerCase() === 'shopping');
    
    const baseGroceries = (foodCat && foodCat.is_monthly_bill) ? 0 : 200.00;
    const baseOther = (otherCat && otherCat.is_monthly_bill) ? 0 : 100.00;
    
    return activeBillsSum + baseGroceries + baseOther;
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBudget = parseFloat(budget);

    if (isNaN(parsedBudget) || parsedBudget < 0) return;

    setBudgetSuccess(false);
    setBudgetLoading(true);

    const { error } = await updateProfile({ 
      monthly_budget: parsedBudget
    });
    setBudgetLoading(false);
    if (!error) {
      setBudgetSuccess(true);
      setTimeout(() => setBudgetSuccess(false), 3000);
    }
  };

  const handleSaveCategory = async () => {
    if (!profile || !catNameInput.trim()) return;
    try {
      setBudgetLoading(true);
      if (editingCategory) {
        await db.updateCategory(profile.id, editingCategory.id, {
          name: catNameInput.trim(),
          color: catColorInput,
          icon: catIconInput,
          is_monthly_bill: catIsBillInput,
          monthly_amount: parseFloat(catBillAmtInput) || 0,
          preferred_account_id: catPrefAccInput || null,
        });
      } else {
        await db.createCategory(
          profile.id,
          catNameInput.trim(),
          catIconInput,
          catColorInput,
          catIsBillInput,
          parseFloat(catBillAmtInput) || 0,
          catPrefAccInput || null
        );
      }
      
      const updatedCats = await db.getCategories(profile.id);
      setCategories(updatedCats);
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!profile) return;
    if (!window.confirm("Are you sure you want to delete this category? Any expenses under this category will have their category set to 'Other' or null.")) return;
    try {
      setBudgetLoading(true);
      await db.deleteCategory(profile.id, catId);
      const updatedCats = await db.getCategories(profile.id);
      setCategories(updatedCats);
    } catch (err) {
      console.error('Error deleting category:', err);
    } finally {
      setBudgetLoading(false);
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
              <div className="relative group cursor-pointer h-28 w-28 flex items-center justify-center shrink-0" onClick={() => avatarInputRef.current?.click()}>
                <StatusDots />
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile Avatar"
                    className="h-[82%] w-[82%] absolute rounded-full object-cover border-2 border-primary shadow-md group-hover:opacity-75 transition-opacity z-10"
                  />
                ) : (
                  <div className="h-[82%] w-[82%] absolute rounded-full bg-gradient-to-tr from-primary/10 to-violet-500/10 border-2 border-dashed border-primary/50 flex flex-col items-center justify-center text-primary group-hover:bg-primary/5 transition-colors z-10">
                    <User className="h-7 w-7 text-primary/60 mb-0.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-primary/70">Upload</span>
                  </div>
                )}
                <div className="h-[82%] w-[82%] absolute bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 z-20">
                  <Camera className="h-5 w-5" />
                </div>
                {avatarUploading && (
                  <div className="h-[82%] w-[82%] absolute bg-background/70 rounded-full flex items-center justify-center z-20">
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
              <div className="space-y-1.5">
                <Input
                  type="password"
                  label="Gemini API Key"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <div className="flex flex-col gap-0.5 ml-1">
                  <p className="text-[10.5px] text-muted-foreground leading-normal">
                    Used for scanning receipts and automatically extracting items and details.
                  </p>
                  <Link
                    to="/settings/gemini-guide"
                    className="text-[10.5px] text-primary hover:underline font-bold self-start mt-0.5"
                  >
                    Don't know how to get API key?
                  </Link>
                </div>
              </div>

              {/* Status Dotted Circle Controls */}
              <div className="space-y-3 border-t border-border/40 pt-3">
                <div className="flex items-center justify-between ml-1 py-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-foreground">
                      Status Dotted Circle
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Show status indicators around avatar
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showStatusDots}
                    onClick={() => setShowStatusDots(!showStatusDots)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20",
                      showStatusDots ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out",
                        showStatusDots ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
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
        <Card className="bg-card/75 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PiggyBank className="h-4.5 w-4.5 text-muted-foreground" />
              {t('settings.budget')}
            </CardTitle>
            <CardDescription>Adjust your monthly student spending limit and configure common utilities.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateBudget} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    label={t('settings.budgetLabel')}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const calculated = calculateTotalPlannedBudget();
                    setBudget(calculated.toFixed(2));
                  }}
                  className="sm:w-auto w-full h-11 text-xs font-bold gap-2 shrink-0 cursor-pointer"
                >
                  <Calculator className="h-4 w-4 text-primary" />
                  Auto-Calculate
                </Button>
              </div>

              <div className="border-t border-border/50 pt-3 mt-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Expenses Categories & Budgets
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 font-bold cursor-pointer"
                    onClick={() => {
                      setEditingCategory(null);
                      setCatNameInput('');
                      setCatColorInput('#8b5cf6');
                      setCatIconInput('HelpCircle');
                      setCatIsBillInput(false);
                      setCatBillAmtInput('0.00');
                      setCatPrefAccInput('');
                      setIsCategoryModalOpen(true);
                    }}
                  >
                    + Add Category
                  </Button>
                </div>
                
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-0.5">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      className={cn(
                        "p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/10 border-border/40",
                        cat.is_active === false && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#6b7280' }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">{cat.name}</span>
                          <span className="text-[9.5px] text-muted-foreground font-semibold">
                            {cat.is_monthly_bill ? 'Monthly Fixed Cost' : 'Variable Expense'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 border-border/20 pt-2.5 sm:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-semibold block leading-none mb-0.5">Budget Amount</span>
                          <span className="font-mono text-xs font-black text-primary leading-normal">
                            €{cat.is_monthly_bill ? (cat.monthly_amount || 0).toFixed(2) : '0.00'}
                          </span>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 cursor-pointer text-primary hover:bg-primary/5 rounded-lg text-[11px] font-bold"
                            onClick={() => {
                              setEditingCategory(cat);
                              setCatNameInput(cat.name);
                              setCatColorInput(cat.color || '#8b5cf6');
                              setCatIconInput(cat.icon || 'HelpCircle');
                              setCatIsBillInput(cat.is_monthly_bill || false);
                              setCatBillAmtInput((cat.monthly_amount || 0).toString());
                              setCatPrefAccInput(cat.preferred_account_id || '');
                              setIsCategoryModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          {cat.user_id !== null && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 cursor-pointer text-destructive hover:bg-destructive/5 rounded-lg text-[11px] font-bold"
                              onClick={() => handleDeleteCategory(cat.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" loading={budgetLoading} className="w-full mt-3">
                {budgetSuccess ? <Check className="h-4 w-4 mr-2" /> : null}
                Update Monthly Budget Limit
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* PREFERENCES (APPEARANCE & LANGUAGE) */}
        <Card className="bg-card/75 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Palette className="h-4.5 w-4.5 text-muted-foreground" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your language and theme options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">{t('settings.appearance')}</span>
                <Select
                  value={profile?.theme_preference || 'system'}
                  onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
                  options={[
                    { value: 'light', label: t('settings.themes.light') },
                    { value: 'dark', label: t('settings.themes.dark') },
                    { value: 'system', label: t('settings.themes.system') },
                  ]}
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">{t('settings.language')}</span>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECURITY SETTINGS */}
        <Card className="bg-card/75 backdrop-blur-md">
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

        {/* LOGGED-IN DEVICES & SESSIONS */}
        <Card className="col-span-1 md:col-span-2 bg-card/75 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Laptop className="h-4.5 w-4.5 text-primary" />
              Logged-in Devices & Session Management
            </CardTitle>
            <CardDescription>Track active login sessions or sign out of your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Active Sessions List */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Active Devices</span>
              {loadingSessions && sessions.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <span className="text-xs text-muted-foreground animate-pulse">Loading sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No active sessions found.</p>
              ) : (
                <div className="divide-y divide-border/40 border border-border/50 rounded-2xl px-4 bg-muted/10">
                  {sessions.map((sess) => {
                    const isCurrent = sess.session_key === currentSessionKey;
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(sess.user_agent);
                    return (
                      <div key={sess.id} className="flex items-center justify-between py-4 gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 border border-border/40">
                            {isMobile ? (
                              <Smartphone className="h-4.5 w-4.5 text-primary/80" />
                            ) : (
                              <Laptop className="h-4.5 w-4.5 text-primary/80" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground truncate">{sess.device_name}</span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 rounded-md">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5 max-w-[220px] sm:max-w-sm md:max-w-xl" title={sess.user_agent}>
                              {sess.user_agent}
                            </p>
                            <p className="text-[9px] text-muted-foreground/80 mt-0.5">
                              Last Active: {new Date(sess.last_active_at).toLocaleString('de-DE')} • Signed In: {new Date(sess.created_at).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                        
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(sess.id)}
                            className="p-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/30 text-rose-500 hover:text-rose-600 active:scale-95 transition-all shrink-0 cursor-pointer"
                            title="Revoke session / Log out device"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Current Session Logout */}
            <div className="border-t border-border/50 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </span>
                <p className="text-[11px] text-muted-foreground">Log out of your active session on this device</p>
              </div>
              <Button variant="destructive" onClick={signOut} className="sm:w-auto w-full px-6 h-10 text-xs font-bold">
                Log Out Current Device
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* CATEGORY EDIT MODAL */}
      <Dialog
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create Custom Category'}
        footer={
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => {
              setIsCategoryModalOpen(false);
              setEditingCategory(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} loading={budgetLoading}>
              Save Category
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <Input
            type="text"
            label="Category Name"
            value={catNameInput}
            onChange={(e) => setCatNameInput(e.target.value)}
            required
            disabled={editingCategory?.user_id === null}
          />
          
          <div className="grid grid-cols-2 gap-3.5">
            <Input
              type="color"
              label="Theme Color"
              value={catColorInput}
              onChange={(e) => setCatColorInput(e.target.value)}
              className="h-10 cursor-pointer p-1"
            />
            <Select
              label="Icon"
              value={catIconInput}
              onChange={(e) => setCatIconInput(e.target.value)}
              options={[
                { value: 'ShoppingCart', label: 'Shopping Cart' },
                { value: 'Utensils', label: 'Utensils / Food' },
                { value: 'Home', label: 'Home / Rent' },
                { value: 'HeartPulse', label: 'Heart / Health' },
                { value: 'Tv', label: 'TV / Radio' },
                { value: 'Smartphone', label: 'Phone / Internet' },
                { value: 'BookOpen', label: 'Book / Education' },
                { value: 'Tag', label: 'Tag / Shopping' },
                { value: 'Coffee', label: 'Coffee / Restaurant' },
                { value: 'Sparkles', label: 'Sparkles / Cosmetics' },
                { value: 'Activity', label: 'Activity / Medicine' },
                { value: 'Laptop', label: 'Laptop / Electronic' },
                { value: 'HelpCircle', label: 'Help / Other' },
              ]}
            />
          </div>

          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/10 space-y-3.5 pt-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Monthly Recurring Bill</span>
                <p className="text-[10px] text-muted-foreground">Log automatically on the monthly bills checklist</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={catIsBillInput}
                  onChange={(e) => setCatIsBillInput(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-muted-foreground/35 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            {catIsBillInput && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/20">
                <Input
                  type="number"
                  step="0.01"
                  label="Monthly Cost (€)"
                  value={catBillAmtInput}
                  onChange={(e) => setCatBillAmtInput(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
                <Select
                  label="Preferred Account"
                  value={catPrefAccInput}
                  onChange={(e) => setCatPrefAccInput(e.target.value)}
                  options={[
                    { value: '', label: 'Select Preferred Account' },
                    ...accounts.map(a => ({ value: a.id, label: a.name }))
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
};
