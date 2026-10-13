# FINOVA navbar search and planning-page update

Reviewed locally on 13 October 2026. Changes are local; no commit, deployment or connected-database write was performed.

## Requested changes

- Replace the inert navbar input with shared search for supported stocks, indices and active pages. Search works from personal and public research pages, supports keyboard navigation, `/` and Ctrl/Cmd+K shortcuts, and has a mobile search dialog. Broader queries open Explorer with encoded search state; stock results preserve an Explorer return destination.
- Align Future Lab and Goals with FINOVA's existing padded, centered page container and theme tokens. Preserve the three strategy templates and simulation calculations. Index-strip cards retain their readable width and scroll when space is limited, fixing overlapping values at tablet width.
- Give Financial Goals its own `/goals` route, title and selected sidebar entry. The old `/future-lab?tab=goals` URL redirects to it. Planning links use ordinary Next.js links and work with browser Back/Forward.
- Make Goals useful before and after saving a goal: target/funding/gap/monthly overview, funding coverage, goal selection, status filters, date/priority sorting, edit/funding actions, guarded deletion, a monthly savings sandbox, four draft templates and concise review guidance.

## Calculation and persistence boundaries

Funding remains manually recorded and separate from portfolio value. Plans use the existing zero-growth methodology. Cancelled goals do not count toward totals; paused goals count toward recorded targets/funding but do not inflate active monthly requirements. Excess funding in one goal cannot hide another goal's funding gap. Past deadlines are flagged for review.

The savings sandbox is temporary. Reviewing a scenario or choosing a template opens a draft; only an explicit Save Goal performs a write. Templates provide a name/category and leave the amount/date to the user. Create/edit still use the canonical `goal_name` API contract and existing user-isolated endpoints. Future Lab's holdings/X-Ray/news queries are disabled on the Goals page.

## Verification

- 13 offline product-integrity groups passed, including global-search catalog/page matching and goal aggregation/projection edge cases. Existing goal create/edit contract tests remain included.
- TypeScript and the production build passed; 54 static pages were generated. Full ESLint reported zero errors and 79 existing warnings; the changed planning/search components passed targeted ESLint without warnings. Git whitespace check passed.
- In the signed-in browser, TCS search from Goals opened Tata Consultancy Services research with an Explorer return URL. Keyboard search from stock research opened Goals. Mobile search opened INFY research and closed the dialog. Ctrl+K and `/` focused search; empty-query keyboard navigation opened Dashboard. A no-match search showed an explicit message and its submit button opened the encoded Explorer query.
- The Goals sidebar/title, planning links, legacy redirect and browser Back/Forward were verified. The emergency-fund template filled its name/category with blank target/date, then was cancelled.
- Native date-input checks used a temporary scenario: target ₹101,000, recorded funding ₹40,000, target date 30 January 2027 and monthly budget ₹10,000. The current methodology reported three monthly periods, required monthly savings ₹20,333.33, projected funding ₹70,000 and remaining gap ₹31,000. Reviewing the scenario copied those amounts/date into a draft, which was cancelled without saving.
- Goals was visually checked at desktop, tablet and 360/390px widths in both themes. Future Lab was checked at desktop/tablet and mobile widths in both themes. The tablet index overlap was reproduced and corrected; the mobile strategy heading keeps its step badge intact and places preferences beneath it. These are sampled checks, not a claim that every personal-page journey was exercised.
- Production HTTP checks confirmed that unauthenticated `/goals` and the legacy Goals URL return a 307 sign-in redirect with their safe destination, and `/api/goals` returns 401. Each response uses private/no-store caching. The built Future Lab also rendered in the authenticated browser.

No test goal was saved to the user's account. Cloud persistence and two-user isolation still require authorized test accounts; offline route checks do not replace those release gates.

## Screenshots

Saved outside the source tree:

- [Goals, dark](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-goals-restructured-dark.png)
- [Goals, light](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-goals-restructured-light.png)
- [Goals, mobile](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-goals-mobile-dark.png)
- [Goals, tablet](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-goals-tablet-light.png)
- [Future Lab, desktop](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-future-lab-aligned-dark.png)
- [Future Lab, tablet](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-future-lab-tablet-light.png)
- [Future Lab, mobile](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-future-lab-mobile-light.png)
