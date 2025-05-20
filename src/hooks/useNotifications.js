import { useState, useEffect } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);

        // **Check localStorage first**
        const cachedNotifications = localStorage.getItem("notifications");
        if (cachedNotifications) {
          setNotifications(JSON.parse(cachedNotifications));
        }

        // **Fetch fresh notifications**
        const response = await axios.get(`${API_ENDPOINTS.NOTIFICATIONS}`);

        if (!response.data || !Array.isArray(response.data.data)) {
          throw new Error("Unexpected response format");
        }

        const formattedNotifications = response.data.data.map((notif) => ({
          id: notif._id,
          title: notif.title,
          message: notif.message,
          senderId: notif.senderId,
          createdAt: notif.createdAt,
          unread: notif.readBy.length === 0, // Assuming unread notifications have no readBy data
        }));

        // **Update state & cache**
        setNotifications(formattedNotifications);
        localStorage.setItem(
          "notifications",
          JSON.stringify(formattedNotifications)
        );
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setError("Failed to load notifications. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // **Optional: Refetch every 5 minutes**
    const interval = setInterval(fetchNotifications, 1000 * 60 * 5);

    return () => clearInterval(interval); // Cleanup
  }, []);

  return { notifications, loading, error };
};

export default useNotifications;
