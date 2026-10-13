import { IpoDiscoverySection } from '@/components/explorer/IpoDiscoverySection';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'IPO' };

export default function IpoPage() {
  return (
    <div className="page-container"><IpoDiscoverySection /></div>
  );
}
