import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  GoogleAuthResponse,
  LoginResponse,
  SignupResponse,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
  User,
} from '../types/api';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<LoginResponse>;
  continueWithGoogle: (credential: string, role?: 'user') => Promise<GoogleAuthResponse>;
  verifyTwoFactor: (twoFactorToken: string, code: string, remember?: boolean) => Promise<User>;
  resendTwoFactorCode: (twoFactorToken: string) => Promise<{ message: string; requiresTwoFactor: true; two_factor_token: string; two_factor_method?: 'email' | 'totp' | 'sms'; dev_code?: string }>;
  forgotPassword: (email: string) => Promise<{ message: string; reset_token?: string }>;
  resetPassword: (resetToken: string, password: string) => Promise<{ message: string }>;
  getTwoFactorStatus: () => Promise<TwoFactorStatusResponse>;
  setupTwoFactor: (password: string, method?: 'totp' | 'sms', phone?: string) => Promise<TwoFactorSetupResponse>;
  enableTwoFactor: (password: string, code: string, method?: 'totp' | 'sms') => Promise<{ message: string; recovery_codes: string[] }>;
  sendSmsTwoFactorCode: () => Promise<{ message: string; dev_code?: string }>;
  disableTwoFactor: (password: string, code?: string) => Promise<{ message: string }>;
  signup: (email: string, name: string, password: string, role?: string) => Promise<SignupResponse>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from the token-backed profile, not the cached user object.
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

      if (storedToken) {
        try {
          const response = await authService.getProfile();

          if (isMounted) {
            setToken(storedToken);
            setUser(response.data);
            const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(response.data));
          }
        } catch {
          authService.logout();

          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    try {
      const response = await authService.login({ email, password }, remember);
      if ('requiresTwoFactor' in response) {
        return response;
      }

      setToken(response.token);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const verifyTwoFactor = async (twoFactorToken: string, code: string, remember = true) => {
    const response = await authService.verifyTwoFactor({
      two_factor_token: twoFactorToken,
      code,
    }, remember);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  };

  const resendTwoFactorCode = (twoFactorToken: string) => {
    return authService.resendTwoFactorCode({
      two_factor_token: twoFactorToken,
    });
  };

  const continueWithGoogle = async (credential: string, role: 'user' = 'user') => {
    const response = await authService.continueWithGoogle({ credential, role });
    if ('requiresTwoFactor' in response) {
      return response;
    }

    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const forgotPassword = (email: string) => {
    return authService.forgotPassword({ email });
  };

  const resetPassword = (resetToken: string, password: string) => {
    return authService.resetPassword({ token: resetToken, password });
  };

  const getTwoFactorStatus = () => {
    return authService.getTwoFactorStatus();
  };

  const setupTwoFactor = (password: string, method: 'totp' | 'sms' = 'totp', phone?: string) => {
    return authService.setupTwoFactor(password, method, phone);
  };

  const enableTwoFactor = async (password: string, code: string, method?: 'totp' | 'sms') => {
    const response = await authService.enableTwoFactor(password, code, method);
    if (user) {
      updateUser({ ...user, two_factor_enabled: true });
    }
    return response;
  };

  const sendSmsTwoFactorCode = () => {
    return authService.sendSmsTwoFactorCode();
  };

  const disableTwoFactor = async (password: string, code?: string) => {
    const response = await authService.disableTwoFactor(password, code);
    if (user) {
      updateUser({ ...user, two_factor_enabled: false });
    }
    return response;
  };

  const signup = async (email: string, name: string, password: string, role = 'user') => {
    try {
      const response = await authService.signup({ email, name, password, role: role as any });
      if ('requiresTwoFactor' in response) {
        return response;
      }

      setToken(response.token);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
      user,
      token,
      isLoading,
    isAuthenticated: !!token && !!user && !isLoading,
    login,
    continueWithGoogle,
    verifyTwoFactor,
    resendTwoFactorCode,
    forgotPassword,
    resetPassword,
    getTwoFactorStatus,
    setupTwoFactor,
    enableTwoFactor,
    sendSmsTwoFactorCode,
    disableTwoFactor,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
