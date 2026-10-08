-- ============================================================
-- Finova — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  full_name     TEXT,
  phone         TEXT,
  pan_masked    TEXT,
  risk_appetite TEXT CHECK (risk_appetite IN ('conservative','moderate','aggressive')) DEFAULT 'moderate',
  preferred_currency TEXT DEFAULT 'INR',
  onboarding_done BOOLEAN DEFAULT FALSE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, risk_appetite, onboarding_done)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'risk_appetite', 'moderate'),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============ USER AGREEMENTS (AUDIT TRAIL) ============
CREATE TABLE IF NOT EXISTS public.user_agreements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_type      TEXT NOT NULL CHECK (agreement_type IN ('terms_of_service', 'privacy_policy', 'risk_disclosure')),
  agreement_version   TEXT NOT NULL,
  accepted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acceptance_source   TEXT NOT NULL DEFAULT 'registration',
  ip_address          TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own agreements"
  ON public.user_agreements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users record own agreements"
  ON public.user_agreements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_agreements_user_type
  ON public.user_agreements(user_id, agreement_type, agreement_version);


-- ============ BROKER ACCOUNTS ============
CREATE TABLE IF NOT EXISTS public.broker_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  broker_name   TEXT NOT NULL,
  account_label TEXT,
  account_type  TEXT DEFAULT 'demat' CHECK (account_type IN ('demat','trading','mf','other')),
  color_hex     TEXT DEFAULT '#3B82F6',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.broker_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own broker accounts"
  ON public.broker_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============ HOLDINGS ============
CREATE TABLE IF NOT EXISTS public.holdings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  broker_account_id UUID REFERENCES public.broker_accounts(id) ON DELETE SET NULL,
  symbol            TEXT NOT NULL,
  isin              TEXT,
  name              TEXT NOT NULL,
  asset_class       TEXT NOT NULL CHECK (asset_class IN ('equity','reit','invit','bond','sgb','etf','mf')),
  exchange          TEXT,
  quantity          NUMERIC(18,6) NOT NULL,
  avg_buy_price     NUMERIC(18,4) NOT NULL,
  current_price     NUMERIC(18,4),
  price_updated_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own holdings"
  ON public.holdings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_holdings_user ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON public.holdings(symbol);


-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS public.transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  holding_id        UUID REFERENCES public.holdings(id) ON DELETE SET NULL,
  broker_account_id UUID REFERENCES public.broker_accounts(id) ON DELETE SET NULL,
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN ('buy','sell','dividend','bonus','split','rights')),
  symbol            TEXT NOT NULL,
  quantity          NUMERIC(18,6) NOT NULL,
  price             NUMERIC(18,4) NOT NULL,
  charges           NUMERIC(18,4) DEFAULT 0,
  transaction_date  DATE NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON public.transactions(user_id, transaction_date DESC);


-- ============ AI INSIGHT CACHE ============
CREATE TABLE IF NOT EXISTS public.ai_insight_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  insight_type  TEXT NOT NULL,
  portfolio_hash TEXT NOT NULL,
  insight_text  TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.ai_insight_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own AI cache"
  ON public.ai_insight_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_cache_user_type
  ON public.ai_insight_cache(user_id, insight_type, portfolio_hash);


-- ============ NEWS BOOKMARKS ============
CREATE TABLE IF NOT EXISTS public.news_bookmarks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_url   TEXT NOT NULL,
  title         TEXT,
  bookmarked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_url)
);

ALTER TABLE public.news_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bookmarks"
  ON public.news_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
