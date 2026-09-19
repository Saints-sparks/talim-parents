import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { applyMessageDeletedToRooms, isAtOrBefore, normalizeMessage, toId } from '../../lib/chatMessages';
import type {
  ChatMessage,
  LoadStatus,
  RawChatRoom,
  ReadPosition,
  Thread,
} from '../../types/chat';
import type { WebSocketApi } from '../useWebSocket';
import type { OutboxEntry } from './outbox';
import {
  applyParticipants,
  applyRoomActivity,
  applyRoomJoined,
  applyRoomRead,
  applyRoomUpdated,
  roomIdOf,
  sortRooms,
} from './roomStore';
import {
  withJoinedHistory,
  withMessageDeleted,
  withMessagesRead,
  withMessagesUpdate,
} from './threadStore';

/** What the socket event wiring needs from the chat store. */
export interface ChatSocketEventsParams {
  webSocket: WebSocketApi | null;
  currentUserId: string | undefined;
  selectedRoomIdRef: MutableRefObject<string | null>;
  roomsRef: MutableRefObject<RawChatRoom[]>;
  outboxRef: MutableRefObject<Map<string, OutboxEntry>>;
  readPositionRef: MutableRefObject<Record<string, ReadPosition | undefined>>;
  backfillCursorRef: MutableRefObject<Record<string, string | null | undefined>>;
  leavingRoomIdsRef: MutableRefObject<Set<string>>;
  onRoomRemovedRef: MutableRefObject<((event: { roomId: string; name: string }) => void) | undefined>;
  setRawRooms: Dispatch<SetStateAction<RawChatRoom[]>>;
  setRoomsStatus: Dispatch<SetStateAction<LoadStatus>>;
  setRoomsError: Dispatch<SetStateAction<string | null>>;
  updateThread: (roomId: string, updater: (thread: Thread) => Thread) => void;
  mergeIntoThread: (roomId: string, messages: ChatMessage[]) => void;
  setMessageStatus: (roomId: string, clientMessageId: string, status: 'failed', error?: string | null) => void;
  releaseOutboxEntry: (clientMessageId: string) => void;
  fetchNewerMessages: (roomId: string, cursor: string, page?: number) => void;
  refreshChatRooms: () => void;
  dropRoom: (roomId: string) => RawChatRoom | null;
}

/**
 * Subscribes the chat store to every server event it reacts to: room list and
 * join payloads, live and paged messages, room activity, read receipts, room
 * and membership changes, and send errors. Re-subscribes when the socket or
 * the signed-in user changes.
 *
 * @param params - The socket, the user and the store's setters and refs.
 */
