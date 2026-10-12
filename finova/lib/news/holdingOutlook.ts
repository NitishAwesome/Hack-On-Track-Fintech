// ============================================================
// FINOVA — Evidence-Based Holding & Stock Outlook Engine
// lib/news/holdingOutlook.ts
//
// Key Principles:
// 1. Evidence-based research and portfolio decision support ONLY.
// 2. NEVER generate automatic trading signals (BUY/SELL/HOLD) or price targets.
// 3. Strict evidence-based stock outlook labels:
//    - "Positive developments observed"
//    - "Mixed / uncertain evidence"
//    - "Caution indicators"
//    - "Needs further research"
//    - "Insufficient recent evidence"
// 4. Reuses multi-provider news (Marketaux, GDELT 2.0, NewsData.io Free).
// 5. Preserves provider-specific timestamp semantics (published vs indexed vs delayed).
// 6. Transparently flags feed delays (~12h) and caching states.
// 7. Grounded in actual holding concentration and portfolio weight.
// ============================================================

import type { NormalizedNewsArticle, PersonalizedNewsArticle } from '@/types/news';
import type { ConsolidatedInstrumentExposure } from '@/lib/calculations/xray';
import { resolveArticleTemporalInfo } from './temporalUtils.ts';

export type OutlookLabel =
  | 'Positive developments observed'
  | 'Mixed / uncertain evidence'
  | 'Caution indicators'
  | 'Needs further research'
  | 'Insufficient recent evidence';

export interface CitedNewsItem {
  article_id: string;
  title: string;
  publisher: string;
  link: string;
  provider: string; // "Marketaux", "GDELT 2.0", "NewsData.io"
  formatted_time: string; // "Published: 11 Oct 2026, 3:30 PM IST" or "Indexed: ..."
  relative_time: string;
  is_delayed_feed: boolean;
  delay_note?: string;
  is_cached: boolean;
  relevance_type: 'DIRECT_HOLDING' | 'SECTOR_RELEVANCE' | 'GENERAL_MARKET';
}

export interface HoldingStockOutlook {
  symbol: string;
  company_name: string;
  isin: string | null;
  sector: string | null;
  portfolio_weight_pct: number;
  current_value: number | null;
  outlook_label: OutlookLabel;
  outlook_badge_tone: 'gain' | 'warning' | 'loss' | 'brand' | 'muted';
  outlook_summary: string;
  factual_developments: string[];
  concentration_observation: string;
  performance_context: string;
  reasons_to_monitor: string[];
  reasons_to_review: string[];
  research_priorities: string[];
  cited_articles: CitedNewsItem[];
  has_delayed_feed_sources: boolean;
  has_indexed_sources: boolean;
  limitations_disclaimer: string;
}

const POSITIVE_EVENT_KEYWORDS = [
  'profit surge', 'net profit jumps', 'revenue up', 'order win', 'wins contract',
  'growth surges', 'expands capacity', 'record revenue', 'upgrade', 'dividend',
  'expansion', 'acquisition', 'new facility', 'bonus issue', 'strong quarter',
  'guidance raised', 'market share gain', 'secures deal', 'ebitda expands'
];

const CAUTION_EVENT_KEYWORDS = [
  'profit falls', 'slumps', 'revenue declines', 'loss widens', 'downgrade',
  'regulatory notice', 'sebi probe', 'rbi penalty', 'penalty imposed', 'litigation',
  'resignation', 'fraud', 'default', 'debt concern', 'margin pressure', 'strike',
  'guidance cut', 'under scrutiny', 'show-cause', 'rating downgraded'
];

/**
 * Evaluates an evidence-based Stock Outlook for a given consolidated instrument
 * based strictly on verified provider-attributed news and real portfolio weight.
 */
