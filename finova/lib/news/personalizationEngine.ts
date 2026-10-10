// ============================================================
// FINOVA — Portfolio-Aware News Personalization Engine (Prompt 12)
// Deterministic, testable, and explainable news intelligence
//
// Key Principles:
// 1. Strict company & ticker matching (word boundary regex, no false substrings).
// 2. Clear relevance classification: DIRECT_HOLDING, SECTOR, ASSET_CLASS, GENERAL_MARKET, UNVERIFIED.
// 3. Factual, deterministic "Why this matters" explanations.
// 4. Transparent relevance ranking (0-100) — NOT a trading or return signal.
// 5. Consolidated cross-broker security awareness.
// ============================================================

import type {
  NormalizedNewsArticle,
  PersonalizedNewsArticle,
  UserPortfolioContext,
  MatchedHoldingContext,
  NewsRelevanceCategory,
} from '../../types/news.ts';
import type { AssetClass } from '../../types/portfolio.ts';
import { EXPANDED_NSE_STOCKS } from '../market/stockCatalog.ts';

// Common stock aliases and company names for verified matching
const KNOWN_COMPANY_ALIASES: Record<string, string[]> = {
  RELIANCE: ['Reliance Industries', 'Reliance', 'RIL', 'Jio', 'Reliance Retail'],
  TCS: ['Tata Consultancy Services', 'TCS', 'Tata Consultancy'],
  INFY: ['Infosys', 'Infosys Ltd', 'Infosys Limited'],
  HDFCBANK: ['HDFC Bank', 'HDFC Bank Ltd', 'HDFC'],
  ICICIBANK: ['ICICI Bank', 'ICICI Bank Ltd', 'ICICI'],
  BHARTIARTL: ['Bharti Airtel', 'Airtel', 'Bharti Enterprises'],
  ITC: ['ITC Ltd', 'ITC Limited'],
  SBIN: ['State Bank of India', 'SBI', 'State Bank'],
  LT: ['Larsen & Toubro', 'L&T', 'Larsen and Toubro'],
  HINDUNILVR: ['Hindustan Unilever', 'HUL', 'Unilever'],
  BAJFINANCE: ['Bajaj Finance', 'Bajaj Finserv'],
  HCLTECH: ['HCL Tech', 'HCL Technologies', 'HCL Group'],
  MARUTI: ['Maruti Suzuki', 'Maruti'],
  SUNPHARMA: ['Sun Pharma', 'Sun Pharmaceutical'],
  TATAMOTORS: ['Tata Motors', 'JLR', 'Jaguar Land Rover'],
  KOTAKBANK: ['Kotak Mahindra Bank', 'Kotak Bank', 'Kotak'],
  TITAN: ['Titan Company', 'Titan'],
  ONGC: ['Oil and Natural Gas Corporation', 'ONGC'],
  TATASTEEL: ['Tata Steel'],
  NTPC: ['NTPC Ltd', 'NTPC'],
  AXISBANK: ['Axis Bank'],
  POWERGRID: ['Power Grid Corporation', 'Power Grid', 'POWERGRID'],
  ADANIENT: ['Adani Enterprises', 'Adani Group', 'Adani'],
  ADANIPORTS: ['Adani Ports'],
  COALINDIA: ['Coal India'],
  ASIANPAINT: ['Asian Paints'],
  WIPRO: ['Wipro', 'Wipro Ltd'],
  ULTRACEMCO: ['UltraTech Cement', 'UltraTech'],
};

// Sector mapping keywords
const SECTOR_KEYWORDS: Record<string, string[]> = {
  'Financial Services': ['banking', 'banks', 'nbfc', 'lending', 'credit', 'insurance', 'fintech', 'hdfc bank', 'icici bank', 'sbi'],
  'Information Technology': ['it services', 'tech sector', 'software exports', 'tcs', 'infosys', 'wipro', 'hcl', 'cloud computing'],
  'Energy': ['crude oil', 'refining', 'petrochemicals', 'natural gas', 'ongc', 'bpcl', 'ioc', 'opec', 'fuel prices'],
  'Fast Moving Consumer Goods': ['fmcg', 'consumer goods', 'packaged goods', 'itc', 'hindustan unilever', 'nestle', 'rural consumption'],
  'Automobile': ['auto sales', 'passenger vehicles', 'commercial vehicles', 'electric vehicles', 'ev sales', 'tata motors', 'maruti'],
  'Healthcare': ['pharmaceutical', 'pharma', 'sun pharma', 'generic drugs', 'fda approval', 'biotech', 'hospitals'],
  'Power': ['power generation', 'renewable energy', 'solar energy', 'grid transmission', 'ntpc', 'powergrid', 'electricity tariff'],
  'Metals & Mining': ['steel prices', 'iron ore', 'aluminium', 'mining', 'coal india', 'tata steel', 'jsw steel'],
  'Construction': ['infrastructure contracts', 'civil engineering', 'construction contracts', 'highways', 'epc projects'],
  'Telecommunication': ['telecom', '5g network', 'telecom tariffs', 'airtel', 'spectrum auction', 'trai'],
  'Consumer Durables': ['consumer electronics', 'home appliances', 'jewellery demand', 'asian paints'],
  'Real Estate': ['realty sector', 'real estate developers', 'residential housing', 'property sales'],
};

