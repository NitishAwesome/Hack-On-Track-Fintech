'use client';

import { formatStockPrice } from '@/lib/utils';
import { hasHoldingPrice, holdingQuoteTimestamp } from '@/lib/investments/presentation';
import type { HoldingWithMetrics } from '@/types/portfolio';

export function HoldingQuote({
  holding,
  compact = false,
}: {
  holding: HoldingWithMetrics;
  compact?: boolean;
}) {
  const hasPrice = hasHoldingPrice(holding);
  const timestamp = holdingQuoteTimestamp(holding.price_updated_at);
  return (
    <div className={`flex flex-col gap-1 ${compact ? '' : 'items-end'}`}>
      {!compact && (
        <span
          className={`font-semibold tabular-nums ${hasPrice ? 'text-foreground' : 'text-muted'}`}
        >
          {hasPrice ? formatStockPrice(holding.current_price!) : 'Price unavailable'}
        </span>
      )}
      <span
        className={`investment-quote-status ${holding.price_status === 'STALE' || !hasPrice ? 'investment-quote-stale' : ''}`}
      >
        {hasPrice
          ? holding.price_status === 'REALTIME'
            ? 'REALTIME · provider'
            : holding.price_status || 'Status unavailable'
          : 'UNQUOTED'}
      </span>
      <span className="text-[10px] text-muted font-sans max-w-36 leading-relaxed break-words">
        {hasPrice
          ? holding.price_source || 'Source unavailable'
          : holding.price_unavailability_reason || 'No usable provider quote'}
      </span>
      {hasPrice && (
        <span
          className="text-[9px] text-muted font-sans"
          title={holding.price_updated_at || undefined}
        >
          {timestamp || 'Quote time unavailable'}
        </span>
      )}
    </div>
  );
}
