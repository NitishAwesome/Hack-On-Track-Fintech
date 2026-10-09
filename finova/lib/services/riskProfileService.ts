// ============================================================
// FINOVA — Risk Profile Data Access Service
// Manages user-declared risk parameters for education & analysis
// Minimal, secure, zero PAN/Aadhaar/bank credential storage
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  RiskProfileRow,
  RiskProfileUpsert,
} from '@/types/database';

export class RiskProfileService {
  /**
   * Fetch user's risk preferences profile.
   */
  public static async getRiskProfile(
    client?: SupabaseClient
  ): Promise<{
    data: RiskProfileRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('risk_profiles')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as RiskProfileRow | null, error: null };
  }

  /**
   * Create or update user risk preferences.
   */
  public static async upsertRiskProfile(
    input: RiskProfileUpsert,
    client?: SupabaseClient
  ): Promise<{
    data: RiskProfileRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('risk_profiles')
      .upsert(input, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as RiskProfileRow, error: null };
  }
}
