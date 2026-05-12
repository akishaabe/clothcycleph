// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'partner' | 'admin';
  two_factor_enabled?: boolean;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  address?: string;
  created_at?: string;
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
  dev_code?: string;
}

export type LoginResponse = AuthResponse | TwoFactorChallengeResponse;
export type SignupResponse = AuthResponse | TwoFactorChallengeResponse;
export type GoogleAuthResponse = AuthResponse | TwoFactorChallengeResponse;

export interface SignupPayload {
  email: string;
  name: string;
  password: string;
  role?: 'user' | 'partner' | 'admin';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyTwoFactorPayload {
  two_factor_token: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface GoogleAuthPayload {
  credential: string;
  role?: 'user' | 'partner';
}

export interface UpdateProfilePayload {
  name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  address?: string;
}

// Submission types
export interface Submission {
  id: string;
  user_id: string;
  item_type: string;
  condition: string;
  fabric?: string;
  cleanliness?: string;
  description?: string;
  photos: string[];
  status: 'pending' | 'verified' | 'processed' | 'rejected';
  assigned_partner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubmissionPayload {
  item_type: string;
  condition: string;
  fabric?: string;
  cleanliness?: string;
  description?: string;
  photos?: string[];
}

export interface UpdateSubmissionStatusPayload {
  status: 'pending' | 'verified' | 'processed' | 'rejected';
}

// Message types
export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  read: boolean;
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
