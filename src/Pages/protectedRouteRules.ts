/** Where {@link decideProtectedRoute} sends the visitor. */
export type ProtectedRouteDecision = 'loading' | 'login' | 'set-password' | 'onboarding' | 'allow';

/** What the decision is made from. */
export interface ProtectedRouteState {
  /** The current location's pathname. */
  pathname: string;
  /** The session token, if the parent is signed in. */
  authToken: string | null;
  /** True while a sign-in or sign-out is in flight. */
  loading: boolean;
  /** True once the checklist has been read from storage. */
  isHydrated: boolean;
  /** True only after the children list loaded cleanly and came back empty. */
  hasNoLinkedWards: boolean;
  /** Whether the "confirm profile" step is done. */
  profileConfirmed: boolean;
  /** Whether a default child has been chosen. */
  wardSelected: boolean;
  /** The account still uses the temporary password the school issued. */
  mustChangePassword?: boolean;
}

/** The screens a parent may open before onboarding is finished. */
const ONBOARDING_PATH = '/onboarding';
const CHILDREN_PATH = '/settings';

/**
 * Decides what the protected area should do for this visitor.
 *
 * Nothing is decided until the session and checklist have loaded; a visitor
 * with no token goes to sign-in; an account still on its temporary password
 * goes to `/set-password`; and anyone who has not confirmed their profile and
 * chosen a child (or has no linked children) is held on `/onboarding`, except
 * that `/onboarding` itself and `/settings` (where a child is linked with a
 * code) stay reachable.
 *
 * @param state - The session, checklist and location.
 * @returns What to render.
 */
export function decideProtectedRoute(state: ProtectedRouteState): ProtectedRouteDecision {
  if (state.loading || !state.isHydrated) return 'loading';
  if (!state.authToken) return 'login';
  if (state.mustChangePassword) return 'set-password';

  const requiredEntryComplete = state.profileConfirmed && state.wardSelected;
  const exempt = state.pathname === ONBOARDING_PATH || state.pathname === CHILDREN_PATH;

  if (!exempt && (!requiredEntryComplete || state.hasNoLinkedWards)) return 'onboarding';
  return 'allow';
}
