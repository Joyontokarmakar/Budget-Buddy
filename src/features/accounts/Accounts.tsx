import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Account, AccountType, IncomeType, IncomeWithDetails, EmploymentIncomeWithDetails, ExpenseWithDetails, DepositWithDetails, LoanWithDetails } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, Dialog, Spinner } from '../../components/ui';
import { Wallet, Landmark, PiggyBank, Plus, TrendingUp, Pencil } from 'lucide-react';

export const Accounts: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [employmentIncomes, setEmploymentIncomes] = useState<EmploymentIncomeWithDetails[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [deposits, setDeposits] = useState<DepositWithDetails[]>([]);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('');
  const [initialSourceType, setInitialSourceType] = useState<IncomeType>('other');
  const [initialSourceName, setInitialSourceName] = useState('');
  const [initialBalanceDate, setInitialBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  // Edit Account Dialog & Form State
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AccountType>('bank');
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deposit Form State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositType, setDepositType] = useState<IncomeType>('other');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Edit Deposit / Income Form State
  const [isEditIncomeOpen, setIsEditIncomeOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeWithDetails | null>(null);
  const [editIncomeAmount, setEditIncomeAmount] = useState('');
  const [editIncomeType, setEditIncomeType] = useState<IncomeType>('other');
  const [editIncomeDate, setEditIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [editIncomeNotes, setEditIncomeNotes] = useState('');
  const [editIncomeSourceName, setEditIncomeSourceName] = useState('');
  const [editIncomeSaving, setEditIncomeSaving] = useState(false);
  const [editIncomeError, setEditIncomeError] = useState<string | null>(null);

  const getSourceLabel = (srcType: IncomeType) => {
    switch (srcType) {
      case 'werkstudent': return 'Salary (Job)';
      case 'scholarship': return 'Scholarship';
      case 'family': return 'Family / Gift';
      case 'freelance': return 'Freelance';
      default: return 'Other Deposit';
    }
  };

  const handleOpenAddAccountDialog = () => {
    setName('');
    setType('bank');
    setBalance('');
    setInitialSourceType('other');
    setInitialSourceName('');
    setInitialBalanceDate(new Date().toISOString().split('T')[0]);
    setIsDefault(false);
    setError(null);
    setIsDialogOpen(true);
  };

  const handleOpenDepositDialog = (account?: Account) => {
    const acc = account || accounts.find(a => a.is_default) || accounts[0];
    setDepositAccountId(acc ? acc.id : '');
    setDepositAmount('');
    setDepositType('other');
    setDepositNotes('');
    setDepositDate(new Date().toISOString().split('T')[0]);
    setDepositError(null);
    setIsDepositOpen(true);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    const targetAccount = accounts.find(a => a.id === depositAccountId);
    if (!targetAccount) {
      setDepositError('Please select a destination account');
      return;
    }
    
    setDepositError(null);

    if (!depositAmount.trim()) {
      setDepositError('Please enter an amount');
      return;
    }

    const numAmount = parseFloat(depositAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setDepositError('Please enter a valid positive amount');
      return;
    }

    try {
      setDepositSaving(true);
      await db.createIncome(profile.id, {
        amount: numAmount,
        type: depositType,
        date: depositDate,
        notes: depositNotes.trim() || `Deposit to ${targetAccount.name}`,
        source_name: getSourceLabel(depositType),
        destination_account_id: targetAccount.id,
      });

      setIsDepositOpen(false);
      await fetchAccounts();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error processing deposit';
      setDepositError(errMsg);
    } finally {
      setDepositSaving(false);
    }
  };

  const handleOpenEditIncomeDialog = (income: IncomeWithDetails) => {
    setSelectedIncome(income);
    setEditIncomeAmount(income.amount.toString());
    setEditIncomeType(income.type);
    setEditIncomeDate(income.date);
    setEditIncomeNotes(income.notes || '');
    setEditIncomeSourceName(income.source_name || '');
    setEditIncomeError(null);
    setIsEditIncomeOpen(true);
  };

  const handleUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedIncome) return;
    setEditIncomeError(null);

    if (!editIncomeAmount.trim()) {
      setEditIncomeError('Please enter an amount');
      return;
    }

    const numAmount = parseFloat(editIncomeAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditIncomeError('Please enter a valid positive amount');
      return;
    }

    try {
      setEditIncomeSaving(true);
      await db.updateIncome(profile.id, selectedIncome.id, {
        amount: numAmount,
        type: editIncomeType,
        date: editIncomeDate,
        notes: editIncomeNotes.trim() || `Deposit to Account`,
        source_name: editIncomeSourceName.trim() || getSourceLabel(editIncomeType),
      });

      setIsEditIncomeOpen(false);
      await fetchAccounts();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error updating deposit';
      setEditIncomeError(errMsg);
    } finally {
      setEditIncomeSaving(false);
    }
  };

  const fetchAccounts = useCallback(async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [accs, incs, empIncs, exps, deps, lns] = await Promise.all([
        db.getAccounts(profile.id),
        db.getIncome(profile.id),
        db.getEmploymentIncome(profile.id),
        db.getExpenses(profile.id),
        db.getDeposits(profile.id),
        db.getLoans(profile.id),
      ]);
      setAccounts(accs);
      setIncomes(incs);
      setEmploymentIncomes(empIncs);
      setExpenses(exps);
      setDeposits(deps);
      setLoans(lns);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'deposit' && !loading && accounts.length > 0) {
      const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
      handleOpenDepositDialog(defaultAcc);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, loading, accounts, setSearchParams]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);

    if (!name.trim() || !balance.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const numericBalance = parseFloat(balance);
    if (isNaN(numericBalance)) {
      setError('Invalid balance value');
      return;
    }

    try {
      setSaving(true);
      // 1. Create account with 0 initial balance so that any initial balance is correctly logged as a transaction
      const newAcc = await db.createAccount(profile.id, {
        name: name.trim(),
        type,
        balance: 0,
        is_default: isDefault,
      });
      
      // 2. Log initial balance income if > 0
      if (numericBalance > 0) {
        await db.createIncome(profile.id, {
          amount: numericBalance,
          date: initialBalanceDate,
          type: initialSourceType,
          notes: 'Initial Account Balance',
          source_name: initialSourceName.trim() || 'Opening Balance',
          destination_account_id: newAcc.id,
        });
      }
      
      // Reset & Reload
      setName('');
      setType('bank');
      setBalance('');
      setInitialSourceType('other');
      setInitialSourceName('');
      setIsDefault(false);
      setIsDialogOpen(false);
      await fetchAccounts();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error creating account';
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditAccountDialog = (account: Account) => {
    setEditingAccount(account);
    setEditName(account.name);
    setEditType(account.type);
    setEditIsDefault(!!account.is_default);
    setEditError(null);
    setIsEditAccountOpen(true);
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editingAccount) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Please enter a name');
      return;
    }

    try {
      setEditSaving(true);
      await db.updateAccount(profile.id, editingAccount.id, {
        name: editName.trim(),
        type: editType,
        is_default: editIsDefault,
      });

      setIsEditAccountOpen(false);
      setEditingAccount(null);
      await fetchAccounts();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error updating account';
      setEditError(errMsg);
    } finally {
      setEditSaving(false);
    }
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'bank':
        return <Landmark className="h-5 w-5 text-blue-500" />;
      case 'savings':
        return <PiggyBank className="h-5 w-5 text-violet-500" />;
      case 'cash':
        return <Wallet className="h-5 w-5 text-emerald-500" />;
    }
  };

  const getAccountTypeLabel = (accType: AccountType) => {
    if (accType === 'bank') return t('accounts.bank');
    if (accType === 'savings') return t('accounts.savings');
    return t('accounts.cash');
  };

  const totalAssets = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  if (loading && accounts.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header Info Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('accounts.title')}</h1>
          <p className="text-xs text-muted-foreground">Keep your cash, bank balances, and savings pools in sync</p>
        </div>
        <div className="flex flex-wrap gap-2.5 sm:self-start">
          {accounts.length > 0 && (
            <Button
              onClick={() => handleOpenDepositDialog()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/10 font-bold rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Balance
            </Button>
          )}
          <Button onClick={handleOpenAddAccountDialog} variant="outline" className="font-bold rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            {t('accounts.addAccount')}
          </Button>
        </div>
      </div>

      {/* Asset Summary Panel */}
      <Card className="bg-gradient-to-tr from-primary/10 to-violet-500/10 border-primary/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              {t('accounts.totalBalance')}
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">
              €{totalAssets.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <TrendingUp className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      {/* Accounts List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.length === 0 ? (
          <Card className="col-span-full py-8 text-center border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3">
              <Wallet className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">{t('accounts.noAccounts')}</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((acc) => (
            <Card key={acc.id} className="hover:border-primary/30 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold">{acc.name}</CardTitle>
                      {acc.is_default && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                          {t('accounts.defaultBadge')}
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-wider">
                      {getAccountTypeLabel(acc.type)}
                    </CardDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEditAccountDialog(acc)}
                  className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  title={t('accounts.editAccount')}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-xs text-muted-foreground">Current Balance</span>
                  <span className="text-lg font-bold">
                    €{acc.balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50">
                  <Button
                    onClick={() => handleOpenDepositDialog(acc)}
                    className="w-full text-xs py-2 h-auto rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm border-0 transition-all active:scale-[0.99] hover:scale-[1.01]"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Balance
                  </Button>
                </div>
                {(() => {
                  const accountWalletAdds = incomes.filter(inc => inc.destination_account_id === acc.id).map(inc => ({
                    id: inc.id,
                    type: 'inflow',
                    isEditable: true,
                    title: inc.source_name || getSourceLabel(inc.type),
                    date: inc.date,
                    notes: inc.notes,
                    amount: inc.amount,
                    badge: null,
                    raw: inc
                  }));
                  const accountEmpIncomes = employmentIncomes.filter(inc => inc.destination_account_id === acc.id).map(inc => ({
                    id: inc.id,
                    type: 'inflow',
                    isEditable: false,
                    title: inc.organization_name,
                    date: inc.date,
                    notes: inc.notes,
                    amount: inc.amount,
                    badge: i18n.language === 'de' ? 'Arbeit' : 'Salary',
                    raw: inc
                  }));
                  const accountDeposits = deposits.filter(dep => dep.to_account_id === acc.id).map(dep => ({
                    id: dep.id,
                    type: 'inflow',
                    isEditable: false,
                    title: dep.source || 'Deposit',
                    date: dep.date,
                    time: dep.time || null,
                    notes: dep.notes,
                    amount: dep.amount,
                    badge: i18n.language === 'de' ? 'Einzahlung' : 'Deposit',
                    raw: dep
                  }));
                  const accountLoans = loans.filter(l => l.account_id === acc.id && l.type === 'taken').map(l => ({
                    id: l.id,
                    type: 'inflow',
                    isEditable: false,
                    title: i18n.language === 'de' ? `Kredit von ${l.person}` : `Loan from ${l.person}`,
                    date: l.date,
                    notes: l.notes,
                    amount: l.amount,
                    badge: i18n.language === 'de' ? 'Kredit' : 'Loan',
                    raw: l
                  }));
                  const accountLoanPayments = loans.flatMap(l => 
                    (l.payments || []).filter(p => p.account_id === acc.id).map(p => ({
                      id: p.id,
                      type: l.type === 'taken' ? 'outflow' as const : 'inflow' as const,
                      isEditable: false,
                      title: l.type === 'taken'
                        ? (i18n.language === 'de' ? `Kreditrückzahlung an ${l.person}` : `Loan repayment to ${l.person}`)
                        : (i18n.language === 'de' ? `Kreditrückzahlung von ${l.person}` : `Loan repayment from ${l.person}`),
                      date: p.date,
                      notes: p.notes,
                      amount: p.amount,
                      badge: i18n.language === 'de' ? 'Kredit Rückzahlung' : 'Loan Repayment',
                      raw: p
                    }))
                  );
                  // Group expenses by Year-Month
                  const expenseGroups: { [key: string]: number } = {};
                  const expenseCounts: { [key: string]: number } = {};
                  expenses
                    .filter(exp => exp.payment_account_id === acc.id)
                    .forEach(exp => {
                      if (!exp.date) return;
                      const dateStr = exp.date.includes('T') ? exp.date.split('T')[0] : (exp.date.includes(' ') ? exp.date.split(' ')[0] : exp.date);
                      const parts = dateStr.split('-');
                      if (parts.length >= 2) {
                        const yearMonth = `${parts[0]}-${parts[1]}`; // YYYY-MM
                        expenseGroups[yearMonth] = (expenseGroups[yearMonth] || 0) + exp.amount;
                        expenseCounts[yearMonth] = (expenseCounts[yearMonth] || 0) + 1;
                      }
                    });

                  const monthlyExpenses = Object.keys(expenseGroups).map(yearMonth => {
                    const [year, month] = yearMonth.split('-').map(Number);
                    // Get last day of the month
                    const lastDayDate = new Date(year, month, 0);
                    const lastDayStr = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
                    
                    const monthName = lastDayDate.toLocaleDateString(i18n.language || 'en-US', { month: 'long', year: 'numeric' });
                    
                    return {
                      id: `monthly-expense-${yearMonth}-${acc.id}`,
                      type: 'outflow' as const,
                      isEditable: false,
                      title: i18n.language === 'de' 
                        ? `Monatsausgaben (${monthName})` 
                        : `Monthly Expenses (${monthName})`,
                      date: lastDayStr,
                      time: '23:59', // Put at the end of the day so it appears first when sorted descending
                      notes: i18n.language === 'de' 
                        ? `${expenseCounts[yearMonth]} Transaktionen` 
                        : `${expenseCounts[yearMonth]} transactions`,
                      amount: expenseGroups[yearMonth],
                      badge: i18n.language === 'de' ? 'Gesamtausgaben' : 'Total Expenses',
                      raw: null
                    };
                  });

                  const combinedHistory = [
                    ...accountWalletAdds,
                    ...accountEmpIncomes,
                    ...accountDeposits,
                    ...accountLoans,
                    ...accountLoanPayments,
                    ...monthlyExpenses
                  ].sort((a, b) => {
                    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    const timeA = (a as any).time || '';
                    const timeB = (b as any).time || '';
                    return timeB.localeCompare(timeA);
                  });

                  if (combinedHistory.length === 0) return null;
                  return (
                    <div className="mt-3.5 border-t border-border/50 pt-2.5">
                      <button
                        type="button"
                        onClick={() => setExpandedAccountId(expandedAccountId === acc.id ? null : acc.id)}
                        className="flex items-center justify-between w-full text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
                      >
                        <span>{expandedAccountId === acc.id ? 'Hide Transaction History' : 'Show Transaction History'} ({combinedHistory.length})</span>
                        <span className="text-[10px]">{expandedAccountId === acc.id ? '▲' : '▼'}</span>
                      </button>

                      {expandedAccountId === acc.id && (
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1 animate-in slide-in-from-top-2 duration-200">
                          {combinedHistory.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-[11px] p-2 rounded-xl bg-secondary/50 dark:bg-muted/30 border border-border/40 font-semibold">
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                                  <span>{item.title}</span>
                                  {item.badge && (
                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                      item.type === 'inflow' 
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    }`}>
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-muted-foreground">
                                  {(() => {
                                    if (!item.date) return '';
                                    const dateStr = item.date.includes('T') ? item.date.split('T')[0] : (item.date.includes(' ') ? item.date.split(' ')[0] : item.date);
                                    const parts = dateStr.split('-');
                                    if (parts.length === 3) {
                                      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                      const formattedDate = d.toLocaleDateString(i18n.language || 'de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });
                                      return (item as any).time ? `${formattedDate}, ${(item as any).time}` : formattedDate;
                                    }
                                    return new Date(item.date).toLocaleDateString(i18n.language || 'de-DE');
                                  })()} {item.notes ? `• ${item.notes}` : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className={`font-black ${
                                  item.type === 'inflow' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                }`}>
                                  {item.type === 'inflow' ? '+' : '-'}€{item.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {item.isEditable && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditIncomeDialog(item.raw as IncomeWithDetails)}
                                    className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                    title="Edit details"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={t('accounts.addAccount')}
      >
        <form onSubmit={handleAddAccount} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <Input
            label={t('accounts.name')}
            placeholder={t('accounts.placeholderName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label={t('accounts.type')}
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            options={[
              { value: 'bank', label: t('accounts.bank') },
              { value: 'savings', label: t('accounts.savings') },
              { value: 'cash', label: t('accounts.cash') },
            ]}
          />

          <Input
            type="number"
            step="0.01"
            label={t('accounts.balance')}
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            required
          />

          {parseFloat(balance) > 0 && (
            <div className="space-y-4 p-3 bg-secondary/30 dark:bg-muted/20 rounded-xl border border-border/50 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Initial Balance Source</span>
              <Select
                label="Source of Amount"
                value={initialSourceType}
                onChange={(e) => setInitialSourceType(e.target.value as IncomeType)}
                options={[
                  { value: 'werkstudent', label: 'Salary / Job (Werkstudent)' },
                  { value: 'scholarship', label: 'Scholarship' },
                  { value: 'family', label: 'Family / Gift' },
                  { value: 'freelance', label: 'Freelance' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Input
                type="date"
                label="Date"
                value={initialBalanceDate}
                onChange={(e) => setInitialBalanceDate(e.target.value)}
                required
              />
              <Input
                label="Source Name (Optional)"
                placeholder="e.g. DAAD, Sparkasse Savings, Parents"
                value={initialSourceName}
                onChange={(e) => setInitialSourceName(e.target.value)}
              />
            </div>
          )}

          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">{t('accounts.defaultAccount')}</span>
                <p className="text-[10px] text-muted-foreground">{t('accounts.setAsDefault')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-muted-foreground/35 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t('accounts.save')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Deposit / Add Balance Dialog */}
      <Dialog
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title={
          (() => {
            const targetAcc = accounts.find(a => a.id === depositAccountId);
            return targetAcc ? `Add Balance to ${targetAcc.name}` : 'Add Balance';
          })()
        }
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          {depositError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {depositError}
            </div>
          )}

          <Select
            label="Destination Account"
            value={depositAccountId}
            onChange={(e) => setDepositAccountId(e.target.value)}
            options={accounts.map(acc => ({
              value: acc.id,
              label: `${acc.name} (€${acc.balance.toFixed(2)})`,
            }))}
          />

          <Input
            type="number"
            step="0.01"
            label="Amount (€)"
            placeholder="0.00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Source of Amount"
            value={depositType}
            onChange={(e) => setDepositType(e.target.value as IncomeType)}
            options={[
              { value: 'werkstudent', label: 'Salary / Job (Werkstudent)' },
              { value: 'scholarship', label: 'Scholarship' },
              { value: 'family', label: 'Family / Gift' },
              { value: 'freelance', label: 'Freelance' },
              { value: 'other', label: 'Other' },
            ]}
          />

          <Input
            type="date"
            label="Date"
            value={depositDate}
            onChange={(e) => setDepositDate(e.target.value)}
            required
          />

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Pocket money, June Salary"
            value={depositNotes}
            onChange={(e) => setDepositNotes(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsDepositOpen(false)} disabled={depositSaving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={depositSaving}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Deposit / Income Dialog */}
      <Dialog
        isOpen={isEditIncomeOpen}
        onClose={() => setIsEditIncomeOpen(false)}
        title="Edit Deposit / Income Record"
      >
        <form onSubmit={handleUpdateIncome} className="space-y-4">
          {editIncomeError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {editIncomeError}
            </div>
          )}

          <Input
            type="number"
            step="0.01"
            label="Amount (€)"
            placeholder="0.00"
            value={editIncomeAmount}
            onChange={(e) => setEditIncomeAmount(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Source of Amount"
            value={editIncomeType}
            onChange={(e) => setEditIncomeType(e.target.value as IncomeType)}
            options={[
              { value: 'werkstudent', label: 'Salary / Job (Werkstudent)' },
              { value: 'scholarship', label: 'Scholarship' },
              { value: 'family', label: 'Family / Gift' },
              { value: 'freelance', label: 'Freelance' },
              { value: 'other', label: 'Other' },
            ]}
          />

          <Input
            type="date"
            label="Date"
            value={editIncomeDate}
            onChange={(e) => setEditIncomeDate(e.target.value)}
            required
          />

          <Input
            label="Source Name (Optional)"
            placeholder="e.g. June Salary"
            value={editIncomeSourceName}
            onChange={(e) => setEditIncomeSourceName(e.target.value)}
          />

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Workstudent stipend"
            value={editIncomeNotes}
            onChange={(e) => setEditIncomeNotes(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsEditIncomeOpen(false)} disabled={editIncomeSaving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={editIncomeSaving}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog
        isOpen={isEditAccountOpen}
        onClose={() => {
          setIsEditAccountOpen(false);
          setEditingAccount(null);
        }}
        title={t('accounts.editAccount')}
      >
        <form onSubmit={handleEditAccount} className="space-y-4">
          {editError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {editError}
            </div>
          )}

          <Input
            label={t('accounts.name')}
            placeholder={t('accounts.placeholderName')}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <Select
            label={t('accounts.type')}
            value={editType}
            onChange={(e) => setEditType(e.target.value as AccountType)}
            options={[
              { value: 'bank', label: t('accounts.bank') },
              { value: 'savings', label: t('accounts.savings') },
              { value: 'cash', label: t('accounts.cash') },
            ]}
          />

          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">{t('accounts.defaultAccount')}</span>
                <p className="text-[10px] text-muted-foreground">{t('accounts.setAsDefault')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsDefault}
                  onChange={(e) => setEditIsDefault(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-muted-foreground/35 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsEditAccountOpen(false);
                setEditingAccount(null);
              }} 
              disabled={editSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={editSaving}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
