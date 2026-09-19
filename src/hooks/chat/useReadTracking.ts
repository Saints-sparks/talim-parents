import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { isAtOrBefore, newestIncomingMessage } from '../../lib/chatMessages';
import type { ChatMessage, RawChatRoom, ReadPosition } from '../../types/chat';
import type { WebSocketApi } from '../useWebSocket';
import { applyRoomRead, roomIdOf } from './roomStore';

/** True while the page is visible and focused: the only time anything counts as read. */
export const isAttentiveNow = (): boolean => document.visibilityState === 'visible' && document.hasFocus();

/** What read tracking needs from the chat store. */
export interface ReadTrackingParams {
  webSocket: WebSocketApi | null;
  selectedRoomId: string | null;
  /** The open room's messages. */
  messages: ChatMessage[];
  isConnected: boolean;
  currentUserId: string | undefined;
  roomsRef: MutableRefObject<RawChatRoom[]>;
  readPositionRef: MutableRefObject<Record<string, ReadPosition | undefined>>;
  setRawRooms: Dispatch<SetStateAction<RawChatRoom[]>>;
}

/**
 * Acknowledges what the user can actually see: the open room, in a visible and
 * focused window. Sends one `mark-room-read` for the newest message from
 * someone else, again when newer ones arrive or focus returns, and never for a
 * message at or before one already sent or read elsewhere.
 *
 * @param params - The socket, the open room and the store's read-position refs.
 */
export const useReadTracking = ({
  webSocket,
  selectedRoomId,
  messages,
  isConnected,
  currentUserId,
  roomsRef,
  readPositionRef,
  setRawRooms,
}: ReadTrackingParams): void => {
  // Messages count as seen only while the tab is visible and the window has focus.
  const [isAttentive, setIsAttentive] = useState(isAttentiveNow);

  useEffect(() => {
    const handleAttention = () => setIsAttentive(isAttentiveNow());
    document.addEventListener('visibilitychange', handleAttention);
    window.addEventListener('focus', handleAttention);
    window.addEventListener('blur', handleAttention);
    return () => {
      document.removeEventListener('visibilitychange', handleAttention);
      window.removeEventListener('focus', handleAttention);
      window.removeEventListener('blur', handleAttention);
    };
  }, []);

  useEffect(() => {
    if (!webSocket || !selectedRoomId || !isAttentive || !isConnected || !currentUserId) return;
    const roomId = selectedRoomId;
    const target = newestIncomingMessage(messages);
    const targetId = target?._id;
    if (!target || !targetId) return;

    const previous = readPositionRef.current[roomId];
    if (isAtOrBefore(target, previous)) return;
    const lastReadAt = new Date(roomsRef.current.find((room) => roomIdOf(room) === roomId)?.lastReadAt || '').getTime();
    // At or before what the server already has as read: nothing new to acknowledge.
    if (new Date(target.createdAt || 0).getTime() <= lastReadAt) return;

    const position = { id: targetId, time: new Date(target.createdAt || 0).getTime() };
    readPositionRef.current[roomId] = position;
    webSocket
      .markRoomRead(roomId, targetId)
      .then((ack) => {
        setRawRooms((rooms) => applyRoomRead(rooms, roomId, ack?.readAt));
      })
      .catch(() => {
        // Not acknowledged: allow the next focus, message or reconnect to send it again.
        if (readPositionRef.current[roomId] === position) readPositionRef.current[roomId] = previous;
      });
    // Deliberately keyed on what the user sees and the connection, not on every socket helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, messages, isAttentive, isConnected, currentUserId]);
};
