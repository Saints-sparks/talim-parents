import { applyMessagesRead, mergeMessages } from '../../lib/chatMessages';
import type {
  ChatMessage,
  ChatRoomJoined,
  FetchMessagesAck,
  MessageStatus,
  MessagesRead,
  Thread,
} from '../../types/chat';

/** A thread nothing has been loaded into yet. */
export const EMPTY_THREAD: Thread = {
  messages: [],
  historyLoaded: false,
  hasMore: false,
  nextCursor: null,
  status: 'idle',
  error: null,
  loadingOlder: false,
  olderError: null,
};

/**
 * Folds messages into a thread.
 *
 * @param thread - The thread.
 * @param messages - Normalised messages to merge (see `mergeMessages`).
 * @returns The updated thread.
 */
export const withMergedMessages = (thread: Thread, messages: ChatMessage[]): Thread => ({
  ...thread,
  messages: mergeMessages(thread.messages, messages),
});

/**
 * Sets the delivery status (and failure reason) of one unsent message.
 *
 * @param thread - The thread.
 * @param clientMessageId - The pending message.
 * @param status - The new status.
 * @param error - Why it failed, for `failed`.
 * @returns The updated thread.
 */
export const withMessageStatus = (
  thread: Thread,
  clientMessageId: string,
  status: MessageStatus,
  error: string | null = null,
): Thread => ({
  ...thread,
  messages: thread.messages.map((message) =>
    message.clientMessageId === clientMessageId && !message._id ? { ...message, status, error } : message,
  ),
});

/**
 * Records the upload progress of one attachment of a pending message.
 *
 * @param thread - The thread.
 * @param clientMessageId - The pending message.
 * @param index - Which attachment.
 * @param progress - Fraction uploaded, 0-1.
 * @returns The updated thread.
 */
export const withUploadProgress = (
  thread: Thread,
  clientMessageId: string,
  index: number,
  progress: number,
): Thread => ({
  ...thread,
  messages: thread.messages.map((message) => {
    if (message._id || message.clientMessageId !== clientMessageId) return message;
    const uploadProgress = [...(message.uploadProgress || [])];
    uploadProgress[index] = progress;
    return { ...message, uploadProgress };
  }),
});

/**
 * Removes an unsent message (the user discarded it).
 *
 * @param thread - The thread.
 * @param clientMessageId - The pending message.
 * @returns The updated thread.
 */
export const withoutUnsentMessage = (thread: Thread, clientMessageId: string): Thread => ({
  ...thread,
  messages: thread.messages.filter((item) => item._id || item.clientMessageId !== clientMessageId),
});

/**
 * A join was requested: the thread shows its history if it has one, else loads.
 *
 * @param thread - The thread.
 * @returns The updated thread.
 */
export const withJoinStarted = (thread: Thread): Thread => ({
  ...thread,
  status: thread.historyLoaded ? 'ready' : 'loading',
  error: null,
});

/**
 * A join failed. A thread that already has history keeps showing it.
 *
 * @param thread - The thread.
 * @returns The updated thread.
 */
export const withJoinFailed = (thread: Thread): Thread =>
  thread.historyLoaded ? thread : { ...thread, status: 'error', error: "Couldn't load this chat" };

/**
 * `chat-room-joined`: the newest page of history.
 *
 * @param thread - The thread.
 * @param incoming - The page, normalised.
 * @param data - The join payload, for the paging cursor.
 * @returns The updated thread.
 */
export const withJoinedHistory = (thread: Thread, incoming: ChatMessage[], data: ChatRoomJoined): Thread => ({
  ...thread,
  messages: mergeMessages(thread.messages, incoming),
  // Keep the oldest cursor already reached; the join only returns the newest page.
  hasMore: thread.historyLoaded ? thread.hasMore : Boolean(data.hasMore),
  nextCursor: thread.historyLoaded ? thread.nextCursor : data.nextCursor || null,
  historyLoaded: true,
  status: 'ready',
  error: null,
});

/**
 * `messages-update`: an older page (moves the cursor) or a catch-up page (does not).
 *
 * @param thread - The thread.
 * @param incoming - The page, normalised.
 * @param data - The fetch payload.
 * @returns The updated thread.
 */
export const withMessagesUpdate = (thread: Thread, incoming: ChatMessage[], data: FetchMessagesAck): Thread => ({
  ...thread,
  messages: mergeMessages(thread.messages, incoming),
  ...(data.direction === 'after'
    ? {}
    : { hasMore: Boolean(data.hasMore), nextCursor: data.nextCursor || null, loadingOlder: false, olderError: null }),
});

/**
 * `messages-read`: another member read up to a point.
 *
 * @param thread - The thread.
 * @param data - The payload.
 * @returns The updated thread, or the same one when no message changed.
 */
export const withMessagesRead = (thread: Thread, data: MessagesRead): Thread => {
  const messages = applyMessagesRead(thread.messages, { userId: data.userId, readAt: data.readAt });
  return messages === thread.messages ? thread : { ...thread, messages };
};

/**
 * Older messages are being fetched.
 *
 * @param thread - The thread.
 * @returns The updated thread.
 */
export const withOlderLoading = (thread: Thread): Thread => ({ ...thread, loadingOlder: true, olderError: null });

/**
 * The older-messages request settled.
 *
 * @param thread - The thread.
 * @returns The updated thread.
 */
export const withOlderSettled = (thread: Thread): Thread => ({ ...thread, loadingOlder: false });

/**
 * The older-messages request failed.
 *
 * @param thread - The thread.
 * @param offline - True when the socket was offline (a different message).
 * @returns The updated thread.
 */
export const withOlderFailed = (thread: Thread, offline: boolean): Thread => ({
  ...thread,
  loadingOlder: false,
  olderError: offline ? "You're offline" : "Couldn't load older messages",
});
