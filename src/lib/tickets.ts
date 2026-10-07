import { ApiError, getErrorMessage, messageForStatus } from './apiError';
import { validateFile } from '../Components/chat-kit/mediaTypes';
import type { Tone } from '../Components/portal/ui/styles';
import {
  TICKET_BODY_MAX,
  TICKET_REOPEN_WINDOW_DAYS,
  TICKET_SUBJECT_MAX,
  TICKET_SUBJECT_MIN,
  type Attachment,
  type Ticket,
  type TicketArea,
  type TicketAuthor,
  type TicketDesk,
  type TicketRole,
  type TicketStatus,
  type TicketSummary,
} from '../types/v15';

/**
 * Support tickets (v1.5 §1), the rules and words the screens share: which
 * desks and areas a role may use, what a new ticket must have, the labels and
 * tones of statuses, the 7-day reopen window, and how a 409 is explained.
 * Pure functions, so the screens and the tests read the same rules.
 */

/**
 * Settings → Help with My tickets, optionally with one ticket's thread open.
 * A support notification (`{ page: 'support', ticketId }`) leads here.
 *
 * @param ticketId - The ticket to open, if any.
 * @returns `/settings?tab=help`, or `/settings?tab=help&ticket=<id>`.
 */
export function supportHref(ticketId?: string | null): string {
  const id = ticketId?.trim();
  return id ? `/settings?tab=help&ticket=${encodeURIComponent(id)}` : '/settings?tab=help';
}

/**
 * Reads `?ticket=` (a ticket id from a deep link).
 *
 * @param raw - The query value.
 * @returns The id, or `null` when missing or blank.
 */
export function parseTicketParam(raw: string | null | undefined): string | null {
  const id = (raw ?? '').trim();
  return id || null;
}

/**
 * How long ago something happened, for "Updated 2 hours ago" and message times.
 *
 * @param iso - An ISO instant.
 * @param now - The current time.
 * @returns "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago",
 *   then the date ("12 Sep 2026"); an empty string when unreadable.
 */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  const at = new Date(iso ?? '').getTime();
  if (Number.isNaN(at)) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - at) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Files one ticket message may carry (Talim Admin's `MAX_ATTACHMENTS`). */
export const TICKET_ATTACHMENTS_MAX = 5;

/** Messages one ticket holds before the API answers 409 (§1). */
export const TICKET_MESSAGE_CAP = 500;

/** The reopen window, in milliseconds. */
const REOPEN_WINDOW_MS = TICKET_REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * The desks a role may raise a ticket to (§1): students and parents choose
 * their school or Talim; teachers and other school staff go to Talim only.
 *
 * @param role - Who is raising the ticket.
 * @returns The allowed desks, school first.
 */
export function allowedDesks(role: TicketRole): TicketDesk[] {
  return role === 'student' || role === 'parent' ? ['school', 'talim'] : ['talim'];
}

/** Label of every area. */
export const TICKET_AREA_LABELS: Record<TicketArea, string> = {
  grading: 'Grading',
  attendance: 'Attendance',
  timetable: 'Timetable',
  messages: 'Messages',
  signing_in: 'Signing in',
  payments: 'Payments',
  fees: 'Fees',
  results: 'Results',
  transport: 'Transport',
  behaviour: 'Behaviour',
  other: 'Something else',
};

/** The areas each kind of requester is offered, in order, always ending with `other`. */
const AREAS_BY_ROLE: Record<'teacher' | 'student' | 'parent', readonly TicketArea[]> = {
  teacher: ['grading', 'attendance', 'timetable', 'messages', 'results', 'signing_in', 'other'],
  student: ['results', 'attendance', 'timetable', 'messages', 'signing_in', 'fees', 'transport', 'behaviour', 'other'],
  parent: ['payments', 'fees', 'results', 'attendance', 'timetable', 'messages', 'transport', 'behaviour', 'signing_in', 'other'],
};

/**
 * The areas a role is offered on a new ticket. School staff other than
 * teachers get the teachers' list.
 *
 * @param role - Who is raising the ticket.
 * @returns The areas, ending with `other`.
 */
export function areasFor(role: TicketRole): readonly TicketArea[] {
  if (role === 'parent' || role === 'student') return AREAS_BY_ROLE[role];
  return AREAS_BY_ROLE.teacher;
}

/** Label and pill tone of every status. */
export const TICKET_STATUS_META: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'accent' },
  waiting_on_user: { label: 'Waiting on you', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'muted' },
};

