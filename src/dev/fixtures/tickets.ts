import type { CreateTicketPayload, Ticket, TicketMessage, TicketStatus, TicketSummary } from '../../types/v15';
import { TICKET_BODY_MAX, TICKET_SUBJECT_MAX, TICKET_SUBJECT_MIN } from '../../types/v15';
import { canReopen, TICKET_MESSAGE_CAP } from '../../lib/tickets';
import type { FixtureDb } from './db';
import { fail, ok, type FixtureRequest, type FixtureRoute } from './router';
import { PARENT, SCHOOLS, type SeedChild } from './seed';

/**
 * Dev and test fixtures for the v1.5 tickets (§1, the requester's routes):
 * four tickets about the family's children, one per interesting state (open
 * with an unread reply, waiting on the parent, resolved two days ago, resolved
 * ten days ago), and the routes that answer like the API, its 409s included
 * (a reply to a closed ticket, a reopen after the 7-day window).
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * An ISO instant some time before `now`.
 *
 * @param now - The reference time.
 * @param ms - How long before.
 * @returns The instant.
 */
function ago(now: number, ms: number): string {
  return new Date(now - ms).toISOString();
}

/**
 * One message of a seeded thread.
 *
 * @param id - The message id.
 * @param from - `me` for the parent, else the staff member.
 * @param body - The text.
 * @param createdAt - When it was written.
 * @returns The message.
 */
function message(id: string, from: 'me' | { name: string; role: 'admin' | 'school_admin' }, body: string, createdAt: string): TicketMessage {
  const author = from === 'me' ? { id: PARENT.id, name: `${PARENT.firstName} ${PARENT.lastName}`, role: 'parent' as const } : { id: `staff-${from.role}`, name: from.name, role: from.role };
  return { id, author, body, attachments: [], internal: false, createdAt };
}

/**
 * The seeded tickets, dated relative to `now` so the reopen window behaves
 * the same on any day. None for a family with no children linked.
 *
 * @param children - The family.
 * @param now - The reference time (ms).
 * @returns The tickets, newest activity first.
 */
export function seedTickets(children: SeedChild[], now: number = Date.now()): Ticket[] {
  if (!children.length) return [];
  const first = children[0];
  const last = children[children.length - 1];
  const base = (child: SeedChild) => ({
    schoolId: SCHOOLS[child.school].id,
    requester: { userId: PARENT.id, role: 'parent' as const },
    childId: child.id,
    priority: 'normal' as const,
  });
  return [
    {
      ...base(first),
      id: 'tk-open',
      reference: 'CMP-2026-0311',
      desk: 'school',
      area: 'results',
      subject: 'Report card shows the wrong class',
      status: 'open',
      createdAt: ago(now, 6 * HOUR),
      lastActivityAt: ago(now, 2 * HOUR),
      unread: true,
      messages: [
        message('m-1', 'me', `${first.first}'s report card says Jss2 A, but ${first.first} is in ${first.className ?? 'Jss1 A'}.`, ago(now, 6 * HOUR)),
        message('m-2', { name: 'Mrs Funmi Bello', role: 'school_admin' }, 'Thank you. The records office is checking it now.', ago(now, 2 * HOUR)),
      ],
    },
    {
      ...base(first),
      id: 'tk-waiting',
      reference: 'TS-4K7QM',
      desk: 'talim',
      area: 'payments',
      subject: 'Paid by card but no receipt',
      status: 'waiting_on_user',
      createdAt: ago(now, 2 * DAY),
      firstResponseAt: ago(now, DAY),
      lastActivityAt: ago(now, DAY),
      messages: [
        message('m-3', 'me', 'I paid the exam fee by card on Monday but no receipt has appeared.', ago(now, 2 * DAY)),
        message('m-4', { name: 'Amaka Obi', role: 'admin' }, 'Could you send the payment reference from your bank alert?', ago(now, DAY)),
      ],
    },
    {
      ...base(last),
      id: 'tk-resolved',
      reference: 'CMP-2026-0287',
      desk: 'school',
      area: 'transport',
      subject: 'School bus skipped our stop',
      status: 'resolved',
      createdAt: ago(now, 4 * DAY),
      firstResponseAt: ago(now, 3 * DAY),
      resolvedAt: ago(now, 2 * DAY),
      lastActivityAt: ago(now, 2 * DAY),
      messages: [
        message('m-5', 'me', 'The bus did not stop at Allen Avenue this morning.', ago(now, 4 * DAY)),
        message('m-6', { name: 'Mr Tunde Ade', role: 'school_admin' }, 'The driver has been reminded; the stop is back on the route.', ago(now, 2 * DAY)),
      ],
    },
    {
      ...base(last),
      id: 'tk-old',
      reference: 'TS-9PX2D',
      desk: 'talim',
      area: 'messages',
      subject: 'Voice notes do not play',
      status: 'resolved',
      createdAt: ago(now, 12 * DAY),
      firstResponseAt: ago(now, 11 * DAY),
      resolvedAt: ago(now, 10 * DAY),
      lastActivityAt: ago(now, 10 * DAY),
      messages: [
        message('m-7', 'me', 'Voice notes from the class teacher show 0:00 and do not play.', ago(now, 12 * DAY)),
        message('m-8', { name: 'Amaka Obi', role: 'admin' }, 'Fixed in today’s update. Refresh the page and they will play.', ago(now, 10 * DAY)),
      ],
    },
  ];
}

