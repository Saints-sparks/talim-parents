// Chat message helpers shared by the chat hook and the message components:
// one normalizer for every channel (join, fetch, live, ack) and the per-room merge.
import type {
  ChatMessage,
  MessageAttachment,
  RawAttachment,
  RawMessage,
  RawSenderProfile,
  ReadPosition,
} from '../types/chat';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|weba|caf|amr)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|avi|mkv)(\?|#|$)/i;
const DOCUMENT_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf)(\?|#|$)/i;

/** Anything with a creation time: a stored message, a pending bubble, or a read marker. */
export interface Timestamped {
  _id?: string;
  createdAt?: string | null;
}

/** Delivery state of an own message, as `receiptOf` reports it. */
export interface Receipt {
  state: 'pending' | 'failed' | 'sent' | 'read';
  /** Readers other than the sender, for groups. */
  readCount: number;
}

/** Who a message's receipt is judged against. */
export interface ReceiptContext {
  isGroup?: boolean;
  otherUserId?: string;
  currentUserId?: string;
}

/**
 * A user id from a string, an ObjectId-like value or a populated user object.
 *
 * @param value - Whatever the server put in an id field.
 * @returns The id as a string, or `""` when there is none.
 */
export const toId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const candidate = value as { _id?: unknown; userId?: unknown; id?: unknown; toString?: () => string };
  return String(candidate._id || candidate.userId || candidate.id || candidate.toString?.() || '');
};

/**
 * A fresh id for an optimistic message, so its server echo can replace it.
 *
 * @returns A UUID where the browser has one, otherwise a random `c-` id.
 */
