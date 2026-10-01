import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll';
import { eyebrow, focusRing } from './styles';

/** What can take keyboard focus inside a dialog. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The elements of a container a keyboard user can reach, in order.
 *
 * @param container - The dialog panel.
 * @returns The focusable elements.
 */
function focusablesIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.hasAttribute('inert') && element.getAttribute('aria-hidden') !== 'true',
  );
}

/** Props for {@link Dialog}. */
export interface DialogProps {
  open: boolean;
  /** Called on Escape, the backdrop, or a close button inside. */
  onClose: () => void;
  /** The id of the dialog's title. */
  labelledBy: string;
  /** The id of the line that describes the dialog, if any. */
  describedBy?: string;
  /** Where focus goes when it opens; the first focusable element otherwise. */
  initialFocus?: RefObject<HTMLElement>;
  /** Classes for the panel (width, padding). */
  className?: string;
  children: ReactNode;
}

/**
 * An accessible modal: `role="dialog"` with `aria-modal`, focus moved in on
 * open and trapped inside (Tab and Shift+Tab wrap), Escape and the backdrop
 * close it, focus returns to whatever opened it, and the page behind is
 * locked. Rendered into `document.body` so no card's overflow clips it.
 *
 * @param props - See {@link DialogProps}.
 * @returns The dialog, or nothing while closed.
 */
export function Dialog({ open, onClose, labelledBy, describedBy, initialFocus, className = '', children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel) {
      const target = initialFocus?.current ?? focusablesIn(panel)[0] ?? panel;
      target.focus();
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = focusablesIn(panelRef.current);
      if (items.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener && document.contains(opener)) opener.focus();
    };
    // Focus moves in once per opening; a new `initialFocus` ref mid-dialog must not steal it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(15,27,46,0.45)] sm:items-center sm:p-5 print:hidden"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`max-h-[88vh] w-full overflow-y-auto rounded-t-[24px] bg-tl-surface p-[clamp(22px,3vw,30px)] text-tl-ink shadow-[0_30px_70px_-30px_rgba(15,27,46,0.45)] focus:outline-none sm:rounded-[24px] dark:border dark:border-tl-line ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Props for {@link Sheet}. */
export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Small uppercase line above the title. */
  eyebrowText?: ReactNode;
  title: ReactNode;
  /** One or two lines under the title; also the dialog's description. */
  subtitle?: ReactNode;
  children?: ReactNode;
  /** Buttons along the bottom. */
  footer?: ReactNode;
  /** Panel width: 560px (the design's sheets) or 520px (checkout). */
  width?: 'sheet' | 'checkout';
  initialFocus?: RefObject<HTMLElement>;
}

/**
 * The design's sheet: eyebrow, title, subtitle and a close button over the
 * content, with the actions along the bottom. A bottom sheet on phones and a
 * centred dialog from `sm`.
 *
 * @param props - See {@link SheetProps}.
 * @returns The sheet.
 */
export function Sheet({ open, onClose, eyebrowText, title, subtitle, children, footer, width = 'sheet', initialFocus }: SheetProps) {
  const titleId = useId();
  const subtitleId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={subtitle ? subtitleId : undefined}
      initialFocus={initialFocus}
      className={width === 'checkout' ? 'sm:max-w-[520px]' : 'sm:max-w-[560px]'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrowText ? <div className={eyebrow}>{eyebrowText}</div> : null}
          <h2 id={titleId} className="mt-1.5 text-[21px] font-extrabold leading-tight tracking-[-0.4px] text-tl-ink">
            {title}
          </h2>
          {subtitle ? (
            <p id={subtitleId} className="mt-1 text-[13px] leading-[1.55] text-tl-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tl-faint hover:bg-tl-bg hover:text-tl-ink ${focusRing}`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {children ? <div className="mt-[18px] flex flex-col gap-[18px]">{children}</div> : null}
      {footer ? <div className="mt-[22px] flex flex-wrap gap-2.5">{footer}</div> : null}
    </Dialog>
  );
}

/** Props for {@link SheetRow}. */
export interface SheetRowProps {
  label: ReactNode;
  description?: ReactNode;
  /** The action (a button or link styled with `rowButton`). */
  action: ReactNode;
}

/**
 * A bordered row with a label, a description and one action (the design's
 * `sheet.rows`: "Call the office · Call").
 *
 * @param props - See {@link SheetRowProps}.
 * @returns The row.
 */
export function SheetRow({ label, description, action }: SheetRowProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-tl-line-soft px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-tl-ink">{label}</div>
        {description ? <div className="mt-[3px] break-words text-[13px] text-tl-muted">{description}</div> : null}
      </div>
      {action}
    </div>
  );
}
