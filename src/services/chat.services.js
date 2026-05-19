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
  if (!file.type.startsWith("image/")) return file;

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

export const uploadChatAttachment = async (file) => {
  const uploadFile = file.type.startsWith("image/") ? await compressImageAttachment(file) : file;
  const formData = new FormData();
  formData.append("file", uploadFile);

  const response = await axios.post(`${API_BASE_URL}/upload/chat-attachment`, formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

  return {
    ...response.data,
    name: response.data?.name || file.name,
    mimeType: response.data?.mimeType || uploadFile.type,
    size: response.data?.size || uploadFile.size,
    type:
      response.data?.type ||
      (uploadFile.type.startsWith("image/")
        ? "image"
        : uploadFile.type.startsWith("audio/")
        ? "audio"
        : uploadFile.type.startsWith("video/")
        ? "video"
        : "file"),
  };
};
