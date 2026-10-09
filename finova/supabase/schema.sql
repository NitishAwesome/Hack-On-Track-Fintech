-- ============================================================
-- FINOVA — Canonical Database Schema Reference
-- Includes:
-- 1. Profiles & Auth Integration (Prompt 4)
-- 2. User Agreements Audit Trail (Prompt 4)
-- 3. Broker Accounts (Prompt 5)
-- 4. Instruments Master (Prompt 5)
-- 5. Portfolio Holdings (Prompt 5)
-- 6. Investment Transactions (Prompt 5)
-- 7. Instrument Market Prices & Valuations (Prompt 5)
-- 8. Portfolio Snapshots (Prompt 5)
-- 9. Risk Profiles (Prompt 5)
-- 10. Investment Goals (Prompt 5)
-- 11. AI Insight Cache & News Bookmarks
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shared updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. PROFILES (auth.users extension)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  full_name           TEXT,
  phone               TEXT,
  pan_masked          TEXT,
  risk_appetite       TEXT CHECK (risk_appetite IN ('conservative','moderate','aggressive')) DEFAULT 'moderate',
  preferred_currency  TEXT DEFAULT 'INR',
  onboarding_done     BOOLEAN DEFAULT FALSE,
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
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

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 2. USER AGREEMENTS (AUDIT TRAIL)
-- ============================================================
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

DROP POLICY IF EXISTS "Users view own agreements" ON public.user_agreements;
CREATE POLICY "Users view own agreements"
  ON public.user_agreements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users record own agreements" ON public.user_agreements;
CREATE POLICY "Users record own agreements"
  ON public.user_agreements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_agreements_user_type
  ON public.user_agreements(user_id, agreement_type, agreement_version);


-- ============================================================
-- 3. BROKER ACCOUNTS (public.broker_accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.broker_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_code       TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  account_type      TEXT NOT NULL DEFAULT 'broker' CHECK (account_type IN ('broker', 'depository', 'manual')),
  connection_status TEXT NOT NULL DEFAULT 'MANUAL' CHECK (connection_status IN ('MANUAL', 'NOT_CONNECTED', 'CONNECTED', 'ERROR', 'SYNCING')),
  data_source       TEXT NOT NULL DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'CSV', 'API')),
  currency          TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_broker_accounts_id_user UNIQUE (id, user_id)
);

ALTER TABLE public.broker_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own broker accounts" ON public.broker_accounts;
CREATE POLICY "Users view own broker accounts"
  ON public.broker_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own broker accounts" ON public.broker_accounts;
CREATE POLICY "Users insert own broker accounts"
  ON public.broker_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own broker accounts" ON public.broker_accounts;
CREATE POLICY "Users update own broker accounts"
  ON public.broker_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own broker accounts" ON public.broker_accounts;
CREATE POLICY "Users delete own broker accounts"
  ON public.broker_accounts FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_broker_accounts_updated_at ON public.broker_accounts;
CREATE TRIGGER trg_broker_accounts_updated_at
  BEFORE UPDATE ON public.broker_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_broker_accounts_user_id ON public.broker_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_broker_code ON public.broker_accounts(broker_code);