export const createClientMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const inferAttachmentType = (url = '', mimeType = '', messageType = ''): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return messageType === 'voice' ? 'audio' : 'video';
  if (messageType === 'voice') return 'audio';
  if (IMAGE_EXT.test(url) || messageType === 'image') return 'image';
  if (AUDIO_EXT.test(url)) return 'audio';
  // .webm is a voice note in chat unless the server said otherwise.
  if (/\.webm(\?|#|$)/i.test(url)) return 'audio';
  if (VIDEO_EXT.test(url)) return 'video';
  if (DOCUMENT_EXT.test(url) || mimeType.startsWith('application/')) return 'document';
  return 'file';
};

/**
 * One attachment as an object with a URL, a name and a resolved type. Plain
 * URL strings (older clients) become `{ url, name, type }`.
 *
 * @param attachment - A URL string or an attachment object from any channel.
 * @param messageType - The message's own type, which disambiguates voice notes.
 * @returns The attachment, or `null` when there was nothing to normalise.
 */
export const normalizeAttachment = (attachment: unknown, messageType?: string): MessageAttachment | null => {
  if (!attachment) return null;
  if (typeof attachment === 'string') {
    return {
      url: attachment,
      name: decodeURIComponent(attachment.split('?')[0].split('/').pop() || 'Attachment'),
      type: inferAttachmentType(attachment, '', messageType),
    };
  }
  const raw = attachment as RawAttachment;
  const url = raw.url || raw.secure_url || raw.fileURL || '';
  const mimeType = raw.mimeType || raw.mimetype || '';
  const type = raw.type === 'voice' ? 'audio' : raw.type;
  return {
    ...raw,
    url,
    name: raw.name || raw.originalName || raw.fileName || 'Attachment',
    mimeType,
    type: type || inferAttachmentType(url, mimeType, messageType),
  };
};

const populatedSenderOf = (message: RawMessage | null | undefined): RawSenderProfile | null =>
  typeof message?.senderId === 'object' ? (message.senderId as RawSenderProfile | null) : null;

const senderNameOf = (message: RawMessage | null | undefined): string => {
  if (message?.sender?.name) return message.sender.name;
  if (message?.senderName) return message.senderName;
  const populated = populatedSenderOf(message);
  const name = [populated?.firstName, populated?.lastName].filter(Boolean).join(' ');
  return name || 'Unknown';
};

/**
 * Reads the server's `replyTo` snapshot.
 *
 * @param replyTo - The raw snapshot.
 * @returns The quote, or undefined when absent or malformed.
 */
const replyToOf = (replyTo: RawMessage['replyTo']): ChatMessage['replyTo'] => {
  const messageId = toId(replyTo?.messageId);
  if (!replyTo || !messageId) return undefined;
  return {
    messageId,
    senderId: toId(replyTo.senderId) || undefined,
    senderName: replyTo.senderName || 'Unknown',
    preview: replyTo.preview || '',
    type: replyTo.type,
  };
};

/**
 * One shape for a message from any channel. Reads the canonical fields
 * (`text`, `createdAt`, `senderId` / `sender._id`, attachment objects, `type`)
 * and falls back to the deprecated aliases.
 *
 * @param message - The raw message from a join, fetch, live event or ack.
 * @param currentUserId - The signed-in user, to flag own messages.
 * @param fallbackRoomId - Used when the payload names no room.
 * @returns The normalised message, always with `status: "sent"`.
 */
export const normalizeMessage = (
  message: RawMessage | null | undefined,
  currentUserId?: string,
  fallbackRoomId?: string,
): ChatMessage => {
  const rawType = message?.type;
  const attachments = (message?.attachments || [])
    .map((attachment) => normalizeAttachment(attachment, rawType))
    .filter((attachment): attachment is MessageAttachment => Boolean(attachment?.url));
  const senderId = toId(message?.sender?._id) || toId(message?.senderId);
  const firstAudio = attachments.find((attachment) => attachment.type === 'audio');
  const type =
    rawType && rawType !== 'text'
      ? rawType
      : firstAudio
      ? 'voice'
      : attachments[0]?.type === 'image'
      ? 'image'
      : attachments.length
      ? 'file'
      : rawType || 'text';

  return {
    id: message?._id || message?.clientMessageId,
    _id: message?._id,
    clientMessageId: message?.clientMessageId,
    roomId: toId(message?.roomId) || toId(message?.chatRoomId) || fallbackRoomId,
    senderId,
    senderName: senderNameOf(message),
    senderAvatar: message?.sender?.avatar || populatedSenderOf(message)?.userAvatar || null,
    // Own-message detection is id equality only.
    isOwn: Boolean(currentUserId) && senderId === currentUserId,
    text: message?.text ?? message?.content ?? '',
    type,
    attachments,
    duration: message?.duration ?? firstAudio?.duration,
    createdAt: message?.createdAt || message?.timestamp || null,
    readBy: (message?.readBy || []).map(toId),
    status: 'sent',
    replyTo: replyToOf(message?.replyTo),
    isDeleted: message?.isDeleted === true ? true : undefined,
  };
};

const timeOf = (message: Timestamped): number => new Date(message.createdAt || 0).getTime();

const compareMessages = (a: ChatMessage, b: ChatMessage): number =>
  timeOf(a) - timeOf(b) || String(a._id).localeCompare(String(b._id));

/**
 * Merges messages into a room's list: dedupes by `_id`, replaces a pending
 * bubble when its `clientMessageId` comes back from the server, and keeps
 * saved messages in time order with unsent bubbles after them.
 *
 * @param existing - The room's current messages.
 * @param incoming - Messages to fold in.
 * @returns The merged list; the same array when `incoming` is empty.
 */
export const mergeMessages = (existing: ChatMessage[] = [], incoming: ChatMessage[] = []): ChatMessage[] => {
  if (!incoming.length) return existing;

  const saved = new Map<string, ChatMessage>();
  const local = new Map<string | undefined, ChatMessage>();

  existing.forEach((message) => {
    if (message._id) saved.set(message._id, message);
    else local.set(message.clientMessageId, message);
  });

  incoming.forEach((message) => {
    if (message._id) {
      saved.set(message._id, { ...saved.get(message._id), ...message });
      if (message.clientMessageId) local.delete(message.clientMessageId);
    } else if (message.clientMessageId) {
      local.set(message.clientMessageId, { ...local.get(message.clientMessageId), ...message });
    }
  });

  const localIds = new Set(Array.from(saved.values()).map((message) => message.clientMessageId).filter(Boolean));
  const unsent = Array.from(local.values()).filter((message) => !localIds.has(message.clientMessageId));

  return [...Array.from(saved.values()).sort(compareMessages), ...unsent];
};

/**
 * True when `message` is at or before `position` in the server's (createdAt, _id) order.
 *
 * @param message - The message (or read marker) to place.
 * @param position - The `{ id, time }` cursor to compare against.
 * @returns Whether `message` does not come after `position`.
 */
export const isAtOrBefore = (
  message: Timestamped | null | undefined,
  position: ReadPosition | null | undefined,
): boolean => {
  if (!message || !position) return false;
  const time = timeOf(message);
  return time < position.time || (time === position.time && String(message._id) <= String(position.id));
};

/**
 * The newest stored message from someone else: what `mark-room-read` acknowledges.
 *
 * @param messages - A room's messages, oldest first.
 * @returns That message, or `null` when there is none.
 */
export const newestIncomingMessage = (messages: ChatMessage[] = []): ChatMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]._id && !messages[index].isOwn) return messages[index];
  }
  return null;
};

/**
 * `messages-read`: adds the reader to `readBy` on messages from other senders
 * created up to `readAt`.
 *
 * @param messages - A room's messages.
 * @param read - Who read, and up to when.
 * @param read.userId - The reader.
 * @param read.readAt - ISO time of the newest message they read.
 * @returns The updated list, or the same array when nothing changes.
 */
export const applyMessagesRead = (
  messages: ChatMessage[] = [],
  { userId, readAt }: { userId?: unknown; readAt?: string | null } = {},
): ChatMessage[] => {
  const reader = toId(userId);
  const limit = new Date(readAt || '').getTime();
  if (!reader || Number.isNaN(limit)) return messages;

  let changed = false;
  const next = messages.map((message) => {
    if (!message._id || message.senderId === reader || timeOf(message) > limit) return message;
    if ((message.readBy || []).includes(reader)) return message;
    changed = true;
    return { ...message, readBy: [...(message.readBy || []), reader] };
  });
  return changed ? next : messages;
};

