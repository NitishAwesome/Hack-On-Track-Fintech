import type { Metadata } from 'next';
import { AlternativeInvestmentExplorer } from '@/components/explorer/AlternativeInvestmentExplorer';

export const metadata: Metadata = {
  title: 'Bonds & Fixed Income Explorer — FINOVA',
  description:
    'Learn how bonds, G-Secs, and debentures work in India, coupon versus yield, credit rating risks, and duration sensitivity.',
};

export default function BondsPage() {
  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bonds & Fixed Income Securities
        </h1>
        <p className="text-sm text-muted mt-1">
          Explore Government Securities, SDLs, and Corporate NCDs. Understand coupon vs yield, maturity, and duration risks.
        </p>
      </div>

      <AlternativeInvestmentExplorer initialCategory="bond" />
    </div>
  );
}
