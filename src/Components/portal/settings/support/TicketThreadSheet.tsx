import { useEffect, useId, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { useAuth } from '../../../../services/auth.services';
import { useActiveChild } from '../../../../hooks/useActiveChild';
import { useTicket, useTicketActions, useTicketUploads } from '../../../../hooks/portal/useTickets';
import { formatBytes } from '../../../chat-kit/mediaTypes';
import {
  TICKET_AREA_LABELS,
  TICKET_CLOSED_MESSAGE,
  TICKET_STATUS_META,
  authorLabel,
  canReopen,
  deskLabel,
  messageError,
  relativeTime,
  reopenDeadline,
  reopenExpiredMessage,
  ticketErrorMessage,
  type TicketAction,
} from '../../../../lib/tickets';
import { TICKET_BODY_MAX, type Ticket } from '../../../../types/tickets';
import { Sheet } from '../../ui/Dialog';
import { ErrorCard, Pill } from '../../ui/primitives';
import { dangerGhostButton, fieldControl, fieldError, fieldLabel, focusRing, ghostButton, primaryButton, rowButton, statBox } from '../../ui/styles';
import { TicketFilePicker } from './TicketFilePicker';

/** Props for {@link TicketThreadSheet}. */
export interface TicketThreadSheetProps {
  /** The ticket to show; the sheet is open while one is set. */
  ticketId: string | null;
  onClose: () => void;
  /** Opens the New ticket sheet (from a closed or expired ticket). */
  onNewTicket: () => void;
}

/**
 * One ticket's thread (v1.5 §1 `GET /tickets/:id`): its status, the child it
 * is about, every message oldest first with its files, and what the parent
 * can do next: reply with up to five files, reopen within 7 days of it being
 * resolved (past that, the reason and a "New ticket" button), or close it
 * after a confirm step. A 409 is explained in an alert, the draft is kept and
 * the ticket reloaded.
 *
 * @param props - See {@link TicketThreadSheetProps}.
 * @param props.ticketId - The ticket, or null when closed.
 * @param props.onClose - Closes the sheet.
 * @param props.onNewTicket - Opens the New ticket sheet.
 * @returns The sheet.
 */
export function TicketThreadSheet({ ticketId, onClose, onNewTicket }: TicketThreadSheetProps) {
  const query = useTicket(ticketId);
  const { children } = useActiveChild();
  const ticket = query.data;
  const child = ticket?.childId ? children.find((entry) => entry.id === ticket.childId) : undefined;
  return (
    <Sheet
      open={Boolean(ticketId)}
      onClose={onClose}
      eyebrowText={ticket?.reference ?? 'Support ticket'}
      title={ticket?.subject ?? 'Support ticket'}
      subtitle={
        ticket
          ? [deskLabel(ticket.desk, child?.school.name), TICKET_AREA_LABELS[ticket.area] ?? TICKET_AREA_LABELS.other, child ? `About ${child.name}` : null].filter(Boolean).join(' · ')
          : undefined
      }
    >
      {ticket ? (
        <ThreadBody key={ticket.id} ticket={ticket} onNewTicket={onNewTicket} />
      ) : query.isError ? (
        <ErrorCard error={query.error} title="This ticket couldn't be loaded" onRetry={() => void query.refetch()} />
      ) : (
        <div role="status" aria-label="Loading the ticket" className="h-40 animate-pulse rounded-2xl bg-tl-track" />
      )}
    </Sheet>
  );
}

/**
 * The loaded thread: status, messages, next steps and the reply box.
 *
 * @param props - The ticket and the New ticket opener.
 * @param props.ticket - The ticket.
 * @param props.onNewTicket - Opens the New ticket sheet.
 * @returns The content.
 */
function ThreadBody({ ticket, onNewTicket }: { ticket: Ticket; onNewTicket: () => void }) {
  const { parentId } = useAuth();
  const replyId = useId();
  const countId = useId();
  const errorId = useId();
  const { reply, reopen, close } = useTicketActions(ticket.id);
  const uploads = useTicketUploads();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirmingClose) confirmButton.current?.focus();
    else if (wasConfirming.current) closeButton.current?.focus();
    wasConfirming.current = confirmingClose;
  }, [confirmingClose]);

  const now = new Date();
  const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
  const closed = ticket.status === 'closed';
  const deadline = reopenDeadline(ticket);
  const reopenable = canReopen(ticket, now);
  const expired = ticket.status === 'resolved' && !reopenable;
  const busy = reply.isPending || uploads.isUploading || reopen.isPending || close.isPending;
  const messages = ticket.messages.filter((entry) => !entry.internal);

  /**
   * Runs a ticket write and shows what went wrong, if anything.
   *
   * @param action - What is being done.
   * @param run - The write.
   * @returns True when it succeeded.
   */
  const attempt = async (action: TicketAction, run: () => Promise<unknown>): Promise<boolean> => {
    setProblem(null);
    try {
      await run();
      return true;
    } catch (error) {
      setProblem(ticketErrorMessage(error, ticket, action));
      return false;
    }
  };

  /** Checks and sends the reply; the draft stays if it fails. */
  const send = async (): Promise<void> => {
    if (busy) return;
    const invalid = messageError(text);
    setReplyError(invalid);
    if (invalid) return;
    const sent = await attempt('reply', async () => {
      const attachments = await uploads.upload(files);
      await reply.mutateAsync({ body: text.trim(), ...(attachments.length ? { attachments } : {}) });
    });
    if (sent) {
      setText('');
      setFiles([]);
      setFileErrors([]);
    }
  };

  /** Closes the ticket after the confirm step. */
  const doClose = async (): Promise<void> => {
    await attempt('close', () => close.mutateAsync());
    setConfirmingClose(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <Pill tone={status.tone}>{status.label}</Pill>
        {ticket.createdAt ? <span className="text-[13px] text-tl-muted">Raised {relativeTime(ticket.createdAt, now)}</span> : null}
      </div>

      <ol aria-label="Messages" className="flex flex-col gap-3">
        {messages.map((entry) => {
          const author = authorLabel(entry.author, ticket.requester.id, parentId);
          return (
            <li key={entry.id} className={`rounded-2xl border p-3.5 ${author.role ? 'border-tl-line bg-tl-surface' : 'border-tl-line-soft bg-tl-subtle'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-extrabold text-tl-ink">
                  {author.name}
                  {author.role ? <span className="ml-1.5 text-[13px] font-bold text-tl-muted">{author.role}</span> : null}
                </p>
                <time dateTime={entry.createdAt} className="text-[13px] text-tl-muted">
                  {relativeTime(entry.createdAt, now)}
                </time>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-tl-ink">{entry.body}</p>
              {entry.attachments.length ? (
                <ul aria-label="Attachments" className="mt-2.5 flex flex-wrap gap-2">
                  {entry.attachments.map((file, index) => (
                    <li key={`${file.url}-${index}`}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-tl-line px-3 text-[13px] font-bold text-tl-link hover:bg-tl-bg ${focusRing}`}
                      >
                        <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{file.name}</span>
                        {file.size ? <span className="shrink-0 font-semibold text-tl-muted">{formatBytes(file.size)}</span> : null}
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>

      {ticket.status === 'resolved' && reopenable && deadline ? (
        <div className={`${statBox} flex flex-wrap items-center justify-between gap-3`}>
          <p className="text-[13px] text-tl-muted">You can reopen until {deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.</p>
          <button type="button" className={rowButton} onClick={() => void attempt('reopen', () => reopen.mutateAsync())} disabled={busy}>
            {reopen.isPending ? 'Reopening…' : 'Reopen'}
          </button>
        </div>
      ) : null}

      {expired || closed ? (
        <div className={`${statBox} flex flex-wrap items-center justify-between gap-3`}>
          <p className="text-[13px] text-tl-muted">{closed ? TICKET_CLOSED_MESSAGE : reopenExpiredMessage(ticket.reference)}</p>
          <button type="button" className={rowButton} onClick={onNewTicket}>
            New ticket
          </button>
        </div>
      ) : null}

      {problem ? (
        <p role="alert" className={fieldError}>
          {problem}
        </p>
      ) : null}

      {closed ? null : (
        <div className="flex flex-col gap-3 border-t border-tl-line-soft pt-4">
          <div>
            <label htmlFor={replyId} className={fieldLabel}>
              Your reply
            </label>
            <textarea
              id={replyId}
              className={`${fieldControl} min-h-[100px] resize-y py-3 leading-relaxed`}
              value={text}
              maxLength={TICKET_BODY_MAX}
              onChange={(event) => setText(event.target.value)}
              aria-invalid={Boolean(replyError) || undefined}
              aria-describedby={replyError ? `${countId} ${errorId}` : countId}
              disabled={busy}
            />
            <p id={countId} className="mt-1.5 text-right text-[13px] text-tl-muted">
              {text.trim().length.toLocaleString('en-GB')} / {TICKET_BODY_MAX.toLocaleString('en-GB')}
            </p>
            {replyError ? (
              <p id={errorId} className={fieldError}>
                {replyError}
              </p>
            ) : null}
          </div>
          <TicketFilePicker files={files} onChange={setFiles} errors={fileErrors} onErrors={setFileErrors} disabled={busy} />
          {confirmingClose ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="w-full text-[13px] text-tl-muted">Close this ticket? You won&apos;t be able to reply to it afterwards.</p>
              <button type="button" className={ghostButton} onClick={() => setConfirmingClose(false)} disabled={close.isPending}>
                Keep it open
              </button>
              <button ref={confirmButton} type="button" className={primaryButton} onClick={() => void doClose()} disabled={close.isPending}>
                {close.isPending ? 'Closing…' : 'Yes, close ticket'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-between gap-2.5">
              <button ref={closeButton} type="button" className={dangerGhostButton} onClick={() => setConfirmingClose(true)} disabled={busy}>
                Close ticket
              </button>
              <button type="button" className={primaryButton} onClick={() => void send()} disabled={busy}>
                {reply.isPending || uploads.isUploading ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
