# FINOVA — Judge FAQ & Technical Defense Guide
**Project:** FINOVA — All Your Investments, in One Place  
**Team:** Neural Nexus  
**Hackathon:** Hack on Track — FinTech PS 2  

This document prepares the team with factual, technically rigorous answers to common judge questions.

---

### Q1: "Are you actually connected to live broker accounts like Zerodha, Groww, and Upstox via API?"
**Answer:**
> **No, and we are completely transparent about this.**  
> Under SEBI (Securities and Exchange Board of India) regulations and exchange compliance rules, connecting live broker trading APIs (such as Zerodha Kite Connect, Upstox API, or Groww SDK) requires a registered legal corporate entity, commercial API licensing agreements, static IP whitelisting, and two-factor user consent.  
> Claiming live broker connections in a hackathon prototype would be deceptive. Instead, FINOVA provides:
> 1. **Manual Broker Account Tracking:** Flexible containers representing verified depositories and brokerages.
> 2. **Tradebook CSV Importers:** Tested against Zerodha, Groww, and Angel One tradebook exports with deduplication.
> 3. **API Readiness Architecture:** The data models and service layers (`BrokerAccount`, `BrokerConnectionStatus`) are architected to ingest tokenized OAuth sessions as soon as institutional API keys are provisioned.

---

### Q2: "Where do you get your stock market prices, and are they real-time?"
**Answer:**
> We source genuine Indian market quotes (NSE and BSE) directly from Yahoo Finance v8 chart APIs.  
> - **They are REAL prices** — we strictly refuse to invent fake or hardcoded quotes for Nifty, Sensex, Reliance, or any other instrument.
> - **They are DELAYED by ~15 minutes** — free upstream Yahoo chart feeds enforce a 15-minute exchange delay during live market hours. We disclose this clearly with `DELAYED (15m)` and `EOD` badges.
> - **Resilience:** If Yahoo Finance fails or times out, FINOVA retains the last verified successful quote with a truthful `STALE` status and original timestamp. If no valid quote exists, we honestly display `Price unavailable` rather than fabricating numbers.

---

### Q3: "How does FINOVA detect cross-broker overlap?"
**Answer:**
> When an investor holds the same instrument across multiple broker accounts (e.g., 25 shares of Reliance in Zerodha and 15 shares in Groww):
> 1. FINOVA's `InvestmentXRayEngine` resolves both holdings to the unique primary instrument identifier (e.g. NSE ticker `RELIANCE` or ISIN).
> 2. It aggregates quantity ($25 + 15 = 40$) and computes the mathematically accurate **weighted average cost basis**:
>    $$\text{Unified Average Buy Price} = \frac{(25 \times 2450) + (15 \times 2520)}{40} = \text{₹}2,476.25$$
> 3. It computes the combined portfolio weight and checks concentration against retail risk thresholds ($> 15\%$ single-stock flag, $> 30\%$ single-sector flag).
> 4. This is presented in the **Investment X-Ray** dashboard with actionable concentration warnings.

---

### Q4: "How does FINOVA satisfy the second part of PS-2: understanding REITs, InvITs, and bonds?"
**Answer:**
> PS-2 specifically mandates: *"help them understand options beyond stocks, like REITs, InvITs and bonds."*  
> FINOVA features a dedicated **Alternative Investment Terminal**:
> - **Regulatory Truth:** Explains the SEBI 90% Net Distributable Cash Flow (NDCF) distribution mandate for REITs and InvITs.
> - **Risk Honesty:** Explicitly debunks the myth of "guaranteed returns." We explain lease vacancy risk for REITs, toll collection and concession expiry (finite asset life) for InvITs, and credit default risk for corporate bonds.
> - **Interactive Financial Calculators:** Investors can model cash flows based on capital, NDCF yield percentages, coupon frequency, and face value.
> - **Knowledge Checks:** Bite-sized interactive quizzes that test understanding of tax treatment, liquidity differences, and investment horizons with instant corrective feedback.

