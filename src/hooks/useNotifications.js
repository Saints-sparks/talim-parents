import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../services/auth.services";
import { notificationService } from "../services/notification.services";

const DEFAULT_COUNTS = {
  all: 0,
  unread: 0,
  announcement: 0,
  attendance: 0,
  academics: 0,
  grading: 0,
  resources: 0,
  messages: 0,
  account: 0,
  payments: 0,
  event: 0,
  other: 0,
};

const getUserId = (user) => user?.userId || user?._id || user?.id || "";

const getNotificationItems = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.announcements)) return payload.announcements;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getPersonName = (person, fallback = "School Admin") => {
  if (!person || typeof person === "string") return fallback;
  if (person.name) return person.name;
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return name || person.email || fallback;
};

const getSenderName = (item, sender, fallback) =>
  item.senderName ||
  item.senderDisplay?.name ||
  getPersonName(sender, fallback);

const getSenderEmail = (item, sender) =>
  item.senderEmail || item.senderDisplay?.email || sender?.email || "";

const hasReadByUser = (readBy, userId) => {
  if (!Array.isArray(readBy)) return false;
  return readBy.some((reader) => getUserId(reader) === userId || reader === userId);
};

const textBlob = (item) =>
  [
    item?.type,
    item?.title,
    item?.message,
    item?.content,
    item?.body,
    item?.category,
    item?.metadata?.category,
    item?.metadata?.module,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const inferCategory = (item, fallback = "other") => {
  const text = textBlob(item);
  if (text.includes("attendance") || text.includes("absence") || text.includes("absent")) return "attendance";
  if (text.includes("fee") || text.includes("payment") || text.includes("invoice")) return "payments";
  if (text.includes("grade") || text.includes("result") || text.includes("report")) return "grading";
  if (text.includes("assignment") || text.includes("academic") || text.includes("curriculum")) return "academics";
  if (text.includes("resource") || text.includes("material") || text.includes("pdf")) return "resources";
  if (text.includes("message") || text.includes("chat")) return "messages";
  if (text.includes("event") || text.includes("exhibition") || text.includes("meeting")) return "event";
  if (text.includes("account") || text.includes("password") || text.includes("security")) return "account";
  if (text.includes("announcement")) return "announcement";
  return fallback;
};

const toAttachments = (item) => [
  ...(Array.isArray(item?.attachments) ? item.attachments : []),
  ...(item?.attachment ? [item.attachment] : []),
].filter(Boolean);

const buildRelated = (item) => {
  const metadata = item?.metadata || {};
  const related = [];
  if (metadata.studentName) related.push({ label: metadata.studentName });
  if (metadata.childName) related.push({ label: metadata.childName });
  if (metadata.className) related.push({ label: metadata.className });
  if (metadata.courseName) related.push({ label: metadata.courseName });
  if (metadata.href || metadata.url) {
    related.push({ label: "Open related item", href: metadata.href || metadata.url });
  }
  return related;
};

const isRead = (item, userId) => {
  if (typeof item.isRead === "boolean") return item.isRead;
  if (typeof item.read === "boolean") return item.read;
  return hasReadByUser(item.readBy, userId);
};

const normalizeAnnouncement = (item, userId) => {
  const sender = item.senderId || item.createdBy;
  const schoolName =
    item.schoolName ||
    item.school?.name ||
    item.schoolId?.name ||
    item.metadata?.schoolName ||
    "School Admin";
  const rawId = item._id || item.id;

  return {
    id: `announcement:${rawId}`,
    rawId,
    endpoint: "announcement",
    sourceLabel: item.sourceLabel || "Announcement",
    category: inferCategory(item, "announcement"),
    title: item.title || "School announcement",
    message: item.message || item.content || "No message provided.",
    createdAt: item.publishedAt || item.createdAt || item.scheduledFor || new Date().toISOString(),
    unread: !isRead(item, userId),
    isRead: isRead(item, userId),
    senderName: getSenderName(item, sender, schoolName),
    senderEmail: getSenderEmail(item, sender),
    attachments: toAttachments(item),
    related: buildRelated(item),
    metadata: item.metadata || {},
  };
};

const normalizeNotification = (item, userId) => {
  const sender = item.senderId || item.sender || item.createdBy;
  const rawId = item._id || item.id;
  const source = item.source || item.metadata?.source;
  const sourceLabel =
    item.sourceLabel ||
    (source === "talim" ? "Talim Alert" : source === "school" ? "School Notification" : "Notification");

  return {
    id: `notification:${rawId}`,
    rawId,
    endpoint: "notification",
    sourceLabel,
    category: inferCategory(item, "other"),
    title: item.title || "Notification",
    message: item.message || item.body || item.content || "No message provided.",
    createdAt: item.createdAt || new Date().toISOString(),
    unread: !isRead(item, userId),
    isRead: isRead(item, userId),
    senderName: getSenderName(item, sender, sourceLabel),
    senderEmail: getSenderEmail(item, sender),
    attachments: toAttachments(item),
    related: buildRelated(item),
    metadata: item.metadata || {},
  };
};

const isAnnouncementDuplicate = (item) => {
  const source = item.source || item.metadata?.source;
  const category = item.category || item.metadata?.category;
  const type = String(item.type || "").toLowerCase();
  return source === "school" && (category === "announcement" || type.includes("announcement") || item.metadata?.announcementId);
};

const sortNewest = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const useNotifications = () => {
  const { authToken, isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = getUserId(user);
  const cacheKey = userId ? `parent-notifications:${userId}` : "";

  const persistNotifications = useCallback(
    (nextNotifications) => {
      setNotifications(nextNotifications);
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(nextNotifications));
      }
    },
    [cacheKey]
  );

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !authToken || !userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        setNotifications(JSON.parse(cached));
      }

      const [announcementsResponse, notificationsResponse] = await Promise.allSettled([
        notificationService.getAnnouncements(authToken, userId, 1, 50),
        notificationService.getNotifications(authToken, {
          recipientId: userId,
          page: 1,
          limit: 50,
        }),
      ]);

      const normalized = [];

      if (announcementsResponse.status === "fulfilled") {
        normalized.push(...getNotificationItems(announcementsResponse.value).map((item) => normalizeAnnouncement(item, userId)));
      }

      if (notificationsResponse.status === "fulfilled") {
        normalized.push(
          ...getNotificationItems(notificationsResponse.value)
            .filter((item) => !isAnnouncementDuplicate(item))
            .map((item) => normalizeNotification(item, userId))
        );
      }

      if (announcementsResponse.status === "rejected" && notificationsResponse.status === "rejected") {
        throw new Error("Failed to load notifications.");
      }

      persistNotifications(sortNewest(normalized));
    } catch (fetchError) {
      console.error("Failed to fetch notifications:", fetchError);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [authToken, cacheKey, isAuthenticated, persistNotifications, userId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 1000 * 60 * 5);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId) => {
      const target = notifications.find((notification) => notification.id === notificationId);
      if (!target || !target.unread || !authToken || !userId) return;

      const nextNotifications = notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, unread: false, isRead: true }
          : notification
      );
      persistNotifications(nextNotifications);

      try {
        if (target.endpoint === "announcement") {
          await notificationService.markAnnouncementAsRead(authToken, target.rawId, userId);
        } else {
          await notificationService.markNotificationAsRead(authToken, target.rawId, userId);
        }
        await fetchNotifications();
      } catch (markError) {
        console.error("Failed to mark notification as read:", markError);
        persistNotifications(notifications);
        setError("Failed to mark notification as read. Please try again.");
      }
    },
    [authToken, fetchNotifications, notifications, persistNotifications, userId]
  );

  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter((notification) => notification.unread);
    if (!unreadNotifications.length || !authToken || !userId) return;

    persistNotifications(notifications.map((notification) => ({ ...notification, unread: false, isRead: true })));

    const results = await Promise.allSettled(
      unreadNotifications.map((notification) =>
        notification.endpoint === "announcement"
          ? notificationService.markAnnouncementAsRead(authToken, notification.rawId, userId)
          : notificationService.markNotificationAsRead(authToken, notification.rawId, userId)
      )
    );

    if (results.some((result) => result.status === "rejected")) {
      persistNotifications(notifications);
      setError("Some notifications could not be marked as read. Please try again.");
      return;
    }

    await fetchNotifications();
  }, [authToken, fetchNotifications, notifications, persistNotifications, userId]);

  const deleteNotification = useCallback(
    (notificationId) => {
      persistNotifications(notifications.filter((notification) => notification.id !== notificationId));
    },
    [notifications, persistNotifications]
  );

  const counts = useMemo(() => {
    return notifications.reduce(
      (acc, notification) => {
        acc.all += 1;
        if (notification.unread) acc.unread += 1;
        acc[notification.category] = (acc[notification.category] || 0) + 1;
        return acc;
      },
      { ...DEFAULT_COUNTS }
    );
  }, [notifications]);

  return {
    notifications,
    loading,
    error,
    counts,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};

export default useNotifications;