export function evaluateHoldingOutlook(
  instrument: ConsolidatedInstrumentExposure,
  articles: (NormalizedNewsArticle | PersonalizedNewsArticle)[] = []
): HoldingStockOutlook {
  const symbol = instrument.symbol.toUpperCase();
  const name = instrument.name;
  const isin = instrument.isin || null;
  const sector = instrument.sector || 'Unclassified';
  const weightPct = instrument.percentage_of_valued_portfolio;
  const currentVal = instrument.current_value;

  // Filter relevant articles for this instrument (Direct symbol/name match or sector match)
  const directlyRelevantArticles: (NormalizedNewsArticle | PersonalizedNewsArticle)[] = [];
  const sectorRelevantArticles: (NormalizedNewsArticle | PersonalizedNewsArticle)[] = [];

  for (const a of articles) {
    const text = `${a.title} ${a.description || ''}`.toUpperCase();
    const anyA = a as unknown as Record<string, unknown>;

    const articleSymbols: string[] = [
      ...((anyA.symbols as string[]) || []),
      ...((anyA.matched_symbols as string[]) || []),
    ].map((s) => s.toUpperCase());

    const articleCompanies: string[] = [
      ...((anyA.companies as string[]) || []),
      ...((anyA.matched_companies as string[]) || []),
    ].map((c) => c.toUpperCase());

    const hasSymbolMatch =
      articleSymbols.includes(symbol) ||
      text.includes(` ${symbol} `) ||
      text.includes(`(${symbol})`) ||
      text.startsWith(`${symbol} `);

    const hasNameMatch =
      articleCompanies.some((c) => c.includes(name.toUpperCase()) || name.toUpperCase().includes(c)) ||
      (name.length >= 4 && text.includes(name.toUpperCase()));

    if (hasSymbolMatch || hasNameMatch) {
      directlyRelevantArticles.push(a);
    } else if (instrument.sector && a.categories && a.categories.some((c) => c.toUpperCase() === instrument.sector?.toUpperCase())) {
      sectorRelevantArticles.push(a);
    }
  }

  // Combine preferred direct articles first, then fallback to sector news
  const prioritizedArticles =
    directlyRelevantArticles.length > 0
      ? directlyRelevantArticles
      : sectorRelevantArticles.slice(0, 3);

  // Map to structured CitedNewsItem with verified timestamps
  const citedArticles: CitedNewsItem[] = prioritizedArticles.map((a) => {
    const temporal = a.temporal_info || resolveArticleTemporalInfo(a);
    const anyA = a as unknown as Record<string, unknown>;
    const isDirect = directlyRelevantArticles.includes(a);
    const isDelayed = temporal.is_delayed_feed || Boolean(anyA.is_delayed);
    const delayNote = temporal.delay_note || (anyA.feed_delay_note as string | undefined);

    return {
      article_id: a.article_id,
      title: a.title,
      publisher: a.source_name || (anyA.publisher as string) || 'Financial Media',
      link: a.link,
      provider: temporal.provider_display_name || (anyA.provider as string) || 'News Aggregator',
      formatted_time: temporal.display_label,
      relative_time: temporal.relative_time,
      is_delayed_feed: isDelayed,
      delay_note: delayNote,
      is_cached: temporal.is_cached || Boolean(anyA.cached),
      relevance_type: isDirect ? 'DIRECT_HOLDING' : 'SECTOR_RELEVANCE',
    };
  });

  const hasDelayedSources = citedArticles.some((c) => c.is_delayed_feed);
  const hasIndexedSources = citedArticles.some((c) => c.provider.includes('GDELT'));

  // Concentration observation
  let concentrationObservation = `Represents ${weightPct}% of your valued portfolio.`;
  if (weightPct >= 35) {
    concentrationObservation = `Significant exposure: accounts for ${weightPct}% of valued assets. Company-specific developments and earnings will heavily sway overall portfolio performance.`;
  } else if (weightPct >= 20) {
    concentrationObservation = `Elevated exposure: represents ${weightPct}% of your valued capital. Material news warrants active monitoring.`;
  } else if (weightPct < 5) {
    concentrationObservation = `Modest allocation (${weightPct}% of valued assets). Position drawdown has muted impact on total portfolio.`;
  }

  // Performance context
  const performanceContext =
    instrument.is_quoted && instrument.current_price !== null
      ? `Active market price: ₹${instrument.current_price.toLocaleString('en-IN')}. Position total value: ₹${(currentVal ?? 0).toLocaleString('en-IN')}.`
      : 'Active market quote unavailable for this position. Complete valuation context pending exchange price feed.';

  // Scenario 1: No relevant news available
  if (citedArticles.length === 0) {
    return {
      symbol,
      company_name: name,
      isin,
      sector,
      portfolio_weight_pct: weightPct,
      current_value: currentVal,
      outlook_label: 'Insufficient recent evidence',
      outlook_badge_tone: 'muted',
      outlook_summary: 'No sufficiently recent verified news is available for this holding across active news providers.',
      factual_developments: [
        'No recent verified media stories or corporate filings were returned by Marketaux, GDELT 2.0, or NewsData.io.',
      ],
      concentration_observation: concentrationObservation,
      performance_context: performanceContext,
      reasons_to_monitor: [
        'Check verified company disclosures and quarterly financial results directly on NSE/BSE filings portals.',
        'Track upcoming scheduled corporate board meetings or annual general meeting (AGM) dates.',
      ],
      reasons_to_review: [
        weightPct >= 25
          ? `High position weight (${weightPct}%) without fresh news flow may leave emerging industry risks unmonitored.`
          : 'Confirm whether your original investment thesis remains intact despite limited media coverage.',
      ],
      research_priorities: [
        'Inspect official exchange announcements on nseindia.com or bseindia.com.',
        'Review peer company performance within the same sector for broader industry trends.',
      ],
      cited_articles: [],
      has_delayed_feed_sources: false,
      has_indexed_sources: false,
      limitations_disclaimer:
        'Evidence-based research and portfolio decision support only. Not SEBI-registered financial advice or automated buy/sell recommendations.',
    };
  }

  // Scenario 2: Analyze factual developments from headlines & snippets
  let positiveScore = 0;
  let cautionScore = 0;
  const factualDevelopments: string[] = [];

  for (const art of prioritizedArticles) {
    const full = `${art.title} ${art.description || ''}`.toLowerCase();
    for (const kw of POSITIVE_EVENT_KEYWORDS) {
      if (full.includes(kw)) {
        positiveScore++;
        break;
      }
    }

    for (const kw of CAUTION_EVENT_KEYWORDS) {
      if (full.includes(kw)) {
        cautionScore++;
        break;
      }
    }

    // Capture headline as a factual development
    if (factualDevelopments.length < 3) {
      factualDevelopments.push(art.title);
    }
  }

  // Derive evidence-based label
  let outlookLabel: OutlookLabel = 'Needs further research';
  let badgeTone: 'gain' | 'warning' | 'loss' | 'brand' | 'muted' = 'brand';
  let outlookSummary = '';

  if (cautionScore > 0 && positiveScore === 0) {
    outlookLabel = 'Caution indicators';
    badgeTone = 'loss';
    outlookSummary =
      'Recent media and regulatory reports highlight potential headwinds, margin pressures, or operational challenges that deserve investor scrutiny.';
  } else if (positiveScore > 0 && cautionScore === 0) {
    outlookLabel = 'Positive developments observed';
    badgeTone = 'gain';
    outlookSummary =
      'Recent reports reflect favorable business developments, earnings milestones, contract wins, or expansion progress.';
  } else if (positiveScore > 0 && cautionScore > 0) {
    outlookLabel = 'Mixed / uncertain evidence';
    badgeTone = 'warning';
    outlookSummary =
      'Reported developments present conflicting indicators, balancing growth initiatives against market pressures or operational costs.';
  } else {
    outlookLabel = 'Needs further research';
    badgeTone = 'brand';
    outlookSummary =
      'Available reports cover routine market activity or sector movements without unambiguous corporate catalysts.';
  }

  // If news sources are delayed feed (NewsData.io Free), disclose delay in summary
  if (hasDelayedSources) {
    outlookSummary += ' (Note: Some context derived from NewsData.io Free feed with ~12-hour access delay; evaluate as background macro context rather than real-time trading catalysts.)';
  }

  // Reasons to monitor
  const reasonsToMonitor: string[] = [
    `Observe quarterly earnings trajectory and margin sustainability for ${name}.`,
    'Verify material corporate governance disclosures and shareholding pattern trends on NSE/BSE.',
  ];

  // Reasons to review
  const reasonsToReview: string[] = [];
  if (weightPct >= 35) {
    reasonsToReview.push(
      `Holding represents ${weightPct}% of your valued capital. Even favorable companies expose concentrated portfolios to severe drawdown risk if quarterly results disappoint.`
    );
  }
  if (cautionScore > 0) {
    reasonsToReview.push(
      'Investigate reported caution factors in detail before committing additional capital to this position.'
    );
  }
  reasonsToReview.push(
    'Assess whether current valuation multiples align with your planned investment timeframe.'
  );

  // Practical research priorities
  const researchPriorities: string[] = [
    'Read the original news sources cited below to understand full context and dates.',
    'Check official corporate filings and investor presentation PDFs on the company investor relations portal.',
    'Evaluate tax implications (LTCG / STCG) before contemplating any reallocation or rebalancing.',
  ];

  return {
    symbol,
    company_name: name,
    isin,
    sector,
    portfolio_weight_pct: weightPct,
    current_value: currentVal,
    outlook_label: outlookLabel,
    outlook_badge_tone: badgeTone,
    outlook_summary: outlookSummary,
    factual_developments: factualDevelopments,
    concentration_observation: concentrationObservation,
    performance_context: performanceContext,
    reasons_to_monitor: reasonsToMonitor,
    reasons_to_review: reasonsToReview,
    research_priorities: researchPriorities,
    cited_articles: citedArticles,
    has_delayed_feed_sources: hasDelayedSources,
    has_indexed_sources: hasIndexedSources,
    limitations_disclaimer:
      'Evidence-based research and portfolio decision support only. Not SEBI-registered financial advice or automated buy/sell recommendations.',
  };
}
