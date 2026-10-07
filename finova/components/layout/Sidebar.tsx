'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  LineChart,
  PieChart,
  Shield,
  BookOpen,
  Lightbulb,
  Building2,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/portfolio', label: 'Portfolio', icon: LayoutDashboard },
  { href: '/holdings', label: 'Holdings', icon: LineChart },
  { href: '/performance', label: 'Performance', icon: LineChart },
  { href: '/allocation', label: 'Allocation', icon: PieChart },
  { href: '/risk', label: 'Risk', icon: Shield },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/brokers', label: 'Brokers', icon: Building2 },
  { href: '/profile', label: 'Profile', icon: User },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="h-full flex flex-col" style={{ backgroundColor: 'rgb(var(--surface))' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
        <Link href="/portfolio" className="flex items-center gap-2.5" onClick={onClose}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
          >
            F
          </div>
          <span className="text-lg font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Finova
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md lg:hidden" style={{ color: 'rgb(var(--muted))' }}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/portfolio' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group'
              )}
              style={{
                color: active ? 'rgb(var(--brand-500))' : 'rgb(var(--muted))',
                backgroundColor: active ? 'rgb(var(--brand-500) / 0.1)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--surface-raised))';
                  (e.currentTarget as HTMLElement).style.color = 'rgb(var(--foreground))';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'rgb(var(--muted))';
                }
              }}
            >
              {active && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: 'rgb(var(--brand-500) / 0.1)' }}
                  transition={{ type: 'spring', duration: 0.3 }}
                />
              )}
              <Icon className="w-4 h-4 flex-shrink-0 relative z-10" />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t text-xs" style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }}>
        <p>Finova © 2025</p>
        <p className="mt-0.5">For informational use only.</p>
        <p>Not financial advice.</p>
      </div>
    </aside>
  );
}
