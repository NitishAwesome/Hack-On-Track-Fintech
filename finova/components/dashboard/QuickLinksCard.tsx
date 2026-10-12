'use client';

import React from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  Building2,
  Receipt,
  BarChart3,
  FlaskConical,
  Compass,
  ChevronRight,
  Zap,
} from 'lucide-react';

export function QuickLinksCard() {
  const links = [
    {
      title: 'Add Investment',
      subtitle: 'Record stock, REIT or bond',
      href: '/holdings',
      icon: PlusCircle,
      iconColor: 'text-brand',
      iconBg: 'bg-brand/10 border-brand/20',
      hoverBorder: 'hover:border-brand/40',
    },
    {
      title: 'Add Broker',
      subtitle: 'Connect Zerodha, Groww',
      href: '/brokers',
      icon: Building2,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      hoverBorder: 'hover:border-sky-500/40',
    },
    {
      title: 'Record Transaction',
      subtitle: 'Buy, sell or dividend cashflow',
      href: '/transactions',
      icon: Receipt,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      hoverBorder: 'hover:border-emerald-500/40',
    },
    {
      title: 'Investment X-Ray',
      subtitle: 'Multi-broker portfolio breakdown',
      href: '/analysis',
      icon: BarChart3,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/40',
    },
    {
      title: 'Future Lab',
      subtitle: 'Scenario & stress modeling',
      href: '/future-lab',
      icon: FlaskConical,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      hoverBorder: 'hover:border-amber-500/40',
    },
    {
      title: 'Investment Explorer',
      subtitle: 'Discover verified assets & sectors',
      href: '/explore',
      icon: Compass,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
      hoverBorder: 'hover:border-purple-500/40',
    },
  ];

  return (
    <div
      className="h-full p-5 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface shadow-xs"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-3.5">
          <Zap className="w-4 h-4 text-brand" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Quick Actions
          </h2>
        </div>

        {/* 2 or 3 Column Grid of Compact Action Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.title}
                href={link.href}
                className={`p-2.5 rounded-xl border border-border/70 ${link.hoverBorder} bg-surface-raised/40 hover:bg-surface-raised transition-all flex items-center justify-between group shadow-xs hover-card`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg border ${link.iconBg} ${link.iconColor} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground group-hover:text-brand transition-colors truncate">
                      {link.title}
                    </p>
                    <p className="text-[10px] text-muted truncate mt-0.5">
                      {link.subtitle}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