-- ============================================================
-- 4. INVESTMENT INSTRUMENTS MASTER (public.instruments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instruments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol            TEXT NOT NULL,
  instrument_name   TEXT NOT NULL,
  asset_type        TEXT NOT NULL CHECK (asset_type IN ('STOCK', 'MUTUAL_FUND', 'REIT', 'INVIT', 'BOND', 'CASH')),
  exchange          TEXT NOT NULL DEFAULT 'NSE' CHECK (exchange IN ('NSE', 'BSE', 'NCD', 'MCX', 'MUTUAL_FUND_INDIA', 'OTHER')),
  isin              TEXT,
  currency          TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  issuer_name       TEXT,
  sector            TEXT,
  industry          TEXT,
  maturity_date     DATE,
  coupon_rate       NUMERIC(8,4) CHECK (coupon_rate IS NULL OR coupon_rate >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_custom         BOOLEAN NOT NULL DEFAULT FALSE,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON public.instruments(symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_asset_type ON public.instruments(asset_type);
CREATE INDEX IF NOT EXISTS idx_instruments_isin ON public.instruments(isin);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_isin_unique
  ON public.instruments(isin) WHERE isin IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_global_sym_ex
  ON public.instruments(symbol, exchange) WHERE created_by IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_custom_sym_user
  ON public.instruments(symbol, exchange, created_by) WHERE created_by IS NOT NULL;

DROP POLICY IF EXISTS "Users view global and own custom instruments" ON public.instruments;
CREATE POLICY "Users view global and own custom instruments"
  ON public.instruments FOR SELECT
  USING (created_by IS NULL OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Users create own custom instruments" ON public.instruments;
CREATE POLICY "Users create own custom instruments"
  ON public.instruments FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_custom = TRUE);

DROP POLICY IF EXISTS "Users update own custom instruments" ON public.instruments;
CREATE POLICY "Users update own custom instruments"
  ON public.instruments FOR UPDATE
  USING (auth.uid() = created_by AND is_custom = TRUE)
  WITH CHECK (auth.uid() = created_by AND is_custom = TRUE);

DROP POLICY IF EXISTS "Users delete own custom instruments" ON public.instruments;
CREATE POLICY "Users delete own custom instruments"
  ON public.instruments FOR DELETE
  USING (auth.uid() = created_by AND is_custom = TRUE);

DROP TRIGGER IF EXISTS trg_instruments_updated_at ON public.instruments;
CREATE TRIGGER trg_instruments_updated_at
  BEFORE UPDATE ON public.instruments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 5. PORTFOLIO HOLDINGS (public.holdings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holdings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_account_id UUID NOT NULL,
  instrument_id     UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  quantity          NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
  average_buy_price NUMERIC(18,4) NOT NULL CHECK (average_buy_price >= 0),
  currency          TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  data_source       TEXT NOT NULL DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'CSV', 'API')),
  as_of             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_holdings_broker_user FOREIGN KEY (broker_account_id, user_id)
    REFERENCES public.broker_accounts(id, user_id) ON DELETE CASCADE,

  CONSTRAINT uq_holdings_broker_instrument UNIQUE (broker_account_id, instrument_id)
);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own holdings" ON public.holdings;
CREATE POLICY "Users view own holdings"
  ON public.holdings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own holdings" ON public.holdings;
CREATE POLICY "Users insert own holdings"
  ON public.holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own holdings" ON public.holdings;
CREATE POLICY "Users update own holdings"
  ON public.holdings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own holdings" ON public.holdings;
CREATE POLICY "Users delete own holdings"
  ON public.holdings FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_holdings_updated_at ON public.holdings;
CREATE TRIGGER trg_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_broker_account_id ON public.holdings(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_holdings_instrument_id ON public.holdings(instrument_id);


-- ============================================================
-- 6. INVESTMENT TRANSACTIONS (public.investment_transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_account_id   UUID NOT NULL,
  instrument_id       UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'COUPON', 'BONUS', 'SPLIT', 'FEE')),
  quantity            NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price          NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  gross_amount        NUMERIC(18,4) NOT NULL CHECK (gross_amount >= 0),
  fees                NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  taxes               NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (taxes >= 0),
  net_amount          NUMERIC(18,4) NOT NULL CHECK (net_amount >= 0),
  currency            TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  transaction_date    TIMESTAMPTZ NOT NULL,
  settlement_date     TIMESTAMPTZ,
  source              TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'CSV', 'API')),
  external_reference  TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_transactions_broker_user FOREIGN KEY (broker_account_id, user_id)
    REFERENCES public.broker_accounts(id, user_id) ON DELETE CASCADE,

  CONSTRAINT chk_tx_quantities_and_amounts CHECK (
    (transaction_type IN ('BUY', 'SELL') AND quantity > 0 AND unit_price > 0) OR
    (transaction_type IN ('DIVIDEND', 'INTEREST', 'COUPON', 'FEE') AND gross_amount >= 0) OR
    (transaction_type IN ('BONUS', 'SPLIT') AND quantity > 0)
  )
);

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own transactions" ON public.investment_transactions;
CREATE POLICY "Users view own transactions"
  ON public.investment_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own transactions" ON public.investment_transactions;
CREATE POLICY "Users insert own transactions"
  ON public.investment_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own transactions" ON public.investment_transactions;
CREATE POLICY "Users update own transactions"
  ON public.investment_transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own transactions" ON public.investment_transactions;
