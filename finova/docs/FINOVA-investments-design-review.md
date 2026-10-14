# My Investments design and verification

14 October 2026. Built alongside the reviewed Dashboard changes in the isolated
`D:\Hack-On-Track-Fintech-codex` checkout, from baseline
`be606c6b803e781b2cbc41c5097a6768c41c5f09`. The user authorized commit, push and merge
after completion. Further pages are a subsequent batch.

## Experience

`/investments` and `/holdings` continue to use the same management workspace.
The page retains its four summaries, all nine desktop table columns, mobile
expandable position details, broker/search/category filters, four sorting options,
Refresh, X-Ray, research/news links, Add/Edit/Delete forms, CSV preview, duplicate
handling choices and sample CSV download.

The layout adds clear headings, blue/cyan/violet/teal accents, icon cards, themed
hover/focus effects, an explicit quote-coverage strip, category counts, ETF and Gold
Bond filters, reset/recovery controls and three relevant portfolio tools at the bottom.
The table's action column remains visible while scrolling; full prices, quantities,
costs and returns remain available. Mobile cards retain every existing detail.

Dialog shells now use the installed Radix Dialog library: titles, initial focus,
Tab containment, Escape, backdrop dismissal and focus restoration. Existing forms
still own their validation and mutation payloads. Failed writes display their actual
error. CSV file selection has a keyboard-accessible button; no unsupported drag/drop
capability is claimed. Drafts remount when the authenticated owner changes.

Direct `?action=add` and `?action=import` entry points now use the same effective
broker selection in their dropdowns and payloads; the visible first account is no
longer paired with an empty account ID. Explicit account choices are preserved.

## Navigation and data

- Supported NSE instruments open the existing research route with a return destination.
  Unsupported instruments route to the appropriate alternative page or catalog search,
  rather than inventing a supported stock research identity.
- Research Back now accepts safe known origins including My Investments and Holdings,
  while its Explorer breadcrumb keeps its discovery meaning. External and unknown
  return destinations fall back to Explorer.
- Summary calculations still call `buildPortfolioSummary`. Unknown prices/results
  stay unavailable; partial valuation uses the same canonical priced subset.
- Quote details retain actual source/status and provider timestamp, including year
  and IST. Source/status are not guessed when missing. Provider realtime is qualified
  as provider-reported; summaries do not claim independent quote verification.
- Loading/failed reads do not masquerade as empty zero-valued portfolios.
- No API, calculation, market-provider, authentication, migration or ledger source
  was changed. A syntax-normalized audit confirmed the existing holdings/broker reads,
  add/update/import/delete API wrappers, CSV parser and sample generator were unchanged.
- Browser verification opened and cancelled forms only. No record was saved, edited,
  imported or deleted by the agent, and no connected migration was executed.

## Validation

- TypeScript passed, including the final production build.
- Production build passed in the separate `.next-validation` directory; 54 pages.
- 34 offline product-integrity groups passed, including new research-navigation and
  honest summary-display tests. Existing comparison, Watchlist, snapshot, Goals,
  provider/backoff and Dashboard regressions passed.
- 20/20 isolated PGlite ledger checks passed. These did not connect to production.
- Full ESLint: zero errors and 66 existing warnings. Changed Investment components
  and routes were checked separately without errors or warnings.
- Whitespace check passed. No tracked files were deleted.
- Authenticated browser: search, category and broker filtering, sorting, reset,
  no-match recovery, mobile expansion, Add/Edit/Delete cancellation and CSV controls
  verified. Add dialog Tab trapping, Escape and restored trigger focus were verified.
- Stock research returned HTTP 200; after refresh, its Back link correctly targeted
  `/investments`. Holdings and broker GETs returned HTTP 200.
- Actual CSS widths 360, 390, 768 and 1440 were checked in both themes, with no document
  overflow. The existing account showed both partial and complete quote coverage as
  its actual data changed; no values were hardcoded for screenshots.

Screenshots are outside Git in
`C:\Users\nitis\.codex\visualizations\2026\10\14\finova-investments`.

## Files for this page

Modified: `app/(dashboard)/holdings/page.tsx`, `app/(dashboard)/investments/page.tsx`,
`app/(research)/explore/stocks/[symbol]/DedicatedStockDetailClient.tsx`,
`lib/navigation.ts`, and the shared product-integrity test script.

Added: `components/investments/InvestmentsSummary.tsx`, `HoldingQuote.tsx`,
`InvestmentDialog.tsx`, `investments.css`, `lib/investments/presentation.ts`, and this note.

Cloud mutation scenarios and live switching between two test accounts remain outside
this visual release's browser checks; isolated ledger/RLS tests passed. View filters
retain their existing local state behavior. No new financial dataset or migration is required.