/**
 * A ticket's list row (without its thread).
 *
 * @param ticket - The ticket.
 * @returns The summary.
 */
function summaryOf(ticket: Ticket): TicketSummary {
  const { messages: _messages, ...summary } = ticket;
  return summary;
}

/**
 * A deep copy, so callers never hold the store's objects.
 *
 * @param value - The stored value.
 * @returns The copy.
 */
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The `/tickets` routes over the fixture database, literal paths first.
 *
 * @param db - The fixtures' state.
 * @returns The routes.
 */
export function ticketRoutes(db: FixtureDb): FixtureRoute[] {
  /**
   * The ticket a request names, or the 404 to answer.
   *
   * @param request - The request.
   * @returns The stored ticket, or a 404 response.
   */
  const find = (request: FixtureRequest): Ticket | Response =>
    db.tickets.find((ticket) => ticket.id === request.params.id) ?? fail(404, 'NOT_FOUND', 'Ticket not found');
  const body = (request: FixtureRequest): Record<string, unknown> => (request.body ?? {}) as Record<string, unknown>;

  return [
    { method: 'GET', pattern: '/tickets/mine', handler: (request) => {
      const status = request.query.get('status') as TicketStatus | null;
      const page = Math.max(1, Number(request.query.get('page') ?? 1));
      const limit = Math.max(1, Number(request.query.get('limit') ?? 20));
      const rows = db.tickets.filter((ticket) => !status || ticket.status === status).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
      return ok(rows.slice((page - 1) * limit, page * limit).map((ticket) => summaryOf(copy(ticket))), {
        total: rows.length, page, limit, lastPage: Math.max(1, Math.ceil(rows.length / limit)),
      });
    } },
    { method: 'POST', pattern: '/tickets', handler: (request) => {
      const input = body(request) as Partial<CreateTicketPayload>;
      const child = db.children.find((entry) => entry.id === input.childId);
      if (!child) return fail(404, 'NOT_FOUND', 'Child not found');
      const subject = String(input.subject ?? '').trim();
      const text = String(input.body ?? '').trim();
      const details: { field: string; reason: string }[] = [];
      if (input.desk !== 'school' && input.desk !== 'talim') details.push({ field: 'desk', reason: 'must be school or talim' });
      if (!input.area) details.push({ field: 'area', reason: 'required' });
      if (subject.length < TICKET_SUBJECT_MIN || subject.length > TICKET_SUBJECT_MAX) details.push({ field: 'subject', reason: 'length' });
      if (!text || text.length > TICKET_BODY_MAX) details.push({ field: 'body', reason: 'length' });
      if (details.length) return fail(400, 'VALIDATION_FAILED', 'Some fields need attention.', details);
      db.counter += 1;
      const now = new Date().toISOString();
      const id = `tk-new-${db.counter}`;
      const ticket: Ticket = {
        id,
        reference: input.desk === 'talim' ? `TS-N${db.counter}` : `CMP-2026-${db.counter}`,
        desk: input.desk as Ticket['desk'],
        schoolId: SCHOOLS[child.school].id,
        requester: { userId: PARENT.id, role: 'parent' },
        childId: child.id,
        area: input.area as Ticket['area'],
        subject,
        status: 'open',
        priority: 'normal',
        createdAt: now,
        lastActivityAt: now,
        unread: false,
        messages: [{ ...message(`${id}-m1`, 'me', text, now), attachments: input.attachments ?? [] }],
      };
      db.tickets.unshift(ticket);
      return ok(copy(ticket), undefined, 201);
    } },
    { method: 'GET', pattern: '/tickets/:id', handler: (request) => {
      const ticket = find(request);
      if (ticket instanceof Response) return ticket;
      ticket.unread = false;
      return ok(copy(ticket));
    } },
    { method: 'POST', pattern: '/tickets/:id/messages', handler: (request) => {
      const ticket = find(request);
      if (ticket instanceof Response) return ticket;
      if (ticket.status === 'closed' || ticket.messages.length >= TICKET_MESSAGE_CAP) return fail(409, 'CONFLICT', '');
      const now = new Date().toISOString();
      const input = body(request) as { body?: string; attachments?: TicketMessage['attachments'] };
      ticket.messages.push({ ...message(`${ticket.id}-m${ticket.messages.length + 1}`, 'me', String(input.body ?? '').trim(), now), attachments: input.attachments ?? [] });
      if (ticket.status === 'waiting_on_user') ticket.status = 'open';
      ticket.lastActivityAt = now;
      return ok(copy(ticket), undefined, 201);
    } },
    { method: 'POST', pattern: '/tickets/:id/reopen', handler: (request) => {
      const ticket = find(request);
      if (ticket instanceof Response) return ticket;
      if (!canReopen(ticket)) return fail(409, 'CONFLICT', '');
      ticket.status = 'open';
      ticket.resolvedAt = null;
      ticket.lastActivityAt = new Date().toISOString();
      return ok(copy(ticket));
    } },
    { method: 'POST', pattern: '/tickets/:id/close', handler: (request) => {
      const ticket = find(request);
      if (ticket instanceof Response) return ticket;
      const now = new Date().toISOString();
      ticket.status = 'closed';
      ticket.closedAt = now;
      ticket.lastActivityAt = now;
      return ok(copy(ticket));
    } },
  ];
}
