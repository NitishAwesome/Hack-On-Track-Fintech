import type { Metadata } from 'next';
import { AlternativeInvestmentExplorer } from '@/components/explorer/AlternativeInvestmentExplorer';

export const metadata: Metadata = {
  title: 'REITs Explorer — FINOVA',
  description:
    'Learn how Real Estate Investment Trusts work in India, commercial lease models, mandatory distributions, and interest-rate risks.',
};

export default function REITsPage() {
  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          REITs — Real Estate Investment Trusts
        </h1>
        <p className="text-sm text-muted mt-1">
          Co-own Grade-A commercial real estate and understand distribution yields, tenancy leases, and property risks.
        </p>
      </div>

      <AlternativeInvestmentExplorer initialCategory="reit" />
    </div>
  );
}
