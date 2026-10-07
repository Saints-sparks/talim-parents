import { describe, expect, it } from 'vitest';
import { ApiError, messageForStatus } from '../apiError';
import { pathForTarget } from '../portalTargets';
import {
  TICKET_AREA_LABELS,
  TICKET_CLOSED_MESSAGE,
  TICKET_MESSAGE_CAP_MESSAGE,
  TICKET_STATUS_META,
  addTicketFiles,
  allowedDesks,
  areasFor,
  authorLabel,
  canReopen,
  deskLabel,
  messageError,
  parseTicketParam,
  relativeTime,
  reopenDeadline,
  reopenExpiredMessage,
  supportHref,
  ticketContext,
  ticketErrorMessage,
  unreadLabel,
  validateNewTicket,
  TICKET_CHANGED_MESSAGE,
  TICKET_INVALID_TRANSITION_MESSAGE,
} from '../tickets';
import { clearUnreadInPages } from '../../hooks/portal/useTickets';
import type { TicketPage, TicketSummary } from '../../types/tickets';

const NOW = new Date('2026-10-07T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();
const GOOD = { area: 'payments' as const, subject: 'No receipt', body: 'I paid on Monday.', attachments: [] as unknown[] };

describe('desks per role', () => {
  it('lets parents and students choose either desk, and staff only Talim', () => {
    expect(allowedDesks('parent')).toEqual(['school', 'talim']);
    expect(allowedDesks('student')).toEqual(['school', 'talim']);
    expect(allowedDesks('teacher')).toEqual(['talim']);
    expect(allowedDesks('school_sub_admin')).toEqual(['talim']);
  });

  it('accepts either desk from a parent who names the child, and refuses the school desk from staff', () => {
    expect(validateNewTicket({ ...GOOD, desk: 'school', childId: 'kid-1' }, 'parent')).toEqual({});
    expect(validateNewTicket({ ...GOOD, desk: 'talim', childId: 'kid-1' }, 'parent')).toEqual({});
    expect(validateNewTicket({ ...GOOD, desk: 'school' }, 'parent').childId).toBe('Choose which child this is about.');
    expect(validateNewTicket({ ...GOOD, desk: null, childId: 'kid-1' }, 'parent').desk).toBe('Choose who should handle this.');
    expect(validateNewTicket({ ...GOOD, desk: 'school' }, 'teacher').desk).toBe('Choose Talim support.');
    expect(validateNewTicket({ ...GOOD, desk: 'talim' }, 'teacher')).toEqual({});
  });

  it("names the desks with the child's school, and offers the parent's areas", () => {
    expect(deskLabel('school', 'Brightgate Academy')).toBe('My school (Brightgate Academy)');
    expect(deskLabel('school')).toBe('My school');
    expect(deskLabel('talim', 'Brightgate Academy')).toBe('Talim support');
    expect(areasFor('parent').map((area) => TICKET_AREA_LABELS[area])).toEqual([
      'Payments', 'Fees', 'Results', 'Attendance', 'Timetable', 'Messages', 'Transport', 'Behaviour', 'Signing in', 'Something else',
    ]);
  });
});

describe('new ticket and reply checks', () => {
  it('needs an area, a 3–140 character subject, a 1–5000 character message and at most five files', () => {
    expect(validateNewTicket({ desk: 'talim', area: null, subject: ' ab ', body: '  ', attachments: [1, 2, 3, 4, 5, 6], childId: 'kid-1' }, 'parent')).toEqual({
      area: 'Choose what it is about.',
      subject: 'The subject needs at least 3 characters.',
      body: 'Write a message.',
      attachments: 'Attach up to 5 files.',
    });
    expect(validateNewTicket({ ...GOOD, desk: 'talim', childId: 'k', subject: 'x'.repeat(141) }, 'parent').subject).toBe('Keep the subject to 140 characters (it has 141).');
    expect(messageError('x'.repeat(5001))).toBe('Keep the message to 5,000 characters (it has 5,001).');
    expect(messageError(' ok ')).toBeNull();
  });

  it("keeps the chat kit's file rules and the five-file cap", () => {
    const file = (name: string) => ({ name, size: 1000, type: '' });
    const result = addTicketFiles(['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf'].map(file), [file('e.png'), file('f.png'), file('x.exe')]);
    expect(result.files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf', 'e.png']);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[1]).toBe('You can attach up to 5 files to one message.');
  });

  it('names every status', () => {
    expect(Object.values(TICKET_STATUS_META).map((meta) => meta.label)).toEqual(['Open', 'In progress', 'Waiting on you', 'Resolved', 'Closed']);
  });
});

describe('the 7-day reopen window', () => {
  it('runs from resolvedAt', () => {
    expect(reopenDeadline({ status: 'resolved', resolvedAt: ago(2 * DAY) })?.toISOString()).toBe(new Date(NOW.getTime() + 5 * DAY).toISOString());
    expect(canReopen({ status: 'resolved', resolvedAt: ago(2 * DAY) }, NOW)).toBe(true);
    expect(canReopen({ status: 'resolved', resolvedAt: ago(10 * DAY) }, NOW)).toBe(false);
    expect(canReopen({ status: 'closed', resolvedAt: ago(DAY) }, NOW)).toBe(false);
  });
});

describe('409 words', () => {
  const ticket = { status: 'resolved' as const, reference: 'TS-9PX2D', messages: [] };
  const bare = new ApiError('CONFLICT', messageForStatus(409), 409);

  it("shows the server's message when it sent one", () => {
    expect(ticketErrorMessage(new ApiError('CONFLICT', 'Resolved over 7 days ago.', 409), ticket, 'reopen')).toBe('Resolved over 7 days ago.');
  });

  it('explains a bare 409 from what was being done', () => {
    expect(ticketErrorMessage(bare, ticket, 'reopen')).toBe(reopenExpiredMessage('TS-9PX2D'));
    expect(reopenExpiredMessage('TS-9PX2D')).toBe("This ticket was resolved more than 7 days ago, so it can't be reopened. Raise a new ticket and mention TS-9PX2D.");
    expect(ticketErrorMessage(bare, { ...ticket, status: 'closed' }, 'reply')).toBe(TICKET_CLOSED_MESSAGE);
    const full = { status: 'open' as const, reference: 'TS-1', messages: new Array(500).fill({}) };
    expect(ticketErrorMessage(bare, full, 'reply')).toBe(TICKET_MESSAGE_CAP_MESSAGE);
  });
});

describe('409 reasons, unread and context', () => {
  const ticket = { status: 'resolved' as const, reference: 'TS-1', messages: [] };
  const reason = (code: string) =>
    ApiError.fromResponse(new Response(null, { status: 409 }), { code, message: 'Server words.', error: { code: 'CONFLICT', message: 'Server words.' } });

  it("maps the API's reason (top-level code) to its words", () => {
    expect(reason('TICKET_CLOSED').reasonCode).toBe('TICKET_CLOSED');
    expect(ticketErrorMessage(reason('TICKET_CLOSED'), ticket, 'reply')).toBe(TICKET_CLOSED_MESSAGE);
    expect(ticketErrorMessage(reason('REOPEN_WINDOW_PASSED'), ticket, 'reply')).toBe(reopenExpiredMessage('TS-1'));
    expect(ticketErrorMessage(reason('MESSAGE_CAP'), ticket, 'reply')).toBe(TICKET_MESSAGE_CAP_MESSAGE);
    expect(ticketErrorMessage(reason('INVALID_TRANSITION'), ticket, 'reopen')).toBe(TICKET_INVALID_TRANSITION_MESSAGE);
    expect(ticketErrorMessage(reason('TICKET_CHANGED'), ticket, 'close')).toBe(TICKET_CHANGED_MESSAGE);
    expect(ticketErrorMessage(reason('SOMETHING_NEW'), ticket, 'close')).toBe('Server words.');
  });

  it("reads the server's count as an 'N new' badge, and clears it in the cached list once opened", () => {
    expect(unreadLabel({ unread: 0 })).toBeNull();
    expect(unreadLabel({ unread: 2 })).toBe('2 new');
    const row = (id: string, unread: number) => ({ id, unread }) as TicketSummary;
    const page: TicketPage = { data: [row('a', 2), row('b', 0)], meta: { total: 2, page: 1, lastPage: 1, limit: 20 } };
    const data = { pages: [page], pageParams: [1] };
    const read = clearUnreadInPages(data, 'a');
    expect(read?.pages[0].data.map((item) => item.unread)).toEqual([0, 0]);
    expect(clearUnreadInPages(read, 'a')).toBe(read);
  });

  it('reads the window from reopenableUntil when the detail has it', () => {
    const day = 864e5;
    expect(canReopen({ status: 'resolved', resolvedAt: new Date(NOW.getTime() - 9 * day).toISOString(), reopenableUntil: new Date(NOW.getTime() + day).toISOString() }, NOW)).toBe(true);
    expect(canReopen({ status: 'resolved', resolvedAt: new Date(NOW.getTime() - day).toISOString(), reopenableUntil: new Date(NOW.getTime() - 1).toISOString() }, NOW)).toBe(false);
  });

  it('sends where the parent was as context, cut to the lengths the API takes', () => {
    expect(ticketContext('1.5.0', { path: '/settings?tab=help', userAgent: 'z'.repeat(700) })).toEqual({ path: '/settings?tab=help', appVersion: '1.5.0', userAgent: 'z'.repeat(500) });
    expect(ticketContext('1.5.0', { path: null, userAgent: null })).toEqual({ appVersion: '1.5.0' });
  });
});

describe('thread and list words', () => {
  it('calls the parent You and names the staff side', () => {
    expect(authorLabel({ id: 'p1', name: 'Saint', role: 'parent' }, 'p1', 'p1')).toEqual({ name: 'You', role: null });
    expect(authorLabel({ id: 'a1', name: 'Amaka Obi', role: 'admin' }, 'p1', 'p1')).toEqual({ name: 'Amaka Obi', role: 'Talim support' });
    expect(authorLabel({ id: 's1', name: 'Mrs Bello', role: 'school_admin' }, 'p1', 'p1')).toEqual({ name: 'Mrs Bello', role: 'School' });
  });

  it('says how long ago', () => {
    expect(relativeTime(ago(20_000), NOW)).toBe('just now');
    expect(relativeTime(ago(2 * 60 * 60_000), NOW)).toBe('2 hours ago');
    expect(relativeTime(ago(DAY + 1000), NOW)).toBe('yesterday');
    expect(relativeTime(ago(3 * DAY), NOW)).toBe('3 days ago');
    expect(relativeTime('nonsense', NOW)).toBe('');
  });
});

describe('deep link', () => {
  it('routes a support notification to the ticket under Settings → Help', () => {
    expect(pathForTarget({ page: 'support', ticketId: 'tk-waiting' })).toBe('/settings?tab=help&ticket=tk-waiting');
    expect(pathForTarget({ page: 'support', ticketId: 'a b' })).toBe('/settings?tab=help&ticket=a%20b');
    expect(pathForTarget({ page: 'support' })).toBe('/settings?tab=help');
    expect(supportHref(null)).toBe('/settings?tab=help');
    expect(parseTicketParam(' tk-1 ')).toBe('tk-1');
    expect(parseTicketParam('')).toBeNull();
  });
});
