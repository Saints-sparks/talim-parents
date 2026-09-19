import { useEffect, useState } from 'react';
import { toast, toastManager, type ToastItem } from '../lib/toastManager';

/** What `useToast()` returns. */
export interface UseToastResult {
  /** The function that raises toasts; same as the module-level `toast`. */
  toast: typeof toast;
  /** The toasts currently queued, newest first. */
  toasts: ToastItem[];
  /** Removes one toast by id. */
  removeToast: (id: string) => void;
}

/**
 * Subscribes a component to the toast queue.
 *
 * @returns The queue, the `toast` function and a remover.
 */
export function useToast(): UseToastResult {
  const [toasts, setToasts] = useState<ToastItem[]>(toastManager.getSnapshot);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    // Anything queued between the first render and this effect.
    setToasts(toastManager.getSnapshot());
    return unsubscribe;
  }, []);

  return { toast, toasts, removeToast: toastManager.removeToast };
}