// Asset class keywords
const ASSET_CLASS_KEYWORDS: Record<AssetClass, string[]> = {
  equity: ['equity capital', 'equities market', 'promoter stake', 'secondary market equities', 'initial public offering', 'ipo allotment'],
  mf: ['mutual fund', 'mutual funds', 'amfi', 'systematic investment plan', 'index fund', 'etf', 'amc'],
  bond: ['bond', 'bonds', 'g-sec', 'government securities', 'bond yield', 'coupon rate', 'sovereign gold bond', 'sgb', 'fixed income', 'debt market'],
  reit: ['reit', 'reits', 'real estate investment trust', 'real estate investment trusts', 'commercial office reit', 'rental yield', 'ndcf', 'embassy reit', 'mindspace reit', 'nexus select'],
  invit: ['invit', 'invits', 'infrastructure investment trust', 'infrastructure investment trusts', 'toll highway invit', 'powergrid invit'],
  sgb: ['sovereign gold bond', 'sgb', 'gold bond', 'rbi gold tranche', 'gold yields', 'gold investment'],
  etf: ['etf', 'exchange traded fund', 'nifty bees', 'gold bees', 'bharat 22 etf', 'index etf'],
};

// General Indian macro keywords
const GENERAL_MARKET_KEYWORDS = [
  'rbi', 'reserve bank of india', 'sebi', 'repo rate', 'monetary policy',
  'nifty 50', 'nifty', 'sensex', 'bse', 'nse', 'inflation', 'cpi', 'gdp',
  'fiscal deficit', 'union budget', 'rupee', 'fii', 'dii', 'capital gains tax', 'stock market'
];

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a company or symbol is mentioned in text using strict word boundaries
 * Prevents substring false matches (e.g. "LT" matching "melt", "ITC" matching "pitch")
 */
