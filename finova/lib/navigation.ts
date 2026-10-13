/** Accept only a same-origin application destination, including its query string. */
export function safeReturnPath(value: string | null | undefined, fallback = '/explore'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://finova.local');
    return url.origin === 'https://finova.local' ? url.pathname + url.search + url.hash : fallback;
  } catch { return fallback; }
}

export const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', investments: 'My Investments', holdings: 'My Investments', brokers: 'Broker Accounts',
  transactions: 'Transactions', performance: 'Performance', analysis: 'Investment X-Ray', allocation: 'Allocation',
  risk: 'Risk Radar', 'future-lab': 'Future Lab', goals: 'Financial Goals', explore: 'Investment Explorer',
  watchlist: 'Watchlist', news: 'News & Market', reit: 'REITs', invit: 'InvITs', bonds: 'Bonds', ipo: 'IPO Archive',
  insights: 'FINOVA Intelligence', learn: 'Learn', profile: 'Profile', settings: 'Settings', notifications: 'Notifications',
};
