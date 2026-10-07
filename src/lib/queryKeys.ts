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
    /**
     * B1: the dashboard aggregate.
     *
     * @param childId - The child.
     * @returns The cache key.
     */
    dashboard: (childId: string) => ['child', childId, 'dashboard'] as const,
    /**
     * B2: one week of the timetable.
     *
     * @param childId - The child.
     * @param weekStart - Any day of the week; this week when omitted.
     * @returns The cache key.
     */
    timetable: (childId: string, weekStart: string | undefined) =>
      ['child', childId, 'timetable', weekStart ?? 'current'] as const,
    /**
     * B6: the term's attendance and one month's marks.
     *
     * @param childId - The child.
     * @param month - `YYYY-MM`.
     * @returns The cache key.
     */
    attendance: (childId: string, month: string) => ['child', childId, 'attendance', month] as const,
    /**
     * B5: the terms that have results.
     *
     * @param childId - The child.
     * @returns The cache key.
     */
    reportTerms: (childId: string) => ['child', childId, 'report-terms'] as const,
    /**
     * B5: one term's report card.
     *
     * @param childId - The child.
     * @param termId - The term.
     * @returns The cache key.
     */
    reportCard: (childId: string, termId: string) => ['child', childId, 'report-card', termId] as const,
    /**
     * B9: the child's leave requests.
     *
     * @param childId - The child.
     * @returns The cache key.
     */
    leave: (childId: string) => ['child', childId, 'leave'] as const,
    /**
     * B10: the child's teachers and the office.
     *
     * @param childId - The child.
     * @returns The cache key.
     */
    contacts: (childId: string) => ['child', childId, 'contacts'] as const,
    /**
     * B12: how to reach the child's school.
     *
     * @param childId - The child.
     * @returns The cache key.
     */
    school: (childId: string) => ['child', childId, 'school'] as const,
  },
  children: {
    all: ['children'] as const,
    /**
     * Every child linked to the signed-in parent (B13), across schools.
     *
     * @param parentId - The signed-in parent.
     * @returns The cache key.
     */
    list: (parentId: string) => ['children', parentId, 'list'] as const,
  },
  payments: {
    all: ['payments'] as const,
    /**
     * C6: one child's payments, a page at a time.
     *
     * @param parentId - The signed-in parent.
     * @param params - The filters that select this entry.
     * @returns The cache key.
     */
    history: (parentId: string, params?: QueryKeyParams) =>
      ['payments', parentId, 'history', params ?? {}] as const,
    /**
     * C5: one child's receipts for a term.
     *
     * @param parentId - The signed-in parent.
     * @param params - The filters that select this entry.
     * @returns The cache key.
     */
    receipts: (parentId: string, params?: QueryKeyParams) =>
      ['payments', parentId, 'receipts', params ?? {}] as const,
    /**
     * C2: every child's bill, one call.
     *
     * @param parentId - The signed-in parent.
     * @param termId - The term; the current one when omitted.
     * @returns The cache key.
     */
    family: (parentId: string, termId: string | undefined) =>
      ['payments', parentId, 'family', termId ?? 'current'] as const,
    /**
     * The providers the child's school has enabled (multi-school: per child).
     *
     * @param childId - The child.
     * @returns The cache key.
     */
    childProviders: (childId: string) => ['payments', 'providers', childId] as const,
    /**
     * C4: the child's school's bank account.
     *
     * @param childId - The child.
     * @returns The cache key.
     */
    bankDetails: (childId: string) => ['payments', 'bank-details', childId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    /**
     * B11: the parent's feed, by filter and child.
     *
     * @param userId - The signed-in parent.
     * @param params - The filters that select this entry.
     * @returns The cache key.
     */
    feed: (userId: string, params?: QueryKeyParams) => ['notifications', userId, 'feed', params ?? {}] as const,
    /**
     * §30/B11: the badge and filter counts, by child.
     *
     * @param userId - The signed-in parent.
     * @param childId - The child.
     * @returns The cache key.
     */
    counts: (userId: string, childId: string | undefined) =>
      ['notifications', userId, 'counts', childId ?? 'all'] as const,
  },
  settings: {
    all: ['settings'] as const,
    /**
     * `GET /parent/settings`: profile, preferences and security.
     *
     * @param parentId - The signed-in parent.
     * @returns The cache key.
     */
    parent: (parentId: string) => ['settings', parentId] as const,
    /**
     * The alert switches delivery follows.
     *
     * @param parentId - The signed-in parent.
     * @returns The cache key.
     */
    notificationPrefs: (parentId: string) => ['settings', parentId, 'notification-prefs'] as const,
    /**
     * The chat privacy switches.
     *
     * @param parentId - The signed-in parent.
     * @returns The cache key.
     */
    chatPrivacy: (parentId: string) => ['settings', parentId, 'chat-privacy'] as const,
    /**
     * §34: where the parent is signed in.
     *
     * @param parentId - The signed-in parent.
     * @returns The cache key.
     */
    sessions: (parentId: string) => ['settings', parentId, 'sessions'] as const,
    /**
     * §34: the server's password rules (the same for everyone).
     *
     * @returns The cache key.
     */
    passwordPolicy: () => ['settings', 'password-policy'] as const,
  },
  /** The v1.5 tickets the parent raised (Settings → Help → My tickets). */
  support: {
    all: ['support'] as const,
    /**
     * `GET /tickets/mine`, every loaded page.
     *
     * @param parentId - The signed-in parent.
     * @returns The cache key.
     */
    mine: (parentId: string) => ['support', parentId, 'mine'] as const,
    /**
     * `GET /tickets/:id`.
     *
     * @param parentId - The signed-in parent.
     * @param ticketId - The ticket.
     * @returns The cache key.
     */
    ticket: (parentId: string, ticketId: string) => ['support', parentId, 'ticket', ticketId] as const,
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
