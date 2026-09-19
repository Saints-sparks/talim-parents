import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../hooks/useToast';
import Toast from './Toast';

/**
 * Renders the queued toasts in a portal at the top of the screen. Mount it once,
 * near the root of the app.
 *
 * @returns The portal, or nothing before the first client render.
 */
export function ToastViewport() {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed left-1/2 top-5 z-[9999] -translate-x-1/2">
      <div className="pointer-events-auto flex max-h-screen flex-col items-center overflow-hidden">
        {toasts.map((item) => (
          <Toast key={item.id} {...item} onClose={removeToast} />
        ))}
      </div>
    </div>,
    document.body,
  );
}
