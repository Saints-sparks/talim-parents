export const API_BASE_URL = 'http://localhost:5000'


export const API_URLS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    INTROSPECT: '/auth/introspect',
    LOGOUT: '/auth/logout'
  },
  SCHOOL: {
    GET_CLASS: '/classes',
    GET_CLASSES: '/classes',
    CREATE_CLASS: '/classes',
    EDIT_CLASS: '/classes'
  },

  STUDENTS: {
    GET_STUDENT: '/students',
    GET_STUDENTS: '/users/students',
    CREATE_STUDENT: '/users/students',
    UPDATE_STUDENT: '/users/students/:studentId',
    DELETE_STUDENT: '/users/students/:studentId',
    GET_STUDENTS_BY_CLASS: '/students/by-class/:classId',
  },
 
  
  NOTIFICATION: {
    GET_NOTIFICATIONS: '/notifications',
    GET_ANNOUNCEMENTS_BY_SENDER: '/notifications/announcements/sender/:senderId?page=:page&limit=:limit',
  },


  LEAVEREQUESTS: {
    GET_LEAVE_REQUESTS: '/leave-requests',
    GET_ANNOUNCEMENTS_BY_SENDER: '/notifications/announcements/sender/:senderId?page=:page&limit=:limit',
  },

  

};



export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  LOGIN: `${API_BASE_URL}${API_URLS.AUTH.LOGIN}`,
  INTROSPECT: `${API_BASE_URL}${API_URLS.AUTH.INTROSPECT}`,
  LOGOUT: `${API_BASE_URL}${API_URLS.AUTH.LOGOUT}`,
  REGISTER: `${API_BASE_URL}${API_URLS.AUTH.REGISTER}`,
 
 
  NOTIFICATIONS: `${API_BASE_URL}${API_URLS.NOTIFICATION.GET_NOTIFICATIONS}`,
  } 