import type { ResearcherProfession } from '../types/edna';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
export const ALLOWED_UPLOAD_EXTENSIONS = ['.fasta', '.fa', '.fna', '.fastq', '.fq', '.csv', '.tsv'];
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export const RESEARCHER_PROFESSIONS: ResearcherProfession[] = [
  'Student',
  'Researcher',
  'Ecologist',
  'Bioinformatician',
  'Government',
  'Other',
];

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  if (password.length === 0) {
    return { score: 0, label: 'Very weak', checks };
  }

  let raw = 0;
  if (checks.minLength) raw += 1;
  if (checks.hasUpper && checks.hasLower) raw += 1;
  if (checks.hasNumber) raw += 1;
  if (checks.hasSpecial) raw += 1;
  if (password.length >= 12 && raw >= 3) raw = 4;

  const score = Math.min(4, Math.max(0, raw)) as 0 | 1 | 2 | 3 | 4;
  const labels: Record<0 | 1 | 2 | 3 | 4, PasswordStrengthResult['label']> = {
    0: 'Very weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Strong',
    4: 'Very strong',
  };

  return { score, label: labels[score], checks };
}

export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  institution: string;
  profession: ResearcherProfession | '';
  country: string;
  acceptTerms: boolean;
}

export type RegisterFieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

export function validateRegisterForm(values: RegisterFormValues): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};

  if (!values.name.trim() || values.name.trim().length < 2) {
    errors.name = 'Enter your full name (at least 2 characters).';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(values.email.trim())) {
    errors.email = 'Enter a valid institutional or personal email address.';
  }

  const strength = evaluatePasswordStrength(values.password);
  if (!strength.checks.minLength || strength.score < 2) {
    errors.password = 'Use at least 8 characters including letters and numbers.';
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.institution.trim() || values.institution.trim().length < 2) {
    errors.institution = 'Enter your university, laboratory, or organization.';
  }

  if (!values.profession || !RESEARCHER_PROFESSIONS.includes(values.profession)) {
    errors.profession = 'Select your research affiliation.';
  }

  if (!values.country.trim() || values.country.trim().length < 2) {
    errors.country = 'Enter your country or region.';
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = 'You must agree to the Terms of Service and Privacy Policy.';
  }

  return errors;
}

export interface UploadValidationResult {
  valid: boolean;
  format?: 'fasta' | 'fastq' | 'csv' | 'tsv';
  sanitizedFileName: string;
  error?: string;
}

