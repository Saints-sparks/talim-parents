import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  createLeaveRequest,
  deleteLeaveRequest,
  getLeaveRequestsByChild,
  type CreateLeaveRequestPayload,
  type LeaveRequest,
} from '../services/leaveRequest.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';
import { ApiError } from '../lib/apiError';

/**
 * Leave requests for one child.
 *
 * The API answers 404 both for "this child has no requests" and for "this
 * child is not yours". Only the first is turned into an empty list, and only
 * when the message names leave requests — a genuine access refusal still
 * surfaces as an error rather than quietly rendering as "none yet".
 *
 * @param childId - Student record id or user id of one of the parent's children.
 * @returns The query result.
 */
export function useLeaveRequests(childId: string | undefined): UseQueryResult<LeaveRequest[]> {
  return useQuery({
    queryKey: queryKeys.leaveRequests.byChild(childId ?? 'none'),
    queryFn: async () => {
      try {
        return await getLeaveRequestsByChild(childId as string);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === 'NOT_FOUND' &&
          /leave request/i.test(error.message)
        ) {
          return [];
        }
        throw error;
      }
    },
    enabled: Boolean(childId),
    staleTime: staleTimes.list,
  });
}

/**
 * Submits a leave request and refreshes that child's list.
 *
 * @param childId - Whose list to invalidate once it succeeds.
 * @returns The mutation. Never retried: a retried submission would create a
 *   duplicate request for the school to decide on twice.
 */
export function useCreateLeaveRequest(childId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<LeaveRequest, unknown, CreateLeaveRequestPayload>({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      if (childId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.byChild(childId) });
      }
    },
  });
}

/**
 * Withdraws a pending leave request and refreshes that child's list.
 *
 * @param childId - Whose list to invalidate once it succeeds.
 * @returns The mutation.
 */
export function useDeleteLeaveRequest(childId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<boolean, unknown, string>({
    mutationFn: deleteLeaveRequest,
    onSuccess: () => {
      if (childId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.byChild(childId) });
      }
    },
  });
}
