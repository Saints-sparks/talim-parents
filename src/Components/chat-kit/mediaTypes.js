/**
 * Chat media kit — pure helpers shared by every piece of the kit.
 *
 * Copied file-for-file into the other Talim web apps (see README.md).
 * No app imports here: only the platform (MediaRecorder, File).
 */

/**
 * The attachment families the chat API knows.
 * @typedef {"image" | "video" | "audio" | "document" | "file"} AttachmentKind
 */

/**
 * A message attachment as the chat API sends it (`MessageView.attachments[]`).
 * @typedef {object} ChatKitAttachment
 * @property {string} url
 * @property {AttachmentKind | string} [type]
 * @property {string} [playbackUrl] Audio only: an MP3 of a WebM/Ogg/WAV note. Play this when present.
 * @property {string} [name]
 * @property {string} [mimeType]
 * @property {number} [size]
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [duration]
 */

/**
 * What `send-chat-message` expects for each attachment.
 * @typedef {object} SendableAttachment
 * @property {string} url
 * @property {string} name
 * @property {string} mimeType
 * @property {number} size
 * @property {AttachmentKind} type
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [duration]
 */

// ─── Limits ─────────────────────────────────────────────────────────────────

export const MAX_FILES_PER_MESSAGE = 10;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_OTHER_BYTES = 25 * 1024 * 1024;
/** Longest voice note, in seconds. */
export const MAX_VOICE_SECONDS = 5 * 60;
/** Shortest voice note worth sending, in seconds. */
export const MIN_VOICE_SECONDS = 1;

/** The backend's extension allowlist for `POST /upload/chat-attachment`. */
export const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "zip", "rar",
  "mp4", "mp3", "m4a", "aac", "wav", "webm", "ogg",
];

/** `accept` for the composer's file input. */
export const ATTACHMENT_ACCEPT = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

/** `accept` for picking a group picture. */
export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp";

export const UNSUPPORTED_TYPE_MESSAGE = "This file type isn't supported";
export const TOO_MANY_FILES_MESSAGE = `You can attach up to ${MAX_FILES_PER_MESSAGE} files`;

const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif", "svg"];
const VIDEO_EXT = ["mp4", "mov", "m4v", "avi", "mkv"];
const AUDIO_EXT = ["mp3", "m4a", "aac", "wav", "ogg", "oga", "opus", "webm"];
const DOCUMENT_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods", "odp"];
const DOCUMENT_MIME = /^(application\/(pdf|msword|rtf|vnd\.ms-|vnd\.openxmlformats-officedocument|vnd\.oasis\.opendocument)|text\/(plain|csv))/i;

// ─── Recording ──────────────────────────────────────────────────────────────

/** Recorder formats in order of preference (AAC plays everywhere, iOS included). */
export const RECORDER_MIME_CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/aac",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

/**
 * The first recorder format this browser supports, or `''` to let the
 * browser choose.
 *
 * @param {(mime: string) => boolean} [isTypeSupported] - Defaults to `MediaRecorder.isTypeSupported`.
 * @returns {string}
 */
export function pickRecorderMime(isTypeSupported) {
  const check =
    isTypeSupported ??
    (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function"
      ? (mime) => MediaRecorder.isTypeSupported(mime)
      : undefined);
  if (!check) return "";
  for (const mime of RECORDER_MIME_CANDIDATES) {
    try {
      if (check(mime)) return mime;
    } catch {
      // Some browsers throw for unknown types; try the next one.
    }
  }
  return "";
}

/**
 * The file extension for a recorded audio MIME type. Unknown → `webm`.
 * @param {string | null | undefined} mime
 * @returns {"m4a" | "aac" | "webm" | "ogg"}
 */
