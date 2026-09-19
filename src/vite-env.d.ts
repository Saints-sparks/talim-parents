/// <reference types="vite/client" />

/** The environment variables Vite inlines at build time. */
interface ImportMetaEnv {
  /** Origin of the Talim API, e.g. `https://talim-be-dev.onrender.com`. Required. */
  readonly VITE_API_BASE_URL: string;
  /** Cloudinary account that hosts avatar uploads. Optional: without it, photo upload is hidden. */
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  /** Unsigned Cloudinary upload preset used for avatar uploads. Optional, like the cloud name. */
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string;
  /** When `"true"`, `logger` keeps printing in a production build. */
  readonly VITE_DEBUG_LOGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
