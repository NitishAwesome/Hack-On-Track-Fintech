// ============================================================
// FINOVA — AI Chat Conversations API Route
// GET & POST /api/ai/conversations
//
// Strictly authenticates user identity via Supabase session
// Supports listing conversations and creating new chats.
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  listUserConversations,
  createUserConversation,
} from '@/lib/ai/chatPersistence';

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

  // Local development / testing mode fallback
  return 'local-demo-user';
}

export async function GET() {
  const userId = await resolveUserId();

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required to view conversations.' },
      { status: 401 }
    );
  }

  try {
    const { conversations, persistenceStatus } = await listUserConversations(userId);

    return NextResponse.json({
      success: true,
      conversations,
      persistenceStatus,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to list conversations.';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const userId = await resolveUserId();

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required to create conversations.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawTitle = typeof body?.title === 'string' ? body.title.trim() : 'New Research Chat';
    const title = rawTitle.slice(0, 60) || 'New Research Chat';

    const { conversation, persistenceStatus } = await createUserConversation(userId, title);

    return NextResponse.json({
      success: true,
      conversation,
      persistenceStatus,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to create conversation.';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
