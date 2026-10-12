// ============================================================
// FINOVA — AI Chat Message API Route
// POST /api/ai/chat
//
// Grounded in authenticated portfolio data and canonical engines.
// Protected by strict server-side session checks and Supabase RLS.
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getUserConversation,
  createUserConversation,
  saveConversationMessage,
  getConversationMessages,
  generateDeterministicTitle,
} from '@/lib/ai/chatPersistence';
import { resolveQuestionContext } from '@/lib/ai/chatContextResolver';
import { generateChatResponse } from '@/lib/ai/chatIntelligenceEngine';
import type { AIChatConversation } from '@/types/chat';

export const dynamic = 'force-dynamic';

async function resolveUserId(): Promise<string | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }
      return user.id;
    } catch {
      return null;
    }
  }

  return 'local-demo-user';
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const userId = await resolveUserId();

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required. Please sign in to use FINOVA Intelligence.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!rawMessage) {
      return NextResponse.json(
        { error: 'Message cannot be empty.' },
        { status: 400 }
      );
    }

    if (rawMessage.length > 2000) {
      return NextResponse.json(
        { error: 'Message exceeds maximum allowed length of 2,000 characters.' },
        { status: 400 }
      );
    }

    let conversationId = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
    let currentConversation: AIChatConversation | null = null;
    let persistenceStatus: 'persisted' | 'pending_migration' | 'session_fallback' = 'persisted';

    // 1. Resolve or create conversation
    if (conversationId) {
      currentConversation = await getUserConversation(conversationId, userId);
      if (!currentConversation) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied.' },
          { status: 404 }
        );
      }
    } else {
      const autoTitle = generateDeterministicTitle(rawMessage);
      const createRes = await createUserConversation(userId, autoTitle);
      currentConversation = createRes.conversation;
      conversationId = currentConversation.id;
      persistenceStatus = createRes.persistenceStatus;
    }

    // 2. Save user message
    const savedUserMsgRes = await saveConversationMessage(
      conversationId,
      userId,
      'user',
      rawMessage
    );
    persistenceStatus = savedUserMsgRes.persistenceStatus;

    // 3. Resolve grounded context & sources (X-Ray, Risk Radar, Market Quotes, News, Future Lab)
    const contextRes = await resolveQuestionContext(rawMessage, userId);

    // 4. Retrieve message history for context continuity (bounded window)
    const historyRes = await getConversationMessages(conversationId, userId);
    // Exclude the message we just saved so history is prior turns
    const priorHistory = historyRes.messages.filter((m) => m.id !== savedUserMsgRes.message.id);

    // 5. Generate AI response using Gemini with candidate fallback
    const aiResult = await generateChatResponse({
      userQuery: rawMessage,
      contextText: contextRes.promptContextText,
      history: priorHistory,
    });

    const latencyMs = Date.now() - startTime;

    // 6. Assemble metadata & sources
    const assistantMetadata = {
      ...contextRes.metadata,
      modelUsed: aiResult.modelUsed,
      intentCategory: contextRes.intent,
      queryLatencyMs: latencyMs,
      persistenceStatus,
    };

    // 7. Save assistant message
    const savedAssistantMsgRes = await saveConversationMessage(
      conversationId,
      userId,
      'assistant',
      aiResult.content,
      contextRes.sources,
      assistantMetadata
    );

    return NextResponse.json({
      success: true,
      conversation: currentConversation,
      userMessage: savedUserMsgRes.message,
      assistantMessage: savedAssistantMsgRes.message,
      persistenceStatus,
      persistenceMessage:
        persistenceStatus === 'pending_migration'
          ? 'Database migration pending approval. Messages are saved in current session memory.'
          : undefined,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to process chat message.';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
