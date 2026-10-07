import { ComingSoon } from '@/components/shared/ComingSoon';
import { Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'InvITs' };

export default function InvitDiscoverPage() {
  return (
    <ComingSoon
      title="InvITs Marketplace"
      description="Invest in Infrastructure Investment Trusts. Access roads, power grids, and pipeline assets."
      icon={<Zap className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
