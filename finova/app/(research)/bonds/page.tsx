import type { Metadata } from 'next';
import { BondsDiscoveryView } from '@/components/alternatives/BondsDiscoveryView';

export const metadata: Metadata = {
  title: 'Bonds & Fixed Income Screener — FINOVA',
  description:
    'Screener for Indian Sovereign G-Secs, PSU Bonds, and Corporate NCDs. Understand contractual coupon vs YTM, credit rating opinions, and duration risks.',
};

export default function BondsPage() {
  return (
    <div className="page-container space-y-6">
      <BondsDiscoveryView />
    </div>
  );
}
