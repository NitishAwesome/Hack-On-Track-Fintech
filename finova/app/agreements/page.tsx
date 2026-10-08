'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, FileText, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { createClient } from '@/lib/supabase/client';
import { AuthService } from '@/lib/services/authService';

interface Agreement {
  id: 'agreeTerms' | 'agreePrivacy' | 'agreeRisk';
  icon: React.ReactNode;
  label: React.ReactNode;
  required: true;
}

export default function AgreementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRisk, setAgreeRisk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeNext =
    next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // Not authenticated — send to login
        router.replace('/login');
        return;
      }
      setUserId(user.id);
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Investor';
      setUserName(name);
      setLoading(false);
    });
  }, [router]);

  const allChecked = agreeTerms && agreePrivacy && agreeRisk;

  async function handleAccept() {
    if (!allChecked) {
      setError('Please confirm all three agreements before continuing.');
      return;
    }
    if (!userId) return;

    setSubmitting(true);
    setError(null);

    try {
      await AuthService.recordAgreements(userId, 'onboarding');
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record agreements. Please try again.';
      setError(msg);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-brand" />
      </div>
    );
  }

  const agreements: Agreement[] = [
    {
      id: 'agreeTerms',
      icon: <FileText className="w-4 h-4 text-brand" />,
      label: (
        <>
          I agree to Finova&apos;s{' '}
          <Link
            href="/terms"
            target="_blank"
            className="font-semibold text-brand underline hover:no-underline"
          >
            Terms of Service
          </Link>
          . <span className="text-loss">*</span>
        </>
      ),
      required: true,
    },
    {
      id: 'agreePrivacy',
      icon: <Lock className="w-4 h-4 text-brand" />,
      label: (
        <>
          I have read and acknowledge Finova&apos;s{' '}
          <Link
            href="/privacy"
            target="_blank"
            className="font-semibold text-brand underline hover:no-underline"
          >
            Privacy Policy
          </Link>
          . <span className="text-loss">*</span>
        </>
      ),
      required: true,
    },
    {
      id: 'agreeRisk',
      icon: <AlertCircle className="w-4 h-4 text-brand" />,
      label: (
        <>
          I understand that investments involve market risks and that Finova&apos;s portfolio
          insights are for informational purposes only.{' '}
          <Link
            href="/risk-disclosure"
            target="_blank"
            className="font-semibold text-brand underline hover:no-underline"
          >
            (Read Risk Disclosure)
          </Link>
          . <span className="text-loss">*</span>
        </>
      ),
      required: true,
    },
  ];

  const states = { agreeTerms, agreePrivacy, agreeRisk };
  const setters = {
    agreeTerms: setAgreeTerms,
    agreePrivacy: setAgreePrivacy,
    agreeRisk: setAgreeRisk,
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      {/* Subtle gradient backdrop */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgb(var(--brand) / 0.07), transparent)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card relative z-10 max-w-lg w-full p-8 sm:p-10 shadow-2xl border border-border space-y-7"
      >
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex justify-center">
            <FinovaLogo size="md" variant="horizontal" href="/" />
          </div>

          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7 text-brand" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              One last step, {userName ? userName.split(' ')[0] : 'Investor'}
            </h1>
            <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
              Before accessing your Finova dashboard, please review and accept the following
              mandatory agreements. These cannot be pre-checked.
            </p>
          </div>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg border border-loss/30 bg-loss-bg/20 text-xs text-loss flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agreement Checkboxes */}
        <div className="space-y-3">
          {agreements.map((agreement) => {
            const checked = states[agreement.id];
            const setChecked = setters[agreement.id];
            return (
              <motion.label
                key={agreement.id}
                whileHover={{ scale: 1.005 }}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  checked
                    ? 'border-brand/40 bg-brand/5'
                    : 'border-border bg-surface-raised hover:border-brand/20'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setChecked(e.target.checked);
                      if (error) setError(null);
                    }}
                    className="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                </div>
                <div className="flex items-start gap-2 flex-1">
                  <span className="flex-shrink-0 mt-0.5">{agreement.icon}</span>
                  <span className="text-xs text-muted leading-relaxed">{agreement.label}</span>
                </div>
                {checked && (
                  <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                )}
              </motion.label>
            );
          })}
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-surface-raised overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
              animate={{ width: `${([agreeTerms, agreePrivacy, agreeRisk].filter(Boolean).length / 3) * 100}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
          <span className="text-[11px] text-muted font-medium">
            {[agreeTerms, agreePrivacy, agreeRisk].filter(Boolean).length}/3 confirmed
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={handleAccept}
          disabled={!allChecked || submitting}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving agreements…</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Accept & Enter Finova</span>
            </>
          )}
        </button>

        {/* Decline / Logout option */}
        <p className="text-center text-[11px] text-muted/70 leading-relaxed">
          These agreements are required to use Finova.{' '}
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="underline hover:text-foreground transition-colors"
          >
            Sign out and cancel
          </button>
          .
        </p>
      </motion.div>
    </div>
  );
}
