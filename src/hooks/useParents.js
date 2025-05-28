// useParent.js
import { useState, useEffect } from 'react';
import { getStudentsByParent } from '../services/parent.services';

export const useParent = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentsByParent();
      console.log('Fetched students in useParent:', data);  // <== log here
      setStudents(data);
    } catch (err) {
      console.error('Error in fetchStudents:', err);
      setError(err.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    fetchStudents();
  }, []);

  return {
    students,
    loading,
    error,
    refreshStudents: fetchStudents, // optional, for manual refresh
  };
};
