import type { ChangePasswordPayload } from '../services/settings.services';

/** How a sign-in attempt ended. Pages branch on `kind`, never on the message. */
export type LoginOutcome =
  | { kind: 'success' }
  | { kind: 'invalid_credentials'; message: string }
  | { kind: 'access_denied'; message: string }
  | { kind: 'unknown'; message: string };

/** The signed-in parent, as `/auth/introspect` returns them. */
export interface AuthUser {
  userId?: string;
  _id?: string;
  id?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  userAvatar?: string;
  schoolId?: string;
  schoolName?: string;
  onboardingCompleted?: boolean;
  [key: string]: unknown;
}

/** What `useAuth()` exposes to the app. */
export interface AuthContextValue {
  user: AuthUser | null;
  /** The signed-in parent's user id — what every `/parents/me/*` route scopes to. */
  parentId: string;
  schoolId: string | null;
  authToken: string | null;
  loading: boolean;
  /** The last sign-in error, for the login form. */
  error: string | null;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
  /**
   * Changes the parent's password and keeps them signed in: the server rotates
   * the session on a password change, so the new access token is adopted here
   * (every open socket and request would otherwise keep the old one).
   */
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  /**
   * Obtains a fresh access token. Shares the API client's single in-flight
   * refresh, so the socket handshake and a 401'd request never refresh twice.
   */
  refreshSession: () => Promise<string | null>;
  isAuthenticated: boolean;
}

/** Body of `POST /auth/login`. */
export interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
}

/** Body of `POST /auth/introspect`. */
export interface IntrospectResponse {
  user?: AuthUser;
}
