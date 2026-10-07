import { FinovaDashboard } from '@/components/dashboard/FinovaDashboard';

export const metadata = {
  title: 'Dashboard — Finova Unified Wealth',
  description: 'Unified multi-asset portfolio overview, asset allocation, and AI insights.',
};

export default function DashboardPage() {
  return <FinovaDashboard />;
}
