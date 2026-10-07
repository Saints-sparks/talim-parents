import { useEffect, useId, useRef, useState } from 'react';
import { useActiveChild } from '../../../../hooks/useActiveChild';
import { useCreateTicket, useTicketUploads } from '../../../../hooks/portal/useTickets';
import { getErrorMessage } from '../../../../lib/apiError';
import {
  NEW_TICKET_FIELDS,
  TICKET_AREA_LABELS,
  allowedDesks,
  areasFor,
  deskLabel,
  validateNewTicket,
  type NewTicketErrors,
  type NewTicketField,
} from '../../../../lib/tickets';
import { TICKET_BODY_MAX, TICKET_SUBJECT_MAX, type Ticket, type TicketArea, type TicketDesk } from '../../../../types/v15';
import { Sheet } from '../../ui/Dialog';
import { chip, fieldControl, fieldError, fieldLabel, ghostButton, primaryButton } from '../../ui/styles';
import { TicketFilePicker } from './TicketFilePicker';

/** Props for {@link NewTicketSheet}. */
export interface NewTicketSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called with the new ticket, to open its thread. */
  onCreated: (ticket: Ticket) => void;
}

/** A parent raises tickets to either desk (§1). */
const ROLE = 'parent' as const;

/**
 * Settings → Help → New ticket (v1.5 §1 `POST /tickets`): which child it is
 * about (the active child by default), who should handle it (that child's
 * school or Talim support), what it is about, a subject (3–140 characters),
 * the message (up to 5000) and up to five files. The checks run on Send and
 * focus the first field that needs attention; the draft stays if sending
 * fails, and the new ticket's thread opens after.
 *
 * @param props - See {@link NewTicketSheetProps}.
 * @param props.open - Whether the sheet is open.
 * @param props.onClose - Closes it.
 * @param props.onCreated - Receives the new ticket.
 * @returns The sheet.
 */
