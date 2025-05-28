import axios from 'axios';
import { API_BASE_URL } from '../services/auth.services'; // Assuming auth.js is in the same directory
import { useState } from 'react';
export const useLeaveRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const createLeaveRequest = async (leaveRequestData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const authToken = localStorage.getItem('access_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_BASE_URL}/leave-requests`,
        leaveRequestData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setSuccess(true);
      return response.data;
    } catch (err) {
      console.error('Error creating leave request:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create leave request');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getLeaveRequests = async (childId) => {
    setLoading(true);
    setError(null);
    
    try {
      const authToken = localStorage.getItem('access_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(
        `${API_BASE_URL}/leave-requests/child/${childId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      return response.data;
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch leave requests');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getLeaveRequestById = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const authToken = localStorage.getItem('access_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(
        `${API_BASE_URL}/leave-requests/${id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      return response.data;
    } catch (err) {
      console.error('Error fetching leave request:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch leave request');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelLeaveRequest = async (id) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const authToken = localStorage.getItem('access_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await axios.patch(
        `${API_BASE_URL}/leave-requests/${id}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setSuccess(true);
      return response.data;
    } catch (err) {
      console.error('Error canceling leave request:', err);
      setError(err.response?.data?.message || err.message || 'Failed to cancel leave request');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createLeaveRequest,
    getLeaveRequests,
    getLeaveRequestById,
    cancelLeaveRequest,
    loading,
    error,
    success,
    resetSuccess: () => setSuccess(false),
  };
};

// Helper function to format leave request data
export const formatLeaveRequestData = (data) => {
  return {
    child: data.childId,
    startDate: new Date(data.startDate).toISOString(),
    endDate: new Date(data.endDate).toISOString(),
    leaveType: data.leaveType,
    reason: data.reason,
    attachments: data.attachments || [],
    term: data.termId,
  };
};