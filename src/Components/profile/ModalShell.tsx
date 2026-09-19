import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { cn } from '../../lib/utils';

/**
 * The frame every account dialog shares: a dimmed backdrop, a titled card, a
 * close button, Escape to dismiss, and the page behind it locked in place. The
 * card scrolls inside itself when the form is taller than a phone screen.
 *
 * @param props - Component props.
 * @param props.title - The dialog's heading.
 * @param props.onClose - Called on Escape, the close button, or a backdrop tap.
 * @param props.children - The dialog body.
 * @param props.maxWidth - A Tailwind max-width class for the card.
 * @returns The dialog.
 */
export function ModalShell({
  title,
  onClose,
  children,
  maxWidth = 'max-w-md',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  const titleId = useId();
  useLockBodyScroll(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-900',
          maxWidth,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#EEF2F7] px-6 py-4 dark:border-slate-800">
          <h2 id={titleId} className="text-base font-bold text-[#101828] dark:text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] hover:bg-[#F4F8FF] dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
