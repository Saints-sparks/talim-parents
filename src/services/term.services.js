import axios from 'axios';
import { API_BASE_URL } from './auth.services';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache',
    },
  };
};

export const getCurrentTerm = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/academic-year-term/term/current`,
      getAuthHeaders()
    );
    return response.data; // the current term object
  } catch (error) {
    console.error('Error fetching current term:', error);
    throw error;
  }
};


// (Optional) Other term-related API calls:
// createTerm, updateTerm, deleteTerm etc. can be added similarly
