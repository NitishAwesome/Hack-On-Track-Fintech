import { redirect } from 'next/navigation';
import { FutureLabWorkspace } from '@/components/futureLab/FutureLabWorkspace';

export const metadata = { title: 'Future Lab' };

export default async function FutureLabPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const params = await searchParams;
  if (params.tab === 'goals') redirect('/goals');
  return <FutureLabWorkspace tab="simulator" />;
}