export function NewTicketSheet({ open, onClose, onCreated }: NewTicketSheetProps) {
  const { children, childId: activeChildId } = useActiveChild();
  const create = useCreateTicket();
  const uploads = useTicketUploads();
  const ids = { child: useId(), desk: useId(), area: useId(), subject: useId(), body: useId(), subjectCount: useId(), bodyCount: useId(), error: useId() };
  const [childId, setChildId] = useState<string>('');
  const [desk, setDesk] = useState<TicketDesk | null>(null);
  const [area, setArea] = useState<TicketArea | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [errors, setErrors] = useState<NewTicketErrors>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const fieldRefs = useRef<Partial<Record<NewTicketField, HTMLElement | null>>>({});
  const childRef = useRef<HTMLSelectElement | null>(null);
  const { reset } = create;

  useEffect(() => {
    if (!open) return;
    setChildId(activeChildId ?? children[0]?.id ?? '');
    setDesk(null);
    setArea(null);
    setSubject('');
    setBody('');
    setFiles([]);
    setFileErrors([]);
    setErrors({});
    setSendError(null);
    reset();
    // Reset once per opening; the active child is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosen = children.find((entry) => entry.id === childId) ?? null;
  const sending = create.isPending || uploads.isUploading;

  /** Checks the draft, then uploads the files and raises the ticket. */
  const send = async (): Promise<void> => {
    if (sending) return;
    const found = validateNewTicket({ desk, area, subject, body, attachments: files, childId: childId || null }, ROLE);
    setErrors(found);
    setSendError(null);
    const first = NEW_TICKET_FIELDS.find((field) => found[field]);
    if (first || !desk || !area) {
      if (first) fieldRefs.current[first]?.focus();
      return;
    }
    try {
      const attachments = await uploads.upload(files);
      const ticket = await create.mutateAsync({
        desk,
        area,
        subject: subject.trim(),
        body: body.trim(),
        childId,
        ...(attachments.length ? { attachments } : {}),
      });
      onCreated(ticket);
    } catch (error) {
      setSendError(getErrorMessage(error, 'Your ticket could not be sent.'));
    }
  };

  /**
   * The ids describing a field: its counter and its error, when shown.
   *
   * @param field - The field.
   * @param counterId - Its counter's id, if it has one.
   * @returns The space-separated ids, or undefined.
   */
  const describedBy = (field: NewTicketField, counterId?: string): string | undefined =>
    [counterId, errors[field] ? `${ids.error}-${field}` : null].filter(Boolean).join(' ') || undefined;

  /**
   * A field's error line.
   *
   * @param field - The field.
   * @returns The line, or null.
   */
  const errorLine = (field: NewTicketField) =>
    errors[field] ? (
      <p id={`${ids.error}-${field}`} className={fieldError}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <Sheet
      open={open}
      onClose={() => !sending && onClose()}
      eyebrowText="New ticket"
      title="How can we help?"
      subtitle="Ask your child's school, or tell Talim support about something in the portal. Replies arrive here and in your notifications."
      initialFocus={childRef}
      footer={
        <>
          <button type="button" className={ghostButton} onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button type="button" className={`${primaryButton} flex-1`} onClick={() => void send()} disabled={sending}>
            {sending ? 'Sending…' : 'Send ticket'}
          </button>
        </>
      }
    >
      <div>
        <label htmlFor={ids.child} className={fieldLabel}>
          Which child is it about?
        </label>
        <select
          id={ids.child}
          ref={(node) => {
            childRef.current = node;
            fieldRefs.current.childId = node;
          }}
          className={fieldControl}
          value={childId}
          onChange={(event) => setChildId(event.target.value)}
          aria-invalid={Boolean(errors.childId) || undefined}
          aria-describedby={describedBy('childId')}
          disabled={sending}
        >
          {children.length === 0 ? <option value="">No children linked</option> : null}
          {children.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} · {entry.school.name}
            </option>
          ))}
        </select>
        {errorLine('childId')}
      </div>

      <fieldset aria-describedby={describedBy('desk')}>
        <legend id={ids.desk} className={fieldLabel}>
          Who should handle it?
        </legend>
        <div role="radiogroup" aria-labelledby={ids.desk} className="flex flex-wrap gap-2">
          {allowedDesks(ROLE).map((option, index) => (
            <button
              key={option}
              ref={(node) => {
                if (index === 0) fieldRefs.current.desk = node;
              }}
              type="button"
              role="radio"
              aria-checked={desk === option}
              className={chip(desk === option)}
              onClick={() => setDesk(option)}
              disabled={sending}
            >
              {deskLabel(option, option === 'school' ? chosen?.school.name : null)}
            </button>
          ))}
        </div>
        {errorLine('desk')}
      </fieldset>

      <fieldset aria-describedby={describedBy('area')}>
        <legend id={ids.area} className={fieldLabel}>
          What is it about?
        </legend>
        <div role="radiogroup" aria-labelledby={ids.area} className="flex flex-wrap gap-2">
          {areasFor(ROLE).map((option, index) => (
            <button
              key={option}
              ref={(node) => {
                if (index === 0) fieldRefs.current.area = node;
              }}
              type="button"
              role="radio"
              aria-checked={area === option}
              className={chip(area === option)}
              onClick={() => setArea(option)}
              disabled={sending}
            >
              {TICKET_AREA_LABELS[option]}
            </button>
          ))}
        </div>
        {errorLine('area')}
      </fieldset>

      <div>
        <label htmlFor={ids.subject} className={fieldLabel}>
          Subject
        </label>
        <input
          id={ids.subject}
          ref={(node) => {
            fieldRefs.current.subject = node;
          }}
          className={fieldControl}
          value={subject}
          maxLength={TICKET_SUBJECT_MAX}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="e.g. Paid by card but no receipt"
          aria-invalid={Boolean(errors.subject) || undefined}
          aria-describedby={describedBy('subject', ids.subjectCount)}
          disabled={sending}
        />
        <p id={ids.subjectCount} className="mt-1.5 text-right text-[13px] text-tl-muted">
          {subject.trim().length} / {TICKET_SUBJECT_MAX}
        </p>
        {errorLine('subject')}
      </div>

      <div>
        <label htmlFor={ids.body} className={fieldLabel}>
          Message
        </label>
        <textarea
          id={ids.body}
          ref={(node) => {
            fieldRefs.current.body = node;
          }}
          className={`${fieldControl} min-h-[130px] resize-y py-3 leading-relaxed`}
          value={body}
          maxLength={TICKET_BODY_MAX}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What happened, and what you expected to see."
          aria-invalid={Boolean(errors.body) || undefined}
          aria-describedby={describedBy('body', ids.bodyCount)}
          disabled={sending}
        />
        <p id={ids.bodyCount} className="mt-1.5 text-right text-[13px] text-tl-muted">
          {body.trim().length.toLocaleString('en-GB')} / {TICKET_BODY_MAX.toLocaleString('en-GB')}
        </p>
        {errorLine('body')}
      </div>

      <TicketFilePicker files={files} onChange={setFiles} errors={errors.attachments ? [errors.attachments, ...fileErrors] : fileErrors} onErrors={setFileErrors} disabled={sending} />

      {sendError ? (
        <p role="alert" className={fieldError}>
          {sendError}
        </p>
      ) : null}
    </Sheet>
  );
}
