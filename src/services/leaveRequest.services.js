import axios from 'axios';
import { API_BASE_URL } from './auth.services';

const leaveRequestService = {
  // Create a new leave request
  async createLeaveRequest(data, token) {
    try {
      const response = await axios.post(`${API_BASE_URL}/leave-requests`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get a leave request by ID
  async getLeaveRequestById(id, token) {
    try {
      const response = await axios.get(`${API_BASE_URL}/leave-requests/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update leave request status
  async updateLeaveRequestStatus(id, data, token) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/leave-requests/${id}/status`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get leave requests by student
  async getLeaveRequestsByChild(childId, token) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/leave-requests/student/${childId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get leave requests by teacher
  async getLeaveRequestsByTeacher(teacherId, token) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/leave-requests/teacher/${teacherId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete a leave request
  async deleteLeaveRequest(id, token) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/leave-requests/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default leaveRequestService;