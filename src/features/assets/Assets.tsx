import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/db';
import type { PermanentAsset } from '../../types';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardDescription, Spinner, Dialog } from '../../components/ui';
import { Gem, PlusCircle, Trash2, Calendar, ShoppingBag, Euro, TrendingUp, Search, ArrowUpDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export const Assets: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [assets, setAssets] = useState<PermanentAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // Derived values for stats
  const totalValue = assets.reduce((sum, item) => sum + item.price, 0);
  const totalCount = assets.length;
  const avgValue = totalCount > 0 ? totalValue / totalCount : 0;

  // Filter & Sort Assets
  const filteredAssets = assets
    .filter(asset => 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.store.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'price') {
        comparison = a.price - b.price;
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Calculate cumulative trend data
  const chartData = (() => {
    if (assets.length === 0) return [];
    // Sort chronological (ascending)
    const chronological = [...assets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulative = 0;
    return chronological.map(asset => {
      cumulative += asset.price;
      return {
        date: new Date(asset.date).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
        value: cumulative,
        name: asset.name,
        price: asset.price
      };
    });
  })();

  if (loading && assets.length === 0) {
    return <Spinner />;
  }

  // Theme checking for chart styling
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Header */}
      <div className="lg:col-span-full">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{t('nav.assets')}</h1>
        <p className="text-xs text-muted-foreground">Keep a registry of your major purchases. These records do not impact your bank balances.</p>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:col-span-full">
        {/* Total Assets Capital */}
        <Card className="bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent border-primary/20 hover:scale-[1.01] hover:shadow-md transition-all duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Total Asset Value
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight">
                €{totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <Gem className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Registered Count */}
        <Card className="bg-gradient-to-tr from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 hover:scale-[1.01] hover:shadow-md transition-all duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Assets Registered
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight">
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Average Value */}
        <Card className="bg-gradient-to-tr from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 hover:scale-[1.01] hover:shadow-md transition-all duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Average Item Value
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight">
                €{avgValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Euro className="h-6 w-6 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Growth Chart */}
      {assets.length > 0 && (
        <Card className="lg:col-span-full border border-border/60 bg-card/50 backdrop-blur-md overflow-hidden hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
              Net Asset Worth Growth
            </CardTitle>
            <CardDescription>Cumulative valuation of your logged major purchases over time</CardDescription>
          </CardHeader>
          <CardContent className="h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAssetVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} className="stroke-border/40" />
                <XAxis 
                  dataKey="date" 
                  stroke={textColor} 
                  style={{ fontSize: '10px', fontWeight: '600' }} 
                />
                <YAxis 
                  stroke={textColor} 
                  style={{ fontSize: '10px', fontWeight: '600' }}
                  tickFormatter={(val) => `€${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                  }}
                  itemStyle={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 'bold' }}
                  formatter={(value: any) => [
                    `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`,
                    'Cumulative Worth'
                  ]}
                  labelFormatter={(label, items) => {
                    if (items && items[0]) {
                      const payload = items[0].payload;
                      return `${payload.date} - Logged: ${payload.name} (€${payload.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })})`;
                    }
                    return label;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--color-primary, #3b82f6)" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorAssetVal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Asset Registry ({filteredAssets.length})
          </h3>
          
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search name or store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-40 sm:w-48 pl-9 pr-7 rounded-xl border border-border bg-card/60 text-xs transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/40">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-0 text-[10px] sm:text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <option value="date">Date</option>
                <option value="price">Price</option>
                <option value="name">Name</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <Card className="py-12 text-center border-dashed bg-card/45">
            <CardContent className="flex flex-col items-center justify-center gap-3">
              <Gem className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? 'No matching assets found.' : 'No permanent assets registered yet.'}
              </p>
              {searchQuery && (
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              )}
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
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-muted/30 transition-colors group">
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
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
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

