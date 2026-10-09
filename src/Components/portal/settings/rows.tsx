import { useId, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Toggle } from '../ui/primitives';
import { focusRing } from '../ui/styles';

/**
 * A settings row with a switch (the design's `toggleRow`).
 *
 * @param props - Label, description and state.
 * @param props.label - What it switches.
 * @param props.description - What that means.
 * @param props.checked - Whether it is on.
 * @param props.onChange - Called with the new value.
 * @param props.disabled - While loading or saving.
 * @returns The row.
 */
export function ToggleRow({ label, description, checked, onChange, disabled }: { label: string; description: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  const descId = useId();
  return (
    <div className="flex items-center gap-4 border-t border-tl-line-soft py-4">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-tl-ink">{label}</div>
        <div id={descId} className="mt-[3px] text-sm text-tl-muted">
          {description}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} describedBy={descId} disabled={disabled} />
    </div>
  );
}

/**
 * A settings row that opens something (the design's `linkRow`): a button, or
 * with `href` a link to an external page opened in a new tab.
 *
 * @param props - Label, description and action.
 * @param props.label - What it opens.
 * @param props.description - A line under it.
 * @param props.onOpen - Opens it (a button row).
 * @param props.href - The external page (a link row).
 * @returns The row, as a button or a link.
 */
export function LinkRow({ label, description, onOpen, href }: { label: string; description: string; onOpen?: () => void; href?: string }) {
  const className = `flex min-h-[44px] w-full items-center gap-4 border-t border-tl-line-soft py-4 text-left hover:bg-tl-subtle ${focusRing}`;
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-tl-ink">{label}</span>
        <span className="mt-[3px] block text-sm text-tl-muted">{description}</span>
        {href ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-tl-faint" aria-hidden="true" />
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onOpen} className={className}>
      {content}
    </button>
  );
}

/**
 * A settings row that shows a value (the design's `valueRow`), with an
 * optional action beside it.
 *
 * @param props - Label, value and action.
 * @param props.label - What it is.
 * @param props.value - Its value.
 * @param props.action - A button beside the value.
 * @returns The row.
 */
export function ValueRow({ label, value, action }: { label: string; value: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-tl-line-soft py-4">
      <div className="min-w-0 flex-1 text-[15px] font-bold text-tl-ink">{label}</div>
      <div className="shrink-0 text-[15px] font-bold text-tl-muted">{value}</div>
      {action}
    </div>
  );
}
