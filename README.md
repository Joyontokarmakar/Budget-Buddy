# 💳 BudgetBuddy Student

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
- **Receipt OCR Scanning:** Upload receipt images or PDFs to auto-extract and prefill merchant name, total price, and date fields.
- **Nested Itemized Logging:** Log multiple independent items within a single bill, assigning distinct categories to each item.

### 💰 4. Income & Account Management
- **Category Logging:** Organize student income by Werkstudent Salary, Scholarships, Family Support, Freelance, or other sources.
- **Ledger Integrations:** Map earnings directly to checking or savings accounts to automatically update balances.

### 📈 5. Visual Analytics & Detailed Reports
- **Bill Analyzer:** Tracks essential recurring student expenses like House Rent, Health Insurance, Broadcasting Fees (Rundfunkbeitrag), and Mobile Plans.
- **Data Charts:** Visual pie charts (spending by category), line charts (weekly cash flow velocity), and bar charts (cash flow ratios).
- **Localized Sheets Grid:** A spreadsheet-style responsive grid listing all transactions for granular filters.

### 🌍 6. Personalization & PWA
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

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)

### 💻 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Joyontokarmakar/Budget-Buddy.git
   cd Budget-Buddy
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials (if no credentials are provided, BudgetBuddy will fallback to secure Local Memory Mode automatically):
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Launch the development server:**
   ```bash
   npm run dev
   ```
   Open **`http://localhost:5173`** in your browser to view the application.

5. **Build for Production:**
   To bundle the application into optimized static assets under the `dist/` folder:
   ```bash
   npm run build
   ```

---

## 🤝 Contribution Guidelines
If you'd like to contribute, please fork the repository and use a feature branch. Pull requests are warmly welcome!
