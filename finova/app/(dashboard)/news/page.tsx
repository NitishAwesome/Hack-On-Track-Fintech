import { redirect } from 'next/navigation';

// /news → redirect to existing /insights page
export default function NewsPage() {
  redirect('/insights');
}
