import { createContext, useContext, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../services/auth.services';
import { useWebSocket } from '../hooks/useWebSocket';

/** Where the socket is in its life. */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unauthenticated';

/** A server-pushed event handler. */
export type SocketHandler<T = unknown> = (payload: T) => void;

/**
 * What the socket hook hands to the rest of the app. `useWebSocket` is still
 * JavaScript, so its shape is written down here once and every consumer
 * imports it from this file.
 */
export interface WebSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  /**
   * Subscribes to a server event on the live socket.
   *
   * @returns An unsubscribe function.
   */
  on: <T = unknown>(eventName: string, handler: SocketHandler<T>) => () => void;
  emitWithAck: (eventName: string, payload?: unknown, timeout?: number) => Promise<unknown>;
  joinChatRoom: (roomId: string) => Promise<unknown>;
  leaveChatRoom: (roomId: string) => void;
  sendChatMessage: (message: unknown) => Promise<unknown>;
  markRoomRead: (roomId: string, upToMessageId?: string) => Promise<unknown>;
  fetchChatRooms: () => Promise<unknown>;
  fetchMessages: (data: unknown) => Promise<unknown>;
  fetchUnreadCount: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

/**
 * Opens the single Socket.IO connection while a parent is signed in and shares
 * it with the whole app.
 *
 * @param props - Component props.
 * @param props.children - The application tree.
 * @returns The provider element.
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, parentId, refreshSession } = useAuth();
  const userId = isAuthenticated ? (user?.userId ?? user?._id ?? user?.id ?? parentId) : undefined;
  // A failed refresh throws, which the hook reads as "the session is over".
  const refreshToken = async (): Promise<string> => {
    const token = await refreshSession();
    if (!token) throw new Error('The session could not be refreshed.');
    return token;
  };
  // The hook owns the socket: created on sign-in, closed on sign-out.
  const webSocket = useWebSocket(userId, refreshToken) as unknown as WebSocketContextValue;

  return <WebSocketContext.Provider value={webSocket}>{children}</WebSocketContext.Provider>;
}

/**
 * The socket, or `null` when called outside the provider (tests, isolated widgets).
 *
 * @returns The socket context value, if any.
 */
export const useWebSocketContextSafe = (): WebSocketContextValue | null => useContext(WebSocketContext);

/**
 * The socket.
 *
 * @returns The socket context value.
 * @throws When called outside `WebSocketProvider`.
 */
export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocketContext must be used within WebSocketProvider');
  return context;
}
