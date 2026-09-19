import type { AttachmentKind, UploadItem } from '../../Components/chat-kit';
import { ApiError, getErrorMessage } from '../../lib/apiError';
import type { AckError, ChatMessage } from '../../types/chat';

/** A message that is being, or waiting to be, sent: what a retry needs to send it again. */
export interface OutboxEntry {
  roomId: string;
  text: string;
  /** The files, each marked `uploaded` once stored so a retry skips it. */
  items: UploadItem[];
  /** Object URLs for the local previews, revoked when the entry is released. */
  previews: string[];
  /** Upload progress per file in 5% steps (0-20), to limit re-renders. */
  progressSteps: number[];
  type: string;
  voice: boolean;
  duration?: number;
  inFlight: boolean;
  failed: boolean;
}

/** Everything the pending bubble is built from. */
export interface PendingMessageInput {
  clientMessageId: string;
  roomId: string;
  currentUserId: string | undefined;
  senderName: string;
  text: string;
  items: UploadItem[];
  previews: string[];
  kinds: AttachmentKind[];
  type: string;
  voice: boolean;
  duration?: number;
}

/**
 * A local preview of a file for a pending bubble: an object URL for images
 * and videos, nothing for other files.
 *
 * @param file - The chosen file.
 * @param kind - Its kind.
 * @returns The object URL, or `""`.
 */
export const createPreviewUrl = (file: File, kind: AttachmentKind): string =>
  (kind === 'image' || kind === 'video') && typeof URL !== 'undefined' ? URL.createObjectURL(file) : '';

/**
 * Frees the local previews of an outbox entry.
 *
 * @param entry - The entry, if there is one.
 */
export const revokePreviews = (entry: Pick<OutboxEntry, 'previews'> | null | undefined): void => {
  entry?.previews?.forEach((url) => {
    if (url) URL.revokeObjectURL(url);
  });
};

/**
 * The optimistic bubble shown while a message sends: the text and local
 * previews of the files, so a failed send never loses them.
 *
 * @param input - The message being sent.
 * @returns A `pending` own message.
 */
export const buildPendingMessage = ({
  clientMessageId,
  roomId,
  currentUserId,
  senderName,
  text,
  items,
  previews,
  kinds,
  type,
  voice,
  duration,
}: PendingMessageInput): ChatMessage => ({
  id: clientMessageId,
  clientMessageId,
  roomId,
  senderId: currentUserId ?? '',
  senderName,
  senderAvatar: null,
  isOwn: true,
  text,
  type,
  attachments: items.map((item, index) => ({
    url: previews[index],
    name: item.file.name,
    type: kinds[index],
    mimeType: item.file.type,
    size: item.file.size,
    ...(item.duration ? { duration: item.duration } : {}),
  })),
  uploadProgress: items.map(() => 0),
  duration: voice ? duration : undefined,
  createdAt: new Date().toISOString(),
  readBy: [],
  status: 'pending',
});

/**
 * The reason shown on a message that failed to send: the API's message for a
 * failed upload, the server's for a rejected send, otherwise "Upload failed"
 * while files are still missing and "Not sent" once they are all up.
 *
 * @param error - What the send or upload threw.
 * @param entry - The outbox entry that failed.
 * @returns A short sentence for the failed bubble.
 */
export const describeSendFailure = (error: unknown, entry: Pick<OutboxEntry, 'items'>): string => {
  if (error instanceof ApiError) return getErrorMessage(error, 'Upload failed');
  if ((error as AckError | null)?.ack) return (error as AckError).message;
  return entry.items.some((item) => !item.uploaded) ? 'Upload failed' : 'Not sent';
};
