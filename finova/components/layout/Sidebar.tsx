'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  Newspaper,
  Compass,
  Bookmark,
  ClipboardList,
  Rocket,
  Layers,
  Link2,
  Building2,
  Zap,
  User,
  Settings,
  X,
  TrendingUp,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/investments', label: 'My Investments', icon: TrendingUp },
      { href: '/analysis', label: 'Portfolio Analysis', icon: BarChart3 },
      { href: '/news', label: 'News & Insights', icon: Newspaper },
      { href: '/explore', label: 'Explore', icon: Compass, comingSoon: true },
    ],
  },
  {
    title: 'Personal',
    items: [
      { href: '/watchlist', label: 'Watchlist', icon: Bookmark, comingSoon: true },
      { href: '/orders', label: 'Orders', icon: ClipboardList, comingSoon: true },
    ],
  },
  {
    title: 'Discover',
    items: [
      { href: '/ipo', label: 'IPO', icon: Rocket, comingSoon: true },
      { href: '/mutual-funds', label: 'Mutual Funds', icon: Layers, comingSoon: true },
      { href: '/bonds', label: 'Bonds', icon: Link2, comingSoon: true },
      { href: '/reit', label: 'REITs', icon: Building2, comingSoon: true },
      { href: '/invit', label: 'InvITs', icon: Zap, comingSoon: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/profile', label: 'Profile', icon: User },
      { href: '/settings', label: 'Settings', icon: Settings, comingSoon: true },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
  userEmail?: string;
  userName?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  onClose,
  userEmail = 'investor@finova.in',
  userName = 'Retail Investor',
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/portfolio' || pathname === '/';
    if (href === '/investments') return pathname === '/investments' || pathname === '/holdings';
    if (href === '/analysis') return ['/analysis', '/performance', '/allocation', '/risk'].some((p) => pathname.startsWith(p));
    if (href === '/news') return pathname === '/news' || pathname === '/insights';
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  }

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FI';

  return (
    <aside
      className={cn(
        'h-full flex flex-col flex-shrink-0 select-none transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      {/* Top Brand Logo Area */}
      <div
        className={cn(
          'flex items-center border-b flex-shrink-0 h-14 transition-all',
          collapsed ? 'justify-center px-2' : 'justify-between px-5'
        )}
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <Link href="/dashboard" onClick={onClose} className="group flex items-center">
          <FinovaLogo size={collapsed ? 28 : 'sm'} variant={collapsed ? 'symbol' : 'horizontal'} />
        </Link>
        {!collapsed && onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg lg:hidden transition-colors"
            style={{ color: 'rgb(var(--muted))' }}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p
                className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'rgb(var(--muted))' }}
              >
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, comingSoon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={comingSoon ? '#' : href}
                    onClick={comingSoon ? (e) => e.preventDefault() : onClose}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'relative flex items-center rounded-lg text-xs font-medium transition-all duration-150 group',
                      collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
                      comingSoon && 'cursor-default opacity-60'
                    )}
                    style={{
                      color: active ? 'rgb(var(--brand-500))' : 'rgb(var(--muted))',
                      backgroundColor: active ? 'rgb(var(--brand-500) / 0.12)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active && !comingSoon) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--surface-raised))';
                        (e.currentTarget as HTMLElement).style.color = 'rgb(var(--foreground))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active && !comingSoon) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'rgb(var(--muted))';
                      }
                    }}
                  >
                    {active && (
                      <motion.div
                        layoutId="active-sidebar-pill"
                        className="absolute inset-0 rounded-lg"
                        style={{ backgroundColor: 'rgb(var(--brand-500) / 0.12)' }}
                        transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
                      />
                    )}
                    <Icon className="w-4 h-4 flex-shrink-0 relative z-10" />
                    {!collapsed && (
                      <>
                        <span className="relative z-10 flex-1 truncate font-medium">{label}</span>
                        {comingSoon && (
                          <span
                            className="relative z-10 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'rgb(var(--surface-raised))',
                              color: 'rgb(var(--muted))',
                              border: '1px solid rgb(var(--border))',
                            }}
                          >
                            Soon
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section: Support & User Account */}
      <div
        className={cn(
          'border-t flex-shrink-0 space-y-2 transition-all',
          collapsed ? 'p-2 flex flex-col items-center' : 'px-3 py-3'
        )}
        style={{
          borderColor: 'rgb(var(--border))',
          backgroundColor: 'rgb(var(--surface-raised) / 0.5)',
        }}
      >
        {/* Support Link */}
        {!collapsed ? (
          <Link
            href="/learn"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:text-foreground"
            style={{ color: 'rgb(var(--muted))' }}
          >
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Help & Alternative Guides</span>
          </Link>
        ) : (
          <Link
            href="/learn"
            onClick={onClose}
            className="p-2 rounded-lg text-xs font-medium transition-colors hover:text-foreground text-muted"
            title="Help & Guides"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>
        )}

        {/* User Card */}
        {collapsed ? (
          <Link
            href="/profile"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
            }}
            title={userName}
          >
            {initials}
          </Link>
        ) : (
          <div
            className="flex items-center justify-between p-2 rounded-xl border transition-colors"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
                }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-semibold truncate leading-none"
                  style={{ color: 'rgb(var(--foreground))' }}
                >
                  {userName}
                </p>
                <p
                  className="text-[10px] truncate mt-1"
                  style={{ color: 'rgb(var(--muted))' }}
                >
                  {userEmail}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 rounded-md hover:bg-surface-raised transition-colors text-muted hover:text-loss"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Collapse Toggle for Desktop */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'hidden lg:flex items-center justify-center rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface transition-colors',
              collapsed ? 'w-full' : 'w-full gap-2 text-xs'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
