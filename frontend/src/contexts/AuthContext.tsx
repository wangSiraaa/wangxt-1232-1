import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, authApi } from '@/api/client';
import { User, UserRole } from '@/types';
import { toast } from 'react-toastify';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser) as User;
          const normalizedUser: User = {
            ...parsedUser,
            fullName: parsedUser.fullName || (parsedUser as any).name || '',
          };
          setToken(savedToken);
          setUser(normalizedUser);
          apiClient.setToken(savedToken);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      const { accessToken, user: userData } = response;

      setToken(accessToken);
      setUser(userData);
      apiClient.setToken(accessToken);

      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));

      toast.success(`欢迎，${userData.fullName}！`);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    apiClient.clearToken();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.info('已退出登录');
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role) || user.role === UserRole.ADMIN;
    }
    return user.role === role || user.role === UserRole.ADMIN;
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

