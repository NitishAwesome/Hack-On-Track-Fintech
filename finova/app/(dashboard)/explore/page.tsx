import type { Metadata } from 'next';
import { AlternativeInvestmentExplorer } from '@/components/explorer/AlternativeInvestmentExplorer';

export const metadata: Metadata = {
  title: 'Alternative Investment Explorer — FINOVA',
  description:
    'Educational exploration of REITs, InvITs, and Bonds for Indian retail investors with live portfolio exposure connection.',
};

export default function ExplorePage() {
  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Alternative Investment Explorer
        </h1>
        <p className="text-sm text-muted mt-1">
          Understand REITs, InvITs, and Bonds: their asset structures, distribution mechanisms, and risk realities.
        </p>
      </div>

      <AlternativeInvestmentExplorer initialCategory="reit" />
    </div>
  );
}
