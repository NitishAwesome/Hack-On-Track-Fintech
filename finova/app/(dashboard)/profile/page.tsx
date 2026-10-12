'use client';

// ============================================================
// FINOVA — User Profile & Account Security Management
// Enhanced for Prompt 14:
// - Verified Auth Metadata & Creation Timestamps
// - Robust Save Lifecycle (No false success states)
// - Non-hanging session expiration handling
// - Truthful Legal Agreement Audit (No synthetic "Accepted on Signup")
// - Account Security & Password Reset
// - Zero password / PIN / PAN / Aadhaar credential collection
// ============================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Loader2,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Calendar,
  KeyRound,
  FileText,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthService } from '@/lib/services/authService';
import type { RiskAppetite } from '@/types/portfolio';
import type { AgreementType } from '@/types/auth';

const RISK_OPTIONS: { value: RiskAppetite; label: string; description: string }[] = [
  { value: 'conservative', label: 'Conservative', description: 'Prioritise capital preservation with lower market volatility' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced growth with controlled exposure to equity & alternatives' },
  { value: 'aggressive', label: 'Aggressive', description: 'Maximise long-term compounding with higher equity allocation' },
];

interface UserAgreementRecord {
  agreement_type: string;
  agreement_version: string;
  accepted_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  // User & Profile State
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('moderate');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string>('email');

  // Page Lifecycle States
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Field Validation State
  const [validationErrors, setValidationErrors] = useState<{ fullName?: string; phone?: string }>({});

  // Agreements State
  const [agreements, setAgreements] = useState<UserAgreementRecord[]>([]);
  const [recordingAgreements, setRecordingAgreements] = useState(false);
  const [agreementSuccess, setAgreementSuccess] = useState<string | null>(null);

  // Explicit Consent Review Modal State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentChoices, setConsentChoices] = useState<Record<AgreementType, boolean>>({
    terms_of_service: false,
    privacy_policy: false,
    risk_disclosure: false,
  });
  const [consentError, setConsentError] = useState<string | null>(null);

  // Password Reset State
  const [resetSending, setResetSending] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Direct Change Password State (Prompt 16)
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        // Issue 2 Fix: If unauthenticated, resolve loading state immediately
        if (authErr || !user) {
          setLoading(false);
          setUnauthenticated(true);
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? '');
        setCreatedAt(user.created_at ?? null);

        // Detect authentication provider safely
        const provider = (user.app_metadata?.provider || user.identities?.[0]?.provider || 'email') as string;
        setAuthProvider(provider);

        // Fetch profile record
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData && !profileErr) {
          setFullName(profileData.full_name ?? '');
          setPhone(profileData.phone ?? '');
          setRiskAppetite((profileData.risk_appetite as RiskAppetite) ?? 'moderate');
        } else if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name);
        }

        // Fetch real agreement audit records
        const { data: agData } = await supabase
          .from('user_agreements')
          .select('agreement_type, agreement_version, accepted_at')
          .eq('user_id', user.id);

        if (agData) {
          setAgreements(agData);
        }
      } catch (err) {
        console.error('[ProfilePage] Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateForm(): boolean {
    const errors: { fullName?: string; phone?: string } = {};

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      errors.fullName = 'Full name cannot exceed 100 characters.';
    }

    if (phone) {
      const trimmedPhone = phone.trim();
      // Allows standard formats: +91 98765 43210, 9876543210, +1-555-555-5555
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        errors.phone = 'Please enter a valid phone number (e.g. +91 98765 43210).';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveError('Your session has expired. Please sign in again to save changes.');
        setSaving(false);
        setUnauthenticated(true);
        return;
      }

      // Issue 1 Fix: Explicitly check returned error before showing success
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        risk_appetite: riskAppetite,
        onboarding_done: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[ProfilePage] Supabase profile upsert error:', error);
        setSaveError(error.message || 'Unable to save profile changes. Please try again.');
        setSaved(false);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('[ProfilePage] Unexpected error saving profile:', err);
      setSaveError('An unexpected error occurred while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) return;
    setResetSending(true);
    setResetStatus(null);

    const res = await AuthService.sendPasswordResetEmail(email);
    setResetSending(false);

    if (res.success) {
      setResetStatus({
        success: true,
        message: 'Password reset link sent! Check your inbox to update your password.',
      });
    } else {
      setResetStatus({
        success: false,
        message: res.error || 'Failed to send password reset email. Please try again.',
      });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 8) {
      setPasswordChangeError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[0-9]/.test(trimmedPassword) && !/[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword)) {
      setPasswordChangeError('Password must contain at least one number or special character.');
      return;
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      setPasswordChangeError('New password and confirm password do not match.');
      return;
    }

    setPasswordChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });

      if (error) {
        setPasswordChangeError(error.message || 'Failed to update password.');
      } else {
        setPasswordChangeSuccess('Password updated successfully! Your account credentials have been updated.');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePasswordForm(false);
        setTimeout(() => setPasswordChangeSuccess(null), 5000);
      }
    } catch (err) {
      setPasswordChangeError('An unexpected error occurred while updating your password.');
    } finally {
      setPasswordChanging(false);
    }
  }

  function openConsentReview() {
    setConsentChoices({
      terms_of_service: false,
      privacy_policy: false,
      risk_disclosure: false,
    });
    setConsentError(null);
    setShowConsentModal(true);
  }

  async function handleConfirmExplicitConsent() {
    if (!userId) return;

    const missingTypes = (['terms_of_service', 'privacy_policy', 'risk_disclosure'] as AgreementType[]).filter(
      (type) => !agreements.some((a) => a.agreement_type === type)
    );
    const selectedTypes = missingTypes.filter((type) => consentChoices[type]);

    if (selectedTypes.length === 0) {
      setConsentError('Please review and check at least one missing agreement to confirm acceptance.');
      return;
    }

    setRecordingAgreements(true);
    setConsentError(null);

    const res = await AuthService.recordAgreements(userId, 'profile_explicit_consent', selectedTypes);
    setRecordingAgreements(false);

    if (res.success) {
      setAgreementSuccess(
        `Explicit consent audit logged: ${res.count ?? selectedTypes.length} agreement(s) recorded at ${new Date().toLocaleTimeString('en-IN')}.`
      );
      setShowConsentModal(false);

      // Refresh agreements
      const { data } = await supabase
        .from('user_agreements')
        .select('agreement_type, agreement_version, accepted_at')
        .eq('user_id', userId);
      if (data) {
        setAgreements(data);
      }
      setTimeout(() => setAgreementSuccess(null), 4500);
    } else {
      setConsentError(res.error || 'Failed to record consent. Please try again.');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Loading Skeleton
  if (loading) {
    return (
      <div className="page-container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="skeleton h-8 w-44" />
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="skeleton h-14 w-14 rounded-2xl" />
              <div className="space-y-2 flex-1">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-4 w-36" />
              </div>
            </div>
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated State
  if (unauthenticated) {
    return (
      <div className="page-container py-12">
        <div className="max-w-md mx-auto text-center card p-8 space-y-4 border border-border">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Session Expired or Not Found</h2>
          <p className="text-xs text-muted leading-relaxed">
            Please sign in to your Finova account to view and manage your profile and security settings.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              Sign In to Finova
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const termsRecord = agreements.find((a) => a.agreement_type === 'terms_of_service');
  const privacyRecord = agreements.find((a) => a.agreement_type === 'privacy_policy');
  const riskRecord = agreements.find((a) => a.agreement_type === 'risk_disclosure');
  const hasAllAgreements = !!termsRecord && !!privacyRecord && !!riskRecord;

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : email.charAt(0).toUpperCase();

  return (
    <div className="page-container py-6 space-y-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            User Profile & Security
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Manage your personal identity, investment preferences, and account security
          </p>
        </div>

        {/* Profile Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-border"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg text-foreground">
                  {fullName || 'Finova Investor'}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-brand/10 border-brand/30 text-brand">
                  Active Member
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">{email}</p>
              {createdAt && (
                <p className="text-[11px] text-muted flex items-center gap-1 mt-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted" />
                  <span>Member since {new Date(createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-center">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-muted block">Auth Provider</span>
              <span className="text-xs font-semibold text-foreground capitalize">
                {authProvider === 'google' ? 'Google OAuth' : 'Email & Password'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Editable Personal Details Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-6 border border-border space-y-5"
        >
          <div className="border-b border-border/60 pb-3">
            <h2 className="text-base font-bold text-foreground">Personal Details</h2>
            <p className="text-xs text-muted mt-0.5">
              These details help personalize your Finova dashboard and educational experience
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (validationErrors.fullName) setValidationErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                    validationErrors.fullName
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-border bg-surface-raised focus:border-brand'
                  }`}
                  style={{ border: '1px solid' }}
                />
              </div>
              {validationErrors.fullName && (
                <p className="text-[11px] text-rose-400 font-medium">{validationErrors.fullName}</p>
              )}
            </div>

            {/* Email (Read-Only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <span className="text-[10px] text-muted">Primary Login Identity</span>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-surface-raised/40 border border-border text-muted cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-muted">
                To protect your financial account identity, email addresses are immutable from the profile form.
              </p>
            </div>

            {/* Phone (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Contact Phone (Optional)
                </label>
                <span className="text-[10px] text-muted">For communication only</span>
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (validationErrors.phone) setValidationErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  placeholder="+91 98765 43210"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                    validationErrors.phone
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-border bg-surface-raised focus:border-brand'
                  }`}
                  style={{ border: '1px solid' }}
                />
              </div>
              {validationErrors.phone && (
                <p className="text-[11px] text-rose-400 font-medium">{validationErrors.phone}</p>
              )}
            </div>

            {/* Risk Appetite Selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-brand" />
                Self-Declared Risk Appetite
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {RISK_OPTIONS.map((opt) => {
                  const isSelected = riskAppetite === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRiskAppetite(opt.value)}
                      className={`p-3 rounded-xl text-left transition-all border ${
                        isSelected
                          ? 'border-brand bg-brand/10 shadow-sm'
                          : 'border-border bg-surface-raised hover:border-slate-600'
                      }`}
                    >
                      <p className={`text-xs font-bold ${isSelected ? 'text-brand' : 'text-foreground'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-muted mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                * Note: Self-declared risk appetite is used solely for educational benchmarks and does not constitute a formal SEBI suitability assessment.
              </p>
            </div>

            {/* Save Feedback Alerts */}
            {saveError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saved && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Changes saved successfully to your cloud profile!</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-save-profile"
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm transition-all"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes…
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile Details
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Account Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 border border-border space-y-4"
        >
          <div className="border-b border-border/60 pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand" />
              Account Security & Access
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Authentication credentials, session lifecycle, and sign-out controls
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Authentication Method</p>
                <p className="text-xs text-muted mt-0.5">
                  {authProvider === 'google'
                    ? 'Google OAuth Single Sign-On'
                    : 'Email and Encrypted Password'}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-slate-800 border-slate-700 text-slate-300 uppercase">
                {authProvider}
              </span>
            </div>

            {authProvider === 'email' ? (
              <div className="pt-2 border-t border-border/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">Account Password</p>
                    <p className="text-xs text-muted">
                      Update your account password or request an email reset link.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChangePasswordForm(!showChangePasswordForm)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 transition-colors"
                    >
                      {showChangePasswordForm ? 'Hide Password Form' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={resetSending}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface-raised text-muted hover:text-foreground flex-shrink-0 transition-colors disabled:opacity-50"
                      title="Send password reset link to your email"
                    >
                      {resetSending ? 'Sending…' : 'Email Reset Link'}
                    </button>
                  </div>
                </div>

                {/* Inline Change Password Form */}
                {showChangePasswordForm && (
                  <form
                    onSubmit={handleChangePassword}
                    className="p-4 rounded-xl border border-border bg-surface space-y-3 pt-3"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Set New Password</p>
                      <p className="text-[11px] text-muted">
                        Must be at least 8 characters with at least one number or special character.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted">New Password</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-lg text-xs bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted">Confirm New Password</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-lg text-xs bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>

                    {passwordChangeError && (
                      <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{passwordChangeError}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePasswordForm(false);
                          setPasswordChangeError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordChanging}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand text-white hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        {passwordChanging ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating Password…</span>
                          </>
                        ) : (
                          <span>Update Password</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="pt-2 border-t border-border/40 text-xs text-muted leading-relaxed">
                Your account signs in via Google OAuth. To update your password or 2-factor authentication, manage your security settings directly in your Google Account.
              </div>
            )}

            {passwordChangeSuccess && (
              <div className="p-3 rounded-lg text-xs flex items-center gap-2 border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{passwordChangeSuccess}</span>
              </div>
            )}

            {resetStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  resetStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {resetStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{resetStatus.message}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="btn-profile-signout"
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out of this session
            </button>
          </div>
        </motion.div>

        {/* Legal Agreements & Consents Audit (Issue 3 Fix) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-6 border border-border space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand" />
                Legal Agreements & Consent Audit
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Immutable audit trail of your mandatory user agreements
              </p>
            </div>
            {hasAllAgreements ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                All Consents Verified
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                Consent Audit Incomplete
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Terms of Service */}
            <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-center justify-between gap-4">
              <div>
                <a
                  href="/terms"
                  target="_blank"
                  className="font-bold text-foreground hover:text-brand flex items-center gap-1.5 transition-colors"
                >
                  Terms of Service
                  <ExternalLink className="w-3 h-3 text-muted" />
                </a>
                <p className="text-[11px] text-muted">
                  Version: {termsRecord ? termsRecord.agreement_version : '1.0.0-draft'}
                </p>
              </div>
              <div className="text-right">
                {termsRecord?.accepted_at ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {new Date(termsRecord.accepted_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-400">
                    No Audit Record Found
                  </span>
                )}
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-center justify-between gap-4">
              <div>
                <a
                  href="/privacy"
                  target="_blank"
                  className="font-bold text-foreground hover:text-brand flex items-center gap-1.5 transition-colors"
                >
                  Privacy Policy
                  <ExternalLink className="w-3 h-3 text-muted" />
                </a>
                <p className="text-[11px] text-muted">
                  Version: {privacyRecord ? privacyRecord.agreement_version : '1.0.0-draft'}
                </p>
              </div>
              <div className="text-right">
                {privacyRecord?.accepted_at ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {new Date(privacyRecord.accepted_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-400">
                    No Audit Record Found
                  </span>
                )}
              </div>
            </div>

            {/* Market Risk Disclosure */}
            <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-center justify-between gap-4">
              <div>
                <a
                  href="/risk-disclosure"
                  target="_blank"
                  className="font-bold text-foreground hover:text-brand flex items-center gap-1.5 transition-colors"
                >
                  Market Risk Disclosure
                  <ExternalLink className="w-3 h-3 text-muted" />
                </a>
                <p className="text-[11px] text-muted">
                  Version: {riskRecord ? riskRecord.agreement_version : '1.0.0-draft'}
                </p>
              </div>
              <div className="text-right">
                {riskRecord?.accepted_at ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {new Date(riskRecord.accepted_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-400">
                    No Audit Record Found
                  </span>
                )}
              </div>
            </div>
          </div>

          {!hasAllAgreements && (
            <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
              <div className="text-xs text-amber-300 leading-relaxed">
                One or more mandatory agreement audit records are missing from your account history. SEBI and Finova compliance require individual review and explicit acceptance.
              </div>
              <button
                type="button"
                onClick={openConsentReview}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1.5 flex-shrink-0 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Review & Accept Missing Agreements
              </button>
            </div>
          )}

          {agreementSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{agreementSuccess}</span>
            </div>
          )}
        </motion.div>

        {/* Explicit Legal Consent Review Modal */}
        {showConsentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-foreground">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Explicit Legal & Regulatory Review</h3>
                    <p className="text-xs text-muted">
                      SEBI compliance requires unbundled, informed consent for each agreement.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConsentModal(false)}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {consentError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{consentError}</span>
                </div>
              )}

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {/* Terms of Service */}
                {!termsRecord && (
                  <div className="p-4 rounded-xl border border-border bg-surface-raised/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">Terms of Service</span>
                      <span className="text-[11px] font-mono text-muted bg-surface-raised px-2 py-0.5 rounded border border-border/40">
                        v1.0.0-draft
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Governs your use of Finova as a non-custodial portfolio tracker and educational analytics platform.
                    </p>
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium"
                    >
                      Open Full Terms of Service <ExternalLink className="w-3 h-3" />
                    </a>
                    <label className="flex items-start gap-2.5 pt-2 border-t border-border/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChoices.terms_of_service}
                        onChange={(e) =>
                          setConsentChoices((prev) => ({ ...prev, terms_of_service: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                      />
                      <span className="text-xs text-foreground font-medium select-none">
                        I have opened, reviewed, and explicitly agree to Finova&apos;s Terms of Service.
                      </span>
                    </label>
                  </div>
                )}

                {/* Privacy Policy */}
                {!privacyRecord && (
                  <div className="p-4 rounded-xl border border-border bg-surface-raised/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">Privacy Policy</span>
                      <span className="text-[11px] font-mono text-muted bg-surface-raised px-2 py-0.5 rounded border border-border/40">
                        v1.0.0-draft
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Explains Finova&apos;s zero-credential policy (no passwords or OTPs stored) and row-level encrypted cloud storage.
                    </p>
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium"
                    >
                      Open Full Privacy Policy <ExternalLink className="w-3 h-3" />
                    </a>
                    <label className="flex items-start gap-2.5 pt-2 border-t border-border/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChoices.privacy_policy}
                        onChange={(e) =>
                          setConsentChoices((prev) => ({ ...prev, privacy_policy: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                      />
                      <span className="text-xs text-foreground font-medium select-none">
                        I have opened, reviewed, and explicitly agree to Finova&apos;s Privacy Policy.
                      </span>
                    </label>
                  </div>
                )}

                {/* Market Risk Disclosure */}
                {!riskRecord && (
                  <div className="p-4 rounded-xl border border-border bg-surface-raised/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">Market Risk Disclosure</span>
                      <span className="text-[11px] font-mono text-muted bg-surface-raised px-2 py-0.5 rounded border border-border/40">
                        v1.0.0-draft
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Mandatory warning regarding investment risk, market fluctuations, and educational nature of analytics.
                    </p>
                    <a
                      href="/risk-disclosure"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium"
                    >
                      Open Full Market Risk Disclosure <ExternalLink className="w-3 h-3" />
                    </a>
                    <label className="flex items-start gap-2.5 pt-2 border-t border-border/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChoices.risk_disclosure}
                        onChange={(e) =>
                          setConsentChoices((prev) => ({ ...prev, risk_disclosure: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                      />
                      <span className="text-xs text-foreground font-medium select-none">
                        I have opened, reviewed, and explicitly acknowledge the Market Risk Disclosure.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowConsentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExplicitConsent}
                  disabled={
                    recordingAgreements ||
                    (!consentChoices.terms_of_service &&
                      !consentChoices.privacy_policy &&
                      !consentChoices.risk_disclosure)
                  }
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-slate-950 hover:bg-brand-hover disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {recordingAgreements ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  Confirm & Record Legal Acceptance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy & Financial Architecture Guarantee */}
        <div className="rounded-xl p-4 text-xs text-muted text-center space-y-1 bg-surface-raised/30 border border-border/60">
          <p className="font-semibold text-foreground">
            Finova Financial Privacy & Zero-Credential Guarantee
          </p>
          <p className="leading-relaxed">
            Finova never stores passwords, MPINs, TPINs, or broker OTPs. Your data is isolated using PostgreSQL Row Level Security (RLS).
          </p>
        </div>
      </div>
    </div>
  );
}
