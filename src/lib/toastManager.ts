/**
 * The toast store. It lives outside React so any module (a service, a socket
 * handler, a mutation callback) can raise a toast; `ToastViewport` subscribes
 * and renders whatever is queued.
 */

/** The four kinds of toast. `info` is what a bare `toast(message)` shows. */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** What a caller may pass in place of the positional `duration`. */
export interface ToastOptions {
  /** Bold first line above the message. */
  title?: string;
  /** How long the toast stays, in milliseconds. */
  duration?: number;
  /** Makes the whole body clickable; the toast closes after it runs. */
  onClick?: () => void;
}

/** A toast waiting to be shown, before the manager gives it an id. */
export interface ToastInput extends ToastOptions {
  type: ToastType;
  message: string;
}

/** A toast in the queue. */
export interface ToastItem extends ToastInput {
  id: string;
}

type Listener = (toasts: ToastItem[]) => void;

/** A repeat of the last toast inside this window is dropped. */
export const TOAST_DEDUPE_MS = 1000;
/** The newest toasts kept on screen; older ones are pushed out. */
export const MAX_VISIBLE_TOASTS = 5;
/** How long a toast stays when the caller does not say. */
export const DEFAULT_TOAST_DURATION_MS = 4000;

/**
 * A toast queue with duplicate suppression and a visible-count cap.
 */
export class ToastManager {
  private listeners = new Set<Listener>();
  private toasts: ToastItem[] = [];
  private lastToast: { type: ToastType; message: string; title?: string; time: number } | null = null;
  private counter = 0;

  /**
   * Listens for queue changes.
   *
   * @param listener - Called with the queue after every change.
   * @returns A function that stops listening.
   */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * The queue as it stands, newest first.
   *
   * @returns The visible toasts.
   */
  getSnapshot = (): ToastItem[] => this.toasts;

  /**
   * Queues a toast, unless it repeats the previous one within
   * {@link TOAST_DEDUPE_MS}. Only the newest {@link MAX_VISIBLE_TOASTS} stay.
   *
   * @param input - The toast to show.
   */
  addToast = (input: ToastInput): void => {
    const now = Date.now();
    const last = this.lastToast;
    const isDuplicate =
      last !== null &&
      last.type === input.type &&
      last.message === input.message &&
      last.title === input.title &&
      now - last.time < TOAST_DEDUPE_MS;
    if (isDuplicate) return;

    this.counter += 1;
    this.lastToast = { type: input.type, message: input.message, title: input.title, time: now };
    this.toasts = [{ ...input, id: `toast-${this.counter}` }, ...this.toasts].slice(0, MAX_VISIBLE_TOASTS);
    this.emit();
  };

  /**
   * Takes a toast off the queue. Unknown ids are ignored.
   *
   * @param id - The toast's id.
   */
  removeToast = (id: string): void => {
    this.toasts = this.toasts.filter((item) => item.id !== id);
    this.emit();
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.toasts));
  }
}

/** The app-wide queue. */
export const toastManager = new ToastManager();

/**
 * Reads the second argument of `toast(message, titleOrOptions, duration)`,
 * which is either a title string or an options object.
 *
 * @param titleOrOptions - A title, or the options.
 * @param duration - The positional duration, used when the options carry none.
 * @returns The options to queue with.
 */
export function normalizeToastOptions(
  titleOrOptions?: string | ToastOptions,
  duration?: number,
): ToastOptions {
  if (typeof titleOrOptions === 'string') return { title: titleOrOptions, duration };
  return {
    title: titleOrOptions?.title,
    duration: titleOrOptions?.duration ?? duration,
    onClick: titleOrOptions?.onClick,
  };
}

/** Signature shared by `toast` and each of its variants. */
export type ToastFn = (message: string, titleOrOptions?: string | ToastOptions, duration?: number) => void;

/**
 * Builds the function for one toast type.
 *
 * @param type - The kind of toast it raises.
 * @returns A function with the public `toast` signature.
 */
function createToastFn(type: ToastType): ToastFn {
  return (message, titleOrOptions, duration) => {
    toastManager.addToast({ type, message, ...normalizeToastOptions(titleOrOptions, duration) });
  };
}

/**
 * Raises a toast from anywhere. Calling it directly shows an info toast;
 * `.success`, `.error`, `.warning` and `.info` pick the kind.
 */
export const toast: ToastFn & Record<ToastType, ToastFn> = Object.assign(createToastFn('info'), {
  success: createToastFn('success'),
  error: createToastFn('error'),
  warning: createToastFn('warning'),
  info: createToastFn('info'),
});
