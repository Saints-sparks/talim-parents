import { type ReactNode } from 'react';
import { AlertCircle, Inbox, School, UserRoundX } from 'lucide-react';
import { getErrorMessage } from '../../../lib/apiError';
import { initialsOf } from '../../../lib/format';
import { card, focusRing, ghostButton, pageSubtitle, pageTitle, pill, pillTone, primaryButton, type Tone } from './styles';

/**
 * A stable avatar tone (`tl-tone-N`) for an id, so a child or a person has the
 * same colour on every screen.
 *
 * @param id - A stable id.
 * @returns The tone class.
 */
export function toneOf(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `tl-tone-${hash % 6}`;
}

/**
 * A round avatar: the photo when there is one, else initials on the person's
 * tone. Decorative: the name is always written beside it.
 *
 * @param props - The person and the size.
 * @param props.id - Stable id, for the tone.
 * @param props.name - Full name, for the initials.
 * @param props.src - Photo URL, if any.
 * @param props.size - Diameter in px.
 * @returns The avatar.
 */
export function Avatar({ id, name, src, size = 38 }: { id: string; name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size / 2.9) };
  if (src) return <img src={src} alt="" aria-hidden="true" style={style} className="shrink-0 rounded-full object-cover" />;
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`${toneOf(id)} flex shrink-0 items-center justify-center rounded-full bg-tone-bg font-extrabold text-tone-fg`}
    >
      {initialsOf(name)}
    </span>
  );
}

/**
 * A pill in one of the status tones.
 *
 * @param props - The tone and the text.
 * @param props.tone - The meaning.
 * @param props.children - The label.
 * @param props.className - Extra classes.
 * @returns The pill.
 */
export function Pill({ tone, children, className = '' }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={`${pill} ${pillTone[tone]} ${className}`}>{children}</span>;
}

/**
 * A small coloured dot in front of a row (decorative).
 *
 * @param props - The tone class.
 * @param props.className - A `bg-…` class.
 * @returns The dot.
 */
export function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={`inline-block h-[9px] w-[9px] shrink-0 rounded-full ${className}`} />;
}

/**
 * The page's heading and the line under it.
 *
 * @param props - Title, subtitle and actions.
 * @param props.title - The page's one `h1`.
 * @param props.subtitle - The grey line under it.
 * @param props.actions - Buttons on the right.
 * @returns The header.
 */
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4" data-print-hide="1">
      <div className="min-w-0">
        <h1 className={pageTitle}>{title}</h1>
        {subtitle ? <p className={pageSubtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}

/**
 * An on/off switch with a 44px target, read out as a switch.
 *
 * @param props - State, label and change handler.
 * @param props.checked - Whether it is on.
 * @param props.onChange - Called with the new value.
 * @param props.label - The accessible name.
 * @param props.disabled - While saving.
 * @param props.describedBy - The id of the description line.
 * @returns The switch.
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  describedBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex min-h-[44px] min-w-[56px] shrink-0 items-center justify-center rounded-full disabled:opacity-50 ${focusRing}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-[29px] w-[50px] rounded-[15px] p-[3px] transition-colors ${checked ? 'justify-end bg-tl-brand-fill' : 'justify-start bg-tl-faint'}`}
      >
        <span className="h-[23px] w-[23px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
      </span>
    </button>
  );
}

/**
 * Grey placeholder blocks while a card loads.
 *
 * @param props - How many rows and the accessible label.
 * @param props.rows - Number of bars.
 * @param props.label - What is loading, for screen readers.
 * @returns The skeleton.
 */
export function LoadingCard({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className={card} role="status" aria-busy="true" aria-label={label}>
      <div className="flex flex-col gap-3">
        <div className="h-5 w-1/3 animate-pulse rounded-lg bg-tl-track" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-tl-track" />
        ))}
      </div>
    </div>
  );
}

/**
 * A card that says there is nothing here yet, and why.
 *
 * @param props - Title, message, icon and action.
 * @param props.title - The headline.
 * @param props.message - The explanation.
 * @param props.icon - Replaces the default inbox icon.
 * @param props.action - A button or link.
 * @returns The card.
 */
export function EmptyCard({ title, message, icon, action }: { title: ReactNode; message?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`${card} text-center`}>
      <div className="mx-auto flex h-[54px] w-[54px] items-center justify-center rounded-full bg-tl-track text-tl-muted">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.3px] text-tl-ink">{title}</h2>
      {message ? <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-tl-muted">{message}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * A card that says what failed, with a retry.
 *
 * @param props - The error, title and retry.
 * @param props.error - Whatever was thrown.
 * @param props.title - The headline.
 * @param props.onRetry - Tries again.
 * @returns The card, announced as an alert.
 */
export function ErrorCard({ error, title = "This couldn't be loaded", onRetry }: { error: unknown; title?: string; onRetry?: () => void }) {
  return (
    <div className={`${card} text-center`} role="alert">
      <div className="mx-auto flex h-[54px] w-[54px] items-center justify-center rounded-full bg-tl-danger-bg text-tl-danger">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.3px] text-tl-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-tl-muted">
        {getErrorMessage(error, 'Something went wrong. Check your connection and try again.')}
      </p>
      {onRetry ? (
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={onRetry} className={ghostButton}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The state a child-scoped screen shows when the school has not placed the
 * child in a class yet: nothing class-based (lessons, register, results) can
 * exist, but payments, messages to the office and notifications still work.
 *
 * @param props - The child and what this screen needs a class for.
 * @param props.childName - The child's first name.
 * @param props.what - What is missing ("lessons", "attendance"…).
 * @param props.action - A way forward (message the office).
 * @returns The card.
 */
export function NoClassCard({ childName, what, action }: { childName: string; what: string; action?: ReactNode }) {
  return (
    <EmptyCard
      icon={<School className="h-6 w-6" aria-hidden="true" />}
      title={`${childName} is not in a class yet`}
      message={`The school has linked ${childName} to your account but has not placed them in a class, so there are no ${what} to show. They appear here as soon as the school assigns the class.`}
      action={action}
    />
  );
}

/**
 * The state shown while the parent has no linked child.
 *
 * @param props - The action.
 * @param props.action - "Enter link code".
 * @returns The card.
 */
export function NoChildCard({ action }: { action?: ReactNode }) {
  return (
    <EmptyCard
      icon={<UserRoundX className="h-6 w-6" aria-hidden="true" />}
      title="No child is linked to this account yet"
      message="Ask your child's school office for a student link code, then add the child from Settings › Children."
      action={action}
    />
  );
}

/**
 * A primary-styled link-like button, for the actions inside the state cards.
 *
 * @param props - Label and handler.
 * @param props.children - The label.
 * @param props.onClick - The action.
 * @returns The button.
 */
export function StateAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={primaryButton}>
      {children}
    </button>
  );
}
