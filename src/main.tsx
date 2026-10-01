import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { FIXTURES_ON } from './lib/devFlags';

/**
 * Starts the app. With the dev fixtures on (never in a production build: see
 * `lib/devFlags.ts`), every API call is answered locally first.
 *
 * @returns Resolves once the app has been rendered.
 */
async function start(): Promise<void> {
  if (import.meta.env.DEV && FIXTURES_ON) {
    const { installFixtures } = await import('./dev/fixtures');
    installFixtures({ latencyMs: 250 });
  }

  const container = document.getElementById('root');
  if (!container) throw new Error('index.html is missing its #root element.');

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
