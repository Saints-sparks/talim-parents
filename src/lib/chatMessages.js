// Chat message helpers shared by the chat hook and the message components:
// one normalizer for every channel (join, fetch, live, ack) and the per-room merge.

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|weba|caf|amr)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|avi|mkv)(\?|#|$)/i;
const DOCUMENT_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf)(\?|#|$)/i;

/** A user id from a string, an ObjectId-like value or a populated user object. */
export const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.userId || value.id || value.toString?.() || "");
};

export const createClientMessageId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const inferAttachmentType = (url = "", mimeType = "", messageType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return messageType === "voice" ? "audio" : "video";
  if (messageType === "voice") return "audio";
  if (IMAGE_EXT.test(url) || messageType === "image") return "image";
  if (AUDIO_EXT.test(url)) return "audio";
  // .webm is a voice note in chat unless the server said otherwise.
  if (/\.webm(\?|#|$)/i.test(url)) return "audio";
  if (VIDEO_EXT.test(url)) return "video";
  if (DOCUMENT_EXT.test(url) || mimeType.startsWith("application/")) return "document";
  return "file";
};

export const normalizeAttachment = (attachment, messageType) => {
  if (!attachment) return null;
  if (typeof attachment === "string") {
    return {
      url: attachment,
      name: decodeURIComponent(attachment.split("?")[0].split("/").pop() || "Attachment"),
      type: inferAttachmentType(attachment, "", messageType),
    };
  }
  const url = attachment.url || attachment.secure_url || attachment.fileURL;
  const mimeType = attachment.mimeType || attachment.mimetype || "";
  const type = attachment.type === "voice" ? "audio" : attachment.type;
  return {
    ...attachment,
    url,
    name: attachment.name || attachment.originalName || attachment.fileName || "Attachment",
    mimeType,
    type: type || inferAttachmentType(url, mimeType, messageType),
  };
};

const senderNameOf = (message) => {
  if (message?.sender?.name) return message.sender.name;
  if (message?.senderName) return message.senderName;
  const populated = typeof message?.senderId === "object" ? message.senderId : null;
  const name = [populated?.firstName, populated?.lastName].filter(Boolean).join(" ");
  return name || "Unknown";
};

/**
 * One shape for a message from any channel. Reads the canonical fields
 * (`text`, `createdAt`, `senderId` / `sender._id`, attachment objects, `type`)
 * and falls back to the deprecated aliases.
 */
export const normalizeMessage = (message, currentUserId, fallbackRoomId) => {
  const rawType = message?.type;
  const attachments = (message?.attachments || [])
    .map((attachment) => normalizeAttachment(attachment, rawType))
    .filter((attachment) => attachment?.url);
  const senderId = toId(message?.sender?._id) || toId(message?.senderId);
  const firstAudio = attachments.find((attachment) => attachment.type === "audio");
  const type =
    rawType && rawType !== "text"
      ? rawType
      : firstAudio
      ? "voice"
      : attachments[0]?.type === "image"
      ? "image"
      : attachments.length
      ? "file"
      : rawType || "text";

  return {
    id: message?._id || message?.clientMessageId,
    _id: message?._id,
    clientMessageId: message?.clientMessageId,
    roomId: toId(message?.roomId) || toId(message?.chatRoomId) || fallbackRoomId,
    senderId,
    senderName: senderNameOf(message),
    senderAvatar: message?.sender?.avatar || message?.senderId?.userAvatar || null,
    // Own-message detection is id equality only.
    isOwn: Boolean(currentUserId) && senderId === currentUserId,
    text: message?.text ?? message?.content ?? "",
    type,
    attachments,
    duration: message?.duration ?? firstAudio?.duration,
    createdAt: message?.createdAt || message?.timestamp || null,
    readBy: (message?.readBy || []).map(toId),
    status: "sent",
  };
};

const timeOf = (message) => new Date(message.createdAt || 0).getTime();

const compareMessages = (a, b) => timeOf(a) - timeOf(b) || String(a._id).localeCompare(String(b._id));

/**
 * Merges messages into a room's list: dedupes by `_id`, replaces a pending
 * bubble when its `clientMessageId` comes back from the server, and keeps
 * saved messages in time order with unsent bubbles after them.
 */
export const mergeMessages = (existing = [], incoming = []) => {
  if (!incoming.length) return existing;

  const saved = new Map();
  const local = new Map();

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

/** True when `message` is at or before `position` ({ id, time }) in the server's (createdAt, _id) order. */
export const isAtOrBefore = (message, position) => {
  if (!message || !position) return false;
  const time = timeOf(message);
  return time < position.time || (time === position.time && String(message._id) <= String(position.id));
};

/** The newest stored message from someone else: what `mark-room-read` acknowledges. */
export const newestIncomingMessage = (messages = []) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]._id && !messages[index].isOwn) return messages[index];
  }
  return null;
};

/**
 * `messages-read`: adds the reader to `readBy` on messages from other senders
 * created up to `readAt`. Returns the same array when nothing changes.
 */
export const applyMessagesRead = (messages = [], { userId, readAt } = {}) => {
  const reader = toId(userId);
  const limit = new Date(readAt || "").getTime();
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
 */
export const receiptOf = (message, { isGroup = false, otherUserId = "", currentUserId = "" } = {}) => {
  if (!message?.isOwn) return null;
  if (message.status === "failed") return { state: "failed", readCount: 0 };
  if (message.status === "pending" || !message._id) return { state: "pending", readCount: 0 };
  const readers = (message.readBy || []).filter((id) => id && id !== message.senderId && id !== currentUserId);
  const isRead = !isGroup && Boolean(otherUserId) && readers.includes(otherUserId);
  return { state: isRead ? "read" : "sent", readCount: readers.length };
};

const ROLE_LABELS = {
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
  admin: "Admin",
  school_admin: "School admin",
  school_sub_admin: "School sub-admin",
};

/** A user role as shown to people ("school_admin" -> "School admin"). */
export const formatRoleLabel = (role) => {
  if (!role) return "";
  if (ROLE_LABELS[role]) return ROLE_LABELS[role];
  const words = String(role).replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Group types every member may leave; the school manages membership of the others. */
export const LEAVABLE_ROOM_TYPES = ["custom_group", "parent_group"];

/** The newest message the server has stored, used as the cursor to catch up after a reconnect. */
export const newestSavedMessageId = (messages = []) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]._id) return messages[index]._id;
  }
  return null;
};

const sameDay = (a, b) => a.toDateString() === b.toDateString();

export const formatMessageTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  if (sameDay(date, new Date())) return time;
  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
  return `${day}, ${time}`;
};

export const formatDaySeparator = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
};
