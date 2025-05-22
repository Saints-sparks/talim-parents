// services/subject.services.js

import { API_ENDPOINTS } from "../lib/constants";

// Helper to handle JSON response and errors
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API Error');
  }
  return data;
}

export const subjectService = {


  getSubjectsBySchool: async (accessToken) => {
    const response = await fetch(`${API_ENDPOINTS.SUBJECTS.GET_SUBJECTS_BY_SCHOOL}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return handleResponse(response);
  },
};
