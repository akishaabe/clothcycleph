import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  GoogleAuthResponse,
  LoginResponse,
  SignupResponse,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
  User,
} from '../types/api';
import { ApiRequestError, authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<LoginResponse>;
  continueWithGoogle: (credential: string, role?: 'user', mode?: 'login' | 'signup', termsAccepted?: boolean) => Promise<GoogleAuthResponse>;
  verifyTwoFactor: (twoFactorToken: string, code: string, remember?: boolean) => Promise<User>;
  resendTwoFactorCode: (twoFactorToken: string) => Promise<{ message: string; requiresTwoFactor: true; two_factor_token: string; two_factor_method?: 'email' | 'totp'; dev_code?: string }>;
  forgotPassword: (email: string) => Promise<{ message: string; reset_token?: string }>;
  verifyResetCode: (resetToken: string) => Promise<{ message: string; reset_token: string }>;
  resetPassword: (resetToken: string, password: string) => Promise<{ message: string }>;
  updateProfile: (payload: any) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ message: string }>;
  getTwoFactorStatus: () => Promise<TwoFactorStatusResponse>;
  setupTwoFactor: (password: string, method?: 'email' | 'totp') => Promise<TwoFactorSetupResponse>;
  enableTwoFactor: (password: string, code: string, method?: 'email' | 'totp') => Promise<{ message: string; recovery_codes: string[] }>;
  disableTwoFactor: (password: string, code?: string) => Promise<{ message: string }>;
  deleteAccount: (password: string) => Promise<{ message: string }>;
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
      const cachedUser = authService.getStoredUser();

      if (storedToken) {
        if (cachedUser && isMounted) {
          setToken(storedToken);
          setUser(cachedUser);
        }

        try {
          const response = await authService.getProfile();

          if (isMounted) {
            setToken(storedToken);
            setUser(response.data);
            const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          const status = error instanceof ApiRequestError ? error.status : undefined;
          const shouldClearSession = status === 401 || status === 403;

          if (shouldClearSession) {
            authService.logout();
          }

          if (isMounted && shouldClearSession) {
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
        setToken(null);
        setUser(null);
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

  const continueWithGoogle = async (
    credential: string,
    role: 'user' = 'user',
    mode: 'login' | 'signup' = 'login',
    termsAccepted = false
  ) => {
    const response = await authService.continueWithGoogle({
      credential,
      role,
      mode,
      terms_accepted: termsAccepted,
    });
    if ('requiresTwoFactor' in response) {
      setToken(null);
      setUser(null);
      return response;
    }

    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const forgotPassword = (email: string) => {
    return authService.forgotPassword({ email });
  };

  const verifyResetCode = (resetToken: string) => {
    return authService.verifyResetCode({ code: resetToken });
  };

  const resetPassword = (resetToken: string, password: string) => {
    return authService.resetPassword({ token: resetToken, password, confirm_password: password });
  };

  const updateProfile = async (payload: any) => {
    const response = await authService.updateProfile(payload);
    updateUser(response.data);
    return response.data;
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const response = await authService.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    if (response.data) {
      updateUser(response.data);
    }
    return { message: response.message };
  };

  const getTwoFactorStatus = () => {
    return authService.getTwoFactorStatus();
  };

  const setupTwoFactor = (password: string, method: 'email' | 'totp' = 'email') => {
    return authService.setupTwoFactor(password, method);
  };

  const enableTwoFactor = async (password: string, code: string, method?: 'email' | 'totp') => {
    const response = await authService.enableTwoFactor(password, code, method);
    if (user) {
      updateUser({ ...user, two_factor_enabled: true });
    }
    return response;
  };

  const disableTwoFactor = async (password: string, code?: string) => {
    const response = await authService.disableTwoFactor(password, code);
    if (user) {
      updateUser({ ...user, two_factor_enabled: false });
    }
    return response;
  };

  const deleteAccount = async (password: string) => {
    const response = await authService.deleteAccount({ password });
    return response;
  };

  const signup = async (email: string, name: string, password: string, role = 'user') => {
    try {
      const response = await authService.signup({ email, name, password, role: role as any });
      if ('requiresTwoFactor' in response) {
        setToken(null);
        setUser(null);
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
    window.location.assign('/');
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
    verifyResetCode,
    resetPassword,
    updateProfile,
    changePassword,
    getTwoFactorStatus,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    deleteAccount,
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
