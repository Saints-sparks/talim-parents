/**
 * Dev-only switches. Each is `false` in a production build: Vite replaces
 * `import.meta.env.DEV` with `false` there, so whatever a flag guards is
 * removed from the bundle.
 */

/**
 * True when the app answers its API calls from `src/dev/fixtures` instead of
 * the network (`VITE_USE_FIXTURES=true` with `npm run dev`). The Part B and C
 * routes are being built in parallel; the fixtures stand in until they land.
 */
export const FIXTURES_ON: boolean = import.meta.env.DEV && import.meta.env.VITE_USE_FIXTURES === 'true';
