// ============================================================
// FINOVA — Financial News Publisher & Source Name Cleaner
// lib/news/sourceCleaner.ts
//
// Ensures transparent, professional publication attribution:
// - Maps raw domains/slugs to official media outlet names
// - Strips URLs, protocols, and technical slugs
// - Strictly prevents displaying provider names ("MarketAux", "GDELT")
//   as if they were the real news publishers
// ============================================================

const KNOWN_PUBLISHERS: Record<string, string> = {
  // Indian Financial & Mainstream Media
  'economictimes.indiatimes.com': 'The Economic Times',
  'economictimes': 'The Economic Times',
  'et': 'The Economic Times',
  'livemint.com': 'Mint',
  'livemint': 'Mint',
  'mint': 'Mint',
  'business-standard.com': 'Business Standard',
  'business-standard': 'Business Standard',
  'businessstandard': 'Business Standard',
  'moneycontrol.com': 'Moneycontrol',
  'moneycontrol': 'Moneycontrol',
  'financialexpress.com': 'Financial Express',
  'financialexpress': 'Financial Express',
  'cnbctv18.com': 'CNBC-TV18',
  'cnbctv18': 'CNBC-TV18',
  'ndtvprofit.com': 'NDTV Profit',
  'ndtvprofit': 'NDTV Profit',
  'thehindubusinessline.com': 'The Hindu BusinessLine',
  'thehindubusinessline': 'The Hindu BusinessLine',
  'businessline': 'The Hindu BusinessLine',
  'zeebiz.com': 'Zee Business',
  'zeebiz': 'Zee Business',
  'etnownews.com': 'ET NOW',
  'etnow': 'ET NOW',
  'timesofindia.indiatimes.com': 'The Times of India',
  'timesofindia': 'The Times of India',
  'indiatimes.com': 'The Times of India',
  'indiatimes': 'The Times of India',
  'hindustantimes.com': 'Hindustan Times',
  'hindustantimes': 'Hindustan Times',
  'fortuneindia.com': 'Fortune India',
  'fortuneindia': 'Fortune India',
  'forbesindia.com': 'Forbes India',
  'forbesindia': 'Forbes India',
  'theprint.in': 'ThePrint',
  'theprint': 'ThePrint',
  'bloombergquint.com': 'BQ Prime',
  'bqprime.com': 'BQ Prime',
  'ndtv.com': 'NDTV',
  'thehindu.com': 'The Hindu',
  'indianexpress.com': 'The Indian Express',
  'outlookbusiness.com': 'Outlook Business',
  'outlookindia.com': 'Outlook',
  'deccanherald.com': 'Deccan Herald',
  'dnaindia.com': 'DNA India',
  'firstpost.com': 'Firstpost',
  'republicworld.com': 'Republic World',
  'businessinsider.in': 'Business Insider India',

  // Global Financial Media
  'reuters.com': 'Reuters',
  'reuters': 'Reuters',
  'bloomberg.com': 'Bloomberg',
  'bloomberg': 'Bloomberg',
  'cnbc.com': 'CNBC',
  'cnbc': 'CNBC',
  'wsj.com': 'The Wall Street Journal',
  'ft.com': 'Financial Times',
  'marketwatch.com': 'MarketWatch',
  'forbes.com': 'Forbes',
  'investing.com': 'Investing.com',
  'yahoo.com': 'Yahoo Finance',
  'finance.yahoo.com': 'Yahoo Finance',
};

/**
 * Normalizes raw domain, publisher slug, or wire name into a clean publication name
 */
export function cleanPublisherName(rawSource: string | null | undefined, fallbackUrl?: string): string {
  if (!rawSource || typeof rawSource !== 'string' || rawSource.trim() === '') {
    if (fallbackUrl) {
      try {
        const parsed = new URL(fallbackUrl);
        return cleanPublisherFromDomain(parsed.hostname);
      } catch {
        return 'Indian Financial Press';
      }
    }
    return 'Indian Financial Press';
  }

  const trimmed = rawSource.trim();

  // If it's a provider name mistakenly passed as source, extract from URL
  if (['marketaux', 'gdelt', 'newsdata', 'newsdata.io', 'marketaux.com'].includes(trimmed.toLowerCase())) {
    if (fallbackUrl) {
      try {
        const parsed = new URL(fallbackUrl);
        return cleanPublisherFromDomain(parsed.hostname);
      } catch {
        return 'Financial News Wire';
      }
    }
    return 'Financial News Wire';
  }

  // Direct lookup
  const lower = trimmed.toLowerCase();
  if (KNOWN_PUBLISHERS[lower]) {
    return KNOWN_PUBLISHERS[lower];
  }

  // If it's a domain name (contains a dot, like 'livemint.com')
  if (trimmed.includes('.')) {
    return cleanPublisherFromDomain(trimmed);
  }

  // Already a clean human-readable name (e.g. "Reuters", "The Economic Times")
  return trimmed;
}

/**
 * Cleans a domain name into a readable publication name
 */
function cleanPublisherFromDomain(domain: string): string {
  const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

  if (KNOWN_PUBLISHERS[cleanDomain]) {
    return KNOWN_PUBLISHERS[cleanDomain];
  }

  // Check subdomains
  const parts = cleanDomain.split('.');
  if (parts.length >= 2) {
    const mainSlug = parts[0];
    if (KNOWN_PUBLISHERS[mainSlug]) {
      return KNOWN_PUBLISHERS[mainSlug];
    }

    // Capitalize slug words
    const words = mainSlug
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    return words.join(' ');
  }

  return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
}
