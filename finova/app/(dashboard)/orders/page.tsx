import { ComingSoon } from '@/components/shared/ComingSoon';
import { ClipboardList } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Orders' };

export default function OrdersPage() {
  return (
    <ComingSoon
      title="Orders"
      description="View and manage your investment orders across all connected broker accounts."
      icon={<ClipboardList className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
