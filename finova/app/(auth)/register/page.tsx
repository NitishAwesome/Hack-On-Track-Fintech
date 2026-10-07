'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';

const RISK_OPTIONS: { value: RiskAppetite; label: string; description: string }[] = [
  {
    value: 'conservative',
    label: 'Conservative',
    description: 'Prioritise capital preservation. Prefer bonds and low-volatility assets.',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced approach. Mix of growth and stability.',
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'Prioritise growth. Comfortable with market volatility.',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'profile' | 'email' | 'otp'>('profile');
  const [fullName, setFullName] = useState('');
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('moderate');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setStep('email');
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName, risk_appetite: riskAppetite },
      },
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

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Upsert profile with user metadata
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        risk_appetite: riskAppetite,
        onboarding_done: true,
      });
    }

    setLoading(false);
    router.push('/portfolio');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card p-8 space-y-6"
    >
      {/* Logo */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
          >
            F
          </div>
          <span className="text-xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Finova
          </span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {['profile', 'email', 'otp'].map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div
              className="h-1 flex-1 rounded-full transition-colors duration-500"
              style={{
                backgroundColor:
                  ['profile', 'email', 'otp'].indexOf(step) >= i
                    ? 'rgb(var(--brand-500))'
                    : 'rgb(var(--border))',
              }}
            />
          </div>
        ))}
      </div>

      {step === 'profile' && (
        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-semibold text-center mb-1" style={{ color: 'rgb(var(--foreground))' }}>
            Create your account
          </h1>
          <p className="text-sm text-center mb-5" style={{ color: 'rgb(var(--muted))' }}>
            Tell us a bit about yourself
          </p>

          <form onSubmit={handleProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Arjun Sharma"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: 'rgb(var(--surface-raised))',
                    border: '1px solid rgb(var(--border))',
                    color: 'rgb(var(--foreground))',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgb(var(--brand-500))'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgb(var(--border))'; }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                Investment risk appetite
              </label>
              <div className="space-y-2">
                {RISK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRiskAppetite(opt.value)}
                    className="w-full text-left p-3 rounded-lg transition-all"
                    style={{
                      backgroundColor:
                        riskAppetite === opt.value
                          ? 'rgb(var(--brand-500) / 0.12)'
                          : 'rgb(var(--surface-raised))',
                      border:
                        riskAppetite === opt.value
                          ? '1px solid rgb(var(--brand-500))'
                          : '1px solid rgb(var(--border))',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                      {opt.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <button
              id="btn-next-to-email"
              type="submit"
              disabled={!fullName.trim()}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              Continue
            </button>
          </form>
        </motion.div>
      )}

      {step === 'email' && (
        <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-semibold text-center mb-1" style={{ color: 'rgb(var(--foreground))' }}>
            Your email address
          </h1>
          <p className="text-sm text-center mb-5" style={{ color: 'rgb(var(--muted))' }}>
            We&apos;ll send a verification code
          </p>

          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
                <input
                  id="reg-email"
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
                  onFocus={(e) => { e.target.style.borderColor = 'rgb(var(--brand-500))'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgb(var(--border))'; }}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: 'rgb(var(--loss))' }}>{error}</p>
            )}

            <button
              id="btn-reg-send-otp"
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send code'}
            </button>

            <button type="button" onClick={() => setStep('profile')}
              className="w-full text-sm text-center" style={{ color: 'rgb(var(--muted))' }}>
              ← Back
            </button>
          </form>
        </motion.div>
      )}

      {step === 'otp' && (
        <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-semibold text-center mb-1" style={{ color: 'rgb(var(--foreground))' }}>
            Enter code
          </h1>
          <p className="text-sm text-center mb-5" style={{ color: 'rgb(var(--muted))' }}>
            Sent to <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>{email}</span>
          </p>

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <input
              id="reg-otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              required
              className="w-full px-4 py-3 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                border: '1px solid rgb(var(--border))',
                color: 'rgb(var(--foreground))',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgb(var(--brand-500))'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgb(var(--border))'; }}
            />
            {error && (
              <p className="text-sm text-center" style={{ color: 'rgb(var(--loss))' }}>{error}</p>
            )}
            <button
              id="btn-reg-verify-otp"
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create account'}
            </button>
          </form>
        </motion.div>
      )}

      <p className="text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>
        Already have an account?{' '}
        <Link href="/login" className="font-medium" style={{ color: 'rgb(var(--brand-500))' }}>
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
