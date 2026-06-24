import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authLogin, authRegister, authMe } from '../api/ecoquestApi.js';

/**
 * AuthContext — manages JWT session and user profile.
 *
 * user shape: { id, email, displayName, role, studentId }
 * role values from backend: STUDENT | MODERATOR | ADMIN
 */
const AuthContext = createContext(null);

const TOKEN_KEY = 'eq-access-token';

// Map backend role string → UI role string used throughout the app
const ROLE_MAP = {
  STUDENT:   'Student',
  MODERATOR: 'Moderator',
  ADMIN:     'Admin',
};

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);   // null = not logged in
  const [loading, setLoading] = useState(true);  // true during initial token check

  // On mount: restore session from localStorage token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    authMe()
      .then(profile => setUser(profile))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const _persist = (tokenResp) => {
    const { accessToken, user: u } = tokenResp;
    if (!accessToken) {
      return u;
    }
    localStorage.setItem(TOKEN_KEY, accessToken);
    setUser(u);
    return u;
  };

  const login = useCallback(async (email, password) => {
    const resp = await authLogin(email, password);
    return _persist(resp);
  }, []);

  const register = useCallback(async (data) => {
    const resp = await authRegister(data);
    return _persist(resp);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await authMe();
    setUser(profile);
    return profile;
  }, []);

  const updateSessionUser = useCallback((profile) => {
    setUser(profile);
  }, []);

  /** The UI role label ("Student" / "Moderator" / "Admin") for current user */
  const uiRole = user ? (ROLE_MAP[user.role] || 'Student') : 'Student';

  /** Student ID from the logged-in user profile */
  const studentId = user?.studentId || 'SV001';

  return (
    <AuthContext.Provider value={{
      user, uiRole, studentId, loading, login, register, logout, refreshUser, updateSessionUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