export const useChatSocketEvents = ({
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
}: ChatSocketEventsParams): void => {
  useEffect(() => {
    if (!webSocket) return undefined;

    const unsubscribers = [
      webSocket.on('chat-rooms-update', (data) => {
        if (!Array.isArray(data?.rooms)) return;
        setRawRooms(sortRooms(data.rooms));
        setRoomsStatus('ready');
        setRoomsError(null);
      }),

      webSocket.on('chat-room-joined', (data) => {
        const roomId = toId(data?.roomId);
        // A late answer for a room the user already left.
        if (!roomId || roomId !== selectedRoomIdRef.current) return;

        const incoming = (data.messages || []).map((message) => normalizeMessage(message, currentUserId, roomId));
        updateThread(roomId, (thread) => withJoinedHistory(thread, incoming, data));

        if (data.room || data.participants) {
          setRawRooms((rooms) => applyRoomJoined(rooms, roomId, data));
        }

        const cursor = backfillCursorRef.current[roomId];
        delete backfillCursorRef.current[roomId];
        if (cursor) fetchNewerMessages(roomId, cursor);
      }),

      webSocket.on('messages-update', (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId || roomId !== selectedRoomIdRef.current) return;
        const incoming = (data.messages || []).map((message) => normalizeMessage(message, currentUserId, roomId));
        updateThread(roomId, (thread) => withMessagesUpdate(thread, incoming, data));
      }),

      webSocket.on('chat-message', (raw) => {
        const message = normalizeMessage(raw, currentUserId);
        if (!message.roomId) return;
        const isOwnPending = message.clientMessageId && outboxRef.current.has(message.clientMessageId);
        if (message.clientMessageId) releaseOutboxEntry(message.clientMessageId);
        if (message.roomId === selectedRoomIdRef.current || isOwnPending) mergeIntoThread(message.roomId, [message]);
      }),

      webSocket.on('chat-room-activity', (data) => {
        const roomId = toId(data?.roomId);
        const lastMessage = data?.lastMessage;
        if (!roomId || !lastMessage) return;

        if (!roomsRef.current.some((room) => roomIdOf(room) === roomId)) {
          // A conversation this list hasn't seen yet.
          refreshChatRooms();
          return;
        }

        const countsAsUnread = toId(lastMessage.senderId) !== currentUserId && roomId !== selectedRoomIdRef.current;
        setRawRooms((rooms) => applyRoomActivity(rooms, roomId, lastMessage, countsAsUnread));
      }),

      // Another member read up to a point (only sent when they share read receipts).
      webSocket.on('messages-read', (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId || !data?.userId || !data.readAt) return;
        updateThread(roomId, (thread) => withMessagesRead(thread, data));
      }),

      // A message in one of my rooms was deleted.
      webSocket.on('message-deleted', (data) => {
        const roomId = toId(data?.roomId);
        const messageId = toId(data?.messageId);
        if (!roomId || !messageId) return;
        updateThread(roomId, (thread) => withMessageDeleted(thread, messageId));
        setRawRooms((rooms) => applyMessageDeletedToRooms(rooms, roomId, messageId));
      }),

      // This user read the room, here or on another device.
      webSocket.on('room-read', (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId) return;
        // readAt is the up-to message's createdAt: nothing at or before it needs acknowledging here.
        const upTo = { _id: toId(data.upToMessageId), createdAt: data.readAt };
        if (upTo._id && data.readAt && !isAtOrBefore(upTo, readPositionRef.current[roomId])) {
          readPositionRef.current[roomId] = { id: upTo._id, time: new Date(data.readAt).getTime() };
        }
        setRawRooms((rooms) => applyRoomRead(rooms, roomId, data.readAt));
      }),

      webSocket.on('room-updated', (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId) return;
        setRawRooms((rooms) => applyRoomUpdated(rooms, roomId, data));
      }),

      webSocket.on('participants-changed', (data) => {
        const roomId = toId(data?.roomId);
        if (!roomId || !currentUserId) return;
        const removed = (data.removed || []).map(toId);
        const added = (data.added || []).map(toId);

        if (removed.includes(currentUserId)) {
          const room = dropRoom(roomId);
          const leftThemselves = toId(data.by) === currentUserId || leavingRoomIdsRef.current.has(roomId);
          if (!leftThemselves) onRoomRemovedRef.current?.({ roomId, name: room?.name || '' });
          return;
        }

        if (added.includes(currentUserId)) leavingRoomIdsRef.current.delete(roomId);
        if (!roomsRef.current.some((room) => roomIdOf(room) === roomId)) {
          if (added.includes(currentUserId)) refreshChatRooms();
          return;
        }
        const participants = data.participants;
        if (Array.isArray(participants)) {
          setRawRooms((rooms) => applyParticipants(rooms, roomId, participants));
        }
      }),

      webSocket.on('error', (payload) => {
        const clientMessageId = payload?.clientMessageId;
        const entry = clientMessageId ? outboxRef.current.get(clientMessageId) : undefined;
        if (clientMessageId && entry && !entry.inFlight) {
          entry.failed = true;
          setMessageStatus(entry.roomId, clientMessageId, 'failed', payload.message || 'Not sent');
        }
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    // Handlers read live state through refs; the subscription only follows the socket and the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webSocket?.on, currentUserId]);
};
