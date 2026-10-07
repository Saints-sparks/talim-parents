import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type UseInfiniteQueryResult, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../../services/auth.services';
import { closeTicket, createTicket, getMyTickets, getTicket, reopenTicket, replyToTicket, uploadTicketFile } from '../../services/portal/tickets';
import { useAttachmentUpload } from '../../Components/chat-kit/useAttachmentUpload';
import { queryKeys, staleTimes } from '../../lib/queryKeys';
import { toTicketAttachment } from '../../lib/tickets';
import type { Attachment, CreateTicketPayload, PostTicketMessagePayload, Ticket, TicketPage } from '../../types/tickets';

/**
 * Support tickets (v1.5 §1) for Settings → Help → My tickets: the parent's
 * list (one call per page, "Load more"), one ticket's thread, and raising,
 * replying, reopening and closing. Every write refreshes the ticket and the
 * list, whatever the API answered (a 409 means the ticket changed).
 */

/** Tickets per page of the list. */
export const TICKETS_PAGE_SIZE = 20;

/**
 * The parent's tickets, most recent activity first, a page at a time.
 *
 * @returns The infinite query; `fetchNextPage` loads the next page while `hasNextPage`.
 */
export function useMyTickets(): UseInfiniteQueryResult<InfiniteData<TicketPage, number>> {
  const { parentId, isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.support.mine(parentId || 'anon'),
    queryFn: ({ pageParam }) => getMyTickets({ page: pageParam, limit: TICKETS_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.lastPage ? last.meta.page + 1 : undefined),
    enabled: Boolean(parentId && isAuthenticated),
    staleTime: staleTimes.fresh,
  });
}

/**
 * The cached list pages with one ticket's `unread` set to 0.
 *
 * @param data - The cached pages, if any.
 * @param ticketId - The ticket just opened.
 * @returns New pages when that ticket had unread messages, else the same data.
 */
export function clearUnreadInPages(data: InfiniteData<TicketPage, number> | undefined, ticketId: string): InfiniteData<TicketPage, number> | undefined {
  if (!data || !data.pages.some((page) => page.data.some((row) => row.id === ticketId && row.unread > 0))) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, data: page.data.map((row) => (row.id === ticketId ? { ...row, unread: 0 } : row)) })) };
}

/**
 * One ticket with its thread. Opening it marks it read on the server, so its
 * row in the cached list loses its "new" badge at once.
 *
 * @param ticketId - The ticket, or `null` while none is open.
 * @returns The query.
 */
export function useTicket(ticketId: string | null): UseQueryResult<Ticket> {
  const { parentId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.support.ticket(parentId || 'anon', ticketId ?? ''),
    queryFn: async () => {
      const ticket = await getTicket(ticketId as string);
      queryClient.setQueriesData<InfiniteData<TicketPage, number>>({ queryKey: queryKeys.support.mine(parentId || 'anon') }, (data) => clearUnreadInPages(data, ticket.id));
      return ticket;
    },
    enabled: Boolean(parentId && isAuthenticated && ticketId),
    staleTime: staleTimes.live,
  });
}

/**
 * Refetches one ticket and marks the list stale.
 *
 * @returns `refresh(ticketId)`, which resolves once both are refetched.
 */
function useRefreshTicket(): (ticketId: string) => Promise<void> {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  return useCallback(
    async (ticketId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.support.ticket(parentId || 'anon', ticketId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.support.mine(parentId || 'anon') }),
      ]);
    },
    [parentId, queryClient],
  );
}

/**
 * Raises a ticket (`POST /tickets`); the new ticket is cached so its thread
 * opens at once, and the list is refetched.
 *
 * @returns The mutation; it resolves with the new ticket.
 */
export function useCreateTicket() {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => createTicket(payload),
    onSuccess: (ticket: Ticket) => {
      queryClient.setQueryData(queryKeys.support.ticket(parentId || 'anon', ticket.id), ticket);
      void queryClient.invalidateQueries({ queryKey: queryKeys.support.mine(parentId || 'anon') });
    },
  });
}

/**
 * Reply, reopen and close for one ticket, each followed by a refetch.
 *
 * @param ticketId - The open ticket.
 * @returns The three mutations.
 */
export function useTicketActions(ticketId: string) {
  const refresh = useRefreshTicket();
  const reply = useMutation({ mutationFn: (payload: PostTicketMessagePayload) => replyToTicket(ticketId, payload), onSettled: () => refresh(ticketId) });
  const reopen = useMutation({ mutationFn: () => reopenTicket(ticketId), onSettled: () => refresh(ticketId) });
  const close = useMutation({ mutationFn: () => closeTicket(ticketId), onSettled: () => refresh(ticketId) });
  return { reply, reopen, close };
}

/** What {@link useTicketUploads} returns. */
export interface TicketUploads {
  /** Uploads the files (two at a time) and resolves with the ticket attachments, in order. */
  upload: (files: File[]) => Promise<Attachment[]>;
  isUploading: boolean;
}

/**
 * Uploads a ticket message's files with the chat kit's uploader (the app's
 * `POST /upload/chat-attachment`), keeping only `{ url, name, mimeType, size }`.
 *
 * @returns `upload(files)` and whether an upload is running.
 */
export function useTicketUploads(): TicketUploads {
  const { upload, isUploading } = useAttachmentUpload(uploadTicketFile);
  const run = useCallback(
    async (files: File[]): Promise<Attachment[]> => (files.length ? (await upload(files.map((file) => ({ file })))).map(toTicketAttachment) : []),
    [upload],
  );
  return { upload: run, isUploading };
}
