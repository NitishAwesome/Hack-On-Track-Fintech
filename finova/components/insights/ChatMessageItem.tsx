'use client';

// ============================================================
// FINOVA — AI Chat Message Item Component
// components/insights/ChatMessageItem.tsx
//
// Renders user/assistant messages with SafeMarkdownRenderer,
// source grounding badges, embedded portfolio metric cards,
// stock comparison tables, copy response, and retry controls.
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  User,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  PieChart,
  Layers,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer';
import type { AIChatMessage, AIChatSource } from '@/types/chat';

interface ChatMessageItemProps {
  message: AIChatMessage;
  onRetry?: (message: AIChatMessage) => void;
  isLast?: boolean;
}

export function ChatMessageItem({
  message,
  onRetry,
  isLast = false,
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(true);

  const isUser = message.role === 'user';
  const meta = message.metadata;
  const sources = message.sources || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-3">
        <div
          className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-4 py-3 text-xs leading-relaxed shadow-xs"
          style={{
            backgroundColor: 'rgb(var(--brand))',
            color: '#FFFFFF',
          }}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex items-start gap-3 my-4 group">
      {/* FINOVA Intelligence Avatar */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border shadow-xs"
        style={{
          backgroundColor: 'rgba(var(--brand-rgb, 59, 130, 246), 0.1)',
          borderColor: 'rgba(var(--brand-rgb, 59, 130, 246), 0.3)',
        }}
      >
        <Sparkles className="w-4 h-4 text-brand" />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Header with Title & Persistence Status */}
        <div className="flex items-center justify-between text-[11px]" style={{ color: 'rgb(var(--muted))' }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand">FINOVA Intelligence</span>
            {meta?.queryLatencyMs && (
              <span className="text-[10px]">· {(meta.queryLatencyMs / 1000).toFixed(1)}s</span>
            )}
            {meta?.persistenceStatus === 'pending_migration' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                Session Storage
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded hover:bg-muted/20 text-muted transition-colors flex items-center gap-1 text-[10px]"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message)}
                className="p-1 rounded hover:bg-muted/20 text-muted transition-colors flex items-center gap-1 text-[10px]"
                title="Retry response"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Content Bubble */}
        <div
          className="rounded-xl border p-4 text-xs shadow-xs"
          style={{
            backgroundColor: 'rgb(var(--card))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          {message.isPending ? (
            <div className="flex items-center gap-2 py-2 text-xs" style={{ color: 'rgb(var(--muted))' }}>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Grounding response in portfolio and market data...</span>
            </div>
          ) : (
            <SafeMarkdownRenderer content={message.content} />
          )}

          {/* Embedded Contextual Portfolio Card */}
          {meta?.portfolioMetrics && (
            <div
              className="mt-3 pt-3 border-t rounded-lg p-2.5"
              style={{
                borderColor: 'rgb(var(--border))',
                backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.02)',
              }}
            >
              <div className="text-[11px] font-semibold flex items-center justify-between mb-2" style={{ color: 'rgb(var(--foreground))' }}>
                <span className="flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-brand" />
                  Relevant Portfolio Snapshot
                </span>
                <span className="text-[10px] text-muted">
                  {meta.portfolioMetrics.holdingCount} holdings · {meta.portfolioMetrics.brokerCount} broker(s)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded border bg-card/50" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="text-[10px] text-muted">Invested Capital</div>
                  <div className="font-semibold mt-0.5">
                    ₹{meta.portfolioMetrics.totalInvested?.toLocaleString('en-IN') || '0'}
                  </div>
                </div>
                <div className="p-2 rounded border bg-card/50" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="text-[10px] text-muted">Market Value</div>
                  <div className="font-semibold mt-0.5">
                    {meta.portfolioMetrics.currentValuation !== null && meta.portfolioMetrics.currentValuation !== undefined
                      ? `₹${meta.portfolioMetrics.currentValuation.toLocaleString('en-IN')}`
                      : 'Unavailable'}
                  </div>
                </div>
                <div className="p-2 rounded border bg-card/50" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="text-[10px] text-muted">Top Holding</div>
                  <div className="font-semibold mt-0.5 truncate" title={meta.portfolioMetrics.topHolding}>
                    {meta.portfolioMetrics.topHolding || 'None'}
                  </div>
                </div>
                <div className="p-2 rounded border bg-card/50" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="text-[10px] text-muted">Risk Radar</div>
                  <div className="font-semibold mt-0.5 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                    <span>{meta.portfolioMetrics.riskLabel || 'Screening Active'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2.5 pt-2 border-t text-[10px]" style={{ borderColor: 'rgb(var(--border))' }}>
                <Link href="/xray" className="text-brand font-medium hover:underline flex items-center gap-0.5">
                  <span>Open Investment X-Ray</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
                <Link href="/risk-radar" className="text-brand font-medium hover:underline flex items-center gap-0.5">
                  <span>Open Risk Radar</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Embedded Stock Comparison Table */}
          {meta?.stockComparison && meta.stockComparison.length > 0 && (
            <div
              className="mt-3 pt-3 border-t rounded-lg p-2.5"
              style={{
                borderColor: 'rgb(var(--border))',
                backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.02)',
              }}
            >
              <div className="text-[11px] font-semibold flex items-center justify-between mb-2" style={{ color: 'rgb(var(--foreground))' }}>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-brand" />
                  Verified Stock Comparison
                </span>
                <span className="text-[10px] text-muted">NSE / BSE Market Feed</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] text-muted" style={{ borderColor: 'rgb(var(--border))' }}>
                      <th className="pb-1.5 font-medium">Instrument</th>
                      <th className="pb-1.5 font-medium">Price</th>
                      <th className="pb-1.5 font-medium">Day %</th>
                      <th className="pb-1.5 font-medium">52W Range</th>
                      <th className="pb-1.5 font-medium">P/E</th>
                      <th className="pb-1.5 font-medium">Sector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.stockComparison.map((stk) => (
                      <tr key={stk.symbol} className="border-b last:border-b-0" style={{ borderColor: 'rgb(var(--border))' }}>
                        <td className="py-1.5 font-medium">
                          <div className="font-semibold">{stk.symbol}</div>
                          <div className="text-[10px] text-muted truncate max-w-[120px]">{stk.name}</div>
                        </td>
                        <td className="py-1.5 font-semibold">
                          {stk.price !== null ? `₹${stk.price.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-1.5">
                          {stk.changePct !== null ? (
                            <span className={stk.changePct >= 0 ? 'text-emerald-500 font-medium' : 'text-rose-500 font-medium'}>
                              {stk.changePct >= 0 ? '+' : ''}{stk.changePct.toFixed(2)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-1.5 text-[10px] text-muted">
                          {stk.low52 && stk.high52 ? `₹${stk.low52} - ₹${stk.high52}` : '—'}
                        </td>
                        <td className="py-1.5">{stk.peRatio ? stk.peRatio.toFixed(1) : '—'}</td>
                        <td className="py-1.5 text-[10px] text-muted">{stk.sector || 'Equities'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Embedded Future Lab Simulation Snapshot */}
          {meta?.simulationResult && (
            <div
              className="mt-3 pt-3 border-t rounded-lg p-2.5"
              style={{
                borderColor: 'rgb(var(--border))',
                backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.02)',
              }}
            >
              <div className="text-[11px] font-semibold flex items-center justify-between mb-1" style={{ color: 'rgb(var(--foreground))' }}>
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand" />
                  {meta.simulationResult.scenarioTitle || 'Future Lab Scenario Simulation'}
                </span>
                <Link href="/future-lab" className="text-[10px] text-brand font-medium hover:underline flex items-center gap-0.5">
                  <span>Open Future Lab</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 my-2 text-xs">
                <div className="p-2 rounded border bg-card/50" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="text-[10px] text-muted">Simulated Capital</div>
                  <div className="font-semibold mt-0.5">
                    ₹{meta.simulationResult.simulatedCapital?.toLocaleString('en-IN') || '—'}
                  </div>
                </div>
                <div className="p-2 rounded border bg-card/50" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="text-[10px] text-muted">Equity Allocation</div>
                  <div className="font-semibold mt-0.5">
                    {meta.simulationResult.equityPct !== undefined ? `${meta.simulationResult.equityPct}%` : '—'}
                  </div>
                </div>
                <div className="p-2 rounded border bg-card/50" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="text-[10px] text-muted">Fixed Income / Bonds</div>
                  <div className="font-semibold mt-0.5">
                    {meta.simulationResult.bondPct !== undefined ? `${meta.simulationResult.bondPct}%` : '—'}
                  </div>
                </div>
              </div>
              {meta.simulationResult.keyTakeaway && (
                <div className="text-[11px] text-muted mt-1 leading-snug">
                  {meta.simulationResult.keyTakeaway}
                </div>
              )}
            </div>
          )}

          {/* Source Citations Section */}
          {sources.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                className="w-full flex items-center justify-between text-[11px] font-semibold py-1 hover:opacity-80 transition-opacity"
                style={{ color: 'rgb(var(--muted))' }}
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand" />
                  <span>Grounding Sources ({sources.length})</span>
                </span>
                {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSources && (
                <div className="space-y-1.5 mt-2">
                  {sources.map((src) => (
                    <div
                      key={src.id}
                      className="p-2 rounded-lg border text-[11px] flex flex-col gap-0.5"
                      style={{
                        backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.02)',
                        borderColor: 'rgb(var(--border))',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {src.url ? (
                          src.url.startsWith('/') ? (
                            <Link
                              href={src.url}
                              className="font-medium text-brand hover:underline flex items-center gap-1 flex-1 leading-snug"
                            >
                              <span>{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </Link>
                          ) : (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-brand hover:underline flex items-center gap-1 flex-1 leading-snug"
                            >
                              <span>{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                          )
                        ) : (
                          <span className="font-medium leading-snug flex-1" style={{ color: 'rgb(var(--foreground))' }}>
                            {src.title}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/20 text-muted font-medium flex-shrink-0">
                          {src.publisher || 'FINOVA'}
                        </span>
                      </div>
                      {src.temporalNote && (
                        <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                          <span>{src.temporalNote}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
