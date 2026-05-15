// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'partner' | 'admin';
  status?: 'active' | 'inactive' | 'suspended';
  partner_id?: string;
  two_factor_enabled?: boolean;
  two_factor_method?: 'email' | 'totp' | 'sms';
  email_verified_at?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface TwoFactorChallengeResponse {
  message: string;
  requiresTwoFactor: true;
  two_factor_token: string;
  two_factor_method?: 'email' | 'totp' | 'sms';
  dev_code?: string;
}

export type LoginResponse = AuthResponse | TwoFactorChallengeResponse;
export type SignupResponse = AuthResponse | TwoFactorChallengeResponse;
export type GoogleAuthResponse = AuthResponse | TwoFactorChallengeResponse;

export interface SignupPayload {
  email: string;
  name: string;
  password: string;
  role?: 'user';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyTwoFactorPayload {
  two_factor_token: string;
  code: string;
}

export interface ResendTwoFactorPayload {
  two_factor_token: string;
}

export interface TwoFactorSetupResponse {
  message: string;
  method: 'totp' | 'sms';
  secret?: string;
  otpauth_url?: string;
  masked_phone?: string;
  two_factor_token?: string;
  dev_code?: string;
  recovery_codes?: string[];
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  setup_started: boolean;
  method?: 'email' | 'totp' | 'sms';
  phone?: string;
  confirmed_at?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  code: string;
  password: string;
  confirm_password?: string;
}

export interface VerifyResetCodePayload {
  code: string;
}

export interface GoogleAuthPayload {
  credential: string;
  role?: 'user';
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  avatar_url?: string | null;
  bio?: string;
  phone?: string;
  address?: string;
  password?: string;
}

// Submission types
export interface Submission {
  id: string;
  user_id: string;
  submission_name?: string;
  item_type: string;
  condition: string;
  fabric?: string;
  cleanliness?: string;
  description?: string;
  photos: SubmissionPhotoValue[];
  status: 'pending' | 'verified' | 'processed' | 'rejected';
  assigned_partner_id?: string;
  submission_code?: string;
  service_type?: 'recycle' | 'donate' | 'upcycle' | 'buyback';
  quantity?: number;
  buyback_interest?: boolean;
  action?: string;
  upcycle_request?: string;
  scheduled_at?: string;
  details?: SubmissionDetails | null;
  burn_test?: BurnTestDetails | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionDetails {
  item_types?: string[] | string;
  other_item_type?: string;
  condition?: string;
  cleanliness?: string;
  knows_fabric_type?: boolean;
  fabric_types?: string[] | string;
  custom_fabric_text?: string | null;
  fabric_identification?: string[] | string;
  brand?: string;
  no_brand_visible?: boolean;
  fabric_description?: string[] | string;
  restricted_category?:
    | 'hospital_medical_uniform'
    | 'ppe_contaminated_workwear'
    | 'used_undergarments'
    | 'mold_chemical_contaminated'
    | 'none';
  uniform_branding?: string | null;
  fiber_composition?: string | null;
  wearability?: string | null;
  repairability?: string | null;
  contamination_level?: string | null;
  damage_classification?: string | null;
  repurposing_potential?: string | null;
  trim_removal?: string | null;
}

export interface BurnTestDetails {
  performed: boolean;
  page?: number | null;
  moment?: string[];
  flames?: string[];
  no_flame?: string[];
  smell?: string | null;
  ashes?: string[];
}

export interface SubmissionPhoto {
  url: string;
  label?: string;
}

export type SubmissionPhotoValue = string | SubmissionPhoto;

export interface CreateSubmissionPayload {
  item_type: string;
  submission_name?: string | null;
  condition: string;
  fabric?: string;
  cleanliness?: string;
  description?: string;
  photos?: SubmissionPhotoValue[];
  service_type?: 'recycle' | 'donate' | 'upcycle' | 'buyback' | null;
  quantity?: number;
  buyback_interest?: boolean;
  action?: string;
  upcycle_request?: string | null;
  scheduled_at?: string | null;
  details?: SubmissionDetails;
  burn_test?: BurnTestDetails;
}

export interface UpdateSubmissionStatusPayload {
  status: 'pending' | 'verified' | 'processed' | 'rejected';
}

export interface Partner {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  service_types?: string;
  accepted_service_types?: string;
  accepts_clean_only?: boolean;
  capacity_notes?: string;
  pickup_areas?: string;
  contact_person?: string;
  rating?: number;
  verified?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  gis_rank_reason?: string;
}

export interface DssRecommendation {
  recommended_pathway: 'recycle' | 'donate' | 'upcycle' | 'buyback' | 'rejected';
  rank: number;
  score: number;
  confidence: number;
  explanation: string;
  burn_test_result?: string | null;
  checks?: Array<{
    question: string;
    matched: boolean;
    expected: string;
    selected: string;
  }>;
  eligibility?: {
    eligible: boolean;
    category: string;
    reason?: string;
    message?: string;
  };
}

export interface DssPreview {
  submission: Submission;
  recommendations: DssRecommendation[];
  burn_test_analysis?: {
    performed: boolean;
    summary: string;
    top_fibers: Array<{
      fiber: string;
      score: number;
      confidence: number;
      reasoning: string[];
    }>;
  };
  brief: string;
}

export interface DssRequest {
  id: string;
  submission_id: string;
  from_user_id: string;
  to_partner_id: string;
  type: 'recycle' | 'donate' | 'upcycle' | 'buyback';
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'in_progress' | 'rejected';
  status_label?: string;
  notes?: string;
  partner_name?: string;
  partner_email?: string;
  user_name?: string;
  user_email?: string;
  submission_name?: string;
  item_type?: string;
  quantity?: number;
  condition?: string;
  cleanliness?: string;
  fabric?: string;
  description?: string;
  upcycle_request?: string;
  photos?: SubmissionPhotoValue[];
  details?: SubmissionDetails | null;
  burn_test?: BurnTestDetails | null;
  confidence?: number;
  explanation?: string;
  output_payload?: {
    brief?: string;
    recommendation?: DssRecommendation;
    recommendations?: DssRecommendation[];
    rule_checks?: Array<{
      question: string;
      matched: boolean;
      expected?: string;
      selected?: string;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export type DssRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'in_progress'
  | 'rejected';

export interface SendDssRecommendationPayload {
  submission_id: string;
  partner_id: string;
  recommended_pathway: 'recycle' | 'donate' | 'upcycle' | 'buyback';
  brief: string;
}

export interface DssAuditRun {
  result_id: string;
  run_id: string;
  engine_name: string;
  engine_version: string;
  recommended_pathway: string;
  rank: number;
  score: number;
  confidence: number;
  explanation: string;
  output_payload?: {
    rule_checks?: Array<{
      question: string;
      matched: boolean;
      expected: string;
      selected: string;
    }>;
  };
  submission_name?: string;
  item_type?: string;
  partner_name?: string;
  requested_by_name?: string;
  created_at: string;
}

// Message types
export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  read: boolean;
  related_submission_id?: string;
  related_transaction_id?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface SendMessagePayload {
  to_user_id: string;
  content: string;
}

export interface MessageContact {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'partner' | 'admin';
  avatar_url?: string;
}

export interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_email: string;
  other_user_role: 'user' | 'partner' | 'admin';
  other_user_avatar_url?: string;
  last_message_content: string;
  last_message_from_user_id: string;
  last_message_time: string;
  unread_count: number;
}

// File upload types
export interface UploadResponse {
  url: string;
  key: string;
  message: string;
}

// Error response
export interface ErrorResponse {
  error: string;
  message?: string;
}
