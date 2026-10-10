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
} from '../../types/portfolio.ts';
import { roundCurrency, roundPercent, roundQuantity } from './portfolio.ts';
import { isPriceStale } from './risk.ts';

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

export interface UnifiedXRayAnalysis {
  summary: {
    tracked_brokers_count: number;
    distinct_instruments_count: number;
    total_positions_count: number;
    total_invested_capital: number;
    market_valued_capital: number | null;
    priced_positions_count: number;
    unpriced_positions_count: number;
    quote_coverage_pct: number;
    unrealized_pnl: number | null;
    unrealized_pnl_pct: number | null;
    cross_broker_overlaps_count: number;
    cross_broker_overlap_value: number;
    cross_broker_overlap_valued_pct: number;
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
  }>;
  data_quality: {
    total_positions: number;
    quoted_positions: number;
    unquoted_positions: number;
    stale_quotes_count: number;
    positions_without_isin: number;
    positions_unclassified_sector: number;
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
        asset_class: h.asset_class,
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
  let totalValuedMarket = 0;
  let hasAnyPriced = false;
  let pricedPositionsCount = 0;
  let unpricedPositionsCount = 0;
  let staleQuotesCount = 0;
  let positionsWithoutIsin = 0;
  let positionsUnclassifiedSector = 0;

  for (const h of holdings) {
    totalInvested += h.invested_value;
    if (typeof h.current_price === 'number' && h.current_price > 0 && h.current_value !== null) {
      hasAnyPriced = true;
      totalValuedMarket += h.current_value;
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
  const marketValuedCapital = hasAnyPriced ? roundCurrency(totalValuedMarket) : null;
  const quoteCoveragePct =
    holdings.length > 0 ? roundPercent((pricedPositionsCount / holdings.length) * 100) : 0;

  const unrealizedPnL =
    hasAnyPriced && marketValuedCapital !== null
      ? roundCurrency(marketValuedCapital - totalInvested)
      : null;

  const unrealizedPnLPct =
    unrealizedPnL !== null && totalInvested > 0
      ? roundPercent((unrealizedPnL / totalInvested) * 100)
      : null;

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

    // Cross-broker overlap check: instrument appears in > 1 broker accounts!
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
        asset_class: cls,
        display_name: ASSET_CLASS_DISPLAY_NAMES[cls] || cls.toUpperCase(),
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
    }
  >();

  for (const inst of consolidatedInstruments) {
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
      });
    }
    const sec = sectorMap.get(sectorName)!;
    sec.invested += inst.total_invested_value;
    sec.count += 1;
    if (inst.current_value !== null) {
      sec.valued += inst.current_value;
      sec.hasValued = true;
    }
  }

  const sectorBreakdown = Array.from(sectorMap.entries())
    .map(([sector, data]) => {
      const currentVal = data.hasValued ? roundCurrency(data.valued) : null;
      const sharePct =
        currentVal !== null && marketValuedCapital && marketValuedCapital > 0
          ? roundPercent((currentVal / marketValuedCapital) * 100)
          : 0;

      return {
        sector,
        invested_value: roundCurrency(data.invested),
        current_value: currentVal,
        percentage_of_valued: sharePct,
        instruments_count: data.count,
        is_classified: data.isClassified,
      };
    })
    .sort((a, b) => {
      // Keep Unclassified towards the end if others exist
      if (a.sector === 'Unclassified') return 1;
      if (b.sector === 'Unclassified') return -1;
      return (b.current_value ?? b.invested_value) - (a.current_value ?? a.invested_value);
    });

  // Tracked brokers count
  const distinctBrokerAccountsCount = new Set(
    holdings.map((h) => h.broker_account_id).filter(Boolean)
  ).size;

  return {
    summary: {
      tracked_brokers_count: Math.max(distinctBrokerAccountsCount, brokerAccounts.length, 1),
      distinct_instruments_count: groupingMap.size,
      total_positions_count: holdings.length,
      total_invested_capital: totalInvested,
      market_valued_capital: marketValuedCapital,
      priced_positions_count: pricedPositionsCount,
      unpriced_positions_count: unpricedPositionsCount,
      quote_coverage_pct: quoteCoveragePct,
      unrealized_pnl: unrealizedPnL,
      unrealized_pnl_pct: unrealizedPnLPct,
      cross_broker_overlaps_count: overlapsList.length,
      cross_broker_overlap_value: roundCurrency(crossBrokerOverlapValuedTotal),
      cross_broker_overlap_valued_pct: crossBrokerOverlapValuedPct,
    },
    overlaps: overlapsList,
    consolidated_instruments: consolidatedInstruments,
    asset_class_breakdown: assetClassBreakdown,
    broker_breakdown: brokerBreakdown,
    sector_breakdown: sectorBreakdown,
    data_quality: {
      total_positions: holdings.length,
      quoted_positions: pricedPositionsCount,
      unquoted_positions: unpricedPositionsCount,
      stale_quotes_count: staleQuotesCount,
      positions_without_isin: positionsWithoutIsin,
      positions_unclassified_sector: positionsUnclassifiedSector,
    },
  };
}
