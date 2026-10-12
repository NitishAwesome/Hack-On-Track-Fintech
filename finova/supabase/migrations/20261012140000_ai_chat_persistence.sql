-- ============================================================
-- FINOVA — AI Chat Persistence & Per-User Conversation History
-- Migration: 20261012140000_ai_chat_persistence.sql
-- Strictly isolated from financial ledger tables.
-- Requires explicit owner approval before remote execution.
-- ============================================================

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Conversation Master Table
CREATE TABLE IF NOT EXISTS public.ai_chat_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'New Research Chat',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on user_id and updated_at for fast conversation list rendering
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user_updated 
  ON public.ai_chat_conversations(user_id, updated_at DESC);

-- Enable Row Level Security on conversations
ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

-- Conversations RLS: Users can only view, create, update, and delete their own conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.ai_chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users can create own conversations"
  ON public.ai_chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.ai_chat_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.ai_chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  sources         JSONB DEFAULT '[]'::jsonb,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on conversation_id and created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conv_created 
  ON public.ai_chat_messages(conversation_id, created_at ASC);

-- Enable Row Level Security on messages
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Messages RLS: Must verify ownership of the parent conversation
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON public.ai_chat_messages;
CREATE POLICY "Users can view messages from own conversations"
  ON public.ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_conversations
      WHERE public.ai_chat_conversations.id = ai_chat_messages.conversation_id
        AND public.ai_chat_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages into own conversations" ON public.ai_chat_messages;
CREATE POLICY "Users can insert messages into own conversations"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_chat_conversations
      WHERE public.ai_chat_conversations.id = ai_chat_messages.conversation_id
        AND public.ai_chat_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete messages from own conversations" ON public.ai_chat_messages;
CREATE POLICY "Users can delete messages from own conversations"
  ON public.ai_chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_conversations
      WHERE public.ai_chat_conversations.id = ai_chat_messages.conversation_id
        AND public.ai_chat_conversations.user_id = auth.uid()
    )
  );

-- Trigger to auto-update updated_at on ai_chat_conversations
CREATE OR REPLACE FUNCTION public.handle_ai_chat_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_chat_conversations_updated_at ON public.ai_chat_conversations;
CREATE TRIGGER trigger_ai_chat_conversations_updated_at
  BEFORE UPDATE ON public.ai_chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ai_chat_conversation_updated_at();
