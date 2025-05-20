import { useState } from 'react';
import axios from 'axios';
import {API_ENDPOINTS} from '../config/api';



export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_ENDPOINTS.LOGIN}`, {
        email,
        password,
        // deviceToken,
        // platform,
      });

      const { access_token, refresh_token} = response.data;
      console.log(response.data)
      if (access_token && refresh_token) {
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        setAuthToken(access_token);
        setRefreshToken(refresh_token);

        setLoading(false);
        return true; // Authentication successful, return true
      }
      throw new Error('Authentication failed');
    } catch (err) {
      setError('Login failed, please check your credentials');
      setLoading(false);
      return false; // Return false in case of failure
    }
  };

  const register = async (email, password, role, schoolId, firstName, lastName, phoneNumber) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_ENDPOINTS.REGISTER}`, {
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
        `${API_ENDPOINTS.LOGOUT}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAuthToken(null);
      setRefreshToken(null);
      setUser(null);
      setLoading(false);
    } catch (err) {
      setError('Logout failed');
      setLoading(false);
    }
  };

  const refreshTokenHandler = async () => {
    try {
      const response = await axios.post(`${API_ENDPOINTS.REGISTER}`, {
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
