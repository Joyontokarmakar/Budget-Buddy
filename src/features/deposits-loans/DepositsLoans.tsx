import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Account, DepositWithDetails, LoanWithDetails, LoanPayment } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, Dialog, Spinner } from '../../components/ui';
import { Coins, Plus, Trash2, Calendar, Clock, Landmark, User, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp, History, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export const DepositsLoans: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  
  // Loading & Data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deposits, setDeposits] = useState<DepositWithDetails[]>([]);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View states
  const [activeTab, setActiveTab] = useState<'deposits' | 'loans'>('deposits');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

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
      const [accs, deps, lns] = await Promise.all([
        db.getAccounts(profile.id),
        db.getDeposits(profile.id),
        db.getLoans(profile.id),
      ]);
      setAccounts(accs);
      setDeposits(deps);
      setLoans(lns);
      
      // Pre-select default account for forms
      if (accs.length > 0) {
        setDepAccountId(accs[0].id);
        setLoanAccountId(accs[0].id);
        setRepAccountId(accs[0].id);
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
    if (!loanAccountId) {
      setLoanError(t('common.error') + ': Select an account');
      return;
    }

    try {
      setLoanSaving(true);
      await db.createLoan(profile.id, {
        type: loanType,
        person: loanPerson.trim(),
        amount,
        date: loanDate,
        account_id: loanAccountId,
        notes: loanNotes.trim() || null,
      });

      // Reset form
      setLoanAmount('');
      setLoanPerson('');
      setLoanNotes('');
      setLoanDate(new Date().toISOString().split('T')[0]);
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
          {activeTab === 'deposits' ? (
            <Button onClick={() => setIsDepositOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('depositsLoans.addDeposit')}
            </Button>
          ) : (
            <Button onClick={() => setIsLoanOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('depositsLoans.addLoan')}
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        })()}
      </div>

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
                                {loan.account?.name || 'Account'}
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
            options={accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${formatCurrency(acc.balance)})` }))}
            required
          />

          <Input
            label={t('depositsLoans.reason')}
            placeholder={loanType === 'taken' ? "Why did you borrow? e.g. Semester Fee, Laptop purchase" : "Why did you lend? e.g. Shared Rent, Dinner bill"}
            value={loanNotes}
            onChange={(e) => setLoanNotes(e.target.value)}
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
    </div>
  );
};
