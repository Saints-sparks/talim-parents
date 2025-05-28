// services/school.services.js
import axios from "axios";

import { API_BASE_URL } from './auth.services';

// Plain function that accepts authToken as parameter
export const fetchSchoolById = async (schoolId, authToken) => {
  if (!schoolId) throw new Error("School ID is required");

  try {
    const response = await axios.get(`${API_BASE_URL}/schools/${schoolId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching school:", error);
    throw error;
  }
};
