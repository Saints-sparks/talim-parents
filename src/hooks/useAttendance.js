// hooks/useAttendance.js
import { useState, useCallback } from 'react';
import { getAttendanceByStudentId } from '../services/attendance.services';

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

  return {
    attendanceData,
    loading,
    error,
    getAttendanceById,
  };
};