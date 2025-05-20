import { useState, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export function useLeaveRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelToken = useRef(null);

  const authToken = localStorage.getItem('access_token');

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Cache-Control': 'no-cache',
    },
  };

  // Cancel ongoing request when component unmounts
  const cancelRequest = () => {
    if (cancelToken.current) {
      cancelToken.current.cancel('Request canceled by user');
    }
  };

  const makeRequest = async (requestFn) => {
    cancelRequest(); // Cancel any ongoing request
    
    setLoading(true);
    setError(null);
    
    cancelToken.current = axios.CancelToken.source();
    
    try {
      const response = await requestFn();
      setLoading(false);
      return response.data;
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError(err.response?.data || err.message);
        setLoading(false);
      }
      throw err;
    }
  };

  // Create a new leave request
  const createLeaveRequest = async (data) => {
    return makeRequest(() => axios.post(
      `${API_BASE_URL}/leave-requests`,
      data,
      { ...axiosConfig, cancelToken: cancelToken.current.token }
    ));
  };

  // Get leave request by ID
  const getLeaveRequestById = async (id) => {
    return makeRequest(() => axios.get(
      `${API_BASE_URL}/leave-requests/${id}`,
      { ...axiosConfig, cancelToken: cancelToken.current.token }
    ));
  };

  // Update leave request status
  const updateLeaveRequestStatus = async (id, updateData) => {
    return makeRequest(() => axios.put(
      `${API_BASE_URL}/leave-requests/${id}/status`,
      updateData,
      { ...axiosConfig, cancelToken: cancelToken.current.token }
    ));
  };

  // Get leave requests by child/student ID
  const getLeaveRequestsByChild = async (childId) => {
    return makeRequest(() => axios.get(
      `${API_BASE_URL}/leave-requests/student/${childId}`,
      { ...axiosConfig, cancelToken: cancelToken.current.token }
    ));
  };

  // Get leave requests by teacher ID
  const getLeaveRequestsByTeacher = async (teacherId) => {
    return makeRequest(() => axios.get(
      `${API_BASE_URL}/leave-requests/teacher/${teacherId}`,
      { ...axiosConfig, cancelToken: cancelToken.current.token }
    ));
  };

  // Delete leave request by ID
  const deleteLeaveRequest = async (id) => {
    return makeRequest(() => axios.delete(
      `${API_BASE_URL}/leave-requests/${id}`,
      { ...axiosConfig, cancelToken: cancelToken.current.token }
    ));
  };

  return {
    loading,
    error,
    createLeaveRequest,
    getLeaveRequestById,
    updateLeaveRequestStatus,
    getLeaveRequestsByChild,
    getLeaveRequestsByTeacher,
    deleteLeaveRequest,
    cancelRequest, // Export cancel function for cleanup
  };
}