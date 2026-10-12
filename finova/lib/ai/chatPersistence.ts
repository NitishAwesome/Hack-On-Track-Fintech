// ============================================================
// FINOVA — AI Chat Persistence & Per-User Conversation History
// lib/ai/chatPersistence.ts
//
// Strictly isolates chat data from financial ledger.
// Enforces user ownership at the service layer and utilizes
// Supabase RLS with graceful session fallback when migrations
// remain pending approval.
// ============================================================

import { isSupabaseConfigured } from '../supabase/config.ts';
import type {
  AIChatConversation,
  AIChatMessage,
  AIChatRole,
  AIChatSource,
  AIChatMessageMetadata,
} from '../../types/chat.ts';

async function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { createClient } = await import('../supabase/server.ts');
    return await createClient();
  } catch {
    return null;
  }
}

// In-memory session store for local/testing or when remote DB tables are pending migration
const memoryConversations = new Map<string, AIChatConversation>();
const memoryMessages = new Map<string, AIChatMessage[]>();

/**
 * Extracts a concise, clean, deterministic title from the user's first query.
 * Avoids extra LLM calls and token expense.
 */
export function generateDeterministicTitle(rawText: string): string {
  if (!rawText || !rawText.trim()) return 'New Research Chat';

  const cleaned = rawText
    .replace(/^(can\s+you\s+)?(please\s+)?(explain|tell\s+me\s+about|what\s+is|what\s+are|how\s+does|why\s+is|compare|analyze)\s+/i, '')
    .replace(/[?!.,;:"'()[\]{}]/g, '')
    .trim();

  // If user asked "Compare RELIANCE and TCS", format nicely
  const compareMatch = rawText.match(/compare\s+([A-Za-z0-9]+)\s+(and|vs|with)\s+([A-Za-z0-9]+)/i);
  if (compareMatch) {
    return `${compareMatch[1].toUpperCase()} vs ${compareMatch[3].toUpperCase()} Comparison`;
  }

  // Stock question match
  const stockMatch = rawText.match(/\b([A-Z]{3,10})\b/);
  if (rawText.toLowerCase().includes('news') && stockMatch) {
    return `${stockMatch[1].toUpperCase()} News & Market Research`;
  }

  if (rawText.toLowerCase().includes('risky') || rawText.toLowerCase().includes('risk radar')) {
    return 'Portfolio Risk & Concentration';
  }

  if (rawText.toLowerCase().includes('invest another') || rawText.toLowerCase().includes('future lab')) {
    return 'Future Lab Allocation Scenario';
  }

  if (rawText.toLowerCase().includes('diversification') || rawText.toLowerCase().includes('hhi')) {
    return 'Portfolio Diversification Analysis';
  }

  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 5);
  if (words.length === 0) return 'Portfolio Research';

  const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return title.slice(0, 40);
}

function isTableMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const msg = String((err as { message?: string }).message || '').toLowerCase();
  const code = String((err as { code?: string }).code || '');
  return (
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('relation "public.ai_chat_conversations" does not exist') ||
    msg.includes('relation "public.ai_chat_messages" does not exist')
  );
}

/**
 * List conversations owned by the authenticated user.
 */
export async function listUserConversations(userId: string): Promise<{
  conversations: AIChatConversation[];
  persistenceStatus: 'persisted' | 'pending_migration' | 'session_fallback';
}> {
  if (!userId) {
    return { conversations: [], persistenceStatus: 'session_fallback' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('id, user_id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return {
          conversations: data as AIChatConversation[],
          persistenceStatus: 'persisted',
        };
      }

      if (isTableMissingError(error)) {
        // Fallback to memory
        const userMems = Array.from(memoryConversations.values())
          .filter((c) => c.user_id === userId)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return {
          conversations: userMems,
          persistenceStatus: 'pending_migration',
        };
      }
    } catch {
      // Ignore and use memory fallback
    }
  }

  const userMems = Array.from(memoryConversations.values())
    .filter((c) => c.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return {
    conversations: userMems,
    persistenceStatus: isSupabaseConfigured() ? 'pending_migration' : 'session_fallback',
  };
}

/**
 * Get a specific conversation owned by the authenticated user.
 */
export async function getUserConversation(
  conversationId: string,
  userId: string
): Promise<AIChatConversation | null> {
  if (!conversationId || !userId) return null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('id, user_id, title, created_at, updated_at')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        return data as AIChatConversation;
      }
    } catch {
      // Ignore and check memory
    }
  }

  const mem = memoryConversations.get(conversationId);
  if (mem && mem.user_id === userId) {
    return mem;
  }
  return null;
}

/**
 * Create a new conversation owned by the authenticated user.
 */
