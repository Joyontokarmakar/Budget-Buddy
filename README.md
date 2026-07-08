# 💳 BudgetBuddy Student

Developed by **[Joyonto Karmakar](https://joyontokarmakar.netlify.app)**.

> A premium, responsive student-focused financial management Progressive Web App (PWA) designed to simplify student life.

BudgetBuddy features a modern, interactive dashboard, receipt OCR scanning, detailed analytics visualizations, localized multi-language support, and auto-syncs with **Supabase** with a seamless local mock fallback.

---

## ✨ Key Features

### 🔒 1. Authentication & Security
- **Secure Email Auth:** Pre-built forms for registration, login, forgot password, and reset password actions.
- **Single Sign-On (SSO):** Quick login utilizing Google Accounts.
- **Dynamic Startup Flow:** Interactive splash loader verifying auth status with liquid SVG clipping fill animations and a pulsing glow.
- **Local Fallback Mode:** Operates out-of-the-box locally with memory mock synchronization if Supabase services are offline.

### 📊 2. Dynamic Financial Dashboard
- **Revolut-Inspired KPI Grid:**
  - **Total Assets:** Aggregated live balance across all checking, savings accounts, and cash wallets.
  - **Monthly Spending:** Live tracking of all expenditures logged in the current calendar month.
  - **Remaining Budget:** Real-time visual progress indicator with threshold alerts (`Safe` < 75%, `Near Limit` 75%–100%, `Exceeded` > 100%).
- **Interactive Action Grid:** Single-tap shortcuts to record expenses, log income, or manage accounts.
- **Recent Activity Ledger:** The last five transactions with color-coded categories and currency flows.

### 🧾 3. Smart Expense Tracking & Receipt Scanning
- **Manual Logging:** Record transactions with custom categories, stores, notes, dates, and account deductions.
- **Smart Category Selection:** Automatically defaults the category selection to **Food** for quick entry, or auto-detects categories like groceries from receipt store names.
- **Receipt OCR Scanning:** Upload receipt images or PDFs to auto-extract and prefill merchant name, total price, and date fields.
- **Nested Itemized Logging:** Log multiple independent items within a single bill, assigning distinct categories to each item.
- **Monthly Bills Checklist:** A handy utility checklist for rent, health insurance, mobile plans, broadcasting fees (Rundfunkbeitrag), and semester contribution fees. Each bill is tickable to quick-log instantly, showing green checkmarks when logged and a **"Done"** completion badge when all monthly bills are cleared.

### 💰 4. Income & Account Management
- **Category Logging:** Organize student income by Werkstudent Salary, Scholarships, Family Support, Freelance, or other sources.
- **Ledger Integrations:** Map earnings directly to checking or savings accounts to automatically update balances.
- **Flexible Accounts:** Support checking accounts, bank accounts, savings accounts, and cash wallets.

### 📈 5. Visual Analytics & Detailed Reports
- **Bill Analyzer:** Tracks essential recurring student expenses like House Rent, Health Insurance, Broadcasting Fees (Rundfunkbeitrag), and Mobile Plans.
- **Data Charts:** Visual pie charts (spending by category), line charts (weekly cash flow velocity), and bar charts (cash flow ratios).
- **Localized Sheets Grid:** A spreadsheet-style responsive grid listing all transactions for granular filters.

### 💎 6. Permanent Assets Tracking
- **Asset Ledger:** Log valuable inventory items purchased (e.g., laptops, phones, furniture, books) with purchase date, merchant store, and price to track total hardware asset worth.
- **Hardware Portfolio:** View, update, and manage your permanent assets profile in a structured layout.

### 🤝 7. Deposits & Loans Ledger
- **External Deposits:** Track incoming or outgoing deposits mapping to designated checking or savings accounts.
- **Debt Registry (Borrowed/Lent):** Track money borrowed from (loans taken) or lent to others (loans provided) with repayment timelines and due dates.
- **Active Repayments Console:** View outstanding amounts, register repayments, and filter by settled/active loan profiles.

### 🔍 8. Universal Autocomplete Search
- **Global Search Component:** Quick keyboard shortcuts to search transactions, products, shops, and navigation shortcuts across the entire app.

### 🛠️ 9. Interactive Developer Console
- **Testing Tools:** Seed mock data for all tables, reset local database, simulate OCR receipt scans, and troubleshoot mock authentication states.

### 🌍 10. Personalization & PWA
- **Theme Modes:** Seamless toggling between sleek Light Mode, Dark Mode, and System Settings.
- **Multi-Language (i18n):** Complete translation support for English and German.
- **PWA Installation:** Installable on iOS, Android, and Desktop with full offline caching capabilities.

---

## 🛠️ Technology Stack

* **Frontend:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Database & Sync:** [Supabase](https://supabase.com/) (PostgreSQL & Realtime Auth)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Localization:** [i18next](https://www.i18next.com/)
* **PWA:** [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

---

## 🤝 Contribution Guidelines
If you'd like to contribute, please fork the repository and use a feature branch. Pull requests are warmly welcome!
