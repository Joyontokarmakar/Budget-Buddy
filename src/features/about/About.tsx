import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../../components/ui';
import { 
  ShieldCheck, 
  Lock, 
  Wallet, 
  CalendarCheck, 
  PieChart, 
  Sparkles, 
  Database, 
  ExternalLink, 
  MapPin, 
  Compass, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  CheckCircle2, 
  Heart,
  FileCheck2
} from 'lucide-react';
import { db } from '../../services/db';
import { useAuthStore } from '../../stores/authStore';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const About: React.FC = () => {
  const { profile } = useAuthStore();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  const handleSeedData = async () => {
    if (!profile) {
      setSeedMessage('No profile found. Please register or login first.');
      return;
    }
    setSeeding(true);
    setSeedMessage('Seeding realistic student transactions...');
    try {
      // 1. Get or create default accounts
      let accounts = await db.getAccounts(profile.id);
      if (accounts.length === 0) {
        await db.createAccount(profile.id, {
          name: 'Sparkasse Giro',
          type: 'bank',
          balance: 450.00
        });
        await db.createAccount(profile.id, {
          name: 'Cash Wallet',
          type: 'cash',
          balance: 45.00
        });
        accounts = await db.getAccounts(profile.id);
      }
      
      const sparkasseAcc = accounts.find(a => a.name.includes('Sparkasse')) || accounts[0];
      const cashAcc = accounts.find(a => a.type === 'cash') || accounts[0];

      // 2. Get categories
      const categories = await db.getCategories(profile.id);
      const foodCat = categories.find(c => c.name.toLowerCase() === 'food' || c.name.toLowerCase() === 'groceries') || categories[0];
      const rentCat = categories.find(c => c.name.toLowerCase() === 'house rent' || c.name.toLowerCase() === 'rent') || categories[0];
      const insuranceCat = categories.find(c => c.name.toLowerCase() === 'health insurance' || c.name.toLowerCase() === 'insurance') || categories[0];
      const shoppingCat = categories.find(c => c.name.toLowerCase() === 'shopping') || categories[0];
      
      const now = new Date();
      const formatOffsetDate = (daysAgo: number) => {
        const d = new Date();
        d.setDate(now.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };

      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 3. Clear existing expenses/incomes first to make seeding clean and repeatable
      const currentExpenses = await db.getExpenses(profile.id);
      const currentIncomes = await db.getIncome(profile.id);
      const currentEmpIncomes = await db.getEmploymentIncome(profile.id);
      
      for (const e of currentExpenses) {
        await db.deleteExpense(profile.id, e.id);
      }
      for (const i of currentIncomes) {
        await db.deleteIncome(profile.id, i.id);
      }
      for (const ei of currentEmpIncomes) {
        await db.deleteEmploymentIncome(profile.id, ei.id);
      }

      // 4. Create Incomes (Support & Job)
      await db.createIncome(profile.id, {
        amount: 850.00,
        date: formatOffsetDate(10),
        type: 'family',
        source_name: 'Eltern Unterhalt',
        destination_account_id: sparkasseAcc.id,
        notes: 'Monthly support'
      });

      await db.createIncome(profile.id, {
        amount: 250.00,
        date: formatOffsetDate(3),
        type: 'scholarship',
        source_name: 'DAAD Scholarship',
        destination_account_id: sparkasseAcc.id,
        notes: 'Partial scholarship payout'
      });

      // 5. Create Employment Income
      await db.createEmploymentIncome(profile.id, {
        amount: 450.00,
        date: formatOffsetDate(5),
        organization_name: 'TU Chemnitz - HiWi',
        destination_account_id: sparkasseAcc.id,
        notes: 'Research Assistant Salary'
      });

      // 6. Create Rent Expense
      await db.createExpense(profile.id, {
        amount: 320.00,
        date: formatOffsetDate(12),
        category_id: rentCat.id,
        payment_account_id: sparkasseAcc.id,
        notes: `Wohnheim Rent [Bill Period: ${monthKey}]`,
        receipt_url: null,
        store_id: null,
        items: null
      });

      // Health Insurance Expense
      await db.createExpense(profile.id, {
        amount: 120.00,
        date: formatOffsetDate(11),
        category_id: insuranceCat.id,
        payment_account_id: sparkasseAcc.id,
        notes: `Techniker Krankenkasse [Bill Period: ${monthKey}]`,
        receipt_url: null,
        store_id: null,
        items: null
      });

      // 7. Create Groceries Expenses
      await db.createExpense(profile.id, {
        amount: 45.30,
        date: formatOffsetDate(7),
        category_id: foodCat.id,
        payment_account_id: sparkasseAcc.id,
        notes: 'Weekly groceries',
        receipt_url: null,
        store_id: 's1', // Lidl
        items: null
      });

      await db.createExpense(profile.id, {
        amount: 28.90,
        date: formatOffsetDate(2),
        category_id: foodCat.id,
        payment_account_id: cashAcc.id,
        notes: 'Vegetables and snacks',
        receipt_url: null,
        store_id: 's2', // Aldi Süd
        items: null
      });

      // 8. Create Shopping Expense
      await db.createExpense(profile.id, {
        amount: 65.00,
        date: formatOffsetDate(8),
        category_id: shoppingCat.id,
        payment_account_id: sparkasseAcc.id,
        notes: 'Textbooks and stationary',
        receipt_url: null,
        store_id: 's50', // Amazon
        items: null
      });

      // 9. Trigger global data change event to sync navigation and dashboards
      window.dispatchEvent(new Event('budget-buddy-data-change'));
      setSeedMessage('Success! Seeded: 1 Job, 2 Incomes, and 5 Expenses. Check out the Dashboard & Analytics now.');
    } catch (err: any) {
      console.error(err);
      setSeedMessage('Error seeding database: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      {/* HERO SECTION */}
      <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-card/80 to-background border border-border/70 p-6 sm:p-10 shadow-xl overflow-hidden backdrop-blur-md">
        {/* Subtle Watermark Logo */}
        <img
          src="/budget-buddy.svg"
          alt=""
          className="absolute -right-12 -bottom-12 w-80 h-80 opacity-[0.06] pointer-events-none select-none transform -rotate-12 dark:opacity-[0.08]"
        />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <img src="/budget-buddy.svg" alt="Budget Buddy Logo" className="h-12 w-12 rounded-2xl shadow-md shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Budget Buddy
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                  Student Edition
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/50">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Intelligent, privacy-first personal budgeting platform for university students.
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground/90 pt-2">
            Managing student life while juggling rent, health insurance, grocery deals, and part-time jobs shouldn't require complex spreadsheets. Budget Buddy provides students with clear financial clarity, local-first data privacy, and intuitive tools built specifically for student living.
          </p>

          <div className="flex flex-wrap gap-2 pt-2 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background/80 border border-border/60 shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> 100% Free & Open-Source
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background/80 border border-border/60 shadow-xs">
              <Lock className="h-3.5 w-3.5 text-teal-500" /> Local-First Privacy
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background/80 border border-border/60 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Offline Capable PWA
            </span>
          </div>
        </div>
      </div>

      {/* CORE VALUE PILLARS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/30 transition-all shadow-xs">
          <CardHeader className="p-5 pb-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
              <Wallet className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-bold">Multi-Account & Wallet</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track checking accounts alongside physical cash reserves and pocket money with effortless transfer logging.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/30 transition-all shadow-xs">
          <CardHeader className="p-5 pb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-bold">Monthly Bills Checklist</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Never miss mandatory student bills (Rent, Health Insurance, Radio Bill, Mobile Contract) with one-click logging.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/30 transition-all shadow-xs">
          <CardHeader className="p-5 pb-2">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-2">
              <PieChart className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-bold">Cash Flow & Store Trends</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Actionable insights comparing your wallet additions, employment earnings, and store spending patterns.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/30 transition-all shadow-xs">
          <CardHeader className="p-5 pb-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-bold">Zero Telemetry Privacy</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your financial transactions belong to you. No advertisement trackers, no third-party data broker sharing.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PRIVACY & LEGAL SECTION */}
      <Card className="border border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileCheck2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Data Privacy & Security Policy</CardTitle>
              <CardDescription>How Budget Buddy protects and manages your financial records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5 p-4 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>1. Local-First Storage</span>
              </div>
              <p>
                When used without cloud authentication, all accounts, expenses, and settings are stored locally on your device in your browser's encrypted local storage.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>2. Secure Cloud Sync</span>
              </div>
              <p>
                When signing in with Supabase, transactions are synced over HTTPS with Row-Level Security (RLS) guaranteeing that only your authenticated profile can access records.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>3. Complete User Ownership</span>
              </div>
              <p>
                You retain complete ownership over your records. You can delete, edit, or wipe all historical balances at any time directly through the app interface.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CREATOR & OPEN-SOURCE ATTRIBUTION */}
      <Card className="border border-border/70 shadow-sm overflow-hidden bg-card/60 backdrop-blur-sm">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
            <div className="relative group shrink-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-teal-400 rounded-full blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
              <img
                src="/developer.jpg"
                alt="Joyonto Karmakar"
                className="relative h-20 w-20 rounded-full object-cover border-2 border-background shadow-md"
              />
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-bold text-foreground">Joyonto Karmakar</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Creator
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> Chemnitz, Germany
                <span className="text-muted-foreground/40">•</span>
                <Compass className="h-3.5 w-3.5 text-primary shrink-0" /> Bangladesh
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                Full-Stack Software Developer & MSc student in Automotive Software Engineering at TU Chemnitz. Built Budget Buddy to solve real budgeting hurdles faced by international university students.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2.5 shrink-0 w-full sm:w-auto justify-center">
            <a
              href="https://joyontokarmakar.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 transition-all"
            >
              <span>Personal Portfolio</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://github.com/Joyontokarmakar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border/60 transition-all"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              <span>GitHub Profile</span>
            </a>
            <a
              href="https://www.linkedin.com/in/joyontokarmakar/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border/60 transition-all"
            >
              <LinkedinIcon className="h-3.5 w-3.5" />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </Card>

      {/* DEVELOPER TOOLS (COLLAPSIBLE ACCORDION FOR EVALUATORS & TESTING) */}
      <Card className="border border-dashed border-border/80 shadow-xs">
        <button
          onClick={() => setIsDevToolsOpen(!isDevToolsOpen)}
          className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Database className="h-4.5 w-4.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-bold text-foreground">Testing & Demonstration Tools</p>
              <p className="text-[11px] text-muted-foreground">Seed sample transactions for chart and balance testing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>{isDevToolsOpen ? 'Hide' : 'Expand'}</span>
            {isDevToolsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {isDevToolsOpen && (
          <div className="p-4 pt-0 border-t border-border/40 space-y-3 bg-muted/10">
            <p className="text-xs text-muted-foreground leading-relaxed pt-3">
              Generate realistic demo student transactions (Sparkasse Giro, Cash Wallet, Werkstudent salary, rent, groceries at Lidl/Aldi, and stationery). 
              <strong className="text-amber-500 dark:text-amber-400"> Note:</strong> This will replace current expenses and incomes with sample testing data.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedData}
                loading={seeding}
                className="gap-2 border-primary/30 hover:border-primary text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Seed Sample Student Transactions
              </Button>
            </div>

            {seedMessage && (
              <div className="p-3 rounded-xl bg-card border border-border text-xs font-medium text-foreground">
                {seedMessage}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* SYSTEM TECH STACK FOOTER */}
      <div className="text-center text-[11px] text-muted-foreground/60 space-y-1">
        <p>Built with React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons & Recharts.</p>
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> for students worldwide.
        </p>
      </div>
    </div>
  );
};