/**
 * A desk's label: "Talim support", or "My school" with the school's name
 * when it is known ("My school (Easy Sparks Education Center)").
 *
 * @param desk - The desk.
 * @param schoolName - The ticket's school, or the child's school.
 * @returns The label.
 */
export function deskLabel(desk: TicketDesk, schoolName?: string | null): string {
  if (desk === 'talim') return 'Talim support';
  return schoolName?.trim() ? `My school (${schoolName.trim()})` : 'My school';
}

/** A new ticket as the form holds it. */
export interface NewTicketDraft {
  desk: TicketDesk | null;
  area: TicketArea | null;
  subject: string;
  body: string;
  /** The files picked so far; only how many is checked here. */
  attachments: readonly unknown[];
  /** Parents only: the child the ticket is about. */
  childId?: string | null;
}

/** The fields {@link validateNewTicket} can find fault with. */
export type NewTicketField = 'desk' | 'area' | 'subject' | 'body' | 'attachments' | 'childId';

/** One message per field at fault. */
export type NewTicketErrors = Partial<Record<NewTicketField, string>>;

/** The order the form shows its fields, so the first error can take focus. */
export const NEW_TICKET_FIELDS: readonly NewTicketField[] = ['childId', 'desk', 'area', 'subject', 'body', 'attachments'];

/**
 * Checks a new ticket the way the API will (§1): an allowed desk, an area, a
 * subject of 3 to 140 characters and a message of 1 to 5000 (both trimmed),
 * at most five files, and, from a parent, the child it is about.
 *
 * @param draft - The form.
 * @param role - Who is raising it.
 * @returns One message per field at fault; empty when it can be sent.
 */
export function validateNewTicket(draft: NewTicketDraft, role: TicketRole): NewTicketErrors {
  const errors: NewTicketErrors = {};
  const desks = allowedDesks(role);
  if (!draft.desk) errors.desk = 'Choose who should handle this.';
  else if (!desks.includes(draft.desk)) errors.desk = `Choose ${desks.map((desk) => deskLabel(desk)).join(' or ')}.`;

  if (!draft.area) errors.area = 'Choose what it is about.';

  const subject = draft.subject.trim();
  if (!subject) errors.subject = 'Add a subject.';
  else if (subject.length < TICKET_SUBJECT_MIN) errors.subject = `The subject needs at least ${TICKET_SUBJECT_MIN} characters.`;
  else if (subject.length > TICKET_SUBJECT_MAX) errors.subject = `Keep the subject to ${TICKET_SUBJECT_MAX} characters (it has ${subject.length}).`;

  const bodyError = messageError(draft.body);
  if (bodyError) errors.body = bodyError;

  if (draft.attachments.length > TICKET_ATTACHMENTS_MAX) errors.attachments = `Attach up to ${TICKET_ATTACHMENTS_MAX} files.`;

  if (role === 'parent' && !draft.childId) errors.childId = 'Choose which child this is about.';
  return errors;
}

/**
 * What is wrong with a message body (the first message or a reply): 1 to
 * 5000 characters once trimmed.
 *
 * @param body - The text.
 * @returns The message, or `null` when it can be sent.
 */
export function messageError(body: string): string | null {
  const text = body.trim();
  if (!text) return 'Write a message.';
  if (text.length > TICKET_BODY_MAX) return `Keep the message to ${TICKET_BODY_MAX.toLocaleString('en-GB')} characters (it has ${text.length.toLocaleString('en-GB')}).`;
  return null;
}

/**
 * Adds picked files to a message's selection: the chat kit's type and size
 * checks, then the five-file cap, with one message per problem.
 *
 * @param current - The files already picked.
 * @param incoming - The files just picked.
 * @returns The new selection and why any file was left out.
 */
export function addTicketFiles<F extends { name: string; size: number; type?: string }>(current: readonly F[], incoming: readonly F[]): { files: F[]; errors: string[] } {
  const files = [...current];
  const errors: string[] = [];
  let overLimit = false;
  for (const file of incoming) {
    const problem = validateFile(file);
    if (problem) {
      errors.push(problem);
      continue;
    }
    if (files.length >= TICKET_ATTACHMENTS_MAX) {
      overLimit = true;
      continue;
    }
    files.push(file);
  }
  if (overLimit) errors.push(`You can attach up to ${TICKET_ATTACHMENTS_MAX} files to one message.`);
  return { files, errors };
}

/**
 * An uploaded file as a ticket message carries it (§1 `attachments`):
 * `{ url, name, mimeType, size }` and nothing else.
 *
 * @param uploaded - What the upload answered.
 * @param uploaded.url - Where the file lives.
 * @param uploaded.name - Its name.
 * @param uploaded.mimeType - Its type.
 * @param uploaded.size - Its size in bytes.
 * @returns The ticket attachment.
 */
