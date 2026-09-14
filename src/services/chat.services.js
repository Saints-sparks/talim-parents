import axios from "axios";
import { API_BASE_URL } from "./auth.services";

const MAX_IMAGE_EDGE = 1600;
const IMAGE_QUALITY = 0.82;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
});

const readImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

const canvasToBlob = (canvas) =>
  new Promise((resolve) => {
    canvas.toBlob(resolve, "image/webp", IMAGE_QUALITY);
  });

export const compressImageAttachment = async (file) => {
  // GIFs would lose their animation on a canvas.
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  const image = await readImage(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToBlob(canvas);
  URL.revokeObjectURL(image.src);

  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
};

/**
 * Uploads one chat attachment (`POST /upload/chat-attachment`). Matches the chat
 * kit's upload function: `onProgress` gets 0–1 while the file is sent.
 *
 * @param {File} file
 * @param {(fraction: number) => void} [onProgress]
 * @returns {Promise<{ url: string, name: string, mimeType: string, size: number, type?: string, width?: number, height?: number, duration?: number }>}
 */
export const uploadChatAttachment = async (file, onProgress) => {
  const uploadFile = await compressImageAttachment(file);
  const formData = new FormData();
  formData.append("file", uploadFile);

  const response = await axios.post(`${API_BASE_URL}/upload/chat-attachment`, formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(event.loaded / event.total);
    },
  });

  // The kit works out `type` from the file when the server doesn't send one.
  return {
    ...response.data,
    name: response.data?.name || file.name,
    mimeType: response.data?.mimeType || uploadFile.type,
    size: response.data?.size || uploadFile.size,
  };
};

/** Removes a member from a group. A member removing themselves leaves the group. */
export const removeChatParticipant = async (roomId, userId) => {
  const response = await axios.patch(
    `${API_BASE_URL}/chat/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(userId)}/remove`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};
