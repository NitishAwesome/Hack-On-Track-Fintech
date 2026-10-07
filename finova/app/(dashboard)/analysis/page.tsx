import { redirect } from 'next/navigation';

// /analysis → redirect to existing /performance page
export default function AnalysisPage() {
  redirect('/performance');
}
