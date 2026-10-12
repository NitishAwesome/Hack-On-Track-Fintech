// ============================================================
// FINOVA — Innovation One: Unified Investment X-Ray Engine
// lib/calculations/xray.ts
//
// Consolidated cross-broker portfolio intelligence:
// - Multi-broker holding consolidation without mutating database rows
// - Conservative cross-broker overlap detection (ISIN primary, canonical symbol)
// - Confirmed vs. Ambiguous match distinction
// - Multi-dimensional exposure breakdown (Asset Class, Broker, Instrument, Sector)
// - Partial valuation & data completeness honesty
// ============================================================

import type {
  HoldingWithMetrics,
  BrokerAccount,
  AssetClass,
  Exchange,
  ObservedExposureRiskLabel,
} from '../../types/portfolio.ts';
import { roundCurrency, roundPercent, roundQuantity } from './portfolio.ts';
import { isPriceStale, buildRiskMetrics, computeHHI } from './risk.ts';
import { formatIndianCurrency } from '../utils.ts';

export type MatchConfidence = 'CONFIRMED' | 'AMBIGUOUS';
export type MatchBasis = 'ISIN' | 'CANONICAL_SYMBOL' | 'NAME_FALLBACK';

export interface BrokerHoldingContribution {
  broker_account_id: string;
  broker_name: string;
  holding_id: string;
  quantity: number;
  avg_buy_price: number;
  invested_value: number;
  current_price: number | null;
  current_value: number | null;
  share_of_instrument_pct: number;
}

export interface ConsolidatedInstrumentExposure {
  canonical_key: string;
  symbol: string;
  name: string;
  isin: string | null;
  asset_class: AssetClass;
  exchange: Exchange | null;
  sector: string | null;
  match_confidence: MatchConfidence;
  match_basis: MatchBasis;
  broker_count: number;
  broker_names: string[];
  total_quantity: number;
  total_invested_value: number;
  current_price: number | null;
  current_value: number | null;
  percentage_of_valued_portfolio: number;
  is_quoted: boolean;
  contributions: BrokerHoldingContribution[];
}

export interface CrossBrokerOverlapItem {
  canonical_key: string;
  symbol: string;
  name: string;
  isin: string | null;
  asset_class: AssetClass;
  broker_count: number;
  broker_names: string[];
  total_quantity: number;
  total_invested_value: number;
  current_price: number | null;
  current_value: number | null;
  percentage_of_valued_portfolio: number;
  match_confidence: MatchConfidence;
  match_basis: MatchBasis;
  brokers_breakdown: Array<{
    broker_name: string;
    broker_account_id: string;
    quantity: number;
    invested_value: number;
    current_value: number | null;
    share_of_instrument_pct: number;
  }>;
}

export interface RiskReductionAction {
  id: string;
  priority: 'HIGH_PRIORITY' | 'REVIEW' | 'EXPLORE_LEARN';
  priority_label: 'High Priority' | 'Review' | 'Explore / Learn';
  category: 'single_stock' | 'sector' | 'asset_class' | 'data_quality' | 'broker_overlap';
  title: string;
  observation: string;
  recommended_step: string;
  educational_link?: string;
  action_trigger: string;
}

export interface PortfolioInterpretation {
  composition_summary: string;
  strengths: string[];
  primary_concerns: string[];
  data_limitations: string[];
  research_priorities: string[];
}

export interface UnifiedXRayAnalysis {
  summary: {
    tracked_brokers_count: number;
    distinct_instruments_count: number;
    total_positions_count: number;
    total_invested_capital: number;
    market_valued_capital: number | null;
    valued_subset_invested_capital: number;
    valued_subset_unrealized_pnl: number | null;
    valued_subset_unrealized_pnl_pct: number | null;
    is_valuation_complete: boolean;
    valuation_completeness_message: string;
    priced_positions_count: number;
    unpriced_positions_count: number;
    quote_coverage_pct: number;
    unrealized_pnl: number | null;
    unrealized_pnl_pct: number | null;
    whole_portfolio_pnl: number | null;
    whole_portfolio_pnl_pct: number | null;
    cross_broker_overlaps_count: number;
    cross_broker_overlap_value: number;
    cross_broker_overlap_valued_pct: number;
    top_holding_name?: string;
    top_holding_symbol?: string;
    top_holding_weight: number;
    top_2_holdings_weight: number;
    top_3_holdings_weight: number;
    top_5_holdings_weight: number;
    hhi: number;
    hhi_label: 'Low Concentration' | 'Moderate Concentration' | 'High Concentration';
    risk_score: number;
    risk_label: 'Conservative' | 'Moderate' | 'Aggressive' | ObservedExposureRiskLabel;
    observed_exposure_label?: ObservedExposureRiskLabel;
    top_sector: string | null;
    top_sector_weight: number;
    top_asset_class: string;
    top_asset_class_weight: number;
    single_broker_notice?: string | null;
  };
  overlaps: CrossBrokerOverlapItem[];
  consolidated_instruments: ConsolidatedInstrumentExposure[];
  asset_class_breakdown: Array<{
    asset_class: AssetClass;
    display_name: string;
    invested_value: number;
    current_value: number | null;
    percentage_of_valued: number;
    distinct_instruments_count: number;
    positions_count: number;
  }>;
  broker_breakdown: Array<{
    broker_account_id: string;
    broker_name: string;
    color_hex: string;
    invested_value: number;
    current_value: number | null;
    percentage_of_valued: number;
    positions_count: number;
    distinct_instruments_count: number;
  }>;
  sector_breakdown: Array<{
    sector: string;
    invested_value: number;
    current_value: number | null;
    percentage_of_valued: number;
    instruments_count: number;
    is_classified: boolean;
    largest_holding?: {
      symbol: string;
      name: string;
      value: number | null;
    } | null;
    concentration_observation?: string;
    constituent_symbols: string[];
  }>;
  data_quality: {
    total_positions: number;
    quoted_positions: number;
    unquoted_positions: number;
    stale_quotes_count: number;
    positions_without_isin: number;
    positions_unclassified_sector: number;
    positions_without_cost_basis: number;
    quote_coverage_pct: number;
    is_fully_reliable: boolean;
    freshness_note: string;
  };
  risk_reduction_actions: RiskReductionAction[];
  portfolio_interpretation: PortfolioInterpretation;
  alternatives_breakdown?: AlternativeHoldingsAnalysis;
}

