import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  evaluatePasswordStrength,
  RESEARCHER_PROFESSIONS,
  validateRegisterForm,
  type RegisterFormValues,
} from '../lib/validation';
import type { ResearcherProfession } from '../types/edna';

export function RegisterPage() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterFormValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    institution: '',
    profession: '',
    country: '',
    acceptTerms: false,
  });

  const [touched, setTouched] = useState<Partial<Record<keyof RegisterFormValues, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo(() => validateRegisterForm(form), [form]);
  const strength = useMemo(() => evaluatePasswordStrength(form.password), [form.password]);

  const markTouched = (field: keyof RegisterFormValues) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      institution: true,
      profession: true,
      country: true,
      acceptTerms: true,
    });

    if (Object.keys(errors).length > 0) {
      setSubmitError('Please fix the highlighted fields before creating your account.');
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
      pushToast({
        type: 'success',
        title: 'Account created',
        description: 'Verification email sent. Please verify your email before accessing the dashboard.',
      });
      navigate('/verify-email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to register account.';
      setSubmitError(msg);
      pushToast({ type: 'error', title: 'Registration failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const strengthBarColor =
    strength.score <= 1
      ? 'bg-[#E8725A]'
      : strength.score === 2
        ? 'bg-[#F2B84B]'
        : strength.score === 3
          ? 'bg-[#5BB6E8]'
          : 'bg-[#1F8A72]';

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

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-6 sm:p-8">
          <div className="mb-6">
            <Logo size="md" showWordmark showTagline />
            <h1 className="font-display text-2xl font-bold mt-5 text-[#0F2423] dark:text-[#FAF9F5]">
              Create your researcher account
            </h1>
            <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-1">
              Email verification is required before uploading datasets or running pipelines.
            </p>
          </div>

          {submitError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg border border-[#E8725A]/60 bg-[#E8725A]/10 text-xs text-[#9E3520] dark:text-[#F6B3A4]"
            >
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium mb-1">
                  Full name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onBlur={() => markTouched('name')}
                  placeholder="Dr. Maya Lin-Vargas"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                />
                {touched.name && errors.name && (
                  <p className="text-xs text-[#C84B31] dark:text-[#E8725A] mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium mb-1">
                  Email address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onBlur={() => markTouched('email')}
                  placeholder="name@university.edu"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                />
                {touched.email && errors.email && (
                  <p className="text-xs text-[#C84B31] dark:text-[#E8725A] mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onBlur={() => markTouched('password')}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2.5 pr-11 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#4A6361] dark:text-[#9DB6B3]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Password Strength Meter */}
                <div className="mt-2" aria-live="polite">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 rounded-full transition-colors ${
                          strength.score >= level
                            ? strengthBarColor
                            : 'bg-[#E3E1D8] dark:bg-[#1C3432]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#4A6361] dark:text-[#9DB6B3] mt-1">
                    <span>Strength: {strength.label}</span>
                    <span className="inline-flex items-center gap-1">
                      {strength.checks.minLength && <Check className="w-3 h-3 text-[#1F8A72]" />}
                      8+ chars
                    </span>
                  </div>
                </div>
                {touched.password && errors.password && (
                  <p className="text-xs text-[#C84B31] dark:text-[#E8725A] mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-medium mb-1">
                  Confirm password
                </label>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  onBlur={() => markTouched('confirmPassword')}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="text-xs text-[#C84B31] dark:text-[#E8725A] mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-institution" className="block text-sm font-medium mb-1">
                  Institution / Organization
                </label>
                <input
                  id="reg-institution"
                  type="text"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                  onBlur={() => markTouched('institution')}
                  placeholder="Monterey Coastal Genomics Lab"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                />
                {touched.institution && errors.institution && (
                  <p className="text-xs text-[#C84B31] dark:text-[#E8725A] mt-1">
                    {errors.institution}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reg-profession" className="block text-sm font-medium mb-1">
                  Role / Affiliation
                </label>
                <select
                  id="reg-profession"
                  value={form.profession}
                  onChange={(e) =>
                    setForm({ ...form, profession: e.target.value as ResearcherProfession | '' })
                  }
                  onBlur={() => markTouched('profession')}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
                >
                  <option value="">Select affiliation</option>
                  {RESEARCHER_PROFESSIONS.map((prof) => (
                    <option key={prof} value={prof}>
                      {prof}
                    </option>
                  ))}
                </select>
                {touched.profession && errors.profession && (
                  <p className="text-xs text-[#C84B31] dark:text-[#E8725A] mt-1">
                    {errors.profession}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="reg-country" className="block text-sm font-medium mb-1">
                Country / Region
              </label>
              <input
                id="reg-country"
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                onBlur={() => markTouched('country')}
                placeholder="United States"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615] focus:outline-none focus:ring-2 focus:ring-[#1F8A72]"
              />
              {touched.country && errors.country && (
                <p className="text-xs text-[#C84B31] dark:text-[#E8725A] mt-1">{errors.country}</p>
              )}
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-sm text-[#4A6361] dark:text-[#9DB6B3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
                  onBlur={() => markTouched('acceptTerms')}
                  className="mt-1 w-4 h-4 rounded accent-[#0F4C4A]"
                />
                <span>
                  I agree to the TaxaTrace Terms of Service and Privacy Policy, and understand my
                  account is provisioned with standard researcher permissions.
                </span>
              </label>
              {touched.acceptTerms && errors.acceptTerms && (
                <p className="text-xs text-[#C84B31] dark:text-[#E8725A] mt-1">
                  {errors.acceptTerms}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#4A6361] dark:text-[#9DB6B3]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#0F4C4A] dark:text-[#7ED6B5] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
