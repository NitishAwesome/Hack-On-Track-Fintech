import { ComingSoon } from '@/components/shared/ComingSoon';
import { Building2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'REITs' };

export default function ReitDiscoverPage() {
  return (
    <ComingSoon
      title="REITs Marketplace"
      description="Invest in listed Real Estate Investment Trusts. Compare portfolios, DPU, and yield histories."
      icon={<Building2 className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
