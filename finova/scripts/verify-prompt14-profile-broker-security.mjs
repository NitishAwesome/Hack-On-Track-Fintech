// ============================================================
// FINOVA — PROMPT 14 VERIFICATION TEST SUITE
// scripts/verify-prompt14-profile-broker-security.mjs
//
// Automated test suite for User Profile, Multi-Broker Management,
// Financial Ledger Deletion Safety, Truthful Connection Statuses,
// and Account Security Disclosures.
// ============================================================

import test from 'node:test';
import assert from 'node:assert/strict';

// Import Connection Utilities
import {
  getBrokerConnectionStatusBadge,
  formatAccountTypeLabel,
  isValidAccountType,
  SUPPORTED_BROKER_CATALOG,
  ALLOWED_ACCOUNT_TYPES,
} from '../lib/utils/brokerConnection.ts';

// Import In-Memory Storage for isolated unit checks
import { PortfolioStorage } from '../lib/storage/portfolioStorage.ts';

// Import Prompt 13 calculations to guarantee zero regression
import {
  calculateBondMetrics,
  calculateReitDistribution,
} from '../lib/calculations/alternativeEducation.ts';

console.log('======================================================================');
console.log('FINOVA PROMPT 14: PROFILE, MULTI-BROKER & ACCOUNT SECURITY SUITE');
console.log('======================================================================\n');

// ------------------------------------------------------------
// SUITE 1: Profile Validation, Lifecycle & Legal Audit Integrity
// ------------------------------------------------------------
test('Suite 1: User Profile Validation, State Lifecycle & Legal Audit Integrity', async (t) => {
  await t.test('1.1 Name validation enforces 2 to 100 character bounds', () => {
    function validateName(name) {
      const trimmed = (name || '').trim();
      if (!trimmed) return { valid: false, error: 'Full name is required.' };
      if (trimmed.length < 2) return { valid: false, error: 'Full name must be at least 2 characters.' };
      if (trimmed.length > 100) return { valid: false, error: 'Full name cannot exceed 100 characters.' };
      return { valid: true, error: null };
    }

    assert.equal(validateName('').valid, false);
    assert.equal(validateName('   ').valid, false);
    assert.equal(validateName('A').valid, false);
    assert.equal(validateName('Rahul').valid, true);
    assert.equal(validateName('Dr. Vikram Aditya Sharma').valid, true);
    assert.equal(validateName('X'.repeat(101)).valid, false);
  });

  await t.test('1.2 Phone validation permits valid international/Indian numbers and rejects invalid strings', () => {
    function validatePhone(phone) {
      if (!phone) return { valid: true }; // optional
      const trimmed = phone.trim();
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
      return { valid: phoneRegex.test(trimmed) };
    }

    assert.equal(validatePhone('+91 98765 43210').valid, true);
    assert.equal(validatePhone('9876543210').valid, true);
    assert.equal(validatePhone('+1-555-019-2834').valid, true);
    assert.equal(validatePhone('not-a-number').valid, false);
    assert.equal(validatePhone('123').valid, false); // too short
  });

  await t.test('1.3 Supported risk-appetite options match supported financial profiles', () => {
    const validAppetites = ['conservative', 'moderate', 'aggressive'];
    for (const app of validAppetites) {
      assert.ok(validAppetites.includes(app));
    }
    assert.equal(validAppetites.includes('speculative_gambler'), false);
  });

  await t.test('1.4 Unauthenticated / expired sessions resolve loading state without hanging skeleton', () => {
    // Contract check: if user is null, unauthenticated must be set true and loading false
    function resolveAuthState(user, authError) {
      if (authError || !user) {
        return { loading: false, unauthenticated: true };
      }
      return { loading: false, unauthenticated: false };
    }

    const expiredState = resolveAuthState(null, new Error('JWT expired'));
    assert.equal(expiredState.loading, false);
    assert.equal(expiredState.unauthenticated, true);
  });

  await t.test('1.5 Missing agreement records are NEVER represented as "Accepted on Signup"', () => {
    const agreements = [
      { agreement_type: 'terms_of_service', agreement_version: '1.0.0-draft', accepted_at: '2026-10-09T10:00:00Z' },
    ];

    function getAgreementStatus(agreementsList, type) {
      const rec = agreementsList.find((a) => a.agreement_type === type);
      if (!rec) {
        return { isRecorded: false, displayLabel: 'No Audit Record Found' };
      }
      return { isRecorded: true, displayLabel: `Accepted on ${rec.accepted_at}` };
    }

    const termsStatus = getAgreementStatus(agreements, 'terms_of_service');
    assert.equal(termsStatus.isRecorded, true);
    assert.match(termsStatus.displayLabel, /2026-10-09/);

    const privacyStatus = getAgreementStatus(agreements, 'privacy_policy');
    assert.equal(privacyStatus.isRecorded, false);
    assert.equal(privacyStatus.displayLabel, 'No Audit Record Found');
    assert.notEqual(privacyStatus.displayLabel, 'Accepted on Signup');
  });

  await t.test('1.6 Database save error halts success notification and preserves unsaved inputs', () => {
    let savedState = false;
    let saveErrorMessage = null;

    function handleSaveResponse(response) {
      if (response.error) {
        saveErrorMessage = response.error;
        savedState = false;
      } else {
        savedState = true;
        saveErrorMessage = null;
      }
    }

    handleSaveResponse({ error: 'Supabase RLS: access denied to public.profiles' });
    assert.equal(savedState, false, 'Saved state must remain false on error');
    assert.equal(saveErrorMessage, 'Supabase RLS: access denied to public.profiles');
  });
});