CREATE POLICY "Users delete own transactions"
  ON public.investment_transactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_investment_tx_user_date ON public.investment_transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_tx_broker_account ON public.investment_transactions(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_investment_tx_instrument ON public.investment_transactions(instrument_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_tx_dedup
  ON public.investment_transactions(broker_account_id, external_reference)
  WHERE external_reference IS NOT NULL;


-- ============================================================
-- 7. INSTRUMENT MARKET PRICES (public.instrument_prices)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instrument_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id     UUID NOT NULL UNIQUE REFERENCES public.instruments(id) ON DELETE CASCADE,
  price             NUMERIC(18,4) NOT NULL CHECK (price >= 0),
  currency          TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  source            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'DELAYED' CHECK (status IN ('REALTIME', 'DELAYED', 'EOD', 'STALE')),
  day_change        NUMERIC(18,4),
  day_change_pct    NUMERIC(8,4),
  high_52w          NUMERIC(18,4),
  low_52w           NUMERIC(18,4),
  volume            NUMERIC(20,2),
  price_timestamp   TIMESTAMPTZ NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.instrument_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view instrument prices" ON public.instrument_prices;
CREATE POLICY "Users view instrument prices"
  ON public.instrument_prices FOR SELECT
  USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_instrument_prices_inst ON public.instrument_prices(instrument_id);


-- ============================================================
-- 8. PORTFOLIO SNAPSHOTS (public.portfolio_snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date         DATE NOT NULL,
  invested_value        NUMERIC(18,4) NOT NULL CHECK (invested_value >= 0),
  portfolio_value       NUMERIC(18,4) CHECK (portfolio_value IS NULL OR portfolio_value >= 0),
  unrealized_pnl        NUMERIC(18,4),
  realized_pnl          NUMERIC(18,4),
  currency              TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  pricing_timestamp     TIMESTAMPTZ,
  completeness_status   TEXT NOT NULL DEFAULT 'COMPLETE' CHECK (completeness_status IN ('COMPLETE', 'PARTIAL_PRICING', 'NO_PRICING')),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_portfolio_snapshots_user_date UNIQUE (user_id, snapshot_date)
);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users view own portfolio snapshots"
  ON public.portfolio_snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users insert own portfolio snapshots"
  ON public.portfolio_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users update own portfolio snapshots"
  ON public.portfolio_snapshots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users delete own portfolio snapshots"
  ON public.portfolio_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date DESC);


-- ============================================================
-- 9. RISK PROFILES (public.risk_profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_preference       TEXT NOT NULL DEFAULT 'MODERATE' CHECK (risk_preference IN ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE')),
  investment_horizon    TEXT NOT NULL DEFAULT 'MEDIUM_TERM' CHECK (investment_horizon IN ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM')),
  liquidity_preference  TEXT NOT NULL DEFAULT 'BALANCED' CHECK (liquidity_preference IN ('HIGH', 'BALANCED', 'LOW')),
  experience_level      TEXT NOT NULL DEFAULT 'INTERMEDIATE' CHECK (experience_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own risk profile" ON public.risk_profiles;
CREATE POLICY "Users view own risk profile"
  ON public.risk_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own risk profile" ON public.risk_profiles;
CREATE POLICY "Users insert own risk profile"
  ON public.risk_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own risk profile" ON public.risk_profiles;
CREATE POLICY "Users update own risk profile"
  ON public.risk_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own risk profile" ON public.risk_profiles;
CREATE POLICY "Users delete own risk profile"
  ON public.risk_profiles FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_risk_profiles_updated_at ON public.risk_profiles;
CREATE TRIGGER trg_risk_profiles_updated_at
  BEFORE UPDATE ON public.risk_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 10. INVESTMENT GOALS (public.investment_goals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investment_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name     TEXT NOT NULL,
  target_amount NUMERIC(18,4) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date   DATE NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  priority      TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACHIEVED', 'PAUSED', 'CANCELLED')),
  category      TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('EMERGENCY_FUND', 'EDUCATION', 'HOME', 'WEALTH', 'RETIREMENT', 'VEHICLE', 'VACATION', 'GENERAL')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own investment goals" ON public.investment_goals;
CREATE POLICY "Users view own investment goals"
  ON public.investment_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own investment goals" ON public.investment_goals;
CREATE POLICY "Users insert own investment goals"
  ON public.investment_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own investment goals" ON public.investment_goals;
CREATE POLICY "Users update own investment goals"
  ON public.investment_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own investment goals" ON public.investment_goals;
CREATE POLICY "Users delete own investment goals"
  ON public.investment_goals FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_investment_goals_updated_at ON public.investment_goals;
CREATE TRIGGER trg_investment_goals_updated_at
  BEFORE UPDATE ON public.investment_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_investment_goals_user ON public.investment_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_goals_target_date ON public.investment_goals(user_id, target_date);


-- ============================================================
-- 11. ANCILLARY TABLES (AI Insights & Bookmarks)
-- ============================================================
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

DROP POLICY IF EXISTS "Users manage own AI cache" ON public.ai_insight_cache;
CREATE POLICY "Users manage own AI cache"
  ON public.ai_insight_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_cache_user_type
  ON public.ai_insight_cache(user_id, insight_type, portfolio_hash);


CREATE TABLE IF NOT EXISTS public.news_bookmarks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_url   TEXT NOT NULL,
  title         TEXT,
  bookmarked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_url)
);

ALTER TABLE public.news_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.news_bookmarks;
CREATE POLICY "Users manage own bookmarks"
  ON public.news_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
