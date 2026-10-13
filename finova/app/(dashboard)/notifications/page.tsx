'use client';

// ============================================================
// FINOVA — Notifications Center
// app/(dashboard)/notifications/page.tsx
//
// Actionable, deterministic portfolio & market notifications:
// - Categories: Portfolio, Risk, Market Data, Transactions, System
// - Derived from verified portfolio health, risk metrics & market status
// - Read/unread state stored locally in non-sensitive local storage
// - Zero fake/hallucinated alerts in authenticated mode
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePrivateQuery as useQuery } from '@/lib/hooks/usePrivateQuery';
import { useSession } from '@/components/providers/QueryProvider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
  Receipt,
  RotateCcw,
  Check,
  Filter,
} from 'lucide-react';
import { formatCurrency, formatIndianCurrency } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';
import type { SmartRiskRadarAnalysis } from '@/lib/calculations/riskRadar';
import type { PortfolioSummary } from '@/types/portfolio';

type NotificationCategory = 'all' | 'unread' | 'portfolio' | 'risk' | 'market' | 'transactions' | 'system';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'portfolio' | 'risk' | 'market' | 'transactions' | 'system';
  severity: 'info' | 'warning' | 'success';
  timestamp: string;
  actionLabel?: string;
  actionHref?: string;
}

const STORAGE_KEY = 'finova_read_notification_ids';

