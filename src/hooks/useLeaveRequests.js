import { useState, useEffect, useCallback } from 'react';
import leaveRequestService from '../services/leaveRequest.services';

export const useLeaveRequests = (authToken) => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);

  // Create a new leave request
  const createLeaveRequest = useCallback(
    async (data) => {
      setLoading(true);
      try {
        const response = await leaveRequestService.createLeaveRequest(data, authToken);
        setLeaveRequests((prev) => [...prev, response]);
        setLoading(false);
        return response;
      } catch (err) {
        setError(err);
        setLoading(false);
        throw err;
      }
    },
    [authToken]
  );

  // Get a single leave request by ID
  const getLeaveRequest = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const response = await leaveRequestService.getLeaveRequestById(id, authToken);
        setCurrentRequest(response);
        setLoading(false);
        return response;
      } catch (err) {
        setError(err);
        setLoading(false);
        throw err;
      }
    },
    [authToken]
  );

  // Update leave request status
  const updateLeaveRequestStatus = useCallback(
    async (id, statusData) => {
      setLoading(true);
      try {
        const response = await leaveRequestService.updateLeaveRequestStatus(
          id,
          statusData,
          authToken
        );
        setLeaveRequests((prev) =>
          prev.map((req) => (req._id === id ? response : req))
        );
        if (currentRequest?._id === id) {
          setCurrentRequest(response);
        }
        setLoading(false);
        return response;
      } catch (err) {
        setError(err);
        setLoading(false);
        throw err;
      }
    },
    [authToken, currentRequest]
  );

  // Get leave requests by student (child)
  const getLeaveRequestsByChild = useCallback(
    async (childId) => {
      setLoading(true);
      try {
        const response = await leaveRequestService.getLeaveRequestsByChild(
          childId,
          authToken
        );
        setLeaveRequests(response);
        setLoading(false);
        return response;
      } catch (err) {
        setError(err);
        setLoading(false);
        throw err;
      }
    },
    [authToken]
  );

  // Get leave requests by teacher
  const getLeaveRequestsByTeacher = useCallback(
    async (teacherId) => {
      setLoading(true);
      try {
        const response = await leaveRequestService.getLeaveRequestsByTeacher(
          teacherId,
          authToken
        );
        setLeaveRequests(response);
        setLoading(false);
        return response;
      } catch (err) {
        setError(err);
        setLoading(false);
        throw err;
      }
    },
    [authToken]
  );

  // Delete a leave request
  const deleteLeaveRequest = useCallback(
    async (id) => {
      setLoading(true);
      try {
        await leaveRequestService.deleteLeaveRequest(id, authToken);
        setLeaveRequests((prev) => prev.filter((req) => req._id !== id));
        if (currentRequest?._id === id) {
          setCurrentRequest(null);
        }
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
        throw err;
      }
    },
    [authToken, currentRequest]
  );

  // Clear current leave request
  const clearCurrentRequest = useCallback(() => {
    setCurrentRequest(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    leaveRequests,
    currentRequest,
    loading,
    error,
    createLeaveRequest,
    getLeaveRequest,
    updateLeaveRequestStatus,
    getLeaveRequestsByChild,
    getLeaveRequestsByTeacher,
    deleteLeaveRequest,
    clearCurrentRequest,
    clearError,
  };
};