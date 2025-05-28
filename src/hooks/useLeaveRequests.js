import { useState } from 'react';
import {
  createLeaveRequest,
  getLeaveRequestsByChild,
  getLeaveRequestsByTeacher,
  getLeaveRequestById,
  updateLeaveRequestStatus,
  deleteLeaveRequest,
} from '../services/leaveRequest.services';

export const useLeaveRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [currentLeaveRequest, setCurrentLeaveRequest] = useState(null);

  const handleError = (error) => {
    console.error("Leave Request Error:", error);
    setError(error.response?.data?.message || error.message || 'Unknown error');
    setLoading(false);
    throw error;
  };

  const fetchLeaveRequestsByChild = async (childId) => {
    console.log("Fetching leave requests for childId:", childId);
    setLoading(true);
    try {
      const data = await getLeaveRequestsByChild(childId);
      console.log("Leave requests fetched:", data);
      setLeaveRequests(data);
      setError(null);
      setLoading(false);
      return data;
    } catch (error) {
      return handleError(error);
    }
  };

  const fetchLeaveRequestsByTeacher = async (teacherId) => {
    setLoading(true);
    try {
      const data = await getLeaveRequestsByTeacher(teacherId);
      setLeaveRequests(data);
      setError(null);
      setLoading(false);
      return data;
    } catch (error) {
      return handleError(error);
    }
  };

  const fetchLeaveRequestById = async (id) => {
    setLoading(true);
    try {
      const data = await getLeaveRequestById(id);
      setCurrentLeaveRequest(data);
      setError(null);
      setLoading(false);
      return data;
    } catch (error) {
      return handleError(error);
    }
  };

  const updateStatus = async (id, statusData) => {
    setLoading(true);
    try {
      const data = await updateLeaveRequestStatus(id, statusData);
      setError(null);
      setLoading(false);
      return data;
    } catch (error) {
      return handleError(error);
    }
  };

  const createNewLeaveRequest = async (leaveRequestData) => {
    setLoading(true);
    try {
      const result = await createLeaveRequest(leaveRequestData);
      setLoading(false);
      return result;
    } catch (error) {
      return handleError(error);
    }
  };

  const removeLeaveRequest = async (id) => {
    setLoading(true);
    try {
      const result = await deleteLeaveRequest(id);
      setLoading(false);
      return result;
    } catch (error) {
      return handleError(error);
    }
  };

  return {
    loading,
    error,
    leaveRequests,
    currentLeaveRequest,
    fetchLeaveRequestsByChild,
    fetchLeaveRequestsByTeacher,
    fetchLeaveRequestById,
    updateStatus,
    createNewLeaveRequest,
    removeLeaveRequest,
  };
};
