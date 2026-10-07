import { FinovaDashboard } from '@/components/dashboard/FinovaDashboard';

export const metadata = {
  title: 'Portfolio — Finova | Your Investments. Unified. Understood.',
  description: 'Unified multi-asset portfolio overview, asset allocation, and AI insights.',
};

export default function PortfolioPage() {
  return <FinovaDashboard />;
}
