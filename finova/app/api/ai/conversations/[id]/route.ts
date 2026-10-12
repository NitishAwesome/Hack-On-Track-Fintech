// ============================================================
// FINOVA — AI Chat Conversation Item API Route
// GET, PATCH, DELETE /api/ai/conversations/[id]
//
// Strictly enforces per-user ownership:
// - Cross-user access is denied (404/403)
// - Messages ordered chronologically
// - Safe deletion with cascade
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getUserConversation,
  getConversationMessages,
  renameUserConversation,
  deleteUserConversation,
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

  return 'local-demo-user';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await resolveUserId();

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  try {
    const conversation = await getUserConversation(id, userId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied.' },
        { status: 404 }
      );
    }

    const { messages, persistenceStatus } = await getConversationMessages(id, userId);

    return NextResponse.json({
      success: true,
      conversation,
      messages,
      persistenceStatus,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch conversation.';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await resolveUserId();

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title.trim() : '';

    if (!title) {
      return NextResponse.json(
        { error: 'Conversation title cannot be empty.' },
        { status: 400 }
      );
    }

    const result = await renameUserConversation(id, userId, title);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to rename conversation.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: result.conversation,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to rename conversation.';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await resolveUserId();

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  try {
    const result = await deleteUserConversation(id, userId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete conversation.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to delete conversation.';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
