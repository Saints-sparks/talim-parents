import { API_ENDPOINTS } from '../lib/constants';

export const authService = {
  login: async (credentials) => {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();

    // Save the access token to localStorage (or use cookies if preferred)
    localStorage.setItem('access_token', data.access_token);  // Save token
    localStorage.setItem('refresh_token', data.refresh_token);  // Optionally save refresh token
    
    return data;  // Return the data containing tokens and user info
  },

  introspect: async (token) => {
    const response = await fetch(API_ENDPOINTS.INTROSPECT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Token introspection failed');
    }

    return response.json();
  },

  getAccessToken: () => {
    return localStorage.getItem('access_token'); // Retrieve access token from localStorage
  },

  logout: () => {
    // Clear the stored tokens on logout
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};
