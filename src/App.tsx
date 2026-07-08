import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './theme/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Features
import { SignInPage, SignUpPage, ForgotPasswordPage, ResetPasswordPage } from './features/auth/AuthPages';
import { Dashboard } from './features/dashboard/Dashboard';
import { Expenses } from './features/expenses/Expenses';
import { Income } from './features/income/Income';
import { Accounts } from './features/accounts/Accounts';
import { Analytics } from './features/analytics/Analytics';
import { Reports } from './features/reports/Reports';
import { Assets } from './features/assets/Assets';
import { Settings } from './features/settings/Settings';
import { Developer } from './features/developer/Developer';
import { DepositsLoans } from './features/deposits-loans/DepositsLoans';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// SEO and Page Title Dynamic Router Sync
function SEOTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let pageTitle = 'BudgetBuddy Student - Free Student Budget Calculator & Expense Tracker PWA';
    
    if (path === '/') {
      pageTitle = 'Dashboard | BudgetBuddy Student - Free Student Budget Calculator';
    } else if (path.startsWith('/expenses')) {
      pageTitle = 'Track Expenses & Monthly Bills Checklist | BudgetBuddy Student';
    } else if (path.startsWith('/income')) {
      pageTitle = 'Log Income & Werkstudent Salaries | BudgetBuddy Student';
    } else if (path.startsWith('/accounts')) {
      pageTitle = 'Manage Bank Accounts & Asset Balances | BudgetBuddy Student';
    } else if (path.startsWith('/deposits-loans')) {
      pageTitle = 'Student Debt Tracker - Loans & Repayments | BudgetBuddy Student';
    } else if (path.startsWith('/analytics')) {
      pageTitle = 'Student Spending Analytics & Financial Charts | BudgetBuddy Student';
    } else if (path.startsWith('/reports')) {
      pageTitle = 'Download Financial Statements & Reports | BudgetBuddy Student';
    } else if (path.startsWith('/assets')) {
      pageTitle = 'Permanent Assets & Hardware Purchases Tracker | BudgetBuddy Student';
    } else if (path.startsWith('/settings')) {
      pageTitle = 'Student Budget Limit & Profile Settings | BudgetBuddy Student';
    } else if (path.startsWith('/developer')) {
      pageTitle = 'Developer Console & Mock DB Console | BudgetBuddy Student';
    } else if (path.startsWith('/login')) {
      pageTitle = 'Sign In | BudgetBuddy Student - Free Student Budget Calculator';
    } else if (path.startsWith('/register')) {
      pageTitle = 'Sign Up & Create Account | BudgetBuddy Student - Free Student Budget Calculator';
    } else if (path.startsWith('/forgot-password')) {
      pageTitle = 'Forgot Password | BudgetBuddy Student - Free Student Budget Calculator';
    } else if (path.startsWith('/reset-password')) {
      pageTitle = 'Reset Password | BudgetBuddy Student - Free Student Budget Calculator';
    }

    document.title = pageTitle;
  }, [location]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <SEOTracker />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<SignInPage />} />
            <Route path="/register" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="income" element={<Income />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="deposits-loans" element={<DepositsLoans />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="reports" element={<Reports />} />
              <Route path="assets" element={<Assets />} />
              <Route path="settings" element={<Settings />} />
              <Route path="developer" element={<Developer />} />
            </Route>

            {/* Fallback Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
