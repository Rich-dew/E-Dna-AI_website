import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { evaluatePasswordStrength, RESEARCHER_PROFESSIONS } from '../lib/validation';
import type { ResearcherProfession } from '../types/edna';

export function ProfilePage() {
  const { user, updateUserProfile, changePassword, deleteAccount, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [profession, setProfession] = useState<ResearcherProfession>(
    user?.profession || 'Researcher',
  );
  const [country, setCountry] = useState(user?.country || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const strength = evaluatePasswordStrength(newPassword);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      pushToast({ type: 'error', title: 'Name must be at least 2 characters.' });
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile({ name, institution, profession, country });
      pushToast({ type: 'success', title: 'Profile updated' });
    } catch (err: unknown) {
      pushToast({
        type: 'error',
        title: 'Profile update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (!strength.checks.minLength || strength.score < 2) {
      setPasswordError('New password must be at least 8 characters with letters and numbers.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      pushToast({ type: 'success', title: 'Password updated' });
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount(deletePassword || undefined);
      pushToast({ type: 'info', title: 'Account deleted' });
      navigate('/');
    } catch (err: unknown) {
      pushToast({
        type: 'error',
        title: 'Could not delete account',
        description: err instanceof Error ? err.message : 'Please re-authenticate and retry.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#091414] text-[#0F2423] dark:text-[#F2F5F3]">
      <header className="border-b border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0C1918]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3F5957] dark:text-[#9DB6B3] hover:text-[#0F4C4A] dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Workspace
            </Link>
            <span className="text-[#D4D1C7] dark:text-[#244240]">/</span>
            <Logo size="sm" showWordmark />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-lg text-[#3F5957] dark:text-[#9DB6B3] hover:bg-[#ECEAE2] dark:hover:bg-[#142625]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244240] hover:bg-[#EFECE3] dark:hover:bg-[#142625]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Researcher Profile</h1>
          <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-1">
            {user.email} · Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Profile details */}
        <section className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Account details</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-name" className="block text-sm font-medium mb-1">
                  Full name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                />
              </div>
              <div>
                <label htmlFor="prof-inst" className="block text-sm font-medium mb-1">
                  Institution
                </label>
                <input
                  id="prof-inst"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                />
              </div>
              <div>
                <label htmlFor="prof-role" className="block text-sm font-medium mb-1">
                  Affiliation
                </label>
                <select
                  id="prof-role"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value as ResearcherProfession)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                >
                  {RESEARCHER_PROFESSIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="prof-country" className="block text-sm font-medium mb-1">
                  Country
                </label>
                <input
                  id="prof-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Change Password */}
        <section className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Change password</h2>
          {passwordError && (
            <p role="alert" className="mb-3 text-xs text-[#C84B31] dark:text-[#E8725A]">
              {passwordError}
            </p>
          )}
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="cur-pw" className="block text-sm font-medium mb-1">
                Current password
              </label>
              <input
                id="cur-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
              />
            </div>
            <div>
              <label htmlFor="new-pw" className="block text-sm font-medium mb-1">
                New password
              </label>
              <input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
              />
              {newPassword && (
                <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3] mt-1">
                  Strength: {strength.label}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="conf-pw" className="block text-sm font-medium mb-1">
                Confirm new password
              </label>
              <input
                id="conf-pw"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] disabled:opacity-50"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* Delete Account */}
        <section className="rounded-xl border border-[#E8725A]/50 bg-white dark:bg-[#0F1F1E] p-6">
          <h2 className="font-display text-lg font-semibold text-[#C84B31] dark:text-[#E8725A]">
            Delete account
          </h2>
          <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-1">
            Permanently remove your profile and sign-in credentials. Export your CSV, JSON, or PDF
            reports before deleting.
          </p>

          {!deleteConfirmOpen ? (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#E8725A] text-[#C84B31] dark:text-[#E8725A] hover:bg-[#E8725A]/10"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          ) : (
            <div className="mt-4 space-y-3 max-w-sm">
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Confirm password (if email/password account)"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E8725A]/60 bg-[#FAF9F5] dark:bg-[#0A1615]"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#C84B31] text-white hover:bg-[#A93B24] disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Confirm Permanent Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="px-3 py-2 text-sm text-[#4A6361] dark:text-[#9DB6B3]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
