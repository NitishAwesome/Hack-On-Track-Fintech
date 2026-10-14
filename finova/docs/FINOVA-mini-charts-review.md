# Investment Explorer mini charts

Review date: 14 October 2026. Local implementation on `feature/explorer-codex` in `D:\Hack-On-Track-Fintech-codex`, starting from `1eebd8ff5ceba7482716ce8dc31f566307640ce4`.

## Delivered

- One shared genuine-history sparkline across benchmarks, Recently Viewed, followed stocks, discovery previews, movers, Browse Stocks, sector results and precious metals.
- Browse Stocks includes Company/Symbol, Trend, Latest Price, 1D Change, 1D Volume, 52W Position and Action. Sector information remains with company identity. Mobile cards expose the same data; the existing directory retains 15 stocks per page.
- Sector cards include company identity/logo, quote, daily movement, mini trend, actual volume and provider-backed 52W position. Sector results now paginate at 12 entries.
- Mini charts default to provider 1D observations. Missing or insufficient intraday history uses a labeled 1W fallback; provider outages and throttling do not trigger extra fallback traffic. No usable history produces an explicit unavailable state.
- Session selection uses provider bounds when they contain the latest observation, including futures sessions crossing midnight. Without matching bounds, only the latest observed local date is displayed. Session completion is disclosed only with matching provider-reported session bounds. These charts do not assert a full, independently verified trading session.
- Positive/negative/unchanged chart colors come from first-to-last observations. Daily quote change remains separate. Dates are sorted, duplicated timestamps reconciled, and invalid/future observations excluded. Straight point connections with rounded joins preserve actual movement and extrema.
- Small pointer/tap and keyboard tooltips show observed time/price. Arrow keys, Home, End and Escape support inspection. Chart interaction does not activate its enclosing research navigation.
- Mini-chart tooltips use the existing Radix portal to escape scrolling containers. Market-strip labels open below the strip, avoid the navbar and stay within viewport edges; native SVG hover labels no longer compete with them.
- 52W markers use genuine quote low/high/current values, clamp safely, and remain unavailable for missing, invalid or degenerate ranges. They do not imply buy/sell signals.
- Gold and silver futures remain USD/troy ounce; Indian Gold/Silver BeES remain INR/unit. Both datasets have separate history and research actions.
- Futures research keeps the supported USD unit during loading. Shared dialogs cap their height to the viewport, keep header/close controls visible, and scroll their content when charts are tall.
- Restrained cyan/blue discovery accents, violet followed/recent/sector accents and amber metals/IPO accents, subtle gradients, row hover, tabular numbers and responsive cards. Price gains/losses retain their semantic colors.

## Request safety

- Histories are visibility driven. Offscreen observers unmount, cancelling unused queued/in-flight browser requests. Hidden mobile/desktop counterparts do not fetch charts.
- All research history views use canonical symbol/exchange/range React Query keys; aliases from the strip and research cards share caches.
- Mini history has a five-minute client stale time, without quote-style polling or focus/reconnect refresh. The preserved market strip keeps its existing one-week period and appearance.
- Browser history requests are limited to four concurrent tasks. Server history requests are independently limited to four, deduplicated while pending, and cached for one minute (1D) or five minutes (other ranges).
- Failed history reads back off for one minute on client and server. Upstream history 429 responses propagate an API 429 with Retry-After; queued history work respects the cooldown. Explicit research refresh retains its existing force-refresh behavior.
- The existing provider abstraction, canonical quote service, public/private routes, authentication, financial calculations and ledger are preserved. No additional dependencies or database migrations were introduced.

## Validation

- `npm test`: 29 offline product integrity groups passed, including the original financial/watchlist/goals/AI integrity checks and new observation, session, overnight-futures, color, shape, units, fallback, 52W, cancellation, concurrency, caching and rate-limit tests. Mock records are used only in tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with 0 errors and the existing 79 warnings. Changed-file lint is also run separately.
- `FINOVA_BUILD_DIR=.next-validation npm run build`: passed; 54 pages generated. Temporary build-generated tsconfig additions were removed.
- Actual local history API returned successful provider 1D/5m histories for RELIANCE, TCS, INFY, HDFCBANK, BHEL, NIFTY 50, SENSEX, NIFTY BANK, GC=F, SI=F, GOLDBEES and SILVERBEES. All sampled responses had no future points. Public response evidence is saved in `%TEMP%\finova-mini-charts-api-verification.json`.
- Browser verified real distinct shapes and positive/negative colors, directory columns and 15-row scope, BHEL search, sector history on scrolling, keyboard tooltip inspection and mobile tap without navigation. Checked narrow widths 360/390, tablet 769 and desktop 1440 CSS pixels, including light/dark themes and no page overflow.
- Both COMEX charts displayed USD/troy ounce and both ETF charts displayed INR/unit in browser inspection. The futures research action opened the existing provider-backed OHLCV workspace in USD.
- Provider-unavailable LTIM correctly displayed unavailable quote/history/range fields. This change does not fix discontinued provider catalog mappings by inventing replacement instruments.
- Screenshots: `C:\Users\nitis\.codex\visualizations\2026\10\14\finova-mini-charts`.
- Market-strip tooltip follow-up: browser confirmed visible, bottom placement outside the horizontal scroll container and entirely within the viewport, with Escape dismissal. Evidence: `market-strip-tooltip-fixed.jpg`. TypeScript, changed-file lint and the production build passed after this adjustment.

## Files changed

| Area | Files |
| --- | --- |
| Shared displays | `components/shared/MarketSparkline.tsx`, `InstrumentMarketData.tsx` (new), `MarketStrip.tsx`, `Modal.tsx` |
| Explorer | `components/explorer/BrowseStocksSection.tsx`, `CommoditiesOverview.tsx`, `DiscoveryPreviews.tsx`, `DiscoveryInstrumentCard.tsx` (new), `InvestmentExplorerHub.tsx`, `InteractiveStockChart.tsx`, `MarketIndexCards.tsx`, `RecentlyViewedStocks.tsx`, `SectorDiscoverySection.tsx`, `TrackedMoversSection.tsx`, `research.css` |
| Hooks | `lib/hooks/useVisibleElement.ts` (new), `useInstrumentHistory.ts` |
| History pipeline | `lib/market/historyClient.ts`, `miniHistory.ts`, `requestQueue.ts` (all new), `providers/yfinanceProvider.ts`, `lib/services/marketData.ts`, `app/api/market/history/route.ts` |
| Validation and review | `scripts/test-product-integrity.mjs`, `docs/FINOVA-mini-charts-review.md` (new) |

## Release state

The user authorized committing and pushing this Explorer update on 14 October 2026. It is prepared on `feature/explorer-codex` in the isolated Codex worktree. The primary `main` checkout is unchanged. No deployment or migration was performed, and no portfolio/transaction records were modified. Preview runs on port 3100.

Feed availability and delays remain provider dependent. A fallback history is price performance, not total return. The existing provider price-basis and corporate-action limitations remain applicable.
