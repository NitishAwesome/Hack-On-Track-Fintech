import { ComingSoon } from '@/components/shared/ComingSoon';
import { Layers } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mutual Funds' };

export default function MutualFundsPage() {
  return (
    <ComingSoon
      title="Mutual Funds"
      description="Browse and invest in direct mutual funds with SEBI-compliant expense ratios and risk ratings."
      icon={<Layers className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