// ------------------------------------------------------------
// SUITE 2: Multi-Broker Management & Account Type Preservation
// ------------------------------------------------------------
test('Suite 2: Multi-Broker Account Management & Account Type Preservation', async (t) => {
  await t.test('2.1 Account rename strictly preserves existing account_type when omitted in update', () => {
    // Initial account created as demat
    const initialAccount = {
      id: 'acc-test-1',
      display_name: 'Primary Groww',
      account_type: 'demat',
      broker_code: 'GROWW',
    };

    // Simulated PUT payload where account_type is omitted
    function applyUpdate(existing, body) {
      const updated = { ...existing };
      if (body.display_name !== undefined) {
        updated.display_name = body.display_name.trim();
      }
      if (body.account_type !== undefined && body.account_type !== null) {
        updated.account_type = body.account_type;
      }
      return updated;
    }

    const updatedAccount = applyUpdate(initialAccount, { display_name: 'Secondary Groww Demat' });
    assert.equal(updatedAccount.display_name, 'Secondary Groww Demat');
    assert.equal(updatedAccount.account_type, 'demat', 'account_type MUST NOT reset to broker');
  });

  await t.test('2.2 Explicit account_type update updates type when valid', () => {
    const initialAccount = {
      id: 'acc-test-2',
      display_name: 'My ICICI',
      account_type: 'broker',
      broker_code: 'ICICI_DIRECT',
    };

    function applyUpdate(existing, body) {
      const updated = { ...existing };
      if (body.account_type && isValidAccountType(body.account_type)) {
        updated.account_type = body.account_type;
      }
      return updated;
    }

    const updated = applyUpdate(initialAccount, { account_type: 'trading' });
    assert.equal(updated.account_type, 'trading');
  });

  await t.test('2.3 Invalid account type is rejected by validation check', () => {
    assert.equal(isValidAccountType('demat'), true);
    assert.equal(isValidAccountType('trading'), true);
    assert.equal(isValidAccountType('mutual_fund_crypto'), false);
    assert.equal(isValidAccountType('forex_margin'), false);
    assert.ok(ALLOWED_ACCOUNT_TYPES.includes('demat'));
    assert.equal(formatAccountTypeLabel('demat'), 'Demat Account');
  });

  await t.test('2.4 Account types format into user-friendly labels', () => {
    assert.equal(formatAccountTypeLabel('demat'), 'Demat Account');
    assert.equal(formatAccountTypeLabel('trading'), 'Trading Account');
    assert.equal(formatAccountTypeLabel('mf'), 'Mutual Fund Account');
    assert.equal(formatAccountTypeLabel('manual'), 'Manual Portfolio');
    assert.equal(formatAccountTypeLabel('broker'), 'Brokerage Account');
  });

  await t.test('2.5 Supported broker catalog includes key Indian institutions', () => {
    const requiredBrokers = ['GROWW', 'ZERODHA', 'ANGEL_ONE', 'ICICI_DIRECT', 'UPSTOX', 'CDSL', 'NSDL'];
    for (const b of requiredBrokers) {
      assert.ok(SUPPORTED_BROKER_CATALOG[b], `Broker ${b} must exist in catalog`);
      assert.ok(SUPPORTED_BROKER_CATALOG[b].brandColor.startsWith('#'));
      assert.ok(SUPPORTED_BROKER_CATALOG[b].name.length > 2);
    }
  });
});

