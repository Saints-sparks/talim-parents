import { api, buildQuery } from '../../lib/apiClient';
import { FIXTURES_ON } from '../../lib/devFlags';
import { uploadChatAttachment } from '../chat.services';
import type { Attachment, CreateTicketPayload, MyTicketsQuery, PostTicketMessagePayload, Ticket, TicketPage } from '../../types/v15';

/**
 * The requester's side of the v1.5 ticket system
 * (`talimBE-V2/docs/v1.5-platform-sync.md` §1), which replaces the old
 * `POST /support/tickets` report:
 *
 * - `GET /tickets/mine` lists every ticket the parent raised, about any child
 *   (no `X-Talim-Child` header, so the list is not narrowed to one child);
 * - `POST /tickets` names the child in its body (`childId`), and the ticket
 *   takes that child's school;
 * - replies, reopen and close act on one ticket; a 409 means it is closed,
 *   full, or past the 7-day reopen window.
 *
 * The dev fixtures answer every route (`src/dev/fixtures/tickets.ts`).
 */

/**
 * One page of the parent's tickets, most recent activity first.
 *
 * @param query - Status filter, page and page size.
 * @returns The page and its `meta`.
 * @throws {ApiError} On any non-2xx.
 */
export async function getMyTickets(query: MyTicketsQuery = {}): Promise<TicketPage> {
  const body = await api.get<TicketPage | TicketPage['data']>(`/tickets/mine${buildQuery({ status: query.status, page: query.page ?? 1, limit: query.limit ?? 20 })}`);
  if (Array.isArray(body)) return { data: body, meta: { total: body.length, page: 1, lastPage: 1, limit: body.length } };
  return body;
}

/**
 * One of the parent's tickets with its thread (internal notes already removed by the API).
 *
 * @param id - The ticket.
 * @returns The ticket.
 * @throws {ApiError} 404 when it is not the parent's ticket.
 */
export function getTicket(id: string): Promise<Ticket> {
  return api.get<Ticket>(`/tickets/${encodeURIComponent(id)}`);
}

/**
 * Raises a ticket to the child's school or to Talim support.
 *
 * @param payload - Desk, area, subject, first message, files and the child.
 * @returns The new ticket.
 * @throws {ApiError} 400 for a field outside the contract's limits.
 */
export function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  return api.post<Ticket>('/tickets', payload);
}

/**
 * The parent's reply. Callers refetch the ticket afterwards, whatever this answers.
 *
 * @param id - The ticket.
 * @param payload - The text and files.
 * @returns The API's answer.
 * @throws {ApiError} 409 when the ticket is closed or holds 500 messages.
 */
export function replyToTicket(id: string, payload: PostTicketMessagePayload): Promise<unknown> {
  return api.post<unknown>(`/tickets/${encodeURIComponent(id)}/messages`, payload);
}

/**
 * Reopens a resolved ticket.
 *
 * @param id - The ticket.
 * @returns The API's answer.
 * @throws {ApiError} 409 more than 7 days after it was resolved.
 */
export function reopenTicket(id: string): Promise<unknown> {
  return api.post<unknown>(`/tickets/${encodeURIComponent(id)}/reopen`);
}

/**
 * Closes the parent's own ticket.
 *
 * @param id - The ticket.
 * @returns The API's answer.
 * @throws {ApiError} On any non-2xx.
 */
export function closeTicket(id: string): Promise<unknown> {
  return api.post<unknown>(`/tickets/${encodeURIComponent(id)}/close`);
}

/**
 * Uploads one ticket file through the app's chat upload
 * (`POST /upload/chat-attachment`). Uploads go over XHR, which the dev
 * fixtures do not intercept, so fixture mode answers a placeholder URL.
 *
 * @param file - The file.
 * @param onProgress - Called with 0–1 as the bytes go out.
 * @returns The stored file's URL, name, type and size.
 * @throws {ApiError} When the upload fails.
 */
export async function uploadTicketFile(file: File, onProgress?: (fraction: number) => void): Promise<Attachment> {
  if (FIXTURES_ON) {
    onProgress?.(1);
    return { url: `https://fixtures.talim.test/uploads/${encodeURIComponent(file.name)}`, name: file.name, mimeType: file.type, size: file.size };
  }
  const stored = await uploadChatAttachment(file, onProgress);
  return { url: stored.url, name: stored.name ?? file.name, mimeType: stored.mimeType ?? file.type, size: stored.size ?? file.size };
}
