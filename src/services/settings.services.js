import axios from 'axios';
import { API_BASE_URL } from './auth.services';

const getAuthConfig = () => {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) throw new Error('No access token found');
  return { headers: { Authorization: `Bearer ${accessToken}` } };
};

export const getParentSettings = async () => {
  const response = await axios.get(`${API_BASE_URL}/parent/settings`, getAuthConfig());
  return response.data;
};

export const updateParentSettingsProfile = async (payload) => {
  const response = await axios.patch(
    `${API_BASE_URL}/parent/settings/profile`,
    payload,
    getAuthConfig(),
  );
  return response.data;
};

export const changeParentPassword = async (payload) => {
  const response = await axios.patch(
    `${API_BASE_URL}/parent/settings/password`,
    payload,
    getAuthConfig(),
  );
  return response.data;
};

export const sendPhoneChangeOtp = async (payload) => {
  const response = await axios.post(
    `${API_BASE_URL}/parent/settings/phone/send-otp`,
    payload,
    getAuthConfig(),
  );
  return response.data;
};

export const verifyPhoneChangeOtp = async (payload) => {
  const response = await axios.post(
    `${API_BASE_URL}/parent/settings/phone/verify-otp`,
    payload,
    getAuthConfig(),
  );
  return response.data;
};

export const updateNotificationPreferences = async (payload) => {
  const response = await axios.patch(
    `${API_BASE_URL}/parent/settings/notifications`,
    payload,
    getAuthConfig(),
  );
  return response.data;
};

export const updateThemePreference = async (payload) => {
  const response = await axios.patch(
    `${API_BASE_URL}/parent/settings/theme`,
    payload,
    getAuthConfig(),
  );
  return response.data;
};

export const getLinkedChildren = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/parent/settings/children`,
    getAuthConfig(),
  );
  return response.data;
};