export function validateUploadFile(fileName: string, sizeBytes: number): UploadValidationResult {
  const sanitizedFileName = fileName
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 120);

  if (sizeBytes <= 0) {
    return { valid: false, sanitizedFileName, error: 'File is empty (0 bytes).' };
  }

  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      sanitizedFileName,
      error: `File exceeds the 50 MB upload limit (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  const lower = fileName.toLowerCase();
  const ext = ALLOWED_UPLOAD_EXTENSIONS.find((candidate) => lower.endsWith(candidate));
  if (!ext) {
    return {
      valid: false,
      sanitizedFileName,
      error: 'Unsupported format. Upload FASTA (.fasta/.fa/.fna), FASTQ (.fastq/.fq), or OTU/ASV tables (.csv/.tsv).',
    };
  }

  let format: 'fasta' | 'fastq' | 'csv' | 'tsv' = 'fasta';
  if (ext === '.fastq' || ext === '.fq') format = 'fastq';
  else if (ext === '.csv') format = 'csv';
  else if (ext === '.tsv') format = 'tsv';

  return { valid: true, format, sanitizedFileName };
}

export interface LoginLockoutState {
  failedAttempts: number;
  lockedUntil: number | null;
}

export function recordFailedLogin(
  current: LoginLockoutState,
  nowMs: number = Date.now(),
): LoginLockoutState {
  if (current.lockedUntil && current.lockedUntil > nowMs) {
    return current;
  }
  const nextAttempts = current.failedAttempts + 1;
  if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return {
      failedAttempts: nextAttempts,
      lockedUntil: nowMs + LOGIN_LOCKOUT_MS,
    };
  }
  return {
    failedAttempts: nextAttempts,
    lockedUntil: null,
  };
}

export function isLoginLocked(state: LoginLockoutState, nowMs: number = Date.now()): boolean {
  return Boolean(state.lockedUntil && state.lockedUntil > nowMs);
}

export function getFriendlyAuthError(codeOrMessage: string): string {
  const code = codeOrMessage.toLowerCase();
  if (code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'Incorrect email or password. Double-check your credentials and try again.';
  }
  if (code.includes('user-not-found')) {
    return 'No TaxaTrace account was found for that email address.';
  }
  if (code.includes('email-already-in-use')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code.includes('too-many-requests') || code.includes('locked')) {
    return 'Too many failed sign-in attempts. Your sign-in is temporarily locked for 15 minutes.';
  }
  if (code.includes('network-request-failed') || code.includes('offline')) {
    return 'You appear to be offline. Check your internet connection and retry.';
  }
  if (code.includes('popup-closed-by-user')) {
    return 'Google sign-in window was closed before completing authentication.';
  }
  if (code.includes('user-disabled')) {
    return 'This account has been disabled by an administrator. Contact your lab coordinator.';
  }
  if (code.includes('requires-recent-login')) {
    return 'For security, please sign out and sign in again before performing this sensitive action.';
  }
  if (code.includes('api-key-not-valid') || code.includes('invalid-api-key')) {
    return 'Firebase API key is invalid. Check your VITE_FIREBASE_API_KEY configuration in Settings > Secrets.';
  }
  if (code.includes('unauthorized-domain')) {
    return 'This app domain is not authorized in your Firebase Authentication settings.';
  }
  if (code.includes('operation-not-allowed') || code.includes('configuration-not-found')) {
    return 'This sign-in method is not enabled in your Firebase project Authentication settings.';
  }
  return codeOrMessage || 'Authentication error occurred. Please try again.';
}

export function cleanEnvValue(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = raw.trim().replace(/^["']+|["']+$/g, '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (
    lower === 'undefined' ||
    lower === 'null' ||
    lower.startsWith('my_') ||
    lower.includes('your-project') ||
    lower.includes('your_public') ||
    lower.includes('placeholder')
  ) {
    return '';
  }
  return trimmed;
}

export function isValidFirebaseConfig(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}): boolean {
  const validApiKey = /^AIza[0-9A-Za-z_-]{30,}$/.test(config.apiKey);
  const validAuthDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(config.authDomain);
  const validProjectId = /^[a-z][a-z0-9-]{3,62}$/i.test(config.projectId);
  const validAppId = /^\d+:\d+:(web|ios|android):[0-9a-fA-F]+$/.test(config.appId);
  return validApiKey && validAuthDomain && validProjectId && validAppId;
}

export function isValidSupabaseKey(raw: string | undefined | null): string | null {
  const cleaned = cleanEnvValue(raw);
  if (!cleaned) return null;
  const isJwt =
    cleaned.length >= 40 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cleaned);
  const isPublishableKey = /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(cleaned);
  return isJwt || isPublishableKey ? cleaned : null;
}

export function normalizeSupabaseUrl(raw: string | undefined | null): string | null {
  const cleaned = cleanEnvValue(raw);
  if (!cleaned) return null;

  // Support users who pasted a bare Supabase hostname without https://
  const candidate =
    !/^https?:\/\//i.test(cleaned) && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(cleaned)
      ? `https://${cleaned}`
      : cleaned;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

const RESERVED_PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/dashboard',
  '/profile',
]);

export function normalizeAdminRoute(raw: string | undefined | null): string {
  const cleaned = cleanEnvValue(raw);
  if (!cleaned) return '/control-9x7k';
  const trimmed = cleaned.replace(/\/+$/, '');
  if (!trimmed.startsWith('/')) return '/control-9x7k';
  if (!/^\/[A-Za-z0-9/_-]{2,64}$/.test(trimmed)) return '/control-9x7k';
  if (RESERVED_PUBLIC_ROUTES.has(trimmed.toLowerCase())) return '/control-9x7k';
  return trimmed;
}


