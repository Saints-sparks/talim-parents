/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "../Components/CustomToast";
import { useWebSocketContextSafe } from "../contexts/WebSocketContext";
import { useAuth } from "../services/auth.services";
import { generateColorFromString, getUserInitials } from "../lib/colorUtils";

const asId = (value) => value?._id || value?.userId || value?.id || value?.toString?.() || "";

const getParticipantName = (participant) =>
  [participant?.firstName, participant?.lastName].filter(Boolean).join(" ") ||
  participant?.name ||
  participant?.email ||
  "User";

const normalizeAttachment = (attachment) => {
  if (!attachment) return null;
  if (typeof attachment === "string") {
    return { url: attachment, name: attachment.split("/").pop() || "Attachment", type: "file" };
  }
  return {
    ...attachment,
    url: attachment.url || attachment.secure_url || attachment.fileURL,
    name: attachment.name || attachment.originalName || attachment.fileName || "Attachment",
    mimeType: attachment.mimeType || attachment.mimetype,
    type: attachment.type || "file",
  };
};

export const normalizeMessage = (message, currentUserId, fallbackRoomId) => {
  const attachments = (message?.attachments || [])
    .map(normalizeAttachment)
    .filter((attachment) => attachment?.url);
  const primaryAttachment = attachments[0];

  return {
    id: message?._id || message?.id || `${message?.roomId || fallbackRoomId}-${message?.timestamp}`,
    _id: message?._id || message?.id,
    senderId: asId(message?.senderId),
    senderName: message?.senderName || getParticipantName(message?.senderId),
    sender: asId(message?.senderId) === currentUserId ? "user" : "other",
    senderType: asId(message?.senderId) === currentUserId ? "self" : "other",
    text: message?.content || message?.text || "",
    content: message?.content || message?.text || "",
    roomId: message?.roomId || message?.chatRoomId || fallbackRoomId,
    type: attachments.length ? "file" : message?.type || "text",
    messageType: message?.type || (primaryAttachment?.type === "audio" ? "voice" : "text"),
    fileURL: primaryAttachment?.url,
    fileType: primaryAttachment?.mimeType || primaryAttachment?.type || "",
    fileName: primaryAttachment?.name,
    attachments,
    duration: message?.duration || primaryAttachment?.duration,
    timestamp: message?.timestamp
      ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
          new Date(message.timestamp)
        )
      : "",
    rawTimestamp: message?.timestamp || message?.createdAt,
    readBy: message?.readBy || [],
    isRead: Boolean(message?.isRead),
    userAvatar: message?.senderAvatar || message?.userAvatar,
  };
};

