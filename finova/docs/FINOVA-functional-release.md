# FINOVA functional release record

Reviewed locally on 13 October 2026. Release status: **local implementation validated; production release pending**.

## Agreed scope

The existing FINOVA style and Explorer/Dashboard layouts are preserved. The proposed Explorer/Dashboard redesign, compact discovery layout and allocation-graph replacement were withdrawn after the user requested the original UI. Light-theme contrast was subsequently repaired at the user's request. A later request aligned Future Lab with the existing page spacing and restructured Financial Goals within that style; see the [search and Goals update](FINOVA-search-and-goals-update.md).

No commit, push, production deployment or connected-database mutation was performed. The abandoned redesign was archived outside the repository at `C:\Users\nitis\.codex\backups\finova-ui-revert-20261013`.

## Implemented

- Public research routes retain their URLs under a sibling research layout. Portfolio, goals, Watchlist and Intelligence routes and APIs require authentication. Safe sign-in destinations preserve research context.
- Private React Query data is scoped to the authenticated user, cleared on account changes, and invalidated after portfolio mutations. Public research does not query guest holdings. News personalization and instrument responses use private, non-shared caching.
- Quotes carry nullable provider session ranges. Daily movement uses the canonical quote, selected-period movement uses chart points, stale fallback preserves original quote time, and missing data stays unavailable. Real history replaces fixed stock sparklines. Calendar session estimates are labeled as estimates.
- Explorer filters, sectors and pagination use URL state; coverage counts and sector names come from the catalog. Index shortcuts resolve to index identities. Stock detail preserves the discovery return link and exposes Overview, Financials, News and Compare controls.
- Historical charts preserve all seven ranges, show provider volume when available, and include an expanded dialog with keyboard focus trapping, Escape and focus restoration.
- Follow has authenticated GET/PUT/DELETE endpoints, catalog validation, idempotent writes, pending/error feedback, optimistic rollback and an additive owner-isolated Watchlist migration. Guests must deliberately Follow after authentication.
- Two-stock comparison supports distinct catalog NSE equities and 1M/3M/1Y windows. It intersects trading dates, normalizes both series to 100 on the shared start date, excludes missing observations and labels results as price performance. Provider adjustment uncertainty and large discontinuities are disclosed.
- The version-controlled financial dataset contains FY2025–26 and comparative-year revenue, owners' profit, diluted EPS and operating cash flow for RELIANCE, TCS and INFY. Every field includes its unit, reporting basis, official document/page and fixed review date. Annual figures are not presented as TTM.
- The IPO archive contains documented NTPC Green and Afcons listings. Unsupported current/upcoming categories show no reviewed records. Alternative assets retain sourced identities and education; unreviewed prices, yields, ratings and distribution histories are unavailable.
- Dashboard, holdings, Performance, X-Ray and Future Lab use consistent valuation coverage. Partial/stale values are not presented as complete portfolio totals. Allocation weights use the priced subset or clearly labeled invested cost when nothing is priced. The retained original wave illustration is labeled as illustrative.
- Recorded portfolio snapshots are authorized and recalculated on the server; client-provided totals, owner IDs and dates cannot create forged portfolio history. Empty/incomplete/stale valuations are rejected.
- Future Lab reads the actual holdings response and preserves recorded positions. Financial Goals has a dedicated `/goals` page; the legacy Goals URL tab redirects there. Goal funding summaries, filtered goal lists, savings scenarios and draft templates use the existing zero-growth calculations. Global navbar search works across the shared shell. Intelligence links prefill editable context without submitting a question. Conversation errors and temporary persistence are visible. Notification read state is user-scoped.
- Refresh, reduced motion and the supported display preference are wired to their behavior. Shared and existing alternative dialogs receive keyboard access. Research actions and search navigation work within the original shell.

## Validation evidence

