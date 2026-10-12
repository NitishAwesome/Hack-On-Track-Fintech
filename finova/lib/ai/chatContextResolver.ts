// ============================================================
// FINOVA — AI Chat Context Resolver & Source Grounding
// lib/ai/chatContextResolver.ts
//
// Bounded, question-aware retrieval:
// - Authenticated portfolio context & canonical calculations (X-Ray & Risk Radar)
// - Investment Explorer market data & verified company profiles
// - Multi-provider news (Marketaux, GDELT, NewsData.io) with temporal disclosures
// - Future Lab deterministic simulations & strategy templates
// - Verified SEBI & financial education concepts
// ============================================================

import { isSupabaseConfigured } from '../supabase/config.ts';
import { PortfolioStorage } from '../storage/portfolioStorage.ts';
import { enrichHolding } from '../calculations/portfolio.ts';
import { resolveQuotesForHoldings } from '../market/holdingQuoteResolver.ts';
import { computeUnifiedXRay, type UnifiedXRayAnalysis } from '../calculations/xray.ts';
import { computeSmartRiskRadar, type SmartRiskRadarAnalysis } from '../calculations/riskRadar.ts';
import {
  runWhatIfSimulation,
  STRATEGY_TEMPLATES,
  type WhatIfSimulationResult,
  type StrategyId,
} from '../calculations/futureLab.ts';
import { MarketDataService } from '../services/marketData.ts';
import { getCompanyProfile } from '../market/companyProfiles.ts';
import { getAggregatedFinancialNews } from '../news/aggregationService.ts';
import type {
  Holding,
  HoldingWithMetrics,
  BrokerAccount,
  AssetClass,
  Exchange,
  AccountType,
} from '../../types/portfolio';
import type {
  AIChatSource,
  AIChatMessageMetadata,
  StockComparisonSnapshot,
  SimulationSnapshot,
} from '../../types/chat';

async function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { createClient } = await import('../supabase/server.ts');
    return await createClient();
  } catch {
    return null;
  }
}

interface SupabaseHoldingRow {
  id: string;
  user_id: string;
  broker_account_id: string;
  instrument_id: string;
  quantity: number | string;
  average_buy_price: number | string;
  currency?: string;
  data_source?: string;
  as_of?: string;
  created_at: string;
  updated_at: string;
  broker_account?: BrokerAccount;
  instrument?: {
    id?: string;
    symbol?: string;
    instrument_name?: string;
    isin?: string | null;
    asset_type?: string;
    exchange?: string;
  };
}

interface SupabaseBrokerRow {
  id: string;
  user_id: string;
  broker_code?: string;
  display_name?: string;
  account_label?: string;
  account_type?: AccountType;
  color_hex?: string;
  created_at: string;
}

export interface ResolvedChatContext {
  intent: 'portfolio' | 'stock_research' | 'news' | 'future_lab' | 'education' | 'general';
  promptContextText: string;
  sources: AIChatSource[];
  metadata: AIChatMessageMetadata;
  portfolioError?: string;
}

function mapAssetTypeToClass(assetType?: string): AssetClass {
  if (assetType === 'STOCK') return 'equity';
  if (assetType === 'MUTUAL_FUND') return 'mf';
  if (assetType === 'REIT') return 'reit';
  if (assetType === 'INVIT') return 'invit';
  if (assetType === 'BOND') return 'bond';
  return 'equity';
}

/**
 * Fetch and enrich user holdings using the authenticated session.
 * Never trusts client user ID.
 */
