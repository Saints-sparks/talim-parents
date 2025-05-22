import { API_ENDPOINTS } from "../lib/constants"

export const attendanceService = {
  getDashboard: async (schoolId, accessToken) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE.GET_STUDENT_ATTENDANCE.replace(":schoolId", schoolId)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Success response:', data);
      return data;
    } catch (error) {
      console.error('Network error:', error);
      throw error;
    }
  }
};
