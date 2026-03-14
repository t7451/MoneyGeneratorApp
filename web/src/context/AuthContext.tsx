import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: { name?: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<{ success: boolean; error?: string }>;
  refreshToken: () => Promise<boolean>;
}

// Storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// API base URL
function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

// Auth API functions
async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${path}` : path;
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  // Add token if available
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const res = await fetch(url, {
    ...options,
    headers,
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data as T;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        
        // Verify token is still valid
        verifyToken(storedToken).catch(() => {
          // Token invalid, clear auth
          clearAuth();
        });
      } catch {
        clearAuth();
      }
    }
    
    setIsLoading(false);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const saveAuth = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const verifyToken = async (tokenToVerify: string): Promise<User> => {
    const response = await authFetch<{ success: boolean; data: { user: User } }>('/auth/me', {
      headers: {
        Authorization: `Bearer ${tokenToVerify}`,
      },
    });
    return response.data.user;
  };

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await authFetch<{ success: boolean; data: { user: User; token: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      saveAuth(response.data.token, response.data.user);
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [saveAuth]);

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await authFetch<{ success: boolean; data: { user: User; token: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      saveAuth(response.data.token, response.data.user);
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [saveAuth]);

  const logout = useCallback(() => {
    // Call logout endpoint (fire and forget)
    authFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuth();
  }, [clearAuth]);

  const updateProfile = useCallback(async (data: { name?: string; email?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authFetch<{ success: boolean; data: { user: User } }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      // Update stored user
      if (token) {
        saveAuth(token, response.data.user);
      }
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed';
      return { success: false, error: message };
    }
  }, [token, saveAuth]);

  const changePassword = useCallback(async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      await authFetch<{ success: boolean; message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      return { success: false, error: message };
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authFetch<{ success: boolean; data: { token: string; user: User } }>('/auth/refresh', {
        method: 'POST',
      });
      
      saveAuth(response.data.token, response.data.user);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [saveAuth, clearAuth]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to get current token (for API client)
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export default AuthContext;
