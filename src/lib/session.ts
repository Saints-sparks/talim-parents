/**
 * In-memory session store — the one place non-React code (services, the API
 * client, the socket) reads the signed-in parent from.
 *
 * `AuthProvider` writes to it whenever the session changes; everything else
 * only reads. On a cold call before `AuthProvider` has mounted it hydrates
 * once from `localStorage`, so early service calls still resolve. Nothing here
 * decodes tokens: the introspected user is the source of truth.
 */

/** The signed-in parent, as stored for non-React code to read. */
export interface SessionUser {
  _id?: string;
  id?: string;
  userId?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  userAvatar?: string;
  schoolId?: string | { _id?: string; id?: string; name?: string };
  schoolName?: string;
  onboardingCompleted?: boolean;
  [key: string]: unknown;
}

type Listener = () => void;

/** localStorage keys this app owns. Nothing else may spell them out. */
export const STORAGE_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  user: 'user',
  schoolId: 'school_id',
  parentId: 'parent_id',
  children: 'parent_students',
} as const;

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

let currentUser: SessionUser | null = null;
let currentToken: string | null = null;
let currentRefreshToken: string | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

/**
 * Reads a key from `localStorage`, tolerating a browser that denies access.
 *
 * @param key - The storage key.
 * @returns The stored string, or `null`.
 */
function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Loads the persisted parent once, for reads before `AuthProvider` mounts. */
function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  currentToken = readStorage(STORAGE_KEYS.accessToken);
  currentRefreshToken = readStorage(STORAGE_KEYS.refreshToken);
  const raw = readStorage(STORAGE_KEYS.user);
  if (raw) {
    try {
      currentUser = JSON.parse(raw) as SessionUser;
    } catch {
      currentUser = null;
    }
  }
}

/** Tells every subscriber the session changed. */
function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Extracts a 24-hex school id from the shapes the API returns for
 * `user.schoolId` (a string, or a populated `{ _id }` object).
 *
 * @param value - Whatever the API put in `schoolId`.
 * @returns The id, or `null` when the value carries none.
 */
export function extractSchoolId(value: unknown): string | null {
  if (typeof value === 'string') return OBJECT_ID.test(value) ? value : null;
  if (value && typeof value === 'object') {
    const obj = value as { _id?: unknown; id?: unknown };
    if (typeof obj._id === 'string' && OBJECT_ID.test(obj._id)) return obj._id;
    if (typeof obj.id === 'string' && OBJECT_ID.test(obj.id)) return obj.id;
  }
  return null;
}

export const sessionStore = {
  /**
   * The signed-in parent, or `null`.
   *
   * @returns The stored user.
   */
  getUser(): SessionUser | null {
    hydrate();
    return currentUser;
  },

  /**
   * The current access token, or `null`.
   *
   * @returns The bearer token requests are sent with.
   */
  getToken(): string | null {
    hydrate();
    return currentToken;
  },

  /**
   * The refresh token, for the deployments that send it in the body rather
   * than an httpOnly cookie.
   *
   * @returns The refresh token, or `null`.
   */
  getRefreshToken(): string | null {
    hydrate();
    return currentRefreshToken;
  },

  /**
   * The signed-in parent's user id — the id every `/parents/me/*` route scopes
   * itself to server-side.
   *
   * @returns The parent's id, or `null`.
   */
  getParentId(): string | null {
    hydrate();
    return (
      (currentUser?.userId as string | undefined) ??
      currentUser?._id ??
      currentUser?.id ??
      readStorage(STORAGE_KEYS.parentId) ??
      null
    );
  },

  /**
   * The parent's school id, or `null` when signed out.
   *
   * @returns The school id.
   */
  getSchoolId(): string | null {
    hydrate();
    return extractSchoolId(currentUser?.schoolId) ?? readStorage(STORAGE_KEYS.schoolId);
  },

  /**
   * Replaces the user and, optionally, the tokens. Called by `AuthProvider`.
   *
   * @param user - The signed-in parent, or `null` on sign-out.
   * @param tokens - Access and refresh tokens to store alongside.
   */
  set(user: SessionUser | null, tokens?: { access?: string | null; refresh?: string | null }): void {
    hydrated = true;
    currentUser = user;
    if (tokens && 'access' in tokens) currentToken = tokens.access ?? null;
    if (tokens && 'refresh' in tokens) currentRefreshToken = tokens.refresh ?? null;
    notify();
  },

  /**
   * Updates the access token only (after a refresh).
   *
   * @param token - The new bearer token.
   */
  setToken(token: string | null): void {
    hydrated = true;
    currentToken = token;
    notify();
  },

  /**
   * Merges fields into the current user (profile edits).
   *
   * @param partial - The fields that changed.
   */
  patchUser(partial: Partial<SessionUser>): void {
    if (!currentUser) return;
    currentUser = { ...currentUser, ...partial };
    notify();
  },

  /** Clears everything on logout. */
  clear(): void {
    hydrated = true;
    currentUser = null;
    currentToken = null;
    currentRefreshToken = null;
    notify();
  },

  /**
   * Subscribes to session changes.
   *
   * @param listener - Called after every change.
   * @returns An unsubscribe function.
   */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Test seam: forgets that hydration happened. */
  __resetForTests(): void {
    hydrated = false;
    currentUser = null;
    currentToken = null;
    currentRefreshToken = null;
  },
};
