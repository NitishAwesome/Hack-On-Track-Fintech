'use client';

import React from 'react';
import { Activity, ShieldAlert, Sparkles, PieChart, Layers, Gauge } from 'lucide-react';

export function PortfolioIntelligenceSection() {
  const metrics = [
    {
      title: 'Portfolio Health',
      value: '72 / 100',
      badge: 'Well Balanced',
      desc: 'Overall benchmark incorporating asset class spread, debt liquidity, and low single-stock drag.',
      icon: Activity,
      color: 'text-brand',
    },
    {
      title: 'Diversification Score',
      value: '68 / 100',
      badge: 'Multi-Asset',
      desc: 'Healthy allocation across 4 distinct asset classes with low correlation.',
      icon: Layers,
      color: 'text-teal-500',
    },
    {
      title: 'Portfolio Risk',
      value: 'Moderate',
      badge: 'Beta ~0.94',
      desc: 'Balanced risk profile stabilized by fixed-income SGB bonds and infrastructure trust yield.',
      icon: Gauge,
      color: 'text-amber-500',
    },
    {
      title: 'Largest Exposure',
      value: 'Banking — 34%',
      badge: 'Concentration Alert',
      desc: 'Identifies overlapping underlying financials across direct equities and flexi-cap funds.',
      icon: ShieldAlert,
      color: 'text-sky-500',
    },
    {
      title: 'Concentration Level',
      value: 'Moderate',
      badge: 'Top 5 = 42%',
      desc: 'Top 5 individual positions represent 42% of total capital value.',
      icon: PieChart,
      color: 'text-indigo-500',
    },
  ];

  return (
    <section id="insights" className="py-20 sm:py-24 border-b border-border select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Illustrative Analysis</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Understand more than your portfolio value.
          </h2>

          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Finova translates raw holdings into actionable portfolio diagnostics, highlighting hidden concentration risks and asset diversification gaps.
          </p>
        </div>

        {/* 5 Intelligence Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="p-6 rounded-2xl border border-border bg-surface transition-all duration-200 hover:border-brand/40 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-raised border border-border">
                    <Icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-raised border border-border text-muted">
                    {m.badge}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {m.title}
                  </p>
                  <p className="text-2xl font-black text-foreground mt-1 tabular-nums">
                    {m.value}
                  </p>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    {m.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted">
                  <span>Diagnostic Indicator</span>
                  <span className="font-semibold text-foreground">Sample Analysis</span>
                </div>
              </div>
            );
          })}

          {/* 6th Card: Explanatory summary card */}
          <div
            className="p-6 rounded-2xl border flex flex-col justify-between space-y-4"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                Portfolio Intelligence Core
              </p>
              <h3 className="text-lg font-bold text-foreground mt-1">
                Clarity Over Chaos
              </h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Rather than calculating standard totals, Finova parses underlying instruments to reveal true sector weighting, debt maturity profiles, and risk tolerances.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-brand/20 bg-brand/5 text-[11px] text-muted">
              <span className="font-semibold text-foreground">Note:</span> The metrics above depict sample analytical output for demonstrative purposes.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PortfolioIntelligenceSection;
