// hooks/useAttendance.js
import { useState, useCallback } from 'react';
import {
  getAttendanceByStudentId,
  getParentMonthlyAttendance,
} from '../services/attendance.services';

export const useAttendance = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Memoize the getAttendanceById function
  const getAttendanceById = useCallback(async (studentId) => {
    if (!studentId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await getAttendanceByStudentId(studentId);
      setAttendanceData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance data');
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMonthlyAttendance = useCallback(async (params) => {
    if (!params?.studentId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getParentMonthlyAttendance(params);
      setAttendanceData(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch attendance data');
      setAttendanceData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    attendanceData,
    loading,
    error,
    getAttendanceById,
    getMonthlyAttendance,
  };
};
