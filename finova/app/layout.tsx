import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastContainer } from '@/components/shared/Toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'FINOVA — Your Investments. Unified. Understood.',
    template: '%s | FINOVA',
  },
  description:
    'FINOVA unifies all your investments across brokers and depositories in one place. Your Investments. Unified. Understood.',
  keywords: ['FINOVA', 'investments', 'portfolio', 'stocks', 'REITs', 'InvITs', 'bonds', 'fintech', 'India'],
  authors: [{ name: 'FINOVA' }],
  openGraph: {
    type: 'website',
    title: 'FINOVA — Your Investments. Unified. Understood.',
    description: 'Unified portfolio tracking and asset intelligence. Your Investments. Unified. Understood.',
    siteName: 'FINOVA',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
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
            <ToastContainer />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
