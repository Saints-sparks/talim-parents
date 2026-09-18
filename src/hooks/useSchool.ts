import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchSchoolById, type School } from '../services/school.services';
import { useAuth } from '../services/auth.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';

/**
 * The parent's own school.
 *
 * The id comes from the session, never from the UI, so there is no way to
 * look up another school from this app.
 *
 * @returns The query result; disabled until the session carries a school.
 */
export function useSchool(): UseQueryResult<School> {
  const { schoolId } = useAuth();

  return useQuery({
    queryKey: queryKeys.school.detail(schoolId ?? 'none'),
    queryFn: () => fetchSchoolById(schoolId as string),
    enabled: Boolean(schoolId),
    staleTime: staleTimes.reference,
  });
}
