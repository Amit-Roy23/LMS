'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserSummary, Role } from '@academy/shared';
import { apiClient, SESSION_REVOKED_EVENT } from '../lib/api';
import { useRouter } from 'next/navigation';
import { DemoAccountKey, getDemoAccount } from '../lib/demo-accounts';

/** OTP challenge returned by the API (new device sign-in, registration, password reset, etc.). */
export interface OtpChallenge {
  challengeId: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  maskedTarget: string;
  expiresAt: string;
  /** Present only in demo mode, when no SMS gateway is configured. */
  devCode?: string;
}

/** Result of a sign-in attempt: either signed in, or an OTP is needed for this new device. */
export type LoginOutcome = { otpRequired: false; signedOut?: string[] } | ({ otpRequired: true } & OtpChallenge);

interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  login: (credentials: { email?: string; identifier?: string; password: string }) => Promise<LoginOutcome>;
  verifyLoginOtp: (challengeId: string, code: string) => Promise<{ signedOut?: string[] }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
    challengeId?: string;
    otpCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loginAsDemo: (role: DemoAccountKey) => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (data: { currentPassword?: string; newPassword: string }) => Promise<void>;
}

/** The ?redirect= target from the current URL, accepted only for same-site paths. */
function safeRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  const target = new URLSearchParams(window.location.search).get('redirect');
  return target && target.startsWith('/') && !target.startsWith('//') ? target : null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiClient<UserSummary>('/auth/me');
      setUser(userData);
    } catch (e) {
      setUser(null);
      localStorage.removeItem('accessToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // This device was signed out elsewhere (device limit or "sign out device"): return to sign-in
  useEffect(() => {
    const onRevoked = () => {
      setUser(null);
      router.push('/login?reason=signed-out');
    };
    window.addEventListener(SESSION_REVOKED_EVENT, onRevoked);
    return () => window.removeEventListener(SESSION_REVOKED_EVENT, onRevoked);
  }, [router]);

  const completeSignIn = (res: { user: UserSummary; accessToken: string }) => {
    if (res?.accessToken) {
      localStorage.setItem('accessToken', res.accessToken);
    }
    setUser(res.user);

    // If student must change temporary password, route strictly to change-password
    if (res.user.role === Role.STUDENT && res.user.mustChangePassword) {
      router.push('/student/change-password');
      return;
    }

    // Return to the page that asked for sign-in (e.g. checkout), if any
    const redirect = safeRedirect();
    if (redirect) {
      router.push(redirect);
    } else if (res.user.role === Role.ADMIN || res.user.role === Role.INSTRUCTOR || res.user.role === Role.STAFF) {
      router.push('/admin/dashboard');
    } else {
      router.push('/student/dashboard');
    }
  };

  const login = async (credentials: { email?: string; identifier?: string; password: string }): Promise<LoginOutcome> => {
    const res = await apiClient<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res?.otpRequired) {
      return res as LoginOutcome;
    }
    completeSignIn(res);
    return { otpRequired: false, signedOut: res.signedOut };
  };

  const verifyLoginOtp = async (challengeId: string, code: string) => {
    const res = await apiClient<any>('/auth/login/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId, code }),
    });
    completeSignIn(res);
    return { signedOut: res.signedOut };
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
    challengeId?: string;
    otpCode?: string;
  }) => {
    const res = await apiClient<{ user: UserSummary; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res?.accessToken) {
      localStorage.setItem('accessToken', res.accessToken);
    }
    setUser(res.user);
    router.push(safeRedirect() || '/student/dashboard');
  };

  const changePassword = async (data: { currentPassword?: string; newPassword: string }) => {
    await apiClient('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    await refreshUser();
    router.push('/student/dashboard');
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/login');
  };

  const loginAsDemo = async (role: DemoAccountKey) => {
    const target = getDemoAccount(role);
    if (target) {
      await login({ email: target.email, password: target.password });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        verifyLoginOtp,
        register,
        logout,
        loginAsDemo,
        refreshUser,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
