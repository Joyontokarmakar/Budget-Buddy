import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Account, DepositWithDetails, LoanWithDetails, Category, EMIWithDetails } from '../../types';
import { Button, Input, Select, Card, CardContent, Dialog, Spinner } from '../../components/ui';
import { Coins, Plus, Trash2, Calendar, Landmark, FileText, CheckCircle, History, TrendingUp, ArrowDownLeft, ArrowUpRight, CreditCard, Percent } from 'lucide-react';

export const DepositsLoans: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  
  // Loading & Data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deposits, setDeposits] = useState<DepositWithDetails[]>([]);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [emis, setEmis] = useState<EMIWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View states
  const [activeTab, setActiveTab] = useState<'deposits' | 'loans' | 'emis'>('deposits');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [expandedEmiId, setExpandedEmiId] = useState<string | null>(null);

  // Deposit Dialog & Form states
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depAmount, setDepAmount] = useState('');
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0]);
  const [depTime, setDepTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [depAccountId, setDepAccountId] = useState('');
  const [depSource, setDepSource] = useState('');
  const [depNotes, setDepNotes] = useState('');
  const [depSaving, setDepSaving] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);

  // Loan Dialog & Form states
  const [isLoanOpen, setIsLoanOpen] = useState(false);
  const [loanType, setLoanType] = useState<'taken' | 'provided'>('taken');
  const [loanPerson, setLoanPerson] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [loanSaving, setLoanSaving] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanEstPayDate, setLoanEstPayDate] = useState('');

  // Repayment Dialog & Form states
  const [selectedLoan, setSelectedLoan] = useState<LoanWithDetails | null>(null);
  const [repAmount, setRepAmount] = useState('');
  const [repDate, setRepDate] = useState(new Date().toISOString().split('T')[0]);
  const [repAccountId, setRepAccountId] = useState('');
  const [repNotes, setRepNotes] = useState('');
  const [repSaving, setRepSaving] = useState(false);
  const [repError, setRepError] = useState<string | null>(null);

  // Fetch all data
  const loadData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [accs, deps, lns, ems, cats, exps] = await Promise.all([
        db.getAccounts(profile.id),
        db.getDeposits(profile.id),
        db.getLoans(profile.id),
        db.getEmis(profile.id),
        db.getCategories(profile.id),
        db.getExpenses(profile.id),
      ]);
      setAccounts(accs);
      setDeposits(deps);
      setLoans(lns);
      setExpenses(exps);
      setCategories(cats);
      
      const emsWithDetails = ems.map(e => ({
        ...e,
        category: cats.find(c => c.id === e.category_id) || null
      }));
      setEmis(emsWithDetails);
      
      // Pre-select default account for forms
      if (accs.length > 0) {
        const defaultAcc = accs.find(a => a.is_default) || accs[0];
        setDepAccountId(defaultAcc.id);
        setLoanAccountId(defaultAcc.id);
        setRepAccountId(defaultAcc.id);
      }

      // Pre-select default category for EMI form
      if (cats.length > 0) {
        const defaultCat = cats.find(c => c.name.toLowerCase() === 'shopping' || c.name.toLowerCase() === 'electronic') || cats[0];
        setEmiCategoryId(defaultCat.id);
      }
    } catch (e) {
      console.error('Error loading deposits & loans:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Calculations for KPI Cards
  const totalDeposited = useMemo(() => deposits.reduce((sum, d) => sum + d.amount, 0), [deposits]);
  
  const loansTakenSummary = useMemo(() => {
    const taken = loans.filter(l => l.type === 'taken');
    const original = taken.reduce((sum, l) => sum + l.amount, 0);
    const outstanding = taken.reduce((sum, l) => sum + l.remaining_amount, 0);
    return { original, outstanding, repaid: original - outstanding };
  }, [loans]);

  const loansProvidedSummary = useMemo(() => {
    const provided = loans.filter(l => l.type === 'provided');
    const original = provided.reduce((sum, l) => sum + l.amount, 0);
    const outstanding = provided.reduce((sum, l) => sum + l.remaining_amount, 0);
    return { original, outstanding, repaid: original - outstanding };
  }, [loans]);

  const emisSummary = useMemo(() => {
    let totalLiability = 0;
    let activeCount = 0;
    
    emis.forEach(emi => {
      const paidInstallmentsCount = expenses.filter(e => e.emi_id === emi.id).length;
      if (paidInstallmentsCount < emi.emi_months) {
        activeCount++;
        const remainingMonths = emi.emi_months - paidInstallmentsCount;
        totalLiability += remainingMonths * emi.installment_amount;
      }
    });
    
    return {
      activeCount,
      totalLiability
    };
  }, [emis, expenses]);

  // Form Handlers
  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setDepError(null);

    const amount = parseFloat(depAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepError(t('common.error') + ': Enter a valid positive amount');
      return;
    }
    if (!depSource.trim()) {
      setDepError(t('common.error') + ': Enter a source descriptor');
      return;
    }
    if (!depAccountId) {
      setDepError(t('common.error') + ': Select an account');
      return;
    }

    try {
      setDepSaving(true);
      await db.createDeposit(profile.id, {
        amount,
        date: depDate,
        time: depTime,
        to_account_id: depAccountId,
        source: depSource.trim(),
        notes: depNotes.trim() || null,
      });

      // Reset form
      setDepAmount('');
      setDepSource('');
      setDepNotes('');
      setDepDate(new Date().toISOString().split('T')[0]);
      setIsDepositOpen(false);
      await loadData();
    } catch (err: any) {
      setDepError(err.message || 'Failed to save deposit');
    } finally {
      setDepSaving(false);
    }
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoanError(null);

    const amount = parseFloat(loanAmount);
    if (isNaN(amount) || amount <= 0) {
      setLoanError(t('common.error') + ': Enter a valid positive amount');
      return;
    }
    if (!loanPerson.trim()) {
      setLoanError(t('common.error') + ': Enter the person\'s name');
      return;
    }
    try {
      setLoanSaving(true);
      await db.createLoan(profile.id, {
        type: loanType,
        person: loanPerson.trim(),
        amount,
        date: loanDate,
        account_id: loanAccountId === 'none' || !loanAccountId ? null : loanAccountId,
        notes: loanNotes.trim() || null,
        estimated_pay_date: loanEstPayDate || null
      });

      // Reset form
      setLoanAmount('');
      setLoanPerson('');
      setLoanNotes('');
      setLoanDate(new Date().toISOString().split('T')[0]);
      setLoanEstPayDate('');
      setIsLoanOpen(false);
      await loadData();
    } catch (err: any) {
      setLoanError(err.message || 'Failed to save loan');
    } finally {
      setLoanSaving(false);
    }
  };

  const handleLogRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedLoan) return;
    setRepError(null);

    const amount = parseFloat(repAmount);
    if (isNaN(amount) || amount <= 0) {
      setRepError(t('common.error') + ': Enter a valid positive amount');
      return;
    }
    if (amount > selectedLoan.remaining_amount) {
      setRepError(t('common.error') + `: Repayment cannot exceed outstanding remaining amount (€${selectedLoan.remaining_amount.toFixed(2)})`);
      return;
    }
    if (!repAccountId) {
      setRepError(t('common.error') + ': Select an account');
      return;
    }

    try {
      setRepSaving(true);
      await db.createLoanPayment(profile.id, selectedLoan.id, {
        amount,
        date: repDate,
        account_id: repAccountId,
        notes: repNotes.trim() || null,
      });

      // Reset
      setRepAmount('');
      setRepNotes('');
      setRepDate(new Date().toISOString().split('T')[0]);
      setSelectedLoan(null);
      await loadData();
    } catch (err: any) {
      setRepError(err.message || 'Failed to log repayment');
    } finally {
      setRepSaving(false);
    }
  };

  const handleDeleteDeposit = async (id: string) => {
    if (!profile) return;
    if (!window.confirm(t('depositsLoans.deleteConfirmDeposit'))) return;

    try {
      await db.deleteDeposit(profile.id, id);
      await loadData();
    } catch (err) {
      console.error('Error deleting deposit:', err);
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!profile) return;
    if (!window.confirm(t('depositsLoans.deleteConfirmLoan'))) return;

    try {
      await db.deleteLoan(profile.id, id);
      await loadData();
    } catch (err) {
      console.error('Error deleting loan:', err);
    }
  };

  // Helper to open repayment modal
  const openRepaymentModal = (loan: LoanWithDetails) => {
    setSelectedLoan(loan);
    setRepAmount(loan.remaining_amount.toString());
    setRepNotes(`Repayment for ${loan.person}`);
    setRepError(null);
  };

  const formatCurrency = (val: number) => {
    return `€${val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // EMI Dialog & Form states
  const [isEmiOpen, setIsEmiOpen] = useState(false);
  const [emiItemName, setEmiItemName] = useState('');
  const [emiBuyDate, setEmiBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [emiMonths, setEmiMonths] = useState('6');
  const [emiTotalAmount, setEmiTotalAmount] = useState('');
  const [emiInstallmentAmount, setEmiInstallmentAmount] = useState('');
  const [emiInterestRate, setEmiInterestRate] = useState('0');
  const [emiActualPrice, setEmiActualPrice] = useState('');
  const [emiCategoryId, setEmiCategoryId] = useState('');
  const [emiSaving, setEmiSaving] = useState(false);
  const [emiError, setEmiError] = useState<string | null>(null);

  // Auto-calculates Total Amount and Actual Price when Installment Amount or Months change
  useEffect(() => {
    const months = parseInt(emiMonths) || 0;
    const installment = parseFloat(emiInstallmentAmount) || 0;
    if (months > 0 && installment > 0) {
      const calcTotal = (months * installment).toFixed(2);
      setEmiTotalAmount(calcTotal);
      if (!emiActualPrice || emiActualPrice === '0' || emiActualPrice === '') {
        setEmiActualPrice(calcTotal);
      }
    }
  }, [emiInstallmentAmount, emiMonths]);

  // If total amount changes, initialize actual price if not set
  useEffect(() => {
    const total = parseFloat(emiTotalAmount) || 0;
    if (total > 0 && (!emiActualPrice || emiActualPrice === '0' || emiActualPrice === '')) {
      setEmiActualPrice(total.toFixed(2));
    }
  }, [emiTotalAmount]);

  const handleAddEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setEmiError(null);

    const totalAmt = parseFloat(emiTotalAmount);
    const instAmt = parseFloat(emiInstallmentAmount);
    const months = parseInt(emiMonths);
    const rate = parseFloat(emiInterestRate);
    const actPrice = parseFloat(emiActualPrice);

    if (!emiItemName.trim()) {
      setEmiError(t('common.error') + ': Enter item name');
      return;
    }
    if (isNaN(months) || months <= 0) {
      setEmiError(t('common.error') + ': Enter a valid EMI months');
      return;
    }
    if (isNaN(totalAmt) || totalAmt < 0) {
      setEmiError(t('common.error') + ': Enter a valid total amount');
      return;
    }
    if (isNaN(instAmt) || instAmt < 0) {
      setEmiError(t('common.error') + ': Enter a valid installment amount');
      return;
    }
    if (isNaN(rate) || rate < 0) {
      setEmiError(t('common.error') + ': Enter interest rate');
      return;
    }
    if (isNaN(actPrice) || actPrice < 0) {
      setEmiError(t('common.error') + ': Enter actual price');
      return;
    }

    try {
      setEmiSaving(true);
      await db.createEmi(profile.id, {
        item_name: emiItemName.trim(),
        buy_date: emiBuyDate,
        emi_months: months,
        total_amount: totalAmt,
        installment_amount: instAmt,
        interest_rate: rate,
        actual_price: actPrice,
        category_id: emiCategoryId || null,
      });

      // Reset form
      setEmiItemName('');
      setEmiBuyDate(new Date().toISOString().split('T')[0]);
      setEmiMonths('6');
      setEmiTotalAmount('');
      setEmiInstallmentAmount('');
      setEmiInterestRate('0');
      setEmiActualPrice('');
      if (categories.length > 0) {
        const defaultCat = categories.find(c => c.name.toLowerCase() === 'shopping' || c.name.toLowerCase() === 'electronic') || categories[0];
        setEmiCategoryId(defaultCat.id);
      }
      setIsEmiOpen(false);
      await loadData();
    } catch (err: any) {
      setEmiError(err.message || 'Failed to save EMI Facility');
    } finally {
      setEmiSaving(false);
    }
  };

  const handleDeleteEmi = async (id: string) => {
    if (!profile) return;
    if (!window.confirm(t('emis.deleteConfirm'))) return;

    try {
      await db.deleteEmi(profile.id, id);
      await loadData();
    } catch (err) {
      console.error('Error deleting EMI:', err);
    }
  };

  const activeLoans = useMemo(() => loans.filter(l => l.status === 'active'), [loans]);
  const settledLoans = useMemo(() => loans.filter(l => l.status === 'settled'), [loans]);

  if (loading && accounts.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('depositsLoans.title')}</h1>
          <p className="text-xs text-muted-foreground">Manage deposits, tracking borrowed funds and loans provided to others</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'deposits' && (
            <Button 
              onClick={() => setIsDepositOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10 border-none transition-all duration-200 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('depositsLoans.addDeposit')}
            </Button>
          )}
          {activeTab === 'loans' && (
            <Button 
              onClick={() => {
                setLoanEstPayDate('');
                setIsLoanOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/10 border-none transition-all duration-200 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('depositsLoans.addLoan')}
            </Button>
          )}
          {activeTab === 'emis' && (
            <Button 
              onClick={() => setIsEmiOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/10 border-none transition-all duration-200 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('emis.addEmi')}
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in duration-300">
        <Card className="bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t('depositsLoans.deposits')}
              </span>
              <span className="text-xl font-extrabold text-foreground mt-1 block">
                {formatCurrency(totalDeposited)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-tr from-blue-500/10 to-sky-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t('depositsLoans.loanTaken')}
              </span>
              <span className="text-xl font-extrabold text-foreground mt-1 block">
                {formatCurrency(loansTakenSummary.outstanding)}
              </span>
              <span className="text-[9px] text-muted-foreground/80 mt-0.5 block">
                {t('depositsLoans.repaid')}: {formatCurrency(loansTakenSummary.repaid)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-tr from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t('depositsLoans.loanProvided')}
              </span>
              <span className="text-xl font-extrabold text-foreground mt-1 block">
                {formatCurrency(loansProvidedSummary.outstanding)}
              </span>
              <span className="text-[9px] text-muted-foreground/80 mt-0.5 block">
                {t('depositsLoans.repaid')}: {formatCurrency(loansProvidedSummary.repaid)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-inner">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Active EMIs
              </span>
              <span className="text-xl font-extrabold text-foreground mt-1 block">
                {formatCurrency(emisSummary.totalLiability)}
              </span>
              <span className="text-[9px] text-muted-foreground/80 mt-0.5 block">
                Active: {emisSummary.activeCount} ({emis.length} total)
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Net Debt/Credit Status Card */}
        {(() => {
          const net = loansTakenSummary.outstanding - loansProvidedSummary.outstanding;
          const isDebt = net > 0;
          return (
            <Card className={`bg-gradient-to-tr border/20 ${isDebt ? 'from-amber-500/10 to-orange-500/10 border-amber-500/20' : 'from-indigo-500/10 to-teal-500/10 border-indigo-500/20'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {t('depositsLoans.netBalance')}
                  </span>
                  <span className="text-xl font-extrabold text-foreground mt-1 block">
                    {formatCurrency(Math.abs(net))}
                  </span>
                  <span className={`text-[9px] font-bold mt-0.5 block uppercase tracking-wider ${isDebt ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {isDebt ? 'Net Owed to Others' : 'Net Owed to You'}
                  </span>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-inner ${isDebt ? 'bg-amber-500/10 text-amber-600' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })()}</div>

      {/* Tabs Controller */}
      <div className="flex border-b border-border/80 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('deposits')}
          className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${activeTab === 'deposits' ? 'border-primary text-primary font-black scale-102' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {t('depositsLoans.deposits')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${activeTab === 'loans' ? 'border-primary text-primary font-black scale-102' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {t('depositsLoans.loans')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('emis')}
          className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${activeTab === 'emis' ? 'border-primary text-primary font-black scale-102' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {t('emis.title')}
        </button>
      </div>

      {/* Deposits Panel */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          {deposits.length === 0 ? (
            <Card className="py-12 text-center border-dashed border-border/60 bg-card/65 backdrop-blur-md">
              <CardContent className="flex flex-col items-center justify-center gap-3.5">
                <Coins className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-muted-foreground">{t('depositsLoans.noDeposits')}</p>
                <Button variant="outline" size="sm" onClick={() => setIsDepositOpen(true)}>
                  Log First Deposit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md border-border/60 overflow-hidden bg-card/65 backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[10px] uppercase">
                      <th className="py-3 px-4 w-28">Date</th>
                      <th className="py-3 px-4 w-24">Time</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">To Account</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-right w-28">Amount</th>
                      <th className="py-3 px-4 text-center w-14">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 font-semibold text-foreground/80">
                    {deposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 text-muted-foreground font-bold">
                          {new Date(dep.date).toLocaleDateString('de-DE')}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground/80">
                          {dep.time.slice(0, 5)}
                        </td>
                        <td className="py-3.5 px-4 text-foreground font-bold">
                          {dep.source}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                            <Landmark className="h-3 w-3" />
                            {dep.account?.name || 'Account'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-medium max-w-[200px] truncate" title={dep.notes || ''}>
                          {dep.notes || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(dep.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteDeposit(dep.id)}
                            className="p-1 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Delete Deposit"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Loans Panel */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          {/* Active Loans Section */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('depositsLoans.active')} Loans ({activeLoans.length})
            </h2>
            
            {activeLoans.length === 0 ? (
              <Card className="py-8 text-center border-dashed border-border/60 bg-card/65 backdrop-blur-md">
                <CardContent className="flex flex-col items-center justify-center gap-3">
                  <CheckCircle className="h-8 w-8 text-emerald-500/70" />
                  <p className="text-xs font-semibold text-muted-foreground">No active outstanding loans. Good job!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLoans.map((loan) => {
                  const percentPaid = Math.min(((loan.amount - loan.remaining_amount) / loan.amount) * 100, 100);
                  const isTaken = loan.type === 'taken';
                  
                  return (
                    <Card key={loan.id} className="hover:border-primary/20 transition-all duration-200 bg-card/65 backdrop-blur-md overflow-hidden flex flex-col justify-between">
                      <div>
                        {/* Card Header Info */}
                        <div className="p-4 pb-3 flex items-start justify-between border-b border-border/40">
                          <div className="flex gap-2.5 items-center">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isTaken ? 'bg-blue-500/10 text-blue-600' : 'bg-violet-500/10 text-violet-600'}`}>
                              {isTaken ? <ArrowDownLeft className="h-4.5 w-4.5" /> : <ArrowUpRight className="h-4.5 w-4.5" />}
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-foreground leading-tight">{loan.person}</div>
                              <div className="text-[10px] text-muted-foreground/85 flex items-center gap-1.5 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                {new Date(loan.date).toLocaleDateString('de-DE')}
                                <span>•</span>
                                <Landmark className="h-3 w-3" />
                                {loan.account?.name || t('depositsLoans.notPreferToSay')}
                              </div>
                            </div>
                          </div>
                          
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isTaken ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'}`}>
                            {isTaken ? 'Borrowed' : 'Lent'}
                          </span>
                        </div>

                        {/* Progress Bar & Amounts */}
                        <div className="p-4 space-y-3.5">
                          <div className="flex justify-between items-baseline text-xs font-semibold">
                            <span className="text-muted-foreground">Repaid Progress</span>
                            <span className="text-foreground font-bold">
                              {percentPaid.toFixed(0)}% ({formatCurrency(loan.amount - loan.remaining_amount)} of {formatCurrency(loan.amount)})
                            </span>
                          </div>
                          
                          {/* Beautiful Progress Slider */}
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${isTaken ? 'bg-blue-500' : 'bg-violet-500'}`} 
                              style={{ width: `${percentPaid}%` }} 
                            />
                          </div>

                          <div className="flex justify-between items-center bg-secondary/30 dark:bg-muted/15 border border-border/40 p-2.5 rounded-xl text-xs">
                            <span className="text-muted-foreground font-bold">Outstanding Balance:</span>
                            <span className="font-mono font-black text-rose-500 text-sm">
                              {formatCurrency(loan.remaining_amount)}
                            </span>
                          </div>

                          {loan.notes && (
                            <div className="flex gap-1.5 items-start text-[11px] font-semibold text-muted-foreground bg-muted/40 p-2 rounded-xl">
                              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/70" />
                              <span>{loan.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-4 pt-0 border-t border-border/30 mt-auto">
                        <div className="flex gap-2 pt-3">
                          <Button 
                            className="flex-1 text-xs py-1.5 h-auto rounded-xl"
                            onClick={() => openRepaymentModal(loan)}
                          >
                            {t('depositsLoans.logRepayment')}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="text-xs py-1.5 h-auto rounded-xl border-border hover:border-foreground/20 px-2.5"
                            onClick={() => setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id)}
                            title="Payments history"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="p-1.5 h-auto rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => handleDeleteLoan(loan.id)}
                            title="Delete Loan"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>

                        {/* Payments Dropdown list */}
                        {expandedLoanId === loan.id && (
                          <div className="mt-4 pt-3.5 border-t border-border/40 space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Repayment Log</span>
                            {!loan.payments || loan.payments.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground py-1">No repayment payments recorded yet.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {loan.payments.map((p, idx) => (
                                  <div key={p.id || idx} className="flex justify-between items-center text-[11px] p-2 rounded-xl bg-muted/60 dark:bg-muted/20 border border-border/40 font-semibold">
                                    <div>
                                      <div className="text-foreground">{formatCurrency(p.amount)}</div>
                                      <div className="text-[9px] text-muted-foreground">
                                        {new Date(p.date).toLocaleDateString('de-DE')} {p.notes ? `• ${p.notes}` : ''}
                                      </div>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground font-medium uppercase">repaid</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settled Loans Section */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('depositsLoans.settled')} Loans ({settledLoans.length})
            </h2>

            {settledLoans.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settledLoans.map((loan) => {
                  const isTaken = loan.type === 'taken';
                  return (
                    <Card key={loan.id} className="opacity-80 bg-secondary/15 hover:opacity-100 border-border/40 transition-opacity">
                      <div className="p-3.5 flex justify-between items-center">
                        <div className="flex gap-2.5 items-center">
                          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-foreground/80 line-through leading-tight">{loan.person}</div>
                            <div className="text-[9px] text-muted-foreground/80 flex items-center gap-1.5 mt-0.5">
                              {new Date(loan.date).toLocaleDateString('de-DE')}
                              <span>•</span>
                              {isTaken ? 'Borrowed' : 'Lent'} ({formatCurrency(loan.amount)})
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                            Settled
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="p-1 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EMIs Panel */}
      {activeTab === 'emis' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {emis.length === 0 ? (
            <Card className="py-12 text-center border-dashed border-border/60 bg-card/65 backdrop-blur-md">
              <CardContent className="flex flex-col items-center justify-center gap-3.5">
                <CreditCard className="h-10 w-10 text-muted-foreground/50 animate-pulse" />
                <p className="text-sm font-semibold text-muted-foreground">{t('emis.noEmis')}</p>
                <Button variant="outline" size="sm" onClick={() => setIsEmiOpen(true)}>
                  Log First EMI Facility
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {emis.map((emi) => {
                const emiExpenses = expenses.filter(e => e.emi_id === emi.id);
                const paidCount = emiExpenses.length;
                const remainingMonths = Math.max(0, emi.emi_months - paidCount);
                const totalPaidAmount = paidCount * emi.installment_amount;
                const remainingAmount = Math.max(0, emi.total_amount - totalPaidAmount);
                const percentPaid = emi.emi_months > 0 ? (paidCount / emi.emi_months) * 100 : 0;
                const isCompleted = remainingMonths === 0;
                const totalInterest = Math.max(0, emi.total_amount - emi.actual_price);

                const isExpanded = expandedEmiId === emi.id;

                return (
                  <Card key={emi.id} className={`shadow-sm border-border/60 overflow-hidden bg-card/65 backdrop-blur-md transition-all duration-200 hover:border-border ${isCompleted ? 'opacity-75' : ''}`}>
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setExpandedEmiId(isExpanded ? null : emi.id)}
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-foreground truncate">{emi.item_name}</h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${isCompleted ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}>
                            {isCompleted ? t('emis.statusCompleted') : t('emis.statusActive')}
                          </span>
                          {emi.category && (
                            <span className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                              • {emi.category.name}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground mt-1.5 font-bold">
                          <span>Buy Date: {new Date(emi.buy_date).toLocaleDateString('de-DE')}</span>
                          <span>Duration: {emi.emi_months} {t('emis.months')}</span>
                          {totalInterest > 0 && <span>Interest: {emi.interest_rate}% ({formatCurrency(totalInterest)})</span>}
                          <span>Cash Price: {formatCurrency(emi.actual_price)}</span>
                        </div>
                      </div>

                      {/* Middle: Progress Bar */}
                      <div className="w-full md:w-64 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground">{t('emis.installmentProgress')}</span>
                          <span className="text-foreground">{paidCount} / {emi.emi_months} paid</span>
                        </div>
                        <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full transition-all duration-300 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            style={{ width: `${Math.min(100, percentPaid)}%` }}
                          />
                        </div>
                      </div>

                      {/* Right: Amounts & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border/30">
                        <div className="text-left md:text-right font-black">
                          <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">
                            {t('emis.outstanding')}
                          </span>
                          <span className={`text-sm ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                            {formatCurrency(remainingAmount)}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground/75 block mt-0.5">
                            Installment: {formatCurrency(emi.installment_amount)} / month
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="text-[10px] h-7 font-bold px-2 rounded-lg cursor-pointer bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10"
                            onClick={() => setExpandedEmiId(isExpanded ? null : emi.id)}
                          >
                            {isExpanded ? 'Hide Payments' : 'View Payments'}
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmi(emi.id)}
                            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable payments list */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1.5 border-t border-border/20 bg-muted/10 animate-in slide-in-from-top-2 duration-200">
                        <h5 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-indigo-500" />
                          Logged Repayment History
                        </h5>
                        {emiExpenses.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/60 font-semibold italic p-2 bg-card/30 border border-dashed rounded-xl">
                            No installments logged as paid yet. Mark them paid in the monthly checklist on the Expenses page!
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {emiExpenses.map((exp) => (
                              <div key={exp.id} className="flex justify-between items-center text-[10px] p-2.5 rounded-xl bg-card border border-border/30 font-semibold text-foreground/80">
                                <div>
                                  <div className="text-foreground font-bold">{exp.notes || 'EMI Installment'}</div>
                                  <div className="text-muted-foreground/75 text-[9px] mt-0.5">
                                    Date: {new Date(exp.date).toLocaleDateString('de-DE')} • Paid from: {exp.account?.name || 'Account'}
                                  </div>
                                </div>
                                <div className="text-foreground font-black text-right">
                                  {formatCurrency(exp.amount)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Deposit Dialog */}
      <Dialog
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title={t('depositsLoans.addDeposit')}
      >
        <form onSubmit={handleAddDeposit} className="space-y-4">
          {depError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {depError}
            </div>
          )}

          <Input
            type="number"
            step="0.01"
            label={t('depositsLoans.amount')}
            placeholder="0.00"
            value={depAmount}
            onChange={(e) => setDepAmount(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label={t('depositsLoans.date')}
              value={depDate}
              onChange={(e) => setDepDate(e.target.value)}
              required
            />
            <Input
              type="time"
              label={t('depositsLoans.time')}
              value={depTime}
              onChange={(e) => setDepTime(e.target.value)}
              required
            />
          </div>

          <Select
            label={t('depositsLoans.depositTo')}
            value={depAccountId}
            onChange={(e) => setDepAccountId(e.target.value)}
            options={accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${formatCurrency(acc.balance)})` }))}
            required
          />

          <Input
            label={t('depositsLoans.depositFrom')}
            placeholder="e.g. ATM Deposit, Parents, Friend Name, Salary"
            value={depSource}
            onChange={(e) => setDepSource(e.target.value)}
            required
          />

          <Input
            label={t('depositsLoans.note')}
            placeholder="e.g. Received cash from summer job"
            value={depNotes}
            onChange={(e) => setDepNotes(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsDepositOpen(false)} disabled={depSaving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={depSaving}>
              {t('depositsLoans.saveDeposit')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add Loan Dialog */}
      <Dialog
        isOpen={isLoanOpen}
        onClose={() => setIsLoanOpen(false)}
        title={t('depositsLoans.addLoan')}
      >
        <form onSubmit={handleAddLoan} className="space-y-4">
          {loanError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {loanError}
            </div>
          )}

          <Select
            label={t('depositsLoans.loanType')}
            value={loanType}
            onChange={(e) => setLoanType(e.target.value as 'taken' | 'provided')}
            options={[
              { value: 'taken', label: t('depositsLoans.loanTaken') },
              { value: 'provided', label: t('depositsLoans.loanProvided') },
            ]}
          />

          <Input
            label={t('depositsLoans.person')}
            placeholder={loanType === 'taken' ? "e.g. Uncle John, Sparkasse Bank" : "e.g. Sarah (Roommate), Sam"}
            value={loanPerson}
            onChange={(e) => setLoanPerson(e.target.value)}
            required
          />

          <Input
            type="number"
            step="0.01"
            label={t('depositsLoans.amount')}
            placeholder="0.00"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            required
          />

          <Input
            type="date"
            label={t('depositsLoans.date')}
            value={loanDate}
            onChange={(e) => setLoanDate(e.target.value)}
            required
          />

          <Select
            label={t('depositsLoans.associatedAccount')}
            value={loanAccountId}
            onChange={(e) => setLoanAccountId(e.target.value)}
            options={[
              { value: 'none', label: t('depositsLoans.notPreferToSay') },
              ...accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${formatCurrency(acc.balance)})` }))
            ]}
            required
          />

          <Input
            label={t('depositsLoans.reason')}
            placeholder={loanType === 'taken' ? "Why did you borrow? e.g. Semester Fee, Laptop purchase" : "Why did you lend? e.g. Shared Rent, Dinner bill"}
            value={loanNotes}
            onChange={(e) => setLoanNotes(e.target.value)}
          />

          <Input
            type="date"
            label="Estimated Repayment Date (Optional)"
            placeholder="Select expected payment due date"
            value={loanEstPayDate}
            onChange={(e) => setLoanEstPayDate(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsLoanOpen(false)} disabled={loanSaving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={loanSaving}>
              {t('depositsLoans.saveLoan')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Log Repayment Dialog */}
      <Dialog
        isOpen={!!selectedLoan}
        onClose={() => setSelectedLoan(null)}
        title={selectedLoan ? `Log Repayment for ${selectedLoan.person}` : 'Log Repayment'}
      >
        {selectedLoan && (
          <form onSubmit={handleLogRepayment} className="space-y-4">
            {repError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
                {repError}
              </div>
            )}

            <div className="p-3.5 bg-secondary/40 dark:bg-muted/15 border border-border/40 rounded-2xl text-xs flex justify-between">
              <div>
                <span className="text-muted-foreground font-semibold uppercase tracking-wider block">Remaining Balance</span>
                <span className="font-extrabold text-foreground mt-0.5 block">{formatCurrency(selectedLoan.remaining_amount)}</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider block">Original Loan</span>
                <span className="font-extrabold text-foreground mt-0.5 block">{formatCurrency(selectedLoan.amount)}</span>
              </div>
            </div>

            <Input
              type="number"
              step="0.01"
              label="Repayment Amount (€)"
              placeholder="0.00"
              value={repAmount}
              onChange={(e) => setRepAmount(e.target.value)}
              required
            />

            <Input
              type="date"
              label="Repayment Date"
              value={repDate}
              onChange={(e) => setRepDate(e.target.value)}
              required
            />

            <Select
              label={selectedLoan.type === 'taken' ? "Paid From Account" : "Received Into Account"}
              value={repAccountId}
              onChange={(e) => setRepAccountId(e.target.value)}
              options={accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${formatCurrency(acc.balance)})` }))}
              required
            />

            <Input
              label="Repayment Notes (Optional)"
              placeholder="e.g. Bank transfer, Partial cash repayment"
              value={repNotes}
              onChange={(e) => setRepNotes(e.target.value)}
            />

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setSelectedLoan(null)} disabled={repSaving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={repSaving}>
                Log Repayment
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Add EMI Facility Dialog */}
      <Dialog
        isOpen={isEmiOpen}
        onClose={() => setIsEmiOpen(false)}
        title={t('emis.addEmi')}
      >
        <form onSubmit={handleAddEmi} className="space-y-4">
          {emiError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {emiError}
            </div>
          )}

          <Input
            label={t('emis.itemName')}
            placeholder="e.g. iPhone 17, Study Desk"
            value={emiItemName}
            onChange={(e) => setEmiItemName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label={t('emis.buyDate')}
              value={emiBuyDate}
              onChange={(e) => setEmiBuyDate(e.target.value)}
              required
            />
            <Select
              label={t('emis.category')}
              value={emiCategoryId}
              onChange={(e) => setEmiCategoryId(e.target.value)}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label={t('emis.emiMonths')}
              placeholder="e.g. 6"
              value={emiMonths}
              onChange={(e) => setEmiMonths(e.target.value)}
              required
            />
            <Input
              type="number"
              step="0.01"
              label={t('emis.installmentAmount')}
              placeholder="0.00"
              value={emiInstallmentAmount}
              onChange={(e) => setEmiInstallmentAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              step="0.01"
              label={t('emis.totalAmount')}
              placeholder="0.00"
              value={emiTotalAmount}
              onChange={(e) => setEmiTotalAmount(e.target.value)}
              required
            />
            <Input
              type="number"
              step="0.01"
              label={t('emis.interestRate')}
              placeholder="0"
              value={emiInterestRate}
              onChange={(e) => setEmiInterestRate(e.target.value)}
              required
            />
          </div>

          <Input
            type="number"
            step="0.01"
            label={t('emis.actualPrice')}
            placeholder="Cash price (e.g. without interest)"
            value={emiActualPrice}
            onChange={(e) => setEmiActualPrice(e.target.value)}
            required
          />

          {parseFloat(emiTotalAmount) > 0 && parseFloat(emiActualPrice) > 0 && (
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              <span className="flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" />
                Interest Details:
              </span>
              <span>
                Markup paid: €{(parseFloat(emiTotalAmount) - parseFloat(emiActualPrice)).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsEmiOpen(false)} disabled={emiSaving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={emiSaving}>
              {t('emis.saveEmi')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
