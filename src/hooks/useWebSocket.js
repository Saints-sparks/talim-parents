import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../services/auth.services";

export const ACK_TIMEOUT_MS = 10000;

const isUnauthenticated = (payload) =>
  payload?.error?.code === "UNAUTHENTICATED" ||
  payload?.code === "UNAUTHENTICATED" ||
  payload?.data?.code === "UNAUTHENTICATED";

const ackError = (message, code, ack) => Object.assign(new Error(message), { code, ack });

/**
 * One Socket.IO connection for the signed-in user.
 *
 * Socket.IO's own reconnection does all retrying. The token is read on every
 * (re)connect, and a rejected handshake refreshes the token once before trying again.
 *
 * @param {string | undefined} userId - The signed-in user; no socket without one.
 * @param {() => Promise<string>} refreshAccessToken - The app's token refresh.
 */
export const useWebSocket = (userId, refreshAccessToken) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const refreshRef = useRef(refreshAccessToken);

  useEffect(() => {
    refreshRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  useEffect(() => {
    if (!userId) return undefined;

    const nextSocket = io(API_BASE_URL, {
      // A function, so every reconnect sends the current token.
      auth: (cb) => cb({ token: localStorage.getItem("access_token") }),
      // Legacy fallback the server still accepts while WS_LEGACY_QUERY_AUTH is on.
      query: { userId },
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10000,
    });

    // One refresh attempt per failed handshake streak. The server accepts the
    // transport first and rejects a bad token right after `connect`, so the
    // attempt only resets once a connection has stayed up for a few seconds.
    let refreshAttempted = false;
    let stableTimer = null;

    const retryWithFreshToken = async () => {
      if (refreshAttempted || !refreshRef.current) {
        setConnectionStatus("unauthenticated");
        return;
      }
      refreshAttempted = true;
      try {
        await refreshRef.current();
        nextSocket.connect();
      } catch {
        // Refresh failed: the session is over and the app's sign-in flow takes it from here.
        setConnectionStatus("unauthenticated");
      }
    };

    nextSocket.on("connect", () => {
      clearTimeout(stableTimer);
      stableTimer = setTimeout(() => {
        refreshAttempted = false;
      }, 5000);
      setIsConnected(true);
      setConnectionStatus("connected");
    });

    nextSocket.on("disconnect", () => {
      clearTimeout(stableTimer);
      setIsConnected(false);
      setConnectionStatus(nextSocket.active ? "reconnecting" : "disconnected");
    });

    nextSocket.on("connect_error", (error) => {
      setIsConnected(false);
      if (isUnauthenticated(error) || /unauthori[sz]ed|unauthenticated/i.test(error?.message || "")) {
        retryWithFreshToken();
      } else {
        setConnectionStatus("reconnecting");
      }
    });

    // The server rejects a bad token by emitting this and then disconnecting.
    nextSocket.on("exception", (payload) => {
      if (isUnauthenticated(payload)) retryWithFreshToken();
    });

    setConnectionStatus("connecting");
    setSocket(nextSocket);

    return () => {
      clearTimeout(stableTimer);
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus("disconnected");
    };
  }, [userId]);

  /** Subscribes to a server event on the current socket; returns the unsubscribe. */
  const on = useCallback(
    (eventName, handler) => {
      if (!socket) return () => {};
      socket.on(eventName, handler);
      return () => socket.off(eventName, handler);
    },
    [socket]
  );

  /** Emits with an acknowledgement. Rejects when offline, on timeout, or when the ack says `ok: false`. */
  const emitWithAck = useCallback(
    (eventName, payload = {}, timeout = ACK_TIMEOUT_MS) =>
      new Promise((resolve, reject) => {
        if (!socket?.connected) {
          reject(ackError("You're offline", "OFFLINE"));
          return;
        }
        socket.timeout(timeout).emit(eventName, payload, (err, ack) => {
          if (err) return reject(ackError("The server didn't respond in time", "TIMEOUT"));
          if (ack && ack.ok === false) {
            return reject(ackError(ack.error?.message || "Request failed", ack.error?.code, ack));
          }
          return resolve(ack);
        });
      }),
    [socket]
  );

  const emit = useCallback(
    (eventName, payload = {}) => {
      if (socket?.connected) socket.emit(eventName, payload);
    },
    [socket]
  );

  const joinChatRoom = useCallback((roomId) => emitWithAck("join-chat-room", { roomId }), [emitWithAck]);
  const leaveChatRoom = useCallback((roomId) => emit("leave-chat-room", { roomId }), [emit]);
  const sendChatMessage = useCallback((message) => emitWithAck("send-chat-message", message), [emitWithAck]);
  const fetchMessages = useCallback((data) => emitWithAck("fetch-messages", data), [emitWithAck]);
  const fetchChatRooms = useCallback(() => emitWithAck("fetch-chat-rooms", {}), [emitWithAck]);
  const fetchUnreadCount = useCallback(() => emit("fetch-unread-count", {}), [emit]);
  /** Marks a room read up to (and including) a message. Resolves with `{ roomId, upToMessageId, readAt, unreadCount }`. */
  const markRoomRead = useCallback(
    (roomId, upToMessageId) => emitWithAck("mark-room-read", { roomId, ...(upToMessageId ? { upToMessageId } : {}) }),
    [emitWithAck]
  );

  return useMemo(
    () => ({
      socket,
      isConnected,
      connectionStatus,
      on,
      emitWithAck,
      joinChatRoom,
      leaveChatRoom,
      sendChatMessage,
      markRoomRead,
      fetchChatRooms,
      fetchMessages,
      fetchUnreadCount,
    }),
    [
      socket,
      isConnected,
      connectionStatus,
      on,
      emitWithAck,
      joinChatRoom,
      leaveChatRoom,
      sendChatMessage,
      markRoomRead,
      fetchChatRooms,
      fetchMessages,
      fetchUnreadCount,
    ]
  );
};
