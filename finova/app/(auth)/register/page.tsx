'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Layers,
  Sparkles,
  PieChart,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { AuthService } from '@/lib/services/authService';
import { cn } from '@/lib/utils';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeRisk: boolean;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  agreements?: string;
  general?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormState>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeRisk: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Password strength checks
  const hasMinLength = formData.password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(formData.password);
  const passwordStrengthScore = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

  function validate(): boolean {
    const newErrors: FormErrors = {};

    // Full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Indian Phone Number (+91 or 10 digits starting with 6-9)
    const cleanedPhone = formData.phone.replace(/[\s\-\+]/g, '');
    const standard10Digit = cleanedPhone.startsWith('91') && cleanedPhone.length === 12
      ? cleanedPhone.slice(2)
      : cleanedPhone;

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Mobile number is required';
    } else if (!phoneRegex.test(standard10Digit)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }

    // Password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrengthScore < 3) {
      newErrors.password = 'Include a mix of letters, numbers, and special characters';
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Checkboxes
    if (!formData.agreeTerms || !formData.agreePrivacy || !formData.agreeRisk) {
      newErrors.agreements = 'Please review and accept all required agreements to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await AuthService.signUp({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        agreementSource: 'registration',
      });

      if (!res.success) {
        setErrors({ general: res.error || 'Registration failed. Please check your details.' });
        setLoading(false);
        return;
      }

      if (res.needsEmailConfirmation) {
        // Redirect to explicit email verification instructions page
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      } else {
        // Active session established immediately
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during signup';
      setErrors({ general: msg });
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrors({});
    setGoogleLoading(true);
    try {
      const res = await AuthService.signInWithGoogle('/dashboard');
      if (!res.success || !res.url) {
        setErrors({ general: res.error || 'Could not initiate Google sign-in. Please try again.' });
        setGoogleLoading(false);
      } else {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setErrors({ general: msg });
      setGoogleLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card overflow-hidden shadow-2xl border border-border"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[640px]">
        {/* Left Panel: Value Proposition & Branding (Desktop) */}
        <div
          className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-border"
          style={{
            backgroundColor: 'rgb(var(--surface-raised) / 0.5)',
          }}
        >
          {/* Top Branding */}
          <div className="space-y-6">
            <Link href="/" className="inline-block focus:outline-none rounded-lg">
              <FinovaLogo size="md" variant="horizontal" />
            </Link>

            <div className="space-y-2 pt-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                Start your investment journey with clarity.
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Create your Finova account to organize, understand and analyze your investments in one place.
              </p>
            </div>

            {/* Three Key Benefits */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0 text-brand mt-0.5">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Unified investment portfolio</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    View equities, mutual funds, and fixed income alongside each other.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-500 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Portfolio intelligence & risk insights</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Actionable concentration diagnostics and plain-English portfolio explanations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-500 mt-0.5">
                  <PieChart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Explore options beyond stocks</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Gain exposure to REITs, InvITs, and Sovereign Gold Bonds with clear metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subtle Mini Portfolio Preview Card */}
          <div className="mt-8 p-3.5 rounded-xl border border-border/80 bg-surface/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
              <span>Sample Unified Portfolio</span>
              <span className="text-emerald-500 font-bold">+14.2% Total Return</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted/20 gap-0.5">
              <div className="w-[55%] bg-sky-500 rounded-l-full" title="Equities 55%" />
              <div className="w-[20%] bg-emerald-500" title="Mutual Funds 20%" />
              <div className="w-[15%] bg-purple-500" title="REITs & InvITs 15%" />
              <div className="w-[10%] bg-amber-500 rounded-r-full" title="Bonds 10%" />
            </div>
            <div className="flex justify-between text-[10px] text-muted pt-0.5">
              <span>₹12,48,500 Current Value</span>
              <span>4 Asset Classes</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Clean Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Create Account
              </h1>
              <p className="text-xs text-muted mt-1">
                Enter your details to register for Finova
              </p>
            </div>

            {/* General Error Banner */}
            {errors.general && (
              <div className="p-3 rounded-lg border border-loss/30 bg-loss-bg/20 text-xs text-loss flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Google OAuth - Quick Registration */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-border bg-surface-raised hover:bg-surface-raised/80 text-xs sm:text-sm font-semibold text-foreground transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span>{googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] font-medium text-muted uppercase tracking-widest">or register with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <div className="space-y-1">
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold text-foreground"
                >
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Arjun Sharma"
                    required
                    autoComplete="name"
                    className={cn(
                      'w-full pl-9 pr-3 py-2 rounded-lg text-xs sm:text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand transition-colors',
                      errors.fullName && 'border-loss'
                    )}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[11px] text-loss">{errors.fullName}</p>
                )}
              </div>

              {/* Email & Phone (Grid on larger screens) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Email Address */}
                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="arjun@example.com"
                      required
                      autoComplete="email"
                      className={cn(
                        'w-full pl-9 pr-3 py-2 rounded-lg text-xs sm:text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand transition-colors',
                        errors.email && 'border-loss'
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-loss">{errors.email}</p>
                  )}
                </div>

                {/* Mobile Number */}
                <div className="space-y-1">
                  <label
                    htmlFor="phone"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Mobile number
                  </label>
                  <div className="relative flex">
                    <div className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-border bg-surface text-muted text-xs font-semibold select-none">
                      +91
                    </div>
                    <div className="relative flex-1">
                      <input
                        id="phone"
                        type="tel"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        placeholder="9876543210"
                        required
                        autoComplete="tel-national"
                        className={cn(
                          'w-full pl-3 pr-3 py-2 rounded-r-lg text-xs sm:text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand transition-colors',
                          errors.phone && 'border-loss'
                        )}
                      />
                    </div>
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] text-loss">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Password */}
                <div className="space-y-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className={cn(
                        'w-full pl-9 pr-9 py-2 rounded-lg text-xs sm:text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand transition-colors',
                        errors.password && 'border-loss'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-loss">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className={cn(
                        'w-full pl-9 pr-9 py-2 rounded-lg text-xs sm:text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand transition-colors',
                        errors.confirmPassword && 'border-loss'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-loss">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Password Strength Guidance (Subtle indicator) */}
              {formData.password && (
                <div className="space-y-1.5 p-2 rounded-lg bg-surface-raised/60 border border-border text-[11px]">
                  <div className="flex items-center justify-between text-muted">
                    <span>Password Strength:</span>
                    <span className={cn(
                      'font-semibold',
                      passwordStrengthScore <= 1 && 'text-loss',
                      passwordStrengthScore === 2 && 'text-amber-500',
                      passwordStrengthScore >= 3 && 'text-gain'
                    )}>
                      {passwordStrengthScore <= 1 ? 'Weak' : passwordStrengthScore === 2 ? 'Fair' : passwordStrengthScore === 3 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                  <div className="flex h-1 rounded-full overflow-hidden bg-muted/20 gap-1">
                    <div className={cn('flex-1 transition-colors', passwordStrengthScore >= 1 ? (passwordStrengthScore === 1 ? 'bg-loss' : 'bg-amber-500') : 'bg-transparent')} />
                    <div className={cn('flex-1 transition-colors', passwordStrengthScore >= 2 ? (passwordStrengthScore === 2 ? 'bg-amber-500' : 'bg-gain') : 'bg-transparent')} />
                    <div className={cn('flex-1 transition-colors', passwordStrengthScore >= 3 ? 'bg-gain' : 'bg-transparent')} />
                    <div className={cn('flex-1 transition-colors', passwordStrengthScore >= 4 ? 'bg-emerald-400' : 'bg-transparent')} />
                  </div>
                </div>
              )}

              {/* THREE MANDATORY AGREEMENT CHECKBOXES (PART 4) */}
              <div className="space-y-2.5 pt-2 border-t border-border">
                {/* Checkbox 1: Terms of Service */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer flex-shrink-0"
                  />
                  <span className="text-muted leading-tight">
                    I agree to Finova&apos;s{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="font-semibold text-brand underline hover:no-underline"
                    >
                      Terms of Service
                    </Link>
                    . <span className="text-loss">*</span>
                  </span>
                </label>

                {/* Checkbox 2: Privacy Policy */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={formData.agreePrivacy}
                    onChange={(e) => setFormData({ ...formData, agreePrivacy: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer flex-shrink-0"
                  />
                  <span className="text-muted leading-tight">
                    I acknowledge that I have read Finova&apos;s{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="font-semibold text-brand underline hover:no-underline"
                    >
                      Privacy Policy
                    </Link>
                    . <span className="text-loss">*</span>
                  </span>
                </label>

                {/* Checkbox 3: Risk Disclosure */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={formData.agreeRisk}
                    onChange={(e) => setFormData({ ...formData, agreeRisk: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer flex-shrink-0"
                  />
                  <span className="text-muted leading-tight">
                    I understand that investments involve market risks and that Finova&apos;s portfolio insights are intended for informational and educational purposes.{' '}
                    <Link
                      href="/risk-disclosure"
                      target="_blank"
                      className="font-semibold text-brand underline hover:no-underline"
                    >
                      (Read Risk Disclosure)
                    </Link>
                    . <span className="text-loss">*</span>
                  </span>
                </label>

                {errors.agreements && (
                  <p className="text-[11px] text-loss pt-1 font-medium">{errors.agreements}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account…</span>
                  </>
                ) : (
                  <>
                    <span>Create Finova Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <p className="text-center text-xs text-muted pt-2">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-brand hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
