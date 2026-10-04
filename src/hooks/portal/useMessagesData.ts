import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getChatContacts, openOfficeRoom, openTeacherRoom } from '../../services/portal/messages';
import { queryKeys, staleTimes } from '../../lib/queryKeys';
import { useAuth } from '../../services/auth.services';
import type { ChatContact, OpenedRoom } from '../../types/portal/messages';

/**
 * The child's teachers and the school office (B10), for "New message".
 *
 * @param childId - The active child.
 * @returns The query.
 */
export function useChatContacts(childId: string | undefined): UseQueryResult<ChatContact[]> {
  return useQuery({
    queryKey: queryKeys.child.contacts(childId ?? 'none'),
    queryFn: () => getChatContacts(childId as string),
    enabled: Boolean(childId),
    staleTime: staleTimes.list,
  });
}

/**
 * Opens a thread with a contact: the office room (`POST /chat/office`) for the
 * office entry, a one-to-one room for a teacher. Both are idempotent server
 * side, so opening twice lands in the same room.
 *
 * @param childId - The active child (decides the school).
 * @returns The mutation, taking the contact.
 */
export function useOpenThread(childId: string | undefined) {
  const { parentId } = useAuth();
  return useMutation<OpenedRoom, unknown, ChatContact>({
    mutationFn: (contact) =>
      contact.group === 'office'
        ? openOfficeRoom(childId as string)
        : openTeacherRoom(childId as string, parentId, contact.userId),
  });
}
