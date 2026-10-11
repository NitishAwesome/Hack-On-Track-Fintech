# FINOVA — Production Deployment Readiness Checklist
**Project:** FINOVA — All Your Investments, in One Place  
**Team:** Neural Nexus  
**Hackathon:** Hack on Track — FinTech PS 2  
**Target Host:** Vercel / Node.js 20+ Runtime  

---

## 1. Environment Variable Configuration

> [!IMPORTANT]
> Never commit actual API keys or secrets to Git. Configure these in the Vercel Project Settings > Environment Variables (or production server `.env.production`).

| Variable Name | Required Scope | Purpose & Provider |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client & Server | Supabase project REST API endpoint URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client & Server | Supabase public anonymous API key (governed by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** (Never prefix `NEXT_PUBLIC_`) | Supabase administrative operations (optional, for backend migrations) |
| `NEWSDATA_API_KEY` | **Server-Only** (Never prefix `NEXT_PUBLIC_`) | NewsData.io API key for live Indian financial headlines |
| `GEMINI_API_KEY` | **Server-Only** (Never prefix `NEXT_PUBLIC_`) | Google Gemini 1.5 Flash API key for grounded news explanations |
| `NEXT_PUBLIC_APP_URL` | Public / Client & Server | Canonical deployment origin (e.g., `https://finova.vercel.app`) |

---

## 2. Supabase Authentication & URL Configuration

In the Supabase Dashboard under **Authentication > URL Configuration**:

- [ ] **Site URL:** Set to `https://<your-production-domain>.vercel.app`
- [ ] **Redirect URLs (Allow list):**
  - `https://<your-production-domain>.vercel.app/**`
  - `https://<your-production-domain>.vercel.app/auth/callback`
  - `http://localhost:3000/**` (for local development testing)
- [ ] **OAuth Providers (if Google OAuth is enabled):**
  - Ensure Google Cloud Console authorized redirect URIs include:  
    `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`

---

## 3. Database Schema & Migration Preflight

Before enabling broker deletion in production:
- [ ] Review `docs/runbooks/BROKER_DELETION_MIGRATION_RUNBOOK.md`.
- [ ] Execute `supabase/migrations/20261011000000_safe_broker_deletion_and_restrict_cascade.sql` in the Supabase SQL Editor.
- [ ] Verify that `safe_delete_broker_account(UUID)` RPC exists:
  ```sql
  SELECT proname, prorettype, prosecdef, proconfig
  FROM pg_proc
  WHERE proname = 'safe_delete_broker_account';
  ```
- [ ] Confirm Row-Level Security (RLS) is enabled on all tables:
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public';
  ```

---

## 4. Next.js Build & Runtime Verification

Run locally before deploying:
- [ ] **TypeScript Check:** `npx tsc --noEmit` exits with status `0`.
- [ ] **Lint Verification:** `npm run lint` exits with status `0`.
- [ ] **Production Build:** `npm run build` generates optimized production routes without errors.
- [ ] **Bundle Security:** Ensure server secrets (`GEMINI_API_KEY`, `NEWSDATA_API_KEY`) do NOT appear in the client-side `.next/static` bundles.

---

## 5. Security Headers & Middleware

In `next.config.ts`, verify production security headers:
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 6. Post-Deployment Verification Steps (Smoke Test)

After Vercel finishes deployment:
1. **Public Route Access:**
   - [ ] Visit `https://<domain>/` (Landing page loads with live market strip).
   - [ ] Visit `https://<domain>/demo` (Demo evaluation hub renders immediately with persistent illustrative disclaimer).
   - [ ] Visit `https://<domain>/login` (Login page displays 1-click Demo button and email/password fields).
2. **Authenticated Journey:**
   - [ ] Sign in with a verified account.
   - [ ] Verify Dashboard portfolio cards render without NaN or Infinity.
   - [ ] Add a test holding and verify calculated value.
   - [ ] Visit `/news` and verify truthful provider status badge.
   - [ ] Visit `/analysis` (Investment X-Ray) and verify overlap detection.
   - [ ] Sign out cleanly.

---

## 7. Rollback Procedure

If a critical issue occurs post-deployment:
1. In the Vercel Dashboard, navigate to **Deployments**.
2. Locate the previous stable deployment (commit `811e54d` or latest tested release).
3. Click the three dots menu and select **"Instant Rollback"**.
4. Traffic is redirected to the previous build in $< 5\text{ seconds}$.
