/**
 * Deployment configuration.
 *
 * The API origin comes from the environment so each deployment (local,
 * preview, production) points at its own backend. Vite inlines `VITE_*` at
 * build time, and `vite.config.ts` refuses to build without it — this module
 * is the runtime backstop for anyone who bypasses that (e.g. `vitest`).
 */
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!configuredApiBaseUrl) {
  throw new Error(
    'VITE_API_BASE_URL is not set. Copy .env.example to .env for local development, or set it in the deployment environment.',
  );
}

/** Origin of the Talim API, with any trailing slashes removed. */
export const API_BASE_URL: string = configuredApiBaseUrl.replace(/\/+$/, '');
