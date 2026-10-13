# Light-mode and Goals repair

Date: 13 October 2026

## Changes

- Replaced unthemed dark surfaces and white/pale text in the affected personal and research modules with existing FINOVA theme tokens. Original dark classes, layouts, spacing, cards and accent identities are preserved. Landing/authentication artwork and brand marks are unchanged.
- Fixed the goal form's create/edit contract: the API requires `goal_name`; the form previously sent `name`, causing the reported empty-name error even when a name was entered.
- Allowed arbitrary positive target amounts and non-negative funding in rupees and paise, instead of restricting entries to fixed increments. Form and API reject non-finite amounts and invalid calendar dates.
- Cleared stale form errors on editing and reset the form consistently when opening a new goal. Added loading/retry/delete-error feedback and accessible dialog focus handling.
- Derived the contribution planner's selected goal from refreshed records so edits do not leave its calculations using an old copy. Editing a goal preserves its existing status unless a status change is explicitly requested.
- Gave the Goals URL its correct heading. Future Lab continues to use real holdings and the existing three strategy calculations; simulations do not write holdings.
- Added keyboard operation to strategy cards and theme-aware chart outlines.

## Validation

- TypeScript and the production build passed. ESLint passed with zero errors; the full application has 85 warnings.
- All 11 offline product-integrity groups passed. The new group executes the actual form helper and goal POST/PUT handlers with controlled database dependencies, checking canonical names, owner scoping, amounts, dates and preserved status. No connected database writes are made by these tests.
- The connected `investment_goals` schema exposes the exact fields used by the API in a read-only zero-row probe. This does not prove write permissions or RLS policies.
- Signed-in Future Lab displays the existing holdings and strategy calculations. Goals loading completed with the real empty list. Light dialog background and headings, focus placement, Tab/Shift+Tab trapping and Escape dismissal were verified. Dark headings remain white on dark surfaces. The production build's signed-in Future Lab/Goals screens were also checked, with no sampled browser console errors.
- Future Lab and Goals light views were checked at 360, 390, 768 and 1440px, with no horizontal document overflow. Dashboard, Holdings, Transactions, Performance, Profile, Settings and alternative discovery were sampled in light mode.
- No goal was created, edited or deleted in the user's account. The in-app browser could not reliably fill the native date field, so successful live goal submission remains a manual check; the corrected request/response behavior passed offline regression tests.

No commit, push, deployment or migration was performed for this repair. The development server remains available at `http://localhost:3000/future-lab` for review.

Saved previews: [Future Lab in light mode](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-future-lab-light.jpg), [Goals in light mode](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-goals-light.jpg), and [goal dialog](C:/Users/nitis/.codex/visualizations/2026/10/13/01a13472-fd4e-7fc2-8f65-93b9e8616eac/finova-goal-dialog-light.jpg).