export async function resolveAuthenticatedUserHoldings(userId: string): Promise<{
  holdings: HoldingWithMetrics[];
  brokers: BrokerAccount[];
  error?: string;
}> {
  if (!userId) {
    return {
      holdings: [],
      brokers: [],
      error: "I couldn't access your portfolio data right now because authentication is required. I can still explain general investment concepts, but I can't analyze your actual holdings.",
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        return {
          holdings: [],
          brokers: [],
          error: "I couldn't access your portfolio data right now. I can still explain general investment concepts, but I can't analyze your actual holdings.",
        };
      }

      const [holdingsRes, brokersRes] = await Promise.all([
        supabase
          .from('holdings')
          .select(`
            id,
            user_id,
            broker_account_id,
            instrument_id,
            quantity,
            average_buy_price,
            currency,
            data_source,
            as_of,
            created_at,
            updated_at,
            broker_account:broker_accounts(*),
            instrument:instruments(*)
          `)
          .eq('user_id', user.id)
          .gt('quantity', 0)
          .order('created_at', { ascending: false }),
        supabase
          .from('broker_accounts')
          .select('*')
          .eq('user_id', user.id),
      ]);

      if (holdingsRes.error) {
        return {
          holdings: [],
          brokers: [],
          error: "I couldn't access your portfolio data right now due to a database service error. I can still explain general investment concepts, but I can't analyze your actual holdings.",
        };
      }

      const rawHoldings = (holdingsRes.data || []) as unknown as SupabaseHoldingRow[];
      const brokers: BrokerAccount[] = ((brokersRes.data || []) as unknown as SupabaseBrokerRow[]).map((b) => ({
        id: b.id,
        user_id: b.user_id,
        broker_name: b.broker_code || b.display_name || 'Broker',
        broker_code: b.broker_code,
        display_name: b.display_name || b.broker_code || 'Broker',
        account_label: b.account_label || b.display_name || b.broker_code || 'Broker',
        account_type: b.account_type || 'demat',
        color_hex: b.color_hex || '#3B82F6',
        created_at: b.created_at,
      }));

      // Enrich with live quotes
      const quoteRefs = rawHoldings.map((h) => ({
        symbol: h.instrument?.symbol,
        exchange: h.instrument?.exchange || 'NSE',
      }));

      const quotesMap = await resolveQuotesForHoldings(quoteRefs);

      const holdings: Holding[] = rawHoldings.map((h) => {
        const inst = h.instrument;
        const sym = inst?.symbol ? inst.symbol.toUpperCase() : '';
        const quote = sym ? quotesMap.get(sym) : null;
        const hasValidQuote = Boolean(quote && quote.isValid && quote.price !== null && quote.price > 0);

        return {
          id: h.id,
          user_id: h.user_id,
          broker_account_id: h.broker_account_id,
          instrument_id: h.instrument_id,
          symbol: inst?.symbol || 'UNKNOWN',
          isin: inst?.isin || null,
          name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
          asset_class: mapAssetTypeToClass(inst?.asset_type),
          exchange: (inst?.exchange as Exchange) || 'NSE',
          quantity: Number(h.quantity),
          avg_buy_price: Number(h.average_buy_price),
          average_buy_price: Number(h.average_buy_price),
          current_price: hasValidQuote ? quote!.price : null,
          currency: h.currency || 'INR',
          data_source: h.data_source || 'MANUAL',
          as_of: h.as_of,
          price_updated_at: hasValidQuote ? quote!.price_timestamp : null,
          price_source: hasValidQuote ? quote!.source : null,
          price_status: hasValidQuote ? quote!.status : (quote?.status || 'UNAVAILABLE'),
          price_unavailability_reason: hasValidQuote ? null : (quote?.rejectionReason || 'Price unavailable'),
          broker_account: brokers.find((b) => b.id === h.broker_account_id),
          created_at: h.created_at,
          updated_at: h.updated_at,
        };
      });

      const enrichedHoldings: HoldingWithMetrics[] = holdings.map((h) => enrichHolding(h));
      return { holdings: enrichedHoldings, brokers };
    } catch {
      return {
        holdings: [],
        brokers: [],
        error: "I couldn't access your portfolio data right now. I can still explain general investment concepts, but I can't analyze your actual holdings.",
      };
    }
  }

  // Local storage mode fallback
  try {
    const rawHoldings = PortfolioStorage.getHoldings().filter((h) => Number(h.quantity) > 0);
    const rawBrokers = PortfolioStorage.getBrokerAccounts();

    const brokers: BrokerAccount[] = rawBrokers.map((b) => ({
      id: b.id,
      user_id: b.user_id,
      broker_name: b.broker_name || b.broker_code || 'Broker',
      broker_code: b.broker_code,
      display_name: b.broker_name || b.broker_code || 'Broker',
      account_label: b.account_label || b.broker_name || 'Broker',
      account_type: (b.account_type as AccountType) || 'demat',
      created_at: b.created_at,
    }));

    const holdingsWithInst = rawHoldings.map((h) => {
      const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
      return { holding: h, inst, symbol: inst?.symbol, exchange: inst?.exchange };
    });

    const quotesMap = await resolveQuotesForHoldings(
      holdingsWithInst.map((item) => ({ symbol: item.symbol, exchange: item.exchange }))
    );

    const holdings: Holding[] = holdingsWithInst.map(({ holding: h, inst }) => {
      const sym = inst?.symbol ? inst.symbol.toUpperCase() : '';
      const quote = sym ? quotesMap.get(sym) : null;
      const hasValidQuote = Boolean(quote && quote.isValid && quote.price !== null && quote.price > 0);

      return {
        id: h.id,
        user_id: h.user_id,
        broker_account_id: h.broker_account_id,
        instrument_id: h.instrument_id,
        symbol: inst?.symbol || 'UNKNOWN',
        isin: inst?.isin || null,
        name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
        asset_class: mapAssetTypeToClass(inst?.asset_type),
        exchange: (inst?.exchange as Exchange) || 'NSE',
        quantity: Number(h.quantity),
        avg_buy_price: Number(h.average_buy_price),
        average_buy_price: Number(h.average_buy_price),
        current_price: hasValidQuote ? quote!.price : null,
        currency: h.currency || 'INR',
        data_source: h.data_source || 'MANUAL',
        as_of: h.as_of,
        price_updated_at: hasValidQuote ? quote!.price_timestamp : null,
        price_source: hasValidQuote ? quote!.source : null,
        price_status: hasValidQuote ? quote!.status : (quote?.status || 'UNAVAILABLE'),
        price_unavailability_reason: hasValidQuote ? null : (quote?.rejectionReason || 'Price unavailable'),
        created_at: h.created_at,
        updated_at: h.updated_at,
      };
    });

    const enrichedHoldings: HoldingWithMetrics[] = holdings.map((h) => enrichHolding(h));
    return { holdings: enrichedHoldings, brokers };
  } catch {
    return {
      holdings: [],
      brokers: [],
      error: "I couldn't access your portfolio data right now. I can still explain general investment concepts, but I can't analyze your actual holdings.",
    };
  }
}

