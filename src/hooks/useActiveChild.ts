import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { useAuth } from '../services/auth.services';
import { getChildren } from '../services/portal/children';
import { queryKeys, staleTimes } from '../lib/queryKeys';
import { getErrorMessage } from '../lib/apiError';
import type { SchoolRef } from '../types/portal/common';
import type { ChildSummary } from '../types/portal/children';

/** What a child-scoped page can be in before it has a child to ask about. */
export type ActiveChildStatus = 'loading' | 'error' | 'empty' | 'ready';

/** The linked children of one school, in the order the API listed them. */
export interface SchoolGroup {
  school: SchoolRef;
  children: ChildSummary[];
}

/** The result of {@link useActiveChild}. */
export interface ActiveChild {
  status: ActiveChildStatus;
  /** The child every child-scoped request should use; only set when `ready`. */
  child: ChildSummary | null;
  /** The child's Student record id: what every child-scoped route and `X-Talim-Child` take. */
  childId: string | undefined;
  /** Every child linked to the signed-in parent. */
  children: ChildSummary[];
  /** The children grouped by school (multi-school families). */
  groups: SchoolGroup[];
  /** Why the children could not be loaded, when `status` is `error`. */
  error: string | null;
  /** Fetches the linked children again. */
  retry: () => void;
  /** Switches the child the whole app is showing. */
  select: (childId: string) => void;
}

/** One shared empty list, so an unloaded query never hands out a new array. */
const NO_CHILDREN: ChildSummary[] = [];

/**
 * The parent's linked children (B13), cached once for the whole app: the
 * shell, the switcher, onboarding and Settings all read this one query.
 *
 * @returns The query result; disabled until a parent is signed in.
 */
export function useChildrenQuery(): UseQueryResult<ChildSummary[]> {
  const { parentId, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.children.list(parentId || 'anon'),
    queryFn: getChildren,
    enabled: Boolean(parentId && isAuthenticated),
    staleTime: staleTimes.list,
  });
}

/**
 * Picks the child to show from the list the server says is linked to this
 * parent.
 *
 * The remembered selection lives in `localStorage`, so it can outlive the
 * link (a school unlinks a child). Trusting it would send that child's id to
 * the API, which refuses it. Instead the selection is honoured only when it
 * is in the server's list; otherwise the parent's default child, then the
 * first one, is used.
 *
 * @param children - The children the API returned for this parent.
 * @param selectedId - The remembered selection, if any.
 * @returns The child to show, or `null` when the parent has none.
 */
export function resolveActiveChild(children: readonly ChildSummary[], selectedId: string | null | undefined): ChildSummary | null {
  if (children.length === 0) return null;
  const match = selectedId ? children.find((child) => child.id === selectedId) : undefined;
  return match ?? children.find((child) => child.isDefault) ?? children[0];
}

/**
 * Groups children by school in one pass (a Map, not a nested scan), keeping
 * the order in which schools and children first appear.
 *
 * @param children - The linked children.
 * @returns One group per school.
 */
export function groupBySchool(children: readonly ChildSummary[]): SchoolGroup[] {
  const groups = new Map<string, SchoolGroup>();
  for (const child of children) {
    const key = child.school.id;
    const group = groups.get(key);
    if (group) group.children.push(child);
    else groups.set(key, { school: child.school, children: [child] });
  }
  return [...groups.values()];
}

/**
 * The child a child-scoped page (dashboard, attendance, results, payments…)
 * is about, verified against the parent's linked children.
 *
 * Requests are held until the children list has loaded, so a child id that is
 * not this parent's is never sent. When the remembered selection is stale it
 * is replaced, so the switcher and every page agree.
 *
 * @returns The resolved child, or why there is not one yet.
 */
export function useActiveChild(): ActiveChild {
  const query = useChildrenQuery();
  const { selectedChildId, selectChild } = useSelectedStudent();
  const children = query.data ?? NO_CHILDREN;

  const child = useMemo(() => resolveActiveChild(children, selectedChildId), [children, selectedChildId]);
  const groups = useMemo(() => groupBySchool(children), [children]);

  useEffect(() => {
    if (child && child.id !== selectedChildId) selectChild(child.id);
  }, [child, selectedChildId, selectChild]);

  const { refetch } = query;
  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  let status: ActiveChildStatus = 'ready';
  if (query.isPending) status = 'loading';
  else if (query.isError && !child) status = 'error';
  else if (!child) status = 'empty';

  return {
    status,
    child: status === 'ready' ? child : null,
    childId: status === 'ready' ? child?.id : undefined,
    children,
    groups,
    error: query.error ? getErrorMessage(query.error, 'Could not load your children.') : null,
    retry,
    select: selectChild,
  };
}
