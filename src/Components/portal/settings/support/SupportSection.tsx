import { Fragment, useId, useMemo, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useActiveChild } from '../../../../hooks/useActiveChild';
import { useMyTickets } from '../../../../hooks/portal/useTickets';
import { TICKET_STATUS_META, deskLabel, relativeTime, unreadLabel } from '../../../../lib/tickets';
import type { TicketSummary } from '../../../../types/tickets';
import type { ChildSummary } from '../../../../types/portal/children';
import { ErrorCard, Pill } from '../../ui/primitives';
import { focusRing, primaryButton, rowButton } from '../../ui/styles';
import { NewTicketSheet } from './NewTicketSheet';
import { TicketThreadSheet } from './TicketThreadSheet';

/** Props for {@link SupportSection}. */
export interface SupportSectionProps {
  /** The ticket whose thread is open (`?ticket=`), or null. */
  openTicketId: string | null;
  /** Opens a ticket's thread, or closes it with null; the caller keeps the URL in step. */
  onOpenTicket: (ticketId: string | null) => void;
}

/**
 * Settings → Help → My tickets (v1.5 §1): a "New ticket" button and the
 * parent's tickets about any child, most recent activity first, each with its
 * status chip, the child's name, the desk, the reference, an "N new" badge
 * for replies since the parent last opened it (`unread`; opening clears it on
 * the server) when
 * someone has written since, and when it last changed. One
 * `GET /tickets/mine` per page ("Load more"); the children's names come from
 * the already-loaded children list, never a call per row.
 *
 * @param props - See {@link SupportSectionProps}.
 * @param props.openTicketId - The ticket whose thread is open.
 * @param props.onOpenTicket - Opens or closes a thread.
 * @returns The section and its sheets.
 */
export function SupportSection({ openTicketId, onOpenTicket }: SupportSectionProps) {
  const headingId = useId();
  const list = useMyTickets();
  const { children } = useActiveChild();
  const [composing, setComposing] = useState(false);
  const tickets = useMemo(() => list.data?.pages.flatMap((page) => page.data) ?? [], [list.data]);
  const byId = useMemo(() => new Map(children.map((child) => [child.id, child])), [children]);
  const now = new Date();

  return (
    <section aria-labelledby={headingId} className="mt-2 border-t border-tl-line-soft pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="text-[17px] font-extrabold text-tl-ink">
            My tickets
          </h3>
          <p className="mt-0.5 text-[13px] text-tl-muted">Questions for your child&apos;s school or Talim support. Replies arrive here and in your notifications.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => setComposing(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New ticket
        </button>
      </div>

      <div className="mt-4">
        {list.isPending ? (
          <div role="status" aria-label="Loading your tickets" className="h-24 animate-pulse rounded-2xl bg-tl-track" />
        ) : list.isError ? (
          <ErrorCard error={list.error} title="Your tickets couldn't be loaded" onRetry={() => void list.refetch()} />
        ) : tickets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-tl-line p-4 text-sm text-tl-muted">
            No tickets yet. If something isn&apos;t right, raise a ticket and the reply will arrive here.
          </p>
        ) : (
          <ul aria-label="My tickets" className="flex flex-col gap-2">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <TicketRow ticket={ticket} child={ticket.childId ? byId.get(ticket.childId) : undefined} now={now} onOpen={() => onOpenTicket(ticket.id)} />
              </li>
            ))}
          </ul>
        )}
        {list.hasNextPage ? (
          <div className="mt-3">
            <button type="button" className={rowButton} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : null}
      </div>

      <NewTicketSheet
        open={composing}
        onClose={() => setComposing(false)}
        onCreated={(ticket) => {
          setComposing(false);
          onOpenTicket(ticket.id);
        }}
      />
      <TicketThreadSheet
        ticketId={openTicketId}
        onClose={() => onOpenTicket(null)}
        onNewTicket={() => {
          onOpenTicket(null);
          setComposing(true);
        }}
      />
    </section>
  );
}

/**
 * One ticket in the list as one 44px+ button: subject, "N new" badge, the
 * child, reference, desk, last activity and the status chip.
 *
 * @param props - The ticket, its child and what opening it does.
 * @param props.ticket - The ticket.
 * @param props.child - The child it is about, from the loaded children list.
 * @param props.now - The current time, for "Updated 2 hours ago".
 * @param props.onOpen - Opens its thread.
 * @returns The row.
 */
function TicketRow({ ticket, child, now, onOpen }: { ticket: TicketSummary; child?: ChildSummary; now: Date; onOpen: () => void }) {
  const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
  const updated = relativeTime(ticket.lastActivityAt, now);
  const fresh = unreadLabel(ticket);
  const meta = [ticket.child?.name ?? child?.name, ticket.reference, deskLabel(ticket.desk, ticket.school?.name ?? child?.school.name), updated ? `Updated ${updated}` : null].filter(
    (part): part is string => Boolean(part),
  );
  return (
    <button type="button" onClick={onOpen} className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-tl-line bg-tl-surface px-3.5 py-3 text-left hover:bg-tl-subtle ${focusRing}`}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {fresh ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-tl-brand" aria-hidden="true" /> : null}
          <span className="truncate text-[15px] font-extrabold text-tl-ink">{ticket.subject}</span>
          {fresh ? <Pill tone="accent">{fresh}</Pill> : null}
        </span>
        <span className="mt-0.5 block text-[13px] text-tl-muted">
          {/* The reference stays on one line (it would break at its hyphen on a phone). */}
          {meta.map((part, index) => (
            <Fragment key={index}>
              {index ? ' · ' : ''}
              {part === ticket.reference ? <span className="whitespace-nowrap">{part}</span> : part}
            </Fragment>
          ))}
        </span>
      </span>
      <Pill tone={status.tone}>{status.label}</Pill>
      <ChevronRight className="h-5 w-5 shrink-0 text-tl-faint" aria-hidden="true" />
    </button>
  );
}
