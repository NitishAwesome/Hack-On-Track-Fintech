'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { AuthService } from '@/lib/services/authService';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get('next') || '/dashboard';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? decodeURIComponent(urlError) : null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const res = await AuthService.signIn({ email, password });

      if (!res.success) {
        setError(res.error || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Signed in successfully! Redirecting…');

      // Validate redirect destination to avoid open redirects
      const safeDestination =
        nextTarget && nextTarget.startsWith('/') && !nextTarget.startsWith('//')
          ? nextTarget
          : '/dashboard';

      setTimeout(() => {
        router.push(safeDestination);
        router.refresh();
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.';
      setError(msg);
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await AuthService.signInWithGoogle(nextTarget);
      if (!res.success || !res.url) {
        setError(res.error || 'Could not initiate Google sign-in. Please try again.');
        setGoogleLoading(false);
      } else {
        // Navigate to Google OAuth consent screen
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
      setGoogleLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card max-w-md mx-auto p-8 sm:p-10 shadow-2xl border border-border space-y-6"
    >
      {/* Brand & Heading */}
      <div className="text-center space-y-2">
        <div className="inline-flex justify-center">
          <FinovaLogo size="md" variant="horizontal" href="/" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-2">
          Welcome back
        </h1>
        <p className="text-xs text-muted">
          Sign in to access your unified investment portfolio
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl border border-loss/30 bg-loss-bg/20 text-xs text-loss space-y-2">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
          {(error.toLowerCase().includes('not yet verified') ||
            error.toLowerCase().includes('rate limit')) && (
            <div className="p-2.5 rounded-lg bg-surface border border-border text-[11px] text-muted space-y-1">
              <span className="font-semibold text-foreground">💡 Tip:</span> Disable &quot;Confirm email&quot; in Supabase Dashboard (<strong className="text-foreground">Authentication → Providers → Email</strong>) to activate accounts immediately without email verification.
            </div>
          )}
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        {/* Email Address */}
        <div className="space-y-1">
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-foreground"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs sm:text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-foreground"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full pl-9 pr-9 py-2 rounded-lg text-xs sm:text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand transition-colors"
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
        </div>

        {/* Remember Session Checkbox */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer text-muted select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer"
            />
            <span>Remember this device</span>
          </label>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 pt-2.5"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[11px] font-medium text-muted uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* 1-Click Demo Evaluation Button */}
      <Link
        href="/demo"
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs sm:text-sm font-semibold text-amber-500 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs text-center"
      >
        <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span>Explore Demo Portfolio (No Login Required)</span>
      </Link>

      {/* Google Sign In */}
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
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>{googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}</span>
      </button>

      {/* Register Link */}
      <div className="text-center pt-2 border-t border-border">
        <p className="text-xs text-muted">
          Don&apos;t have a Finova account?{' '}
          <Link
            href="/register"
            className="font-semibold text-brand hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Disclosures note */}
      <p className="text-[11px] text-center text-muted/70 leading-normal">
        By signing in, you confirm adherence to Finova&apos;s{' '}
        <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{' '}
        <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </motion.div>
  );
}
