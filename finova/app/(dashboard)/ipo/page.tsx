import { ComingSoon } from '@/components/shared/ComingSoon';
import { Rocket } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'IPO' };

export default function IpoPage() {
  return (
    <ComingSoon
      title="IPO Centre"
      description="Apply for upcoming IPOs directly through Finova. Track GMP, subscription status, and allotment details."
      icon={<Rocket className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
