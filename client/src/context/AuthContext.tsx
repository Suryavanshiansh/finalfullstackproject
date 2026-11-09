import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, passwordPlain: string) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (targetRole: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fpis_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { success, error: toastError, info } = useToast();

  const fetchProfile = async () => {
    try {
      const res = await api.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        logout();
      }
    } catch (err) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, passwordPlain: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: passwordPlain });
      if (res.success && res.data) {
        const { token: newToken, user: newUser } = res.data;
        localStorage.setItem('fpis_token', newToken);
        setToken(newToken);
        setUser(newUser);
        success('Welcome back!', `Signed in as ${newUser.firstName} ${newUser.lastName} (${newUser.role})`);
      }
    } catch (err: any) {
      toastError('Login Failed', err.message || 'Invalid credentials');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('fpis_token');
    setToken(null);
    setUser(null);
    info('Logged out', 'You have been signed out of your account.');
  };

  const quickSwitchRole = async (targetRole: UserRole) => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      FACULTY: { email: 'faculty.cs@fpis.edu', pass: 'Password@123' },
      REVIEWER: { email: 'reviewer.cs@fpis.edu', pass: 'Password@123' },
      ADMIN: { email: 'admin@fpis.edu', pass: 'Password@123' },
    };

    const target = creds[targetRole];
    if (target) {
      await login(target.email, target.pass);
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        quickSwitchRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
