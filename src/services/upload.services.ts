import { apiClient } from '../lib/apiClient';

/** What the upload endpoints return. */
export interface UploadedFile {
  url: string;
  [key: string]: unknown;
}

/**
 * Uploads a supporting document and returns the URL to reference it by.
 *
 * `POST /upload/file` accepts pdf, doc(x), xls(x), ppt(x), txt, csv, zip, rar,
 * mp4 and mp3 up to the server's size limit, and answers `{ url }`.
 *
 * @param file - The chosen file.
 * @param onProgress - Called with 0–1 as the bytes go out.
 * @returns The stored file's URL.
 * @throws {ApiError} `PAYLOAD_TOO_LARGE` when the file is over the limit,
 *   `BAD_REQUEST` when the type is not accepted.
 */
export function uploadFile(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.upload<UploadedFile>('/upload/file', formData, onProgress);
}
