import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { uninstallAllFixtures } from './fixtureRegistry';

// jsdom has no ResizeObserver; several chart and calendar components need one.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof matchMedia;

// jsdom does not scroll; the body-scroll lock restores the position on close.
window.scrollTo = (() => undefined) as typeof window.scrollTo;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  uninstallAllFixtures();
  vi.restoreAllMocks();
});
