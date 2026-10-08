// ============================================================
// FINOVA — Authentication & User Agreements Types
// ============================================================

export type AgreementType = 'terms_of_service' | 'privacy_policy' | 'risk_disclosure';

export const CURRENT_AGREEMENT_VERSIONS: Record<AgreementType, string> = {
  terms_of_service: '1.0.0-draft',
  privacy_policy: '1.0.0-draft',
  risk_disclosure: '1.0.0-draft',
};

export interface UserAgreement {
  id?: string;
  user_id: string;
  agreement_type: AgreementType;
  agreement_version: string;
  accepted_at?: string;
  acceptance_source: 'registration' | 'onboarding' | 'settings_reconsent';
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface SignUpFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeRisk: boolean;
}

export interface SignInFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  risk_appetite: 'conservative' | 'moderate' | 'aggressive' | null;
  preferred_currency: string;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}
