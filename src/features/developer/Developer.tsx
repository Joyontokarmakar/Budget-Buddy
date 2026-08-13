import React, { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { Globe, Mail, Phone, MapPin, Compass, ExternalLink, Database } from 'lucide-react';
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

export const Developer: React.FC = () => {
  const { profile } = useAuthStore();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

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
    <div className="space-y-6 flex flex-col md:flex-row items-stretch justify-center max-w-4xl mx-auto min-h-[75vh] gap-6 p-4">
      {/* Developer Profile Card */}
      <Card className="flex-1 bg-card/70 backdrop-blur-md border border-border/60 p-6 flex flex-col items-center shadow-xl relative overflow-hidden">
        {/* Watermark Logo Background */}
        <img
          src="/budget-buddy.svg"
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-[0.06] pointer-events-none z-0 select-none transform -rotate-12"
        />

        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="relative mb-5 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-violet-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
            <img
              src="/developer.jpg"
              alt="Joyonto Karmakar"
              className="relative h-24 w-24 rounded-full object-cover border-4 border-card shadow-lg transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>

          <h2 className="text-lg font-bold tracking-tight">Joyonto Karmakar</h2>
          <p className="text-xs font-semibold text-primary mt-1 uppercase tracking-wider">Full-Stack Web Developer</p>
          
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground font-semibold">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> Chemnitz, Germany
            </span>
            <span className="flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-primary shrink-0" /> Bangladesh
            </span>
          </div>

          <hr className="w-full border-border/40 my-4.5" />

          <div className="text-center text-xs leading-relaxed text-muted-foreground/90 space-y-2.5 px-2">
            <p>
              Full-Stack Web Developer with 5+ years of experience building high-performance web applications. Specializing in JavaScript, TypeScript, Vue.js, and React.js.
            </p>
            <p>
              Pursuing MSc in Automotive Software Engineering at TU Chemnitz, Germany.
            </p>
          </div>

          <a
            href="https://joyontokarmakar.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-6 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all active:scale-[0.98] group"
          >
            <Globe className="h-4 w-4" />
            Visit Portfolio & CV
            <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <a
            href="https://www.buymeacoffee.com/joyontokarmakar"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block transition-transform duration-200 active:scale-[0.98] hover:scale-[1.02] focus:outline-none"
          >
            <img
              src="/bmc-button.png"
              alt="Buy Me A Coffee"
              className="h-10 w-auto object-contain shadow-md rounded-xl"
            />
          </a>

          <div className="flex items-center justify-center gap-2 mt-4.5 w-full">
            <a
              href="mailto:joyonto.karmakar.cse@gmail.com"
              title="Email Joyonto"
              className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
            </a>

            <a
              href="https://github.com/Joyontokarmakar"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub Profile"
              className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <GithubIcon className="h-4 w-4" />
            </a>

            <a
              href="https://www.linkedin.com/in/joyontokarmakar"
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn Profile"
              className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <LinkedinIcon className="h-4 w-4" />
            </a>

            <a
              href="tel:+491631739855"
              title="Call Phone"
              className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Card>

      {/* Developer Tools Card */}
      <Card className="flex-1 bg-card/70 backdrop-blur-md border border-border/60 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Database className="h-5.5 w-5.5 text-primary" />
            Developer Tools
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Utility functions for development and testing.</p>

          <hr className="w-full border-border/40 my-4.5" />

          <div className="space-y-4">
            <div className="bg-secondary/40 p-4 rounded-2xl border border-border/55">
              <h3 className="text-xs font-bold text-foreground">Seed Mock Database</h3>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                Clears all transactions (expenses, incomes, and jobs) for your active account and inserts 1 job, 2 incomes, and 5 mock student expenses (rent, food, books, health insurance) spanning the current month.
              </p>
              
              <Button
                onClick={handleSeedData}
                loading={seeding}
                className="w-full mt-4 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
              >
                <Database className="h-4 w-4" />
                Seed Student Demo Data
              </Button>
            </div>
          </div>
        </div>

        {seedMessage && (
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-semibold leading-relaxed">
            {seedMessage}
          </div>
        )}
      </Card>
    </div>
  );
};

