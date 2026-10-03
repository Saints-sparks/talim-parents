import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../services/auth.services';
import {
  getParentSettings,
  updateThemePreference,
  type ParentSettings,
  type ThemePreference,
} from '../services/settings.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';

/**
 * The signed-in parent's profile, linked children and preferences
 * (`GET /parent/settings`). The route is scoped to the caller by the API, so
 * the parent id here only keys the cache.
 *
 * @returns The query result; disabled until a parent is signed in.
 */
export function useParentSettings(): UseQueryResult<ParentSettings> {
  const { parentId } = useAuth();
  return useQuery({
    queryKey: queryKeys.settings.parent(parentId || 'anon'),
    queryFn: getParentSettings,
    enabled: Boolean(parentId),
    staleTime: staleTimes.list,
  });
}

/**
 * Stores the theme choice against the parent's account.
 *
 * @returns A mutation taking `light`, `dark` or `system`.
 */
export function useSaveTheme() {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (theme: ThemePreference) => updateThemePreference({ theme }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.parent(parentId || 'anon') });
    },
  });
}