/**
 * Delivery state of an own message: `pending` (not acked), `failed`, `sent`
 * (stored) or `read` (1:1, the other person is in `readBy`). `readCount` is
 * `readBy` without the sender, for groups.
 *
 * @param message - The message to judge; only own messages have a receipt.
 * @param context - Whether the room is a group, and who the other person is.
 * @returns The receipt, or `null` for messages from others.
 */
export const receiptOf = (
  message: ChatMessage | null | undefined,
  { isGroup = false, otherUserId = '', currentUserId = '' }: ReceiptContext = {},
): Receipt | null => {
  if (!message?.isOwn) return null;
  if (message.status === 'failed') return { state: 'failed', readCount: 0 };
  if (message.status === 'pending' || !message._id) return { state: 'pending', readCount: 0 };
  const readers = (message.readBy || []).filter((id) => id && id !== message.senderId && id !== currentUserId);
  const isRead = !isGroup && Boolean(otherUserId) && readers.includes(otherUserId);
  return { state: isRead ? 'read' : 'sent', readCount: readers.length };
};

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
  admin: 'Admin',
  school_admin: 'School admin',
  school_sub_admin: 'School sub-admin',
};

/**
 * A user role as shown to people ("school_admin" becomes "School admin").
 *
 * @param role - The role string from the API.
 * @returns A display label, or `""` for no role.
 */
export const formatRoleLabel = (role: string | null | undefined): string => {
  if (!role) return '';
  if (ROLE_LABELS[role]) return ROLE_LABELS[role];
  const words = String(role).replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Group types every member may leave; the school manages membership of the others. */
export const LEAVABLE_ROOM_TYPES: string[] = ['custom_group', 'parent_group'];

/**
 * The newest message the server has stored, used as the cursor to catch up after a reconnect.
 *
 * @param messages - A room's messages, oldest first.
 * @returns Its `_id`, or `null` when nothing is stored yet.
 */
export const newestSavedMessageId = (messages: ChatMessage[] = []): string | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const id = messages[index]._id;
    if (id) return id;
  }
  return null;
};

const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();

/**
 * A message's time: "3:05 PM" today, "Mar 4, 3:05 PM" otherwise (with the year when it isn't this one).
 *
 * @param value - An ISO timestamp.
 * @returns The label, or `""` for a missing or invalid time.
 */
export const formatMessageTime = (value: string | number | Date | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
  if (sameDay(date, new Date())) return time;
  const day = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  }).format(date);
  return `${day}, ${time}`;
};

/**
 * The label on the divider between days: "Today", "Yesterday", or the date.
 *
 * @param value - An ISO timestamp.
 * @returns The label, or `""` for an invalid time.
 */
export const formatDaySeparator = (value: string | number | Date | null | undefined): string => {
  const date = new Date(value ?? NaN);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  }).format(date);
};

/**
 * Marks a message deleted the way the server stores it: blank text and
 * attachments.
 *
 * @param messages - A room's messages.
 * @param messageId - The stored message's `_id`.
 * @returns The updated list; the same array when the message isn't loaded or is already deleted.
 */
export const applyMessageDeleted = (messages: ChatMessage[], messageId: string): ChatMessage[] => {
  const at = messages.findIndex((message) => message._id === messageId);
  if (at === -1 || messages[at].isDeleted) return messages;
  const next = messages.slice();
  next[at] = { ...messages[at], text: '', attachments: [], isDeleted: true, uploadProgress: undefined };
  return next;
};

/** Preview shown for a room whose last message was deleted. */
export const DELETED_PREVIEW = 'This message was deleted';

/** A room as the list holds it: only what the delete rule reads. */
interface RoomWithLastMessage {
  _id?: unknown;
  roomId?: unknown;
  id?: unknown;
  lastMessage?: { _id?: string; preview?: string; content?: string } | null;
}

/**
 * A message was deleted: when it is its room's last message, the list previews
 * it as deleted.
 *
 * @param rooms - The room list.
 * @param roomId - The room the message was in.
 * @param messageId - The deleted message's `_id`.
 * @returns The updated list; the same array when nothing changes.
 */
export const applyMessageDeletedToRooms = <T extends RoomWithLastMessage>(
  rooms: T[],
  roomId: string,
  messageId: string,
): T[] => {
  const at = rooms.findIndex((room) => toId(room._id) === roomId || toId(room.roomId) === roomId || toId(room.id) === roomId);
  const last = at === -1 ? null : rooms[at].lastMessage;
  if (!last || last._id !== messageId || last.preview === DELETED_PREVIEW) return rooms;
  const next = rooms.slice();
  next[at] = { ...rooms[at], lastMessage: { ...last, preview: DELETED_PREVIEW, content: DELETED_PREVIEW } };
  return next;
};
