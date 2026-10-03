/**
 * Anything that can be serialised into a cache key. Query objects declared as
 * interfaces (the API's query DTOs) have no index signature, so the factories
 * take this rather than `QueryKeyParams`.
 */
export type QueryKeyParams = object;

/**
 * Query-key factory. Every cached resource is keyed `[resource, scopeId, …params]`
 * where the scope is the signed-in parent or the child the data belongs to, so
 * switching child (or signing out) invalidates exactly what changed via
 * `queryClient.removeQueries({ queryKey: queryKeys.<resource>.all })`.
 *
 * Add a resource here when a page moves onto TanStack Query; never build
 * ad-hoc key arrays inside components.
 */
export const queryKeys = {
  /**
   * Everything about one child (Part B). Keyed by the child, so switching the
   * active child reads (and fetches) a different entry for every screen; the
   * previous child's data stays cached for switching back.
   */
  child: {
    all: ['child'] as const,
    dashboard: (childId: string) => ['child', childId, 'dashboard'] as const,
    timetable: (childId: string, weekStart: string | undefined) =>
      ['child', childId, 'timetable', weekStart ?? 'current'] as const,
    attendance: (childId: string, month: string) => ['child', childId, 'attendance', month] as const,
    reportTerms: (childId: string) => ['child', childId, 'report-terms'] as const,
    reportCard: (childId: string, termId: string) => ['child', childId, 'report-card', termId] as const,
    leave: (childId: string) => ['child', childId, 'leave'] as const,
    contacts: (childId: string) => ['child', childId, 'contacts'] as const,
    school: (childId: string) => ['child', childId, 'school'] as const,
  },
  children: {
    all: ['children'] as const,
    /** Every child linked to the signed-in parent (B13), across schools. */
    list: (parentId: string) => ['children', parentId, 'list'] as const,
  },
  payments: {
    all: ['payments'] as const,
    /** C6: one child's payments, a page at a time. */
    history: (parentId: string, params?: QueryKeyParams) =>
      ['payments', parentId, 'history', params ?? {}] as const,
    /** C5: one child's receipts for a term. */
    receipts: (parentId: string, params?: QueryKeyParams) =>
      ['payments', parentId, 'receipts', params ?? {}] as const,
    /** C2: every child's bill, one call. */
    family: (parentId: string, termId: string | undefined) =>
      ['payments', parentId, 'family', termId ?? 'current'] as const,
    /** The providers the child's school has enabled (multi-school: per child). */
    childProviders: (childId: string) => ['payments', 'providers', childId] as const,
    /** C4: the child's school's bank account. */
    bankDetails: (childId: string) => ['payments', 'bank-details', childId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    /** B11: the parent's feed, by filter and child. */
    feed: (userId: string, params?: QueryKeyParams) => ['notifications', userId, 'feed', params ?? {}] as const,
    /** §30/B11: the badge and filter counts, by child. */
    counts: (userId: string, childId: string | undefined) =>
      ['notifications', userId, 'counts', childId ?? 'all'] as const,
  },
  settings: {
    all: ['settings'] as const,
    parent: (parentId: string) => ['settings', parentId] as const,
    notificationPrefs: (parentId: string) => ['settings', parentId, 'notification-prefs'] as const,
    chatPrivacy: (parentId: string) => ['settings', parentId, 'chat-privacy'] as const,
    sessions: (parentId: string) => ['settings', parentId, 'sessions'] as const,
    passwordPolicy: () => ['settings', 'password-policy'] as const,
  },
} as const;

/** Stale times (ms) by how often the data actually changes. */
export const staleTimes = {
  /** Terms, school profile, provider list: minutes between changes. */
  reference: 10 * 60_000,
  /** Timetables and results: changed by staff during the day. */
  list: 60_000,
  /** Notifications and attendance: refetch on mount, they move hourly. */
  fresh: 30_000,
  /** Money: always refetch on mount. */
  live: 0,
} as const;