/**
 * Common Indian stock name to symbol resolution mapping
 */
const COMMON_STOCK_NAMES: Record<string, string> = {
  reliance: 'RELIANCE',
  tcs: 'TCS',
  infosys: 'INFY',
  infy: 'INFY',
  'hdfc bank': 'HDFCBANK',
  hdfc: 'HDFCBANK',
  hdfcbank: 'HDFCBANK',
  'icici bank': 'ICICIBANK',
  icici: 'ICICIBANK',
  icicibank: 'ICICIBANK',
  sbi: 'SBIN',
  sbin: 'SBIN',
  'state bank of india': 'SBIN',
  bharti: 'BHARTIARTL',
  airtel: 'BHARTIARTL',
  'bharti airtel': 'BHARTIARTL',
  itc: 'ITC',
  wipro: 'WIPRO',
  'tata motors': 'TATAMOTORS',
  tatamotors: 'TATAMOTORS',
  'tata steel': 'TATASTEEL',
  tatasteel: 'TATASTEEL',
  'l&t': 'LT',
  lt: 'LT',
  'larsen & toubro': 'LT',
  hcltech: 'HCLTECH',
  'hcl tech': 'HCLTECH',
  asianpaint: 'ASIANPAINT',
  'asian paints': 'ASIANPAINT',
  maruti: 'MARUTI',
  'maruti suzuki': 'MARUTI',
  bajfinance: 'BAJFINANCE',
  'bajaj finance': 'BAJFINANCE',
  zomato: 'ZOMATO',
  swiggy: 'SWIGGY',
  jio: 'JIOFIN',
  jiofin: 'JIOFIN',
  'jio financial': 'JIOFIN',
};

/**
 * Extract Indian stock symbols mentioned in query
 */
export function extractSymbolsFromQuery(query: string): string[] {
  const lower = query.toLowerCase();
  const found = new Set<string>();

  // Check known names
  for (const [name, sym] of Object.entries(COMMON_STOCK_NAMES)) {
    if (new RegExp(`\\b${name.replace('&', '\\&')}\\b`, 'i').test(lower)) {
      found.add(sym);
    }
  }

  // Check capital tickers e.g. "RELIANCE", "TCS", "INFY"
  const upperMatches = query.match(/\b[A-Z]{3,12}\b/g);
  if (upperMatches) {
    const ignoredWords = new Set([
      'WHAT', 'WHEN', 'WHERE', 'WHICH', 'THAT', 'THIS', 'FROM', 'WITH', 'HAVE',
      'INVEST', 'STOCK', 'STOCKS', 'SHARE', 'RISK', 'RADAR', 'FUTURE', 'LAB',
      'NSE', 'BSE', 'SEBI', 'REIT', 'REITS', 'INVIT', 'INVITS', 'SGB', 'SGBS',
      'ETF', 'ETFS', 'HHI', 'P&L', 'BUY', 'SELL', 'HOLD', 'BALANCED', 'CONSERVATIVE',
      'AGGRESSIVE', 'HIGH', 'LOW', 'NEWS', 'PORTFOLIO', 'FINOVA'
    ]);
    for (const match of upperMatches) {
      if (match === 'TCS' || match === 'ITC' || match === 'LT' || !ignoredWords.has(match)) {
        found.add(match);
      }
    }
  }

  return Array.from(found).slice(0, 4);
}

