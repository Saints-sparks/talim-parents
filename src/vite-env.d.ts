/// <reference types="vite/client" />

/** The environment variables Vite inlines at build time. */
interface ImportMetaEnv {
  /** Origin of the Talim API, e.g. `https://talim-be-dev.onrender.com`. Required. */
  readonly VITE_API_BASE_URL: string;
  /** When `"true"`, `logger` keeps printing in a production build. */
  readonly VITE_DEBUG_LOGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
