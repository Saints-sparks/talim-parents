import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../services/auth.services'; // Importing the base URL for the backend

export const useAttendance = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authToken] = useState(localStorage.getItem('access_token')); // Getting the token from localStorage

  const getAttendanceById = async (studentId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/attendance/${studentId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`, // Using the authorization token
        },
      });
      setAttendanceData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch attendance data');
      setLoading(false);
    }
  };

  return {
    attendanceData,
    loading,
    error,
    getAttendanceById,
  };
};
