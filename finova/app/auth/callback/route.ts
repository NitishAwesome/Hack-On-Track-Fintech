import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { CURRENT_AGREEMENT_VERSIONS } from '@/types/auth';
import { safeReturnPath } from '@/lib/navigation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next') ?? '/dashboard';

  // Ensure redirect target is safe (relative path, no open redirects)
  const safeNext = safeReturnPath(next, '/dashboard');

  const supabase = await createClient();

  // 1. PKCE Code Exchange (email verification, OAuth, magic links)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;
      const isGoogleUser = user.app_metadata?.provider === 'google';

      // For new Google OAuth users — check if they need to accept agreements
      if (isGoogleUser) {
        // Ensure the profile exists
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'Finova Investor',
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        // Check if this user has accepted agreements
        const { data: existingAgreements } = await supabase
          .from('user_agreements')
          .select('agreement_type')
          .eq('user_id', user.id);

        const hasAcceptedAll =
          existingAgreements &&
          existingAgreements.length >= 3 &&
          ['terms_of_service', 'privacy_policy', 'risk_disclosure'].every((t) =>
            existingAgreements.some((a) => a.agreement_type === t)
          );

        if (!hasAcceptedAll) {
          // Redirect to agreements acceptance page for new Google users
          const agreementsUrl = new URL('/agreements', url.origin);
          agreementsUrl.searchParams.set('next', safeNext);
          return NextResponse.redirect(agreementsUrl);
        }
      } else {
        // Email/password: ensure agreements exist (may have been recorded at signup)
        const { data: existingAgreements } = await supabase
          .from('user_agreements')
          .select('agreement_type')
          .eq('user_id', user.id);

        if (!existingAgreements || existingAgreements.length === 0) {
          // Record default agreements for users who didn't register via form
          const agreementTypes = ['terms_of_service', 'privacy_policy', 'risk_disclosure'] as const;
          const records = agreementTypes.map((agType) => ({
            user_id: user.id,
            agreement_type: agType,
            agreement_version: CURRENT_AGREEMENT_VERSIONS[agType],
            accepted_at: new Date().toISOString(),
            acceptance_source: 'email_verification',
          }));
          try {
            await supabase.from('user_agreements').insert(records);
          } catch {
            // Non-blocking — agreements can be recorded on next login
          }
        }
      }

      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }

  // 2. Token Hash Email Verification (magiclink, signup, recovery, invite)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      // If recovery flow, take user directly to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', url.origin));
      }
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }

  // If callback failed or expired
  return NextResponse.redirect(
    new URL('/login?error=Verification%20link%20has%20expired%20or%20is%20invalid', url.origin)
  );
}
