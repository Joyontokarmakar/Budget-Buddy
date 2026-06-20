import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { Account, AccountType } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, Dialog, Spinner } from '../../components/ui';
import { Wallet, Landmark, PiggyBank, Plus, TrendingUp } from 'lucide-react';

export const Accounts: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const data = await db.getAccounts(profile.id);
      setAccounts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [profile]);

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
      await db.createAccount(profile.id, {
        name: name.trim(),
        type,
        balance: numericBalance,
      });
      
      // Reset & Reload
      setName('');
      setType('bank');
      setBalance('');
      setIsDialogOpen(false);
      await fetchAccounts();
    } catch (e: any) {
      setError(e.message || 'Error creating account');
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
        <Button onClick={() => setIsDialogOpen(true)} className="sm:self-start">
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
    </div>
  );
};
