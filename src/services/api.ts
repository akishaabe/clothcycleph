import {
  User,
  AuthResponse,
  LoginResponse,
  SignupResponse,
  GoogleAuthResponse,
  SignupPayload,
  LoginPayload,
  VerifyTwoFactorPayload,
  ResendTwoFactorPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  GoogleAuthPayload,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
  UpdateProfilePayload,
  Submission,
  CreateSubmissionPayload,
  UpdateSubmissionStatusPayload,
  Message,
  SendMessagePayload,
  Conversation,
  MessageContact,
  Partner,
  DssPreview,
  DssRequest,
  SendDssRecommendationPayload,
  DssAuditRun,
} from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

const persistAuth = (data: AuthResponse, remember = true) => {
  const persistentStorage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  otherStorage.removeItem('auth_token');
  otherStorage.removeItem('user');
  persistentStorage.setItem('auth_token', data.token);
  persistentStorage.setItem('user', JSON.stringify(data.user));
};

// Helper function to make authenticated requests
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// ============= AUTH ENDPOINTS =============

export const authService = {
  async signup(payload: SignupPayload): Promise<SignupResponse> {
    const data = await fetchWithAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Save token to localStorage
    if (data.token) {
      persistAuth(data, true);
    }

    return data;
  },

  async login(payload: LoginPayload, remember = true): Promise<LoginResponse> {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Save token to localStorage
    if (data.token) {
      persistAuth(data, remember);
    }

    return data;
  },

  async verifyTwoFactor(payload: VerifyTwoFactorPayload, remember = true): Promise<AuthResponse> {
    const data = await fetchWithAuth('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (data.token) {
      persistAuth(data, remember);
    }

    return data;
  },

  async resendTwoFactorCode(
    payload: ResendTwoFactorPayload
  ): Promise<{ message: string; requiresTwoFactor: true; two_factor_token: string; two_factor_method?: 'email' | 'totp' | 'sms'; dev_code?: string }> {
    return fetchWithAuth('/auth/2fa/resend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async continueWithGoogle(payload: GoogleAuthPayload): Promise<GoogleAuthResponse> {
    const data = await fetchWithAuth('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  },

  async getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
    return fetchWithAuth('/auth/2fa/status', {
      method: 'GET',
    });
  },

  async setupTwoFactor(password: string, method: 'totp' | 'sms' = 'totp', phone?: string): Promise<TwoFactorSetupResponse> {
    return fetchWithAuth('/auth/2fa/setup', {
      method: 'POST',
      body: JSON.stringify({ password, method, phone }),
    });
  },

  async enableTwoFactor(
    password: string,
    code: string,
    method?: 'totp' | 'sms'
  ): Promise<{ message: string; recovery_codes: string[] }> {
    return fetchWithAuth('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ password, code, method }),
    });
  },

  async sendSmsTwoFactorCode(): Promise<{ message: string; dev_code?: string }> {
    return fetchWithAuth('/auth/2fa/sms/send', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async disableTwoFactor(password: string, code?: string): Promise<{ message: string }> {
    return fetchWithAuth('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    });
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string; reset_token?: string }> {
    return fetchWithAuth('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return fetchWithAuth('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getProfile(): Promise<{ data: User }> {
    return fetchWithAuth('/auth/profile', {
      method: 'GET',
    });
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<{ message: string; data: User }> {
    return fetchWithAuth('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user');
  },

  async changePassword(payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ message: string }> {
    return fetchWithAuth('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getStoredUser(): User | null {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!getAuthToken();
  },
};

// ============= SUBMISSION ENDPOINTS =============

export const submissionService = {
  async createSubmission(payload: CreateSubmissionPayload): Promise<{ message: string; data: Submission }> {
    return fetchWithAuth('/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getUserSubmissions(): Promise<{ data: Submission[]; count: number }> {
    return fetchWithAuth('/submissions', {
      method: 'GET',
    });
  },

  async getSubmissionById(id: string): Promise<{ data: Submission }> {
    return fetchWithAuth(`/submissions/${id}`, {
      method: 'GET',
    });
  },

  async updateSubmissionStatus(
    id: string,
    payload: UpdateSubmissionStatusPayload
  ): Promise<{ message: string; data: Submission }> {
    return fetchWithAuth(`/submissions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

// ============= DSS ENDPOINTS =============

export const dssService = {
  async listPartners(options: { lat?: number; lng?: number; pathway?: string; radiusKm?: number } = {}): Promise<{ data: Partner[]; count: number }> {
    const params = new URLSearchParams();
    if (options.lat != null) params.set('lat', String(options.lat));
    if (options.lng != null) params.set('lng', String(options.lng));
    if (options.pathway) params.set('pathway', options.pathway);
    if (options.radiusKm != null) params.set('radius_km', String(options.radiusKm));

    return fetchWithAuth(`/dss/partners${params.toString() ? `?${params.toString()}` : ''}`, {
      method: 'GET',
    });
  },

  async listNearbyPartners(options: { lat: number; lng: number; pathway?: string; radiusKm?: number }): Promise<{ data: Partner[]; count: number }> {
    const params = new URLSearchParams({
      lat: String(options.lat),
      lng: String(options.lng),
    });
    if (options.pathway) params.set('pathway', options.pathway);
    if (options.radiusKm != null) params.set('radius_km', String(options.radiusKm));

    return fetchWithAuth(`/gis/partners?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getSubmissionPreview(submissionId: string): Promise<{ data: DssPreview }> {
    return fetchWithAuth(`/dss/submissions/${submissionId}`, {
      method: 'GET',
    });
  },

  async sendRecommendation(
    payload: SendDssRecommendationPayload
  ): Promise<{ message: string; data: { transaction: DssRequest; recommendation_result_id: string; recommendation_run_id: string } }> {
    return fetchWithAuth('/dss/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getUserRequests(): Promise<{ data: DssRequest[]; count: number }> {
    return fetchWithAuth('/dss/requests/user', {
      method: 'GET',
    });
  },

  async getPartnerRequests(): Promise<{ data: DssRequest[]; count: number }> {
    return fetchWithAuth('/dss/requests/partner', {
      method: 'GET',
    });
  },

  async updateRequestStatus(
    requestId: string,
    payload: { status: 'pending' | 'accepted' | 'declined' | 'completed'; notes?: string }
  ): Promise<{ message: string; data: DssRequest }> {
    return fetchWithAuth(`/dss/requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async remindRequest(
    requestId: string,
    payload: { message?: string } = {}
  ): Promise<{ message: string; data: DssRequest }> {
    return fetchWithAuth(`/dss/requests/${requestId}/remind`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAuditRuns(): Promise<{ data: DssAuditRun[]; count: number }> {
    return fetchWithAuth('/dss/audit', {
      method: 'GET',
    });
  },

  async exportAuditReport(): Promise<Blob> {
    const token = getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/dss/audit/export`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Audit export failed');
    }

    return response.blob();
  },

  async requestRuleChange(payload: {
    rule_area: string;
    requested_change: string;
    reason?: string;
  }): Promise<{ message: string; data: unknown }> {
    return fetchWithAuth('/dss/rule-change-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ============= MESSAGE ENDPOINTS =============

export const messageService = {
  async getContacts(): Promise<{ data: MessageContact[]; count: number }> {
    return fetchWithAuth('/messages/contacts', {
      method: 'GET',
    });
  },

  async sendMessage(payload: SendMessagePayload): Promise<{ message: string; data: Message }> {
    return fetchWithAuth('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getConversations(): Promise<{ data: Conversation[]; count: number }> {
    return fetchWithAuth('/messages/conversations', {
      method: 'GET',
    });
  },

  async getUnreadCount(): Promise<{ unread_count: number }> {
    return fetchWithAuth('/messages/unread-count', {
      method: 'GET',
    });
  },

  async getMessages(userId: string): Promise<{ data: Message[]; count: number }> {
    return fetchWithAuth(`/messages/${userId}`, {
      method: 'GET',
    });
  },

  async markMessageAsRead(id: string): Promise<{ data: Message }> {
    return fetchWithAuth(`/messages/${id}/read`, {
      method: 'PUT',
    });
  },
};

export const notificationService = {
  async getNotifications(): Promise<{ data: any[]; count: number }> {
    return fetchWithAuth('/notifications', { method: 'GET' });
  },

  async getUnreadCount(): Promise<{ unread_count: number }> {
    return fetchWithAuth('/notifications/count', { method: 'GET' });
  },

  async markAsRead(id: string): Promise<{ message: string; data: any }> {
    return fetchWithAuth(`/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllAsRead(): Promise<{ message: string; count: number }> {
    return fetchWithAuth('/notifications/read-all', { method: 'PUT' });
  },
};

// ============= FILE UPLOAD ENDPOINTS =============

export const uploadService = {
  async uploadFile(file: File): Promise<{ url: string; key: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  async uploadMultipleFiles(files: File[]): Promise<string[]> {
    const urls = await Promise.all(files.map((file) => this.uploadFile(file)));
    return urls.map((response) => response.url);
  },
};
