// ============================================================
// FINOVA — Authentication & Onboarding Service
// ============================================================

import { createClient } from '@/lib/supabase/client';
import { safeReturnPath } from '@/lib/navigation';
import {
  CURRENT_AGREEMENT_VERSIONS,
  type AgreementType,
  type UserProfile,
} from '@/types/auth';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  agreementSource?: 'registration' | 'onboarding';
}

export interface SignInParams {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Initiate Google OAuth sign-in. Redirects the browser to Google's OAuth flow.
   * The `next` param is preserved across the callback so the user lands in the
   * right place after authentication completes.
   */
  public static async signInWithGoogle(next: string = '/dashboard') {
    const supabase = createClient();
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Sanitize next to prevent open redirects
    const safeNext = safeReturnPath(next, '/dashboard');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        queryParams: {
          // Request refresh_token for long-lived sessions
          access_type: 'offline',
          prompt: 'consent select_account',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message, url: null };
    }

    return { success: true, error: null, url: data.url };
  }


  /**
   * Register a new user with email, password, name, phone, and record mandatory agreements.
   */
  public static async signUp({
    email,
    password,
    fullName,
    phone,
    agreementSource = 'registration',
  }: SignUpParams) {
    const supabase = createClient();
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (error) {
      let friendlyError = error.message;
      if (
        error.message.toLowerCase().includes('rate limit') ||
        error.message.toLowerCase().includes('over_email_send_rate_limit') ||
        (error as { code?: string }).code === 'over_email_send_rate_limit'
      ) {
        friendlyError =
          'Supabase email rate limit exceeded. Disable "Confirm email" in your Supabase Dashboard (Authentication → Providers → Email) to allow instant signups without email verification.';
      } else if (error.message.toLowerCase().includes('already registered')) {
        friendlyError =
          'An account with this email address already exists. Please sign in instead.';
      }

      return { success: false, error: friendlyError, user: null, needsEmailConfirmation: false };
    }

    const user = data.user;
    const session = data.session;
    const needsEmailConfirmation = !session && !!user && !user.confirmed_at;

    // If an active session is returned immediately (email confirmation disabled in Supabase),
    // record agreements and initialize profile right away.
    if (user && session) {
      try {
        await this.recordAgreements(user.id, agreementSource);
      } catch (agErr) {
        console.error('Failed to record user agreements during signup:', agErr);
      }

      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: fullName.trim(),
          phone: phone.trim(),
          onboarding_done: true,
          updated_at: new Date().toISOString(),
        });
      } catch (profErr) {
        console.error('Failed to initialize user profile during signup:', profErr);
      }
    }

    return {
      success: true,
      error: null,
      user,
      session,
      needsEmailConfirmation,
    };
  }

  /**
   * Authenticate user with Email and Password.
   */
  public static async signIn({ email, password }: SignInParams) {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      let friendlyError = error.message;
      if (error.message.includes('Invalid login credentials')) {
        friendlyError = 'Invalid email or password. Please verify your credentials.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyError = 'Your email address is not yet verified. Please check your inbox for the confirmation link.';
      } else if (error.message.toLowerCase().includes('rate limit')) {
        friendlyError = 'Too many login attempts. Please wait a moment before trying again.';
      }

      return {
        success: false,
        error: friendlyError,
        rawError: error,
        user: null,
        session: null,
      };
    }

    return {
      success: true,
      error: null,
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Sign out the current user session.
   */
  public static async signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    return { success: !error, error: error?.message || null };
  }

  /**
   * Send a password recovery link to user's email.
   */
  public static async sendPasswordResetEmail(email: string) {
    const supabase = createClient();
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  /**
   * Update password for an authenticated session (used after clicking reset password link).
   */
  public static async updatePassword(newPassword: string) {
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  /**
   * Resend signup email confirmation link.
   */
  public static async resendVerificationEmail(email: string) {
    const supabase = createClient();
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  /**
   * Audit log agreement acceptances in user_agreements table.
   */
  /**
   * Audit log agreement acceptances in user_agreements table.
   * Records authentic timestamps and specified agreement types without
   * overwriting or altering previous historical entries.
   */
  public static async recordAgreements(
    userId: string,
    source: 'registration' | 'onboarding' | 'settings_reconsent' | 'profile_explicit_consent' = 'registration',
    typesToRecord?: AgreementType[]
  ): Promise<{ success: boolean; error: string | null; count?: number }> {
    const supabase = createClient();
    const timestamp = new Date().toISOString();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

    const agreementTypes: AgreementType[] =
      typesToRecord && typesToRecord.length > 0
        ? typesToRecord
        : ['terms_of_service', 'privacy_policy', 'risk_disclosure'];

    const records = agreementTypes.map((type) => ({
      user_id: userId,
      agreement_type: type,
      agreement_version: CURRENT_AGREEMENT_VERSIONS[type],
      accepted_at: timestamp,
      acceptance_source: source,
      user_agent: userAgent,
    }));

    const { error } = await supabase.from('user_agreements').insert(records);
    if (error) {
      console.warn('Agreement recording warning (table may be pending migration):', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, error: null, count: records.length };
  }

  /**
   * Inspects agreement records for a user without auto-generating unreviewed records.
   */
  public static async checkMissingAgreements(
    userId: string
  ): Promise<{ missing: AgreementType[]; hasAll: boolean }> {
    const supabase = createClient();
    const { data } = await supabase
      .from('user_agreements')
      .select('agreement_type, agreement_version, accepted_at')
      .eq('user_id', userId);

    const recorded = new Set((data || []).map((r) => r.agreement_type));
    const allRequired: AgreementType[] = ['terms_of_service', 'privacy_policy', 'risk_disclosure'];
    const missing = allRequired.filter((type) => !recorded.has(type));

    return {
      missing,
      hasAll: missing.length === 0,
    };
  }

  /**
   * Fetch user profile from database.
   */
  public static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as UserProfile;
  }
}
