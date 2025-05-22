// lib/constants.js
export const API_BASE_URL = "http://localhost:5000";
// export const API_BASE_URL = "https://talimbe-v2-li38.onrender.com";

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  INTROSPECT: `${API_BASE_URL}/auth/introspect`,
  STUDENTS_BY_USER: `${API_BASE_URL}/students/by-user/:userId`,
  ATTENDANCE_DASHBOARD: `${API_BASE_URL}/attendance/dashboard/:studentId`,
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  TIMETABLE_BY_CLASS: `${API_BASE_URL}/timetable/class/:classId`,
 
  SUBJECTS: {
    GET_SUBJECTS_BY_SCHOOL: '/subjects-courses/by-school',
  },

  ATTENDANCE: {
    GET_STUDENT_ATTENDANCE: '/attendance/dashboard/:schoolId',
  },
};
