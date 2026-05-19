// parent.services.js
import axios from 'axios';
import { API_BASE_URL } from './auth.services';

const getAuthConfig = () => {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) throw new Error('No access token found');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
};

export const normalizeParentChild = (child = {}) => {
  const firstName = child.firstName || child.userId?.firstName || "";
  const lastName = child.lastName || child.userId?.lastName || "";
  const className = child.className || child.classId?.name || child.classId?.className || "Class not assigned";
  const grade = child.grade || child.gradeLevel || child.classId?.gradeLevel || "";
  const childId = child.childId || child._id || child.studentId || child.userId?._id;

  return {
    ...child,
    childId,
    _id: child._id || childId,
    firstName,
    lastName,
    avatar: child.avatar || child.userId?.userAvatar,
    className,
    grade,
    classId:
      child.classId && typeof child.classId === "object"
        ? child.classId
        : { _id: child.classId, name: className, gradeLevel: grade },
    schoolName: child.schoolName || child.schoolId?.name || "School",
    userId: child.userId || {
      _id: child.userId?._id || child.childUserId || childId,
      firstName,
      lastName,
      userAvatar: child.avatar,
    },
    isActive: child.isActive !== false,
  };
};

export const getStudentsByParent = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/parents/me/children`, getAuthConfig());
    const children = Array.isArray(response.data) ? response.data : response.data?.children || [];
    const normalized = children.map(normalizeParentChild);
    
    localStorage.setItem('parent_students', JSON.stringify(normalized));
    
    return normalized;
    
  } catch (error) {
    console.error('Failed to fetch students by parent:', error);
    throw error;
  }
};

export const getParentChildren = getStudentsByParent;

export const getParentChildrenOverview = async () => {
  const response = await axios.get(`${API_BASE_URL}/parents/me/children/overview`, getAuthConfig());
  return response.data;
};

export const setDefaultChild = async (childId) => {
  const response = await axios.patch(
    `${API_BASE_URL}/parents/me/default-child/${childId}`,
    {},
    getAuthConfig()
  );
  return response.data;
};

export const getChildTimetable = async (childId, params = {}) => {
  const response = await axios.get(
    `${API_BASE_URL}/parents/me/children/${childId}/timetable`,
    {
      ...getAuthConfig(),
      params,
    }
  );
  return response.data;
};

export const downloadChildTimetable = async (childId) => {
  const response = await axios.get(
    `${API_BASE_URL}/parents/me/children/${childId}/timetable/download`,
    {
      ...getAuthConfig(),
      responseType: "blob",
    }
  );
  return response.data;
};

export const getParentChildrenUpdates = async () => {
  const response = await axios.get(`${API_BASE_URL}/parents/me/children/updates`, getAuthConfig());
  return response.data;
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
