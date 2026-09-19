import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { downloadChildTimetable, getChildTimetable, type ChildTimetable } from '../services/parent.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';

/**
 * One child's timetable for a week.
 *
 * Both layouts (weekly grid and list) come back in the same response, so the
 * view toggle is client-side and never refetches; only changing the week does.
 * Nothing is requested until a child linked to the signed-in parent is chosen.
 *
 * @param childId - Student record id of a child linked to this parent.
 * @param weekStart - `YYYY-MM-DD` of the week's Monday, in local time.
 * @returns The query result.
 */
export function useChildTimetable(childId: string | undefined, weekStart: string): UseQueryResult<ChildTimetable> {
  return useQuery({
    queryKey: queryKeys.timetable.byChild(childId ?? 'none', { weekStart }),
    queryFn: () => getChildTimetable(childId as string, { weekStart }),
    enabled: Boolean(childId),
    staleTime: staleTimes.list,
  });
}

/**
 * Downloads a child's timetable as CSV and hands the file to the browser.
 *
 * @returns The mutation; call `mutate(childId)`.
 */
export function useDownloadTimetable(): UseMutationResult<void, unknown, string> {
  return useMutation<void, unknown, string>({
    mutationFn: async (childId) => {
      const blob = await downloadChildTimetable(childId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetable-${childId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
}
