'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { AuthService } from '@/lib/services/authService';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Strength checks
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const strengthScore = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('New password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (strengthScore < 3) {
      setError('Password must contain letters, numbers, and symbols');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await AuthService.updatePassword(password);
      if (!res.success) {
        setError(res.error || 'Failed to update password. Your reset link may have expired.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while resetting password.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card max-w-md mx-auto p-8 sm:p-10 shadow-2xl border border-border space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex justify-center">
          <FinovaLogo size="md" variant="horizontal" href="/" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-2">
          Create new password
        </h1>
        <p className="text-xs text-muted">
          Choose a strong password to secure your Finova account
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-loss/30 bg-loss-bg/20 text-xs text-loss flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="space-y-4 text-center py-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Password updated successfully!</h3>
            <p className="text-xs text-muted">Redirecting you to your portfolio dashboard…</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          {/* New Password */}
          <div className="space-y-1">
            <label
              htmlFor="new-password"
              className="block text-xs font-semibold text-foreground"
            >
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
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

          {/* Confirm New Password */}
          <div className="space-y-1">
            <label
              htmlFor="confirm-new-password"
              className="block text-xs font-semibold text-foreground"
            >
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                id="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full pl-9 pr-9 py-2 rounded-lg text-xs sm:text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand transition-colors"
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
          </div>

          {/* Strength guidance */}
          {password && (
            <div className="space-y-1.5 p-2 rounded-lg bg-surface-raised/60 border border-border text-[11px]">
              <div className="flex items-center justify-between text-muted">
                <span>Strength:</span>
                <span className={cn(
                  'font-semibold',
                  strengthScore <= 1 && 'text-loss',
                  strengthScore === 2 && 'text-amber-500',
                  strengthScore >= 3 && 'text-gain'
                )}>
                  {strengthScore <= 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : strengthScore === 3 ? 'Good' : 'Strong'}
                </span>
              </div>
              <div className="flex h-1 rounded-full overflow-hidden bg-muted/20 gap-1">
                <div className={cn('flex-1 transition-colors', strengthScore >= 1 ? (strengthScore === 1 ? 'bg-loss' : 'bg-amber-500') : 'bg-transparent')} />
                <div className={cn('flex-1 transition-colors', strengthScore >= 2 ? (strengthScore === 2 ? 'bg-amber-500' : 'bg-gain') : 'bg-transparent')} />
                <div className={cn('flex-1 transition-colors', strengthScore >= 3 ? 'bg-gain' : 'bg-transparent')} />
                <div className={cn('flex-1 transition-colors', strengthScore >= 4 ? 'bg-emerald-400' : 'bg-transparent')} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating password…</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>

          <div className="text-center pt-2 border-t border-border">
            <Link
              href="/login"
              className="text-xs text-muted hover:text-foreground font-medium"
            >
              Cancel and Return to Sign In
            </Link>
          </div>
        </form>
      )}
    </motion.div>
  );
}
