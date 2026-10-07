import { redirect } from 'next/navigation';

// /investments → redirect to existing /holdings implementation
export default function InvestmentsPage() {
  redirect('/holdings');
}
