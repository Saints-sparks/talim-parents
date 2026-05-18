// parent.services.js
import axios from 'axios';
import { API_BASE_URL } from './auth.services';

export const getStudentsByParent = async () => {
  try {
    const accessToken = localStorage.getItem('access_token');
    const parentId = localStorage.getItem('parent_id');

    if (!accessToken) throw new Error('No access token found');
    if (!parentId) throw new Error('Parent ID not found');

    const response = await axios.get(
      `${API_BASE_URL}/students/by-parent/${parentId}/all`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          page: 1,
          limit: 50,
        },
      }
    );

    console.log('getStudentsByParent response:', response.data);
    
    // Store students in localStorage
    localStorage.setItem('parent_students', JSON.stringify(response.data));
    
    return response.data;
    
  } catch (error) {
    console.error('Failed to fetch students by parent:', error);
    throw error;
  }
};

export const updateParentProfile = async (data) => {
  try {
    const accessToken = localStorage.getItem('access_token');
    const parentId = localStorage.getItem('parent_id');

    if (!accessToken) throw new Error('No access token found');
    if (!parentId) throw new Error('Parent ID not found');

    const response = await axios.patch(
      `${API_BASE_URL}/auth/profile/update/${parentId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to update parent profile:', error);
    throw error;
  }
};

export const getParentByUserId = async (parentId) => {
  try {
    const accessToken = localStorage.getItem('access_token');
    const resolvedParentId = parentId || localStorage.getItem('parent_id');

    if (!accessToken) throw new Error('No access token found');
    if (!resolvedParentId) throw new Error('Parent ID not found');

    const response = await axios.get(`${API_BASE_URL}/parents/user/${resolvedParentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to fetch parent profile:', error);
    throw error;
  }
};
