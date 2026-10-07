/**
 * Live contract check of My tickets (v1.5 §1) through this app's own
 * services and API client, for every linked child (across schools), against
 * a running API with the e2e seed (`talimBE-V2/e2e`). Skipped unless
 * `LIVE_API=1`:
 *
 *   LIVE_API=1 LIVE_DB=talim_v15_web VITE_API_BASE_URL=http://127.0.0.1:5086 npx vitest run src/__live__/tickets
 *
 * Per child and desk, the seeded parent raises a ticket with the services in
 * `src/services/portal/tickets.ts`; the child's school admin (school desk)
 * or the platform admin (Talim desk) answers with raw requests. Checks:
 * create (the child and its school on the ticket; `context`, which the
 * requester never reads back), the list's `unread`, opening it (unread back
 * to 0), a reply, reopen within 7 days, and 409 `REOPEN_WINDOW_PASSED` and
 * `TICKET_CLOSED` read from `reasonCode`. The reopen window is passed by
 * moving `resolvedAt` back 8 days in that API's database, through the
 * backend checkout's own `mongodb` driver (`LIVE_BACKEND_DIR`, default
 * `../talimBE-V2`). It writes to that database: point it at a throwaway
 * stack only.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/apiClient';
import { ApiError } from '../lib/apiError';
import { APP_VERSION } from '../lib/appVersion';
import { API_BASE_URL } from '../lib/config';
import { sessionStore } from '../lib/session';
import { canReopen, reopenExpiredMessage, ticketContext, ticketErrorMessage, unreadLabel, TICKET_CLOSED_MESSAGE } from '../lib/tickets';
import { getChildren } from '../services/portal/children';
import { closeTicket, createTicket, getMyTickets, getTicket, reopenTicket, replyToTicket } from '../services/portal/tickets';
import type { ChildSummary } from '../types/portal/children';
import type { Ticket, TicketDesk } from '../types/tickets';

const LIVE = process.env.LIVE_API === '1';
const DOMAIN = process.env.LIVE_DOMAIN ?? 'e2e.talim.test';
const EMAIL = process.env.LIVE_API_EMAIL ?? `parent@${DOMAIN}`;
const PASSWORD = process.env.LIVE_API_PASSWORD ?? 'Demo#Pass2026';
const DB = process.env.LIVE_DB ?? '';
const BACKEND = resolve(process.env.LIVE_BACKEND_DIR ?? '../talimBE-V2');
const RUN = Date.now().toString(36);
const DESKS: TicketDesk[] = ['school', 'talim'];

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/**
 * A request as a desk's console makes it, outside this app's client.
 *
 * @param method - The HTTP method.
 * @param path - The path under the API.
 * @param token - The bearer token, if any.
 * @param body - The JSON body, if any.
 * @returns The status and the body, unwrapped from `{ success, data }`.
 */
async function raw<T = Record<string, unknown>>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => null);
  const unwrapped = parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed ? parsed.data : parsed;
  return { status: res.status, body: unwrapped as T };
}

/**
 * Signs a desk's staff member in.
 *
 * @param path - `/auth/login` or `/auth/admin-login`.
 * @param local - The part of the email before the `@`.
 * @returns The access token.
 */
async function staffToken(path: string, local: string): Promise<string> {
  const res = await raw<{ access_token: string }>('POST', path, undefined, { email: `${local}@${DOMAIN}`, password: PASSWORD });
  if (res.status >= 300) throw new Error(`${local} could not sign in: ${res.status}`);
  return res.body.access_token;
}

/**
 * Moves a resolved ticket's `resolvedAt` into the past, in the live API's
 * database, so the 7-day reopen window has passed.
 *
 * @param ticketId - The ticket.
 * @param days - How many days ago it was resolved.
 * @returns Nothing; throws when no resolved ticket was changed.
 */
function ageResolved(ticketId: string, days: number): void {
  if (!DB || ['talim_e2e', 'talim_portals'].includes(DB)) throw new Error("Set LIVE_DB to the throwaway stack's database.");
  const script = `const { MongoClient, ObjectId } = require(${JSON.stringify(`${BACKEND}/node_modules/mongodb`)});
(async () => {
  const client = await MongoClient.connect(process.env.LIVE_MONGO);
  const res = await client.db().collection("complaints").updateOne(
    { _id: new ObjectId(process.env.LIVE_ID), status: "resolved" },
    { $set: { resolvedAt: new Date(Date.now() - Number(process.env.LIVE_DAYS) * 864e5) } },
  );
  await client.close();
  if (res.modifiedCount !== 1) { console.error("no resolved ticket aged"); process.exit(1); }
})().catch((error) => { console.error(error); process.exit(1); });`;
  execFileSync(process.execPath, ['-e', script], {
    env: { ...process.env, LIVE_MONGO: `mongodb://127.0.0.1:27017/${DB}?replicaSet=rs0&directConnection=true`, LIVE_ID: ticketId, LIVE_DAYS: String(days) },
    stdio: 'pipe',
  });
}

/**
 * What a promise rejected with.
 *
 * @param promise - The call.
 * @returns The `ApiError` it threw.
 */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('expected the call to fail');
}

