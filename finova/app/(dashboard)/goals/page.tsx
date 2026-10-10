import { redirect } from 'next/navigation';

export default function GoalsPage() {
  redirect('/future-lab?tab=goals');
}
