/**
 * Chat domain types: what the gateway (`talimBE-V2` `UnifiedWebSocketGateway`,
 * `chat-view.mapper.ts`) sends, and the normalised shapes the Messages page
 * renders. "Raw" types describe wire payloads and are deliberately loose where
 * the backend still ships deprecated aliases; the un-prefixed types are what
 * `src/lib/chatMessages.ts` and `src/hooks/chat/*` produce.
 */

// ─── Wire shapes ────────────────────────────────────────────────────────────

/** Room kinds the backend creates (`ChatRoomType`). */
export type ChatRoomType =
  | 'class_group'
  | 'course_group'
  | 'one_to_one'
  | 'admin_parent_group'
  | 'parent_group'
  | 'custom_group';

/** Message kinds (`MessageType`). */
export type ChatMessageType = 'text' | 'voice' | 'image' | 'file';

/** A sender as `MessageView.sender` carries them. */
export interface RawSenderSummary {
  _id?: string;
  name?: string;
  role?: string;
  avatar?: string | null;
}

/** The populated user object older payloads keep in `senderId`. */
export interface RawSenderProfile {
  _id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  userAvatar?: string | null;
}

/**
 * One attachment as any channel may send it: the canonical `AttachmentView`,
 * a Cloudinary-style upload response, or an older client's field names.
 */
export interface RawAttachment {
  url?: string;
  secure_url?: string;
  fileURL?: string;
  type?: string;
  playbackUrl?: string;
  name?: string;
  originalName?: string;
  fileName?: string;
  mimeType?: string;
  mimetype?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
}

/**
 * A message on the wire (`MessageView`, or an ack's `message`). Ids may be
 * strings or populated objects, so they stay `unknown` until `toId` reads them.
 */
export interface RawMessage {
  _id?: string;
  clientMessageId?: string;
  roomId?: unknown;
  /** @deprecated the backend still sends it as an alias of `roomId`. */
  chatRoomId?: unknown;
  senderId?: unknown;
  sender?: RawSenderSummary | null;
  /** @deprecated alias of `sender.name`. */
  senderName?: string;
  text?: string;
  /** @deprecated alias of `text`. */
  content?: string;
  type?: string;
  attachments?: unknown[] | null;
  duration?: number;
  createdAt?: string | null;
  /** @deprecated alias of `createdAt`. */
  timestamp?: string | null;
  readBy?: unknown[] | null;
}

/** A room member (`ParticipantView`), tolerant of the older `name` / `avatar` fields. */
export interface ChatParticipant {
  _id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  userAvatar?: string | null;
  avatar?: string | null;
  isActive?: boolean;
  isOnline?: boolean;
}

/** A room's newest message as the room list shows it (`LastMessageView`). */
export interface ChatLastMessage {
  _id?: string;
  senderId?: unknown;
  senderName?: string;
  type?: string;
  preview?: string;
  /** @deprecated alias of `preview`; the client also writes it on live updates. */
  content?: string;
  createdAt?: string;
  attachments?: unknown[];
  duration?: number;
}

