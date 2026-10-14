import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Broker Accounts' };
export default function BrokerLayout({ children }: { children: ReactNode }) { return children; }
