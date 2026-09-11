import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'employer' | 'worker' | 'supervisor';
  designation?: string;
  department?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<UserProfile>;
  register: (userData: { name: string; email: string; password: string; role: string }) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (err) {
          removeAuthToken();
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<UserProfile> => {
    const res = await api.login(credentials);
    setAuthToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData: { name: string; email: string; password: string; role: string }): Promise<UserProfile> => {
    const res = await api.register(userData);
    setAuthToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
