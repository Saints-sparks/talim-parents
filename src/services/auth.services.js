import { useState } from 'react';
import axios from 'axios';

export const API_BASE_URL = 'http://localhost:5000';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
  const [schoolId, setSchoolId] = useState(localStorage.getItem('school_id'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });
  
      const { access_token, refresh_token } = response.data;
  
      if (access_token && refresh_token) {
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        setAuthToken(access_token);
        setRefreshToken(refresh_token);
  
        // Introspect to get user info
        const introspectRes = await axios.post(`${API_BASE_URL}/auth/introspect`, {
          token: access_token,
        });
  
        const userData = introspectRes.data?.user;
        setUser(userData);
        setSchoolId(userData?.schoolId);
        localStorage.setItem('school_id', userData?.schoolId || '');
  
        // Store userId as parentId for fetching children students later
        localStorage.setItem('parent_id', userData?.userId || '');
  
        setLoading(false);
        return true;
      }
  
      throw new Error('Authentication failed');
    } catch (err) {
      console.error(err);
      setError('Login failed, please check your credentials');
      setLoading(false);
      return false;
    }
  };
  
  const register = async (email, password, role, schoolId, firstName, lastName, phoneNumber) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        role,
        schoolId,
        firstName,
        lastName,
        phoneNumber,
      });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Registration failed, please check the information');
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('school_id');
      setAuthToken(null);
      setRefreshToken(null);
      setSchoolId(null);
      setUser(null);
      setLoading(false);
    } catch (err) {
      setError('Logout failed');
      setLoading(false);
    }
  };

  const refreshTokenHandler = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/refresh-token`, {
        refreshToken,
      });
      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setAuthToken(access_token);
      setRefreshToken(refresh_token);
    } catch (err) {
      setError('Token refresh failed');
    }
  };

  const getProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/profile/${user?.userId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setUser(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load profile');
      setLoading(false);
    }
  };

  const updateProfile = async (updatedData) => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/profile/update/`,
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      setUser(response.data);
      setLoading(false);
    } catch (err) {
      setError('Profile update failed');
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/forgot-password`, { email });
      setLoading(false);
    } catch (err) {
      setError('Password reset failed');
      setLoading(false);
    }
  };

  return {
    user,
    schoolId,
    authToken,
    refreshToken,
    loading,
    error,
    login,
    register,
    logout,
    refreshTokenHandler,
    getProfile,
    updateProfile,
    forgotPassword,
  };
};
