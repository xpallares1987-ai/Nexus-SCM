import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';

export interface UserProfile {
  uid: string;
  email: string;
  role: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emailNotifications?: number;
  smsNotifications?: number;
  theme?: string;
  password?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: any | null; 
  profile: UserProfile | null;
  loading: boolean;
  token: string | null;
  register: (e: string, p: string, firstName?: string, lastName?: string, role?: string, rememberMe?: boolean) => Promise<void>;
  login: (e: string, p: string, rememberMe?: boolean) => Promise<void>;
  biometricLogin: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; code?: string }>;
  resetPassword: (email: string, resetCode: string, nextPassword: string) => Promise<void>;
  getSecurityHistory: () => Promise<any[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('scm_auth_token') || sessionStorage.getItem('scm_auth_token');
      if (storedToken) {
        try {
          const userData = await fetchApi('/users/me', storedToken);
          setToken(storedToken);
          setProfile(userData);
        } catch (e) {
          localStorage.removeItem('scm_auth_token');
          sessionStorage.removeItem('scm_auth_token');
          setToken(null);
          setProfile(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const logOut = async () => {
    localStorage.removeItem('scm_auth_token');
    sessionStorage.removeItem('scm_auth_token');
    setToken(null);
    setProfile(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logOut();
    };
    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (profile?.theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('scm_theme', 'dark');
      document.cookie = "scm_theme=dark; path=/; max-age=31536000; SameSite=Lax";
    } else {
      root.classList.add('light');
      localStorage.setItem('scm_theme', 'light');
      document.cookie = "scm_theme=light; path=/; max-age=31536000; SameSite=Lax";
    }
  }, [profile?.theme]);

  const register = async (e: string, p: string, firstName?: string, lastName?: string, role?: string, rememberMe: boolean = true) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p, firstName, lastName, role })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to register');
    
    if (rememberMe) {
      localStorage.setItem('scm_auth_token', data.token);
      sessionStorage.removeItem('scm_auth_token');
    } else {
      sessionStorage.setItem('scm_auth_token', data.token);
      localStorage.removeItem('scm_auth_token');
    }
    setToken(data.token);
    setProfile(data.user);
  };

  
  const biometricLogin = async (email: string) => {
    const response = await fetch('/api/auth/webauthn-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to login via biometrics');
    
    localStorage.setItem('scm_auth_token', data.token);
    sessionStorage.removeItem('scm_auth_token');
    
    setToken(data.token);
    setProfile(data.user);
  };

  const login = async (e: string, p: string, rememberMe: boolean = true) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to login');
    
    if (rememberMe) {
      localStorage.setItem('scm_auth_token', data.token);
      sessionStorage.removeItem('scm_auth_token');
    } else {
      sessionStorage.setItem('scm_auth_token', data.token);
      localStorage.removeItem('scm_auth_token');
    }
    setToken(data.token);
    setProfile(data.user);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!token || !profile) return;
    try {
      const updatedUser = await fetchApi('/users/me', token, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      setProfile(updatedUser);
    } catch (e: any) {
      throw new Error(e.message || 'Failed to update profile');
    }
  };

  const changePassword = async (currentPassword: string, nextPassword: string) => {
    if (!token) return;
    try {
      const data = await fetchApi('/users/change-password', token, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword: nextPassword })
      });
      return data;
    } catch (e: any) {
      throw new Error(e.message || 'Failed to change password');
    }
  };

  const forgotPassword = async (email: string) => {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to request code');
    return data;
  };

  const resetPassword = async (email: string, resetCode: string, nextPassword: string) => {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetCode, newPassword: nextPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to reset password');
  };

  const getSecurityHistory = async () => {
    if (!token) return [];
    try {
      const data = await fetchApi('/users/me/security-history', token);
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user: profile, 
      profile, 
      loading, 
      token, 
      register, 
      login,
      biometricLogin, 
      logOut, 
      updateProfile,
      changePassword,
      forgotPassword,
      resetPassword,
      getSecurityHistory
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
