import type { SignInErrorTone } from '../../Components/auth/signin-ui';
import type { LoginOutcome } from '../../types/auth';

/** What every signed-out page of this app says, and how a refusal reads. */

/** The banner a failed sign-in shows. */
export interface Failure {
  tone: SignInErrorTone;
  title?: string;
  message: string;
}

/** The panel and copy every signed-out page of this app shares. */
export const PARENT_PANEL = {
  title: 'Talim Parent Portal',
  text: "Stay connected with your child's school, track their progress, and manage leave requests.",
} as const;

/**
 * Turns a sign-in refusal into the banner's tone: red with a title for a
 * refused account, amber for wrong credentials, grey for anything else.
 *
 * @param outcome - What `login` returned.
 * @returns The banner, or `null` on success.
 */
export function failureOf(outcome: LoginOutcome): Failure | null {
  if (outcome.kind === 'success') return null;
  if (outcome.kind === 'access_denied') return { tone: 'danger', title: 'Access denied', message: outcome.message };
  if (outcome.kind === 'invalid_credentials') return { tone: 'warning', message: outcome.message };
  return { tone: 'neutral', message: outcome.message };
}
