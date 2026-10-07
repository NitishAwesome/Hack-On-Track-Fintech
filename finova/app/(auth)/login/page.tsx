'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { FinovaLogo } from '@/components/shared/FinovaLogo';

type Step = 'email' | 'otp' | 'success';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep('otp');
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep('success');
      setTimeout(() => router.push('/portfolio'), 800);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card p-8 space-y-6"
    >
      {/* Logo */}
      <div className="text-center space-y-2">
        <div className="inline-flex justify-center">
          <FinovaLogo size="lg" variant="horizontal" href="/" />
        </div>
        <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
          Your Investments. Unified. Understood.
        </p>
      </div>

      {step === 'email' && (
        <motion.div
          key="email"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <div className="text-center">
            <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
              Sign in with your email — no password needed
            </p>
          </div>

          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: 'rgb(var(--foreground))' }}
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'rgb(var(--muted))' }}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: 'rgb(var(--surface-raised))',
                    border: '1px solid rgb(var(--border))',
                    color: 'rgb(var(--foreground))',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(var(--brand-500))';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgb(var(--border))';
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: 'rgb(var(--loss))' }}>
                {error}
              </p>
            )}

            <button
              id="btn-send-otp"
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
              }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : (
                'Send verification code'
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'rgb(var(--border))' }} />
            </div>
            <div className="relative flex justify-center text-xs" style={{ color: 'rgb(var(--muted))' }}>
              <span className="px-2" style={{ backgroundColor: 'rgb(var(--surface))' }}>
                or continue with
              </span>
            </div>
          </div>

          <button
            id="btn-google-login"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              border: '1px solid rgb(var(--border))',
              color: 'rgb(var(--foreground))',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium" style={{ color: 'rgb(var(--brand-500))' }}>
              Sign up
            </Link>
          </p>
        </motion.div>
      )}

      {step === 'otp' && (
        <motion.div
          key="otp"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <div className="text-center">
            <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              Check your email
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
              We sent a 6-digit code to <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="otp"
                className="text-sm font-medium"
                style={{ color: 'rgb(var(--foreground))' }}
              >
                Verification code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                className="w-full px-4 py-3 rounded-lg text-center text-2xl font-mono tracking-widest transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'rgb(var(--surface-raised))',
                  border: '1px solid rgb(var(--border))',
                  color: 'rgb(var(--foreground))',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgb(var(--brand-500))'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgb(var(--border))'; }}
              />
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: 'rgb(var(--loss))' }}>
                {error}
              </p>
            )}

            <button
              id="btn-verify-otp"
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
              }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
              ) : (
                'Verify & sign in'
              )}
            </button>
          </form>

          <button
            onClick={() => { setStep('email'); setError(null); setOtp(''); }}
            className="w-full text-sm text-center"
            style={{ color: 'rgb(var(--muted))' }}
          >
            ← Back to email
          </button>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-4"
        >
          <CheckCircle className="w-12 h-12" style={{ color: 'rgb(var(--gain))' }} />
          <p className="text-lg font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Signed in! Redirecting…
          </p>
        </motion.div>
      )}

      <p className="text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </motion.div>
  );
}
