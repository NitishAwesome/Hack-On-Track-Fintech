import type { Metadata } from 'next';
import { AlternativeInvestmentExplorer } from '@/components/explorer/AlternativeInvestmentExplorer';

export const metadata: Metadata = {
  title: 'InvITs Explorer — FINOVA',
  description:
    'Learn how Infrastructure Investment Trusts work in India, highway and grid concession lifespans, cash flow models, and risks.',
};

export default function InvITsPage() {
  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          InvITs — Infrastructure Investment Trusts
        </h1>
        <p className="text-sm text-muted mt-1">
          Explore fractional ownership of national highways, power grids, and transmission lines with cash distribution models.
        </p>
      </div>

      <AlternativeInvestmentExplorer initialCategory="invit" />
    </div>
  );
}
