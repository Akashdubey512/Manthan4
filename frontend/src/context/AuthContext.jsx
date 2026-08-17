import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/auth';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await authService.getCurrentUser();
      if (error || !data) {
        // Token is invalid or expired
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } else {
        setUser(data);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    }
    
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const { data, error } = await authService.login(email, password);
    if (error) return { error };
    if (data?.token && data?.user) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { error: 'Invalid response from server' };
  };

  const register = async (name, email, password, role) => {
    const { data, error } = await authService.register(name, email, password, role);
    if (error) return { error };
    if (data?.token && data?.user) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { error: 'Invalid response from server' };
  };

  const logout = async () => {
    // Attempt backend logout, but don't block on it
    if (token) {
      await authService.logout().catch(() => {});
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    if (!token) return;
    const { data, error } = await authService.getCurrentUser();
    if (!error && data) {
      setUser(data);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}
