/**
 * Chat media kit — uploads a message's files (two at a time) with the app's
 * own upload helper and returns the attachment objects `send-chat-message`
 * takes. Files that already uploaded are skipped, so a retry only uploads
 * what failed.
 */
import { useCallback, useState } from "react";
import { fileKind } from "./mediaTypes";

/**
 * The app's upload helper (`POST /upload/chat-attachment`). Call `onProgress`
 * with 0–1 if the helper can report progress; otherwise it is reported as
 * done when the promise resolves.
 *
 * @typedef {(
 *   file: File,
 *   onProgress?: (fraction: number) => void
 * ) => Promise<Partial<import("./mediaTypes").ChatKitAttachment> & { url: string }>} ChatUploadFn
 */

/**
 * @typedef {object} UploadItem
 * @property {File} file
 * @property {import("./mediaTypes").AttachmentKind} [kind] Force the attachment type (a voice recording is `audio`).
 * @property {number} [duration] Seconds, for audio / video when known locally.
 * @property {import("./mediaTypes").SendableAttachment} [uploaded] Set once uploaded; items with it are not uploaded again.
 */

/**
 * @typedef {object} UploadOptions
 * @property {(index: number, fraction: number) => void} [onProgress] Progress of item `index`, 0–1.
 * @property {(index: number, attachment: import("./mediaTypes").SendableAttachment) => void} [onItemUploaded]
 *   Item `index` finished uploading (store it so a retry skips it).
 * @property {number} [concurrency] Uploads at once (default 2).
 */

/**
 * Builds the send payload's attachment from an upload response.
 *
 * @param {Pick<UploadItem, "file" | "kind" | "duration">} item
 * @param {Partial<import("./mediaTypes").ChatKitAttachment> & { url: string }} response
 * @returns {import("./mediaTypes").SendableAttachment}
 */
export function toSendableAttachment(item, response) {
  const kind = item.kind ?? response.type ?? fileKind(item.file);
  /** @type {import("./mediaTypes").SendableAttachment} */
  const attachment = {
    url: response.url,
    name: response.name || item.file.name,
    mimeType: response.mimeType || item.file.type || "application/octet-stream",
    size: typeof response.size === "number" ? response.size : item.file.size,
    type: kind,
  };
  if (typeof response.width === "number") attachment.width = response.width;
  if (typeof response.height === "number") attachment.height = response.height;
  const duration = typeof response.duration === "number" && response.duration > 0 ? response.duration : item.duration;
  if (typeof duration === "number") attachment.duration = duration;
  return attachment;
}

/**
 * Uploads every item that isn't uploaded yet, `concurrency` at a time, and
 * resolves with all attachments in the items' order. Rejects with the first
 * failure (after the uploads already running settle); items that succeeded
 * are reported through `onItemUploaded` and marked `uploaded`.
 *
 * @param {UploadItem[]} items
 * @param {ChatUploadFn} uploadFn
 * @param {UploadOptions} [options]
 * @returns {Promise<import("./mediaTypes").SendableAttachment[]>}
 */
export async function uploadAttachments(items, uploadFn, options = {}) {
  const concurrency = Math.max(1, options.concurrency ?? 2);
  const queue = items.map((_, index) => index).filter((index) => !items[index].uploaded);
  let failure = null;

  items.forEach((item, index) => {
    if (item.uploaded) options.onProgress?.(index, 1);
  });

  const worker = async () => {
    while (queue.length > 0 && failure === null) {
      const index = queue.shift();
      const item = items[index];
      options.onProgress?.(index, 0);
      try {
        const response = await uploadFn(item.file, (fraction) =>
          options.onProgress?.(index, Math.min(1, Math.max(0, fraction)))
        );
        if (!response || typeof response.url !== "string" || !response.url) {
          throw new Error("Upload failed");
        }
        const attachment = toSendableAttachment(item, response);
        item.uploaded = attachment;
        options.onProgress?.(index, 1);
        options.onItemUploaded?.(index, attachment);
      } catch (err) {
        if (failure === null) failure = err ?? new Error("Upload failed");
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  if (failure !== null) throw failure;
  return items.map((item) => item.uploaded);
}

/**
 * @typedef {object} UseAttachmentUploadReturn
 * @property {(items: UploadItem[], options?: UploadOptions) => Promise<import("./mediaTypes").SendableAttachment[]>} upload
 * @property {boolean} isUploading
 * @property {number[]} progress Progress per item of the latest upload, 0–1.
 */

/**
 * @param {ChatUploadFn} uploadFn
 * @returns {UseAttachmentUploadReturn}
 */
export function useAttachmentUpload(uploadFn) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(/** @type {number[]} */ ([]));

  const upload = useCallback(
    async (/** @type {UploadItem[]} */ items, /** @type {UploadOptions} */ options = {}) => {
      setActive((n) => n + 1);
      setProgress(items.map((item) => (item.uploaded ? 1 : 0)));
      try {
        return await uploadAttachments(items, uploadFn, {
          ...options,
          onProgress: (index, fraction) => {
            setProgress((prev) => {
              if (prev[index] === fraction) return prev;
              const next = [...prev];
              next[index] = fraction;
              return next;
            });
            options.onProgress?.(index, fraction);
          },
        });
      } finally {
        setActive((n) => n - 1);
      }
    },
    [uploadFn]
  );

  return { upload, isUploading: active > 0, progress };
}
