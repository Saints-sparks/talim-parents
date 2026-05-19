/* eslint-disable react/prop-types, react-hooks/exhaustive-deps, react-refresh/only-export-components */
import { createContext, useContext, useEffect } from "react";
import { useAuth } from "../services/auth.services";
import { useWebSocket } from "../hooks/useWebSocket";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated, user, parentId } = useAuth();
  const webSocket = useWebSocket();

  useEffect(() => {
    const userId = user?.userId || user?._id || user?.id || parentId;

    if (
      isAuthenticated &&
      userId &&
      !webSocket.isConnected &&
      webSocket.connectionStatus !== "connecting"
    ) {
      webSocket.connect(userId);
    } else if (!isAuthenticated && webSocket.isConnected) {
      webSocket.disconnect();
    }
  }, [
    isAuthenticated,
    user?.userId,
    user?._id,
    user?.id,
    parentId,
    webSocket.isConnected,
    webSocket.connectionStatus,
  ]);

  return <WebSocketContext.Provider value={webSocket}>{children}</WebSocketContext.Provider>;
};

export const useWebSocketContextSafe = () => useContext(WebSocketContext);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocketContext must be used within WebSocketProvider");
  return context;
};
