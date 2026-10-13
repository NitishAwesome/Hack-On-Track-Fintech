import type { Metadata } from 'next';
import { InvitDiscoveryView } from '@/components/alternatives/InvitDiscoveryView';

export const metadata: Metadata = {
  title: 'InvITs Discovery & Analysis — FINOVA',
  description:
    'Explore listed Indian Infrastructure Investment Trusts, power grid networks, toll expressways, concession lifespans, and high distribution yields.',
};

export default function InvITsPage() {
  return (
    <div className="page-container space-y-6">
      <InvitDiscoveryView />
    </div>
  );
}