export function matchesSymbolOrCompany(
  text: string,
  symbol: string,
  companyName?: string,
  isin?: string | null
): boolean {
  if (!text) return false;
  const upperText = text.toUpperCase();
  const normalizedSymbol = symbol.toUpperCase().trim();

  // 1. ISIN exact match
  if (isin && isin.length >= 10 && upperText.includes(isin.toUpperCase())) {
    return true;
  }

  // 2. Word boundary match on symbol
  // For short symbols (<= 2 chars, e.g. "LT", "MM"): require stricter boundary or company aliases
  if (normalizedSymbol.length <= 2) {
    const symbolRegex = new RegExp(`\\b${escapeRegex(normalizedSymbol)}\\b`, 'i');
    const hasFinancialContext = /\b(share|stock|quarter|earnings|revenue|nifty|ltd|limited|larsen)\b/i.test(text);
    if (symbolRegex.test(text) && hasFinancialContext) {
      return true;
    }
  } else {
    const symbolRegex = new RegExp(`\\b${escapeRegex(normalizedSymbol)}\\b`, 'i');
    if (symbolRegex.test(text)) {
      return true;
    }
  }

  // 3. Known Company Aliases match
  const aliases = KNOWN_COMPANY_ALIASES[normalizedSymbol] || [];
  for (const alias of aliases) {
    const aliasRegex = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
    if (aliasRegex.test(text)) {
      return true;
    }
  }

  // 4. Company Name match (if >= 4 letters)
  if (companyName && companyName.trim().length >= 4) {
    // Strip common legal entity suffixes for better fuzzy match
    const cleanName = companyName
      .replace(/\b(ltd|limited|corp|corporation|inc|pvt)\b/gi, '')
      .trim();
    if (cleanName.length >= 4) {
      const nameRegex = new RegExp(`\\b${escapeRegex(cleanName)}\\b`, 'i');
      if (nameRegex.test(text)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Matches an article against a specific sector
 */
export function matchesSector(text: string, sectorName: string): boolean {
  if (!text || !sectorName) return false;
  const lowerText = text.toLowerCase();
  const keywords = SECTOR_KEYWORDS[sectorName] || [sectorName.toLowerCase()];

  return keywords.some((kw) => {
    const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Matches an article against an asset class
 */
export function matchesAssetClass(text: string, assetClass: AssetClass): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  const keywords = ASSET_CLASS_KEYWORDS[assetClass] || [];

  return keywords.some((kw) => {
    const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Checks if an article discusses general Indian market or macroeconomic developments
 */
export function matchesGeneralMarket(text: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return GENERAL_MARKET_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Consolidates user's portfolio holdings by symbol to handle cross-broker positions
 */
export function consolidateUserHoldings(portfolio: UserPortfolioContext): Map<string, {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  sector: string | null;
  industry: string | null;
  total_value: number;
  total_invested: number;
  weight_pct: number;
  isin: string | null;
  broker_names: string[];
}> {
  const consolidated = new Map<string, {
    symbol: string;
    name: string;
    asset_class: AssetClass;
    sector: string | null;
    industry: string | null;
    total_value: number;
    total_invested: number;
    weight_pct: number;
    isin: string | null;
    broker_names: string[];
  }>();

  for (const h of portfolio.holdings) {
    const sym = h.symbol.toUpperCase().trim();
    if (!sym) continue;

    // Look up sector/name from catalog if missing
    const catalogItem = EXPANDED_NSE_STOCKS.find((s) => s.symbol.toUpperCase() === sym);
    const resolvedName = h.instrument_name || catalogItem?.name || sym;
    const resolvedSector = h.sector || catalogItem?.sector || null;
    const resolvedIndustry = h.industry || catalogItem?.industry || null;
    const resolvedIsin = h.isin || catalogItem?.isin || null;

    const val = typeof h.current_value === 'number' && !isNaN(h.current_value) ? h.current_value : 0;
    const inv = typeof h.invested_value === 'number' && !isNaN(h.invested_value) ? h.invested_value : 0;

    const existing = consolidated.get(sym);
    if (existing) {
      existing.total_value += val;
      existing.total_invested += inv;
      if (h.broker_name && !existing.broker_names.includes(h.broker_name)) {
        existing.broker_names.push(h.broker_name);
      }
    } else {
      consolidated.set(sym, {
        symbol: sym,
        name: resolvedName,
        asset_class: h.asset_class,
        sector: resolvedSector,
        industry: resolvedIndustry,
        total_value: val,
        total_invested: inv,
        weight_pct: 0,
        isin: resolvedIsin,
        broker_names: h.broker_name ? [h.broker_name] : [],
      });
    }
  }

  // Calculate weights based on reliably valued denominator
  const denom = portfolio.total_valued_capital > 0
    ? portfolio.total_valued_capital
    : Array.from(consolidated.values()).reduce((sum, h) => sum + h.total_invested, 0);

  if (denom > 0) {
    for (const item of consolidated.values()) {
      const numerator = portfolio.total_valued_capital > 0 ? item.total_value : item.total_invested;
      item.weight_pct = Number(((numerator / denom) * 100).toFixed(1));
    }
  }

  return consolidated;
}

/**
 * Calculates deterministic relevance ranking score (0-100)
 */
function calculateRelevanceScore(
  category: NewsRelevanceCategory,
  weightPct: number,
  freshness: string
): number {
  let score = 0;

  switch (category) {
    case 'DIRECT_HOLDING':
      score = 65 + Math.min(20, Math.round(weightPct * 0.5));
      break;
    case 'SECTOR_RELEVANCE':
      score = 35 + Math.min(15, Math.round(weightPct * 0.3));
      break;
    case 'ASSET_CLASS':
      score = 20 + Math.min(10, Math.round(weightPct * 0.2));
      break;
    case 'GENERAL_MARKET':
      score = 12;
      break;
    case 'UNVERIFIED':
    default:
      score = 2;
      break;
  }

  // Freshness boost
  if (freshness === 'LIVE') score += 15;
  else if (freshness === 'TODAY') score += 10;
  else if (freshness === 'RECENT') score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Generates factual "Why this matters" explanation statement
 */
function generateExplanation(
  category: NewsRelevanceCategory,
  matchedHolding?: MatchedHoldingContext | null,
  matchedSector?: string | null,
  matchedAssetClass?: AssetClass | null
): string {
  if (category === 'DIRECT_HOLDING' && matchedHolding) {
    const weightText =
      matchedHolding.weight_pct !== null && matchedHolding.weight_pct !== undefined && matchedHolding.weight_pct > 0
        ? ` (~${matchedHolding.weight_pct}% of your portfolio)`
        : '';
    const crossBrokerText =
      matchedHolding.is_cross_broker && matchedHolding.broker_names && matchedHolding.broker_names.length > 1
        ? ` across ${matchedHolding.broker_names.length} broker accounts (${matchedHolding.broker_names.join(', ')})`
        : '';

    return `Direct holding match: You hold ${matchedHolding.name} (${matchedHolding.symbol})${weightText}${crossBrokerText}. This news story directly references this security.`;
  }

  if (category === 'SECTOR_RELEVANCE' && matchedSector) {
    return `Sector relevance: You hold portfolio investments classified under the ${matchedSector} sector. Macroeconomic and regulatory shifts in this sector may influence your holdings.`;
  }

  if (category === 'ASSET_CLASS' && matchedAssetClass) {
    const label =
      matchedAssetClass === 'reit'
        ? 'REITs (Real Estate Investment Trusts)'
        : matchedAssetClass === 'invit'
        ? 'InvITs (Infrastructure Investment Trusts)'
        : matchedAssetClass === 'bond'
        ? 'Bonds & Fixed Income'
        : matchedAssetClass === 'mf'
        ? 'Mutual Funds'
        : 'Equities';

    return `Asset-class relevance: This development relates to ${label}, an asset class represented in your portfolio allocation.`;
  }

  if (category === 'GENERAL_MARKET') {
    return 'Indian macroeconomic development: Broader market, regulatory, or policy news shaping the Indian investment landscape.';
  }

  return 'General news article: No confirmed direct or sector relationship with your tracked portfolio holdings.';
}

/**
 * Generates educational investigation prompts
 */
function generateInvestigationPrompts(
  category: NewsRelevanceCategory,
  matchedHolding?: MatchedHoldingContext | null,
  matchedSector?: string | null
): string[] {
  if (category === 'DIRECT_HOLDING' && matchedHolding) {
    return [
      `Review your allocation to ${matchedHolding.symbol} (${matchedHolding.weight_pct ?? 0}% of portfolio).`,
      `Investigate if this story impacts upcoming quarterly earnings or corporate governance.`,
      `Verify if other securities in ${matchedHolding.sector || 'the same sector'} share similar industry exposure.`,
    ];
  }

  if (category === 'SECTOR_RELEVANCE' && matchedSector) {
    return [
      `Examine your overall capital concentration in the ${matchedSector} sector.`,
      `Consider whether regulatory or commodity changes in ${matchedSector} affect your top holdings.`,
    ];
  }

  return [
    'Assess whether broader market policy changes affect your overall asset allocation strategy.',
    'Consult verified official exchange filings on NSE/BSE for company-specific disclosures.',
  ];
}

/**
 * Evaluates and personalizes a single article against the user's consolidated portfolio
 */
export function personalizeArticle(
  article: NormalizedNewsArticle,
  portfolio: UserPortfolioContext
): PersonalizedNewsArticle {
  const consolidated = consolidateUserHoldings(portfolio);
  const fullText = `${article.title} ${article.description || ''} ${(article.keywords || []).join(' ')}`;

  // 1. Check Direct Holding Match
  let directMatch: MatchedHoldingContext | null = null;
  let highestDirectWeight = 0;

  for (const item of consolidated.values()) {
    if (matchesSymbolOrCompany(fullText, item.symbol, item.name, item.isin)) {
      if (!directMatch || item.weight_pct > highestDirectWeight) {
        highestDirectWeight = item.weight_pct;
        directMatch = {
          symbol: item.symbol,
          name: item.name,
          asset_class: item.asset_class,
          sector: item.sector,
          industry: item.industry,
          weight_pct: item.weight_pct,
          is_cross_broker: item.broker_names.length > 1,
          broker_names: item.broker_names,
        };
      }
    }
  }

  if (directMatch) {
    const score = calculateRelevanceScore('DIRECT_HOLDING', directMatch.weight_pct ?? 0, article.freshness);
    return {
      ...article,
      relevance_category: 'DIRECT_HOLDING',
      relevance_score: score,
      matched_holding: directMatch,
      matched_sector: directMatch.sector,
      matched_asset_class: directMatch.asset_class,
      explanation: generateExplanation('DIRECT_HOLDING', directMatch),
      investigation_prompts: generateInvestigationPrompts('DIRECT_HOLDING', directMatch),
    };
  }

  // 2. Check Alternative Asset-Class Relevance (REITs, InvITs, Bonds, Mutual Funds)
  let matchedAssetClass: AssetClass | null = null;
  const altAssetClasses: AssetClass[] = ['reit', 'invit', 'bond', 'mf'];
  for (const ac of altAssetClasses) {
    if (portfolio.represented_asset_classes.includes(ac) && matchesAssetClass(fullText, ac)) {
      matchedAssetClass = ac;
      break;
    }
  }

  if (matchedAssetClass) {
    const score = calculateRelevanceScore('ASSET_CLASS', 15, article.freshness);
    return {
      ...article,
      relevance_category: 'ASSET_CLASS',
      relevance_score: score,
      matched_holding: null,
      matched_sector: null,
      matched_asset_class: matchedAssetClass,
      explanation: generateExplanation('ASSET_CLASS', null, null, matchedAssetClass),
      investigation_prompts: generateInvestigationPrompts('ASSET_CLASS'),
    };
  }

  // 3. Check Sector Relevance
  let matchedSector: string | null = null;
  let sectorExposureWeight = 0;

  for (const sector of portfolio.represented_sectors) {
    if (matchesSector(fullText, sector)) {
      matchedSector = sector;
      // Calculate total weight of this sector in user's portfolio
      for (const item of consolidated.values()) {
        if (item.sector === sector) {
          sectorExposureWeight += item.weight_pct;
        }
      }
      break;
    }
  }

  if (matchedSector) {
    const score = calculateRelevanceScore('SECTOR_RELEVANCE', sectorExposureWeight, article.freshness);
    return {
      ...article,
      relevance_category: 'SECTOR_RELEVANCE',
      relevance_score: score,
      matched_holding: null,
      matched_sector: matchedSector,
      matched_asset_class: null,
      explanation: generateExplanation('SECTOR_RELEVANCE', null, matchedSector),
      investigation_prompts: generateInvestigationPrompts('SECTOR_RELEVANCE', null, matchedSector),
    };
  }

  // 4. Check General Market News (Macro / Nifty 50 / Sensex / RBI / SEBI)
  if (matchesGeneralMarket(fullText)) {
    const score = calculateRelevanceScore('GENERAL_MARKET', 0, article.freshness);
    return {
      ...article,
      relevance_category: 'GENERAL_MARKET',
      relevance_score: score,
      matched_holding: null,
      matched_sector: null,
      matched_asset_class: null,
      explanation: generateExplanation('GENERAL_MARKET'),
      investigation_prompts: generateInvestigationPrompts('GENERAL_MARKET'),
    };
  }

  // 5. Check General Equity Asset-Class Relevance
  if (portfolio.represented_asset_classes.includes('equity') && matchesAssetClass(fullText, 'equity')) {
    const score = calculateRelevanceScore('ASSET_CLASS', 10, article.freshness);
    return {
      ...article,
      relevance_category: 'ASSET_CLASS',
      relevance_score: score,
      matched_holding: null,
      matched_sector: null,
      matched_asset_class: 'equity',
      explanation: generateExplanation('ASSET_CLASS', null, null, 'equity'),
      investigation_prompts: generateInvestigationPrompts('ASSET_CLASS'),
    };
  }

  // 6. Unverified / Other
  const score = calculateRelevanceScore('UNVERIFIED', 0, article.freshness);
  return {
    ...article,
    relevance_category: 'UNVERIFIED',
    relevance_score: score,
    matched_holding: null,
    matched_sector: null,
    matched_asset_class: null,
    explanation: generateExplanation('UNVERIFIED'),
    investigation_prompts: generateInvestigationPrompts('UNVERIFIED'),
  };
}

/**
 * Personalizes and ranks a collection of news articles against the authenticated user's portfolio
 * Sorts in descending order of relevance_score.
 */
export function personalizeAndRankNews(
  articles: NormalizedNewsArticle[],
  portfolio: UserPortfolioContext
): PersonalizedNewsArticle[] {
  const personalized = articles.map((article) => personalizeArticle(article, portfolio));

  // Sort descending by relevance score, tie-break by publication recency
  return personalized.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) {
      return b.relevance_score - a.relevance_score;
    }
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
}