/**
 * Resolve stock quotes and profiles for comparison
 */
export async function resolveStockComparisonContext(symbols: string[]): Promise<{
  snapshots: StockComparisonSnapshot[];
  sources: AIChatSource[];
  summaryText: string;
}> {
  if (symbols.length === 0) {
    return { snapshots: [], sources: [], summaryText: '' };
  }

  const snapshots: StockComparisonSnapshot[] = [];
  const sources: AIChatSource[] = [];

  for (const sym of symbols) {
    const [quote, profile] = await Promise.all([
      MarketDataService.getQuote(sym, 'NSE').catch(() => null),
      Promise.resolve(getCompanyProfile(sym)),
    ]);

    const name = profile?.name || sym;
    const price = quote?.price ?? null;
    const changePct = quote?.day_change_pct ?? null;
    const quoteObj = quote as unknown as Record<string, unknown> | null;
    const peRatio = typeof quoteObj?.peRatio === 'number' ? quoteObj.peRatio : null;
    const marketCapNum = typeof quoteObj?.marketCap === 'number' ? quoteObj.marketCap : null;
    const marketCap = marketCapNum ? `₹${(marketCapNum / 1e7).toFixed(0)} Cr` : null;
    const sector = profile?.keySegments?.[0] || 'Indian Equities';
    const sourceTimestamp = quote?.price_timestamp || new Date().toISOString();

    snapshots.push({
      symbol: sym,
      name,
      price,
      changePct,
      peRatio,
      marketCap,
      sector,
      high52: quote?.high_52w ?? null,
      low52: quote?.low_52w ?? null,
      sourceTimestamp,
      dataProvider: quote?.source || 'NSE Market Feed',
    });

    const isRealtime = quote?.status === 'REALTIME';

    sources.push({
      id: `src-quote-${sym}`,
      title: `${sym} Market Quotation (${isRealtime ? 'Market Open' : 'Previous Close'})`,
      url: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(sym)}`,
      publisher: 'National Stock Exchange (NSE)',
      timestamp: sourceTimestamp,
      sourceCategory: 'market_quote',
      dataFreshness: isRealtime ? 'Live Exchange Feed' : (quote?.freshnessLabel || 'Market Close / Delayed'),
      temporalNote: 'Quotations represent official exchange trade updates. Excludes speculative predictions.',
      relevantHolding: sym,
    });
  }

  const summaryText = snapshots
    .map((s) => {
      const priceStr = s.price !== null ? `₹${s.price.toLocaleString('en-IN')}` : 'Price unavailable';
      const changeStr = s.changePct !== null ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` : '';
      const peStr = s.peRatio ? ` | P/E: ${s.peRatio.toFixed(1)}` : '';
      const capStr = s.marketCap ? ` | M-Cap: ${s.marketCap}` : '';
      const h52 = s.high52 ? ` | 52W High: ₹${s.high52}` : '';
      const l52 = s.low52 ? ` | 52W Low: ₹${s.low52}` : '';
      return `• ${s.symbol} (${s.name}): Current Price: ${priceStr} (${changeStr})${peStr}${capStr}${h52}${l52} | Sector: ${s.sector}`;
    })
    .join('\n');

  return { snapshots, sources, summaryText };
}

/**
 * Resolve financial news with strict provider timestamp disclosures
 */
