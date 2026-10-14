'use client';
import Link from 'next/link';
import { Compass, Layers, Coins, Building2, ArrowUpRight, Zap, Landmark } from 'lucide-react';
import { PageSection } from '@/components/shared/PageSection';
const PATHS = [
  {
    title: 'Explore companies & sectors',
    description: 'Understand a business, inspect its price history and compare two companies.',
    icon: Layers,
    tone: 'blue',
    main: '/explore?tab=browse',
    mainText: 'Browse companies',
    extra: '/explore?tab=sectors',
    extraText: 'Explore sectors',
  },
  {
    title: 'Follow gold & silver',
    description:
      'Keep Indian ETF units separate from international futures benchmarks and their units.',
    icon: Coins,
    tone: 'amber',
    main: '/explore?tab=commodities',
    mainText: 'Research metals',
    extra: '/explore/stocks/GOLDBEES',
    extraText: 'Gold BeES research',
  },
  {
    title: 'Understand alternative assets',
    description: 'Research the structure, distributions and risks of REITs, InvITs and bonds.',
    icon: Building2,
    tone: 'teal',
    main: '/explore/alternatives',
    mainText: 'Explore alternatives',
    extra: '/learn',
    extraText: 'Build your understanding',
  },
] as const;
const ALTERNATIVES = [
  {
    name: 'REITs',
    tone: 'amber',
    href: '/reit',
    icon: Building2,
    detail:
      'Real estate investment trusts give exposure to a portfolio of income-producing properties. Review the issuer, occupancy, debt and actual distribution disclosures.',
  },
  {
    name: 'InvITs',
    tone: 'teal',
    href: '/invit',
    icon: Zap,
    detail:
      'Infrastructure investment trusts hold infrastructure assets. Review their underlying projects, financing, operating risks and reported distributions.',
  },
  {
    name: 'Bonds',
    tone: 'blue',
    href: '/bonds',
    icon: Landmark,
    detail:
      'Debt securities have issuer-specific terms. Review coupon structure, maturity, credit risk, interest-rate sensitivity and liquidity.',
  },
] as const;
export function ExploreOpportunitiesSection() {
  return (
    <PageSection
      title="Continue your research"
      eyebrow="DISCOVER · UNDERSTAND · COMPARE"
      description="Choose a useful research path. These are educational entry points, not investment recommendations."
      icon={Compass}
      accent="amber"
      action={
        <Link href="/explore" className="finova-link">
          Open Explorer
          <ArrowUpRight size={14} />
        </Link>
      }
    >
      <div className="grid md:grid-cols-3 gap-4">
        {PATHS.map(({ title, description, icon: Icon, tone, main, mainText, extra, extraText }) => (
          <article key={main} data-tone={tone} className="finova-tile p-5 flex flex-col">
            <span className="finova-accent-icon mb-4">
              <Icon size={22} />
            </span>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted leading-relaxed mt-2 flex-1">{description}</p>
            <div className="border-t border-border mt-5 pt-3 flex flex-col">
              <Link href={main} className="finova-link">
                {mainText}
                <ArrowUpRight size={14} />
              </Link>
              <Link
                href={extra}
                className="text-[11px] text-muted hover:text-foreground py-2 min-h-9"
              >
                {extraText} →
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 pt-5 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Beyond stocks, at a glance</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {ALTERNATIVES.map(({ name, tone, href, detail, icon: Icon }) => (
            <article key={name} data-tone={tone} className="finova-tile p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="finova-accent-icon shrink-0">
                  <Icon size={20} />
                </span>
                <h4 className="text-sm font-bold text-foreground">{name}</h4>
              </div>
              <p className="text-xs text-muted leading-relaxed flex-1">{detail}</p>
              <Link href={href} className="finova-link mt-4">
                Research {name}
                <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </PageSection>
  );
}
