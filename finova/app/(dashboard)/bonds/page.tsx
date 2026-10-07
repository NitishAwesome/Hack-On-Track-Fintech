import { ComingSoon } from '@/components/shared/ComingSoon';
import { Link2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Bonds' };

export default function BondsDiscoverPage() {
  return (
    <ComingSoon
      title="Bonds Marketplace"
      description="Explore corporate bonds, G-Secs, and SDLs. Compare yields, ratings, and maturity profiles."
      icon={<Link2 className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
