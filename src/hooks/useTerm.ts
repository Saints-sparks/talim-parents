import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCurrentTerm, type Term } from '../services/term.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';

/**
 * The school's current academic term.
 *
 * Cached as reference data: it changes a handful of times a year, and three
 * screens need it, so they share one request instead of each firing their own
 * on mount.
 *
 * @returns The query result.
 */
export function useTerm(): UseQueryResult<Term> {
  return useQuery({
    queryKey: queryKeys.academic.currentTerm(),
    queryFn: getCurrentTerm,
    staleTime: staleTimes.reference,
  });
}
