import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../../services/auth.services';
import {
  getChatPrivacy,
  getPasswordPolicy,
  getSessions,
  revokeOtherSessions,
  revokeSession,
  sendSupportTicket,
  setPreferredMethod,
  updateChatPrivacy,
  updateParentProfile,
} from '../../services/portal/account';
import { getNotificationPreferences, updateNotificationPreferences } from '../../services/notification.services';
import { queryKeys, staleTimes } from '../../lib/queryKeys';
import type { NotificationPreferences, NotificationPreferencesPayload } from '../../types/notifications';
import type { AuthSession, ChatPrivacy, ParentProfilePayload, PasswordPolicy, SupportTicketPayload } from '../../types/portal/school';
import type { PreferredMethod } from '../../types/portal/payments';

/**
 * The parent's own account: profile, alerts, chat privacy, payment
 * preference, sessions and support. None of it is about one child.
 */

/**
 * Saves name, occupation and address (B13), mirroring the name into the
 * session so the header changes at once.
 *
 * @returns The mutation.
 */
export function useUpdateParentProfile() {
  const { parentId, updateUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ParentProfilePayload) => updateParentProfile(payload),
    onSuccess: (_ack, payload) => {
      if (payload.fullName) {
        const [firstName, ...rest] = payload.fullName.trim().split(/\s+/);
        updateUser({ firstName, lastName: rest.join(' ') || firstName });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.parent(parentId || 'anon') });
    },
  });
}

/**
 * Saves the method offered first at checkout (C7).
 *
 * @returns The mutation.
 */
export function useSetPreferredMethod() {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (method: PreferredMethod) => setPreferredMethod(method),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.parent(parentId || 'anon') });
    },
  });
}

/**
 * The alert switches delivery actually follows (`/notifications/preferences`).
 *
 * @returns The query.
 */
export function useNotificationPrefs(): UseQueryResult<NotificationPreferences> {
  const { parentId } = useAuth();
  return useQuery({
    queryKey: queryKeys.settings.notificationPrefs(parentId || 'anon'),
    queryFn: getNotificationPreferences,
    enabled: Boolean(parentId),
    staleTime: staleTimes.list,
  });
}

/**
 * Changes alert switches, optimistically: the toggle moves at once and moves
 * back if the server refuses.
 *
 * @returns The mutation, taking only the switches that changed.
 */
export function useUpdateNotificationPrefs() {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.settings.notificationPrefs(parentId || 'anon');
  return useMutation({
    mutationFn: (patch: NotificationPreferencesPayload) => updateNotificationPreferences(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      if (previous) queryClient.setQueryData<NotificationPreferences>(key, { ...previous, ...patch } as NotificationPreferences);
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * The chat privacy switches (online status, read receipts, message preview).
 *
 * @returns The query.
 */
export function useChatPrivacy(): UseQueryResult<ChatPrivacy> {
  const { parentId } = useAuth();
  return useQuery({
    queryKey: queryKeys.settings.chatPrivacy(parentId || 'anon'),
    queryFn: getChatPrivacy,
    enabled: Boolean(parentId),
    staleTime: staleTimes.list,
  });
}

/**
 * Changes chat privacy switches, optimistically.
 *
 * @returns The mutation.
 */
export function useUpdateChatPrivacy() {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.settings.chatPrivacy(parentId || 'anon');
  return useMutation({
    mutationFn: (patch: Partial<ChatPrivacy>) => updateChatPrivacy(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ChatPrivacy>(key);
      if (previous) queryClient.setQueryData<ChatPrivacy>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Where the parent is signed in (§34).
 *
 * @param enabled - Load only when the Security tab is open.
 * @returns The query.
 */
export function useSessions(enabled = true): UseQueryResult<AuthSession[]> {
  const { parentId } = useAuth();
  return useQuery({
    queryKey: queryKeys.settings.sessions(parentId || 'anon'),
    queryFn: getSessions,
    enabled: Boolean(parentId) && enabled,
    staleTime: staleTimes.fresh,
  });
}

/**
 * Signs one session, or every other session, out (§34).
 *
 * @returns The two mutations.
 */
export function useRevokeSessions() {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.settings.sessions(parentId || 'anon') });
  };
  return {
    one: useMutation({ mutationFn: (id: string) => revokeSession(id), onSuccess: refresh }),
    others: useMutation({ mutationFn: () => revokeOtherSessions(), onSuccess: refresh }),
  };
}

/**
 * The server's password rules (§34), for the change-password checklist.
 *
 * @param enabled - Load only when a password form is open.
 * @returns The query.
 */
export function usePasswordPolicy(enabled = true): UseQueryResult<PasswordPolicy> {
  return useQuery({
    queryKey: queryKeys.settings.passwordPolicy(),
    queryFn: getPasswordPolicy,
    enabled,
    staleTime: staleTimes.reference,
  });
}

/**
 * Sends a problem report to Talim support (§35).
 *
 * @returns The mutation.
 */
export function useSupportTicket() {
  return useMutation({ mutationFn: (payload: SupportTicketPayload) => sendSupportTicket(payload) });
}
