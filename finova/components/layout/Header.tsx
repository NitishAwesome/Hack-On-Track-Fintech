'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Search,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { MarketStatus } from '@/components/dashboard/MarketStatus';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  userEmail?: string;
  userName?: string;
  userAvatar?: string | null;
  onOpenMobileSidebar?: () => void;
}

export function Header({
  title = 'Dashboard',
  breadcrumbs,
  userEmail = 'investor@finova.in',
  userName = 'Investor',
  userAvatar,
  onOpenMobileSidebar,
}: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FI';

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-4 px-5 sm:px-8 h-14 border-b select-none transition-colors"
        style={{
          backgroundColor: 'rgb(var(--surface) / 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'rgb(var(--border))',
        }}
      >
        {/* Left: Mobile hamburger & breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-1.5 rounded-lg border transition-colors"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
                color: 'rgb(var(--muted))',
              }}
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Finova brand link */}
          <Link
            href="/dashboard"
            className="lg:hidden flex items-center gap-1.5 flex-shrink-0"
            title="FINOVA"
          >
            <FinovaLogo variant="symbol" size={24} />
          </Link>

          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2 text-xs font-medium truncate">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.label}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-muted opacity-50" />}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="hover:underline truncate"
                      style={{ color: i === breadcrumbs.length - 1 ? 'rgb(var(--foreground))' : 'rgb(var(--muted))' }}
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span
                      className="truncate font-semibold"
                      style={{ color: 'rgb(var(--foreground))' }}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))
            ) : (
              <span className="font-semibold text-sm truncate" style={{ color: 'rgb(var(--foreground))' }}>
                {title}
              </span>
            )}
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Search */}
          <div className="hidden md:flex items-center w-56 lg:w-72">
            <div
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs border transition-colors focus-within:border-brand"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--muted))' }} />
              <input
                type="text"
                placeholder="Search holdings, symbols..."
                className="bg-transparent flex-1 focus:outline-none placeholder:text-muted/60"
                style={{ color: 'rgb(var(--foreground))' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span
                className="hidden lg:inline-block text-[10px] font-mono px-1 rounded border opacity-60"
                style={{
                  backgroundColor: 'rgb(var(--surface))',
                  borderColor: 'rgb(var(--border))',
                  color: 'rgb(var(--muted))',
                }}
              >
                /
              </span>
            </div>
          </div>

          {/* Market Status Pill */}
          <div className="hidden sm:block">
            <MarketStatus
              isOpen={true}
              statusText="Markets Open"
              indexSummary="Nifty 24,180"
              change="+0.59%"
              trend="up"
            />
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-1.5 rounded-lg border transition-colors"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--muted))',
            }}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications Button */}
          <button
            className="relative p-1.5 rounded-lg border transition-colors hover:text-foreground"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--muted))',
            }}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'rgb(var(--brand-500))' }}
            />
          </button>

          {/* Profile Avatar */}
          <div className="flex items-center gap-2 pl-1 border-l" style={{ borderColor: 'rgb(var(--border))' }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
              }}
              onClick={() => router.push('/profile')}
              title={`Logged in as ${userEmail}`}
            >
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
              ) : (
                initials
              )}
            </div>

            <button
              onClick={handleSignOut}
              className="hidden lg:flex p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgb(var(--muted))' }}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="mobile-search-overlay"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="fixed top-0 left-0 right-0 z-50 p-3 border-b flex items-center gap-2"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--muted))' }} />
            <input
              type="text"
              placeholder="Search holdings, symbols..."
              autoFocus
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'rgb(var(--foreground))' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1 rounded text-muted hover:text-foreground"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
