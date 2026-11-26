import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanEnvValue,
  evaluatePasswordStrength,
  isLoginLocked,
  isValidFirebaseConfig,
  isValidSupabaseKey,
  MAX_UPLOAD_BYTES,
  normalizeAdminRoute,
  normalizeSupabaseUrl,
  recordFailedLogin,
  validateRegisterForm,
  validateUploadFile,
} from './validation';

test('password strength meter scores weak vs strong passwords', () => {
  assert.equal(evaluatePasswordStrength('').score, 0);
  assert.ok(evaluatePasswordStrength('abc').score <= 1);
  assert.equal(evaluatePasswordStrength('MarineEdna#2026!').score, 4);
});

test('validateRegisterForm enforces all required fields and terms', () => {
  const invalid = validateRegisterForm({
    name: 'A',
    email: 'not-an-email',
    password: 'short',
    confirmPassword: 'other',
    institution: '',
    profession: '',
    country: '',
    acceptTerms: false,
  });
  assert.ok(invalid.name);
  assert.ok(invalid.email);
  assert.ok(invalid.password);
  assert.ok(invalid.confirmPassword);
  assert.ok(invalid.institution);
  assert.ok(invalid.profession);
  assert.ok(invalid.country);
  assert.ok(invalid.acceptTerms);

  const valid = validateRegisterForm({
    name: 'Dr. Elena Rostova',
    email: 'elena@oceanlab.org',
    password: 'StrongPassword9!',
    confirmPassword: 'StrongPassword9!',
    institution: 'Pacific Genomics Lab',
    profession: 'Ecologist',
    country: 'Canada',
    acceptTerms: true,
  });
  assert.equal(Object.keys(valid).length, 0);
});

test('validateUploadFile enforces allowed extensions and 50 MB size cap', () => {
  assert.equal(validateUploadFile('reads.fastq', 1024).valid, true);
  assert.equal(validateUploadFile('otus.tsv', 2048).format, 'tsv');
  assert.equal(validateUploadFile('malware.exe', 1024).valid, false);
  assert.equal(validateUploadFile('huge.fasta', MAX_UPLOAD_BYTES + 1).valid, false);
  assert.equal(validateUploadFile('empty.fasta', 0).valid, false);
});

test('login lockout activates after exactly 5 failed attempts', () => {
  let state = { failedAttempts: 0, lockedUntil: null as number | null };
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i++) {
    state = recordFailedLogin(state, t0);
    assert.equal(isLoginLocked(state, t0), false);
  }
  state = recordFailedLogin(state, t0);
  assert.equal(state.failedAttempts, 5);
  assert.equal(isLoginLocked(state, t0), true);
  assert.equal(isLoginLocked(state, t0 + 16 * 60 * 1000), false);
});

test('normalizeSupabaseUrl handles invalid strings, placeholders, quotes, and bare hosts safely', () => {
  assert.equal(normalizeSupabaseUrl(''), null);
  assert.equal(normalizeSupabaseUrl('MY_SUPABASE_URL'), null);
  assert.equal(normalizeSupabaseUrl('https://your-project.supabase.co'), null);
  assert.equal(normalizeSupabaseUrl('not a url!'), null);
  assert.equal(normalizeSupabaseUrl('ftp://invalid.supabase.co'), null);
  assert.equal(normalizeSupabaseUrl('"https://abc123.supabase.co/"'), 'https://abc123.supabase.co');
  assert.equal(normalizeSupabaseUrl('abc123.supabase.co'), 'https://abc123.supabase.co');
  assert.equal(cleanEnvValue('"my-valid-key"'), 'my-valid-key');
});

test('isValidFirebaseConfig and isValidSupabaseKey reject dummy values like 2026 and accept real formats', () => {
  assert.equal(
    isValidFirebaseConfig({
      apiKey: '2026',
      authDomain: '2026',
      projectId: '2026',
      appId: '2026',
    }),
    false,
  );
  assert.equal(
    isValidFirebaseConfig({
      apiKey: 'AIzaSyD4x9kLmN0pQrStUvWxYz1234567890abcd',
      authDomain: 'taxatrace-prod.firebaseapp.com',
      projectId: 'taxatrace-prod',
      appId: '1:123456789012:web:abcdef1234567890',
    }),
    true,
  );
  assert.equal(isValidSupabaseKey('2026'), null);
  assert.equal(isValidSupabaseKey('MY_SUPABASE_ANON_KEY'), null);
  assert.ok(isValidSupabaseKey('sb_publishable_abcdefghijklmnopqrstuvwxyz1234'));
  assert.ok(
    isValidSupabaseKey(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.signaturepart1234567890',
    ),
  );
});

test('normalizeAdminRoute defaults safely on malformed or colliding values', () => {
  assert.equal(normalizeAdminRoute(undefined), '/control-9x7k');
  assert.equal(normalizeAdminRoute(''), '/control-9x7k');
  assert.equal(normalizeAdminRoute('2026'), '/control-9x7k');
  assert.equal(normalizeAdminRoute('control-9x7k'), '/control-9x7k');
  assert.equal(normalizeAdminRoute('/dashboard'), '/control-9x7k');
  assert.equal(normalizeAdminRoute('/login'), '/control-9x7k');
  assert.equal(normalizeAdminRoute('/ops-9x7k/'), '/ops-9x7k');
  assert.equal(normalizeAdminRoute('/gov-console-2026'), '/gov-console-2026');
});

