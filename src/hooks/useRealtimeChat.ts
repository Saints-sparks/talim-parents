import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWebSocketContextSafe } from '../contexts/WebSocketContext';
import { useAuth } from '../services/auth.services';
import { removeChatParticipant } from '../services/chat.services';
import { mergeMessages, newestSavedMessageId } from '../lib/chatMessages';
import type {
  ChatMessage,
  ChatRoom,
  ConnectionStatus,
  LoadStatus,
  MessageStatus,
  RawChatRoom,
  ReadPosition,
  SendMessageInput,
  Thread,
} from '../types/chat';
import { revokePreviews } from './chat/outbox';
import {
  clearRoomUnread,
  removeRoom,
  roomIdOf,
  toChatRoom,
} from './chat/roomStore';
import {
  EMPTY_THREAD,
  withJoinFailed,
  withJoinStarted,
  withMessageStatus,
  withOlderFailed,
  withOlderLoading,
  withOlderSettled,
} from './chat/threadStore';
import { useChatOutbox } from './chat/useChatOutbox';
import { useChatSocketEvents } from './chat/useChatSocketEvents';
import { useReadTracking } from './chat/useReadTracking';
import { ackErrorCode, type WebSocketApi } from './useWebSocket';

const PAGE_SIZE = 20;
const BACKFILL_PAGE_SIZE = 50;
const MAX_BACKFILL_PAGES = 10;

/** Options of `useRealtimeChat`. */
export interface UseRealtimeChatOptions {
  /**
   * Called when someone else removes the user from a room (the room is already
   * dropped; the "You were removed" toast is ChatAlertsContext's).
   */
  onRoomRemoved?: (event: { roomId: string; name: string }) => void;
}

/** What `useRealtimeChat` returns: the rooms, the open thread and the actions on them. */
export interface UseRealtimeChatResult {
  chatRooms: ChatRoom[];
  /** The open room's messages. */
  messages: ChatMessage[];
  selectedRoom: ChatRoom | null;
  selectedRoomId: string | null;
  /** The open room's thread: messages plus paging and load state. */
  thread: Thread;
  isLoading: boolean;
  isLoadingMessages: boolean;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  /** Why the room list could not load, if it could not. */
  error: string | null;
  /** Opens a room (joins it) or, with no id, closes the open one (leaves it). */
  selectRoom: (roomId?: string | null) => void;
  /** Joins the open room again after a failed load. */
  retryJoin: () => void;
  /** Fetches the page of messages before the oldest loaded one. */
  loadOlderMessages: () => void;
  /** Sends optimistically; returns false when there was nothing to send (see `useChatOutbox`). */
  sendMessage: (message: SendMessageInput) => boolean;
  retryMessage: (message: ChatMessage | null | undefined) => void;
  discardMessage: (message: ChatMessage | null | undefined) => void;
  refreshChatRooms: () => void;
  /** Removes the user from a group. Rejects with the server's error (e.g. 403) so the caller can show it. */
  leaveGroup: (roomId: string) => Promise<RawChatRoom | null>;
  currentUserId: string | undefined;
}

/**
 * The Messages page's chat store: the room list, the open room's thread, and
 * the actions on them (open, send, retry, load older, leave). Talks to the
 * shared socket from `WebSocketContext`.
 *
 * @param options - See {@link UseRealtimeChatOptions}.
 * @returns The rooms, the open thread and the actions.
 */
