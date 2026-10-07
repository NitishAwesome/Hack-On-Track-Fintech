# Finova

**Your Investments. Unified. Understood.**

A premium fintech web application for Indian retail investors — unify all your investments across brokers and depositories in one place, with AI-powered insights.

---

## Features (Phase 1)

- ✅ Email OTP + Google OAuth authentication (no passwords)
- ✅ Unified portfolio overview across multiple brokers
- ✅ Holdings management (manual entry)
- ✅ Investment performance analysis
- ✅ Asset class & broker allocation charts
- ✅ Portfolio risk analysis (HHI-based risk score)
- ✅ AI-powered insights (Gemini 1.5 Flash)
- ✅ Market news (NewsData.io)
- ✅ Learn: Stocks, REITs, InvITs, Bonds
- ✅ Dark/light mode
- ✅ Responsive (desktop, tablet, mobile)

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI Components**: Radix UI primitives + Framer Motion + Recharts + Lucide
- **Backend**: Next.js Route Handlers (server-side only)
- **Database**: Supabase PostgreSQL + Row Level Security
- **Auth**: Supabase Auth (Email OTP + Google OAuth)
- **AI**: Google Gemini 1.5 Flash
- **News**: NewsData.io

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the values from:
- [Supabase](https://supabase.com) → Project Settings → API
- [Google AI Studio](https://aistudio.google.com) → API Keys
- [NewsData.io](https://newsdata.io) → API Keys

### 3. Set up the database

Open your Supabase project → SQL Editor → paste and run `supabase/schema.sql`.

### 4. Enable Supabase Auth providers

In Supabase Dashboard → Authentication → Providers:
- Enable **Email** (OTP mode)
- Enable **Google** (add OAuth credentials from Google Cloud Console)

Set your site URL and redirect URLs to `http://localhost:3000`.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
finova/
├── app/
│   ├── (auth)/          # Login & Register pages
│   ├── (dashboard)/     # Protected dashboard pages
│   └── api/             # Server-side API routes
├── components/
│   ├── layout/          # Sidebar, Topbar
│   ├── portfolio/       # Charts and portfolio components
│   ├── insights/        # AI insight cards
│   ├── shared/          # StatCard, EmptyState, Skeletons
│   └── providers/       # Theme & Query providers
├── lib/
│   ├── calculations/    # Portfolio, risk calculations
│   └── supabase/        # DB clients
├── types/               # TypeScript types
└── supabase/            # Database schema
```

---

## Important Notes

- No broker credentials are ever stored (no passwords, MPIN, TPIN, OTP)
- All financial data is user-entered (manual import)
- AI insights use only aggregated metrics — no personal identifiers sent to Gemini
- All external API calls happen server-side — keys are never exposed to the browser

---

## Phase 2 (Roadmap)

Trading (buy/sell/modify), order tracking, bank integration, IPO, mutual funds, live prices, watchlist, broker API integrations.

---

*Not financial advice. For informational purposes only.*