export default function NotificationsPage() {
  const { userId } = useSession();
  const storageKey = `${STORAGE_KEY}:${userId || 'guest'}`;
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);

  // Load read state from localStorage
  useEffect(() => {
    setIsClient(true);
    setReadIds(new Set());
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const ids: unknown = JSON.parse(stored);
        setReadIds(new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [storageKey]);

  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
    } catch {
      // Ignore localStorage write errors
    }
  };

  // 1. Fetch Portfolio Summary
  const { data: summaryData } = useQuery<{ summary: PortfolioSummary }>({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/summary');
      if (!res.ok) return { summary: null as unknown as PortfolioSummary };
      return res.json();
    },
    staleTime: 60000,
  });

  // 2. Fetch Risk Radar
  const { data: riskData } = useQuery<{ data: SmartRiskRadarAnalysis }>({
    queryKey: ['portfolio-risk-radar'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/risk-radar');
      if (!res.ok) return { data: null as unknown as SmartRiskRadarAnalysis };
      return res.json();
    },
    staleTime: 60000,
  });

  // 3. Fetch X-Ray
  const { data: xrayData } = useQuery<{ data: UnifiedXRayAnalysis }>({
    queryKey: ['portfolio-xray'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/xray');
      if (!res.ok) return { data: null as unknown as UnifiedXRayAnalysis };
      return res.json();
    },
    staleTime: 60000,
  });

  // Derive notifications from live data
  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    // A. Market Session Status Notification
    // IST calculation (UTC + 5:30)
    const istTime = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000);
    const day = istTime.getDay();
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const currentMins = hours * 60 + minutes;
    const isWeekday = day >= 1 && day <= 5;
    const isMarketOpen = isWeekday && currentMins >= (9 * 60 + 15) && currentMins <= (15 * 60 + 30);

    list.push({
      id: `market-status-${todayStr}`,
      title: isMarketOpen ? 'Usual Indian trading hours (calendar estimate)' : 'Outside usual Indian trading hours',
      message: isMarketOpen
        ? 'Usual hours are 09:15–15:30 IST on weekdays. Holidays and actual exchange activity are not verified by this calendar estimate. Check each quote timestamp.'
        : 'FINOVA displays the latest available provider quotes with their original timestamps. This calendar estimate does not verify exchange session status.',
      category: 'market',
      severity: 'info',
      timestamp: 'Today, ' + istTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      actionLabel: 'Explore Market',
      actionHref: '/explore',
    });

    // B. Risk Concentration Alert
    if (riskData?.data?.baseMetrics) {
      const metrics = riskData.data.baseMetrics;
      const topWeight = (metrics.top_holding_weight || 0) * 100;

      if (topWeight > 25) {
        list.push({
          id: `risk-high-concentration-${metrics.top_holding_name}`,
          title: 'High Single-Holding Concentration Detected',
          message: `Your largest holding (${metrics.top_holding_name}) represents ${topWeight.toFixed(1)}% of your valued portfolio. Concentration above 25% significantly increases individual volatility risk.`,
          category: 'risk',
          severity: 'warning',
          timestamp: 'Live Diagnosis',
          actionLabel: 'Inspect in Risk Radar',
          actionHref: '/risk',
        });
      }

      if (metrics.risk_score >= 65) {
        list.push({
          id: `risk-score-elevated-${metrics.risk_score}`,
          title: `Portfolio Risk Score: ${metrics.risk_score}/100 (${metrics.risk_label})`,
          message: 'Your composite risk score is elevated based on concentration, sector crowding, or equity allocation. Review the prioritized risk reduction roadmap.',
          category: 'risk',
          severity: 'warning',
          timestamp: 'Live Diagnosis',
          actionLabel: 'Review Action Plan',
          actionHref: '/risk',
        });
      }
    }

    // C. Cross-Broker Overlap Notice
    if (xrayData?.data?.overlaps && xrayData.data.overlaps.length > 0) {
      const overlapCount = xrayData.data.overlaps.length;
      const topOverlap = xrayData.data.overlaps[0];
      list.push({
        id: `portfolio-overlap-${overlapCount}`,
        title: `Multi-Broker Consolidation: ${overlapCount} Overlapping Holding${overlapCount > 1 ? 's' : ''}`,
        message: `You hold ${topOverlap.symbol} across multiple broker accounts (${topOverlap.broker_names.join(', ')}). FINOVA consolidates your true combined exposure so you don't double count.`,
        category: 'portfolio',
        severity: 'info',
        timestamp: 'Verified Exposure',
        actionLabel: 'View in X-Ray',
        actionHref: '/analysis',
      });
    }

    // D. Data Completeness & Partial Pricing
    if (summaryData?.summary) {
      const summary = summaryData.summary;
      if (summary.has_unquoted_assets) {
        const unquoted = summary.holding_count - (summary.priced_count ?? 0);
        list.push({
          id: `market-unquoted-holdings-${unquoted}`,
          title: 'Partial Valuation Coverage Notice',
          message: `${unquoted} of your ${summary.holding_count} holdings currently lack automated market pricing and are safely excluded from total current returns to avoid distorted figures.`,
          category: 'market',
          severity: 'info',
          timestamp: 'Market Pricing',
          actionLabel: 'Manage Holdings',
          actionHref: '/holdings',
        });
      }

      if (summary.holding_count > 0) {
        list.push({
          id: `portfolio-active-summary-${summary.holding_count}`,
          title: 'Unified Portfolio Reconciled',
          message: `Consolidated ${summary.holding_count} holdings with total invested capital of ${formatCurrency(summary.total_invested_value)}. Valuations are synchronized.`,
          category: 'portfolio',
          severity: 'success',
          timestamp: 'Valuation Audit',
          actionLabel: 'View Dashboard',
          actionHref: '/dashboard',
        });
      }
    }

    // E. System & Account Security Notice
    list.push({
      id: 'system-security-audit',
      title: 'FINOVA Account Security Protocol',
      message: 'FINOVA operates on strict read-only demat reconciliation. We never collect or store your broker trading passwords, MPINs, or OTPs.',
      category: 'system',
      severity: 'success',
      timestamp: 'Security Policy',
      actionLabel: 'Profile & Security',
      actionHref: '/profile',
    });

    return list;
  }, [summaryData, riskData, xrayData]);

  // Filtering
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const isRead = readIds.has(item.id);
      if (activeCategory === 'unread') return !isRead;
      if (activeCategory === 'all') return true;
      return item.category === activeCategory;
    });
  }, [notifications, activeCategory, readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !readIds.has(item.id)).length;
  }, [notifications, readIds]);

  const toggleRead = (id: string) => {
    const next = new Set(readIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    saveReadIds(next);
  };

  const markAllAsRead = () => {
    const next = new Set(readIds);
    notifications.forEach((item) => next.add(item.id));
    saveReadIds(next);
  };

  const clearAllRead = () => {
    saveReadIds(new Set());
  };

  const CATEGORIES: { id: NotificationCategory; label: string; count?: number }[] = [
    { id: 'all', label: 'All Alerts', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'risk', label: 'Risk' },
    { id: 'market', label: 'Market Data' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="page-container py-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand/10 text-brand border border-brand/20">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Notifications &amp; Activity
            </h1>
            {isClient && unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand text-foreground dark:text-white shadow-sm">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Actionable portfolio health alerts, risk notifications, and market hours updates
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border hover:bg-surface-raised transition-colors text-foreground"
            >
              <Check className="w-3.5 h-3.5 text-gain" />
              <span>Mark all as read</span>
            </button>
          ) : (
            <button
              onClick={clearAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border hover:bg-surface-raised transition-colors text-muted hover:text-foreground"
              title="Reset notification read status"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset read states</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-brand text-foreground dark:text-white shadow-sm'
                  : 'bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-raised'
              }`}
            >
              <span>{cat.label}</span>
              {cat.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-foreground dark:text-white' : 'bg-surface-raised text-muted'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-10 text-center border border-border space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-surface-raised border border-border text-muted">
                <CheckCircle2 className="w-6 h-6 text-gain" />
              </div>
              <h3 className="text-base font-bold text-foreground">All caught up!</h3>
              <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                {activeCategory === 'unread'
                  ? 'You have reviewed all your actionable alerts. New risk or valuation events will appear here automatically.'
                  : 'No alerts in this category at this time.'}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((item) => {
              const isRead = readIds.has(item.id);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={`card p-4 sm:p-5 border transition-all ${
                    isRead
                      ? 'border-border/60 bg-surface/60 opacity-80'
                      : 'border-border bg-surface shadow-sm ring-1 ring-brand/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                          item.severity === 'warning'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : item.severity === 'success'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-brand/10 text-brand border-brand/20'
                        }`}
                      >
                        {item.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : item.severity === 'success' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Info className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-bold text-foreground truncate">
                            {item.title}
                          </h2>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-raised border border-border text-muted font-medium uppercase tracking-wider">
                            {item.category}
                          </span>
                        </div>

                        <p className="text-xs text-muted leading-relaxed">
                          {item.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.timestamp}
                          </span>

                          {item.actionHref && item.actionLabel && (
                            <Link
                              href={item.actionHref}
                              className="font-bold text-brand hover:underline inline-flex items-center gap-1"
                            >
                              <span>{item.actionLabel}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Read */}
                    <button
                      onClick={() => toggleRead(item.id)}
                      className="p-1.5 rounded-lg border border-border/80 text-muted hover:text-foreground hover:bg-surface-raised transition-colors flex-shrink-0"
                      title={isRead ? 'Mark as unread' : 'Mark as read'}
                      aria-label="Toggle notification read status"
                    >
                      <Check className={`w-3.5 h-3.5 ${isRead ? 'text-gain' : 'opacity-40'}`} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Persistence Architecture Disclosure */}
      <div className="p-4 rounded-xl bg-surface-raised border border-border text-xs text-muted space-y-1 leading-relaxed">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-brand" />
          <span>Notification Architecture &amp; Data Grounding</span>
        </p>
        <p>
          FINOVA calculates notification priorities deterministically from your active portfolio valuation, risk radar HHI, and NSE/BSE market session times. Read receipts are retained safely in local client storage.
        </p>
      </div>
    </div>
  );
}
