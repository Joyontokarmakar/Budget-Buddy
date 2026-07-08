import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { isSupabaseConfigured } from '../../services/supabase';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';

// =========================================================================
// SIGN IN PAGE
// =========================================================================
export const SignInPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
    } else {
      navigate('/');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err);
    } else if (!isSupabaseConfigured) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border bg-card/60 backdrop-blur-md relative z-10">
        <CardHeader className="space-y-2 text-center pb-4">
          <img src="/budget-buddy.svg" className="mx-auto h-12 w-12 rounded-2xl shadow-lg shrink-0" alt="Budgetbuddy Logo" />
          <CardTitle className="text-2xl font-bold tracking-tight">Budgetbuddy Student</CardTitle>
          <CardDescription>{t('auth.signIn')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupabaseConfigured && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex gap-2.5 items-start">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-bold">Local Sync Active:</span> Budgetbuddy is running using secure local database. You can sign in or register with any credentials to start tracking immediately.
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label={t('auth.email')}
              placeholder="name@university.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
            />
            <div className="space-y-1">
              <Input
                type="password"
                label={t('auth.password')}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                required
              />
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              {t('auth.signIn')}
            </Button>
          </form>

          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative px-3 bg-card text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Or
            </span>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" width="24" height="24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            {t('auth.googleLogin')}
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/register"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {t('auth.noAccount')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// =========================================================================
// SIGN UP PAGE
// =========================================================================
export const SignUpPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, loading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const { error: err } = await signUp(email, password, name);
    if (err) {
      setError(err);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border bg-card/60 backdrop-blur-md relative z-10">
        <CardHeader className="space-y-2 text-center pb-4">
          <img src="/budget-buddy.svg" className="mx-auto h-12 w-12 rounded-2xl shadow-lg shrink-0" alt="Budgetbuddy Logo" />
          <CardTitle className="text-2xl font-bold tracking-tight">Budgetbuddy Student</CardTitle>
          <CardDescription>{t('auth.signUp')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              label={t('auth.name')}
              placeholder="Max Mustermann"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="h-4 w-4" />}
              required
            />
            <Input
              type="email"
              label={t('auth.email')}
              placeholder="name@university.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
            />
            <Input
              type="password"
              label={t('auth.password')}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />
            <Input
              type="password"
              label={t('auth.confirmPassword')}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              {t('auth.signUp')}
            </Button>
          </form>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {t('auth.hasAccount')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// =========================================================================
// FORGOT PASSWORD PAGE
// =========================================================================
export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const { resetPassword, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Please enter your email');
      return;
    }

    const { error: err } = await resetPassword(email);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border bg-card/60 backdrop-blur-md relative z-10">
        <CardHeader className="space-y-2 text-center pb-4">
          <img src="/budget-buddy.svg" className="mx-auto h-12 w-12 rounded-2xl shadow-lg shrink-0" alt="Budgetbuddy Logo" />
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>We'll send you an email instructions link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex gap-2.5 items-start">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div>
                <span className="font-bold">Check your inbox:</span> Reset password instructions have been sent to your email address!
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label={t('auth.email')}
                placeholder="name@university.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                {t('auth.sendResetLink')}
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// =========================================================================
// RESET PASSWORD PAGE
// =========================================================================
export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, loading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const { error: err } = await updatePassword(password);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border bg-card/60 backdrop-blur-md relative z-10">
        <CardHeader className="space-y-2 text-center pb-4">
          <img src="/budget-buddy.svg" className="mx-auto h-12 w-12 rounded-2xl shadow-lg shrink-0" alt="Budgetbuddy Logo" />
          <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex gap-2.5 items-start">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div>
                <span className="font-bold">Password Reset Successful!</span> Redirecting you to sign in...
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                label="New Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                required
              />
              <Input
                type="password"
                label="Confirm New Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                Update Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
