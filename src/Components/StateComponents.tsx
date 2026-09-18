import type { ReactNode } from 'react';
import { AlertCircle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError, getErrorMessage } from '../lib/apiError';

/**
 * The three states every data-backed section owes the parent: something is
 * loading, something went wrong, or there is genuinely nothing here. A failed
 * request must never leave a spinner spinning.
 */

/** A shimmering placeholder block, sized by the caller. */
export function SkeletonBlock({ className = 'h-24' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * A stack of skeleton cards standing in for a list while it loads.
 *
 * @param props - Component props.
 * @param props.count - How many placeholder rows to draw.
 * @param props.className - Height/shape override for each row.
 * @param props.label - Announced to screen readers while loading.
 * @returns The loading state.
 */
export function LoadingState({
  count = 3,
  className = 'h-24',
  label = 'Loading',
}: {
  count?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} className={className} />
      ))}
    </div>
  );
}

/** A centred spinner for a short, blocking wait. */
export function InlineSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-slate-400" role="status">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

/**
 * Turns a thrown value into the sentence a parent should read.
 *
 * Messages are keyed on `error.code`, never on the human message text, so a
 * wording change on the server cannot silently change what the UI says.
 *
 * @param error - The thrown value.
 * @param fallback - Used when the error carries no code we have wording for.
 * @returns The message to show.
 */
export function messageForError(error: unknown, fallback?: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NETWORK_OFFLINE':
        return "You're offline. Check your connection and try again.";
      case 'REQUEST_TIMEOUT':
        return 'That took too long. Please try again.';
      case 'SERVICE_UNAVAILABLE':
        return "We couldn't reach the school's system. Please try again in a moment.";
      case 'FORBIDDEN':
        return "This isn't available for your account.";
      case 'NOT_FOUND':
        return fallback ?? "We couldn't find that.";
      case 'RATE_LIMITED':
        return "You've tried that a few times. Please wait a moment.";
      case 'UNAUTHENTICATED':
      case 'TOKEN_EXPIRED':
        return 'Your session has expired. Please sign in again.';
      default:
        return error.message;
    }
  }
  return getErrorMessage(error, fallback);
}

/**
 * What a section shows when its request failed, with a way back.
 *
 * @param props - Component props.
 * @param props.error - The thrown value.
 * @param props.onRetry - Called when the parent asks to try again.
 * @param props.title - Heading above the message.
 * @param props.fallback - Message when the error carries no usable one.
 * @returns The error state.
 */
export function ErrorState({
  error,
  onRetry,
  title = "That didn't load",
  fallback,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  fallback?: string;
}) {
  const offline = error instanceof ApiError && error.code === 'NETWORK_OFFLINE';
  const Icon = offline ? WifiOff : AlertCircle;

  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-100 bg-red-50/60 px-6 py-10 text-center dark:border-red-900/40 dark:bg-red-950/20"
    >
      <Icon size={32} className="mx-auto mb-3 text-red-400 dark:text-red-300" aria-hidden="true" />
      <p className="font-semibold text-gray-800 dark:text-slate-100">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-slate-400">
        {messageForError(error, fallback)}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#003366] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003366]/90 focus:outline-none focus:ring-2 focus:ring-[#003366]/40 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

/**
 * What a section shows when the request succeeded and there is nothing in it.
 *
 * @param props - Component props.
 * @param props.icon - Illustration for the state.
 * @param props.title - Headline.
 * @param props.message - Supporting sentence.
 * @param props.action - Optional call to action.
 * @returns The empty state.
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
      {icon && <div className="mb-3 flex justify-center">{icon}</div>}
      <p className="font-semibold text-gray-700 dark:text-slate-200">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400 dark:text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