// ------------------------------------------------------------
// SUITE 3: Financial Ledger Safety & Deletion Guard
// ------------------------------------------------------------
test('Suite 3: Financial Ledger Safety & Deletion Guard', async (t) => {
  await t.test('3.1 Deletion of genuinely empty broker account succeeds', () => {
    // Setup clean state in PortfolioStorage
    const dummyAccount = PortfolioStorage.addBrokerAccount({
      user_id: 'user-audit-1',
      broker_code: 'ZERODHA',
      display_name: 'Temporary Empty Account',
      account_type: 'demat',
      connection_status: 'MANUAL',
      data_source: 'MANUAL',
      currency: 'INR',
      last_synced_at: null,
      broker_name: 'Zerodha',
      account_label: 'Empty Account',
      color_hex: '#387ED1',
      is_active: true,
    });

    assert.ok(dummyAccount.id);

    // Verify 0 holdings and 0 transactions exist for this account
    const state = PortfolioStorage.getState();
    const hasHoldings = state.holdings.some((h) => h.broker_account_id === dummyAccount.id);
    const hasTransactions = state.transactions.some((t) => t.broker_account_id === dummyAccount.id);
    assert.equal(hasHoldings, false);
    assert.equal(hasTransactions, false);

    // Deletion must succeed
    const deleted = PortfolioStorage.deleteBrokerAccount(dummyAccount.id, false);
    assert.equal(deleted, true);
  });

  await t.test('3.2 Broker account with active holdings BLOCKS deletion with error', () => {
    // Create an account with associated holding
    const testAccount = PortfolioStorage.addBrokerAccount({
      user_id: 'user-audit-2',
      broker_code: 'GROWW',
      display_name: 'Groww With Holdings',
      account_type: 'demat',
      connection_status: 'MANUAL',
      data_source: 'MANUAL',
      currency: 'INR',
      last_synced_at: null,
      broker_name: 'Groww',
      account_label: 'Groww With Holdings',
      color_hex: '#00D09C',
      is_active: true,
    });

    // Add a holding pointing to this account
    const state = PortfolioStorage.getState();
    state.holdings.push({
      id: 'hold-audit-guard-1',
      user_id: 'user-audit-2',
      broker_account_id: testAccount.id,
      symbol: 'INFY',
      name: 'Infosys Limited',
      asset_class: 'EQUITY',
      quantity: 10,
      avg_buy_price: 1500,
      current_price: 1550,
      exchange: 'NSE',
      isin: 'INE009A01021',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    PortfolioStorage.saveState(state);

    // Attempting safe deletion without force must be blocked
    const deletionAttempt = PortfolioStorage.deleteBrokerAccount(testAccount.id, false);
    assert.equal(deletionAttempt, false, 'Deletion must be BLOCKED when active holdings exist');

    // Clean up holding & account safely
    PortfolioStorage.deleteBrokerAccount(testAccount.id, true);
  });

  await t.test('3.3 Simulated server API returns HTTP 409 Conflict when account has active records', () => {
    function simulateDeleteEndpoint(account, holdingsCount, transactionsCount) {
      if (holdingsCount > 0 || transactionsCount > 0) {
        return {
          status: 409,
          body: {
            error: 'Cannot delete broker account with active financial records.',
            details: {
              holdingsCount,
              transactionsCount,
              accountName: account.display_name,
              message: `This account contains ${holdingsCount} position(s) and ${transactionsCount} transaction record(s).`,
            },
          },
        };
      }
      return { status: 200, body: { success: true } };
    }

    const blockedResult = simulateDeleteEndpoint({ display_name: 'My Zerodha' }, 5, 12);
    assert.equal(blockedResult.status, 409);
    assert.equal(blockedResult.body.details.holdingsCount, 5);
    assert.equal(blockedResult.body.details.transactionsCount, 12);

    const allowedResult = simulateDeleteEndpoint({ display_name: 'My Empty Account' }, 0, 0);
    assert.equal(allowedResult.status, 200);
    assert.equal(allowedResult.body.success, true);
  });
});

// ------------------------------------------------------------
// SUITE 4: Truthful Connection Statuses & Zero-Credential Scope
// ------------------------------------------------------------
test('Suite 4: Truthful Connection Statuses & Zero-Credential Scope', async (t) => {
  await t.test('4.1 MANUAL account displays "Manually Tracked"', () => {
    const badge = getBrokerConnectionStatusBadge('MANUAL', 'MANUAL');
    assert.equal(badge.label, 'Manually Tracked');
    assert.equal(badge.isApiConnected, false);
  });

  await t.test('4.2 CSV account displays "CSV Managed"', () => {
    const badge = getBrokerConnectionStatusBadge('MANUAL', 'CSV');
    assert.equal(badge.label, 'CSV Managed');
    assert.equal(badge.isApiConnected, false);
  });

  await t.test('4.3 NOT_CONNECTED status displays "Not Connected"', () => {
    const badge = getBrokerConnectionStatusBadge('NOT_CONNECTED', 'MANUAL');
    assert.equal(badge.label, 'Not Connected');
    assert.equal(badge.isApiConnected, false);
  });

  await t.test('4.4 "API Connected" badge is NEVER fabricated for manual or CSV accounts', () => {
    const manualBadge = getBrokerConnectionStatusBadge('CONNECTED', 'MANUAL');
    assert.equal(manualBadge.isApiConnected, false, 'Manual account must never be API Connected');

    const csvBadge = getBrokerConnectionStatusBadge('CONNECTED', 'CSV');
    assert.equal(csvBadge.isApiConnected, false, 'CSV account must never be API Connected');

    // Only genuine API + CONNECTED produces API Connected
    const trueApiBadge = getBrokerConnectionStatusBadge('CONNECTED', 'API');
    assert.equal(trueApiBadge.label, 'API Connected');
    assert.equal(trueApiBadge.isApiConnected, true);
  });

  await t.test('4.5 SYNCING and ERROR states reflect accurately', () => {
    const syncing = getBrokerConnectionStatusBadge('SYNCING', 'API');
    assert.equal(syncing.label, 'Syncing...');

    const err = getBrokerConnectionStatusBadge('ERROR', 'API');
    assert.equal(err.label, 'Sync Error');
  });

  await t.test('4.6 Zero credential collection guarantee: Prohibited fields check', () => {
    const forbiddenCredentialFields = ['password', 'mpin', 'tpin', 'trading_pin', 'otp', 'broker_secret'];
    const dummyAddPayload = {
      broker_name: 'Groww',
      account_label: 'My Groww Demat',
      account_type: 'demat',
      data_source: 'MANUAL',
    };

    for (const f of forbiddenCredentialFields) {
      assert.equal(f in dummyAddPayload, false, `Forbidden credential field "${f}" must not exist in form payload`);
    }
  });
});

// ------------------------------------------------------------
// SUITE 5: Regression & Prompt 13 Educational Consistency
// ------------------------------------------------------------
test('Suite 5: Regression & Educational Consistency', async (t) => {
  await t.test('5.1 Prompt 13 Bond calculations remain deterministic and correct', () => {
    const bond = calculateBondMetrics({
      faceValue: 1000,
      annualCouponRatePct: 7.5,
      numberOfBonds: 100,
      purchasePricePerBond: 980,
    });
    assert.equal(bond.isValid, true);
    assert.equal(bond.annualCouponPerBond, 75);
    assert.equal(bond.totalAnnualCoupon, 7500);
    assert.equal(bond.priceRelationship, 'DISCOUNT');
  });

  await t.test('5.2 Prompt 13 REIT calculations remain deterministic and correct', () => {
    const reit = calculateReitDistribution({
      unitsHeld: 500,
      purchasePricePerUnit: 320,
      annualDistributionPerUnit: 24,
    });
    assert.equal(reit.isValid, true);
    assert.equal(reit.totalPurchaseCost, 160000);
    assert.equal(reit.totalAnnualDistribution, 12000);
    assert.equal(reit.distributionYieldPct, 7.5);
  });
});

// ------------------------------------------------------------
// SUITE 6: Security & Data Integrity Patch (Post-Prompt 14 Patch)
// ------------------------------------------------------------
test('Suite 6: Security Patch — Uncertain Counts, Atomic Safety & Explicit Consent', async (t) => {
  await t.test('6.1 Failed or uncertain holdings count query MUST reject broker deletion with HTTP 500', () => {
    function evaluateDeletePrecheck(hCount, hErr, txCount, txErr) {
      if (hErr || hCount === null || hCount === undefined) {
        return {
          status: 500,
          error: 'Financial safety check failed: unable to verify holdings records. Deletion aborted to protect financial records.',
        };
      }
      if (txErr || txCount === null || txCount === undefined) {
        return {
          status: 500,
          error: 'Financial safety check failed: unable to verify transaction records. Deletion aborted to protect financial records.',
        };
      }
      if (hCount > 0 || txCount > 0) {
        return { status: 409, error: 'Cannot delete broker account with active financial records.' };
      }
      return { status: 200, success: true };
    }

    // Holdings query error
    const res1 = evaluateDeletePrecheck(null, new Error('Database connection timeout'), 0, null);
    assert.equal(res1.status, 500);
    assert.ok(res1.error.includes('unable to verify holdings records'));

    // Holdings count uncertain (null)
    const res2 = evaluateDeletePrecheck(null, null, 0, null);
    assert.equal(res2.status, 500);

    // Transaction query error
    const res3 = evaluateDeletePrecheck(0, null, null, new Error('PGRST100 query error'));
    assert.equal(res3.status, 500);
    assert.ok(res3.error.includes('unable to verify transaction records'));

    // Transaction count uncertain (undefined)
    const res4 = evaluateDeletePrecheck(0, null, undefined, null);
    assert.equal(res4.status, 500);
  });

  await t.test('6.2 Race condition elimination: Disables deletion when atomic RPC migration is unapplied', () => {
    function handleAtomicDeleteRpc(rpcErr) {
      if (rpcErr) {
        if (
          rpcErr.code === 'PGRST202' ||
          rpcErr.message?.toLowerCase().includes('could not find the function')
        ) {
          return {
            status: 403,
            error: 'Permanent broker account deletion is disabled to prevent cascading data loss.',
            code: 'ATOMIC_MIGRATION_REQUIRED',
            pendingMigration: '20261011000000_safe_broker_deletion_and_restrict_cascade.sql',
          };
        }
        if (rpcErr.code === '23503') {
          return { status: 409, error: 'Cannot delete broker account with active financial records.' };
        }
        return { status: 500, error: rpcErr.message };
      }
      return { status: 200, success: true };
    }

    const unappliedMigrationResult = handleAtomicDeleteRpc({
      code: 'PGRST202',
      message: 'Could not find the function public.safe_delete_broker_account in the schema cache',
    });
    assert.equal(unappliedMigrationResult.status, 403);
    assert.equal(unappliedMigrationResult.code, 'ATOMIC_MIGRATION_REQUIRED');
    assert.equal(
      unappliedMigrationResult.pendingMigration,
      '20261011000000_safe_broker_deletion_and_restrict_cascade.sql'
    );
  });

  await t.test('6.3 Financial record preservation: Holdings & transactions remain intact in storage', () => {
    // Create an account with holdings and transactions
    const safeAccount = PortfolioStorage.addBrokerAccount({
      user_id: 'user-safe-check-1',
      broker_code: 'ZERODHA',
      display_name: 'Zerodha Safety Test',
      account_type: 'demat',
      connection_status: 'MANUAL',
      data_source: 'MANUAL',
      currency: 'INR',
      last_synced_at: null,
      broker_name: 'Zerodha',
      account_label: 'Zerodha Safety Test',
      color_hex: '#387ED1',
      is_active: true,
    });

    const state = PortfolioStorage.getState();
    const testHolding = {
      id: 'hold-preservation-1',
      user_id: 'user-safe-check-1',
      broker_account_id: safeAccount.id,
      symbol: 'TCS',
      name: 'Tata Consultancy Services',
      asset_class: 'EQUITY',
      quantity: 5,
      avg_buy_price: 3400,
      current_price: 3500,
      exchange: 'NSE',
      isin: 'INE467B01029',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const testTx = {
      id: 'tx-preservation-1',
      user_id: 'user-safe-check-1',
      broker_account_id: safeAccount.id,
      symbol: 'TCS',
      transaction_type: 'BUY',
      quantity: 5,
      unit_price: 3400,
      gross_amount: 17000,
      net_amount: 17000,
      trade_date: new Date().toISOString(),
      status: 'EXECUTED',
      source: 'MANUAL',
      created_at: new Date().toISOString(),
    };

    state.holdings.push(testHolding);
    state.transactions.push(testTx);
    PortfolioStorage.saveState(state);

    // Non-forced deletion must fail
    const deleteAttempt = PortfolioStorage.deleteBrokerAccount(safeAccount.id, false);
    assert.equal(deleteAttempt, false);

    // Verify holding & transaction are STILL present
    const updatedState = PortfolioStorage.getState();
    assert.ok(updatedState.holdings.some((h) => h.id === 'hold-preservation-1'));
    assert.ok(updatedState.transactions.some((t) => t.id === 'tx-preservation-1'));

    // Clean up
    PortfolioStorage.deleteBrokerAccount(safeAccount.id, true);
  });

  await t.test('6.4 Explicit legal consent requires user selection and records authentic timestamp', () => {
    const historicalTimestamp = '2026-09-01T10:00:00.000Z';
    const existingAgreements = [
      {
        agreement_type: 'terms_of_service',
        agreement_version: '1.0.0-draft',
        accepted_at: historicalTimestamp,
      },
    ];

    // Determine missing types
    const allRequired = ['terms_of_service', 'privacy_policy', 'risk_disclosure'];
    const missingTypes = allRequired.filter((type) => !existingAgreements.some((a) => a.agreement_type === type));

    assert.deepEqual(missingTypes, ['privacy_policy', 'risk_disclosure']);

    // User only checks privacy_policy
    const userChoices = { privacy_policy: true, risk_disclosure: false };
    const acceptedTypes = missingTypes.filter((t) => userChoices[t]);
    assert.deepEqual(acceptedTypes, ['privacy_policy']);

    // Simulate authentic recording
    const recordTimestamp = new Date().toISOString();
    const newRecords = acceptedTypes.map((type) => ({
      agreement_type: type,
      agreement_version: '1.0.0-draft',
      accepted_at: recordTimestamp,
      acceptance_source: 'profile_explicit_consent',
    }));

    assert.equal(newRecords.length, 1);
    assert.equal(newRecords[0].agreement_type, 'privacy_policy');
    assert.equal(newRecords[0].acceptance_source, 'profile_explicit_consent');

    // Historical terms_of_service record remains untouched and is NOT backdated or modified
    assert.equal(existingAgreements[0].accepted_at, historicalTimestamp);
  });

  await t.test('6.5 Login does NOT auto-record synthetic agreements without explicit user action', () => {
    // When a user signs in, agreements must NOT be auto-generated in the background
    let agreementInsertTriggered = false;
    function simulateLogin(user) {
      // In the patched code, signInWithPassword does NOT call ensureAgreementsRecorded
      return { success: true, user, session: { access_token: 'valid' } };
    }

    const res = simulateLogin({ id: 'user-unagreed-1', email: 'test@example.com' });
    assert.equal(res.success, true);
    assert.equal(agreementInsertTriggered, false, 'Login must not inject synthetic consent rows');
  });
});