export function toTicketAttachment({ url, name, mimeType, size }: Attachment): Attachment {
  return { url, name, mimeType, size };
}

/**
 * The last moment a resolved ticket can be reopened: `resolvedAt` plus 7
 * days, or `null` when it is not resolved.
 *
 * @param ticket - The ticket.
 * @returns The deadline, or `null`.
 */
export function reopenDeadline(ticket: Pick<TicketSummary, 'status' | 'resolvedAt'>): Date | null {
  if (ticket.status !== 'resolved' || !ticket.resolvedAt) return null;
  const resolved = new Date(ticket.resolvedAt).getTime();
  return Number.isNaN(resolved) ? null : new Date(resolved + REOPEN_WINDOW_MS);
}

/**
 * Whether the requester may still reopen the ticket.
 *
 * @param ticket - The ticket.
 * @param now - The moment to check; now by default.
 * @returns True while resolved and within 7 days of `resolvedAt`.
 */
export function canReopen(ticket: Pick<TicketSummary, 'status' | 'resolvedAt'>, now: number | Date = Date.now()): boolean {
  const deadline = reopenDeadline(ticket);
  return deadline !== null && deadline.getTime() >= new Date(now).getTime();
}

/** The words for a reply to a closed ticket (409). */
export const TICKET_CLOSED_MESSAGE = 'This ticket is closed, so it takes no more replies. Raise a new ticket if you still need help.';

/** The words for a reply to a ticket that holds 500 messages (409). */
export const TICKET_MESSAGE_CAP_MESSAGE = `This ticket has reached its limit of ${TICKET_MESSAGE_CAP} messages, so it takes no more replies. Raise a new ticket if you still need help.`;

/**
 * The words for a reopen after the 7-day window (409).
 *
 * @param reference - The ticket's reference, to mention on the new one.
 * @returns The sentence.
 */
export function reopenExpiredMessage(reference: string): string {
  return `This ticket was resolved more than ${TICKET_REOPEN_WINDOW_DAYS} days ago, so it can't be reopened. Raise a new ticket and mention ${reference}.`;
}

/** What the requester was doing when a ticket write failed. */
export type TicketAction = 'reply' | 'reopen' | 'close';

/**
 * True when the API refused a ticket write as a conflict (409).
 *
 * @param error - Whatever was thrown.
 * @returns Whether it is a 409.
 */
export function isTicketConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/**
 * The words for a failed reply, reopen or close. A 409 shows the server's
 * own message when it sent one; otherwise it is explained from the ticket as
 * last loaded: closed, the 500-message cap, or the reopen window. Anything
 * else uses the error's message.
 *
 * @param error - Whatever was thrown.
 * @param ticket - The ticket as last loaded.
 * @param action - What was being attempted.
 * @returns The sentence to show.
 */
export function ticketErrorMessage(error: unknown, ticket: Pick<Ticket, 'status' | 'reference' | 'messages'>, action: TicketAction): string {
  if (!isTicketConflict(error)) {
    const fallback = action === 'reply' ? 'Your reply could not be sent.' : action === 'reopen' ? 'The ticket could not be reopened.' : 'The ticket could not be closed.';
    return getErrorMessage(error, fallback);
  }
  const server = (error as ApiError).message.trim();
  if (server && server !== messageForStatus(409)) return server;
  if (action === 'reopen') return reopenExpiredMessage(ticket.reference);
  if (action === 'reply' && ticket.status !== 'closed' && ticket.messages.length >= TICKET_MESSAGE_CAP) return TICKET_MESSAGE_CAP_MESSAGE;
  return TICKET_CLOSED_MESSAGE;
}

/**
 * Who wrote a message, as the thread names them: "You" for the requester,
 * otherwise the author's name and their desk ("Talim support" or "School").
 *
 * @param author - The message's author.
 * @param requesterId - The ticket's requester (`requester.userId`).
 * @param myUserId - The signed-in user, in case the API names the requester differently.
 * @returns The name and the desk line (`null` for the requester).
 */
export function authorLabel(author: TicketAuthor, requesterId: string | undefined, myUserId: string | undefined): { name: string; role: string | null } {
  if (author.id && (author.id === requesterId || author.id === myUserId)) return { name: 'You', role: null };
  let role: string | null = null;
  if (author.role === 'admin') role = 'Talim support';
  else if (author.role === 'school_admin' || author.role === 'school_sub_admin' || author.role === 'teacher') role = 'School';
  return { name: author.name?.trim() || role || 'Someone', role };
}
