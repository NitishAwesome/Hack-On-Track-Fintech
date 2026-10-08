-- ============================================================
-- FINOVA — Auth, User Profiles & Agreement Recording Migration
-- Version: 1.0.0
-- ============================================================

-- 1. Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enhance Profiles Table
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

-- Ensure columns exist if table was already created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies:
-- Users can only read, update their own profile
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

-- 3. Versioned User Agreements Audit Table
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

-- Enable Row Level Security on user_agreements
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- User Agreements RLS Policies:
-- Users can read their own agreement acceptances
DROP POLICY IF EXISTS "Users view own agreements" ON public.user_agreements;
CREATE POLICY "Users view own agreements"
  ON public.user_agreements FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert agreement acceptances for themselves
DROP POLICY IF EXISTS "Users record own agreements" ON public.user_agreements;
CREATE POLICY "Users record own agreements"
  ON public.user_agreements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Immutable: Users CANNOT update or delete historical agreement records
-- No UPDATE or DELETE policies are granted to authenticated users.

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_agreements_user_type
  ON public.user_agreements(user_id, agreement_type, agreement_version);

-- 4. Auto-Profile Creation Trigger from auth.users
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

-- 5. Updated_at Trigger for Profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
