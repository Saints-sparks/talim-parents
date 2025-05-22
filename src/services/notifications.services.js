// services/notification.service.js


export const notificationService = {
  getNotifications: async (accessToken, page = 1, limit = 10) => {
    try {
      const url = new URL(API_ENDPOINTS.NOTIFICATIONS);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Network error:", error);
      throw error;
    }
  },
};
