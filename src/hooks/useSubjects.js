import { useState } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from './useAuth'; // Import the useAuth hook


export const useSubjects = () => {
  const { authToken } = useAuth(); // Get the authToken from useAuth hook
  const [subjects, setSubjects] = useState([]);
  const [totalSubjects, setTotalSubjects] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);




  // Create a new subject
  const createSubject = async (subjectData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/subjects/create`, subjectData, {
        headers: {
          Authorization: `Bearer ${authToken}`, // Add the token in the Authorization header
        },
      });
      setSubjects((prevSubjects) => [...prevSubjects, response.data]);
      setLoading(false);
    } catch (err) {
      setError('Failed to create subject');
      setLoading(false);
    }
  };

  // Fetch all subjects with pagination
  const getAllSubjects = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/subjects/all`, {
        params: { page, limit },
        headers: {
          Authorization: `Bearer ${authToken}`, // Add the token in the Authorization header
        },
      });
      setSubjects(response.data.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch subjects');
      setLoading(false);
    }
  };

  // Get a subject by ID
  const getSubjectById = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/subjects/${id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`, // Add the token in the Authorization header
        },
      });
      setSubjects((prevSubjects) =>
        prevSubjects.map((subject) =>
          subject._id === id ? response.data : subject
        )
      );
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch subject');
      setLoading(false);
    }
  };

  // Update a subject
  const updateSubject = async (id, updatedData) => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_URL}/subjects/update/${id}`, updatedData, {
        headers: {
          Authorization: `Bearer ${authToken}`, // Add the token in the Authorization header
        },
      });
      setSubjects((prevSubjects) =>
        prevSubjects.map((subject) =>
          subject._id === id ? response.data : subject
        )
      );
      setLoading(false);
    } catch (err) {
      setError('Failed to update subject');
      setLoading(false);
    }
  };

  // Delete a subject
  const deleteSubject = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/subjects/delete/${id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`, // Add the token in the Authorization header
        },
      });
      setSubjects((prevSubjects) =>
        prevSubjects.filter((subject) => subject._id !== id)
      );
      setLoading(false);
    } catch (err) {
      setError('Failed to delete subject');
      setLoading(false);
    }
  };

// Get subjects by school

const getSubjectsBySchool = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await axios.get(`${API_URL}/courses/school`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    setSubjects(response.data);
    setTotalSubjects(response.data.length); // Set the total count of subjects
    setLoading(false);
  } catch (err) {
    setError('Failed to get subjects by school');
    setLoading(false);
  }
};

// Call this function when needed, for example in useEffect
useEffect(() => {
  getSubjectsBySchool();
}, []);
  return {
    subjects,
    loading,
    error,
    createSubject,
    getAllSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject,
    getSubjectsBySchool
    
  };
};
