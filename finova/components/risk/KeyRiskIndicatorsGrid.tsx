'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  PieChart,
  Layers,
  Activity,
  Compass,
  BarChart2,
  Clock,
  Briefcase,
} from 'lucide-react';
import type { RiskMetrics } from '@/types/portfolio';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface KeyRiskIndicatorsGridProps {
  baseMetrics: RiskMetrics;
  xraySummary: UnifiedXRayAnalysis['summary'];
  dataQuality: UnifiedXRayAnalysis['data_quality'];
}

export function KeyRiskIndicatorsGrid({
  baseMetrics,
  xraySummary,
  dataQuality,
}: KeyRiskIndicatorsGridProps) {
  const topHoldingPct = (baseMetrics.top_holding_weight * 100);
  const isTopHoldingAlert = topHoldingPct > 40;
  const isTopHoldingWarn = topHoldingPct > 25;

  const top3Pct = xraySummary.top_3_holdings_weight;
  const isSmallPortfolio = xraySummary.distinct_instruments_count < 3;

  const hhi = xraySummary.hhi;
  const isHhiAlert = hhi >= 2500;
  const isHhiWarn = hhi >= 1500;

  const topSectorPct = xraySummary.top_sector_weight;
  const isSectorAlert = topSectorPct > 50;
  const isSectorWarn = topSectorPct > 35;

  const eqPct = (baseMetrics.equity_weight * 100);
  const isEquityAlert = eqPct > 90;
  const isEquityWarn = eqPct > 80;

  const isSingleBroker = xraySummary.tracked_brokers_count <= 1;

  const kpis = [
    {
      id: 'kpi-top-holding',
      label: 'Largest Holding Exposure',
      value: `${topHoldingPct.toFixed(1)}%`,
      sub: baseMetrics.top_holding_symbol || baseMetrics.top_holding_name || 'Single largest position',
      icon: <PieChart className="w-4 h-4 text-brand-500" />,
      status: isTopHoldingAlert ? 'alert' : isTopHoldingWarn ? 'warning' : 'healthy',
      tooltip: 'Percentage of valued portfolio in single largest holding. >25% triggers concentration review.',
    },
    {
      id: 'kpi-top-3',
      label: 'Top 3 Holdings Exposure',
      value: `${top3Pct.toFixed(1)}%`,
      sub: isSmallPortfolio
        ? `Portfolio contains ${xraySummary.distinct_instruments_count} total holding(s)`
        : 'Top 3 holdings combined',
      icon: <Layers className="w-4 h-4 text-brand-500" />,
      status: !isSmallPortfolio && top3Pct > 60 ? 'warning' : 'healthy',
      tooltip: 'Combined weight of top 3 positions. Assesses core vs peripheral asset distribution.',
    },
    {
      id: 'kpi-hhi',
      label: 'Herfindahl Index (HHI)',
      value: hhi.toLocaleString('en-IN'),
      sub: `${xraySummary.hhi_label} (${baseMetrics.hhi.toFixed(3)})`,
      icon: <Activity className="w-4 h-4 text-brand-500" />,
      status: isHhiAlert ? 'alert' : isHhiWarn ? 'warning' : 'healthy',
      tooltip: 'Institutional concentration index (0–10,000 scale). <1,500 = Low, 1,500–2,500 = Moderate, >=2,500 = High.',
    },
    {
      id: 'kpi-top-sector',
      label: 'Largest Sector Exposure',
      value: `${topSectorPct.toFixed(1)}%`,
      sub: xraySummary.top_sector || 'Unclassified',
      icon: <Compass className="w-4 h-4 text-brand-500" />,
      status: isSectorAlert ? 'alert' : isSectorWarn ? 'warning' : 'healthy',
      tooltip: 'Dominant industry sector. >35% denotes elevated sensitivity to sector cycles.',
    },
    {
      id: 'kpi-equity-skew',
      label: 'Equity Allocation',
      value: `${eqPct.toFixed(1)}%`,
      sub: eqPct >= 95 ? 'All-equity (no debt/gold buffer)' : 'Equities & equity ETFs',
      icon: <BarChart2 className="w-4 h-4 text-brand-500" />,
      status: isEquityAlert ? 'alert' : isEquityWarn ? 'warning' : 'healthy',
      tooltip: 'Weight in equities. >80% leaves portfolio vulnerable to broad stock market pullbacks.',
    },
    {
      id: 'kpi-quote-coverage',
      label: 'Quote Coverage',
      value: `${xraySummary.quote_coverage_pct}%`,
      sub: `${xraySummary.priced_positions_count} of ${xraySummary.total_positions_count} priced`,
      icon: <CheckCircle className="w-4 h-4 text-brand-500" />,
      status: xraySummary.unpriced_positions_count > 0 ? 'warning' : 'healthy',
      tooltip: 'Positions with verified prices. Unquoted positions are excluded from market P&L denominator.',
    },
    {
      id: 'kpi-quote-freshness',
      label: 'Quote Freshness',
      value:
        dataQuality.stale_quotes_count > 0
          ? `${dataQuality.stale_quotes_count} Stale`
          : 'Verified Active',
      sub:
        dataQuality.stale_quotes_count > 0
          ? 'Older than 48h threshold'
          : 'All quotes updated recently',
      icon: <Clock className="w-4 h-4 text-brand-500" />,
      status: dataQuality.stale_quotes_count > 0 ? 'warning' : 'healthy',
      tooltip: 'Quotes verified against active market thresholds. Stale prices reflect previous market closes.',
    },
    {
      id: 'kpi-overlap',
      label: 'Cross-Broker Overlap',
      value: isSingleBroker
        ? 'N/A'
        : `${xraySummary.cross_broker_overlap_valued_pct.toFixed(1)}%`,
      sub: isSingleBroker
        ? 'N/A — Additional Broker Data Required'
        : `${xraySummary.cross_broker_overlaps_count} duplicate stock(s)`,
      icon: <Briefcase className="w-4 h-4 text-brand-500" />,
      status:
        !isSingleBroker && xraySummary.cross_broker_overlaps_count > 0
          ? 'warning'
          : 'healthy',
      tooltip: isSingleBroker
        ? 'With only one tracked broker, cross-broker overlap is not assessable (Additional Broker Data Required).'
        : 'Duplicate identical holdings held across different broker accounts.',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi, idx) => {
        const isAlert = kpi.status === 'alert';
        const isWarn = kpi.status === 'warning';

        return (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`card p-4 flex flex-col justify-between border transition-all ${
              isAlert
                ? 'border-loss/30 bg-loss/5'
                : isWarn
                ? 'border-warning/30 bg-warning/5'
                : 'border-border bg-surface'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-1">
                <span className="text-[11px] font-semibold text-muted truncate">
                  {kpi.label}
                </span>
                <span className="flex-shrink-0">
                  {isAlert ? (
                    <AlertCircle className="w-3.5 h-3.5 text-loss" />
                  ) : isWarn ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-gain" />
                  )}
                </span>
              </div>

              <p className="text-xl font-bold font-mono tracking-tight text-foreground mt-1.5">
                {kpi.value}
              </p>
            </div>

            <p className="text-[11px] text-muted truncate mt-2 border-t border-border/50 pt-1.5" title={kpi.tooltip}>
              {kpi.sub}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
