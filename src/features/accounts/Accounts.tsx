import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Account, AccountType, IncomeType, IncomeWithDetails } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, Dialog, Spinner } from '../../components/ui';
import { Wallet, Landmark, PiggyBank, Plus, TrendingUp, Pencil } from 'lucide-react';

export const Accounts: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
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

  // Deposit Form State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
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
    setError(null);
    setIsDialogOpen(true);
  };

  const handleOpenDepositDialog = (account: Account) => {
    setSelectedAccount(account);
    setDepositAmount('');
    setDepositType('other');
    setDepositNotes('');
    setDepositDate(new Date().toISOString().split('T')[0]);
    setDepositError(null);
    setIsDepositOpen(true);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedAccount) return;
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
        notes: depositNotes.trim() || `Deposit to ${selectedAccount.name}`,
        source_name: getSourceLabel(depositType),
        destination_account_id: selectedAccount.id,
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
      const [accs, incs] = await Promise.all([
        db.getAccounts(profile.id),
        db.getIncome(profile.id),
      ]);
      setAccounts(accs);
      setIncomes(incs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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
      setIsDialogOpen(false);
      await fetchAccounts();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error creating account';
      setError(errMsg);
    } finally {
      setSaving(false);
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
        <Button onClick={handleOpenAddAccountDialog} className="sm:self-start">
          <Plus className="h-4 w-4 mr-2" />
          {t('accounts.addAccount')}
        </Button>
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
                    <CardTitle className="text-sm font-bold">{acc.name}</CardTitle>
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-wider">
                      {getAccountTypeLabel(acc.type)}
                    </CardDescription>
                  </div>
                </div>
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
                    variant="outline"
                    className="w-full text-xs py-1.5 h-auto rounded-xl border-primary/20 hover:border-primary/50 text-primary hover:bg-primary/5 font-bold transition-all"
                    onClick={() => handleOpenDepositDialog(acc)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Balance
                  </Button>
                </div>
                {(() => {
                  const accountIncomes = incomes.filter(inc => inc.destination_account_id === acc.id);
                  if (accountIncomes.length === 0) return null;
                  return (
                    <div className="mt-3.5 border-t border-border/50 pt-2.5">
                      <button
                        type="button"
                        onClick={() => setExpandedAccountId(expandedAccountId === acc.id ? null : acc.id)}
                        className="flex items-center justify-between w-full text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
                      >
                        <span>{expandedAccountId === acc.id ? 'Hide Source History' : 'Show Source History'} ({accountIncomes.length})</span>
                        <span className="text-[10px]">{expandedAccountId === acc.id ? '▲' : '▼'}</span>
                      </button>

                      {expandedAccountId === acc.id && (
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1 animate-in slide-in-from-top-2 duration-200">
                          {accountIncomes.map((inc) => (
                            <div key={inc.id} className="flex justify-between items-center text-[11px] p-2 rounded-xl bg-secondary/50 dark:bg-muted/30 border border-border/40 font-semibold">
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="font-bold text-foreground truncate">
                                  {inc.source_name || getSourceLabel(inc.type)}
                                </div>
                                <div className="text-[9px] text-muted-foreground">
                                  {new Date(inc.date).toLocaleDateString('de-DE')} {inc.notes ? `• ${inc.notes}` : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="font-black text-emerald-600 dark:text-emerald-400">
                                  +€{inc.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditIncomeDialog(inc)}
                                  className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                  title="Edit deposit date/details"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
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
        title={selectedAccount ? `Add Balance to ${selectedAccount.name}` : 'Add Balance'}
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          {depositError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {depositError}
            </div>
          )}

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
    </div>
  );
};