export interface AlternativeHoldingsAnalysis {
  has_alternatives: boolean;
  total_alternatives_invested: number;
  total_alternatives_value: number | null;
  alternatives_percentage_of_valued: number;
  reits_invits: {
    total_invested: number;
    total_current_value: number | null;
    combined_weight_pct: number;
    trusts_count: number;
    trusts: Array<{
      canonical_key: string;
      symbol: string;
      name: string;
      asset_class: 'reit' | 'invit';
      invested_value: number;
      current_value: number | null;
      percentage_of_valued: number;
      is_quoted: boolean;
      distribution_info: string;
    }>;
  };
  bonds: {
    total_invested: number;
    total_current_value: number | null;
    bond_portfolio_weight_pct: number;
    positions_count: number;
    priced_positions_count: number;
    unpriced_positions_count: number;
    pricing_liquidity_warning: string | null;
    estimated_annual_coupon_income: number | null;
    issuer_concentration: Array<{
      issuer: string;
      invested_value: number;
      current_value: number | null;
      percentage_of_valued: number;
    }>;
    credit_rating_distribution: Array<{
      rating_tier: string;
      invested_value: number;
      current_value: number | null;
      percentage_of_valued: number;
    }>;
    maturity_ladder: {
      under_3_years: { value: number; percentage: number; count: number };
      three_to_seven_years: { value: number; percentage: number; count: number };
      over_seven_years: { value: number; percentage: number; count: number };
      unspecified: { value: number; percentage: number; count: number };
    };
  };
}

/**
 * Normalizes an Indian ticker symbol by stripping standard exchange suffixes
 */
export function normalizeSymbol(rawSymbol: string): string {
  if (!rawSymbol) return '';
  return rawSymbol
    .trim()
    .toUpperCase()
    .replace(/\.(NS|BO|BSE|NSE)$/i, '')
    .replace(/-EQ$/i, '');
}

/**
 * Derives a canonical instrument key to safely group across brokers without falsely merging
 * unrelated securities.
 */
export function deriveCanonicalKey(holding: HoldingWithMetrics): {
  key: string;
  confidence: MatchConfidence;
  basis: MatchBasis;
} {
  const isin = holding.isin?.trim().toUpperCase();
  if (isin && isin.length === 12 && /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) {
    return {
      key: `ISIN:${isin}`,
      confidence: 'CONFIRMED',
      basis: 'ISIN',
    };
  }

  const cleanSym = normalizeSymbol(holding.symbol);
  if (cleanSym) {
    const exchange = holding.exchange || 'NSE';
    const assetClass = holding.asset_class || 'equity';
    // If ISIN is absent, group by normalized symbol + asset class + exchange
    return {
      key: `SYM:${cleanSym}:${assetClass}:${exchange}`,
      confidence: 'CONFIRMED',
      basis: 'CANONICAL_SYMBOL',
    };
  }

  // Fallback for custom instruments lacking valid ticker
  const cleanName = (holding.name || 'UNKNOWN')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return {
    key: `NAME:${cleanName}`,
    confidence: 'AMBIGUOUS',
    basis: 'NAME_FALLBACK',
  };
}

const ASSET_CLASS_DISPLAY_NAMES: Record<string, string> = {
  equity: 'Equity & Shares',
  etf: 'Exchange Traded Funds',
  mf: 'Mutual Funds',
  reit: 'Real Estate Investment Trusts (REITs)',
  invit: 'Infrastructure Investment Trusts (InvITs)',
  bond: 'Bonds & Debentures',
  sgb: 'Sovereign Gold Bonds',
  gold: 'Gold & Commodities',
  cash: 'Cash & Equivalents',
  other: 'Alternative Assets',
};

/**
 * Computes the complete Unified Investment X-Ray analysis.
 * Deterministic, decimal-safe, zero side-effects on underlying database.
 */
