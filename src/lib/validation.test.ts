import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordStrength,
  isLoginLocked,
  MAX_UPLOAD_BYTES,
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
