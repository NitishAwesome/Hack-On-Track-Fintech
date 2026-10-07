import { ComingSoon } from '@/components/shared/ComingSoon';
import { Settings } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Configure your notification preferences, data export, privacy settings, and connected accounts."
      icon={<Settings className="w-7 h-7" />}
      eta="Coming in Phase 2"
    />
  );
}
