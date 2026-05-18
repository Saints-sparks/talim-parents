/* eslint-disable react/prop-types, react-hooks/exhaustive-deps */
import { createContext, createElement, useContext, useMemo, useState } from 'react';
import axios from 'axios';

export const API_BASE_URL = 'https://talim-be-dev.onrender.com';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const clearParentUiState = (parentId) => {
  if (!parentId) return;
  localStorage.removeItem(`selected_student_${parentId}`);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [authToken, setAuthToken] = useState(localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
  const [schoolId, setSchoolId] = useState(localStorage.getItem('school_id'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parentId = user?.userId || user?._id || user?.id || localStorage.getItem('parent_id');

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
      );

      const { access_token, refresh_token } = response.data;
      if (!access_token) throw new Error('Invalid response: missing access token');

      localStorage.setItem('access_token', access_token);
      setAuthToken(access_token);

      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
        setRefreshToken(refresh_token);
      } else {
        localStorage.removeItem('refresh_token');
        setRefreshToken(null);
      }

      const introspectRes = await axios.post(
        `${API_BASE_URL}/auth/introspect`,
        { token: access_token },
        { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
      );

      const userData = introspectRes.data?.user;
      if (!userData) throw new Error('Invalid response: missing user data');

      if (userData.role !== 'parent') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        const friendlyRole = userData.role?.replace(/_/g, ' ') || 'unknown';
        const rbacMsg =
          `Access denied. This portal is for parents only. ` +
          `Your account is registered as "${friendlyRole}". ` +
          `Please use the correct Talim app for your role.`;
        setError(rbacMsg);
        setLoading(false);
        return { kind: 'access_denied', message: rbacMsg };
      }

      const nextParentId = userData?.userId || userData?._id || userData?.id || '';
      setUser(userData);
      setSchoolId(userData?.schoolId || '');
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('school_id', userData?.schoolId || '');
      localStorage.setItem('parent_id', nextParentId);

      setLoading(false);
      return { kind: 'success' };
    } catch (err) {
      let errorMessage = 'Incorrect email or password. Please check your credentials and try again.';

      if (err.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to the server. Please check your internet connection and try again.';
      } else if (err.code === 'ENOTFOUND') {
        errorMessage = 'Server not found. Please check your internet connection and try again.';
      } else if (err.response) {
        const serverMsg = err.response.data?.message;
        if (err.response.status === 401) {
          errorMessage = 'Incorrect email or password. Please double-check your credentials and try again.';
        } else if (serverMsg) {
          errorMessage = serverMsg;
        } else {
          errorMessage = `Server error (${err.response.status}). Please try again later.`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your internet connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      const isCredentialError =
        err.response?.status === 401 ||
        errorMessage.toLowerCase().includes('incorrect') ||
        errorMessage.toLowerCase().includes('credentials');
      setError(errorMessage);
      setLoading(false);
      return {
        kind: isCredentialError ? 'invalid_credentials' : 'unknown',
        message: errorMessage,
      };
    }
  };

  const logout = async () => {
    setLoading(true);
    const currentParentId = parentId;

    try {
      if (authToken) {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      }
    } catch {
      // Local logout should still succeed if the server is unavailable.
    } finally {
      clearParentUiState(currentParentId);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('school_id');
      localStorage.removeItem('parent_id');
      localStorage.removeItem('user');
      localStorage.removeItem('parent_students');
      setAuthToken(null);
      setRefreshToken(null);
      setSchoolId(null);
      setUser(null);
      setLoading(false);
    }
  };

  const refreshTokenHandler = async () => {
    if (!refreshToken) return;
    const response = await axios.post(`${API_BASE_URL}/refresh-token`, { refreshToken });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setAuthToken(access_token);
    setRefreshToken(refresh_token);
  };

  const updateUser = (updatedData) => {
    setUser((current) => {
      const next = { ...(current || {}), ...updatedData };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({
      user,
      parentId,
      schoolId,
      authToken,
      refreshToken,
      loading,
      error,
      login,
      logout,
      refreshTokenHandler,
      updateUser,
      isAuthenticated: Boolean(authToken),
    }),
    [user, parentId, schoolId, authToken, refreshToken, loading, error]
  );

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
