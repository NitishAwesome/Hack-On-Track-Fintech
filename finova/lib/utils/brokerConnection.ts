// ============================================================
// FINOVA — Broker Connection & Status Presentation Utilities
// Centralizes connection status, tracking methods, and disclosures
// Ensures complete honesty regarding supported integrations
// ============================================================

import type { BrokerConnectionStatus, DataSource, AccountType } from '@/types/database';

export interface BrokerInfo {
  code: string;
  name: string;
  shortName: string;
  brandColor: string;
  category: 'discount' | 'full_service' | 'depository' | 'manual';
  apiStatus: 'unavailable' | 'planned' | 'connected';
  description: string;
}

export const SUPPORTED_BROKER_CATALOG: Record<string, BrokerInfo> = {
  GROWW: {
    code: 'GROWW',
    name: 'Groww',
    shortName: 'GW',
    brandColor: '#00D09C',
    category: 'discount',
    apiStatus: 'planned',
    description: 'Popular investment platform for stocks, mutual funds, and ETFs in India.',
  },
  ZERODHA: {
    code: 'ZERODHA',
    name: 'Zerodha',
    shortName: 'ZD',
    brandColor: '#387ED1',
    category: 'discount',
    apiStatus: 'planned',
    description: 'India’s largest discount stock broker (Kite platform).',
  },
  ANGEL_ONE: {
    code: 'ANGEL_ONE',
    name: 'Angel One',
    shortName: 'AO',
    brandColor: '#EB1C24',
    category: 'discount',
    apiStatus: 'planned',
    description: 'Full-service digital stock broker offering smart trading tools.',
  },
  ICICI_DIRECT: {
    code: 'ICICI_DIRECT',
    name: 'ICICI Direct',
    shortName: 'ID',
    brandColor: '#F37021',
    category: 'full_service',
    apiStatus: 'planned',
    description: 'Full-service 3-in-1 banking and investment platform.',
  },
  UPSTOX: {
    code: 'UPSTOX',
    name: 'Upstox',
    shortName: 'UP',
    brandColor: '#5B2D90',
    category: 'discount',
    apiStatus: 'planned',
    description: 'Fast digital trading and investment platform (Pro Web / App).',
  },
  HDFC_SECURITIES: {
    code: 'HDFC_SECURITIES',
    name: 'HDFC Securities / HDFC SKY',
    shortName: 'HD',
    brandColor: '#004C8F',
    category: 'full_service',
    apiStatus: 'planned',
    description: 'Banking and financial group trading services.',
  },
  KOTAK_SECURITIES: {
    code: 'KOTAK_SECURITIES',
    name: 'Kotak Securities',
    shortName: 'KS',
    brandColor: '#ED1C24',
    category: 'full_service',
    apiStatus: 'planned',
    description: 'Kotak Mahindra group broker with Trade Free plans.',
  },
  CDSL: {
    code: 'CDSL',
    name: 'Central Depository Services (CDSL)',
    shortName: 'CD',
    brandColor: '#1E3A8A',
    category: 'depository',
    apiStatus: 'planned',
    description: 'Central depository holding securities in dematerialized form.',
  },
  NSDL: {
    code: 'NSDL',
    name: 'National Securities Depository (NSDL)',
    shortName: 'NS',
    brandColor: '#047857',
    category: 'depository',
    apiStatus: 'planned',
    description: 'First national securities depository in India.',
  },
  MANUAL: {
    code: 'MANUAL',
    name: 'Manual Portfolio',
    shortName: 'MN',
    brandColor: '#8B5CF6',
    category: 'manual',
    apiStatus: 'unavailable',
    description: 'Custom container for self-directed asset tracking across offline or unlisted assets.',
  },
  OTHER: {
    code: 'OTHER',
    name: 'Other Depository / Broker',
    shortName: 'OT',
    brandColor: '#6B7280',
    category: 'full_service',
    apiStatus: 'planned',
    description: 'Any other registered Indian broker or financial depository.',
  },
};

export interface ConnectionStatusBadgeInfo {
  label: string;
  badgeClass: string;
  dotColor: string;
  description: string;
  isApiConnected: boolean;
}

/**
 * Returns user-facing truthful labels for broker connection statuses.
 * NEVER claims an account is API connected unless actually verified.
 */
export function getBrokerConnectionStatusBadge(
  status: BrokerConnectionStatus | string | undefined,
  dataSource: DataSource | string | undefined
): ConnectionStatusBadgeInfo {
  const normStatus = (status || 'MANUAL').toUpperCase();
  const normSource = (dataSource || 'MANUAL').toUpperCase();

  if (normStatus === 'CONNECTED' && normSource === 'API') {
    return {
      label: 'API Connected',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dotColor: '#10B981',
      description: 'Connected via authorized broker API. Real-time synchronization active.',
      isApiConnected: true,
    };
  }

  if (normStatus === 'SYNCING') {
    return {
      label: 'Syncing...',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse',
      dotColor: '#3B82F6',
      description: 'Account data synchronization is currently in progress.',
      isApiConnected: false,
    };
  }

  if (normStatus === 'ERROR') {
    return {
      label: 'Sync Error',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dotColor: '#EF4444',
      description: 'An error occurred during synchronization. Manual review required.',
      isApiConnected: false,
    };
  }

  if (normSource === 'CSV') {
    return {
      label: 'CSV Managed',
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      dotColor: '#6366F1',
      description: 'Holdings imported via broker CSV tradebook or statement.',
      isApiConnected: false,
    };
  }

  if (normStatus === 'NOT_CONNECTED') {
    return {
      label: 'Not Connected',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dotColor: '#F59E0B',
      description: 'Registered container without active automated sync.',
      isApiConnected: false,
    };
  }

  // Default: Manually Tracked
  return {
    label: 'Manually Tracked',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    dotColor: '#94A3B8',
    description: 'Self-directed container. Holdings entered manually or updated by user.',
    isApiConnected: false,
  };
}

/**
 * Returns formatted label for account type
 */
export function formatAccountTypeLabel(type: AccountType | string | undefined): string {
  const norm = (type || 'broker').toLowerCase();
  switch (norm) {
    case 'demat':
      return 'Demat Account';
    case 'trading':
      return 'Trading Account';
    case 'depository':
      return 'Depository Account';
    case 'mf':
    case 'mutual_fund':
      return 'Mutual Fund Account';
    case 'manual':
      return 'Manual Portfolio';
    case 'broker':
    default:
      return 'Brokerage Account';
  }
}

/**
 * Validates account type
 */
export const ALLOWED_ACCOUNT_TYPES: AccountType[] = [
  'broker',
  'depository',
  'manual',
  'demat',
  'trading',
  'mf',
  'other',
];

export function isValidAccountType(type: string): boolean {
  return ALLOWED_ACCOUNT_TYPES.includes(type.toLowerCase() as AccountType);
}
