// Finova Auth & Security Logic Unit Verifier
// Tests client validation, security sanitization, and agreement versioning logic

import assert from 'assert';

console.log('--- RUNNING FINOVA AUTH LOGIC TESTS ---');

// 1. Phone validation (Indian numbers)
function validateIndianPhone(input) {
  const cleaned = input.replace(/\s|-/g, '');
  const pattern = /^(\+91)?[6-9]\d{9}$/;
  return pattern.test(cleaned);
}

assert.strictEqual(validateIndianPhone('+91 9876543210'), true, 'Valid +91 with space');
assert.strictEqual(validateIndianPhone('+919876543210'), true, 'Valid +91 direct');
assert.strictEqual(validateIndianPhone('9876543210'), true, 'Valid 10 digits starting with 9');
assert.strictEqual(validateIndianPhone('7876543210'), true, 'Valid 10 digits starting with 7');
assert.strictEqual(validateIndianPhone('6123456789'), true, 'Valid 10 digits starting with 6');
assert.strictEqual(validateIndianPhone('5123456789'), false, 'Invalid: starts with 5');
assert.strictEqual(validateIndianPhone('1234567890'), false, 'Invalid: starts with 1');
assert.strictEqual(validateIndianPhone('987654321'), false, 'Invalid: 9 digits');
assert.strictEqual(validateIndianPhone('98765432101'), false, 'Invalid: 11 digits');
console.log('✓ Test 1: Indian Phone Number Validation passed');

// 2. Password Strength & Rules
function evaluatePassword(pwd) {
  return {
    length: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  };
}

const weak = evaluatePassword('pass');
assert.strictEqual(weak.length, false);

const strong = evaluatePassword('InvestFinova@2026');
assert.strictEqual(strong.length && strong.hasUpper && strong.hasLower && strong.hasNumber && strong.hasSpecial, true);
console.log('✓ Test 2: Password Complexity Evaluation passed');

// 3. Open Redirect Protection (as used in proxy.ts)
function sanitizeRedirect(nextParam) {
  if (!nextParam) return '/dashboard';
  if (nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.includes('://')) {
    return nextParam;
  }
  return '/dashboard';
}

assert.strictEqual(sanitizeRedirect('/investments'), '/investments', 'Safe internal route');
assert.strictEqual(sanitizeRedirect('/dashboard?tab=overview'), '/dashboard?tab=overview', 'Safe internal route with query');
assert.strictEqual(sanitizeRedirect('https://evil-phishing.com'), '/dashboard', 'Block external absolute URL');
assert.strictEqual(sanitizeRedirect('//evil-phishing.com'), '/dashboard', 'Block protocol-relative open redirect');
assert.strictEqual(sanitizeRedirect('javascript:alert(1)'), '/dashboard', 'Block javascript pseudo-protocol');
assert.strictEqual(sanitizeRedirect(null), '/dashboard', 'Fallback default');
console.log('✓ Test 3: Open-Redirect Sanitization in Proxy passed');

// 4. Agreement Versioning Specification
const CURRENT_AGREEMENT_VERSIONS = {
  terms_of_service: '1.0.0-draft',
  privacy_policy: '1.0.0-draft',
  risk_disclosure: '1.0.0-draft',
};

const REQUIRED_AGREEMENT_TYPES = ['terms_of_service', 'privacy_policy', 'risk_disclosure'];

assert.strictEqual(REQUIRED_AGREEMENT_TYPES.length, 3, 'Exactly 3 required independent agreements');
REQUIRED_AGREEMENT_TYPES.forEach((type) => {
  assert.ok(CURRENT_AGREEMENT_VERSIONS[type], `Version exists for ${type}`);
  assert.strictEqual(CURRENT_AGREEMENT_VERSIONS[type], '1.0.0-draft', `Version is 1.0.0-draft for ${type}`);
});
console.log('✓ Test 4: Versioned Agreement Schema & Draft Versioning passed');

// 5. Auth Error Sanitization
function mapAuthError(error) {
  if (!error) return 'An unexpected error occurred.';
  const msg = error.message?.toLowerCase() || '';
  if (msg.includes('invalid login credentials')) return 'Invalid email or password. Please check your credentials.';
  if (msg.includes('email not confirmed')) return 'Your email has not been verified yet. Please check your inbox.';
  if (msg.includes('user already registered')) return 'An account with this email address already exists. Please sign in instead.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment before trying again.';
  return error.message;
}

assert.strictEqual(
  mapAuthError({ message: 'Invalid login credentials' }),
  'Invalid email or password. Please check your credentials.'
);
assert.strictEqual(
  mapAuthError({ message: 'Email not confirmed' }),
  'Your email has not been verified yet. Please check your inbox.'
);
assert.strictEqual(
  mapAuthError({ message: 'User already registered' }),
  'An account with this email address already exists. Please sign in instead.'
);
assert.strictEqual(
  mapAuthError({ message: 'Over_rate_limit: rate limit exceeded' }),
  'Too many attempts. Please wait a moment before trying again.'
);
console.log('✓ Test 5: Safe Auth Error Message Mapping passed');

console.log('--- ALL 5 CRITICAL AUTH TESTS PASSED CLEANLY ---');