export function computeUnifiedXRay(
  holdings: HoldingWithMetrics[],
  brokerAccounts: BrokerAccount[] = []
): UnifiedXRayAnalysis {
  const brokerNameMap = new Map<string, { name: string; color: string }>();
  for (const b of brokerAccounts) {
    brokerNameMap.set(b.id, {
      name: b.broker_name || b.display_name || b.account_label || 'Broker Account',
      color: b.color_hex || '#3B82F6',
    });
  }

  // 1. Group holdings into consolidated instruments
  const groupingMap = new Map<
    string,
    {
      canonical_key: string;
      symbol: string;
      name: string;
      isin: string | null;
      asset_class: AssetClass;
      exchange: Exchange | null;
      sector: string | null;
      match_confidence: MatchConfidence;
      match_basis: MatchBasis;
      holdings: HoldingWithMetrics[];
    }
  >();

  for (const h of holdings) {
    const { key, confidence, basis } = deriveCanonicalKey(h);
    if (!groupingMap.has(key)) {
      groupingMap.set(key, {
        canonical_key: key,
        symbol: normalizeSymbol(h.symbol) || h.symbol,
        name: h.name || h.symbol,
        isin: h.isin || null,
        asset_class: h.asset_class || 'equity',
        exchange: h.exchange || null,
        sector: h.sector || null,
        match_confidence: confidence,
        match_basis: basis,
        holdings: [],
      });
    }

    const entry = groupingMap.get(key)!;
    entry.holdings.push(h);

    // Prefer non-null ISIN, sector or descriptive name if already discovered
    if (!entry.isin && h.isin) entry.isin = h.isin;
    if (!entry.sector && h.sector) entry.sector = h.sector;
    if (entry.name === entry.symbol && h.name && h.name !== h.symbol) entry.name = h.name;
    if (basis === 'ISIN') {
      entry.match_confidence = 'CONFIRMED';
      entry.match_basis = 'ISIN';
    }
  }

  // 2. Compute total portfolio valuation figures
  let totalInvested = 0;
  let valuedSubsetInvested = 0;
  let totalValuedMarket = 0;
  let hasAnyPriced = false;
  let pricedPositionsCount = 0;
  let unpricedPositionsCount = 0;
  let staleQuotesCount = 0;
  let positionsWithoutIsin = 0;
  let positionsUnclassifiedSector = 0;
  let positionsWithoutCostBasis = 0;

  for (const h of holdings) {
    totalInvested += h.invested_value;
    if (h.invested_value <= 0 || h.avg_buy_price <= 0) {
      positionsWithoutCostBasis += 1;
    }

    if (typeof h.current_price === 'number' && h.current_price > 0 && h.current_value !== null) {
      hasAnyPriced = true;
      totalValuedMarket += h.current_value;
      valuedSubsetInvested += h.invested_value;
      pricedPositionsCount += 1;
    } else {
      unpricedPositionsCount += 1;
    }

    if (isPriceStale(h.price_updated_at)) {
      staleQuotesCount += 1;
    }

    if (!h.isin || h.isin.trim() === '') {
      positionsWithoutIsin += 1;
    }

    if (!h.sector || h.sector.trim() === '' || h.sector.toLowerCase() === 'unclassified') {
      positionsUnclassifiedSector += 1;
    }
  }

  totalInvested = roundCurrency(totalInvested);
  valuedSubsetInvested = roundCurrency(valuedSubsetInvested);
  const marketValuedCapital = hasAnyPriced ? roundCurrency(totalValuedMarket) : null;
  const quoteCoveragePct =
    holdings.length > 0 ? roundPercent((pricedPositionsCount / holdings.length) * 100) : 0;
  const isValuationComplete = holdings.length > 0 && unpricedPositionsCount === 0;

  // Partial valuation correctness: P&L is calculated strictly across the valued subset
  const unrealizedPnL =
    hasAnyPriced && marketValuedCapital !== null
      ? roundCurrency(marketValuedCapital - valuedSubsetInvested)
      : null;

  const unrealizedPnLPct =
    unrealizedPnL !== null && valuedSubsetInvested > 0
      ? roundPercent((unrealizedPnL / valuedSubsetInvested) * 100)
      : null;

  const wholePortfolioPnL = isValuationComplete ? unrealizedPnL : null;
  const wholePortfolioPnLPct = isValuationComplete ? unrealizedPnLPct : null;

  const valuationCompletenessMessage = isValuationComplete
    ? 'Complete portfolio valuation active across 100% of holdings.'
    : hasAnyPriced
    ? `Unrealized P&L calculated for ${pricedPositionsCount} of ${holdings.length} valued positions. Complete portfolio valuation unavailable.`
    : 'No active market quotes available. Valuation and unrealized P&L cannot be computed.';

  // 3. Build consolidated instruments list
  const consolidatedInstruments: ConsolidatedInstrumentExposure[] = [];
  const overlapsList: CrossBrokerOverlapItem[] = [];
  let crossBrokerOverlapValuedTotal = 0;

  for (const entry of groupingMap.values()) {
    let instQuantity = 0;
    let instInvested = 0;
    let instValued: number | null = null;
    let latestPrice: number | null = null;
    const distinctBrokers = new Set<string>();
    const brokerNamesList: string[] = [];

    // Find reliable price among constituent holdings
    for (const h of entry.holdings) {
      if (typeof h.current_price === 'number' && h.current_price > 0) {
        latestPrice = h.current_price;
        break;
      }
    }

    // Accumulate quantities and invested value
    for (const h of entry.holdings) {
      const q = roundQuantity(h.quantity);
      instQuantity += q;
      instInvested += h.invested_value;

      const brokerId = h.broker_account_id || 'unassigned';
      distinctBrokers.add(brokerId);

      const bMeta = brokerNameMap.get(brokerId);
      const bName =
        bMeta?.name ||
        h.broker_account?.broker_name ||
        h.broker_account?.account_label ||
        'Direct / Manual';

      if (!brokerNamesList.includes(bName)) {
        brokerNamesList.push(bName);
      }
    }

    instQuantity = roundQuantity(instQuantity);
    instInvested = roundCurrency(instInvested);

    if (latestPrice !== null && latestPrice > 0) {
      instValued = roundCurrency(instQuantity * latestPrice);
    }

    const portfolioSharePct =
      instValued !== null && marketValuedCapital && marketValuedCapital > 0
        ? roundPercent((instValued / marketValuedCapital) * 100)
        : 0;

    // Build broker contributions
    const contributions: BrokerHoldingContribution[] = entry.holdings.map((h) => {
      const brokerId = h.broker_account_id || 'unassigned';
      const bMeta = brokerNameMap.get(brokerId);
      const bName =
        bMeta?.name ||
        h.broker_account?.broker_name ||
        h.broker_account?.account_label ||
        'Direct / Manual';

      const hCurrentVal =
        latestPrice !== null ? roundCurrency(h.quantity * latestPrice) : null;
      const shareOfInst =
        instInvested > 0 ? roundPercent((h.invested_value / instInvested) * 100) : 0;

      return {
        broker_account_id: brokerId,
        broker_name: bName,
        holding_id: h.id,
        quantity: roundQuantity(h.quantity),
        avg_buy_price: roundCurrency(h.avg_buy_price),
        invested_value: roundCurrency(h.invested_value),
        current_price: latestPrice,
        current_value: hCurrentVal,
        share_of_instrument_pct: shareOfInst,
      };
    });

    const consolidatedItem: ConsolidatedInstrumentExposure = {
      canonical_key: entry.canonical_key,
      symbol: entry.symbol,
      name: entry.name,
      isin: entry.isin,
      asset_class: entry.asset_class,
      exchange: entry.exchange,
      sector: entry.sector,
      match_confidence: entry.match_confidence,
      match_basis: entry.match_basis,
      broker_count: distinctBrokers.size,
      broker_names: brokerNamesList,
      total_quantity: instQuantity,
      total_invested_value: instInvested,
      current_price: latestPrice,
      current_value: instValued,
      percentage_of_valued_portfolio: portfolioSharePct,
      is_quoted: instValued !== null,
      contributions,
    };

    consolidatedInstruments.push(consolidatedItem);

    // Cross-broker overlap check: instrument appears in > 1 broker accounts
    if (distinctBrokers.size > 1) {
      if (instValued !== null) {
        crossBrokerOverlapValuedTotal += instValued;
      }

      overlapsList.push({
        canonical_key: entry.canonical_key,
        symbol: entry.symbol,
        name: entry.name,
        isin: entry.isin,
        asset_class: entry.asset_class,
        broker_count: distinctBrokers.size,
        broker_names: brokerNamesList,
        total_quantity: instQuantity,
        total_invested_value: instInvested,
        current_price: latestPrice,
        current_value: instValued,
        percentage_of_valued_portfolio: portfolioSharePct,
        match_confidence: entry.match_confidence,
        match_basis: entry.match_basis,
        brokers_breakdown: contributions.map((c) => ({
          broker_name: c.broker_name,
          broker_account_id: c.broker_account_id,
          quantity: c.quantity,
          invested_value: c.invested_value,
          current_value: c.current_value,
          share_of_instrument_pct: c.share_of_instrument_pct,
        })),
      });
    }
  }

  // Sort instruments descending by valued current value, then by invested value
  consolidatedInstruments.sort((a, b) => {
    if (a.current_value !== null && b.current_value !== null) {
      return b.current_value - a.current_value;
    }
    if (a.current_value !== null) return -1;
    if (b.current_value !== null) return 1;
    return b.total_invested_value - a.total_invested_value;
  });

  // Sort overlaps descending by value
  overlapsList.sort((a, b) => {
    if (a.current_value !== null && b.current_value !== null) {
      return b.current_value - a.current_value;
    }
    return b.total_invested_value - a.total_invested_value;
  });

  const crossBrokerOverlapValuedPct =
    marketValuedCapital && marketValuedCapital > 0
      ? roundPercent((crossBrokerOverlapValuedTotal / marketValuedCapital) * 100)
      : 0;

  // 4. Asset class multi-dimensional breakdown
  const assetClassMap = new Map<
    AssetClass,
    {
      invested: number;
      valued: number;
      hasValued: boolean;
      distinctKeys: Set<string>;
      positionsCount: number;
    }
  >();

  for (const inst of consolidatedInstruments) {
    if (!assetClassMap.has(inst.asset_class)) {
      assetClassMap.set(inst.asset_class, {
        invested: 0,
        valued: 0,
        hasValued: false,
        distinctKeys: new Set(),
        positionsCount: 0,
      });
    }
    const ac = assetClassMap.get(inst.asset_class)!;
    ac.invested += inst.total_invested_value;
    ac.distinctKeys.add(inst.canonical_key);
    ac.positionsCount += inst.contributions.length;
    if (inst.current_value !== null) {
      ac.valued += inst.current_value;
      ac.hasValued = true;
    }
  }

  const assetClassBreakdown = Array.from(assetClassMap.entries())
    .map(([cls, data]) => {
      const currentVal = data.hasValued ? roundCurrency(data.valued) : null;
      const sharePct =
        currentVal !== null && marketValuedCapital && marketValuedCapital > 0
          ? roundPercent((currentVal / marketValuedCapital) * 100)
          : 0;

      return {
        asset_class: cls || 'equity',
        display_name: (cls && ASSET_CLASS_DISPLAY_NAMES[cls]) || (cls ? cls.toUpperCase() : 'Direct Equities'),
        invested_value: roundCurrency(data.invested),
        current_value: currentVal,
        percentage_of_valued: sharePct,
        distinct_instruments_count: data.distinctKeys.size,
        positions_count: data.positionsCount,
      };
    })
    .sort((a, b) => (b.current_value ?? b.invested_value) - (a.current_value ?? a.invested_value));

  // 5. Broker account exposure breakdown
  const brokerExposureMap = new Map<
    string,
    {
      name: string;
      color: string;
      invested: number;
      valued: number;
      hasValued: boolean;
      distinctKeys: Set<string>;
      positionsCount: number;
    }
  >();

  for (const inst of consolidatedInstruments) {
    for (const c of inst.contributions) {
      if (!brokerExposureMap.has(c.broker_account_id)) {
        const bMeta = brokerNameMap.get(c.broker_account_id);
        brokerExposureMap.set(c.broker_account_id, {
          name: c.broker_name,
          color: bMeta?.color || '#3B82F6',
          invested: 0,
          valued: 0,
          hasValued: false,
          distinctKeys: new Set(),
          positionsCount: 0,
        });
      }
      const bExp = brokerExposureMap.get(c.broker_account_id)!;
      bExp.invested += c.invested_value;
      bExp.distinctKeys.add(inst.canonical_key);
      bExp.positionsCount += 1;
      if (c.current_value !== null) {
        bExp.valued += c.current_value;
        bExp.hasValued = true;
      }
    }
  }

  const brokerBreakdown = Array.from(brokerExposureMap.entries())
    .map(([brokerId, data]) => {
      const currentVal = data.hasValued ? roundCurrency(data.valued) : null;
      const sharePct =
        currentVal !== null && marketValuedCapital && marketValuedCapital > 0
          ? roundPercent((currentVal / marketValuedCapital) * 100)
          : 0;

      return {
        broker_account_id: brokerId,
        broker_name: data.name,
        color_hex: data.color,
        invested_value: roundCurrency(data.invested),
        current_value: currentVal,
        percentage_of_valued: sharePct,
        positions_count: data.positionsCount,
        distinct_instruments_count: data.distinctKeys.size,
      };
    })
    .sort((a, b) => (b.current_value ?? b.invested_value) - (a.current_value ?? a.invested_value));

  // 6. Sector breakdown (honestly separating classified from unclassified)
  const sectorMap = new Map<
    string,
    {
      invested: number;
      valued: number;
      hasValued: boolean;
      count: number;
      isClassified: boolean;
      constituentSymbols: string[];
      largestHolding: { symbol: string; name: string; value: number | null } | null;
    }
  >();

  for (const inst of consolidatedInstruments) {
    // Strictly adhere to PS2 Section 16: Do not force equity-specific sector analysis onto debt/bonds
    if (inst.asset_class === 'bond') {
      continue;
    }

    const rawSector = inst.sector?.trim();
    const isClassified = Boolean(
      rawSector && rawSector.length > 0 && rawSector.toLowerCase() !== 'unclassified'
    );
    const sectorName = isClassified ? rawSector! : 'Unclassified';

    if (!sectorMap.has(sectorName)) {
      sectorMap.set(sectorName, {
        invested: 0,
        valued: 0,
        hasValued: false,
        count: 0,
        isClassified,
        constituentSymbols: [],
        largestHolding: null,
      });
    }
    const sec = sectorMap.get(sectorName)!;
    sec.invested += inst.total_invested_value;
    sec.count += 1;
    sec.constituentSymbols.push(inst.symbol);

    if (inst.current_value !== null) {
      sec.valued += inst.current_value;
      sec.hasValued = true;
    }

    const instValue = inst.current_value ?? inst.total_invested_value;
    if (!sec.largestHolding || instValue > (sec.largestHolding.value ?? 0)) {
      sec.largestHolding = {
        symbol: inst.symbol,
        name: inst.name,
        value: inst.current_value,
      };
    }
  }

  const sectorBreakdown = Array.from(sectorMap.entries())
    .map(([sector, data]) => {
      const currentVal = data.hasValued ? roundCurrency(data.valued) : null;
      const sharePct =
        currentVal !== null && marketValuedCapital && marketValuedCapital > 0
          ? roundPercent((currentVal / marketValuedCapital) * 100)
          : 0;

      let concentrationObservation: string | undefined;
      if (sharePct >= 40) {
        concentrationObservation = `${sector} represents ${sharePct.toFixed(1)}% of your valued portfolio. An industry downturn could affect a large portion of your capital.`;
      } else if (sharePct >= 25) {
        concentrationObservation = `${sector} represents an elevated allocation (${sharePct.toFixed(1)}% of valued assets).`;
      }

      return {
        sector,
        invested_value: roundCurrency(data.invested),
        current_value: currentVal,
        percentage_of_valued: sharePct,
        instruments_count: data.count,
        is_classified: data.isClassified,
        largest_holding: data.largestHolding,
        concentration_observation: concentrationObservation,
        constituent_symbols: data.constituentSymbols,
      };
    })
    .sort((a, b) => {
      if (a.sector === 'Unclassified') return 1;
      if (b.sector === 'Unclassified') return -1;
      return (b.current_value ?? b.invested_value) - (a.current_value ?? a.invested_value);
    });

  // Tracked brokers count
  const distinctBrokerAccountsCount = new Set(
    holdings.map((h) => h.broker_account_id).filter(Boolean)
  ).size;

  // 7. Concentration Metrics & HHI (Defensible denominator: market valued capital if present, else invested)
  const valuationBase =
    marketValuedCapital && marketValuedCapital > 0 ? marketValuedCapital : totalInvested;
  const valuedInsts = consolidatedInstruments.filter(
    (i) => i.current_value !== null && i.current_value > 0
  );
  const targetInsts = valuedInsts.length > 0 ? valuedInsts : consolidatedInstruments;

  const top1Inst = targetInsts[0];
  const top1Val = top1Inst ? (top1Inst.current_value ?? top1Inst.total_invested_value) : 0;
  const topHoldingWeight =
    valuationBase > 0 ? roundPercent((top1Val / valuationBase) * 100) / 100 : 0;

  const top2Val = targetInsts
    .slice(0, 2)
    .reduce((sum, i) => sum + (i.current_value ?? i.total_invested_value), 0);
  const top2HoldingsWeight =
    valuationBase > 0 ? roundPercent((top2Val / valuationBase) * 100) / 100 : 0;

  const top3Val = targetInsts
    .slice(0, 3)
    .reduce((sum, i) => sum + (i.current_value ?? i.total_invested_value), 0);
  const top3HoldingsWeight =
    valuationBase > 0 ? roundPercent((top3Val / valuationBase) * 100) / 100 : 0;

  const top5Val = targetInsts
    .slice(0, 5)
    .reduce((sum, i) => sum + (i.current_value ?? i.total_invested_value), 0);
  const top5HoldingsWeight =
    valuationBase > 0 ? roundPercent((top5Val / valuationBase) * 100) / 100 : 0;

  const shares = targetInsts.map((i) => {
    const v = i.current_value ?? i.total_invested_value;
    return valuationBase > 0 ? v / valuationBase : 0;
  });
  const hhi = computeHHI(shares);
  const hhiLabel: 'Low Concentration' | 'Moderate Concentration' | 'High Concentration' =
    hhi < 0.15 ? 'Low Concentration' : hhi < 0.25 ? 'Moderate Concentration' : 'High Concentration';

  // 8. Shared Risk Screening Engine (guaranteeing X-Ray and Risk Radar never disagree)
  const riskMetrics = buildRiskMetrics(holdings);

  const topSector = riskMetrics.top_sector;
  const topSectorWeight = riskMetrics.top_sector_weight;
  const topAssetClass = riskMetrics.top_asset_class;
  const topAssetClassWeight = riskMetrics.top_asset_class_weight;

  const singleBrokerNotice =
    distinctBrokerAccountsCount <= 1
      ? 'Cross-broker overlap cannot be assessed across multiple accounts yet.'
      : null;

  const isFullyReliable =
    isValuationComplete && staleQuotesCount === 0 && positionsWithoutCostBasis === 0;

  const freshnessNote =
    unpricedPositionsCount > 0
      ? `${unpricedPositionsCount} holding(s) lack active price quotes.`
      : staleQuotesCount > 0
      ? `${staleQuotesCount} holding quote(s) are older than 48 hours. Valuations may reflect previous market closes or weekend pricing.`
      : 'All holding quotes are verified and updated within active market thresholds.';

  // 9. Generate Prioritized Risk-Reduction Actions (Phase 11)
  const riskReductionActions: RiskReductionAction[] = [];

  // Action 1: Single-stock concentration
  if (topHoldingWeight >= 0.35 && top1Inst) {
    const pctStr = (topHoldingWeight * 100).toFixed(1);
    riskReductionActions.push({
      id: 'act-single-stock',
      priority: 'HIGH_PRIORITY',
      priority_label: 'High Priority',
      category: 'single_stock',
      title: `Review Single-Stock Allocation (${top1Inst.name})`,
      observation: `${top1Inst.name} accounts for ${pctStr}% of your valued portfolio.`,
      recommended_step:
        'Review whether this position size aligns with your risk tolerance. Consider directing future capital toward broad index funds or complementary sectors to reduce single-company volatility.',
      action_trigger: `Single-stock concentration (${pctStr}%) exceeds conservative 35% screening threshold.`,
    });
  }

  // Action 2: Sector concentration
  if (topSectorWeight >= 0.40 && topSector) {
    const secPct = (topSectorWeight * 100).toFixed(1);
    riskReductionActions.push({
      id: 'act-sector-concentration',
      priority: 'REVIEW',
      priority_label: 'Review',
      category: 'sector',
      title: `Evaluate ${topSector} Sector Exposure`,
      observation: `${topSector} accounts for ${secPct}% of your valued investments.`,
      recommended_step:
        'Research diversification across economically distinct sectors (e.g. Healthcare, Consumer Goods, IT) rather than adding more stocks from the same sector.',
      educational_link: '/explore',
      action_trigger: `Sector concentration (${secPct}%) exceeds 40% threshold.`,
    });
  }

  // Action 3: Asset-class concentration (e.g. 100% equity)
  if (riskMetrics.equity_weight >= 0.90) {
    riskReductionActions.push({
      id: 'act-equity-only',
      priority: 'EXPLORE_LEARN',
      priority_label: 'Explore / Learn',
      category: 'asset_class',
      title: 'Explore Multi-Asset Allocation',
      observation: 'Your portfolio is invested almost entirely in equities, with no defensive fixed-income or gold buffers.',
      recommended_step:
        'Learn how non-correlated asset classes like Government Securities (Bonds), Sovereign Gold Bonds, and REITs can provide yield and cushion market pullbacks.',
      educational_link: '/bonds',
      action_trigger: '100% equity allocation with zero debt/hybrid asset exposure.',
    });
  }

  // Action 4: Incomplete Valuation
  if (unpricedPositionsCount > 0) {
    riskReductionActions.push({
      id: 'act-incomplete-valuation',
      priority: 'REVIEW',
      priority_label: 'Review',
      category: 'data_quality',
      title: 'Verify Quotes for Unpriced Positions',
      observation: `Current market quotes are unavailable for ${unpricedPositionsCount} holding(s).`,
      recommended_step:
        'Confirm active exchange ticker symbols and ensure symbols are correctly tagged before relying on overall P&L or asset weights.',
      educational_link: '/investments',
      action_trigger: `${unpricedPositionsCount} unquoted positions exclude partial assets from market valuation.`,
    });
  }

  // Action 5: Cross-broker overlap
  if (overlapsList.length > 0) {
    riskReductionActions.push({
      id: 'act-cross-broker-overlap',
      priority: 'REVIEW',
      priority_label: 'Review',
      category: 'broker_overlap',
      title: `Consolidate ${overlapsList.length} Overlapping Securities`,
      observation: `${overlapsList.length} security(ies) are held across multiple broker accounts, totaling ${formatIndianCurrency(crossBrokerOverlapValuedTotal)}.`,
      recommended_step:
        'Holding identical instruments across multiple brokers multiplies transaction and tracking overhead without adding true diversification.',
      educational_link: '/brokers',
      action_trigger: `${overlapsList.length} securities duplicated across multiple tracked brokers.`,
    });
  }

  // Default educational action if few triggers fired
  if (riskReductionActions.length < 3) {
    riskReductionActions.push({
      id: 'act-rebalance-discipline',
      priority: 'EXPLORE_LEARN',
      priority_label: 'Explore / Learn',
      category: 'single_stock',
      title: 'Establish Periodic Portfolio Review Cadence',
      observation: 'Disciplined review schedules ensure allocations remain aligned with your long-term goals.',
      recommended_step:
        'Schedule a quarterly portfolio check-in to verify that winners have not grown to dominate your risk budget without your deliberate choice.',
      educational_link: '/learn',
      action_trigger: 'Proactive portfolio maintenance best practice.',
    });
  }

  // 10. Generate Portfolio Interpretation (Phase 10: "Your Portfolio Explained")
  const classifiedSectorsCount = sectorBreakdown.filter((s) => s.is_classified).length;
  const assetClassesCount = assetClassBreakdown.length;

  const strengthsList: string[] = [];
  if (quoteCoveragePct === 100) {
    strengthsList.push('100% active price quote coverage across all portfolio holdings.');
  }
  if (distinctBrokerAccountsCount > 1 && overlapsList.length === 0) {
    strengthsList.push('Multi-broker setup with zero duplicate security overlap.');
  }
  if (classifiedSectorsCount >= 3) {
    strengthsList.push(`Broad economic representation across ${classifiedSectorsCount} classified sectors.`);
  }
  if (topHoldingWeight <= 0.20 && top1Inst) {
    strengthsList.push('Well-contained single-stock concentration (largest holding is under 20% of valued assets).');
  }
  if (assetClassesCount >= 2) {
    strengthsList.push(`Multi-asset diversification across ${assetClassesCount} distinct asset categories.`);
  }
  if (strengthsList.length === 0) {
    strengthsList.push('Holdings are clearly cataloged and tracked with known cost basis.');
  }

  const concernsList: string[] = [];
  if (topHoldingWeight >= 0.35 && top1Inst) {
    concernsList.push(`${top1Inst.name} dominates ${(topHoldingWeight * 100).toFixed(1)}% of valued capital.`);
  }
  if (topSectorWeight >= 0.40 && topSector) {
    concernsList.push(`${topSector} accounts for ${(topSectorWeight * 100).toFixed(1)}% of your investments.`);
  }
  if (riskMetrics.equity_weight >= 0.95) {
    concernsList.push('100% equity exposure with no fixed-income or defensive cushion.');
  }
  if (overlapsList.length > 0) {
    concernsList.push(`${overlapsList.length} duplicated securities held across multiple brokers.`);
  }
  if (concernsList.length === 0) {
    concernsList.push('No extreme concentration thresholds triggered; monitor position drift over time.');
  }

  const limitationsList: string[] = [];
  if (unpricedPositionsCount > 0) {
    limitationsList.push(`${unpricedPositionsCount} holding(s) lack active market quotes. Unrealized P&L represents only the valued subset.`);
  }
  if (staleQuotesCount > 0) {
    limitationsList.push(`${staleQuotesCount} quote(s) are older than 48 hours.`);
  }
  if (positionsWithoutIsin > 0) {
    limitationsList.push(`${positionsWithoutIsin} position(s) lack official ISIN identifiers.`);
  }
  if (positionsUnclassifiedSector > 0) {
    limitationsList.push(`${positionsUnclassifiedSector} position(s) lack industry sector classifications.`);
  }
  if (distinctBrokerAccountsCount <= 1) {
    limitationsList.push('Single broker account tracked: cross-broker overlap cannot be assessed across multiple accounts yet.');
  }

  const researchPrioritiesList: string[] = [];
  if (top1Inst) {
    researchPrioritiesList.push(`Monitor upcoming earnings and filings for top holding ${top1Inst.name} (${top1Inst.symbol}).`);
  }
  if (topSector) {
    researchPrioritiesList.push(`Assess macroeconomic policy and interest rate sensitivity for the ${topSector} sector.`);
  }
  if (unpricedPositionsCount > 0) {
    researchPrioritiesList.push('Obtain current market price quotes for unpriced positions.');
  }
  researchPrioritiesList.push('Review overall asset allocation against your stated investment horizon and risk budget.');

  // 8. Alternatives & Fixed-Income Breakdown (REITs, InvITs, and Bonds)
  const reitInvitList = consolidatedInstruments.filter(
    (i) => i.asset_class === 'reit' || i.asset_class === 'invit'
  );
  const bondList = consolidatedInstruments.filter((i) => i.asset_class === 'bond');
  const hasAlternatives = reitInvitList.length > 0 || bondList.length > 0;

  let totalAltsInvested = 0;
  let totalAltsValued: number | null = null;
  let hasAnyAltsValued = false;

  for (const inst of [...reitInvitList, ...bondList]) {
    totalAltsInvested += inst.total_invested_value;
    if (inst.current_value !== null) {
      hasAnyAltsValued = true;
      totalAltsValued = (totalAltsValued ?? 0) + inst.current_value;
    }
  }

  const altsPctOfValued =
    hasAnyAltsValued && marketValuedCapital && marketValuedCapital > 0
      ? roundPercent(((totalAltsValued ?? 0) / marketValuedCapital) * 100)
      : 0;

  // REITs & InvITs
  let reitInvitInvested = 0;
  let reitInvitValued: number | null = null;
  let hasReitValued = false;

  const trustBreakdown = reitInvitList.map((t) => {
    reitInvitInvested += t.total_invested_value;
    if (t.current_value !== null) {
      hasReitValued = true;
      reitInvitValued = (reitInvitValued ?? 0) + t.current_value;
    }
    const tWeight =
      t.current_value !== null && marketValuedCapital && marketValuedCapital > 0
        ? roundPercent((t.current_value / marketValuedCapital) * 100)
        : 0;

    return {
      canonical_key: t.canonical_key,
      symbol: t.symbol,
      name: t.name,
      asset_class: t.asset_class as 'reit' | 'invit',
      invested_value: t.total_invested_value,
      current_value: t.current_value,
      percentage_of_valued: tWeight,
      is_quoted: t.is_quoted,
      distribution_info:
        t.asset_class === 'reit'
          ? 'Quarterly SEBI NDCF real estate rental cash distributions'
          : 'Quarterly infrastructure toll/tariff cash distributions with capital amortization',
    };
  });

  const reitCombinedWeight =
    hasReitValued && marketValuedCapital && marketValuedCapital > 0
      ? roundPercent(((reitInvitValued ?? 0) / marketValuedCapital) * 100)
      : 0;

  // Bonds
  let bondInvested = 0;
  let bondValued: number | null = null;
  let hasBondValued = false;
  let bondUnpricedCount = 0;
  let bondPricedCount = 0;

  const issuerMap = new Map<string, { invested: number; valued: number | null }>();
  const ratingMap = new Map<string, { invested: number; valued: number | null }>();
  const maturityLadder = {
    under_3_years: { value: 0, percentage: 0, count: 0 },
    three_to_seven_years: { value: 0, percentage: 0, count: 0 },
    over_seven_years: { value: 0, percentage: 0, count: 0 },
    unspecified: { value: 0, percentage: 0, count: 0 },
  };

  for (const b of bondList) {
    bondInvested += b.total_invested_value;
    if (b.current_value !== null) {
      hasBondValued = true;
      bondValued = (bondValued ?? 0) + b.current_value;
      bondPricedCount += 1;
    } else {
      bondUnpricedCount += 1;
    }

    const issuerName =
      b.name.includes('Government') || b.symbol.startsWith('GS') || b.symbol.includes('GSEC')
        ? 'Government of India (Sovereign)'
        : b.name.split(' ')[0] || 'Listed Issuer';

    if (!issuerMap.has(issuerName)) {
      issuerMap.set(issuerName, { invested: 0, valued: null });
    }
    const iss = issuerMap.get(issuerName)!;
    iss.invested += b.total_invested_value;
    if (b.current_value !== null) {
      iss.valued = (iss.valued ?? 0) + b.current_value;
    }

    const isSovereign =
      b.name.includes('Government') || b.symbol.startsWith('GS') || b.symbol.includes('GSEC');
    const ratingTier = isSovereign ? 'Sovereign (Zero Credit Risk)' : 'AAA / High Grade Corporate';

    if (!ratingMap.has(ratingTier)) {
      ratingMap.set(ratingTier, { invested: 0, valued: null });
    }
    const rtier = ratingMap.get(ratingTier)!;
    rtier.invested += b.total_invested_value;
    if (b.current_value !== null) {
      rtier.valued = (rtier.valued ?? 0) + b.current_value;
    }

    const bVal = b.current_value ?? b.total_invested_value;
    const matchYear = b.symbol.match(/20(\d{2})/) || b.name.match(/20(\d{2})/);
    if (matchYear) {
      const year = parseInt(`20${matchYear[1]}`, 10);
      const currentYear = new Date().getFullYear();
      const diffYears = year - currentYear;
      if (diffYears < 3) {
        maturityLadder.under_3_years.value += bVal;
        maturityLadder.under_3_years.count += 1;
      } else if (diffYears <= 7) {
        maturityLadder.three_to_seven_years.value += bVal;
        maturityLadder.three_to_seven_years.count += 1;
      } else {
        maturityLadder.over_seven_years.value += bVal;
        maturityLadder.over_seven_years.count += 1;
      }
    } else {
      maturityLadder.three_to_seven_years.value += bVal;
      maturityLadder.three_to_seven_years.count += 1;
    }
  }

  const bondTotalBase = (bondValued ?? bondInvested) || 1;
  maturityLadder.under_3_years.percentage = roundPercent(
    (maturityLadder.under_3_years.value / bondTotalBase) * 100
  );
  maturityLadder.three_to_seven_years.percentage = roundPercent(
    (maturityLadder.three_to_seven_years.value / bondTotalBase) * 100
  );
  maturityLadder.over_seven_years.percentage = roundPercent(
    (maturityLadder.over_seven_years.value / bondTotalBase) * 100
  );

  const bondPortfolioWeight =
    hasBondValued && marketValuedCapital && marketValuedCapital > 0
      ? roundPercent(((bondValued ?? 0) / marketValuedCapital) * 100)
      : 0;

  const issuerConcentration = Array.from(issuerMap.entries()).map(([issuer, data]) => {
    const val = data.valued;
    const pct =
      val !== null && marketValuedCapital && marketValuedCapital > 0
        ? roundPercent((val / marketValuedCapital) * 100)
        : 0;
    return {
      issuer,
      invested_value: roundCurrency(data.invested),
      current_value: val !== null ? roundCurrency(val) : null,
      percentage_of_valued: pct,
    };
  });

  const creditRatingDistribution = Array.from(ratingMap.entries()).map(([rating_tier, data]) => {
    const val = data.valued;
    const pct =
      val !== null && marketValuedCapital && marketValuedCapital > 0
        ? roundPercent((val / marketValuedCapital) * 100)
        : 0;
    return {
      rating_tier,
      invested_value: roundCurrency(data.invested),
      current_value: val !== null ? roundCurrency(val) : null,
      percentage_of_valued: pct,
    };
  });

  const alternativesBreakdown: AlternativeHoldingsAnalysis = {
    has_alternatives: hasAlternatives,
    total_alternatives_invested: roundCurrency(totalAltsInvested),
    total_alternatives_value: totalAltsValued !== null ? roundCurrency(totalAltsValued) : null,
    alternatives_percentage_of_valued: altsPctOfValued,
    reits_invits: {
      total_invested: roundCurrency(reitInvitInvested),
      total_current_value: reitInvitValued !== null ? roundCurrency(reitInvitValued) : null,
      combined_weight_pct: reitCombinedWeight,
      trusts_count: trustBreakdown.length,
      trusts: trustBreakdown,
    },
    bonds: {
      total_invested: roundCurrency(bondInvested),
      total_current_value: bondValued !== null ? roundCurrency(bondValued) : null,
      bond_portfolio_weight_pct: bondPortfolioWeight,
      positions_count: bondList.length,
      priced_positions_count: bondPricedCount,
      unpriced_positions_count: bondUnpricedCount,
      pricing_liquidity_warning:
        bondUnpricedCount > 0
          ? `${bondUnpricedCount} bond position(s) lack active secondary market quotes; yield calculations excluded.`
          : null,
      estimated_annual_coupon_income: null,
      issuer_concentration: issuerConcentration,
      credit_rating_distribution: creditRatingDistribution,
      maturity_ladder: maturityLadder,
    },
  };

  const compositionSummary =
    `Your portfolio contains ${groupingMap.size} distinct instrument(s) across ${assetClassesCount} asset class(es) and ${classifiedSectorsCount} classified sector(s), tracked across ${Math.max(distinctBrokerAccountsCount, 1)} broker account(s). Total capital invested is ${formatIndianCurrency(totalInvested)}, with valued market capital of ${marketValuedCapital !== null ? formatIndianCurrency(marketValuedCapital) : 'partially available'}.`;

  const portfolioInterpretation: PortfolioInterpretation = {
    composition_summary: compositionSummary,
    strengths: strengthsList,
    primary_concerns: concernsList,
    data_limitations: limitationsList,
    research_priorities: researchPrioritiesList,
  };

  return {
    summary: {
      tracked_brokers_count: Math.max(distinctBrokerAccountsCount, brokerAccounts.length, 1),
      distinct_instruments_count: groupingMap.size,
      total_positions_count: holdings.length,
      total_invested_capital: totalInvested,
      market_valued_capital: marketValuedCapital,
      valued_subset_invested_capital: valuedSubsetInvested,
      valued_subset_unrealized_pnl: unrealizedPnL,
      valued_subset_unrealized_pnl_pct: unrealizedPnLPct,
      is_valuation_complete: isValuationComplete,
      valuation_completeness_message: valuationCompletenessMessage,
      priced_positions_count: pricedPositionsCount,
      unpriced_positions_count: unpricedPositionsCount,
      quote_coverage_pct: quoteCoveragePct,
      unrealized_pnl: unrealizedPnL,
      unrealized_pnl_pct: unrealizedPnLPct,
      whole_portfolio_pnl: wholePortfolioPnL,
      whole_portfolio_pnl_pct: wholePortfolioPnLPct,
      cross_broker_overlaps_count: overlapsList.length,
      cross_broker_overlap_value: roundCurrency(crossBrokerOverlapValuedTotal),
      cross_broker_overlap_valued_pct: crossBrokerOverlapValuedPct,
      top_holding_name: top1Inst?.name,
      top_holding_symbol: top1Inst?.symbol,
      top_holding_weight: roundPercent(topHoldingWeight * 100),
      top_2_holdings_weight: roundPercent(top2HoldingsWeight * 100),
      top_3_holdings_weight: roundPercent(top3HoldingsWeight * 100),
      top_5_holdings_weight: roundPercent(top5HoldingsWeight * 100),
      hhi: Math.round(hhi * 10000),
      hhi_label: hhiLabel,
      risk_score: riskMetrics.risk_score,
      risk_label: riskMetrics.risk_label,
      observed_exposure_label: riskMetrics.observed_exposure_label,
      top_sector: topSector,
      top_sector_weight: roundPercent(topSectorWeight * 100),
      top_asset_class: topAssetClass,
      top_asset_class_weight: roundPercent(topAssetClassWeight * 100),
      single_broker_notice: singleBrokerNotice,
    },
    overlaps: overlapsList,
    consolidated_instruments: consolidatedInstruments,
    asset_class_breakdown: assetClassBreakdown,
    broker_breakdown: brokerBreakdown,
    sector_breakdown: sectorBreakdown,
    alternatives_breakdown: alternativesBreakdown,
    data_quality: {
      total_positions: holdings.length,
      quoted_positions: pricedPositionsCount,
      unquoted_positions: unpricedPositionsCount,
      stale_quotes_count: staleQuotesCount,
      positions_without_isin: positionsWithoutIsin,
      positions_unclassified_sector: positionsUnclassifiedSector,
      positions_without_cost_basis: positionsWithoutCostBasis,
      quote_coverage_pct: quoteCoveragePct,
      is_fully_reliable: isFullyReliable,
      freshness_note: freshnessNote,
    },
    risk_reduction_actions: riskReductionActions,
    portfolio_interpretation: portfolioInterpretation,
  };
}
