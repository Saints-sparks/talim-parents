import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "../Components/CustomToast";
import { API_BASE_URL } from "../services/auth.services";

const FETCH_COOLDOWN_MS = 2000;

export const useWebSocket = () => {
  const socketRef = useRef(null);
  const userIdRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const isFetchingRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus("disconnected");
  }, []);

  const connect = useCallback(
    (userId) => {
      if (!userId || socketRef.current?.connected || connectionStatus === "connecting") return;

      setConnectionStatus("connecting");
      userIdRef.current = userId;

      const socket = io(API_BASE_URL, {
        query: { userId },
        auth: { userId },
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: false,
      });

      socket.on("connect", () => {
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setConnectionStatus("connected");
      });

      socket.on("connect_error", () => {
        setIsConnected(false);
        setConnectionStatus("error");
      });

      socket.on("disconnect", (reason) => {
        setIsConnected(false);
        setConnectionStatus("disconnected");

        if (reason !== "io client disconnect" && reconnectAttemptsRef.current < 3) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(3000 * 2 ** (reconnectAttemptsRef.current - 1), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            disconnect();
            connect(userIdRef.current);
          }, delay);
        }
      });

      socket.on("error", (error) => {
        const message = error?.message || "Realtime chat error";
        toast.error(message);
      });

      socketRef.current = socket;
    },
    [connectionStatus, disconnect]
  );

  const joinChatRoom = useCallback((roomId) => {
    if (!socketRef.current?.connected) return toast.error("Not connected to chat service");
    socketRef.current.emit("join-chat-room", { roomId });
  }, []);

  const leaveChatRoom = useCallback((roomId) => {
    if (socketRef.current?.connected) socketRef.current.emit("leave-chat-room", { roomId });
  }, []);

  const sendChatMessage = useCallback((message) => {
    if (!socketRef.current?.connected) return toast.error("Not connected to chat service");
    socketRef.current.emit("send-chat-message", message);
  }, []);

  const markMessageAsRead = useCallback((messageId) => {
    if (socketRef.current?.connected && messageId) {
      socketRef.current.emit("mark-message-read", { messageId });
    }
  }, []);

  const fetchChatRooms = useCallback(() => {
    if (!socketRef.current?.connected) return;
    const now = Date.now();
    if (isFetchingRef.current || now - lastFetchTimeRef.current < FETCH_COOLDOWN_MS) return;

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    socketRef.current.emit("fetch-chat-rooms");
    setTimeout(() => {
      isFetchingRef.current = false;
    }, 1000);
  }, []);

  const fetchMessages = useCallback((data) => {
    if (socketRef.current?.connected) socketRef.current.emit("fetch-messages", data);
  }, []);

  const listen = useCallback((eventName, callback, afterEvent) => {
    if (!socketRef.current) return () => {};
    const handler = (data) => {
      afterEvent?.();
      callback(data);
    };
    socketRef.current.on(eventName, handler);
    return () => socketRef.current?.off(eventName, handler);
  }, []);

  useEffect(() => disconnect, [disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    joinChatRoom,
    leaveChatRoom,
    sendChatMessage,
    markMessageAsRead,
    fetchChatRooms,
    fetchMessages,
    onChatMessage: (callback) => listen("chat-message", callback),
    onChatRoomsUpdate: (callback) =>
      listen("chat-rooms-update", callback, () => {
        isFetchingRef.current = false;
      }),
    onChatRoomJoined: (callback) => listen("chat-room-joined", callback),
    onMessagesUpdate: (callback) => listen("messages-update", callback),
    onUnreadMessagesUpdate: (callback) => listen("unread-messages-update", callback),
  };
};
