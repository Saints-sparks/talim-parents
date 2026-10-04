/**
 * Dev-only switches. Each is `false` in a production build: Vite replaces
 * `import.meta.env.DEV` with `false` there, so whatever a flag guards is
 * removed from the bundle.
 */

/**
 * True when the app answers its API calls from `src/dev/fixtures` instead of
 * the network (`VITE_USE_FIXTURES=true` with `npm run dev`), in the shapes of
 * the generated contract. Off, the app talks to `VITE_API_BASE_URL`; the
 * fixtures also back the test suite (`src/test-utils/portal.tsx`).
 */
export const FIXTURES_ON: boolean = import.meta.env.DEV && import.meta.env.VITE_USE_FIXTURES === 'true';