export async function resolveNewsContext(
  symbols: string[] = [],
  query?: string
): Promise<{
  sources: AIChatSource[];
  summaryText: string;
}> {
  try {
    const res = await getAggregatedFinancialNews({
      symbols: symbols.length > 0 ? symbols : undefined,
      query: query || (symbols.length > 0 ? symbols.join(' OR ') : 'Indian stock market'),
    });

    const articles = res.articles.slice(0, 4);
    if (articles.length === 0) {
      return {
        sources: [],
        summaryText: 'No recent financial news articles matched your active holdings or query.',
      };
    }

    const sources: AIChatSource[] = [];
    const textLines: string[] = [];

    for (const art of articles) {
      const provider = art.temporal_info?.provider_display_name || art.source_provider || 'Market Data Feed';
      let temporalNote = art.temporal_info?.delay_note;
      if (!temporalNote) {
        if (art.source_provider === 'marketaux') {
          temporalNote = 'Marketaux: Original publisher publication timestamp.';
        } else if (art.source_provider === 'gdelt') {
          temporalNote = 'GDELT: Indexing and automated discovery timestamp (may differ slightly from publisher release).';
        } else if (art.source_provider === 'newsdata') {
          temporalNote = 'NewsData.io: Reflects approximate 12-hour delayed free-feed access tier.';
        } else {
          temporalNote = 'Verified news feed timestamp.';
        }
      }

      sources.push({
        id: `src-news-${art.article_id}`,
        title: art.title,
        url: art.link,
        publisher: art.source_name || 'Financial News',
        timestamp: art.pubDate,
        sourceCategory: 'news',
        dataFreshness: art.temporal_info?.freshness_label || 'Recent',
        temporalNote,
        relevantHolding: symbols.find((s) => art.title.toUpperCase().includes(s)) || undefined,
      });

      textLines.push(
        `• "${art.title}" (${art.source_name}, ${art.pubDate ? new Date(art.pubDate).toLocaleDateString('en-IN') : 'Recent'})\n  Source link: ${art.link}\n  Provider: ${provider} (${temporalNote})\n  Summary: ${art.description || 'No snippet available.'}`
      );
    }

    return {
      sources,
      summaryText: textLines.join('\n\n'),
    };
  } catch {
    return {
      sources: [],
      summaryText: 'News service temporarily unreachable. General market intelligence available without live headlines.',
    };
  }
}

/**
 * Resolve Future Lab simulation scenario
 */
export function resolveFutureLabSimulationContext(
  holdings: HoldingWithMetrics[],
  brokers: BrokerAccount[],
  query: string
): {
  simulation?: WhatIfSimulationResult;
  snapshot?: SimulationSnapshot;
  sources: AIChatSource[];
  summaryText: string;
} {
  const lower = query.toLowerCase();

  // Check strategy template mentions
  let matchedStrategy: StrategyId | null = null;
  if (lower.includes('conservative')) matchedStrategy = 'conservative';
  else if (lower.includes('balanced')) matchedStrategy = 'balanced';
  else if (lower.includes('aggressive')) matchedStrategy = 'aggressive';

  // Check additional contribution amount (e.g. ₹50,000, 50,000, 1,00,000, 100000, 50000)
  const amountMatch = query.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]{4,8})/i);
  let additionalContribution = 0;
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/,/g, '');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed >= 1000) {
      additionalContribution = parsed;
    }
  }

  // If user asks about strategy without specifying contribution, simulate ₹50,000 or baseline
  if (matchedStrategy || additionalContribution > 0) {
    const template = matchedStrategy ? STRATEGY_TEMPLATES[matchedStrategy] : STRATEGY_TEMPLATES.balanced;
    const simAmount = additionalContribution > 0 ? additionalContribution : 50000;

    try {
      const sim = runWhatIfSimulation(holdings, brokers, {
        scenarioType: 'NEW_CONTRIBUTION',
        additionalContribution: simAmount,
        targetPercentages: template.allocations,
      });

      const equityAlloc = sim.assetClassAllocations.find((a) => a.assetClass === 'equity' || a.assetClass === 'mf');
      const bondAlloc = sim.assetClassAllocations.find((a) => a.assetClass === 'bond');
      const goldAlloc = sim.assetClassAllocations.find((a) => a.assetClass === 'sgb');

      const snapshot: SimulationSnapshot = {
        scenarioTitle: `${template.name} Simulation (+₹${simAmount.toLocaleString('en-IN')})`,
        simulatedCapital: sim.simulatedSummary.totalSimulatedCapital,
        additionalContribution: simAmount,
        equityPct: equityAlloc ? equityAlloc.simulatedPercent : template.equityExposurePct,
        bondPct: bondAlloc ? bondAlloc.simulatedPercent : template.defensiveExposurePct,
        goldPct: goldAlloc ? goldAlloc.simulatedPercent : template.goldExposurePct,
        keyTakeaway: sim.educationalScenarioSummary.keyTakeaway,
      };

      const sources: AIChatSource[] = [
        {
          id: 'src-future-lab-sim',
          title: `Future Lab Deterministic Scenario Simulator (${template.name})`,
          url: '/future-lab',
          publisher: 'FINOVA Future Lab Engine',
          timestamp: new Date().toISOString(),
          sourceCategory: 'future_lab',
          dataFreshness: 'Calculated Real-Time',
          temporalNote: 'Deterministic scenario simulation assuming 0% market return to isolate pure asset allocation effects. Not a trade order or future return guarantee.',
        },
      ];

      const lines = [
        `SIMULATION RESULTS (${template.name}):`,
        `• Additional Contribution: ₹${simAmount.toLocaleString('en-IN')}`,
        `• Total Simulated Portfolio Value: ₹${sim.simulatedSummary.totalSimulatedCapital.toLocaleString('en-IN')}`,
        `• Strategy Template Allocations: Fixed Income (${template.allocations.bond}%), Mutual Funds (${template.allocations.mf}%), Gold/SGB (${template.allocations.sgb}%), ETFs (${template.allocations.etf}%)`,
        `• Risk & Volatility Character: ${template.volatilityDescription}`,
        `• Guaranteed Returns: None (strictly an educational asset allocation model)`,
        `• Key Takeaway: ${sim.educationalScenarioSummary.keyTakeaway}`,
      ];

      return {
        simulation: sim,
        snapshot,
        sources,
        summaryText: lines.join('\n'),
      };
    } catch {
      // Return strategy template summary if simulation fails
    }
  }

  // Return strategy template descriptions if mentioned
  if (matchedStrategy) {
    const template = STRATEGY_TEMPLATES[matchedStrategy];
    return {
      sources: [
        {
          id: `src-strategy-${matchedStrategy}`,
          title: `Future Lab Strategy: ${template.name}`,
          url: '/future-lab',
          publisher: 'FINOVA Future Lab Engine',
          timestamp: new Date().toISOString(),
          sourceCategory: 'future_lab',
          dataFreshness: 'Static Template',
          temporalNote: 'Standard asset allocation template with zero performance guarantees.',
        },
      ],
      summaryText: `${template.name}: ${template.description}\nTarget mix: Fixed Income ${template.allocations.bond}%, Mutual Funds ${template.allocations.mf}%, Gold ${template.allocations.sgb}%, ETFs ${template.allocations.etf}%.\nVolatility profile: ${template.volatilityDescription}`,
    };
  }

  return { sources: [], summaryText: '' };
}

