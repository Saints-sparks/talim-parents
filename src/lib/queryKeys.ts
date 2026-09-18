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
  children: {
    all: ['children'] as const,
    /** Every child linked to the signed-in parent. */
    list: (parentId: string) => ['children', parentId, 'list'] as const,
    /** The dashboard overview card set. */
    overview: (parentId: string) => ['children', parentId, 'overview'] as const,
    /** Recent updates across every child. */
    updates: (parentId: string) => ['children', parentId, 'updates'] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    dashboard: (childId: string) => ['attendance', childId, 'dashboard'] as const,
    monthly: (childId: string, month: number, year: number) =>
      ['attendance', childId, 'monthly', month, year] as const,
  },
  timetable: {
    all: ['timetable'] as const,
    byChild: (childId: string, params?: Record<string, unknown>) =>
      ['timetable', childId, params ?? {}] as const,
  },
  results: {
    all: ['results'] as const,
    summary: (childId: string, params?: Record<string, unknown>) =>
      ['results', childId, 'summary', params ?? {}] as const,
    subjects: (childId: string, params?: Record<string, unknown>) =>
      ['results', childId, 'subjects', params ?? {}] as const,
    gradeSummary: (childId: string, params?: Record<string, unknown>) =>
      ['results', childId, 'grade-summary', params ?? {}] as const,
    termProgress: (childId: string, params?: Record<string, unknown>) =>
      ['results', childId, 'term-progress', params ?? {}] as const,
    assessmentBreakdown: (childId: string, params?: Record<string, unknown>) =>
      ['results', childId, 'assessment-breakdown', params ?? {}] as const,
  },
  payments: {
    all: ['payments'] as const,
    /** Outstanding fee assignments for one child. */
    dueFees: (childId: string, params?: Record<string, unknown>) =>
      ['payments', childId, 'due-fees', params ?? {}] as const,
    /** Paid / outstanding totals across every child. */
    summary: (parentId: string) => ['payments', parentId, 'summary'] as const,
    history: (parentId: string, params?: Record<string, unknown>) =>
      ['payments', parentId, 'history', params ?? {}] as const,
    receipts: (parentId: string, params?: Record<string, unknown>) =>
      ['payments', parentId, 'receipts', params ?? {}] as const,
    receipt: (receiptId: string) => ['payments', 'receipt', receiptId] as const,
    /** Enabled providers — the same for every parent in a school. */
    providers: () => ['payments', 'providers'] as const,
  },
  leaveRequests: {
    all: ['leaveRequests'] as const,
    byChild: (childId: string) => ['leaveRequests', childId, 'list'] as const,
    detail: (id: string) => ['leaveRequests', 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (userId: string, params?: Record<string, unknown>) =>
      ['notifications', userId, 'list', params ?? {}] as const,
    announcements: (userId: string, params?: Record<string, unknown>) =>
      ['notifications', userId, 'announcements', params ?? {}] as const,
  },
  settings: {
    all: ['settings'] as const,
    parent: (parentId: string) => ['settings', parentId] as const,
    linkedChildren: (parentId: string) => ['settings', parentId, 'children'] as const,
  },
  academic: {
    all: ['academic'] as const,
    currentTerm: () => ['academic', 'current-term'] as const,
  },
  school: {
    all: ['school'] as const,
    detail: (schoolId: string) => ['school', schoolId] as const,
  },
} as const;

/**
 * The prefix of a params-carrying list key, for invalidating every page of a
 * list at once — invalidating with the full key would only match one page.
 *
 * @param key - A key built by one of the factories above.
 * @returns The key without its trailing params object.
 */
export function listPrefix(key: readonly unknown[]): readonly unknown[] {
  const last = key[key.length - 1];
  return last && typeof last === 'object' && !Array.isArray(last) ? key.slice(0, -1) : key;
}

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
