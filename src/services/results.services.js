import axios from 'axios';
import { API_BASE_URL } from './auth.services';

const getAuthConfig = () => {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) throw new Error('No access token found');
  return { headers: { Authorization: `Bearer ${accessToken}` } };
};

const base = (studentId) => `${API_BASE_URL}/parent/results/${studentId}`;

export const getResultSummary = async (studentId, params = {}) => {
  const response = await axios.get(`${base(studentId)}/summary`, {
    ...getAuthConfig(),
    params,
  });
  return response.data;
};

export const getSubjectResults = async (studentId, params = {}) => {
  const response = await axios.get(`${base(studentId)}/subjects`, {
    ...getAuthConfig(),
    params,
  });
  return response.data;
};

export const getGradeSummary = async (studentId, params = {}) => {
  const response = await axios.get(`${base(studentId)}/grade-summary`, {
    ...getAuthConfig(),
    params,
  });
  return response.data;
};

export const getTermProgress = async (studentId, params = {}) => {
  const response = await axios.get(`${base(studentId)}/term-progress`, {
    ...getAuthConfig(),
    params,
  });
  return response.data;
};

export const getAssessmentBreakdown = async (studentId, params = {}) => {
  const response = await axios.get(`${base(studentId)}/assessment-breakdown`, {
    ...getAuthConfig(),
    params,
  });
  return response.data;
};
