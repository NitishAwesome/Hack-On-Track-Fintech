import type { Metadata } from 'next';
import HoldingsPage from '../holdings/page';

export const metadata: Metadata = { title: 'My Investments' };

export default function InvestmentsPage() {
  return <HoldingsPage />;
}
