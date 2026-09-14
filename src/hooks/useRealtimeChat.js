/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocketContextSafe } from "../contexts/WebSocketContext";
import { useAuth } from "../services/auth.services";
import { removeChatParticipant, uploadChatAttachment } from "../services/chat.services";
import { generateColorFromString, getUserInitials } from "../lib/colorUtils";
import {
  LEAVABLE_ROOM_TYPES,
  applyMessagesRead,
  createClientMessageId,
  isAtOrBefore,
  mergeMessages,
  messageTypeFor,
  newestIncomingMessage,
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

const isAttentiveNow = () => document.visibilityState === "visible" && document.hasFocus();

/**
 * The Messages page's chat store.
 *
 * @param {{ onRoomRemoved?: (event: { roomId: string, name: string }) => void }} [options]
 *   Called when someone else removes the user from a room (the room is already dropped).
 */
export const useRealtimeChat = ({ onRoomRemoved } = {}) => {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?._id || user?.id;
  const webSocket = useWebSocketContextSafe();
  const isConnected = Boolean(webSocket?.isConnected);

  const [rawRooms, setRawRooms] = useState([]);
  const [roomsStatus, setRoomsStatus] = useState("idle");
  const [roomsError, setRoomsError] = useState(null);
  const [threads, setThreads] = useState({});
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  // Messages count as seen only while the tab is visible and the window has focus.
  const [isAttentive, setIsAttentive] = useState(isAttentiveNow);

  const selectedRoomIdRef = useRef(null);
  const joinedRoomIdRef = useRef(null);
  const threadsRef = useRef(threads);
  const roomsRef = useRef(rawRooms);
  // clientMessageId -> { roomId, text, file, type, duration, attachments, inFlight, failed }
  const outboxRef = useRef(new Map());
  const backfillCursorRef = useRef({});
  const loadingOlderRef = useRef(new Set());
  // roomId -> { id, time } of the newest message a mark-room-read was sent for.
  const readPositionRef = useRef({});
  // Rooms the user is leaving themselves, so the removal event doesn't read as "You were removed".
  const leavingRoomIdsRef = useRef(new Set());
  const onRoomRemovedRef = useRef(onRoomRemoved);
  const joinsInFlightRef = useRef(new Map());
  const webSocketRef = useRef(webSocket);

  threadsRef.current = threads;
  roomsRef.current = rawRooms;
  webSocketRef.current = webSocket;
  onRoomRemovedRef.current = onRoomRemoved;

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
      const avatar = otherParticipant
        ? otherParticipant.userAvatar || otherParticipant.avatar
        : room?.type === "one_to_one"
        ? null
        : room?.avatarUrl;

      return {
        ...room,
        id: roomId,
        roomId,
        displayName,
        profilePic: avatar,
        otherParticipant,
        otherParticipantId: toId(otherParticipant?._id) || toId(otherParticipant?.userId),
        isOnline: Boolean(otherParticipant?.isOnline),
        role: otherParticipant?.role,
        participantCount: participants.length,
        isGroup: room?.type !== "one_to_one",
        canLeave: LEAVABLE_ROOM_TYPES.includes(room?.type),
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

      const request = webSocket.joinChatRoom(roomId).catch((error) => {
        if (joinedRoomIdRef.current === roomId) joinedRoomIdRef.current = null;
        // Offline: the join runs again on reconnect.
        if (error.code === "OFFLINE" || selectedRoomIdRef.current !== roomId) return;
        updateThread(roomId, (thread) =>
          thread.historyLoaded ? thread : { ...thread, status: "error", error: "Couldn't load this chat" }
        );
      });
      joinsInFlightRef.current.set(roomId, request);
      request.finally(() => {
        if (joinsInFlightRef.current.get(roomId) === request) joinsInFlightRef.current.delete(roomId);
      });
    },
    [webSocket, updateThread]
  );

  // Leaves once any join still in flight has settled (otherwise the server could finish
  // the join after the leave), and not at all if the room was reopened meanwhile.
  const leaveRoom = useCallback((roomId) => {
    if (!roomId) return;
    (joinsInFlightRef.current.get(roomId) || Promise.resolve()).then(() => {
      if (selectedRoomIdRef.current !== roomId) webSocketRef.current?.leaveChatRoom(roomId);
    });
  }, []);

  /** Forgets a room the user is no longer in: list entry, history, unsent messages and read position. */
  const dropRoom = useCallback((roomId) => {
    const room = roomsRef.current.find((item) => roomIdOf(item) === roomId) || null;
    setRawRooms((rooms) => rooms.filter((item) => roomIdOf(item) !== roomId));
    setThreads((current) => {
      if (!current[roomId]) return current;
      const next = { ...current };
      delete next[roomId];
      return next;
    });
    outboxRef.current.forEach((entry, clientMessageId) => {
      if (entry.roomId === roomId) outboxRef.current.delete(clientMessageId);
    });
    delete readPositionRef.current[roomId];
    delete backfillCursorRef.current[roomId];
    // The server already took this user's sockets out of the room, so there is nothing to leave.
    if (selectedRoomIdRef.current === roomId) {
      selectedRoomIdRef.current = null;
      if (joinedRoomIdRef.current === roomId) joinedRoomIdRef.current = null;
      setSelectedRoomId(null);
    }
    return room;
  }, []);

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

      // Another member read up to a point (only sent when they share read receipts).
      webSocket.on("messages-read", (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId || !data?.userId || !data.readAt) return;
        updateThread(roomId, (thread) => {
          const messages = applyMessagesRead(thread.messages, { userId: data.userId, readAt: data.readAt });
          return messages === thread.messages ? thread : { ...thread, messages };
        });
      }),

      // This user read the room, here or on another device.
      webSocket.on("room-read", (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId) return;
        // readAt is the up-to message's createdAt: nothing at or before it needs acknowledging here.
        const upTo = { _id: toId(data.upToMessageId), createdAt: data.readAt };
        if (upTo._id && data.readAt && !isAtOrBefore(upTo, readPositionRef.current[roomId])) {
          readPositionRef.current[roomId] = { id: upTo._id, time: new Date(data.readAt).getTime() };
        }
        setRawRooms((rooms) =>
          rooms.map((room) =>
            roomIdOf(room) === roomId ? { ...room, unreadCount: 0, lastReadAt: data.readAt || room.lastReadAt } : room
          )
        );
      }),

      webSocket.on("room-updated", (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId) return;
        const changes = {};
        if (data.name) changes.name = data.name;
        if ("description" in data) changes.description = data.description || "";
        if ("avatarUrl" in data) changes.avatarUrl = data.avatarUrl || "";
        setRawRooms((rooms) => rooms.map((room) => (roomIdOf(room) === roomId ? { ...room, ...changes } : room)));
      }),

      webSocket.on("participants-changed", (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId || !currentUserId) return;
        const removed = (data.removed || []).map(toId);
        const added = (data.added || []).map(toId);

        if (removed.includes(currentUserId)) {
          const room = dropRoom(roomId);
          if (leavingRoomIdsRef.current.has(roomId)) return;
          if (room) onRoomRemovedRef.current?.({ roomId, name: room.name || "" });
          return;
        }

        if (added.includes(currentUserId)) leavingRoomIdsRef.current.delete(roomId);
        if (!roomsRef.current.some((room) => roomIdOf(room) === roomId)) {
          if (added.includes(currentUserId)) refreshChatRooms();
          return;
        }
        if (Array.isArray(data.participants)) {
          setRawRooms((rooms) =>
            rooms.map((room) => (roomIdOf(room) === roomId ? { ...room, participants: data.participants } : room))
          );
        }
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
    const handleAttention = () => setIsAttentive(isAttentiveNow());
    document.addEventListener("visibilitychange", handleAttention);
    window.addEventListener("focus", handleAttention);
    window.addEventListener("blur", handleAttention);
    return () => {
      document.removeEventListener("visibilitychange", handleAttention);
      window.removeEventListener("focus", handleAttention);
      window.removeEventListener("blur", handleAttention);
    };
  }, []);

  const selectedThread = selectedRoomId ? threads[selectedRoomId] || EMPTY_THREAD : EMPTY_THREAD;

  // Read only what the user can actually see: the open room, in a visible and focused window.
  // One mark-room-read for the newest message from someone else, again when newer ones arrive
  // or focus returns, never for a message at or before one already sent or read elsewhere.
  useEffect(() => {
    if (!webSocket || !selectedRoomId || !isAttentive || !isConnected || !currentUserId) return;
    const roomId = selectedRoomId;
    const target = newestIncomingMessage(selectedThread.messages);
    if (!target) return;

    const previous = readPositionRef.current[roomId];
    if (isAtOrBefore(target, previous)) return;
    const lastReadAt = new Date(roomsRef.current.find((room) => roomIdOf(room) === roomId)?.lastReadAt || "").getTime();
    if (new Date(target.createdAt || 0).getTime() < lastReadAt) return;

    const position = { id: target._id, time: new Date(target.createdAt || 0).getTime() };
    readPositionRef.current[roomId] = position;
    webSocket
      .markRoomRead(roomId, target._id)
      .then((ack) => {
        setRawRooms((rooms) =>
          rooms.map((room) =>
            roomIdOf(room) === roomId ? { ...room, unreadCount: 0, lastReadAt: ack?.readAt || room.lastReadAt } : room
          )
        );
      })
      .catch(() => {
        // Not acknowledged: allow the next focus, message or reconnect to send it again.
        if (readPositionRef.current[roomId] === position) readPositionRef.current[roomId] = previous;
      });
  }, [selectedRoomId, selectedThread.messages, isAttentive, isConnected, currentUserId]);

  // Leaving the page leaves the room, so the server treats it as closed (and pushes again).
  useEffect(
    () => () => {
      const roomId = joinedRoomIdRef.current;
      selectedRoomIdRef.current = null;
      joinedRoomIdRef.current = null;
      leaveRoom(roomId);
    },
    []
  );

  /** Opens a room (joins it) or, with no id, closes the open one (leaves it). */
  const selectRoom = useCallback(
    (roomId) => {
      const nextRoomId = roomId || null;
      if (nextRoomId === selectedRoomIdRef.current && (!nextRoomId || joinedRoomIdRef.current === nextRoomId)) return;

      const previousRoomId = joinedRoomIdRef.current;
      selectedRoomIdRef.current = nextRoomId;
      if (previousRoomId && previousRoomId !== nextRoomId) {
        joinedRoomIdRef.current = null;
        leaveRoom(previousRoomId);
      }

      setSelectedRoomId(nextRoomId);
      if (!nextRoomId) return;

      loadingOlderRef.current.delete(nextRoomId);
      updateThread(nextRoomId, (thread) => ({ ...thread, loadingOlder: false }));
      setRawRooms((rooms) => rooms.map((room) => (roomIdOf(room) === nextRoomId ? { ...room, unreadCount: 0 } : room)));
      joinRoom(nextRoomId);
    },
    [leaveRoom, joinRoom, updateThread]
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

  /** Removes the user from a group. Rejects with the server's error (e.g. 403) so the caller can show it. */
  const leaveGroup = useCallback(
    async (roomId) => {
      if (!roomId || !currentUserId) return null;
      const room = roomsRef.current.find((item) => roomIdOf(item) === roomId) || null;
      leavingRoomIdsRef.current.add(roomId);
      try {
        await removeChatParticipant(roomId, currentUserId);
      } catch (error) {
        leavingRoomIdsRef.current.delete(roomId);
        throw error;
      }
      dropRoom(roomId);
      return room;
    },
    [currentUserId, dropRoom]
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
    leaveGroup,
    currentUserId,
  };
};
