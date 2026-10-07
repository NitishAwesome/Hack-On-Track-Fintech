'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Save, Loader2, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RiskAppetite } from '@/types/portfolio';

const RISK_OPTIONS: { value: RiskAppetite; label: string; description: string }[] = [
  { value: 'conservative', label: 'Conservative', description: 'Prioritise capital preservation' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced growth and stability' },
  { value: 'aggressive', label: 'Aggressive', description: 'Maximise long-term growth' },
];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('moderate');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name ?? '');
        setPhone(data.phone ?? '');
        setRiskAppetite((data.risk_appetite as RiskAppetite) ?? 'moderate');
      }
      setLoading(false);
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      phone: phone || null,
      risk_appetite: riskAppetite,
      onboarding_done: true,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="skeleton h-8 w-32" />
          <div className="card p-6 space-y-4">
            <div className="skeleton h-12 w-12 rounded-full" />
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Profile
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
            Manage your account and preferences
          </p>
        </div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 flex items-center gap-4"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
          >
            {fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              {fullName || 'Your Name'}
            </p>
            <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>{email}</p>
          </div>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-5"
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--foreground))' }}>
            Personal Details
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none"
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

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm cursor-not-allowed"
                  style={{
                    backgroundColor: 'rgb(var(--surface-raised))',
                    border: '1px solid rgb(var(--border))',
                    color: 'rgb(var(--muted))',
                  }}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                Phone (optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none"
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

            {/* Risk Appetite */}
            <div className="space-y-2">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'rgb(var(--foreground))' }}>
                <Shield className="w-3.5 h-3.5" style={{ color: 'rgb(var(--brand-500))' }} />
                Risk Appetite
              </label>
              <div className="grid grid-cols-3 gap-2">
                {RISK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRiskAppetite(opt.value)}
                    className="p-2.5 rounded-lg text-left transition-all"
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
                    <p className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
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
              id="btn-save-profile"
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : saved ? (
                '✓ Saved!'
              ) : (
                <><Save className="w-4 h-4" /> Save changes</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Sign out */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <button
            id="btn-profile-signout"
            onClick={handleSignOut}
            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border))',
              color: 'rgb(var(--loss))',
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </motion.div>

        {/* Privacy note */}
        <p className="text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>
          Finova never stores passwords, MPIN, TPIN, or broker OTPs.
          Your financial data is secured with Row Level Security.
        </p>
      </div>
    </div>
  );
}