export async function createUserConversation(
  userId: string,
  title = 'New Research Chat'
): Promise<{
  conversation: AIChatConversation;
  persistenceStatus: 'persisted' | 'pending_migration' | 'session_fallback';
}> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const now = new Date().toISOString();
  const convRecord: AIChatConversation = {
    id: newId,
    user_id: userId,
    title,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .insert({
          id: newId,
          user_id: userId,
          title,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          conversation: data as AIChatConversation,
          persistenceStatus: 'persisted',
        };
      }

      if (isTableMissingError(error)) {
        memoryConversations.set(newId, convRecord);
        memoryMessages.set(newId, []);
        return {
          conversation: convRecord,
          persistenceStatus: 'pending_migration',
        };
      }
    } catch {
      // Fall through to memory
    }
  }

  memoryConversations.set(newId, convRecord);
  memoryMessages.set(newId, []);

  return {
    conversation: convRecord,
    persistenceStatus: isSupabaseConfigured() ? 'pending_migration' : 'session_fallback',
  };
}

/**
 * Rename conversation with strict ownership verification.
 */
export async function renameUserConversation(
  conversationId: string,
  userId: string,
  newTitle: string
): Promise<{ success: boolean; conversation?: AIChatConversation; error?: string }> {
  if (!conversationId || !userId) return { success: false, error: 'Unauthorized' };
  const cleanTitle = (newTitle || 'Untitled Chat').trim().slice(0, 60);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .update({ title: cleanTitle, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) {
        return { success: true, conversation: data as AIChatConversation };
      }
    } catch {
      // Fall through to memory
    }
  }

  const mem = memoryConversations.get(conversationId);
  if (mem && mem.user_id === userId) {
    mem.title = cleanTitle;
    mem.updated_at = new Date().toISOString();
    return { success: true, conversation: mem };
  }

  return { success: false, error: 'Conversation not found or access denied.' };
}

/**
 * Delete conversation with strict ownership verification.
 */
export async function deleteUserConversation(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!conversationId || !userId) return { success: false, error: 'Unauthorized' };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const { error } = await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (!error) {
        memoryConversations.delete(conversationId);
        memoryMessages.delete(conversationId);
        return { success: true };
      }
    } catch {
      // Fall through to memory
    }
  }

  const mem = memoryConversations.get(conversationId);
  if (mem) {
    if (mem.user_id !== userId) {
      return { success: false, error: 'Access denied: not conversation owner.' };
    }
    memoryConversations.delete(conversationId);
    memoryMessages.delete(conversationId);
    return { success: true };
  }

  return { success: true };
}

/**
 * Fetch messages for a conversation, strictly verifying that the conversation
 * is owned by the authenticated user.
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string
): Promise<{
  messages: AIChatMessage[];
  persistenceStatus: 'persisted' | 'pending_migration' | 'session_fallback';
}> {
  if (!conversationId || !userId) {
    return { messages: [], persistenceStatus: 'session_fallback' };
  }

  // 1. Verify conversation ownership
  const conv = await getUserConversation(conversationId, userId);
  if (!conv) {
    return { messages: [], persistenceStatus: 'session_fallback' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id, conversation_id, role, content, sources, metadata, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        return {
          messages: data as AIChatMessage[],
          persistenceStatus: 'persisted',
        };
      }

      if (isTableMissingError(error)) {
        return {
          messages: memoryMessages.get(conversationId) || [],
          persistenceStatus: 'pending_migration',
        };
      }
    } catch {
      // Fall through to memory
    }
  }

  return {
    messages: memoryMessages.get(conversationId) || [],
    persistenceStatus: isSupabaseConfigured() ? 'pending_migration' : 'session_fallback',
  };
}

/**
 * Save a message into a conversation with strict ownership check.
 */
export async function saveConversationMessage(
  conversationId: string,
  userId: string,
  role: AIChatRole,
  content: string,
  sources: AIChatSource[] = [],
  metadata: AIChatMessageMetadata = {}
): Promise<{
  message: AIChatMessage;
  persistenceStatus: 'persisted' | 'pending_migration' | 'session_fallback';
}> {
  // Verify ownership
  const conv = await getUserConversation(conversationId, userId);
  if (!conv) {
    throw new Error('Unauthorized or invalid conversation ID.');
  }

  const messageId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const now = new Date().toISOString();
  const newMsg: AIChatMessage = {
    id: messageId,
    conversation_id: conversationId,
    role,
    content,
    sources,
    metadata,
    created_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert({
          id: messageId,
          conversation_id: conversationId,
          role,
          content,
          sources: sources || [],
          metadata: metadata || {},
          created_at: now,
        })
        .select()
        .single();

      // Update conversation updated_at
      await supabase
        .from('ai_chat_conversations')
        .update({ updated_at: now })
        .eq('id', conversationId);

      if (!error && data) {
        return {
          message: data as AIChatMessage,
          persistenceStatus: 'persisted',
        };
      }

      if (isTableMissingError(error)) {
        const msgs = memoryMessages.get(conversationId) || [];
        msgs.push(newMsg);
        memoryMessages.set(conversationId, msgs);
        if (conv) conv.updated_at = now;
        return {
          message: newMsg,
          persistenceStatus: 'pending_migration',
        };
      }
    } catch {
      // Fall through to memory
    }
  }

  const msgs = memoryMessages.get(conversationId) || [];
  msgs.push(newMsg);
  memoryMessages.set(conversationId, msgs);
  if (conv) conv.updated_at = now;

  return {
    message: newMsg,
    persistenceStatus: isSupabaseConfigured() ? 'pending_migration' : 'session_fallback',
  };
}
