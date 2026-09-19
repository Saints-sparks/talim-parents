import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_VISIBLE_TOASTS,
  TOAST_DEDUPE_MS,
  ToastManager,
  normalizeToastOptions,
  toast,
  toastManager,
} from '../toastManager';

describe('ToastManager', () => {
  let manager: ToastManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    manager = new ToastManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues newest first and gives each toast its own id', () => {
    manager.addToast({ type: 'success', message: 'one' });
    manager.addToast({ type: 'error', message: 'two' });
    const queue = manager.getSnapshot();
    expect(queue.map((t) => t.message)).toEqual(['two', 'one']);
    expect(new Set(queue.map((t) => t.id)).size).toBe(2);
  });

  it('drops an identical toast raised inside the dedupe window', () => {
    manager.addToast({ type: 'success', message: 'Saved' });
    vi.advanceTimersByTime(TOAST_DEDUPE_MS - 1);
    manager.addToast({ type: 'success', message: 'Saved' });
    expect(manager.getSnapshot()).toHaveLength(1);
  });

  it('shows the same toast again once the window has passed', () => {
    manager.addToast({ type: 'success', message: 'Saved' });
    vi.advanceTimersByTime(TOAST_DEDUPE_MS);
    manager.addToast({ type: 'success', message: 'Saved' });
    expect(manager.getSnapshot()).toHaveLength(2);
  });

  it('does not treat a different type or title as a duplicate', () => {
    manager.addToast({ type: 'success', message: 'Saved' });
    manager.addToast({ type: 'error', message: 'Saved' });
    manager.addToast({ type: 'error', message: 'Saved', title: 'Oops' });
    expect(manager.getSnapshot()).toHaveLength(3);
  });

  it('keeps only the newest five', () => {
    for (let i = 0; i < MAX_VISIBLE_TOASTS + 3; i += 1) {
      manager.addToast({ type: 'info', message: `m${i}` });
    }
    const queue = manager.getSnapshot();
    expect(queue).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(queue[0].message).toBe(`m${MAX_VISIBLE_TOASTS + 2}`);
    expect(queue.some((t) => t.message === 'm0')).toBe(false);
  });

  it('removes a toast by id and ignores unknown ids', () => {
    manager.addToast({ type: 'info', message: 'a' });
    manager.addToast({ type: 'info', message: 'b' });
    const [newest, oldest] = manager.getSnapshot();
    manager.removeToast(newest.id);
    expect(manager.getSnapshot()).toEqual([oldest]);
    manager.removeToast('nope');
    expect(manager.getSnapshot()).toEqual([oldest]);
  });

  it('notifies subscribers until they unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    manager.addToast({ type: 'info', message: 'a' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    manager.addToast({ type: 'info', message: 'b' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('normalizeToastOptions', () => {
  it('reads a string as the title', () => {
    expect(normalizeToastOptions('Heads up', 2000)).toEqual({ title: 'Heads up', duration: 2000 });
  });

  it('reads an options object, preferring its own duration', () => {
    const onClick = vi.fn();
    expect(normalizeToastOptions({ title: 'T', duration: 1, onClick }, 9)).toEqual({
      title: 'T',
      duration: 1,
      onClick,
    });
  });

  it('falls back to the positional duration', () => {
    expect(normalizeToastOptions({ title: 'T' }, 9).duration).toBe(9);
  });
});

describe('toast()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    toastManager.getSnapshot().forEach((t) => toastManager.removeToast(t.id));
    vi.useRealTimers();
  });

  it('keeps the public call shapes: bare = info, title string, options object', () => {
    toast('plain');
    vi.advanceTimersByTime(TOAST_DEDUPE_MS);
    toast.success('done', 'Saved', 1500);
    vi.advanceTimersByTime(TOAST_DEDUPE_MS);
    toast.error('bad', { title: 'Oops', duration: 800 });
    vi.advanceTimersByTime(TOAST_DEDUPE_MS);
    toast.warning('careful');
    vi.advanceTimersByTime(TOAST_DEDUPE_MS);
    toast.info('fyi');

    const [info, warning, error, success, bare] = toastManager.getSnapshot();
    expect(bare).toMatchObject({ type: 'info', message: 'plain' });
    expect(success).toMatchObject({ type: 'success', message: 'done', title: 'Saved', duration: 1500 });
    expect(error).toMatchObject({ type: 'error', message: 'bad', title: 'Oops', duration: 800 });
    expect(warning).toMatchObject({ type: 'warning', message: 'careful' });
    expect(info).toMatchObject({ type: 'info', message: 'fyi' });
  });
});
