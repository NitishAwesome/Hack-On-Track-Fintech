'use client';

import React from 'react';
import { Lock, Server, Key, EyeOff } from 'lucide-react';

export function SecuritySection() {
  const principles = [
    {
      icon: Lock,
      title: 'Secure Authentication',
      desc: 'Passwordless email verification and standard protocol safeguards ensure only you can access your personal portfolio data.',
    },
    {
      icon: EyeOff,
      title: 'Zero Broker Credentials Stored',
      desc: 'Finova never requests or stores broker trading passwords, MPINs, or withdrawal TPINs. Aggregation is built upon statement imports and read-only exports.',
    },
    {
      icon: Server,
      title: 'Server-Side API Handling',
      desc: 'Market integrations and analytics computation execute exclusively server-side, protecting sensitive tokens and client endpoints.',
    },
    {
      icon: Key,
      title: 'User-Specific Data Access',
      desc: 'Strict multi-tenant row-level access boundaries ensure your holdings remain isolated to your authenticated account.',
    },
  ];

  return (
    <section className="py-20 sm:py-24 border-b border-border select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Architecture & Trust</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Built with privacy and security in mind.
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Finova is designed with strict data isolation, zero credential retention, and server-side verification at every boundary.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
          {principles.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-6 rounded-2xl border border-border bg-surface transition-all duration-200 hover:border-brand/40 shadow-xs space-y-3"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand/10 text-brand">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-foreground">{item.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default SecuritySection;
