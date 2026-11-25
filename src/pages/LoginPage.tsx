import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Moon, Sun } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { isLoginLocked, MAX_FAILED_LOGIN_ATTEMPTS } from '../lib/validation';

export function LoginPage() {
  const {
    login,
    loginWithGoogle,
    loginDemoResearcher,
    sendPasswordReset,
    lockoutState,
    isLiveFirebase,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const locked = isLoginLocked(lockoutState);
  const lockMinutesRemaining = locked
    ? Math.max(1, Math.ceil(((lockoutState.lockedUntil ?? Date.now()) - Date.now()) / 60000))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const profile = await login(email, password, rememberMe);
      pushToast({
        type: 'success',
        title: `Welcome back, ${profile.name}`,
      });
      navigate(profile.emailVerified ? '/dashboard' : '/verify-email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in.';
      setError(msg);
      pushToast({ type: 'error', title: 'Sign-in failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const profile = await loginWithGoogle();
      pushToast({ type: 'success', title: `Signed in as ${profile.name}` });
      navigate(profile.emailVerified ? '/dashboard' : '/verify-email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const profile = await loginDemoResearcher();
      pushToast({
        type: 'info',
        title: 'Demo researcher session started',
        description: `Signed in as ${profile.name}`,
      });
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Enter your registered email address first.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
      pushToast({
        type: 'success',
        title: 'Password reset link sent',
        description: `Check ${email} for reset instructions.`,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#091414] text-[#0F2423] dark:text-[#F2F5F3] flex flex-col">
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" aria-label="TaxaTrace Home">
          <Logo size="sm" showWordmark />
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-lg text-[#3F5957] dark:text-[#9DB6B3] hover:bg-[#ECEAE2] dark:hover:bg-[#142625]"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-6 sm:p-8">
          <div className="mb-6">
            <Logo size="md" showWordmark showTagline />
            <h1 className="font-display text-2xl font-bold mt-5 text-[#0F2423] dark:text-[#FAF9F5]">
              {resetMode ? 'Reset your password' : 'Sign in to TaxaTrace'}
            </h1>
            <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-1">
              {resetMode
                ? 'We will send a secure password reset link to your email.'
                : 'Access your environmental DNA projects, sequences, and diversity reports.'}
            </p>
          </div>

          {locked && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg border border-[#E8725A]/60 bg-[#E8725A]/10 text-sm text-[#0F2423] dark:text-[#FAF9F5]"
            >
              <div className="flex items-center gap-2 font-semibold text-[#C84B31] dark:text-[#E8725A]">
                <Lock className="w-4 h-4" />
                Sign-in temporarily locked
              </div>
              <p className="mt-1 text-xs text-[#4A6361] dark:text-[#CBD9D7]">
                Too many failed attempts ({MAX_FAILED_LOGIN_ATTEMPTS}/{MAX_FAILED_LOGIN_ATTEMPTS}).
                Please wait {lockMinutesRemaining} minute(s) before trying again or use Forgot
                password.
              </p>
            </div>
          )}

          {error && !locked && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg border border-[#E8725A]/60 bg-[#E8725A]/10 text-xs text-[#9E3520] dark:text-[#F6B3A4]"
            >
              {error}
            </div>
          )}

          {resetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium mb-1.5">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@institution.edu"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                />
              </div>

              {resetSent && (
                <p className="text-xs text-[#1F8A72] dark:text-[#7ED6B5]">
                  Reset instructions dispatched. Check your inbox and spam folder.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setResetSent(false);
                  setError(null);
                }}
                className="w-full py-2 text-sm text-[#4A6361] dark:text-[#9DB6B3] hover:text-[#0F4C4A] dark:hover:text-[#FAF9F5]"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium mb-1.5">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@institution.edu"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-sm font-medium">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetMode(true);
                        setError(null);
                      }}
                      className="text-xs font-medium text-[#1F8A72] dark:text-[#7ED6B5] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 pr-11 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#4A6361] dark:text-[#9DB6B3] hover:text-[#0F2423] dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-[#4A6361] dark:text-[#9DB6B3] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#0F4C4A]"
                    />
                    Remember me
                  </label>
                  {lockoutState.failedAttempts > 0 && !locked && (
                    <span className="text-xs font-mono tabular-nums text-[#C84B31] dark:text-[#F2B84B]">
                      {MAX_FAILED_LOGIN_ATTEMPTS - lockoutState.failedAttempts} tries left
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || locked}
                  className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E3E1D8] dark:bg-[#1C3432]" />
                <span className="text-xs text-[#5A7370] dark:text-[#86A19E]">or</span>
                <div className="h-px flex-1 bg-[#E3E1D8] dark:bg-[#1C3432]" />
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={submitting || locked}
                  onClick={handleGoogle}
                  className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] hover:bg-[#EFECE3] dark:hover:bg-[#142625] transition-colors flex items-center justify-center gap-2.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  Continue with Google
                </button>

                {!isLiveFirebase && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDemo}
                    className="w-full py-2.5 px-4 text-xs font-medium rounded-lg border border-dashed border-[#1F8A72]/50 text-[#0F4C4A] dark:text-[#7ED6B5] hover:bg-[#7ED6B5]/10 transition-colors"
                  >
                    Continue with Demo Researcher Account (Local Preview)
                  </button>
                )}
              </div>

              <p className="mt-6 text-center text-sm text-[#4A6361] dark:text-[#9DB6B3]">
                New to TaxaTrace?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#0F4C4A] dark:text-[#7ED6B5] hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
