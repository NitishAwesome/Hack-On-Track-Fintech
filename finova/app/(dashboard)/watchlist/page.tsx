import { WatchlistContent } from '@/components/explorer/WatchlistContent';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Watchlist' };

export default function WatchlistPage() {
  return (
    <WatchlistContent />
  );
}
