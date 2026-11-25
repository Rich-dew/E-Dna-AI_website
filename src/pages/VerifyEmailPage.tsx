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
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#061111] bg-ocean-wash text-[#0F2423] dark:text-[#EEF4F2] flex flex-col relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-bio-grid opacity-55" />
      <header className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" aria-label="TaxaTrace Home">
          <Logo size="sm" showWordmark />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="inline-flex items-center gap-1.5 text-sm text-[#435E5B] dark:text-[#9DBAB6] hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5]"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl overflow-hidden border border-[#DEDBD0] dark:border-[#1D3A37] bg-white/95 dark:bg-[#0B1B1A]/95 backdrop-blur-sm surface-card">
          <div className="h-1 w-full bg-gradient-to-r from-[#0F4C4A] via-[#1F8A72] to-[#7ED6B5]" />
          <div className="p-7 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#0F4C4A]/10 dark:bg-[#7ED6B5]/15 flex items-center justify-center text-[#0F4C4A] dark:text-[#7ED6B5]">
              <MailCheck className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold mt-4">Verify your email address</h1>
            <p className="text-sm text-[#435E5B] dark:text-[#9DBAB6] mt-2 leading-relaxed">
              We sent a verification link to{' '}
              <span className="font-semibold text-[#0F2423] dark:text-[#FAF9F5]">{user.email}</span>.
              Dashboard access remains locked until your address is confirmed.
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={checking}
                onClick={handleCheck}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#0F4C4A] to-[#176961] text-[#FAF9F5] shadow-sm hover:from-[#145E5B] hover:to-[#1F8A72] dark:from-[#1F8A72] dark:to-[#27A085] inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking status...' : 'I verified my email'}
              </button>

              <button
                type="button"
                disabled={resending}
                onClick={handleResend}
                className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244643] hover:bg-[#EFECE3] dark:hover:bg-[#122927]"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>

              {!isLiveFirebase && (
                <button
                  type="button"
                  onClick={handleLocalVerify}
                  className="w-full py-2.5 px-4 text-xs font-medium rounded-lg border border-dashed border-[#1F8A72]/50 text-[#0F4C4A] dark:text-[#7ED6B5] hover:bg-[#7ED6B5]/10"
                >
                  Complete Verification Link (Local Preview)
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
