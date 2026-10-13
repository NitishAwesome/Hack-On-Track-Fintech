import type { Metadata } from 'next';
import { AlternativeInvestmentsHub } from '@/components/alternatives/AlternativeInvestmentsHub';

export const metadata: Metadata = {
  title: 'Alternative Investments Hub — FINOVA',
  description:
    'Discover why investors look beyond equities. Compare REITs, InvITs, and Bonds across cash flow certainty, credit risk, market volatility, and liquidity.',
};

export default function AlternativeInvestmentsPage() {
  return (
    <div className="page-container space-y-6">
      <AlternativeInvestmentsHub />
    </div>
  );
}
