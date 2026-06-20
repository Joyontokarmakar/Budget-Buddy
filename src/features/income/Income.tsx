import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { IncomeWithDetails, Account, IncomeType } from '../../types';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent, Spinner } from '../../components/ui';
import { ArrowDownLeft, Calendar, Coins, PlusCircle, AlertCircle } from 'lucide-react';

export const Income: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [incomes, setIncomes] = useState<IncomeWithDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<IncomeType>('werkstudent');
  const [sourceName, setSourceName] = useState('');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const [incData, accData] = await Promise.all([
        db.getIncome(profile.id),
        db.getAccounts(profile.id),
      ]);
      setIncomes(incData);
      setAccounts(accData);

      // Default destination to first account if not set
      if (accData.length > 0 && !destinationAccount) {
        setDestinationAccount(accData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Set default account when accounts list changes
  useEffect(() => {
    if (accounts.length > 0 && !destinationAccount) {
      setDestinationAccount(accounts[0].id);
    }
  }, [accounts]);

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccessMsg(null);

    if (!amount.trim() || !date || !destinationAccount) {
      setError('Please fill in all required fields');
      return;
    }

    if (type === 'other' && !sourceName.trim()) {
      setError('Please specify the source name for "Other"');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Amount must be greater than €0.00');
      return;
    }

    try {
      setSaving(true);
      await db.createIncome(profile.id, {
        amount: numericAmount,
        date,
        type,
        destination_account_id: destinationAccount,
        notes: notes.trim() || null,
        source_name: sourceName.trim() || null,
      });

      // Reset & Reload
      setAmount('');
      setSourceName('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setSuccessMsg('Income logged successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Error saving income');
    } finally {
      setSaving(false);
    }
  };

  const getIncomeTypeLabel = (incType: IncomeType) => {
    switch (incType) {
      case 'werkstudent':
        return t('income.werkstudent');
      case 'scholarship':
        return t('income.scholarship');
      case 'family':
        return t('income.family');
      case 'freelance':
        return t('income.freelance');
      default:
        return t('income.other');
    }
  };

  if (loading && incomes.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-full">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{t('income.title')}</h1>
        <p className="text-xs text-muted-foreground">Log salaries, stipends, and family support to fuel your budget</p>
      </div>

      {/* Income Log Form */}
      <div className="lg:col-span-1">
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Log New Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex gap-2.5 items-start">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  No payment account exists. You must create an asset account (e.g. Bank Account) before logging income.
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddIncome} className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold">
                    {successMsg}
                  </div>
                )}

                <Input
                  type="number"
                  step="0.01"
                  label={t('income.amount')}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  icon={<Coins className="h-4 w-4 text-muted-foreground" />}
                  required
                />

                <Input
                  type="date"
                  label={t('income.date')}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                  required
                />

                <Select
                  label={t('income.type')}
                  value={type}
                  onChange={(e) => setType(e.target.value as IncomeType)}
                  options={[
                    { value: 'werkstudent', label: t('income.werkstudent') },
                    { value: 'scholarship', label: t('income.scholarship') },
                    { value: 'family', label: t('income.family') },
                    { value: 'freelance', label: t('income.freelance') },
                    { value: 'other', label: t('income.other') },
                  ]}
                />

                <Input
                  label={t('income.sourceName') + (type === 'other' ? ' *' : '')}
                  placeholder={
                    type === 'werkstudent' ? 'e.g., Apple GmbH' :
                    type === 'scholarship' ? 'e.g., DAAD' :
                    type === 'family' ? 'e.g., parents' :
                    type === 'freelance' ? 'e.g., web design' :
                    'e.g., Birthday Gift'
                  }
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  required={type === 'other'}
                />

                <Select
                  label={t('income.destination')}
                  value={destinationAccount}
                  onChange={(e) => setDestinationAccount(e.target.value)}
                  options={accounts.map(acc => ({
                    value: acc.id,
                    label: `${acc.name} (€${acc.balance.toFixed(2)})`,
                  }))}
                />

                <Input
                  label={t('income.notes')}
                  placeholder="e.g., June Paycheck"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <Button type="submit" className="w-full mt-2" loading={saving}>
                  {t('income.save')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income Log History */}
      <div className="lg:col-span-2 space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground px-1 uppercase tracking-wider">Income Log History</h3>
        {incomes.length === 0 ? (
          <Card className="py-12 text-center border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3">
              <Coins className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No income logged yet.</p>
            </CardContent>
          </Card>
        ) : (
          incomes.map((inc) => (
            <Card key={inc.id} className="hover:border-primary/20 transition-all duration-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {inc.source_name ? inc.source_name : getIncomeTypeLabel(inc.type)}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-2">
                      <span>{new Date(inc.date).toLocaleDateString('de-DE')}</span>
                      {inc.source_name && (
                        <>
                          <span>•</span>
                          <span>{getIncomeTypeLabel(inc.type)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>To: {inc.account?.name || 'Unknown Account'}</span>
                    </p>
                    {inc.notes && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{inc.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    +€{inc.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
