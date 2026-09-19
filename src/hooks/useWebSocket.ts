import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../lib/config';
import type {
  AckError,
  AckFailure,
  ChatServerEvents,
  ConnectionStatus,
  FetchMessagesAck,
  GenericAck,
  MarkReadAck,
  SendAck,
} from '../types/chat';

/** How long an emit waits for the server's acknowledgement, in milliseconds. */
export const ACK_TIMEOUT_MS = 10000;

/** The payload type of a server event: known chat events are typed, anything else is `unknown`. */
export type EventPayload<E extends string> = E extends keyof ChatServerEvents ? ChatServerEvents[E] : unknown;

/** What `useWebSocket` returns: the socket, its state and the chat emit helpers. */
export interface WebSocketApi {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  /** Subscribes to a server event on the current socket; returns the unsubscribe. */
  on: <E extends string>(eventName: E, handler: (payload: EventPayload<E>) => void) => () => void;
  /** Emits with an acknowledgement. Rejects when offline, on timeout, or when the ack says `ok: false`. */
  emitWithAck: <T = GenericAck>(eventName: string, payload?: unknown, timeout?: number) => Promise<T>;
  joinChatRoom: (roomId: string) => Promise<GenericAck>;
  leaveChatRoom: (roomId: string) => void;
  sendChatMessage: (message: unknown) => Promise<SendAck>;
  /** Marks a room read up to (and including) a message. */
  markRoomRead: (roomId: string, upToMessageId?: string) => Promise<MarkReadAck>;
  fetchChatRooms: () => Promise<GenericAck>;
  fetchMessages: (data: unknown) => Promise<FetchMessagesAck>;
  fetchUnreadCount: () => void;
}

const isUnauthenticated = (payload: unknown): boolean => {
  const body = payload as { error?: { code?: string }; code?: string; data?: { code?: string } } | null | undefined;
  return (
    body?.error?.code === 'UNAUTHENTICATED' ||
    body?.code === 'UNAUTHENTICATED' ||
    body?.data?.code === 'UNAUTHENTICATED'
  );
};

const ackError = (message: string, code?: string, ack?: AckFailure): AckError =>
  Object.assign(new Error(message), { code, ack });

/**
 * The error code of a rejected socket call: `OFFLINE`, `TIMEOUT`, or the server's own.
 *
 * @param error - What a socket call rejected with.
 * @returns Its `code`, if it carries one.
 */
export const ackErrorCode = (error: unknown): string | undefined => (error as AckError | null | undefined)?.code;

/**
 * One Socket.IO connection for the signed-in user.
 *
 * Socket.IO's own reconnection does all retrying. The token is read on every
 * (re)connect, and a rejected handshake refreshes the token once before trying again.
 *
 * @param userId - The signed-in user; no socket without one.
 * @param refreshAccessToken - The app's token refresh.
 * @returns The socket, its connection state and the chat emit helpers.
 */
export const useWebSocket = (
  userId: string | undefined,
  refreshAccessToken: () => Promise<unknown>,
): WebSocketApi => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const refreshRef = useRef(refreshAccessToken);

  useEffect(() => {
    refreshRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  useEffect(() => {
    if (!userId) return undefined;

    const nextSocket = io(API_BASE_URL, {
      // A function, so every reconnect sends the current token.
      auth: (cb) => cb({ token: localStorage.getItem('access_token') }),
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10000,
    });

    // One refresh attempt per failed handshake streak. The server accepts the
    // transport first and rejects a bad token right after `connect`, so the
    // attempt only resets once a connection has stayed up for a few seconds.
    let refreshAttempted = false;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;

    const retryWithFreshToken = async () => {
      if (refreshAttempted || !refreshRef.current) {
        setConnectionStatus('unauthenticated');
        return;
      }
      refreshAttempted = true;
      try {
        await refreshRef.current();
        nextSocket.connect();
      } catch {
        // Refresh failed: the session is over and the app's sign-in flow takes it from here.
        setConnectionStatus('unauthenticated');
      }
    };

    nextSocket.on('connect', () => {
      clearTimeout(stableTimer);
      stableTimer = setTimeout(() => {
        refreshAttempted = false;
      }, 5000);
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    nextSocket.on('disconnect', () => {
      clearTimeout(stableTimer);
      setIsConnected(false);
      setConnectionStatus(nextSocket.active ? 'reconnecting' : 'disconnected');
    });

    nextSocket.on('connect_error', (error: Error) => {
      setIsConnected(false);
      if (isUnauthenticated(error) || /unauthori[sz]ed|unauthenticated/i.test(error?.message || '')) {
        void retryWithFreshToken();
      } else {
        setConnectionStatus('reconnecting');
      }
    });

    // The server rejects a bad token by emitting this and then disconnecting.
    nextSocket.on('exception', (payload: unknown) => {
      if (isUnauthenticated(payload)) void retryWithFreshToken();
    });

    setConnectionStatus('connecting');
    setSocket(nextSocket);

    return () => {
      clearTimeout(stableTimer);
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [userId]);

  const on = useCallback(
    <E extends string>(eventName: E, handler: (payload: EventPayload<E>) => void) => {
      if (!socket) return () => {};
      // Socket.IO's listener type is untyped for custom events; the payload type is ours.
      const event: string = eventName;
      const listener = handler as (...args: unknown[]) => void;
      socket.on(event, listener);
      return () => {
        socket.off(event, listener);
      };
    },
    [socket],
  );

  const emitWithAck = useCallback(
    <T = GenericAck>(eventName: string, payload: unknown = {}, timeout = ACK_TIMEOUT_MS) =>
      new Promise<T>((resolve, reject) => {
        if (!socket?.connected) {
          reject(ackError("You're offline", 'OFFLINE'));
          return;
        }
        socket.timeout(timeout).emit(eventName, payload, (err: Error | null, ack: T | AckFailure | undefined) => {
          if (err) return reject(ackError("The server didn't respond in time", 'TIMEOUT'));
          if (ack && (ack as AckFailure).ok === false) {
            const failure = ack as AckFailure;
            return reject(ackError(failure.error?.message || 'Request failed', failure.error?.code, failure));
          }
          return resolve(ack as T);
        });
      }),
    [socket],
  );

  const emit = useCallback(
    (eventName: string, payload: unknown = {}) => {
      if (socket?.connected) socket.emit(eventName, payload);
    },
    [socket],
  );

  const joinChatRoom = useCallback((roomId: string) => emitWithAck('join-chat-room', { roomId }), [emitWithAck]);
  const leaveChatRoom = useCallback((roomId: string) => emit('leave-chat-room', { roomId }), [emit]);
  const sendChatMessage = useCallback(
    (message: unknown) => emitWithAck<SendAck>('send-chat-message', message),
    [emitWithAck],
  );
  const fetchMessages = useCallback(
    (data: unknown) => emitWithAck<FetchMessagesAck>('fetch-messages', data),
    [emitWithAck],
  );
  const fetchChatRooms = useCallback(() => emitWithAck('fetch-chat-rooms', {}), [emitWithAck]);
  const fetchUnreadCount = useCallback(() => emit('fetch-unread-count', {}), [emit]);
  const markRoomRead = useCallback(
    (roomId: string, upToMessageId?: string) =>
      emitWithAck<MarkReadAck>('mark-room-read', { roomId, ...(upToMessageId ? { upToMessageId } : {}) }),
    [emitWithAck],
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
    ],
  );
};
