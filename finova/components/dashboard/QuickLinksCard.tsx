'use client';
import Link from 'next/link';
import {
  BarChart3,
  Shield,
  FlaskConical,
  Compass,
  Target,
  Bookmark,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { PageSection, type PageAccent } from '@/components/shared/PageSection';
const LINKS = [
  {
    title: 'Investment X-Ray',
    description: 'Understand allocation and concentration',
    href: '/analysis',
    icon: BarChart3,
    tone: 'blue',
  },
  {
    title: 'Risk Radar',
    description: 'Review portfolio observations and evidence',
    href: '/risk',
    icon: Shield,
    tone: 'violet',
  },
  {
    title: 'Future Lab',
    description: 'Explore hypothetical allocation strategies',
    href: '/future-lab',
    icon: FlaskConical,
    tone: 'amber',
  },
  {
    title: 'Investment Explorer',
    description: 'Discover companies, sectors and research',
    href: '/explore',
    icon: Compass,
    tone: 'teal',
  },
  {
    title: 'Financial Goals',
    description: 'Plan funding and a monthly savings pace',
    href: '/goals',
    icon: Target,
    tone: 'violet',
  },
  {
    title: 'Watchlist',
    description: 'Return to the companies you follow',
    href: '/watchlist',
    icon: Bookmark,
    tone: 'blue',
  },
] as const;
export function QuickLinksCard() {
  return (
    <PageSection
      title="Quick links"
      description="Keep exploring with the right tool for your next question."
      icon={Zap}
      accent="cyan"
      className="h-full"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {LINKS.map(({ title, description, href, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            data-tone={tone as PageAccent}
            className="finova-tile flex items-center gap-3 p-4 group"
          >
            <span className="finova-accent-icon shrink-0">
              <Icon size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground group-hover:text-brand">{title}</p>
              <p className="text-[11px] text-muted mt-1 leading-relaxed">{description}</p>
            </div>
            <ChevronRight
              size={16}
              className="text-muted shrink-0 group-hover:text-brand transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </PageSection>
  );
}
