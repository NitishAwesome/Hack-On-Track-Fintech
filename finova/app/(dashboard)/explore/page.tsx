import { ComingSoon } from '@/components/shared/ComingSoon';
import { Compass } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Explore' };

export default function ExplorePage() {
  return (
    <ComingSoon
      title="Explore"
      description="Discover new investment opportunities across equities, ETFs, and alternative assets tailored for Indian retail investors."
      icon={<Compass className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
