import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Finova — Your Investments, Unified',
    template: '%s | Finova',
  },
  description:
    'Finova unifies all your investments across brokers and depositories in one place. Track stocks, REITs, InvITs and bonds with AI-powered insights.',
  keywords: ['investments', 'portfolio', 'stocks', 'REITs', 'InvITs', 'bonds', 'fintech', 'India'],
  authors: [{ name: 'Finova' }],
  openGraph: {
    type: 'website',
    title: 'Finova — Your Investments, Unified',
    description: 'Unified portfolio tracking with AI-powered insights for Indian retail investors.',
    siteName: 'Finova',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <ThemeProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
