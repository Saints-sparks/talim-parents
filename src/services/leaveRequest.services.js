import axios from 'axios';
import { API_BASE_URL } from './auth.services';

// Optional: Axios interceptor to log all response errors
axios.interceptors.response.use(
  response => response,
  error => {
    console.error("Global Axios Error:", {
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
      status: error.response?.status,
    });
    return Promise.reject(error);
  }
);

const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem('access_token');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Cache-Control': 'no-cache',
    'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
  };

  return { headers };
};

export const createLeaveRequest = async (leaveRequestData) => {
  try {
    const isFormData = leaveRequestData instanceof FormData;

    console.log('POST URL:', `${API_BASE_URL}/leave-requests`);
    console.log('Sending leave request data:', leaveRequestData);
    console.log('Is FormData:', isFormData);
    console.log('Headers:', getAuthHeaders(isFormData));

    const response = await axios.post(
      `${API_BASE_URL}/leave-requests`,
      leaveRequestData,
      getAuthHeaders(isFormData)
    );
    return response.data;
  } catch (error) {
    console.error('Error creating leave request:', error);
    throw error;
  }
};

export const getLeaveRequestById = async (id) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/leave-requests/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching leave request:', error);
    throw error;
  }
};

export const updateLeaveRequestStatus = async (id, statusData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/leave-requests/${id}/status`,
      statusData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error updating leave request status:', error);
    throw error;
  }
};

export const getLeaveRequestsByChild = async (childId) => {
  if (!childId) throw new Error("Child ID is required");
  try {
    const response = await axios.get(
      `${API_BASE_URL}/leave-requests/student/${childId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching leave requests by child:', error);
    throw error;
  }
};

export const getLeaveRequestsByTeacher = async (teacherId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/leave-requests/teacher/${teacherId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching leave requests by teacher:', error);
    throw error;
  }
};

export const deleteLeaveRequest = async (id) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/leave-requests/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting leave request:', error);
    throw error;
  }
};
