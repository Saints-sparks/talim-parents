/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "../Components/CustomToast";
import { useAuth } from "../services/auth.services";
import { useWebSocketContextSafe } from "./WebSocketContext";

const ChatAlertsContext = createContext(null);

const TITLE_PREFIX = /^\(\d+\+?\)\s*/;

/** True when the user is looking at this room on the Messages page. */
export const isRoomOpen = (pathname, openRoomId, roomId) =>
  pathname === "/messages" && Boolean(roomId) && openRoomId === roomId;

/** A same-origin URL from a notification, as a router path. */
const toRouterPath = (url) => {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

/**
 * App-wide chat signals, mounted once inside the router: the unread badge and
 * tab title, a toast for messages in rooms that aren't open, a toast when
 * someone removes the user from a group, in-app notification toasts, and
 * routing for service-worker notification clicks.
 */
export const ChatAlertsProvider = ({ children }) => {
  const { user, parentId } = useAuth();
  const currentUserId = user?.userId || user?._id || user?.id || parentId;
  const webSocket = useWebSocketContextSafe();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [openRoomId, setOpenRoomIdState] = useState(null);
  const openRoomIdRef = useRef(null);
  const pathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  // roomId -> group name, from whatever room data passes by, for the "You were removed" toast.
  const roomNamesRef = useRef(new Map());

  pathnameRef.current = location.pathname;
  navigateRef.current = navigate;

  const setOpenRoomId = useCallback((roomId) => {
    openRoomIdRef.current = roomId || null;
    setOpenRoomIdState(roomId || null);
  }, []);

  useEffect(() => {
    if (!currentUserId) setUnreadCount(0);
  }, [currentUserId]);

  useEffect(() => {
    if (webSocket?.isConnected) webSocket.fetchUnreadCount();
  }, [webSocket?.isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!webSocket?.on) return undefined;

    const rememberRoomName = (room) => {
      const roomId = room?._id || room?.roomId;
      if (roomId && room.name) roomNamesRef.current.set(String(roomId), room.name);
    };

    const unsubscribers = [
      webSocket.on("chat-rooms-update", (data) => data?.rooms?.forEach?.(rememberRoomName)),
      webSocket.on("chat-room-joined", (data) => rememberRoomName(data?.room)),
      webSocket.on("room-updated", (data) => rememberRoomName({ _id: data?.roomId, name: data?.name })),

      // Removed by someone else (leaving a group yourself has `by` = you): tell the user wherever they are.
      webSocket.on("participants-changed", (data) => {
        const roomId = data?.roomId && String(data.roomId);
        if (!roomId || !currentUserId) return;
        const me = String(currentUserId);
        if (!(data.removed || []).some((id) => String(id) === me)) return;
        if (data.by && String(data.by) === me) return;
        const name = roomNamesRef.current.get(roomId);
        toast.info(name ? `You were removed from ${name}` : "You were removed from a group");
      }),

      webSocket.on("unread-messages-update", (data) => {
        if (data?.userId && currentUserId && String(data.userId) !== String(currentUserId)) return;
        if (typeof data?.unreadCount === "number") setUnreadCount(Math.max(0, data.unreadCount));
      }),

      webSocket.on("chat-room-activity", (data) => {
        const roomId = data?.roomId;
        const lastMessage = data?.lastMessage;
        if (!roomId || !lastMessage) return;
        if (String(lastMessage.senderId) === String(currentUserId)) return;
        if (isRoomOpen(pathnameRef.current, openRoomIdRef.current, roomId)) return;

        // The server follows with the exact total; this keeps the badge instant.
        setUnreadCount((count) => count + 1);
        const preview = lastMessage.preview || "New message";
        toast.info(lastMessage.senderName ? `${lastMessage.senderName}: ${preview}` : preview, {
          title: "New message",
          onClick: () => navigateRef.current(`/messages?room=${encodeURIComponent(roomId)}`),
        });
      }),

      webSocket.on("notification", (notification) => {
        // Chat alerts come from chat-room-activity.
        if (!notification || notification.type === "chat_message") return;
        const message = notification.body || notification.message;
        if (message || notification.title) {
          toast.info(message || notification.title, message ? notification.title : undefined);
        }
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [webSocket?.on, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const baseTitle = document.title.replace(TITLE_PREFIX, "");
    document.title = unreadCount > 0 ? `(${unreadCount > 99 ? "99+" : unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);

  // A notification clicked while a tab is open: the service worker focuses it and asks it to route.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const handleMessage = (event) => {
      const { type, url } = event.data || {};
      if (type !== "OPEN_URL" && type !== "NOTIFICATION_CLICK") return;
      const path = url && toRouterPath(url);
      if (path) navigateRef.current(path);
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const value = useMemo(
    () => ({ unreadCount, openRoomId, setOpenRoomId }),
    [unreadCount, openRoomId, setOpenRoomId]
  );

  return <ChatAlertsContext.Provider value={value}>{children}</ChatAlertsContext.Provider>;
};

export const useChatAlerts = () =>
  useContext(ChatAlertsContext) || { unreadCount: 0, openRoomId: null, setOpenRoomId: () => {} };
