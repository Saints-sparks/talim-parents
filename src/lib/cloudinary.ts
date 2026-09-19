/**
 * Direct-to-Cloudinary image upload for avatars.
 *
 * This is the one place the app talks to a host other than the Talim API, so it
 * uses `fetch` on purpose: Cloudinary's unsigned upload takes a multipart form
 * and answers in its own shape, not the API's `{ success, data }` envelope, and
 * must never be sent our bearer token.
 *
 * The cloud name and preset come from the environment
 * (`VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`); when either
 * is missing the upload UI is hidden instead of failing at the click.
 */

/** Largest avatar the server accepts on `PUT /auth/profile/avatar`. */
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

const UPLOAD_TIMEOUT_MS = 60_000;

/** Which Cloudinary account and preset uploads go to. */
export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

/** Raised for a failed upload, with a sentence safe to show a parent. */
export class ImageUploadError extends Error {
  /**
   * @param message - What to tell the parent.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

/**
 * The configured Cloudinary target.
 *
 * @returns The account and preset, or `null` when the deployment has none.
 */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();
  return cloudName && uploadPreset ? { cloudName, uploadPreset } : null;
}

/**
 * Checks a chosen file before any bytes leave the device.
 *
 * @param file - The file the parent picked.
 * @returns A message to show, or `null` when the file is acceptable.
 */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file (JPG, PNG or GIF).';
  if (file.size > MAX_AVATAR_BYTES) return 'That image is too large. Please choose one under 10 MB.';
  return null;
}

/**
 * Uploads an image and returns its hosted URL.
 *
 * @param file - A validated image file.
 * @returns The `https` URL Cloudinary serves the image from.
 * @throws {ImageUploadError} When uploads are not configured, the network fails,
 *   or Cloudinary rejects the file.
 */
export async function uploadImage(file: File): Promise<string> {
  const config = getCloudinaryConfig();
  if (!config) throw new ImageUploadError('Photo upload is not available right now.');

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', config.uploadPreset);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (!response.ok || !body.secure_url) {
      throw new ImageUploadError(body.error?.message || 'The image could not be uploaded.');
    }
    return body.secure_url;
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ImageUploadError('The upload took too long. Please try again.');
    }
    throw new ImageUploadError("We couldn't reach the image host. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}
