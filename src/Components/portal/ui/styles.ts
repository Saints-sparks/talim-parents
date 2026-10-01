/**
 * Shared class strings for the parent portal redesign (Talim Parent
 * Portal.dc.html): buttons, cards, pills, fields. Colours come from the
 * `tl-*` tokens in `src/index.css`, which switch with the dark theme, so
 * nothing here needs a `dark:` variant. Ported from Talim-Teachers'
 * `components/tl/styles.ts`, so the three portals look alike.
 */

/** Keyboard focus ring for every interactive element. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-link focus-visible:ring-offset-2 focus-visible:ring-offset-tl-surface';

/** The navy primary button. */
export const primaryButton = `inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-tl-brand-fill px-5 py-3 text-sm font-bold text-tl-on-brand transition-colors hover:bg-tl-brand-fill-hover disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`;

/** The outlined secondary button. */
export const ghostButton = `inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border border-tl-control bg-tl-surface px-5 py-3 text-sm font-bold text-tl-brand transition-colors hover:bg-tl-bg disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`;

/** The small outlined action on rows ("Edit", "View breakdown"). */
export const rowButton = `inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-xl border border-tl-control px-3.5 py-2 text-[13px] font-bold text-tl-brand transition-colors hover:bg-tl-bg disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`;

/** The red outlined button ("Delete", "Sign out"). */
export const dangerGhostButton = `inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-xl border border-tl-danger/30 px-3.5 py-2 text-[13px] font-bold text-tl-danger transition-colors hover:bg-tl-danger-bg disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`;

/** A text link with an arrow ("Full week →"). */
export const textLink = `inline-flex min-h-[44px] items-center whitespace-nowrap rounded-md text-sm font-bold text-tl-link hover:underline ${focusRing}`;

/** The white card (radius 22, soft shadow). */
export const card =
  'rounded-[22px] border border-tl-line bg-tl-surface p-[clamp(18px,2.4vw,24px)] shadow-[0_1px_2px_rgba(15,27,46,0.04),0_14px_30px_-22px_rgba(15,27,46,0.1)] dark:shadow-none';

/** The card's frame without padding, for cards whose rows run edge to edge. */
export const cardFrame =
  'overflow-hidden rounded-[22px] border border-tl-line bg-tl-surface shadow-[0_1px_2px_rgba(15,27,46,0.04)] dark:shadow-none';

/** A clickable metric tile (radius 20). */
export const tile = `rounded-[20px] border border-tl-line bg-tl-surface p-5 text-left shadow-[0_1px_2px_rgba(15,27,46,0.04)] transition-colors hover:border-tl-control dark:shadow-none ${focusRing}`;

/** The tinted stat box inside cards. */
export const statBox = 'rounded-2xl border border-tl-line-soft bg-tl-subtle p-4';

/** Page heading (clamp 24–32px, 800). */
export const pageTitle = 'm-0 text-[clamp(24px,3.4vw,32px)] font-extrabold tracking-[-0.6px] text-tl-ink';

/** The line under a page heading. */
export const pageSubtitle = 'mt-1.5 text-[15px] text-tl-muted';

/** Card heading (19px, 800). */
export const cardTitle = 'text-[19px] font-extrabold tracking-[-0.3px] text-tl-ink';

/** Small uppercase label. */
export const eyebrow = 'text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint';

/** A rounded pill; add a {@link pillTone}. */
export const pill = 'inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold';

/** Colour classes for a {@link pill}, by meaning. */
export const pillTone = {
  success: 'bg-tl-success-bg text-tl-success',
  warning: 'bg-tl-warning-bg text-tl-warning',
  danger: 'bg-tl-danger-bg text-tl-danger',
  info: 'bg-tl-info-bg text-tl-info',
  accent: 'bg-tl-accent-bg text-tl-accent',
  muted: 'bg-tl-track text-tl-muted',
  brand: 'bg-tl-select text-tl-brand',
} as const;

/** A tone of {@link pillTone}. */
export type Tone = keyof typeof pillTone;

/** The small count badge on nav items and tabs (white on the darkened orange). */
export const countBadge = 'inline-flex min-w-[20px] items-center justify-center rounded-[9px] bg-tl-badge px-[7px] py-px text-xs font-extrabold text-white';

/** A labelled form control (input, select). */
export const fieldControl = `min-h-[46px] w-full rounded-[13px] border border-tl-control bg-tl-surface px-3.5 text-[15px] font-semibold text-tl-ink placeholder:font-normal placeholder:text-tl-faint disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-tl-danger ${focusRing}`;

/** The label above a {@link fieldControl}. */
export const fieldLabel = 'mb-[7px] block text-[13px] font-extrabold text-tl-muted';

/** A field's error line. */
export const fieldError = 'mt-1.5 text-[13px] font-semibold text-tl-danger';

/** A field's lasting hint. */
export const fieldHint = 'mt-1.5 text-xs text-tl-faint';

/** Page padding and width inside the shell. */
export const pagePad = 'w-full max-w-[1460px] px-[clamp(14px,3vw,26px)] pb-12 pt-[clamp(18px,3vw,28px)]';

/**
 * A selectable chip (filters, session and term choices).
 *
 * @param on - Whether it is the selected one.
 * @returns The class string.
 */
export function chip(on: boolean): string {
  return `inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition-colors ${focusRing} ${
    on ? 'border-tl-brand-fill bg-tl-brand-fill text-tl-on-brand' : 'border-tl-line bg-tl-surface text-tl-muted hover:text-tl-ink'
  }`;
}

/**
 * One underline tab (Payments' Due fees / History / Receipts / Methods).
 *
 * @param on - Whether it is the selected one.
 * @returns The class string.
 */
export function underlineTab(on: boolean): string {
  return `inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-[3px] px-1 py-3 text-[15px] font-bold ${focusRing} ${
    on ? 'border-tl-brand text-tl-brand' : 'border-transparent text-tl-muted hover:text-tl-ink'
  }`;
}

/**
 * A selectable option card (checkout's pay mode and methods).
 *
 * @param on - Whether it is the selected one.
 * @returns The class string.
 */
export function optionCard(on: boolean): string {
  return `rounded-[14px] border p-3.5 text-left transition-colors ${focusRing} ${
    on ? 'border-tl-brand bg-tl-select' : 'border-tl-control bg-tl-surface hover:border-tl-brand/50'
  }`;
}
