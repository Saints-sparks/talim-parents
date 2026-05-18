import axios from "axios";
import { API_BASE_URL } from "./auth.services";

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const request = async (url, accessToken, options = {}) => {
  const response = await axios({
    url,
    method: options.method || "GET",
    data: options.body,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  return response.data;
};

export const notificationService = {
  getNotifications: (accessToken, params = {}) =>
    request(
      `${API_BASE_URL}/notifications${buildQuery({
        page: 1,
        limit: 50,
        ...params,
      })}`,
      accessToken
    ),

  getAnnouncements: (accessToken, userId, page = 1, limit = 50) =>
    request(
      `${API_BASE_URL}/notifications/announcements/receiver/${userId}${buildQuery({
        page,
        limit,
      })}`,
      accessToken
    ),

  markNotificationAsRead: (accessToken, notificationId, userId) =>
    request(`${API_BASE_URL}/notifications/${notificationId}/read`, accessToken, {
      method: "PUT",
      body: { userId },
    }),

  markAnnouncementAsRead: (accessToken, announcementId, userId) =>
    request(
      `${API_BASE_URL}/notifications/announcements/${announcementId}/read`,
      accessToken,
      {
        method: "PUT",
        body: { userId },
      }
    ),
};
