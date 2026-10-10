// ============================================================
// FINOVA — Financial Goal Resource Route
// app/api/goals/[id]/route.ts
//
// Authenticated endpoints for individual Investment Goals:
// - PUT: Update goal details or recorded funding
// - DELETE: Delete goal with strict user scoping
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { calculateGoalProgress } from '@/lib/calculations/futureLab';
import type { GoalCategory, GoalPriority, GoalStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isSupabaseConfigured()) {
    try {
      const { id } = await params;
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to update goals.' },
          { status: 401 }
        );
      }

      const body = await request.json().catch(() => ({}));
      const updates: Record<string, unknown> = {};

      if (body.goal_name !== undefined) {
        if (typeof body.goal_name !== 'string' || !body.goal_name.trim()) {
          return NextResponse.json({ error: 'Goal name cannot be empty.' }, { status: 400 });
        }
        updates.goal_name = body.goal_name.trim();
      }

      if (body.target_amount !== undefined) {
        const numTarget = Number(body.target_amount);
        if (isNaN(numTarget) || numTarget <= 0) {
          return NextResponse.json({ error: 'Target amount must be a positive number.' }, { status: 400 });
        }
        updates.target_amount = numTarget;
      }

      if (body.current_amount !== undefined) {
        const numCurrent = Number(body.current_amount);
        if (isNaN(numCurrent) || numCurrent < 0) {
          return NextResponse.json({ error: 'Current funding cannot be negative.' }, { status: 400 });
        }
        updates.current_amount = numCurrent;
        updates.current_allocated_amount = numCurrent;
      }

      if (body.target_date !== undefined) {
        if (isNaN(new Date(body.target_date).getTime())) {
          return NextResponse.json({ error: 'Invalid target date provided.' }, { status: 400 });
        }
        updates.target_date = body.target_date;
      }

      if (body.status !== undefined) {
        updates.status = body.status as GoalStatus;
      }

      if (body.category !== undefined) {
        updates.category = body.category as GoalCategory;
      }

      if (body.priority !== undefined) {
        updates.priority = body.priority as GoalPriority;
      }

      const { data: updated, error } = await supabase
        .from('investment_goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[API /api/goals/[id] PUT] Supabase error:', error.message);
        return NextResponse.json(
          { error: `Database error updating goal: ${error.message}` },
          { status: 500 }
        );
      }

      if (!updated) {
        return NextResponse.json({ error: 'Goal not found or access denied.' }, { status: 404 });
      }

      const progress = calculateGoalProgress(
        Number(updated.target_amount),
        Number(updated.current_amount),
        updated.target_date,
        updated.id,
        updated.goal_name
      );

      return NextResponse.json({
        success: true,
        data: {
          ...updated,
          progress,
        },
      });
    } catch (err: unknown) {
      console.error('[API /api/goals/[id] PUT] Exception:', err);
      return NextResponse.json({ error: 'Internal server error updating goal.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Cloud database not configured.' }, { status: 503 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isSupabaseConfigured()) {
    try {
      const { id } = await params;
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to delete goals.' },
          { status: 401 }
        );
      }

      const { error } = await supabase
        .from('investment_goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[API /api/goals/[id] DELETE] Supabase error:', error.message);
        return NextResponse.json(
          { error: `Database error deleting goal: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Goal deleted successfully.',
      });
    } catch (err: unknown) {
      console.error('[API /api/goals/[id] DELETE] Exception:', err);
      return NextResponse.json({ error: 'Internal server error deleting goal.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Cloud database not configured.' }, { status: 503 });
}
