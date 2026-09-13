/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocketContextSafe } from "../contexts/WebSocketContext";
import { useAuth } from "../services/auth.services";
import { uploadChatAttachment } from "../services/chat.services";
import { generateColorFromString, getUserInitials } from "../lib/colorUtils";
import {
  createClientMessageId,
  mergeMessages,
  messageTypeFor,
  newestSavedMessageId,
  normalizeMessage,
  toId,
} from "../lib/chatMessages";

const PAGE_SIZE = 20;
const BACKFILL_PAGE_SIZE = 50;
const MAX_BACKFILL_PAGES = 10;

const EMPTY_THREAD = {
  messages: [],
  historyLoaded: false,
  hasMore: false,
  nextCursor: null,
  status: "idle",
  error: null,
  loadingOlder: false,
  olderError: null,
};

const roomIdOf = (room) => toId(room?._id) || toId(room?.roomId) || toId(room?.id);

const getParticipantName = (participant) =>
  [participant?.firstName, participant?.lastName].filter(Boolean).join(" ") ||
  participant?.name ||
  participant?.email ||
  "User";

const roomTime = (room) => new Date(room?.lastMessage?.createdAt || room?.updatedAt || 0).getTime();
const sortRooms = (rooms) => [...rooms].sort((a, b) => roomTime(b) - roomTime(a));

const attachmentTypeOfFile = (file) => {
  const mime = file?.type || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "file";
};

