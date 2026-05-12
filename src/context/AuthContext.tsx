import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GoogleAuthResponse, LoginResponse, SignupResponse, User } from '../types/api';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  continueWithGoogle: (credential: string, role?: 'user' | 'partner') => Promise<GoogleAuthResponse>;
  verifyTwoFactor: (twoFactorToken: string, code: string) => Promise<User>;
  forgotPassword: (email: string) => Promise<{ message: string; reset_token?: string }>;
  resetPassword: (resetToken: string, password: string) => Promise<{ message: string }>;
  enableTwoFactor: () => Promise<{ message: string; dev_code?: string }>;
  disableTwoFactor: () => Promise<{ message: string }>;
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
      const storedToken = localStorage.getItem('auth_token');

      if (storedToken) {
        try {
          const response = await authService.getProfile();

          if (isMounted) {
            setToken(storedToken);
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
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

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
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

  const verifyTwoFactor = async (twoFactorToken: string, code: string) => {
    const response = await authService.verifyTwoFactor({
      two_factor_token: twoFactorToken,
      code,
    });
    setToken(response.token);
    setUser(response.user);
    return response.user;
  };

  const continueWithGoogle = async (credential: string, role: 'user' | 'partner' = 'user') => {
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

  const enableTwoFactor = async () => {
    const response = await authService.enableTwoFactor();
    if (user) {
      updateUser({ ...user, two_factor_enabled: true });
    }
    return response;
  };

  const disableTwoFactor = async () => {
    const response = await authService.disableTwoFactor();
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
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
      user,
      token,
      isLoading,
    isAuthenticated: !!token && !!user && !isLoading,
    login,
    continueWithGoogle,
    verifyTwoFactor,
    forgotPassword,
    resetPassword,
    enableTwoFactor,
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
