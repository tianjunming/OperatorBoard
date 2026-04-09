import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token') || null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);

  const login = useCallback(async (username, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // Fetch current user
      const userResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
        setPermissions(userData.permissions || []);
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setPermissions([]);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }, []);

  const refreshTokens = useCallback(async () => {
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        logout();
        return false;
      }

      const data = await response.json();
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return true;
    } catch (error) {
      console.error('Refresh token error:', error);
      logout();
      return false;
    }
  }, [refreshToken, logout]);

  const hasPermission = useCallback((permissionCode) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return permissions.includes(permissionCode);
  }, [user, permissions]);

  const hasRole = useCallback((roleCode) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return user.roles && user.roles.includes(roleCode);
  }, [user]);

  // Fetch current user on mount if token exists
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setPermissions(userData.permissions || []);
        } else if (response.status === 401) {
          // Try to refresh token
          const refreshed = await refreshTokens();
          if (!refreshed) {
            logout();
          }
        }
      } catch (error) {
        console.error('Fetch user error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token, refreshTokens, logout]);

  const value = {
    user,
    token,
    permissions,
    isAuthenticated: !!user,
    isSuperuser: user?.is_superuser || false,
    login,
    logout,
    hasPermission,
    hasRole,
    refreshTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
