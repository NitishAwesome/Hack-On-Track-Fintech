// ============================================================
// FINOVA — Financial Goals API Route
// app/api/goals/route.ts
//
// Authenticated endpoints for Investment Goals:
// - GET: List user's goals with calculated deterministic progress
// - POST: Create new goal with strict validation and user scoping
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { calculateGoalProgress } from '@/lib/calculations/futureLab';
import { isGoalDate } from '@/lib/goals/goalForm';
import type { GoalCategory, GoalPriority, GoalStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES: GoalCategory[] = [
  'EMERGENCY_FUND',
  'EDUCATION',
  'HOME',
  'WEALTH',
  'RETIREMENT',
  'VEHICLE',
  'VACATION',
  'GENERAL',
];

const VALID_PRIORITIES: GoalPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to view goals.' },
          { status: 401 }
        );
      }

      const { data: rawGoals, error } = await supabase
        .from('investment_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('target_date', { ascending: true });

      if (error) {
        console.error('[API /api/goals GET] Supabase query error:', error.message);
        return NextResponse.json(
          { error: 'Database error fetching investment goals.' },
          { status: 500 }
        );
      }

      const decoratedGoals = (rawGoals || []).map((g) => {
        const targetAmount = Number(g.target_amount);
        const currentAmount = Number(g.current_amount ?? g.current_allocated_amount ?? 0);
        const progress = calculateGoalProgress(
          targetAmount,
          currentAmount,
          g.target_date,
          g.id,
          g.goal_name
        );

        return {
          ...g,
          target_amount: targetAmount,
          current_amount: currentAmount,
          current_allocated_amount: currentAmount,
          progress,
        };
      });

      return NextResponse.json({
        success: true,
        data: decoratedGoals,
      });
    } catch (err: unknown) {
      console.error('[API /api/goals GET] Exception:', err);
      return NextResponse.json(
        { error: 'Internal server error fetching goals.' },
        { status: 500 }
      );
    }
  }

  // Local/Offline mock fallback
  return NextResponse.json({
    success: true,
    data: [],
  });
}

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to create a goal.' },
          { status: 401 }
        );
      }

      const body = await request.json().catch(() => ({}));
      const { goal_name, target_amount, current_amount, target_date, category, priority } = body;

      // Validation
      if (!goal_name || typeof goal_name !== 'string' || !goal_name.trim()) {
        return NextResponse.json(
          { error: 'Goal name is required and cannot be empty.' },
          { status: 400 }
        );
      }

      const numTarget = Number(target_amount);
      if (!Number.isFinite(numTarget) || numTarget <= 0) {
        return NextResponse.json(
          { error: 'Target amount must be a valid positive number.' },
          { status: 400 }
        );
      }

      const numCurrent = current_amount !== undefined ? Number(current_amount) : 0;
      if (!Number.isFinite(numCurrent) || numCurrent < 0) {
        return NextResponse.json(
          { error: 'Current recorded funding cannot be negative.' },
          { status: 400 }
        );
      }

      if (!isGoalDate(target_date)) {
        return NextResponse.json(
          { error: 'A valid target date is required.' },
          { status: 400 }
        );
      }

      let cleanCategory: GoalCategory = 'GENERAL';
      if (typeof category === 'string') {
        const catUpper = category.toUpperCase();
        if (catUpper === 'HOUSE') cleanCategory = 'HOME';
        else if (catUpper === 'OTHER') cleanCategory = 'GENERAL';
        else if (VALID_CATEGORIES.includes(catUpper as GoalCategory)) cleanCategory = catUpper as GoalCategory;
      }

      const cleanPriority: GoalPriority = VALID_PRIORITIES.includes(priority as GoalPriority)
        ? (priority as GoalPriority)
        : 'MEDIUM';

      const insertPayload = {
        user_id: user.id,
        goal_name: goal_name.trim(),
        target_amount: numTarget,
        current_amount: numCurrent,
        current_allocated_amount: numCurrent,
        target_date,
        category: cleanCategory,
        priority: cleanPriority,
        currency: 'INR',
        status: (numCurrent >= numTarget ? 'ACHIEVED' : 'ACTIVE') as GoalStatus,
      };

      const { data: created, error } = await supabase
        .from('investment_goals')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('[API /api/goals POST] Supabase insert error:', error.message);
        return NextResponse.json(
          { error: `Database error creating goal: ${error.message}` },
          { status: 500 }
        );
      }

      const progress = calculateGoalProgress(
        Number(created.target_amount),
        Number(created.current_amount),
        created.target_date,
        created.id,
        created.goal_name
      );

      return NextResponse.json({
        success: true,
        data: {
          ...created,
          progress,
        },
      });
    } catch (err: unknown) {
      console.error('[API /api/goals POST] Exception:', err);
      return NextResponse.json(
        { error: 'Internal server error creating goal.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Cloud database not configured for goals.' },
    { status: 503 }
  );
}
