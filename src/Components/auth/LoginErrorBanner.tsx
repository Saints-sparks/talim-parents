import type { LoginOutcome } from '../../types/auth';
import { AlertCircleIcon, ShieldAlertIcon } from './AuthIcons';

/** Any sign-in result that is not a success. */
export type LoginFailure = Exclude<LoginOutcome, { kind: 'success' }>;

/**
 * The message under the sign-in heading, styled by what went wrong. The text
 * is always the one the auth context produced from the error's code.
 *
 * @param props - Component props.
 * @param props.error - The failed sign-in result.
 * @returns The banner.
 */
export default function LoginErrorBanner({ error }: { error: LoginFailure }) {
  if (error.kind === 'access_denied') {
    return (
      <div role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
        <div className="flex items-start gap-3">
          <ShieldAlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Access denied</p>
            <p className="mt-1 text-xs leading-relaxed text-red-600 dark:text-red-300/90">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error.kind === 'invalid_credentials') {
    return (
      <div role="alert" className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
        <div className="flex items-start gap-3">
          <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-700 dark:text-amber-200">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div role="alert" className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-start gap-3">
        <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
        <p className="text-sm text-gray-600 dark:text-slate-300">{error.message}</p>
      </div>
    </div>
  );
}
