import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { MailCheck, RefreshCw, LogOut } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function VerifyEmailPage() {
  const {
    user,
    isLiveFirebase,
    resendVerificationEmail,
    refreshVerificationStatus,
    completeDemoVerification,
    logout,
  } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      pushToast({
        type: 'success',
        title: 'Verification email sent',
        description: `Sent to ${user.email}`,
      });
    } catch (err: unknown) {
      pushToast({
        type: 'error',
        title: 'Could not resend email',
        description: err instanceof Error ? err.message : 'Please try again shortly.',
      });
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const verified = await refreshVerificationStatus();
      if (verified) {
        pushToast({ type: 'success', title: 'Email verified! Opening workspace.' });
        navigate('/dashboard');
      } else {
        pushToast({
          type: 'info',
          title: 'Still awaiting verification',
          description: 'Click the verification link in your inbox, then check again.',
        });
      }
    } finally {
      setChecking(false);
    }
  };

  const handleLocalVerify = () => {
    completeDemoVerification();
    pushToast({
      type: 'success',
      title: 'Email verified (Local preview)',
      description: 'Dashboard access unlocked.',
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#091414] text-[#0F2423] dark:text-[#F2F5F3] flex flex-col">
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" aria-label="TaxaTrace Home">
          <Logo size="sm" showWordmark />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="inline-flex items-center gap-1.5 text-sm text-[#4A6361] dark:text-[#9DB6B3] hover:text-[#0F2423] dark:hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-7 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#0F4C4A]/10 dark:bg-[#7ED6B5]/15 flex items-center justify-center text-[#0F4C4A] dark:text-[#7ED6B5]">
            <MailCheck className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold mt-4">Verify your email address</h1>
          <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-2 leading-relaxed">
            We sent a verification link to{' '}
            <span className="font-semibold text-[#0F2423] dark:text-[#FAF9F5]">{user.email}</span>.
            Dashboard access remains locked until your address is confirmed.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={checking}
              onClick={handleCheck}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] transition-colors inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking status...' : 'I verified my email'}
            </button>

            <button
              type="button"
              disabled={resending}
              onClick={handleResend}
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244240] hover:bg-[#EFECE3] dark:hover:bg-[#142625] transition-colors"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>

            {!isLiveFirebase && (
              <button
                type="button"
                onClick={handleLocalVerify}
                className="w-full py-2.5 px-4 text-xs font-medium rounded-lg border border-dashed border-[#1F8A72]/50 text-[#0F4C4A] dark:text-[#7ED6B5] hover:bg-[#7ED6B5]/10 transition-colors"
              >
                Complete Verification Link (Local Preview)
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
