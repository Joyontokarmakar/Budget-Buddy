import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { PermanentAsset } from '../../types';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Spinner, Dialog } from '../../components/ui';
import { Gem, PlusCircle, Trash2, Calendar, ShoppingBag, Euro } from 'lucide-react';

export const Assets: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [assets, setAssets] = useState<PermanentAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'destructive' | 'secondary';
    onConfirm: () => void;
  } | null>(null);

  const loadData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const data = await db.getPermanentAssets(profile.id);
      setAssets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccessMsg(null);

    if (!name.trim() || !store.trim() || !price.trim() || !date) {
      setError('Please fill in all fields');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError('Price must be greater than €0.00');
      return;
    }

    try {
      setSaving(true);
      await db.createPermanentAsset(profile.id, {
        name: name.trim(),
        store: store.trim(),
        price: numericPrice,
        date,
      });

      // Reset & Reload
      setName('');
      setStore('');
      setPrice('');
      setDate(new Date().toISOString().split('T')[0]);
      setSuccessMsg('Asset logged successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Error saving asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!profile) return;
    setConfirmState({
      isOpen: true,
      title: 'Delete Asset Record',
      description: 'Are you sure you want to delete this asset record? This action cannot be undone.',
      confirmText: 'Delete',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          await db.deletePermanentAsset(profile.id, id);
          await loadData();
        } catch (e: any) {
          console.error(e);
        }
      }
    });
  };

  if (loading && assets.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-full">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{t('nav.assets')}</h1>
        <p className="text-xs text-muted-foreground">Keep a registry of your major purchases. These records do not impact your bank balances.</p>
      </div>

      {/* Asset Log Form */}
      <div className="lg:col-span-1">
        <Card className="sticky top-20 shadow-md bg-card/75 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Log New Asset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAsset} className="space-y-4">
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
                label="Asset Name"
                placeholder="e.g., Washing Machine, Laptop"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<Gem className="h-4 w-4 text-muted-foreground" />}
                required
              />

              <Input
                label="Store / Source"
                placeholder="e.g., Saturn, MediaMarkt, Amazon"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                required
              />

              <Input
                type="number"
                step="0.01"
                label="Purchase Price"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                icon={<Euro className="h-4 w-4 text-muted-foreground" />}
                required
              />

              <Input
                type="date"
                label="Purchase Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                required
              />

              <Button type="submit" className="w-full mt-2" loading={saving}>
                Save Asset Record
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Asset Log List */}
      <div className="lg:col-span-2 space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground px-1 uppercase tracking-wider">Asset Registry ({assets.length})</h3>
        {assets.length === 0 ? (
          <Card className="py-12 text-center border-dashed bg-card/45">
            <CardContent className="flex flex-col items-center justify-center gap-3">
              <Gem className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No permanent assets registered yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border border-border rounded-2xl bg-card/75 backdrop-blur-md overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 text-muted-foreground border-b border-border/80 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Asset Name</th>
                    <th className="py-3 px-4">Purchased From</th>
                    <th className="py-3 px-4 w-28">Date</th>
                    <th className="py-3 px-4 text-right w-28">Price</th>
                    <th className="py-3 px-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-semibold text-foreground/90">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground text-sm flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Gem className="h-4 w-4" />
                        </div>
                        {asset.name}
                      </td>
                      <td className="py-3.5 px-4 text-foreground/80">{asset.store}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {new Date(asset.date).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-foreground text-sm">
                        €{asset.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title || ''}
        footer={
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => setConfirmState(null)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant={confirmState?.confirmVariant || 'primary'} 
              onClick={() => {
                confirmState?.onConfirm();
                setConfirmState(null);
              }}
            >
              {confirmState?.confirmText || 'Confirm'}
            </Button>
          </div>
        }
      >
        <p className="text-sm font-semibold text-muted-foreground">
          {confirmState?.description}
        </p>
      </Dialog>
    </div>
  );
};
