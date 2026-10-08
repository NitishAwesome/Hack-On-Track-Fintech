'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { AuthService } from '@/lib/services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await AuthService.sendPasswordResetEmail(email);
      // Safe messaging: show success screen regardless to prevent account enumeration
      setSubmitted(true);
      if (!res.success && res.error && !res.error.toLowerCase().includes('rate limit')) {
        // Log silently or show generic message
      }
    } catch {
      setSubmitted(true);
    } finally {
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
          Reset password
        </h1>
        <p className="text-xs text-muted leading-relaxed">
          Enter your registered email and we&apos;ll send you a secure link to reset your password.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-loss/30 bg-loss-bg/20 text-xs text-loss flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-5 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Password reset email sent</h3>
            <p className="text-xs text-muted leading-relaxed">
              If an account exists for <strong className="text-foreground">{email}</strong>, you will receive an email with instructions to choose a new password.
            </p>
          </div>

          <p className="text-[11px] text-muted">
            Be sure to check your spam or promotional folders if you don&apos;t see it within a few minutes.
          </p>

          <div className="pt-3 border-t border-border">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label
              htmlFor="reset-email"
              className="block text-xs font-semibold text-foreground"
            >
              Registered email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                id="reset-email"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending link…</span>
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-2 border-t border-border">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </motion.div>
  );
}