/** A room as the server lists it (`RoomView`, or `chat-room-joined.room`). */
export interface RawChatRoom {
  _id?: string;
  /** @deprecated alias of `_id`. */
  roomId?: string;
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  avatarUrl?: string | null;
  participants?: ChatParticipant[];
  lastMessage?: ChatLastMessage | null;
  unreadCount?: number;
  /** When the current user last read this room. Absent: never. */
  lastReadAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Normalised shapes ──────────────────────────────────────────────────────

/** An attachment after `normalizeAttachment`: always has a URL, a name and a type. */
export interface MessageAttachment {
  url: string;
  name: string;
  type: string;
  mimeType?: string;
  playbackUrl?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
}

/** Delivery state of a message: `sent` once stored, `pending` while in the outbox, `failed` after a failed send. */
export type MessageStatus = 'sent' | 'pending' | 'failed';

/** One message in a thread: from any channel, or a local pending bubble. */
export interface ChatMessage {
  /** `_id` once stored, the client id until then. */
  id?: string;
  /** Present once the server has stored the message. */
  _id?: string;
  clientMessageId?: string;
  roomId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  isOwn: boolean;
  text: string;
  type: string;
  attachments: MessageAttachment[];
  duration?: number;
  createdAt: string | null;
  readBy: string[];
  status: MessageStatus;
  /** Why a `failed` message failed. */
  error?: string | null;
  /** Upload progress per attachment (0-1) while `pending`. */
  uploadProgress?: number[];
}

/** How a room's avatar is drawn. */
export interface AvatarInfo {
  type: 'image' | 'initials';
  value: string;
  /** Background colour of an `initials` avatar. */
  bgColor?: string;
}

/** A room with everything the UI derives from it (see `toChatRoom`). */
export interface ChatRoom extends RawChatRoom {
  id: string;
  roomId: string;
  displayName: string;
  profilePic: string | null | undefined;
  otherParticipant: ChatParticipant | null;
  otherParticipantId: string;
  isOnline: boolean;
  role: string | undefined;
  participantCount: number;
  isGroup: boolean;
  canLeave: boolean;
  avatarInfo: AvatarInfo;
  unreadCount: number;
}

/** Fetch state of a room list or a thread. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** One room's loaded history and paging state. */
export interface Thread {
  messages: ChatMessage[];
  historyLoaded: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  status: LoadStatus;
  error: string | null;
  loadingOlder: boolean;
  olderError: string | null;
}

/** What the composer holds for one room. */
export interface ChatDraft {
  text: string;
  files: File[];
  errors: string[];
}

/** A finished voice recording, as the composer hands it over. */
export interface VoiceNote {
  file: File;
  duration: number;
}

/** Arguments of the store's `sendMessage`. */
export interface SendMessageInput {
  roomId?: string;
  text?: string;
  files?: File[];
  /** Marks a single recorded file as a voice note of `duration` seconds. */
  voice?: boolean;
  duration?: number;
}

/** `{ position }` of the newest message a `mark-room-read` was sent for. */
export interface ReadPosition {
  id: string;
  time: number;
}

/** Socket connection state. */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unauthenticated';

// ─── Socket payloads ────────────────────────────────────────────────────────

/** `{ ok: false }` acknowledgement the gateway sends when a handler fails. */
export interface AckFailure {
  ok: false;
  error?: { code?: string; message?: string };
}

/** Acknowledgement of `send-chat-message`. */
export interface SendAck {
  ok: true;
  message?: RawMessage;
  clientMessageId?: string;
}

/** Acknowledgement (and `messages-update` payload) of `fetch-messages`. */
export interface FetchMessagesAck {
  ok: true;
  roomId?: string;
  messages?: RawMessage[];
  hasMore?: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
  direction?: 'before' | 'after';
  cursor?: string;
}

/** Acknowledgement of `mark-room-read`. */
export interface MarkReadAck {
  ok: true;
  roomId?: string;
  upToMessageId?: string;
  readAt?: string;
  unreadCount?: number;
}

/** Any successful acknowledgement. */
export interface GenericAck {
  ok: true;
  [key: string]: unknown;
}

/** `chat-rooms-update` */
export interface ChatRoomsUpdate {
  rooms?: RawChatRoom[];
}

/** `chat-room-joined` */
export interface ChatRoomJoined {
  roomId?: unknown;
  room?: RawChatRoom;
  participants?: ChatParticipant[];
  messages?: RawMessage[];
  hasMore?: boolean;
  nextCursor?: string | null;
}

/** `chat-room-activity` */
export interface ChatRoomActivity {
  roomId?: unknown;
  lastMessage?: ChatLastMessage;
}

/** `messages-read` */
export interface MessagesRead {
  roomId?: unknown;
  userId?: unknown;
  readAt?: string;
}

/** `room-read` */
export interface RoomRead {
  roomId?: unknown;
  upToMessageId?: unknown;
  readAt?: string;
}

/** `room-updated` */
export interface RoomUpdated {
  roomId?: unknown;
  name?: string;
  description?: string;
  avatarUrl?: string | null;
}

/** `participants-changed` */
export interface ParticipantsChanged {
  roomId?: unknown;
  added?: unknown[];
  removed?: unknown[];
  by?: unknown;
  participants?: ChatParticipant[];
}

/** The gateway's `error` event. */
export interface ChatSocketError {
  clientMessageId?: string;
  message?: string;
  code?: string;
}

/** Every server-to-client chat event the Messages page listens to, by name. */
export interface ChatServerEvents {
  'chat-rooms-update': ChatRoomsUpdate;
  'chat-room-joined': ChatRoomJoined;
  'messages-update': FetchMessagesAck;
  'chat-message': RawMessage;
  'chat-room-activity': ChatRoomActivity;
  'messages-read': MessagesRead;
  'room-read': RoomRead;
  'room-updated': RoomUpdated;
  'participants-changed': ParticipantsChanged;
  error: ChatSocketError;
}

/** An error raised for a rejected or missing acknowledgement. */
export interface AckError extends Error {
  /** `OFFLINE`, `TIMEOUT`, or the server's `error.code`. */
  code?: string;
  /** The raw `{ ok: false }` acknowledgement, when the server sent one. */
  ack?: AckFailure;
}