/**
 * Main Question-Aware Context Dispatcher (Section 16: Smart Context Selection)
 */
export async function resolveQuestionContext(
  query: string,
  userId: string
): Promise<ResolvedChatContext> {
  const lower = query.toLowerCase();
  const sources: AIChatSource[] = [];
  const metadata: AIChatMessageMetadata = {};
  const promptParts: string[] = [];

  // Determine intent
  const isPortfolioQuery =
    lower.includes('my portfolio') ||
    lower.includes('my stock') ||
    lower.includes('my holding') ||
    lower.includes('concentration') ||
    lower.includes('diversif') ||
    lower.includes('hhi') ||
    lower.includes('risk radar') ||
    lower.includes('x-ray') ||
    lower.includes('xray') ||
    lower.includes('my sector') ||
    lower.includes('broker') ||
    lower.includes('risky') ||
    lower.includes('p&l') ||
    lower.includes('return') ||
    lower.includes('largest holding') ||
    lower.includes('priced') ||
    lower.includes('unquoted');

  const symbolsMentioned = extractSymbolsFromQuery(query);
  const isStockQuery = symbolsMentioned.length > 0 || lower.includes('compare ') || lower.includes('pe ratio') || lower.includes('market cap');
  const isNewsQuery = lower.includes('news') || lower.includes('headlines') || lower.includes('happening with') || lower.includes('recent events');
  const isSimulationQuery = lower.includes('invest another') || lower.includes('future lab') || lower.includes('what happens if i invest') || lower.includes('conservative') || lower.includes('balanced') || lower.includes('aggressive strategy');
  const isEducationQuery = lower.includes('what are reit') || lower.includes('what is invit') || lower.includes('sebi') || lower.includes('rebalancing') || lower.includes('sgb');

  let intent: ResolvedChatContext['intent'] = 'general';
  if (isPortfolioQuery) intent = 'portfolio';
  else if (isStockQuery) intent = 'stock_research';
  else if (isNewsQuery) intent = 'news';
  else if (isSimulationQuery) intent = 'future_lab';
  else if (isEducationQuery) intent = 'education';

  // 1. Resolve Portfolio Context if portfolio-related OR if simulation/news queries need user holdings
  let portfolioResult: { holdings: HoldingWithMetrics[]; brokers: BrokerAccount[]; error?: string } = {
    holdings: [],
    brokers: [],
  };

  if (isPortfolioQuery || isSimulationQuery || (isNewsQuery && lower.includes('my holdings'))) {
    portfolioResult = await resolveAuthenticatedUserHoldings(userId);

    if (portfolioResult.error) {
      promptParts.push(`[PORTFOLIO ACCESS STATUS]: ${portfolioResult.error}`);
    } else if (portfolioResult.holdings.length === 0) {
      promptParts.push('[PORTFOLIO STATUS]: The user currently has 0 recorded holdings. Inform them that their portfolio is empty, and provide educational context or invite them to add holdings or research stocks.');
    } else {
      const xray: UnifiedXRayAnalysis = computeUnifiedXRay(portfolioResult.holdings, portfolioResult.brokers);
      const riskRadar: SmartRiskRadarAnalysis = computeSmartRiskRadar(portfolioResult.holdings, portfolioResult.brokers);

      const topInst = xray.consolidated_instruments[0];
      const topHoldingName = topInst ? `${topInst.symbol} (${topInst.name})` : 'None';
      const topHoldingWeight = topInst ? topInst.percentage_of_valued_portfolio : 0;

      metadata.portfolioMetrics = {
        totalInvested: xray.summary.total_invested_capital,
        currentValuation: xray.summary.market_valued_capital,
        pnl: xray.summary.valued_subset_unrealized_pnl,
        pnlPct: xray.summary.valued_subset_unrealized_pnl_pct,
        topHolding: topHoldingName,
        topHoldingWeight,
        riskLabel: riskRadar.baseMetrics.risk_label,
        riskScore: riskRadar.baseMetrics.risk_score,
        quoteCoveragePct: xray.summary.quote_coverage_pct,
        hhi: xray.summary.hhi,
        brokerCount: xray.summary.tracked_brokers_count,
        holdingCount: portfolioResult.holdings.length,
        unpricedCount: xray.summary.unpriced_positions_count,
      };

      // Add portfolio source citations
      sources.push({
        id: 'src-portfolio-xray',
        title: 'Unified Investment X-Ray (Canonical Ledger)',
        url: '/xray',
        publisher: 'FINOVA Investment X-Ray',
        timestamp: new Date().toISOString(),
        sourceCategory: 'xray',
        dataFreshness: xray.summary.quote_coverage_pct === 100 ? '100% Quote Coverage' : `${xray.summary.quote_coverage_pct}% Quoted`,
        temporalNote: xray.summary.is_valuation_complete
          ? 'Full market valuation available across all portfolio positions.'
          : `Partial valuation: ${xray.summary.unpriced_positions_count} unpriced holding(s) excluded from market current values.`,
      });

      sources.push({
        id: 'src-portfolio-risk',
        title: `Smart Risk Radar (Screening Score: ${riskRadar.baseMetrics.risk_score}/100, ${riskRadar.baseMetrics.risk_label})`,
        url: '/risk-radar',
        publisher: 'FINOVA Risk Radar',
        timestamp: new Date().toISOString(),
        sourceCategory: 'risk_radar',
        dataFreshness: 'Real-time Deterministic Calculation',
        temporalNote: 'Educational screening score based on HHI, single-stock concentration, sector tilts, and asset class weights. Not a prediction of future losses.',
      });

      // Format grounded portfolio metrics for LLM
      promptParts.push(`[VERIFIED USER PORTFOLIO CONTEXT]:
• Total Invested Capital: ₹${xray.summary.total_invested_capital.toLocaleString('en-IN')}
• Market Valued Capital: ${xray.summary.market_valued_capital !== null ? `₹${xray.summary.market_valued_capital.toLocaleString('en-IN')}` : 'Unavailable'}
• Valued-Subset Unrealized P&L: ${xray.summary.valued_subset_unrealized_pnl !== null ? `₹${xray.summary.valued_subset_unrealized_pnl.toLocaleString('en-IN')} (${xray.summary.valued_subset_unrealized_pnl_pct?.toFixed(2)}%)` : 'Unavailable'}
• Quote Coverage: ${xray.summary.quote_coverage_pct}% (${xray.summary.priced_positions_count} priced, ${xray.summary.unpriced_positions_count} unpriced positions)
• Total Positions: ${portfolioResult.holdings.length} across ${xray.summary.tracked_brokers_count} broker account(s)
• Largest Consolidated Holding: ${topHoldingName} at ${topHoldingWeight.toFixed(1)}% of valued portfolio
• Concentration (HHI): ${xray.summary.hhi.toLocaleString('en-IN')} (${xray.summary.hhi_label})
• Top Sector Exposure: ${xray.summary.top_sector || 'Unclassified'} (${xray.summary.top_sector_weight.toFixed(1)}%)
• Risk Radar Classification: ${riskRadar.baseMetrics.risk_label} (Score: ${riskRadar.baseMetrics.risk_score} / 100)
• Cross-Broker Overlaps: ${xray.summary.cross_broker_overlaps_count} overlap(s) totalling ₹${xray.summary.cross_broker_overlap_value.toLocaleString('en-IN')}
• Top Holdings Detail:
${xray.consolidated_instruments.slice(0, 5).map((inst) => `  - ${inst.symbol} (${inst.name}): Invested ₹${inst.total_invested_value.toLocaleString('en-IN')}, Current: ${inst.current_value !== null ? `₹${inst.current_value.toLocaleString('en-IN')}` : 'Unpriced'}, Weight: ${inst.percentage_of_valued_portfolio.toFixed(1)}%, Brokers: ${inst.broker_names.join(', ')}`).join('\n')}
• Valuation Completeness Notice: ${xray.summary.valuation_completeness_message}`);
    }
  }

  // 2. Resolve Stock Comparison / Research Context
  if (isStockQuery && symbolsMentioned.length > 0) {
    const stockRes = await resolveStockComparisonContext(symbolsMentioned);
    if (stockRes.snapshots.length > 0) {
      metadata.stockComparison = stockRes.snapshots;
      sources.push(...stockRes.sources);
      promptParts.push(`[VERIFIED MARKET DATA FOR EQUITIES]:\n${stockRes.summaryText}`);
    }
  }

  // 3. Resolve Financial News Context
  if (isNewsQuery) {
    const newsSymbols = symbolsMentioned.length > 0
      ? symbolsMentioned
      : portfolioResult.holdings.map((h) => h.symbol).slice(0, 3);
    const newsRes = await resolveNewsContext(newsSymbols);
    if (newsRes.sources.length > 0) {
      sources.push(...newsRes.sources);
      promptParts.push(`[VERIFIED MULTI-PROVIDER FINANCIAL NEWS]:\n${newsRes.summaryText}`);
    }
  }

  // 4. Resolve Future Lab Simulator Context
  if (isSimulationQuery) {
    const futureLabRes = resolveFutureLabSimulationContext(
      portfolioResult.holdings,
      portfolioResult.brokers,
      query
    );
    if (futureLabRes.summaryText) {
      if (futureLabRes.snapshot) {
        metadata.simulationResult = futureLabRes.snapshot;
      }
      sources.push(...futureLabRes.sources);
      promptParts.push(`[FUTURE LAB DETERMINISTIC SIMULATION]:\n${futureLabRes.summaryText}`);
    }
  }

  // 5. Educational and SEBI Guidance Notes
  if (isEducationQuery || lower.includes('sebi') || lower.includes('reit') || lower.includes('invit')) {
    sources.push({
      id: 'src-sebi-reg-ed',
      title: 'SEBI (Securities and Exchange Board of India) Regulatory Framework',
      url: 'https://www.sebi.gov.in',
      publisher: 'SEBI / Indian Securities Regulations',
      timestamp: new Date().toISOString(),
      sourceCategory: 'sebi',
      dataFreshness: 'Statutory Guidelines',
      temporalNote: 'General regulatory education. For specific legal or tax compliance, consult qualified professionals.',
    });
    promptParts.push(`[EDUCATIONAL CONCEPTS REFERENCE]:
• REITs (Real Estate Investment Trusts) & InvITs (Infrastructure Investment Trusts): SEBI-regulated trusts holding income-generating physical infrastructure/real estate. Distribute >= 90% net cash flow as dividends/interest. Traded on NSE/BSE.
• Herfindahl-Hirschman Index (HHI): Squaring market share/weight percentages (0 to 10,000 scale). < 1,500 indicates broad diversification; 1,500 - 2,500 indicates moderate concentration; > 2,500 signals high single-asset/sector concentration.
• SEBI Mutual Fund Categorization: Mandates standardized market-cap definitions (Top 100 = Large Cap, 101-250 = Mid Cap, 251+ = Small Cap) to prevent style drift.`);
  }

  const promptContextText = promptParts.join('\n\n');

  return {
    intent,
    promptContextText,
    sources,
    metadata,
    portfolioError: portfolioResult.error,
  };
}
