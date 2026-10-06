'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserSummary, Role } from '@academy/shared';
import { apiClient } from '../lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  login: (credentials: { email?: string; identifier?: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role?: Role; phone?: string | null }) => Promise<void>;
  logout: () => Promise<void>;
  loginAsDemo: (role: 'admin' | 'instructor' | 'student1' | 'student2') => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (data: { currentPassword?: string; newPassword: string }) => Promise<void>;
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

  const login = async (credentials: { email?: string; identifier?: string; password: string }) => {
    const res = await apiClient<{ user: UserSummary; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res?.accessToken) {
      localStorage.setItem('accessToken', res.accessToken);
    }
    setUser(res.user);

    // If student must change temporary password, route strictly to change-password
    if (res.user.role === Role.STUDENT && res.user.mustChangePassword) {
      router.push('/student/change-password');
      return;
    }

    if (res.user.role === Role.ADMIN || res.user.role === Role.INSTRUCTOR) {
      router.push('/admin/dashboard');
    } else {
      router.push('/student/dashboard');
    }
  };

  const register = async (data: { name: string; email: string; password: string; role?: Role; phone?: string | null }) => {
    const res = await apiClient<{ user: UserSummary; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res?.accessToken) {
      localStorage.setItem('accessToken', res.accessToken);
    }
    setUser(res.user);
    router.push('/student/dashboard');
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

  const loginAsDemo = async (role: 'admin' | 'instructor' | 'student1' | 'student2') => {
    const creds: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@creativeit.academy', password: 'Admin@123' },
      instructor: { email: 'instructor@creativeit.academy', password: 'Instructor@123' },
      student1: { email: 'student1@creativeit.academy', password: 'Student@123' },
      student2: { email: 'student2@creativeit.academy', password: 'Student@123' },
    };

    const target = creds[role];
    if (target) {
      await login(target);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
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
