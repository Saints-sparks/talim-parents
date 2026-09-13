/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { createContext, useContext } from "react";
import { useAuth } from "../services/auth.services";
import { useWebSocket } from "../hooks/useWebSocket";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated, user, parentId, refreshTokenHandler } = useAuth();
  const userId = isAuthenticated ? user?.userId || user?._id || user?.id || parentId : undefined;
  // The hook owns the single socket: created when a user signs in, closed when they sign out.
  const webSocket = useWebSocket(userId, refreshTokenHandler);

  return <WebSocketContext.Provider value={webSocket}>{children}</WebSocketContext.Provider>;
};

export const useWebSocketContextSafe = () => useContext(WebSocketContext);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocketContext must be used within WebSocketProvider");
  return context;
};