export const useRealtimeChat = () => {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?._id || user?.id;
  const webSocket = useWebSocketContextSafe();
  const isConnected = Boolean(webSocket?.isConnected);

  const [rawRooms, setRawRooms] = useState([]);
  const [roomsStatus, setRoomsStatus] = useState("idle");
  const [roomsError, setRoomsError] = useState(null);
  const [threads, setThreads] = useState({});
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isPageVisible, setIsPageVisible] = useState(() => document.visibilityState === "visible");

  const selectedRoomIdRef = useRef(null);
  const joinedRoomIdRef = useRef(null);
  const threadsRef = useRef(threads);
  const roomsRef = useRef(rawRooms);
  // clientMessageId -> { roomId, text, file, type, duration, attachments, inFlight, failed }
  const outboxRef = useRef(new Map());
  const backfillCursorRef = useRef({});
  const loadingOlderRef = useRef(new Set());
  const markedReadRef = useRef(new Set());

  threadsRef.current = threads;
  roomsRef.current = rawRooms;

  const updateThread = useCallback((roomId, updater) => {
    if (!roomId) return;
    setThreads((current) => {
      const previous = current[roomId] || EMPTY_THREAD;
      const next = updater(previous);
      return next === previous ? current : { ...current, [roomId]: next };
    });
  }, []);

  const mergeIntoThread = useCallback(
    (roomId, messages) => updateThread(roomId, (thread) => ({ ...thread, messages: mergeMessages(thread.messages, messages) })),
    [updateThread]
  );

  const setMessageStatus = useCallback(
    (roomId, clientMessageId, status, error = null) =>
      updateThread(roomId, (thread) => ({
        ...thread,
        messages: thread.messages.map((message) =>
          message.clientMessageId === clientMessageId && !message._id ? { ...message, status, error } : message
        ),
      })),
    [updateThread]
  );

  const transformRoom = useCallback(
    (room) => {
      const participants = room?.participants || [];
      const roomId = roomIdOf(room);
      const otherParticipant =
        room?.type === "one_to_one"
          ? participants.find((participant) => (toId(participant?._id) || toId(participant?.userId)) !== currentUserId)
          : null;
      const displayName = otherParticipant ? getParticipantName(otherParticipant) : room?.name || "Chat Room";
      const avatar = otherParticipant?.userAvatar || otherParticipant?.avatar;

      return {
        ...room,
        id: roomId,
        roomId,
        displayName,
        profilePic: avatar,
        otherParticipant,
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
        unreadCount: roomId === selectedRoomId ? 0 : room?.unreadCount || 0,
      };
    },
    [currentUserId, selectedRoomId]
  );

  const refreshChatRooms = useCallback(() => {
    if (!webSocket) return;
    setRoomsStatus((status) => (status === "ready" ? status : "loading"));
    webSocket.fetchChatRooms().catch((error) => {
      if (error.code === "OFFLINE") return;
      setRoomsError("Couldn't load your conversations");
      setRoomsStatus((status) => (status === "ready" ? status : "error"));
    });
  }, [webSocket]);

  const fetchNewerMessages = useCallback(
    (roomId, cursor, page = 0) => {
      if (!webSocket || !cursor || page >= MAX_BACKFILL_PAGES) return;
      webSocket
        .fetchMessages({ roomId, cursor, direction: "after", limit: BACKFILL_PAGE_SIZE })
        .then((ack) => {
          if (ack?.hasMore && ack.prevCursor && selectedRoomIdRef.current === roomId) {
            fetchNewerMessages(roomId, ack.prevCursor, page + 1);
          }
        })
        .catch(() => {
          // A later reconnect or rejoin catches up again.
        });
    },
    [webSocket]
  );

  const joinRoom = useCallback(
    (roomId) => {
      if (!webSocket || !roomId) return;
      joinedRoomIdRef.current = roomId;
      // Whatever arrived while this room wasn't joined is fetched after the join lands.
      backfillCursorRef.current[roomId] = newestSavedMessageId(threadsRef.current[roomId]?.messages);
      updateThread(roomId, (thread) => ({
        ...thread,
        status: thread.historyLoaded ? "ready" : "loading",
        error: null,
      }));

      webSocket.joinChatRoom(roomId).catch((error) => {
        if (joinedRoomIdRef.current === roomId) joinedRoomIdRef.current = null;
        // Offline: the join runs again on reconnect.
        if (error.code === "OFFLINE" || selectedRoomIdRef.current !== roomId) return;
        updateThread(roomId, (thread) =>
          thread.historyLoaded ? thread : { ...thread, status: "error", error: "Couldn't load this chat" }
        );
      });
    },
    [webSocket, updateThread]
  );

  const deliver = useCallback(
    async (clientMessageId) => {
      const entry = outboxRef.current.get(clientMessageId);
      if (!entry || entry.inFlight || !webSocket) return;
      entry.inFlight = true;

      try {
        if (entry.file && !entry.attachments) {
          const uploaded = await uploadChatAttachment(entry.file);
          entry.attachments = [entry.duration ? { ...uploaded, duration: entry.duration } : uploaded];
        }

        const attachments = entry.attachments || [];
        const payload = {
          roomId: entry.roomId,
          text: entry.text,
          type: entry.type || messageTypeFor(attachments),
          clientMessageId,
          ...(attachments.length ? { attachments } : {}),
          ...(entry.duration ? { duration: entry.duration } : {}),
        };

        const ack = await webSocket.sendChatMessage(payload);
        outboxRef.current.delete(clientMessageId);
        if (ack?.message) {
          mergeIntoThread(entry.roomId, [normalizeMessage(ack.message, currentUserId, entry.roomId)]);
        }
      } catch (error) {
        entry.inFlight = false;
        // Typed offline: stays pending and is sent on reconnect.
        if (error.code === "OFFLINE" || !outboxRef.current.has(clientMessageId)) return;
        entry.failed = true;
        const message = error.isAxiosError
          ? error.response?.data?.message || "Upload failed"
          : error.ack
          ? error.message
          : "Not sent";
        setMessageStatus(entry.roomId, clientMessageId, "failed", message);
      }
    },
    [webSocket, currentUserId, mergeIntoThread, setMessageStatus]
  );

  // Every connect, first or reconnect: rejoin the open room (then backfill), refresh the list, flush unsent messages.
  useEffect(() => {
    if (!isConnected) {
      joinedRoomIdRef.current = null;
      return;
    }
    if (selectedRoomIdRef.current) joinRoom(selectedRoomIdRef.current);
    refreshChatRooms();
    outboxRef.current.forEach((entry, clientMessageId) => {
      if (!entry.failed) deliver(clientMessageId);
    });
  }, [isConnected]);

  useEffect(() => {
    if (!webSocket) return undefined;

    const unsubscribers = [
      webSocket.on("chat-rooms-update", (data) => {
        if (!Array.isArray(data?.rooms)) return;
        setRawRooms(sortRooms(data.rooms));
        setRoomsStatus("ready");
        setRoomsError(null);
      }),

      webSocket.on("chat-room-joined", (data) => {
        const roomId = toId(data?.roomId);
        // A late answer for a room the user already left.
        if (!roomId || roomId !== selectedRoomIdRef.current) return;

        const incoming = (data.messages || []).map((message) => normalizeMessage(message, currentUserId, roomId));
        updateThread(roomId, (thread) => ({
          ...thread,
          messages: mergeMessages(thread.messages, incoming),
          // Keep the oldest cursor already reached; the join only returns the newest page.
          hasMore: thread.historyLoaded ? thread.hasMore : Boolean(data.hasMore),
          nextCursor: thread.historyLoaded ? thread.nextCursor : data.nextCursor || null,
          historyLoaded: true,
          status: "ready",
          error: null,
        }));

        if (data.room || data.participants) {
          setRawRooms((rooms) => {
            const index = rooms.findIndex((room) => roomIdOf(room) === roomId);
            const base = index >= 0 ? rooms[index] : {};
            const updated = {
              ...base,
              ...(data.room || {}),
              participants: data.participants?.length ? data.participants : data.room?.participants || base.participants,
              unreadCount: 0,
            };
            if (index < 0) return data.room ? sortRooms([...rooms, updated]) : rooms;
            const next = [...rooms];
            next[index] = updated;
            return next;
          });
        }

        const cursor = backfillCursorRef.current[roomId];
        delete backfillCursorRef.current[roomId];
        if (cursor) fetchNewerMessages(roomId, cursor);
      }),

      webSocket.on("messages-update", (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId || roomId !== selectedRoomIdRef.current) return;
        const incoming = (data.messages || []).map((message) => normalizeMessage(message, currentUserId, roomId));
        updateThread(roomId, (thread) => ({
          ...thread,
          messages: mergeMessages(thread.messages, incoming),
          ...(data.direction === "after"
            ? {}
            : { hasMore: Boolean(data.hasMore), nextCursor: data.nextCursor || null, loadingOlder: false, olderError: null }),
        }));
      }),

      webSocket.on("chat-message", (raw) => {
        const message = normalizeMessage(raw, currentUserId);
        if (!message.roomId) return;
        const isOwnPending = message.clientMessageId && outboxRef.current.has(message.clientMessageId);
        if (message.clientMessageId) outboxRef.current.delete(message.clientMessageId);
        if (message.roomId === selectedRoomIdRef.current || isOwnPending) mergeIntoThread(message.roomId, [message]);
      }),

      webSocket.on("chat-room-activity", (data) => {
        const roomId = toId(data?.roomId);
        const lastMessage = data?.lastMessage;
        if (!roomId || !lastMessage) return;

        if (!roomsRef.current.some((room) => roomIdOf(room) === roomId)) {
          // A conversation this list hasn't seen yet.
          refreshChatRooms();
          return;
        }

        const countsAsUnread = toId(lastMessage.senderId) !== currentUserId && roomId !== selectedRoomIdRef.current;
        setRawRooms((rooms) =>
          sortRooms(
            rooms.map((room) =>
              roomIdOf(room) === roomId
                ? {
                    ...room,
                    lastMessage: { ...lastMessage, content: lastMessage.preview },
                    updatedAt: lastMessage.createdAt || room.updatedAt,
                    unreadCount: countsAsUnread ? (room.unreadCount || 0) + 1 : room.unreadCount,
                  }
                : room
            )
          )
        );
      }),

      webSocket.on("error", (payload) => {
        const clientMessageId = payload?.clientMessageId;
        const entry = clientMessageId && outboxRef.current.get(clientMessageId);
        if (entry && !entry.inFlight) {
          entry.failed = true;
          setMessageStatus(entry.roomId, clientMessageId, "failed", payload.message || "Not sent");
        }
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [webSocket?.on, currentUserId]);

  useEffect(() => {
    const handleVisibility = () => setIsPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const selectedThread = selectedRoomId ? threads[selectedRoomId] || EMPTY_THREAD : EMPTY_THREAD;

  // Read only what the user can actually see: the open room, in a visible tab, from other people.
  useEffect(() => {
    if (!selectedRoomId || !isPageVisible || !isConnected || !currentUserId) return;
    selectedThread.messages.forEach((message) => {
      if (!message._id || message.isOwn || message.readBy.includes(currentUserId)) return;
      if (markedReadRef.current.has(message._id)) return;
      markedReadRef.current.add(message._id);
      webSocket.markMessageAsRead(message._id);
    });
  }, [selectedRoomId, selectedThread.messages, isPageVisible, isConnected, currentUserId]);

  const webSocketRef = useRef(webSocket);
  webSocketRef.current = webSocket;

  // Leaving the page leaves the room, so the server treats it as closed (and pushes again).
  useEffect(
    () => () => {
      if (joinedRoomIdRef.current) webSocketRef.current?.leaveChatRoom(joinedRoomIdRef.current);
      joinedRoomIdRef.current = null;
    },
    []
  );

  /** Opens a room (joins it) or, with no id, closes the open one (leaves it). */
  const selectRoom = useCallback(
    (roomId) => {
      const nextRoomId = roomId || null;
      if (nextRoomId === selectedRoomIdRef.current && (!nextRoomId || joinedRoomIdRef.current === nextRoomId)) return;

      if (joinedRoomIdRef.current && joinedRoomIdRef.current !== nextRoomId) {
        webSocket?.leaveChatRoom(joinedRoomIdRef.current);
        joinedRoomIdRef.current = null;
      }

      selectedRoomIdRef.current = nextRoomId;
      setSelectedRoomId(nextRoomId);
      if (!nextRoomId) return;

      loadingOlderRef.current.delete(nextRoomId);
      updateThread(nextRoomId, (thread) => ({ ...thread, loadingOlder: false }));
      setRawRooms((rooms) => rooms.map((room) => (roomIdOf(room) === nextRoomId ? { ...room, unreadCount: 0 } : room)));
      joinRoom(nextRoomId);
    },
    [webSocket?.leaveChatRoom, joinRoom, updateThread]
  );

  const retryJoin = useCallback(() => {
    if (selectedRoomIdRef.current) joinRoom(selectedRoomIdRef.current);
  }, [joinRoom]);

  const loadOlderMessages = useCallback(() => {
    const roomId = selectedRoomIdRef.current;
    const thread = threadsRef.current[roomId];
    if (!webSocket || !roomId || !thread?.hasMore || !thread.nextCursor) return;
    if (loadingOlderRef.current.has(roomId)) return;

    loadingOlderRef.current.add(roomId);
    updateThread(roomId, (current) => ({ ...current, loadingOlder: true, olderError: null }));
    webSocket
      .fetchMessages({ roomId, cursor: thread.nextCursor, direction: "before", limit: PAGE_SIZE })
      .then(() => updateThread(roomId, (current) => ({ ...current, loadingOlder: false })))
      .catch((error) =>
        updateThread(roomId, (current) => ({
          ...current,
          loadingOlder: false,
          olderError: error.code === "OFFLINE" ? "You're offline" : "Couldn't load older messages",
        }))
      )
      .finally(() => loadingOlderRef.current.delete(roomId));
  }, [webSocket, updateThread]);

  /**
   * Sends optimistically: the bubble appears at once and holds the text, so a
   * failed send never loses it. Retries reuse the same clientMessageId.
   */
  const sendMessage = useCallback(
    ({ roomId, text = "", file = null, type, duration }) => {
      const targetRoomId = roomId || selectedRoomIdRef.current;
      const trimmed = text.trim();
      if (!targetRoomId || (!trimmed && !file)) return false;

      const clientMessageId = createClientMessageId();
      outboxRef.current.set(clientMessageId, {
        roomId: targetRoomId,
        text: trimmed,
        file,
        type,
        duration,
        attachments: null,
        inFlight: false,
        failed: false,
      });

      mergeIntoThread(targetRoomId, [
        {
          id: clientMessageId,
          clientMessageId,
          roomId: targetRoomId,
          senderId: currentUserId,
          senderName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "You",
          isOwn: true,
          text: trimmed,
          type: type || (file ? messageTypeFor([{ type: attachmentTypeOfFile(file) }]) : "text"),
          attachments: file ? [{ name: file.name, type: attachmentTypeOfFile(file), mimeType: file.type }] : [],
          duration,
          createdAt: new Date().toISOString(),
          readBy: [],
          status: "pending",
        },
      ]);

      deliver(clientMessageId);
      return true;
    },
    [currentUserId, user?.firstName, user?.lastName, mergeIntoThread, deliver]
  );

  const retryMessage = useCallback(
    (message) => {
      const entry = outboxRef.current.get(message?.clientMessageId);
      if (!entry) return;
      entry.failed = false;
      setMessageStatus(entry.roomId, message.clientMessageId, "pending");
      deliver(message.clientMessageId);
    },
    [deliver, setMessageStatus]
  );

  const discardMessage = useCallback(
    (message) => {
      const clientMessageId = message?.clientMessageId;
      const entry = outboxRef.current.get(clientMessageId);
      if (!entry || entry.inFlight) return;
      outboxRef.current.delete(clientMessageId);
      updateThread(entry.roomId, (thread) => ({
        ...thread,
        messages: thread.messages.filter((item) => item._id || item.clientMessageId !== clientMessageId),
      }));
    },
    [updateThread]
  );

  const chatRooms = useMemo(() => rawRooms.map(transformRoom), [rawRooms, transformRoom]);
  const selectedRoom = useMemo(
    () => chatRooms.find((room) => room.roomId === selectedRoomId) || null,
    [chatRooms, selectedRoomId]
  );

  return {
    chatRooms,
    messages: selectedThread.messages,
    selectedRoom,
    selectedRoomId,
    thread: selectedThread,
    isLoading: roomsStatus === "idle" || roomsStatus === "loading",
    isLoadingMessages: selectedThread.status === "loading" || selectedThread.status === "idle",
    isConnected,
    connectionStatus: webSocket?.connectionStatus || "disconnected",
    error: roomsStatus === "error" ? roomsError : null,
    selectRoom,
    retryJoin,
    loadOlderMessages,
    sendMessage,
    retryMessage,
    discardMessage,
    refreshChatRooms,
  };
};
