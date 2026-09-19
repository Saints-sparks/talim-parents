import { api, apiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

/** Longest edge, in pixels, an uploaded image is scaled down to. */
const MAX_IMAGE_EDGE = 1600;
/** WebP quality used when re-encoding an image attachment. */
const IMAGE_QUALITY = 0.82;

/** One uploaded chat attachment, as the chat kit consumes it. */
export interface ChatAttachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  type?: string;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Decodes a file into an `Image`, so it can be drawn onto a canvas.
 *
 * @param file - The image file.
 * @returns The decoded image.
 */
function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Encodes a canvas as WebP.
 *
 * @param canvas - The canvas to encode.
 * @returns The encoded blob, or `null` when the browser refused.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', IMAGE_QUALITY));
}

/**
 * Shrinks an image attachment before upload, leaving anything that is not a
 * still image — and any GIF, which would lose its animation on a canvas —
 * untouched. Returns the original whenever re-encoding did not actually help.
 *
 * @param file - The chosen file.
 * @returns The file to upload.
 */
export async function compressImageAttachment(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  try {
    const image = await readImage(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas);
    URL.revokeObjectURL(image.src);
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } catch (error) {
    // A file we cannot re-encode is still a file we can send.
    logger.warn('chat', 'Could not compress an image attachment', error);
    return file;
  }
}

/**
 * Uploads one chat attachment, reporting progress while it goes.
 *
 * Progress needs `XMLHttpRequest`: `fetch` cannot report upload progress, and
 * a parent on a slow connection sending a voice note needs to see it move.
 * This is the one place in the app that does not go through `apiClient`, and
 * it takes the bearer token and base URL from the same sources the client does.
 *
 * @param file - The file to send.
 * @param onProgress - Called with 0–1 as the bytes go out.
 * @returns The stored attachment.
 */
export async function uploadChatAttachment(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ChatAttachment> {
  const uploadFile = await compressImageAttachment(file);
  const formData = new FormData();
  formData.append('file', uploadFile);

  const stored = await apiClient.upload<Partial<ChatAttachment>>(
    '/upload/chat-attachment',
    formData,
    onProgress,
  );

  // The kit works out `type` from the file when the server doesn't send one.
  return {
    ...stored,
    url: stored.url ?? '',
    name: stored.name || file.name,
    mimeType: stored.mimeType || uploadFile.type,
    size: stored.size || uploadFile.size,
  };
}

/**
 * Removes a member from a group. A member removing themselves leaves the group.
 *
 * @param roomId - The chat room.
 * @param userId - Who to remove.
 * @returns The updated room.
 * @throws {ApiError} `FORBIDDEN` when the caller may not remove that member.
 */
export function removeChatParticipant<T = unknown>(roomId: string, userId: string): Promise<T> {
  return api.patch<T>(
    `/chat/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(userId)}/remove`,
    {},
  );
}

/**
 * Deletes a message: its sender, or whoever can manage the room. The text and
 * attachments are blanked and members get `message-deleted`.
 *
 * @param messageId - The stored message's `_id`.
 * @returns Resolves when the server has deleted it.
 * @throws {ApiError} `FORBIDDEN` when the caller may not delete it.
 */
export async function deleteChatMessage(messageId: string): Promise<void> {
  await api.delete(`/chat/messages/${encodeURIComponent(messageId)}`);
}
