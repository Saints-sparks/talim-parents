import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * T4.3: the API origin must come from the environment. Vite inlines `VITE_*`
 * at build time, so a missing value has to fail here — a runtime check would
 * ship a broken bundle to a parent instead.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (!env.VITE_API_BASE_URL) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Copy .env.example to .env for local development, ' +
        "or set it in the deployment's environment variables.",
    );
  }

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-utils/setup.ts'],
      css: false,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
