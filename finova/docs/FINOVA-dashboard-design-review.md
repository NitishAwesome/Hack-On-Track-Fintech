# FINOVA Dashboard local design review

Updated 14 October 2026. Dashboard changes were reviewed and validated locally on
`feature/explorer-codex` in `D:\Hack-On-Track-Fintech-codex`.
The baseline is `be606c6b803e781b2cbc41c5097a6768c41c5f09`.
That separate Explorer commit was merged and pushed to main with explicit approval;
Render reported it live. On 14 October the user subsequently authorized committing,
pushing and merging the completed Dashboard and My Investments batch after verification.

## Structure and preserved panels

1. Market strip with a separate provider quote timestamp, retrieval timestamp and
   explicitly qualified calendar estimate of usual trading hours.
2. Welcome and working Add Investment, Import CSV, Record Transaction and Refresh actions.
3. Six summary cards: current value or valued subtotal, invested cost, unrealized P&L,
   unrealized return, positions and broker accounts.
4. Original Portfolio Overview and Exposure Breakdown panels retained after review.
   Overview keeps its donut, illustrative waves, Asset/Sector/Broker controls,
   category chips, Holdings/Sectors/Top Sector footer and original calculations.
   Exposure keeps Top Holdings/Sectors, holding bars, concentration and X-Ray link.
   Hovered slice details now use a readout below the chart instead of an overlapping
   tooltip. Category buttons also expose the readout on keyboard focus.
5. Up to six actual instruments consolidated across accounts, with quoted coverage,
   value, weight, unrealized results and lazy real provider history where supported.
6. Recorded value history and editable FINOVA Intelligence question handoff.
7. Source-linked news with separate Recent and Archive controls.
8. Research paths plus fully visible REIT, InvIT and Bond educational cards.
   The former accordion layout was replaced because unopened siblings looked empty.
9. Recorded transaction activity and colored quick links, including Goals and Watchlist.

Shared effects use theme-aware surfaces, restrained cyan/blue/violet/amber/teal accents,
colored icon tiles, hover border/shadow/lift, focus outlines, press feedback and short
section reveals. Reveal/lift effects respect reduced motion. Controls and text remain
visible without animated motion.

## Data and side-effect boundaries

- Existing portfolio calculation, valuation-basis, ledger, provider, authentication,
  Watchlist, RLS and migration source files were not edited.
- The new presentation helper consolidates actual positions without extending a
  quoted price to unquoted broker positions. Unknown value/return remain unavailable.
  Instruments excluded from the priced allocation show no weight, rather than a
  misleading zero share. All-unquoted allocations still use the existing cost basis.
- Historical snapshots must be genuine complete INR records with valid dates and
  finite values. Cost is never substituted for missing current value; missing dates
  are not filled. A value chart is not described as a cash-flow-adjusted return.
- Dashboard only reads snapshots. It does not automatically record them.
- Allocation waves are retained visual decoration, explicitly labeled as illustrative;
  they are not price history. Holding mini charts use the existing real history pipeline.
- Broker accounts are described as manual/imported. No live broker-sync capability is claimed.
- Opening existing add/import/transaction forms and the editable Intelligence draft
  was verified without saving, importing, sending a question, or changing financial records.
- No remote migration or database mutation was executed for this Dashboard work.
- The two supporting route edits only honor `?action=add` / `?action=import` on initial
  entry into the existing forms. Their accounting operations remain unchanged.

## Validation

- `npx tsc --noEmit`: passed.
- `npm test`: 32 offline product-integrity groups passed, including three Dashboard
  groups for consolidation, genuine snapshots and unavailable-versus-zero metrics.
- `npm run test:ledger`: 20 isolated PGlite financial-integrity cases passed earlier
  in this implementation; no connected Supabase project was used.
- `npm run lint`: zero errors, 73 existing warnings. Targeted changed Dashboard
  components and the new helper passed without warnings.
- `NEXT_DIST_DIR=.next-validation npm run build`: passed, 54 pages generated.
- `git diff --check`: passed.
- Browser: actual CSS widths 360, 390, 768 and 1440 checked in both themes. A 360px
  holdings-card overflow was corrected. Final measurements showed no page overflow.
- Browser: Add Investment, CSV Import, Record Transaction and FINOVA question draft
  destinations verified; Back returned to Dashboard. Existing panel controls and
  keyboard category focus verified. API reads returned data; no write controls were used.

## Files

Modified Dashboard components: `FinovaDashboard`, `PortfolioSummaryMetrics`,
`PortfolioOverviewCard`, `PortfolioExposureCard`, `MyHoldingsSection`,
`AskFinovaCommandSection`, `NewsRelevantToYouSection`, `ExploreOpportunitiesSection`,
`RecentActivitySection`, `QuickLinksCard`.

Other modified files: `components/layout/AppShell.tsx`,
`components/shared/MarketStrip.tsx`, `app/(dashboard)/holdings/page.tsx`,
`app/(dashboard)/transactions/page.tsx`, `scripts/test-product-integrity.mjs`.

New files: `components/dashboard/DashboardValueHistory.tsx`,
`components/shared/PageSection.tsx`, `components/shared/page-effects.css`,
`lib/dashboard/presentation.ts` and this review document.

No tracked files were deleted. Git's removed-line count represents replaced source
markup; it is not a count of deleted holdings, transactions or files. Rewritten new
components were formatted to keep the actual diff readable.

Screenshots are stored outside Git at
`C:\Users\nitis\.codex\visualizations\2026\10\14\finova-dashboard`.
Desktop native captures are available. The preview's direct screenshot API could
not capture the phone override reliably; phone layout was checked through native
views and measured DOM geometry, rather than presenting the failed capture as proof.

## Limits and next action

Provider feeds may be delayed or cached. Daily changes remain explicitly unavailable
when the existing holdings payload does not supply them. Unsupported instrument
histories are not fabricated. The current account does not have enough complete
dated snapshots for a meaningful value-history chart, so its honest empty state appears.

The user authorized publication after the completed local checks. Subsequent page
work proceeds separately from this verified batch.
