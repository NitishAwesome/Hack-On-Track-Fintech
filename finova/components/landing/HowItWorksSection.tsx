'use client';

import React from 'react';
import { Layers, BarChart3, Compass } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Bring your investments together',
      subtitle: 'View investments across multiple accounts in one place.',
      icon: Layers,
    },
    {
      step: '02',
      title: 'Understand your portfolio',
      subtitle: 'Analyze allocation, concentration, returns and risk.',
      icon: BarChart3,
    },
    {
      step: '03',
      title: 'Explore intelligently',
      subtitle: 'Learn about Stocks, REITs, InvITs, Bonds and other investment options.',
      icon: Compass,
    },
  ];

  return (
    <section className="py-20 sm:py-24 border-b border-border bg-surface-raised/30 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Architecture</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            How Finova Works
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            A structured three-phase pathway to complete financial clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-14">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="p-6 sm:p-7 rounded-2xl border border-border bg-surface relative space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand/10 text-brand">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-black text-muted/30 font-mono">
                    {s.step}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h3 className="text-base font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {s.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
