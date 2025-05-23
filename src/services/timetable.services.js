import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './auth.services';  // reuse base URL

export const useTimetable = () => {
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // get authToken from localStorage directly
  const authToken = localStorage.getItem('access_token');

  // Helper: axios instance with auth header
  const axiosAuth = axios.create({
    baseURL: API_BASE_URL,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  // Fetch timetable by class ID
  const getTimetableByClass = async (classId) => {
    setLoading(true);
    try {
      const response = await axiosAuth.get(`/timetable/class/${classId}`);
      setTimetables(response.data);
      setError(null);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Failed to fetch timetable by class');
      setLoading(false);
      return null;
    }
  };

  // Fetch timetable by teacher ID
  const getTimetableByTeacher = async (teacherId) => {
    setLoading(true);
    try {
      const response = await axiosAuth.get(`/timetable/teacher/${teacherId}`);
      setTimetables(response.data);
      setError(null);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Failed to fetch timetable by teacher');
      setLoading(false);
      return null;
    }
  };

  // Create a new timetable entry
  const createTimetable = async (timetableData) => {
    setLoading(true);
    try {
      const response = await axiosAuth.post('/timetable', timetableData);
      setError(null);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Failed to create timetable entry');
      setLoading(false);
      return null;
    }
  };

  // Update timetable entry by ID
  const updateTimetable = async (id, updateData) => {
    setLoading(true);
    try {
      const response = await axiosAuth.put(`/timetable/${id}`, updateData);
      setError(null);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Failed to update timetable entry');
      setLoading(false);
      return null;
    }
  };

  // Delete timetable entry by ID
  const deleteTimetable = async (id) => {
    setLoading(true);
    try {
      await axiosAuth.delete(`/timetable/${id}`);
      setError(null);
      setLoading(false);
      return true;
    } catch (err) {
      setError('Failed to delete timetable entry');
      setLoading(false);
      return false;
    }
  };

  return {
    timetables,
    loading,
    error,
    getTimetableByClass,
    getTimetableByTeacher,
    createTimetable,
    updateTimetable,
    deleteTimetable,
  };
};