---

### Q5: "How did you ensure the Demo Investor mode does not leak real data or compromise security?"
**Answer:**
> Security and data isolation were our top priorities:
> 1. **Zero Public Credentials:** We do NOT hardcode demo passwords, create public demo environment variables, or expose shared service keys.
> 2. **In-Memory Evaluation Workspace:** The `/demo` route operates on a deterministic, client-side synthetic dataset (`lib/demoData.ts`). It executes the identical pure calculation engines (`computeUnifiedXRay`, `enrichHolding`, `generateAllocationData`) without calling authenticated Supabase database endpoints.
> 3. **Row-Level Security (RLS) Preserved:** Real user portfolios are protected by strict PostgreSQL RLS policies (`auth.uid() = user_id`). Demo visitors cannot read or mutate any real user's financial records.
> 4. **Persistent Truth Label:** Every demo view displays an unambiguous top disclaimer: *"Demo Portfolio — Illustrative Data"*.

---

### Q6: "Why is the atomic broker deletion migration not executed on the remote database yet?"
**Answer:**
> Financial data integrity requires that records must never be accidentally destroyed or left orphaned:
> 1. In Prompt 15, we discovered that deleting a broker account could trigger a cascade or race condition with dependent transactions and holdings.
> 2. We designed an atomic database RPC (`safe_delete_broker_account`) with `ON DELETE RESTRICT` constraints to prevent deletion of accounts with historical financial transactions.
> 3. Because this involves remote schema modifications, FINOVA **fails closed**: the API rejects deletion with `ATOMIC_MIGRATION_REQUIRED` until a database administrator reviews and runs the migration.
> 4. We prepared a comprehensive migration runbook (`docs/runbooks/BROKER_DELETION_MIGRATION_RUNBOOK.md`) for safe manual execution by the project owner.

---

### Q7: "How is Google Gemini integrated, and how do you prevent hallucinations?"
**Answer:**
> FINOVA uses Google Gemini 1.5 Flash via `@google/generative-ai` with strict grounding and prompt constraints:
> 1. **Grounded In Real Context:** Gemini is fed only verified data: actual financial news headlines retrieved from NewsData.io and the user's specific asset weightings.
> 2. **Financial Advice Safeguard:** The system prompt explicitly forbids predicting stock price targets, promising returns, or recommending buy/sell actions (protecting against unlicensed advisory liability).
> 3. **Deterministic Fallback:** If the Gemini API key is missing, times out, or encounters rate limits, FINOVA falls back to verified deterministic educational templates with zero service interruption.

---

### Q8: "How does FINOVA support the UN Sustainable Development Goals (SDGs)?"
**Answer:**
> - **SDG 8 (Decent Work & Economic Growth):** Bridges the gap between retail savings and formal capital markets, mobilizing citizen capital into productive Indian enterprises and infrastructure.
> - **SDG 9 (Industry, Innovation & Infrastructure):** Educates everyday retail investors on InvITs, which directly fund highway networks, power transmission grids, and renewable energy infrastructure.
> - **SDG 10 (Reduced Inequalities):** Democratizes access to institutional-grade wealth generation strategies and alternative asset classes that were historically accessible only to family offices and institutional investors.

---

### Q9: "What did you do about the high-severity `braces` vulnerability reported by `npm audit`?"
**Answer:**
> We thoroughly audited the dependency graph:
> 1. `npm ls braces` confirms that `braces@3.0.3` is already installed and enforced via the `"overrides"` field in `package.json`. Version 3.0.3 is the patched release addressing CVE-2024-4068.
> 2. The remaining `npm audit` warning originates transitively from `@next/eslint-plugin-next@16.4.0` in `devDependencies`.
> 3. `npm audit fix --force` would downgrade Next.js from version 16 to 14, breaking the application.
> 4. Because this dependency is strictly a build-time linter and never included in the browser runtime bundle, it represents zero production attack surface and does not block deployment.
