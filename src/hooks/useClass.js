import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../services/auth.services'; // Importing the base URL for the backend
const [authToken] = useState(localStorage.getItem('access_token')); 


// Fetch students by class
export const getStudentsByClass = async (classId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/students/by-class/${classId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params: {
            page: 1,
            limit: 10,
          },
        }
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching students:", error);
      return [];
    }
  };
  