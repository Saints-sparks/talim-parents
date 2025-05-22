"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";
import { notificationService } from "../services/notifications.services";

export const useNotifications = (page = 1, limit = 10) => {
  const { accessToken, isAuthenticated } = useAuthContext();
  const [notifications, setNotifications] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!isAuthenticated || !accessToken) {
      toast.error("User not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications(accessToken, page, limit);
      setNotifications(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load notifications";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [accessToken, isAuthenticated, page, limit]);

  return { notifications, isLoading };
};
