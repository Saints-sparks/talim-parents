import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getParentChildrenOverview,
  getParentChildrenUpdates,
  type ChildrenOverview,
  type ChildUpdate,
} from '../services/parent.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';
import { sessionStore } from '../lib/session';

/**
 * Attendance, grade and subject counters across every linked child.
 *
 * @returns The query result.
 */
export function useChildrenOverview(): UseQueryResult<ChildrenOverview> {
  return useQuery({
    queryKey: queryKeys.children.overview(sessionStore.getParentId() ?? 'anon'),
    queryFn: getParentChildrenOverview,
    staleTime: staleTimes.fresh,
  });
}

/**
 * Recent attendance and result events across every linked child.
 *
 * @returns The query result.
 */
export function useChildrenUpdates(): UseQueryResult<ChildUpdate[]> {
  return useQuery({
    queryKey: queryKeys.children.updates(sessionStore.getParentId() ?? 'anon'),
    queryFn: getParentChildrenUpdates,
    staleTime: staleTimes.fresh,
  });
}
