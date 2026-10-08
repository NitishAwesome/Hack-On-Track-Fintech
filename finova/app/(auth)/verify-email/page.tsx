'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MailCheck, RefreshCw, CheckCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { AuthService } from '@/lib/services/authService';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;

    setResending(true);
    setError(null);
    setMessage(null);

    try {
      const res = await AuthService.resendVerificationEmail(email);
      if (res.success) {
        setMessage('A fresh verification link has been sent to your email.');
        setResendCooldown(60); // 60 seconds cooldown to prevent rate limiting
      } else {
        setError(res.error || 'Failed to resend verification email. Please try again shortly.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error during email dispatch.';
      setError(msg);
    } finally {
      setResending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card max-w-md mx-auto p-8 sm:p-10 shadow-2xl border border-border text-center space-y-6"
    >
      {/* Brand */}
      <div className="inline-flex justify-center">
        <FinovaLogo size="md" variant="horizontal" href="/" />
      </div>

      {/* Email Icon */}
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-brand">
        <MailCheck className="w-8 h-8" />
      </div>

      {/* Main Copy */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Verify your email
        </h1>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          We&apos;ve sent a verification link to{' '}
          <strong className="text-foreground">{email || 'your email address'}</strong>.
          Please click the link in your email to verify your account and activate your Finova portfolio.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-500 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-loss/30 bg-loss-bg/20 text-xs text-loss flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resend Action */}
      <div className="pt-2 border-t border-border space-y-3">
        <p className="text-xs text-muted">
          Didn&apos;t receive the email? Check your spam folder or request a new link.
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0 || !email}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors disabled:opacity-50 text-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
          <span>
            {resending
              ? 'Sending…'
              : resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : 'Resend verification link'}
          </span>
        </button>
      </div>

      {/* Back to Login */}
      <div className="pt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Sign In</span>
        </Link>
      </div>
    </motion.div>
  );
}
