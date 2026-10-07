import { ComingSoon } from '@/components/shared/ComingSoon';
import { Bookmark } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Watchlist' };

export default function WatchlistPage() {
  return (
    <ComingSoon
      title="Watchlist"
      description="Track stocks, REITs, and InvITs you&apos;re interested in before adding them to your portfolio."
      icon={<Bookmark className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
