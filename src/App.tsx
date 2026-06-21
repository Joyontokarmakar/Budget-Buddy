import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
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