describe.skipIf(!LIVE)(`live My tickets, per child (${API_BASE_URL})`, () => {
  const realFetch = globalThis.fetch;
  let children: ChildSummary[] = [];
  let parentId = '';
  const staff: Record<string, string> = {};

  beforeAll(async () => {
    // jsdom's AbortSignal is not Node's, which Node's fetch refuses; the test
    // timeout stands in for the client's request timeout here.
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const { signal: _jsdomSignal, ...rest } = init ?? {};
      return realFetch(input, rest);
    }) as typeof fetch;
    const tokens = await api.post<{ access_token?: string }>('/auth/login', { email: EMAIL, password: PASSWORD }, { skipAuth: true });
    if (!tokens.access_token) throw new Error('The API returned no access token');
    sessionStore.setToken(tokens.access_token);
    parentId = String(JSON.parse(atob(tokens.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub);
    children = await getChildren();
    staff.talim = await staffToken('/auth/admin-login', 'platform');
    staff.greenfield = await staffToken('/auth/login', 'admin');
    staff.hillview = await staffToken('/auth/login', 'hillview.admin');
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
    sessionStore.setToken(null);
  });

  /**
   * The desk staff token for a child's ticket.
   *
   * @param child - The child.
   * @param desk - The desk.
   * @returns The token of the platform admin, or of the child's school admin.
   */
  const deskToken = (child: ChildSummary, desk: TicketDesk) => (desk === 'talim' ? staff.talim : /hillview/i.test(child.school.name) ? staff.hillview : staff.greenfield);

  it('the parent has children in two schools', () => {
    expect(children.length).toBeGreaterThanOrEqual(2);
    expect(new Set(children.map((child) => child.school.id)).size).toBeGreaterThanOrEqual(2);
    console.info(`children: ${children.map((child) => `${child.name} (${child.school.name})`).join(', ')}`);
  });

  it.each(DESKS)('runs the %s-desk flow for every child', async (desk) => {
    for (const child of children) {
      const token = deskToken(child, desk);
      const where = `${child.name}, ${desk}`;

      // Create, about this child, with context only the desk reads.
      const context = ticketContext(APP_VERSION, { path: '/settings?tab=help', userAgent: 'vitest-live (Talim Parents)' });
      const created = await createTicket({ desk, area: 'fees', subject: `Live ${desk} ${child.name} ${RUN}`, body: 'Charged twice.', childId: child.id, context });
      expect(created, where).toMatchObject({ desk, childId: child.id, child: { id: child.id, name: child.name }, access: 'requester', unread: 0, context: null });
      expect(created.school?.id, where).toBe(child.school.id);
      expect(created.requester.id, where).toBe(parentId);
      const seen = await raw<Ticket>('GET', `/tickets/${created.id}`, token);
      expect(seen.body.context, where).toEqual({ path: '/settings?tab=help', appVersion: APP_VERSION, userAgent: 'vitest-live (Talim Parents)' });

      // A staff reply is unread in the list; opening the ticket clears it.
      expect((await raw('POST', `/tickets/${created.id}/messages`, token, { body: 'Which invoice?' })).status, where).toBe(201);
      const row = (await getMyTickets({ page: 1, limit: 100 })).data.find((item) => item.id === created.id);
      expect(row, where).toMatchObject({ unread: 1, childId: child.id, status: 'in_progress' });
      expect(unreadLabel(row!), where).toBe('1 new');
      const opened = await getTicket(created.id);
      expect(opened.messages.map((message) => message.body), where).toEqual(['Charged twice.', 'Which invoice?']);
      expect((await getMyTickets({ page: 1, limit: 100 })).data.find((item) => item.id === created.id)?.unread, where).toBe(0);

      // Reply, then reopen within the window.
      const replied = await replyToTicket(created.id, { body: 'The hostel invoice.' });
      expect(replied.messageCount, where).toBe(3);
      expect((await raw('PATCH', `/tickets/${created.id}`, token, { status: 'resolved' })).status, where).toBe(200);
      expect(canReopen(await getTicket(created.id)), where).toBe(true);
      expect((await reopenTicket(created.id)).status, where).toBe('open');

      // Past the window: 409 REOPEN_WINDOW_PASSED; closed: 409 TICKET_CLOSED.
      expect((await raw('PATCH', `/tickets/${created.id}`, token, { status: 'resolved' })).status, where).toBe(200);
      ageResolved(created.id, 8);
      const stale = await getTicket(created.id);
      const reopen = await failure(reopenTicket(created.id));
      expect([reopen.status, reopen.reasonCode], where).toEqual([409, 'REOPEN_WINDOW_PASSED']);
      expect(ticketErrorMessage(reopen, stale, 'reopen'), where).toBe(reopenExpiredMessage(stale.reference));
      const reply = await failure(replyToTicket(created.id, { body: 'Still charged.' }));
      expect([reply.status, reply.reasonCode], where).toEqual([409, 'REOPEN_WINDOW_PASSED']);
      const closed = await closeTicket(created.id);
      expect(closed.status, where).toBe('closed');
      const late = await failure(replyToTicket(created.id, { body: 'One more thing.' }));
      expect([late.status, late.reasonCode], where).toEqual([409, 'TICKET_CLOSED']);
      expect(ticketErrorMessage(late, closed, 'reply'), where).toBe(TICKET_CLOSED_MESSAGE);
    }
  });
});
