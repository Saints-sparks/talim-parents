import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getSchoolTerms, type Term } from '../services/term.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';

/**
 * Every term of the parent's school, for a term picker.
 *
 * Cached as reference data: terms change a handful of times a year, so the
 * picker on Results does not refetch on every visit.
 *
 * @returns The query result.
 */
export function useTerms(): UseQueryResult<Term[]> {
  return useQuery({
    queryKey: queryKeys.academic.terms(),
    queryFn: getSchoolTerms,
    staleTime: staleTimes.reference,
  });
}
