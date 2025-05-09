import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../services/auth.services';

export const useSubjects = () => {
  const { authToken } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create a new subject
  const createSubject = async (subjectData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/subjects/create`, subjectData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setSubjects((prevSubjects) => [...prevSubjects, response.data]);
      setTotalSubjects(prev => prev + 1);
      setLoading(false);
      return response.data;``
    } catch (err) {
      setError('Failed to create subject');
      setLoading(false);
      throw err;
    }
  };

  // Fetch all subjects with pagination
  const getAllSubjects = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/subjects/all`, {
        params: { page, limit },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setSubjects(response.data.data);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Failed to fetch subjects');
      setLoading(false);
      throw err;
    }
  };

  // Get a subject by ID
  const getSubjectById = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/subjects/${id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setSubjects((prevSubjects) =>
        prevSubjects.map((subject) =>
          subject._id === id ? response.data : subject
        )
      );
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Failed to fetch subject');
      setLoading(false);
      throw err;
    }
  };

  // Update a subject
  const updateSubject = async (id, updatedData) => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/subjects/update/${id}`, updatedData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setSubjects((prevSubjects) =>
        prevSubjects.map((subject) =>
          subject._id === id ? response.data : subject
        )
      );
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Failed to update subject');
      setLoading(false);
      throw err;
    }
  };

  // Delete a subject
  const deleteSubject = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/subjects/delete/${id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setSubjects((prevSubjects) =>
        prevSubjects.filter((subject) => subject._id !== id)
      );
      setTotalSubjects(prev => prev - 1);
      setLoading(false);
    } catch (err) {
      setError('Failed to delete subject');
      setLoading(false);
      throw err;
    }
  };

  // Get subjects by school
  const getSubjectsBySchool = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/subjects-courses/by-school`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setSubjects(response.data);
      setTotalSubjects(response.data.length);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError('Failed to get subjects by school');
      setLoading(false);
      throw err;
    }
  };

  useEffect(() => {
    getSubjectsBySchool();
  }, []);

  return {
    subjects,
    totalSubjects,
    loading,
    error,
    createSubject,
    getAllSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject,
    getSubjectsBySchool,
    refetch: getSubjectsBySchool
  };
};