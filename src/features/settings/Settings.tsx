/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Language, ThemeMode, Account, UserSession } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, Dialog } from '../../components/ui';
import { cn } from '../../utils/cn';
import { StatusDots } from '../../components/StatusDots';
import { Settings as SettingsIcon, User, Shield, Palette, PiggyBank, LogOut, Check, Camera, Upload, Laptop, Smartphone, Trash2, Calculator, RefreshCw } from 'lucide-react';

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
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  // Common Bills State
  const [rent, setRent] = useState(profile?.house_rent?.toString() || '264.50');
  const [healthInsurance, setHealthInsurance] = useState(profile?.health_insurance?.toString() || '151.42');
  const [radioBill, setRadioBill] = useState(profile?.radio_bill?.toString() || '18.36');
  const [mobileBill, setMobileBill] = useState(profile?.mobile_bill?.toString() || '10.00');

  // Preferred payment account IDs
  const [rentAccountId, setRentAccountId] = useState(profile?.house_rent_account_id || '');
  const [healthAccountId, setHealthAccountId] = useState(profile?.health_insurance_account_id || '');
  const [radioAccountId, setRadioAccountId] = useState(profile?.radio_bill_account_id || '');
  const [mobileAccountId, setMobileAccountId] = useState(profile?.mobile_bill_account_id || '');

  // Semester Fee State
  const [showSemesterFee, setShowSemesterFee] = useState(profile?.show_semester_fee || false);
  const [semesterFee, setSemesterFee] = useState(profile?.semester_fee?.toString() || '350.00');
  const [semesterFeeAccountId, setSemesterFeeAccountId] = useState(profile?.semester_fee_account_id || '');

  // Category Budgets State
  const [foodBudget, setFoodBudget] = useState(profile?.food_budget?.toString() || '200.00');
  const [otherBudget, setOtherBudget] = useState(profile?.other_budget?.toString() || '100.00');
  const [disabledCategories, setDisabledCategories] = useState<string[]>(profile?.disabled_categories || []);

  const [suggestedFoodBudget, setSuggestedFoodBudget] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

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
          const [accs, exps, cats] = await Promise.all([
            db.getAccounts(profile.id),
            db.getExpenses(profile.id),
            db.getCategories(profile.id)
          ]);
          setAccounts(accs);
          setExpenses(exps);
          setCategories(cats);

          // Calculate current month's food spending for suggestions
          const now = new Date();
          const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          
          const foodExpenses = exps.filter(e => {
            if (!e.date || !e.category) return false;
            const eMonthKey = e.date.substring(0, 7);
            return eMonthKey === currentMonthKey && e.category.name.toLowerCase() === 'food';
          });
          
          const foodSum = foodExpenses.reduce((sum, e) => sum + e.amount, 0);
          setSuggestedFoodBudget(foodSum);
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
      setRent(profile.house_rent !== undefined && profile.house_rent !== null ? profile.house_rent.toString() : '264.50');
      setHealthInsurance(profile.health_insurance !== undefined && profile.health_insurance !== null ? profile.health_insurance.toString() : '151.42');
      setRadioBill(profile.radio_bill !== undefined && profile.radio_bill !== null ? profile.radio_bill.toString() : '18.36');
      setMobileBill(profile.mobile_bill !== undefined && profile.mobile_bill !== null ? profile.mobile_bill.toString() : '10.00');
      setRentAccountId(profile.house_rent_account_id || '');
      setHealthAccountId(profile.health_insurance_account_id || '');
      setRadioAccountId(profile.radio_bill_account_id || '');
      setMobileAccountId(profile.mobile_bill_account_id || '');
      setShowSemesterFee(profile.show_semester_fee || false);
      setSemesterFee(profile.semester_fee !== undefined && profile.semester_fee !== null ? profile.semester_fee.toString() : '350.00');
      setSemesterFeeAccountId(profile.semester_fee_account_id || '');
      setFoodBudget(profile.food_budget !== undefined && profile.food_budget !== null ? profile.food_budget.toString() : '200.00');
      setOtherBudget(profile.other_budget !== undefined && profile.other_budget !== null ? profile.other_budget.toString() : '100.00');
      setDisabledCategories(profile.disabled_categories || []);
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
    let total = 0;
    if (!disabledCategories.includes('house_rent')) total += parseFloat(rent) || 0;
    if (!disabledCategories.includes('health_insurance')) total += parseFloat(healthInsurance) || 0;
    if (!disabledCategories.includes('radio_bill')) total += parseFloat(radioBill) || 0;
    if (!disabledCategories.includes('mobile_bill')) total += parseFloat(mobileBill) || 0;
    if (showSemesterFee && !disabledCategories.includes('semester_fee')) total += parseFloat(semesterFee) || 0;
    if (!disabledCategories.includes('food')) total += parseFloat(foodBudget) || 0;
    if (!disabledCategories.includes('other')) total += parseFloat(otherBudget) || 0;
    return total;
  };

  useEffect(() => {
    const total = calculateTotalPlannedBudget();
    setBudget(total.toFixed(2));
  }, [rent, healthInsurance, radioBill, mobileBill, semesterFee, foodBudget, otherBudget, disabledCategories, showSemesterFee]);

  const handleToggleCategory = (categoryKey: string) => {
    if (disabledCategories.includes(categoryKey)) {
      setDisabledCategories(disabledCategories.filter(c => c !== categoryKey));
    } else {
      setDisabledCategories([...disabledCategories, categoryKey]);
    }
  };

  const handleFetchPreviousMonth = () => {
    if (!profile) return;
    
    // Determine previous month (1 month back)
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Filter expenses for previous month
    const prevMonthExpenses = expenses.filter(e => {
      if (!e.date) return false;
      return e.date.substring(0, 7) === prevMonthKey;
    });
    
    const fixedBillCategories = ['House rent', 'Health Insurance', 'Radio Bill', 'Mobile bill'];
    
    let rentSum = 0;
    let healthSum = 0;
    let radioSum = 0;
    let mobileSum = 0;
    let semesterSum = 0;
    let foodSum = 0;
    let otherSum = 0;

    prevMonthExpenses.forEach(e => {
      const catName = e.category?.name || '';
      if (catName === 'House rent') {
        rentSum += Number(e.amount) || 0;
        return;
      }
      if (catName === 'Health Insurance') {
        healthSum += Number(e.amount) || 0;
        return;
      }
      if (catName === 'Radio Bill') {
        radioSum += Number(e.amount) || 0;
        return;
      }
      if (catName === 'Mobile bill') {
        mobileSum += Number(e.amount) || 0;
        return;
      }
      
      const safeItems = e.items ? (Array.isArray(e.items) ? e.items : []) : [];
      if (safeItems.length > 0) {
        safeItems.forEach((it: any) => {
          const itemCat = it.category_id ? categories.find(c => c.id === it.category_id) : null;
          const itemCatName = itemCat?.name || catName || 'Other';
          const itemAmt = Number(it.amount) || 0;
          
          if (itemCatName === 'Food') {
            foodSum += itemAmt;
          } else if (fixedBillCategories.includes(itemCatName)) {
            // Skip if somehow itemized as a bill
          } else {
            otherSum += itemAmt;
          }
        });
      } else {
        const parentCatName = catName || 'Other';
        if (parentCatName === 'Food') {
          foodSum += Number(e.amount) || 0;
        } else {
          otherSum += Number(e.amount) || 0;
        }
      }
    });

    // Update inputs: if sum > 0, use it. Otherwise, fallback to user's profile defaults (or system defaults)
    setRent(rentSum > 0 ? rentSum.toFixed(2) : (profile?.house_rent?.toString() || '264.50'));
    setHealthInsurance(healthSum > 0 ? healthSum.toFixed(2) : (profile?.health_insurance?.toString() || '151.42'));
    setRadioBill(radioSum > 0 ? radioSum.toFixed(2) : (profile?.radio_bill?.toString() || '18.36'));
    setMobileBill(mobileSum > 0 ? mobileSum.toFixed(2) : (profile?.mobile_bill?.toString() || '10.00'));
    setSemesterFee(semesterSum > 0 ? semesterSum.toFixed(2) : (profile?.semester_fee?.toString() || '350.00'));
    setFoodBudget(foodSum > 0 ? foodSum.toFixed(2) : (profile?.food_budget?.toString() || '200.00'));
    setOtherBudget(otherSum > 0 ? otherSum.toFixed(2) : (profile?.other_budget?.toString() || '100.00'));
  };



  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBudget = parseFloat(budget);
    const parsedRent = parseFloat(rent);
    const parsedHealth = parseFloat(healthInsurance);
    const parsedRadio = parseFloat(radioBill);
    const parsedMobile = parseFloat(mobileBill);
    const parsedSemester = parseFloat(semesterFee);
    const parsedFood = parseFloat(foodBudget);
    const parsedOther = parseFloat(otherBudget);

    if (isNaN(parsedBudget) || parsedBudget < 0) return;
    if (isNaN(parsedRent) || parsedRent < 0) return;
    if (isNaN(parsedHealth) || parsedHealth < 0) return;
    if (isNaN(parsedRadio) || parsedRadio < 0) return;
    if (isNaN(parsedMobile) || parsedMobile < 0) return;
    if (isNaN(parsedSemester) || parsedSemester < 0) return;
    if (isNaN(parsedFood) || parsedFood < 0) return;
    if (isNaN(parsedOther) || parsedOther < 0) return;

    setBudgetSuccess(false);
    setBudgetLoading(true);

    const { error } = await updateProfile({ 
      monthly_budget: parsedBudget,
      house_rent: parsedRent,
      health_insurance: parsedHealth,
      radio_bill: parsedRadio,
      mobile_bill: parsedMobile,
      house_rent_account_id: rentAccountId || null,
      health_insurance_account_id: healthAccountId || null,
      radio_bill_account_id: radioAccountId || null,
      mobile_bill_account_id: mobileAccountId || null,
      show_semester_fee: showSemesterFee,
      semester_fee: parsedSemester,
      semester_fee_account_id: semesterFeeAccountId || null,
      food_budget: parsedFood,
      other_budget: parsedOther,
      disabled_categories: disabledCategories
    });
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
                  onClick={() => setIsPlannerOpen(true)}
                  className="sm:w-auto w-full h-11 text-xs font-bold gap-2 shrink-0 cursor-pointer"
                >
                  <Calculator className="h-4 w-4 text-primary" />
                  Budget Calculator
                </Button>
              </div>

              <div className="border-t border-border/50 pt-3 mt-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">{t('settings.commonBills')}</span>
                <div className="space-y-4">
                  {/* Rent */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                    <span className="text-xs font-bold text-foreground">House Rent</span>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        step="0.01"
                        label="Amount (€)"
                        value={rent}
                        onChange={(e) => setRent(e.target.value)}
                        required
                      />
                      <Select
                        label="Payment Account"
                        value={rentAccountId}
                        onChange={(e) => setRentAccountId(e.target.value)}
                        options={[
                          { value: '', label: 'Select Preferred Account' },
                          ...accounts.map(a => ({ value: a.id, label: a.name }))
                        ]}
                      />
                    </div>
                  </div>

                  {/* Health Insurance */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                    <span className="text-xs font-bold text-foreground">Health Insurance</span>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        step="0.01"
                        label="Amount (€)"
                        value={healthInsurance}
                        onChange={(e) => setHealthInsurance(e.target.value)}
                        required
                      />
                      <Select
                        label="Payment Account"
                        value={healthAccountId}
                        onChange={(e) => setHealthAccountId(e.target.value)}
                        options={[
                          { value: '', label: 'Select Preferred Account' },
                          ...accounts.map(a => ({ value: a.id, label: a.name }))
                        ]}
                      />
                    </div>
                  </div>

                  {/* Radio Bill */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                    <span className="text-xs font-bold text-foreground">Radio Bill</span>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        step="0.01"
                        label="Amount (€)"
                        value={radioBill}
                        onChange={(e) => setRadioBill(e.target.value)}
                        required
                      />
                      <Select
                        label="Payment Account"
                        value={radioAccountId}
                        onChange={(e) => setRadioAccountId(e.target.value)}
                        options={[
                          { value: '', label: 'Select Preferred Account' },
                          ...accounts.map(a => ({ value: a.id, label: a.name }))
                        ]}
                      />
                    </div>
                  </div>

                  {/* Mobile Bill */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                    <span className="text-xs font-bold text-foreground">Mobile Bill</span>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        step="0.01"
                        label="Amount (€)"
                        value={mobileBill}
                        onChange={(e) => setMobileBill(e.target.value)}
                        required
                      />
                      <Select
                        label="Payment Account"
                        value={mobileAccountId}
                        onChange={(e) => setMobileAccountId(e.target.value)}
                        options={[
                          { value: '', label: 'Select Preferred Account' },
                          ...accounts.map(a => ({ value: a.id, label: a.name }))
                        ]}
                      />
                    </div>
                  </div>

                  {/* Semester Fee Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-muted/20">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground">Semester Contribution Fee</span>
                      <p className="text-[10px] text-muted-foreground">Show semester fee on bills checklist (every 6 months)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSemesterFee}
                        onChange={(e) => setShowSemesterFee(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-muted-foreground/35 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Semester Fee Inputs (Shown conditionally) */}
                  {showSemesterFee && (
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                      <span className="text-xs font-bold text-foreground">Semester Fee Details</span>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          step="0.01"
                          label="Amount (€)"
                          value={semesterFee}
                          onChange={(e) => setSemesterFee(e.target.value)}
                          required
                        />
                        <Select
                          label="Payment Account"
                          value={semesterFeeAccountId}
                          onChange={(e) => setSemesterFeeAccountId(e.target.value)}
                          options={[
                            { value: '', label: 'Select Preferred Account' },
                            ...accounts.map(a => ({ value: a.id, label: a.name }))
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" loading={budgetLoading} className="w-full mt-2">
                {budgetSuccess ? <Check className="h-4 w-4 mr-2" /> : null}
                {t('settings.saveFinancialPlan')}
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

      {/* BUDGET PLANNER CALCULATOR DIALOG */}
      <Dialog
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        title="Next Month Budget Planner"
        description="Compose your next month's spending plan by toggling categories. The sum will be saved as your target budget."
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center no-print gap-2">
            <p className="text-[10px] text-muted-foreground font-semibold">Adjust amounts or toggle items to plan next month's budget.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchPreviousMonth}
              className="h-8 text-[10px] gap-1.5 px-3 rounded-xl border border-border hover:bg-muted font-bold whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3 text-primary animate-hover" />
              <span>Fetch Previous Month</span>
            </Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border/50 bg-muted/10 max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground font-bold border-b border-border/40 uppercase tracking-wider text-[9px]">
                  <th className="py-2.5 px-3">Category / Bill</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 w-28 text-right">Amount (€)</th>
                  <th className="py-2.5 px-3 text-center w-16">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {/* House Rent */}
                <tr className={cn("transition-colors", disabledCategories.includes('house_rent') ? "bg-muted/10 opacity-60" : "hover:bg-muted/30")}>
                  <td className="py-2 px-3 font-bold text-foreground">House Rent</td>
                  <td className="py-2 px-3 font-semibold text-muted-foreground/80 truncate max-w-[120px]" title={rentAccountId ? accounts.find(a => a.id === rentAccountId)?.name : 'None'}>
                    {rentAccountId ? accounts.find(a => a.id === rentAccountId)?.name : 'No Account'}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={rent}
                      onChange={(e) => setRent(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-card px-2 py-0.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono text-right"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!disabledCategories.includes('house_rent')}
                      onChange={() => handleToggleCategory('house_rent')}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                </tr>

                {/* Health Insurance */}
                <tr className={cn("transition-colors", disabledCategories.includes('health_insurance') ? "bg-muted/10 opacity-60" : "hover:bg-muted/30")}>
                  <td className="py-2 px-3 font-bold text-foreground">Health Insurance</td>
                  <td className="py-2 px-3 font-semibold text-muted-foreground/80 truncate max-w-[120px]" title={healthAccountId ? accounts.find(a => a.id === healthAccountId)?.name : 'None'}>
                    {healthAccountId ? accounts.find(a => a.id === healthAccountId)?.name : 'No Account'}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={healthInsurance}
                      onChange={(e) => setHealthInsurance(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-card px-2 py-0.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono text-right"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!disabledCategories.includes('health_insurance')}
                      onChange={() => handleToggleCategory('health_insurance')}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                </tr>

                {/* Radio Bill */}
                <tr className={cn("transition-colors", disabledCategories.includes('radio_bill') ? "bg-muted/10 opacity-60" : "hover:bg-muted/30")}>
                  <td className="py-2 px-3 font-bold text-foreground">Radio Bill</td>
                  <td className="py-2 px-3 font-semibold text-muted-foreground/80 truncate max-w-[120px]" title={radioAccountId ? accounts.find(a => a.id === radioAccountId)?.name : 'None'}>
                    {radioAccountId ? accounts.find(a => a.id === radioAccountId)?.name : 'No Account'}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={radioBill}
                      onChange={(e) => setRadioBill(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-card px-2 py-0.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono text-right"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!disabledCategories.includes('radio_bill')}
                      onChange={() => handleToggleCategory('radio_bill')}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                </tr>

                {/* Mobile Bill */}
                <tr className={cn("transition-colors", disabledCategories.includes('mobile_bill') ? "bg-muted/10 opacity-60" : "hover:bg-muted/30")}>
                  <td className="py-2 px-3 font-bold text-foreground">Mobile Bill</td>
                  <td className="py-2 px-3 font-semibold text-muted-foreground/80 truncate max-w-[120px]" title={mobileAccountId ? accounts.find(a => a.id === mobileAccountId)?.name : 'None'}>
                    {mobileAccountId ? accounts.find(a => a.id === mobileAccountId)?.name : 'No Account'}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={mobileBill}
                      onChange={(e) => setMobileBill(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-card px-2 py-0.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono text-right"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!disabledCategories.includes('mobile_bill')}
                      onChange={() => handleToggleCategory('mobile_bill')}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                </tr>

                {/* Semester Fee */}
                {showSemesterFee && (
                  <tr className={cn("transition-colors", disabledCategories.includes('semester_fee') ? "bg-muted/10 opacity-60" : "hover:bg-muted/30")}>
                    <td className="py-2 px-3 font-bold text-foreground">Semester Fee</td>
                    <td className="py-2 px-3 font-semibold text-muted-foreground/80 truncate max-w-[120px]" title={semesterFeeAccountId ? accounts.find(a => a.id === semesterFeeAccountId)?.name : 'None'}>
                      {semesterFeeAccountId ? accounts.find(a => a.id === semesterFeeAccountId)?.name : 'No Account'}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={semesterFee}
                        onChange={(e) => setSemesterFee(e.target.value)}
                        className="w-full h-8 rounded-lg border border-border bg-card px-2 py-0.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono text-right"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={!disabledCategories.includes('semester_fee')}
                        onChange={() => handleToggleCategory('semester_fee')}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>
                  </tr>
                )}

                {/* Food / Groceries */}
                <tr className={cn("transition-colors", disabledCategories.includes('food') ? "bg-muted/10 opacity-60" : "hover:bg-muted/30")}>
                  <td className="py-2 px-3 font-bold text-foreground">Food / Groceries</td>
                  <td className="py-2 px-3 text-muted-foreground text-[10px]">
                    {suggestedFoodBudget !== null ? `Spent: €${suggestedFoodBudget.toFixed(2)}` : 'Spent: €0.00'}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={foodBudget}
                      onChange={(e) => setFoodBudget(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-card px-2 py-0.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono text-right"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!disabledCategories.includes('food')}
                      onChange={() => handleToggleCategory('food')}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                </tr>

                {/* Other Expenses */}
                <tr className={cn("transition-colors", disabledCategories.includes('other') ? "bg-muted/10 opacity-60" : "hover:bg-muted/30")}>
                  <td className="py-2 px-3 font-bold text-foreground">Other Expenses</td>
                  <td className="py-2 px-3 text-muted-foreground text-[10px]">
                    Shopping/Leisure
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={otherBudget}
                      onChange={(e) => setOtherBudget(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-card px-2 py-0.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono text-right"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!disabledCategories.includes('other')}
                      onChange={() => handleToggleCategory('other')}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-muted/40 p-3.5 rounded-xl border border-border/50 font-bold text-xs">
            <span className="text-foreground uppercase tracking-wide text-[9px]">Projected Total Budget</span>
            <span className="font-mono text-primary text-base">
              €{calculateTotalPlannedBudget().toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2.5 justify-end">
            <Button variant="outline" onClick={() => setIsPlannerOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                const total = calculateTotalPlannedBudget();
                setBudget(total.toFixed(2));
                setBudgetSuccess(false);
                
                const { error } = await updateProfile({
                  monthly_budget: total,
                  house_rent: parseFloat(rent) || 0,
                  health_insurance: parseFloat(healthInsurance) || 0,
                  radio_bill: parseFloat(radioBill) || 0,
                  mobile_bill: parseFloat(mobileBill) || 0,
                  show_semester_fee: showSemesterFee,
                  semester_fee: parseFloat(semesterFee) || 0,
                  food_budget: parseFloat(foodBudget) || 0,
                  other_budget: parseFloat(otherBudget) || 0,
                  disabled_categories: disabledCategories
                });
                
                if (!error) {
                  setBudgetSuccess(true);
                  setTimeout(() => setBudgetSuccess(false), 3000);
                }
                setIsPlannerOpen(false);
              }}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Save & Apply Plan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