export const useRealtimeChat = ({ onRoomRemoved }: UseRealtimeChatOptions = {}): UseRealtimeChatResult => {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?._id || user?.id;
  const webSocket = useWebSocketContextSafe() as WebSocketApi | null;
  const isConnected = Boolean(webSocket?.isConnected);

  const [rawRooms, setRawRooms] = useState<RawChatRoom[]>([]);
  const [roomsStatus, setRoomsStatus] = useState<LoadStatus>('idle');
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoomIdRef = useRef<string | null>(null);
  const joinedRoomIdRef = useRef<string | null>(null);
  const threadsRef = useRef(threads);
  const roomsRef = useRef(rawRooms);
  const backfillCursorRef = useRef<Record<string, string | null | undefined>>({});
  const loadingOlderRef = useRef(new Set<string>());
  // roomId -> { id, time } of the newest message a mark-room-read was sent for.
  const readPositionRef = useRef<Record<string, ReadPosition | undefined>>({});
  // Rooms the user is leaving themselves, so the removal event doesn't read as "You were removed".
  const leavingRoomIdsRef = useRef(new Set<string>());
  const onRoomRemovedRef = useRef(onRoomRemoved);
  const joinsInFlightRef = useRef(new Map<string, Promise<unknown>>());
  const webSocketRef = useRef(webSocket);

  threadsRef.current = threads;
  roomsRef.current = rawRooms;
  webSocketRef.current = webSocket;
  onRoomRemovedRef.current = onRoomRemoved;

  const updateThread = useCallback((roomId: string, updater: (thread: Thread) => Thread) => {
    if (!roomId) return;
    setThreads((current) => {
      const previous = current[roomId] || EMPTY_THREAD;
      const next = updater(previous);
      return next === previous ? current : { ...current, [roomId]: next };
    });
  }, []);

  const mergeIntoThread = useCallback(
    (roomId: string, messages: ChatMessage[]) =>
      updateThread(roomId, (thread) => ({ ...thread, messages: mergeMessages(thread.messages, messages) })),
    [updateThread],
  );

  const setMessageStatus = useCallback(
    (roomId: string, clientMessageId: string, status: MessageStatus, error: string | null = null) =>
      updateThread(roomId, (thread) => withMessageStatus(thread, clientMessageId, status, error)),
    [updateThread],
  );

  const { outboxRef, releaseOutboxEntry, deliver, sendMessage, retryMessage, discardMessage } = useChatOutbox({
    webSocket,
    currentUserId,
    firstName: user?.firstName,
    lastName: user?.lastName,
    selectedRoomIdRef,
    updateThread,
    mergeIntoThread,
    setMessageStatus,
  });

  const refreshChatRooms = useCallback(() => {
    if (!webSocket) return;
    setRoomsStatus((status) => (status === 'ready' ? status : 'loading'));
    webSocket.fetchChatRooms().catch((error: unknown) => {
      if (ackErrorCode(error) === 'OFFLINE') return;
      setRoomsError("Couldn't load your conversations");
      setRoomsStatus((status) => (status === 'ready' ? status : 'error'));
    });
  }, [webSocket]);

  const fetchNewerMessages = useCallback(
    (roomId: string, cursor: string, page = 0) => {
      if (!webSocket || !cursor || page >= MAX_BACKFILL_PAGES) return;
      webSocket
        .fetchMessages({ roomId, cursor, direction: 'after', limit: BACKFILL_PAGE_SIZE })
        .then((ack) => {
          if (ack?.hasMore && ack.prevCursor && selectedRoomIdRef.current === roomId) {
            fetchNewerMessages(roomId, ack.prevCursor, page + 1);
          }
        })
        .catch(() => {
          // A later reconnect or rejoin catches up again.
        });
    },
    [webSocket],
  );

  const joinRoom = useCallback(
    (roomId: string) => {
      if (!webSocket || !roomId) return;
      joinedRoomIdRef.current = roomId;
      // Whatever arrived while this room wasn't joined is fetched after the join lands.
      backfillCursorRef.current[roomId] = newestSavedMessageId(threadsRef.current[roomId]?.messages);
      updateThread(roomId, withJoinStarted);

      const request = webSocket.joinChatRoom(roomId).catch((error: unknown) => {
        if (joinedRoomIdRef.current === roomId) joinedRoomIdRef.current = null;
        // Offline: the join runs again on reconnect.
        if (ackErrorCode(error) === 'OFFLINE' || selectedRoomIdRef.current !== roomId) return;
        updateThread(roomId, withJoinFailed);
      });
      joinsInFlightRef.current.set(roomId, request);
      request.finally(() => {
        if (joinsInFlightRef.current.get(roomId) === request) joinsInFlightRef.current.delete(roomId);
      });
    },
    [webSocket, updateThread],
  );

  // Leaves once any join still in flight has settled (otherwise the server could finish
  // the join after the leave), and not at all if the room was reopened meanwhile.
  const leaveRoom = useCallback((roomId: string | null) => {
    if (!roomId) return;
    (joinsInFlightRef.current.get(roomId) || Promise.resolve()).then(() => {
      if (selectedRoomIdRef.current !== roomId) webSocketRef.current?.leaveChatRoom(roomId);
    });
  }, []);

  /** Forgets a room the user is no longer in: list entry, history, unsent messages and read position. */
  const dropRoom = useCallback(
    (roomId: string): RawChatRoom | null => {
      const room = roomsRef.current.find((item) => roomIdOf(item) === roomId) || null;
      setRawRooms((rooms) => removeRoom(rooms, roomId));
      setThreads((current) => {
        if (!current[roomId]) return current;
        const next = { ...current };
        delete next[roomId];
        return next;
      });
      outboxRef.current.forEach((entry, clientMessageId) => {
        if (entry.roomId === roomId) releaseOutboxEntry(clientMessageId);
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
    },
    [outboxRef, releaseOutboxEntry],
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
      if (!entry.failed) void deliver(clientMessageId);
    });
    // Runs on (re)connect only: the callbacks it calls are re-read from the render that saw the connect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  useChatSocketEvents({
    webSocket,
    currentUserId,
    selectedRoomIdRef,
    roomsRef,
    outboxRef,
    readPositionRef,
    backfillCursorRef,
    leavingRoomIdsRef,
    onRoomRemovedRef,
    setRawRooms,
    setRoomsStatus,
    setRoomsError,
    updateThread,
    mergeIntoThread,
    setMessageStatus,
    releaseOutboxEntry,
    fetchNewerMessages,
    refreshChatRooms,
    dropRoom,
  });

  const selectedThread = selectedRoomId ? threads[selectedRoomId] || EMPTY_THREAD : EMPTY_THREAD;

  useReadTracking({
    webSocket,
    selectedRoomId,
    messages: selectedThread.messages,
    isConnected,
    currentUserId,
    roomsRef,
    readPositionRef,
    setRawRooms,
  });

  // Leaving the page leaves the room, so the server treats it as closed (and pushes again).
  useEffect(
    () => () => {
      const roomId = joinedRoomIdRef.current;
      selectedRoomIdRef.current = null;
      joinedRoomIdRef.current = null;
      leaveRoom(roomId);
      outboxRef.current.forEach(revokePreviews);
    },
    // Runs on unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const selectRoom = useCallback(
    (roomId?: string | null) => {
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
      setRawRooms((rooms) => clearRoomUnread(rooms, nextRoomId));
      joinRoom(nextRoomId);
    },
    [leaveRoom, joinRoom, updateThread],
  );

  const retryJoin = useCallback(() => {
    if (selectedRoomIdRef.current) joinRoom(selectedRoomIdRef.current);
  }, [joinRoom]);

  const loadOlderMessages = useCallback(() => {
    const roomId = selectedRoomIdRef.current;
    const thread = roomId ? threadsRef.current[roomId] : undefined;
    if (!webSocket || !roomId || !thread?.hasMore || !thread.nextCursor) return;
    if (loadingOlderRef.current.has(roomId)) return;

    loadingOlderRef.current.add(roomId);
    updateThread(roomId, withOlderLoading);
    webSocket
      .fetchMessages({ roomId, cursor: thread.nextCursor, direction: 'before', limit: PAGE_SIZE })
      .then(() => updateThread(roomId, withOlderSettled))
      .catch((error: unknown) =>
        updateThread(roomId, (current) => withOlderFailed(current, ackErrorCode(error) === 'OFFLINE')),
      )
      .finally(() => loadingOlderRef.current.delete(roomId));
  }, [webSocket, updateThread]);

  const leaveGroup = useCallback(
    async (roomId: string) => {
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
    [currentUserId, dropRoom],
  );

  const chatRooms = useMemo(
    () => rawRooms.map((room) => toChatRoom(room, currentUserId, selectedRoomId)),
    [rawRooms, currentUserId, selectedRoomId],
  );
  const selectedRoom = useMemo(
    () => chatRooms.find((room) => room.roomId === selectedRoomId) || null,
    [chatRooms, selectedRoomId],
  );

  return {
    chatRooms,
    messages: selectedThread.messages,
    selectedRoom,
    selectedRoomId,
    thread: selectedThread,
    isLoading: roomsStatus === 'idle' || roomsStatus === 'loading',
    isLoadingMessages: selectedThread.status === 'loading' || selectedThread.status === 'idle',
    isConnected,
    connectionStatus: webSocket?.connectionStatus || 'disconnected',
    error: roomsStatus === 'error' ? roomsError : null,
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
