import {
  User,
  AuthResponse,
  SignupPayload,
  LoginPayload,
  UpdateProfilePayload,
  Submission,
  CreateSubmissionPayload,
  UpdateSubmissionStatusPayload,
  Message,
  SendMessagePayload,
  Conversation,
} from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
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
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const data = await fetchWithAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Save token to localStorage
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Save token to localStorage
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
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
  },

  getStoredUser(): User | null {
    const user = localStorage.getItem('user');
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

// ============= MESSAGE ENDPOINTS =============

export const messageService = {
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
