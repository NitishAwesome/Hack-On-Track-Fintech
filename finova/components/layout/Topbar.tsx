'use client';

import { Header } from './Header';

export interface TopbarProps {
  userEmail?: string;
  userAvatar?: string | null;
  userName?: string;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  onOpenMobileSidebar?: () => void;
}

export function Topbar(props: TopbarProps) {
  return <Header {...props} />;
}

export { Header };