| Check | Result |
|---|---|
| TypeScript | Passed, including the production build's TypeScript stage |
| Production build | Passed; 54 static pages generated and dynamic research/personal routes included |
| ESLint | Zero errors; 79 warnings remain across the application |
| `npm test` | 13 offline product-integrity groups passed |
| `npm run test:ledger` | 20 isolated PostgreSQL financial-integrity checks passed |
| Git whitespace check | Passed |
| Guest production HTTP routes | Explorer, stock detail, News, REITs, InvITs, Bonds, IPO and Learn returned 200 |
| Protected production HTTP routes | Dashboard/Watchlist redirect to sign-in with destination; Watchlist/holdings/Intelligence APIs returned 401 |
| Cache boundaries | Private APIs returned private/no-store; News varies on Cookie; financial research response is public and contains no holdings |
| Browser research journey | Directory search/pagination and browser Back/Forward, keyboard stock opening, unknown-symbol not-found view, preserved return link, annual financial table, comparison and guest Follow destination verified |
| Chart accessibility | Expanded dialog focuses its Close control, traps Tab, closes on Escape and restores the trigger focus |
| Responsive research | Comparison checked in both themes at 360/390/768/1440; directory, IPO, News and REIT discovery checked at those widths; no horizontal document overflow in sampled views |
| Provider behavior | Production comparison returned 19/64/247 aligned observations for 1M/3M/1Y respectively, each starting both series at 100; duplicate symbols returned 400. Real news responses observed; unavailable session fields, failure/backoff and original stale timestamps covered offline |

The product tests execute actual source contracts with controlled dependencies. They cover empty/partial/complete/stale/invalid valuations, shared allocation basis, immutable simulations, aligned comparisons, Follow rollback and idempotence, safe navigation, provenance, canonical daily movement, snapshot integrity, provider failure/backoff, news dates and the Watchlist migration's two-user/anonymous RLS isolation. They do not write to connected services.

The subsequent [light-mode and Goals fix](FINOVA-light-mode-goals-fix.md) adds signed-in visual checks, canonical goal create/edit contract regression coverage and a read-only check of the connected goal schema. Cloud goal writes and destructive account scenarios remain untested on the user's account.

The [search and Goals update](FINOVA-search-and-goals-update.md) records the latest authenticated navbar navigation, dedicated Goals route, responsive planning layouts and native date-input calculator checks. These checks did not create or alter account records.

The ledger test uses isolated PGlite PostgreSQL. Its success proves the checked migration source behavior in that isolated database; it does not prove which migrations are installed in production.

Representative original-layout research screenshots were saved outside the source tree: [stock overview](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-overview.jpg) and [annual financials](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-financials.jpg). The production browser session reported no console errors during the sampled research journey.

## Remaining release gates

1. **Watchlist database setup.** A read-only REST schema probe found the legacy portfolio tables available and `user_watchlist` absent from the connected schema. Run `supabase/preflight-product.sql` as the database owner and retain the output. Verify existing ledger functions/policies independently, then apply `supabase/migrations/20261013000000_user_watchlist.sql` through the normal migration process. No production ledger migration should be blindly replayed.
2. **Authenticated end-to-end testing.** With two authorized test users, verify cloud Follow persistence and failed writes, logout/account switching, portfolio views, transaction import/reconciliation, guarded broker deletion, real Goals/Intelligence persistence and user-isolated notifications. Perform destructive ledger scenarios only in an isolated database.
3. **Remaining personal-page visual/accessibility checks.** Signed-in Dashboard, holdings, brokers, Transactions, Performance, X-Ray, Risk Radar, Future Lab/Goals, Intelligence, Profile and Settings still need full browser journeys at the requested widths/themes. Public research checks and offline calculations do not replace those journeys. Existing educational/legal copy also needs a separate content review before making regulatory or tax claims.
4. **Feed permissions.** Public display/redistribution permissions for the configured market/news feeds have not been established. Provider availability and attribution do not themselves establish those rights. Do not promise licensed coverage, continuous live data or redistribution until the applicable provider terms are confirmed.
5. **Review and release.** Review this local change before releasing through the existing Render service. Retain the prior deployed commit for rollback and record the migration result. The additive Watchlist table can remain when the prior application is restored. After release, check authentication failures, quote/news provider failures, Watchlist writes and portfolio calculation consistency.

No paid feeds, trading, scheduled alerts, analyst forecasts or price targets were added. Orders and Mutual Funds remain unavailable. The withdrawn visual transformation is outside this functional release.

## Reproduce local validation

From the `finova` directory, run `npm test`, `npm run test:ledger`, `npx tsc --noEmit`, and `npm run lint`. Inspect any legacy test script before running it; some older scripts target connected services.

PowerShell production validation uses `$env:FINOVA_BUILD_DIR='.next-validation'` followed by `npm run build` and `npm run start -- --port 3001`. The separate build directory prevents interference with an existing development server. The temporary responsive harness was moved outside the app before the final build.