export const useRealtimeChat = () => {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?._id || user?.id;
  const webSocket = useWebSocketContextSafe();
  const selectedRoomIdRef = useRef(null);
  const mountedRef = useRef(true);

  const [chatRooms, setChatRooms] = useState([]);
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState(null);

  const transformRoom = useCallback(
    (room) => {
      const participants = room?.participants || [];
      const otherParticipant =
        room?.type === "one_to_one"
          ? participants.find((participant) => asId(participant) !== currentUserId)
          : null;
      const displayName = otherParticipant
        ? getParticipantName(otherParticipant)
        : room?.name || "Chat Room";
      const avatar = otherParticipant?.userAvatar || otherParticipant?.avatar;

      return {
        ...room,
        id: room.roomId || room._id || room.id,
        roomId: room.roomId || room._id || room.id,
        displayName,
        profilePic: avatar,
        isOnline: Boolean(otherParticipant?.isOnline),
        role: otherParticipant?.role,
        participantCount: participants.length,
        isGroup: room?.type !== "one_to_one",
        avatarInfo: avatar
          ? { type: "image", value: avatar }
          : {
              type: "initials",
              value: getUserInitials(displayName),
              bgColor: generateColorFromString(displayName),
            },
        lastMessage: room?.lastMessage,
        unreadCount: room?.roomId === selectedRoomIdRef.current ? 0 : room?.unreadCount || 0,
      };
    },
    [currentUserId]
  );

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  useEffect(() => {
    if (!webSocket?.isConnected || !currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    webSocket.fetchChatRooms();
  }, [webSocket?.isConnected, currentUserId]);

  useEffect(() => {
    if (!webSocket?.isConnected) return undefined;

    return webSocket.onChatRoomsUpdate((data) => {
      if (!mountedRef.current) return;
      if (!Array.isArray(data?.rooms)) {
        setError("Unable to load chat rooms");
        setIsLoading(false);
        return;
      }

      const rooms = data.rooms.map(transformRoom).sort((a, b) => {
        const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
        const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
        return bTime - aTime;
      });

      setChatRooms(rooms);
      setIsLoading(false);
      setError(null);
    });
  }, [webSocket?.isConnected, webSocket?.onChatRoomsUpdate, transformRoom]);

  useEffect(() => {
    if (!webSocket?.isConnected) return undefined;

    return webSocket.onChatRoomJoined((data) => {
      if (!mountedRef.current) return;
      const roomMessages = (data?.messages || [])
        .map((message) => normalizeMessage(message, currentUserId, data.roomId))
        .reverse();

      setMessagesByRoom((current) => ({ ...current, [data.roomId]: roomMessages }));
      setIsLoadingMessages(false);

      roomMessages
        .filter((message) => message.senderId !== currentUserId && !message.readBy?.includes(currentUserId))
        .forEach((message) => webSocket.markMessageAsRead(message._id));
    });
  }, [webSocket?.isConnected, webSocket?.onChatRoomJoined, webSocket?.markMessageAsRead, currentUserId]);

  useEffect(() => {
    if (!webSocket?.isConnected) return undefined;

    return webSocket.onMessagesUpdate((data) => {
      const normalized = (data?.messages || [])
        .map((message) => normalizeMessage(message, currentUserId, data.roomId))
        .reverse();
      setMessagesByRoom((current) => ({ ...current, [data.roomId]: normalized }));
      setIsLoadingMessages(false);
    });
  }, [webSocket?.isConnected, webSocket?.onMessagesUpdate, currentUserId]);

  useEffect(() => {
    if (!webSocket?.isConnected) return undefined;

    return webSocket.onChatMessage((message) => {
      const normalized = normalizeMessage(message, currentUserId, message.roomId);

      setMessagesByRoom((current) => {
        const existing = current[normalized.roomId] || [];
        if (existing.some((item) => item._id === normalized._id)) return current;
        return { ...current, [normalized.roomId]: [...existing, normalized] };
      });

      setChatRooms((current) =>
        current
          .map((room) =>
            room.roomId === normalized.roomId
              ? {
                  ...room,
                  lastMessage: {
                    content: normalized.content,
                    senderId: normalized.senderId,
                    senderName: normalized.senderName,
                    createdAt: normalized.rawTimestamp,
                    type: normalized.messageType,
                    attachments: normalized.attachments,
                  },
                  unreadCount:
                    normalized.senderId !== currentUserId && normalized.roomId !== selectedRoomIdRef.current
                      ? (room.unreadCount || 0) + 1
                      : room.unreadCount,
                }
              : room
          )
          .sort((a, b) => {
            const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
            const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
            return bTime - aTime;
          })
      );

      if (normalized.senderId !== currentUserId && normalized.roomId === selectedRoomIdRef.current) {
        webSocket.markMessageAsRead(normalized._id);
      } else if (normalized.senderId !== currentUserId) {
        toast.success(`New message from ${normalized.senderName}`);
      }
    });
  }, [webSocket?.isConnected, webSocket?.onChatMessage, webSocket?.markMessageAsRead, currentUserId]);

  useEffect(() => {
    if (!webSocket?.isConnected) return undefined;
    return webSocket.onUnreadMessagesUpdate(() => webSocket.fetchChatRooms());
  }, [webSocket?.isConnected, webSocket?.onUnreadMessagesUpdate, webSocket?.fetchChatRooms]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (selectedRoomIdRef.current) webSocket?.leaveChatRoom(selectedRoomIdRef.current);
    };
  }, []);

  const selectRoom = useCallback(
    (roomId) => {
      if (!roomId || !webSocket?.isConnected) return;
      if (selectedRoomIdRef.current && selectedRoomIdRef.current !== roomId) {
        webSocket.leaveChatRoom(selectedRoomIdRef.current);
      }
      selectedRoomIdRef.current = roomId;
      setSelectedRoomId(roomId);
      setIsLoadingMessages(true);
      setChatRooms((current) =>
        current.map((room) => (room.roomId === roomId ? { ...room, unreadCount: 0 } : room))
      );
      webSocket.joinChatRoom(roomId);
    },
    [webSocket?.isConnected, webSocket?.joinChatRoom, webSocket?.leaveChatRoom]
  );

  const sendMessage = useCallback(
    ({ content = "", attachments = [], type = "text", duration }) => {
      if (!selectedRoomId || !webSocket?.isConnected) return toast.error("Please select a chat first");
      if (!content.trim() && attachments.length === 0) return toast.error("Message cannot be empty");

      webSocket.sendChatMessage({
        content: content.trim(),
        roomId: selectedRoomId,
        senderName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "You",
        type,
        duration,
        attachments,
      });
    },
    [selectedRoomId, webSocket?.isConnected, webSocket?.sendChatMessage, user?.firstName, user?.lastName]
  );

  const selectedRoom = useMemo(
    () => chatRooms.find((room) => room.roomId === selectedRoomId) || null,
    [chatRooms, selectedRoomId]
  );

  return {
    chatRooms,
    messages: selectedRoomId ? messagesByRoom[selectedRoomId] || [] : [],
    selectedRoom,
    selectedRoomId,
    isLoading,
    isLoadingMessages,
    isConnected: Boolean(webSocket?.isConnected),
    error,
    selectRoom,
    sendMessage,
    refreshChatRooms: webSocket?.fetchChatRooms || (() => {}),
  };
};
