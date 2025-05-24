// attendance.services.js
import axios from 'axios';
import { API_BASE_URL } from './auth.services';

export const getAttendanceByStudentId = async (studentId) => {
  try {
    const accessToken = localStorage.getItem('access_token');
    
    if (!accessToken) throw new Error('No access token found');
    if (!studentId) throw new Error('Student ID is required');

    const response = await axios.get(
      `${API_BASE_URL}/attendance/dashboard/${studentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to fetch attendance:', error);
    throw error;
  }
};



export const markAttendance = async () => {
  try {
    const accessToken = localStorage.getItem('access_token');
    
    if (!accessToken) throw new Error('No access token found');
  
    const response = await axios.get(
      `${API_BASE_URL}/attendance`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to mark attendance:', error);
    throw error;
  }
};