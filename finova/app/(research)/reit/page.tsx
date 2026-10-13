import type { Metadata } from 'next';
import { ReitDiscoveryView } from '@/components/alternatives/ReitDiscoveryView';

export const metadata: Metadata = {
  title: 'REITs Discovery & Analysis — FINOVA',
  description:
    'Explore listed Indian Real Estate Investment Trusts, verified quarterly cash distributions, occupancy rates, lease durations (WALE), and commercial property risks.',
};

export default function REITsPage() {
  return (
    <div className="page-container space-y-6">
      <ReitDiscoveryView />
    </div>
  );
}
