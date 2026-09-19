import { LEAVABLE_ROOM_TYPES, toId } from '../../lib/chatMessages';
import { generateColorFromString, getUserInitials } from '../../lib/colorUtils';
import type {
  ChatLastMessage,
  ChatParticipant,
  ChatRoom,
  ChatRoomJoined,
  RawChatRoom,
  RoomUpdated,
} from '../../types/chat';

/**
 * The id of a room from any of the fields the server has used for it.
 *
 * @param room - A raw room.
 * @returns Its id, or `""` when it has none.
 */
export const roomIdOf = (room: RawChatRoom | null | undefined): string =>
  toId(room?._id) || toId(room?.roomId) || toId(room?.id);

/**
 * A member's display name: "First Last", then `name`, then `email`, then "User".
 *
 * @param participant - A room member.
 * @returns The name to show.
 */
export const getParticipantName = (participant: ChatParticipant | null | undefined): string =>
  [participant?.firstName, participant?.lastName].filter(Boolean).join(' ') ||
  participant?.name ||
  participant?.email ||
  'User';

const roomTime = (room: RawChatRoom | null | undefined): number =>
  new Date(room?.lastMessage?.createdAt || room?.updatedAt || 0).getTime();

/**
 * Rooms newest activity first.
 *
 * @param rooms - The rooms to order.
 * @returns A sorted copy.
 */
export const sortRooms = <T extends RawChatRoom>(rooms: T[]): T[] =>
  [...rooms].sort((a, b) => roomTime(b) - roomTime(a));

/**
 * Adds everything the UI derives from a raw room: display name, avatar, the
 * other person of a 1:1, group flags. The open room never shows unread.
 *
 * @param room - The room as the server listed it.
 * @param currentUserId - The signed-in user, to find the other person of a 1:1.
 * @param selectedRoomId - The open room, whose unread count is shown as 0.
 * @returns The room the sidebar, header and details render.
 */
export const toChatRoom = (
  room: RawChatRoom,
  currentUserId: string | undefined,
  selectedRoomId: string | null,
): ChatRoom => {
  const participants = room?.participants || [];
  const roomId = roomIdOf(room);
  const otherParticipant =
    room?.type === 'one_to_one'
      ? participants.find((participant) => (toId(participant?._id) || toId(participant?.userId)) !== currentUserId) ??
        null
      : null;
  const displayName = otherParticipant ? getParticipantName(otherParticipant) : room?.name || 'Chat Room';
  const avatar = otherParticipant
    ? otherParticipant.userAvatar || otherParticipant.avatar
    : room?.type === 'one_to_one'
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
    isGroup: room?.type !== 'one_to_one',
    canLeave: LEAVABLE_ROOM_TYPES.includes(room?.type ?? ''),
    avatarInfo: avatar
      ? { type: 'image', value: avatar }
      : {
          type: 'initials',
          value: getUserInitials(displayName),
          bgColor: generateColorFromString(displayName),
        },
    unreadCount: roomId === selectedRoomId ? 0 : room?.unreadCount || 0,
  };
};

/**
 * `chat-room-joined`: folds the room and member list the join returned into
 * the list, adding the room when it wasn't listed yet. The joined room is read.
 *
 * @param rooms - The current room list.
 * @param roomId - The room that was joined.
 * @param data - The `chat-room-joined` payload.
 * @returns The updated list.
 */
export const applyRoomJoined = (rooms: RawChatRoom[], roomId: string, data: ChatRoomJoined): RawChatRoom[] => {
  const index = rooms.findIndex((room) => roomIdOf(room) === roomId);
  const base: RawChatRoom = index >= 0 ? rooms[index] : {};
  const updated: RawChatRoom = {
    ...base,
    ...(data.room || {}),
    participants: data.participants?.length ? data.participants : data.room?.participants || base.participants,
    unreadCount: 0,
  };
  if (index < 0) return data.room ? sortRooms([...rooms, updated]) : rooms;
  const next = [...rooms];
  next[index] = updated;
  return next;
};

/**
 * `chat-room-activity`: shows a room's newest message, bumps it to the top
 * and, when it counts, its unread count.
 *
 * @param rooms - The current room list.
 * @param roomId - The room the message arrived in.
 * @param lastMessage - The message summary from the event.
 * @param countsAsUnread - False for own messages and for the open room.
 * @returns The updated, re-sorted list.
 */
export const applyRoomActivity = (
  rooms: RawChatRoom[],
  roomId: string,
  lastMessage: ChatLastMessage,
  countsAsUnread: boolean,
): RawChatRoom[] =>
  sortRooms(
    rooms.map((room) =>
      roomIdOf(room) === roomId
        ? {
            ...room,
            lastMessage: { ...lastMessage, content: lastMessage.preview },
            updatedAt: lastMessage.createdAt || room.updatedAt,
            unreadCount: countsAsUnread ? (room.unreadCount || 0) + 1 : room.unreadCount,
          }
        : room,
    ),
  );

/**
 * Marks a room read: unread count to 0 and `lastReadAt` moved forward.
 *
 * @param rooms - The current room list.
 * @param roomId - The room that was read.
 * @param readAt - When it was read, when known.
 * @returns The updated list.
 */
export const applyRoomRead = (rooms: RawChatRoom[], roomId: string, readAt?: string): RawChatRoom[] =>
  rooms.map((room) =>
    roomIdOf(room) === roomId ? { ...room, unreadCount: 0, lastReadAt: readAt || room.lastReadAt } : room,
  );

/**
 * Clears a room's unread count (the user opened it).
 *
 * @param rooms - The current room list.
 * @param roomId - The room that was opened.
 * @returns The updated list.
 */
export const clearRoomUnread = (rooms: RawChatRoom[], roomId: string): RawChatRoom[] =>
  rooms.map((room) => (roomIdOf(room) === roomId ? { ...room, unreadCount: 0 } : room));

/**
 * `room-updated`: applies a changed name, description or picture.
 *
 * @param rooms - The current room list.
 * @param roomId - The room that changed.
 * @param data - The `room-updated` payload; only the fields it names change.
 * @returns The updated list.
 */
export const applyRoomUpdated = (rooms: RawChatRoom[], roomId: string, data: RoomUpdated): RawChatRoom[] => {
  const changes: RawChatRoom = {};
  if (data.name) changes.name = data.name;
  if ('description' in data) changes.description = data.description || '';
  if ('avatarUrl' in data) changes.avatarUrl = data.avatarUrl || '';
  return rooms.map((room) => (roomIdOf(room) === roomId ? { ...room, ...changes } : room));
};

/**
 * `participants-changed`: replaces a room's member list.
 *
 * @param rooms - The current room list.
 * @param roomId - The room whose members changed.
 * @param participants - The members after the change.
 * @returns The updated list.
 */
export const applyParticipants = (
  rooms: RawChatRoom[],
  roomId: string,
  participants: ChatParticipant[],
): RawChatRoom[] => rooms.map((room) => (roomIdOf(room) === roomId ? { ...room, participants } : room));

/**
 * Drops a room from the list.
 *
 * @param rooms - The current room list.
 * @param roomId - The room to forget.
 * @returns The list without it.
 */
export const removeRoom = (rooms: RawChatRoom[], roomId: string): RawChatRoom[] =>
  rooms.filter((item) => roomIdOf(item) !== roomId);