export function extensionForMime(mime) {
  const base = (mime ?? "").split(";")[0].trim().toLowerCase();
  if (base === "audio/mp4" || base === "audio/x-m4a" || base === "audio/m4a" || base === "video/mp4") return "m4a";
  if (base === "audio/aac" || base === "audio/x-aac") return "aac";
  if (base === "audio/ogg" || base === "application/ogg") return "ogg";
  return "webm";
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/**
 * Seconds as `m:ss`. NaN, Infinity, negatives and missing values give `0:00`.
 * @param {number | null | undefined} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Bytes as `KB` / `MB` (one decimal under 10).
 * @param {number | null | undefined} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

// ─── Kinds ──────────────────────────────────────────────────────────────────

/**
 * Lower-case extension of a file name or URL (query string ignored), or `''`.
 * @param {string | null | undefined} nameOrUrl
 * @returns {string}
 */
export function fileExtension(nameOrUrl) {
  const clean = (nameOrUrl ?? "").split(/[?#]/)[0];
  const last = clean.split("/").pop() ?? "";
  const dot = last.lastIndexOf(".");
  return dot > 0 && dot < last.length - 1 ? last.slice(dot + 1).toLowerCase() : "";
}

/**
 * @param {string} mime
 * @returns {AttachmentKind | null}
 */
function kindFromMime(mime) {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (DOCUMENT_MIME.test(m)) return "document";
  return null;
}

/**
 * @param {string} ext
 * @returns {AttachmentKind}
 */
function kindFromExtension(ext) {
  if (IMAGE_EXT.includes(ext)) return "image";
  if (VIDEO_EXT.includes(ext)) return "video";
  if (AUDIO_EXT.includes(ext)) return "audio";
  if (DOCUMENT_EXT.includes(ext)) return "document";
  return "file";
}

/**
 * A picked file's kind: MIME type first, then extension.
 * @param {{ type?: string, name?: string }} file
 * @returns {AttachmentKind}
 */
export function fileKind(file) {
  return kindFromMime(file.type ?? "") ?? kindFromExtension(fileExtension(file.name));
}

/** @type {AttachmentKind[]} */
const KINDS = ["image", "video", "audio", "document", "file"];

/**
 * A received attachment's kind: its `type`, then MIME type, then name / URL extension.
 * @param {ChatKitAttachment} attachment
 * @returns {AttachmentKind}
 */
export function attachmentKind(attachment) {
  const given = (attachment.type ?? "").toLowerCase();
  if (given === "voice") return "audio";
  if (KINDS.includes(given) && given !== "file") return given;
  const fromMime = kindFromMime(attachment.mimeType ?? "");
  if (fromMime) return fromMime;
  const ext = fileExtension(attachment.name) || fileExtension(attachment.url);
  return kindFromExtension(ext);
}

/**
 * The largest upload allowed for a kind.
 * @param {AttachmentKind} kind
 * @returns {number}
 */
export function maxBytesFor(kind) {
  if (kind === "image") return MAX_IMAGE_BYTES;
  if (kind === "video") return MAX_VIDEO_BYTES;
  return MAX_OTHER_BYTES;
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Why a file can't be sent, or `null` when it can.
 * @param {{ name: string, size: number, type?: string }} file
 * @returns {string | null}
 */
export function validateFile(file) {
  const ext = fileExtension(file.name);
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return `${file.name}: ${UNSUPPORTED_TYPE_MESSAGE}`;
  }
  const kind = fileKind(file);
  const max = maxBytesFor(kind);
  if (file.size > max) {
    return `${file.name} is too large (max ${Math.round(max / (1024 * 1024))} MB)`;
  }
  if (file.size === 0) return `${file.name} is empty`;
  return null;
}

/**
 * Adds picked files to a selection: rejects unsupported / oversized files
 * and anything past the per-message limit, with one message per problem.
 *
 * @template {{ name: string, size: number, type?: string }} F
 * @param {F[]} current
 * @param {F[]} incoming
 * @returns {{ files: F[], errors: string[] }}
 */
export function addToSelection(current, incoming) {
  const files = [...current];
  const errors = [];
  let overLimit = false;
  for (const file of incoming) {
    const error = validateFile(file);
    if (error) {
      errors.push(error);
      continue;
    }
    if (files.length >= MAX_FILES_PER_MESSAGE) {
      overLimit = true;
      continue;
    }
    files.push(file);
  }
  if (overLimit) errors.push(TOO_MANY_FILES_MESSAGE);
  return { files, errors };
}

/**
 * The message `type` for what is being sent.
 * @param {AttachmentKind[]} kinds
 * @param {boolean} [isVoice]
 * @returns {"text" | "voice" | "image" | "file"}
 */
export function messageTypeFor(kinds, isVoice = false) {
  if (isVoice) return "voice";
  if (kinds.length === 0) return "text";
  if (kinds.every((k) => k === "image")) return "image";
  return "file";
}

/**
 * The size an image / video is shown at inside `maxWidth × maxHeight`,
 * keeping its aspect ratio (never upscaled). `null` without dimensions.
 *
 * @param {number | undefined} width
 * @param {number | undefined} height
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @returns {{ width: number, height: number } | null}
 */
export function fitWithin(width, height, maxWidth, maxHeight) {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * URLs in a piece of text (http/https and `www.`), without duplicates.
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function extractLinks(text) {
  if (!text) return [];
  const found = text.match(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi) ?? [];
  const seen = new Set();
  const links = [];
  for (const raw of found) {
    const trimmed = raw.replace(/[),.;:!?\]]+$/, "");
    const url = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
    if (!seen.has(url)) {
      seen.add(url);
      links.push(url);
    }
  }
  return links;
}
