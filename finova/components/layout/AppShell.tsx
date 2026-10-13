'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MarketStrip } from '@/components/shared/MarketStrip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { PAGE_TITLES } from '@/lib/navigation';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userAvatar?: string | null;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  title?: string;
  className?: string;
}

export function AppShell({
  children,
  userEmail = 'investor@finova.in',
  userName = 'Retail Investor',
  userAvatar,
  breadcrumbs,
  title,
  className,
}: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const pageTitle = title ?? PAGE_TITLES[pathname.split('/')[1]] ?? 'FINOVA';

  return (
    <div
      className="min-h-screen flex antialiased"
      style={{
        backgroundColor: 'rgb(var(--background))',
        color: 'rgb(var(--foreground))',
      }}
    >
      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col flex-shrink-0 border-r sticky top-0 h-screen z-20 transition-all duration-300',
          sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
        )}
        style={{
          borderColor: 'rgb(var(--border))',
          backgroundColor: 'rgb(var(--surface))',
        }}
      >
        <Sidebar
          userEmail={userEmail}
          userName={userName}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-[240px] shadow-2xl lg:hidden"
              style={{ backgroundColor: 'rgb(var(--surface))' }}
            >
              <Sidebar
                onClose={() => setMobileSidebarOpen(false)}
                userEmail={userEmail}
                userName={userName}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={pageTitle}
          breadcrumbs={breadcrumbs}
          userEmail={userEmail}
          userName={userName}
          userAvatar={userAvatar}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Global Compact Market Strip */}
        <MarketStrip />

        <main className={cn('flex-1 w-full', className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
