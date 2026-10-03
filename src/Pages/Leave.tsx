import { useId, useRef, useState, type FormEvent } from 'react';
import { useChildLeave, useLeaveMutations } from '../hooks/portal/useChildData';
import { ChildGate } from '../Components/portal/ChildGate';
import { ErrorCard, LoadingCard, PageHeader, Pill } from '../Components/portal/ui/primitives';
import { card, cardFrame, cardTitle, dangerGhostButton, fieldControl, fieldError, fieldLabel, ghostButton, primaryButton, rowButton, type Tone } from '../Components/portal/ui/styles';
import { ApiError, getErrorMessage } from '../lib/apiError';
import { firstNameOf, leaveRange } from '../lib/format';
import type { ChildSummary } from '../types/portal/children';
import type { LeaveRequest, LeaveStatus, LeaveType } from '../types/portal/leave';

/** The leave types (B9), in the design's order and wording. */
export const LEAVE_TYPES: readonly { value: LeaveType; label: string }[] = [
  { value: 'illness', label: 'Illness' },
  { value: 'medical', label: 'Medical appointment' },
  { value: 'family_travel', label: 'Family travel' },
  { value: 'religious', label: 'Religious observance' },
  { value: 'other', label: 'Other' },
];

const TYPE_LABEL = new Map(LEAVE_TYPES.map((type) => [type.value, type.label]));

/** How each status reads. `Rejected` arrives as `declined` (B9). */
const STATUS: Record<LeaveStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'info' },
  approved: { label: 'Approved', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
};

/** The form's fields. */
interface LeaveForm {
  type: LeaveType;
  startDate: string;
  endDate: string;
  note: string;
}

const EMPTY: LeaveForm = { type: 'illness', startDate: '', endDate: '', note: '' };

/**
 * Checks the form before it is sent.
 *
 * @param form - The fields.
 * @returns A message per invalid field.
 */
export function validateLeave(form: LeaveForm): Partial<Record<keyof LeaveForm, string>> {
  const errors: Partial<Record<keyof LeaveForm, string>> = {};
  if (!form.startDate) errors.startDate = 'Choose the first day of leave.';
  if (form.endDate && form.startDate && form.endDate < form.startDate) errors.endDate = 'The last day must be on or after the first.';
  if (form.note.length > 500) errors.note = 'Keep the note under 500 characters.';
  return errors;
}

/**
 * Leave requests for one child (B9): the form (new, or editing a pending
 * request) beside the session's requests, which can be changed or withdrawn
 * while the school has not decided them.
 *
 * @param props - The child.
 * @param props.child - The active child.
 * @returns The screen.
 */
function ChildLeave({ child }: { child: ChildSummary }) {
  const query = useChildLeave(child.id);
  const { create, update, remove } = useLeaveMutations(child.id);
  const [form, setForm] = useState<LeaveForm>(EMPTY);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof LeaveForm, string>>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
  const firstName = firstNameOf(child.name);
  const ids = { type: useId(), from: useId(), to: useId(), note: useId() };
  const fromRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const saving = create.isPending || update.isPending;

  const set = <K extends keyof LeaveForm>(key: K, value: LeaveForm[K]): void => setForm((current) => ({ ...current, [key]: value }));

  const reset = (): void => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setNotice(null);
    const found = validateLeave(form);
    setErrors(found);
    if (Object.keys(found).length) {
      if (found.startDate) fromRef.current?.focus();
      return;
    }
    const payload = { type: form.type, startDate: form.startDate, endDate: form.endDate || form.startDate, ...(form.note.trim() ? { note: form.note.trim() } : {}) };
    const onError = (error: unknown): void => {
      if (error instanceof ApiError) {
        const fields = error.fieldErrors();
        setErrors({ startDate: fields.startDate, endDate: fields.endDate, note: fields.note, type: fields.type });
      }
      setNotice({ tone: 'warning', text: getErrorMessage(error, 'The request could not be sent. Please try again.') });
    };
    if (editing) {
      update.mutate(
        { id: editing.id, payload },
        {
          onSuccess: () => {
            reset();
            setNotice({ tone: 'success', text: 'Changes saved. The class teacher sees the updated request.' });
          },
          onError,
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          reset();
          setNotice({ tone: 'success', text: 'Sent to the class teacher. You will be told as soon as the school responds.' });
        },
        onError,
      });
    }
  };

  const startEdit = (request: LeaveRequest): void => {
    setEditing(request);
    setNotice(null);
    setErrors({});
    setForm({ type: request.type, startDate: request.startDate, endDate: request.endDate, note: request.note ?? '' });
    titleRef.current?.focus();
  };

  const withdraw = (request: LeaveRequest): void => {
    setNotice(null);
    remove.mutate(request.id, {
      onSuccess: () => {
        if (editing?.id === request.id) reset();
        setNotice({ tone: 'warning', text: 'Request withdrawn. The school will no longer see it.' });
      },
      onError: (error) => setNotice({ tone: 'warning', text: getErrorMessage(error, 'The request could not be withdrawn.') }),
    });
  };

  const requests = query.data?.requests ?? [];

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title="Leave requests" subtitle={`Tell the school in advance when ${firstName} will be away.`} />

      <div className="grid items-start gap-4 min-[980px]:grid-cols-[minmax(300px,420px)_1fr]">
        <section className={card} aria-labelledby="leave-form-title">
          <h2 id="leave-form-title" ref={titleRef} tabIndex={-1} className={`${cardTitle} focus:outline-none`}>
            {editing ? 'Edit request' : 'New request'}
          </h2>
          <p className="mt-1 text-sm text-tl-muted">
            {editing ? 'Pending requests can be changed until the school responds.' : 'The class teacher sees it straight away.'}
          </p>
          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3.5" aria-label={editing ? 'Edit leave request' : 'New leave request'}>
            <div>
              <label htmlFor={ids.type} className={fieldLabel}>
                Reason for leave
              </label>
              <select id={ids.type} className={fieldControl} value={form.type} onChange={(event) => set('type', event.target.value as LeaveType)}>
                {LEAVE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
              <div>
                <label htmlFor={ids.from} className={fieldLabel}>
                  From
                </label>
                <input
                  ref={fromRef}
                  id={ids.from}
                  type="date"
                  className={fieldControl}
                  value={form.startDate}
                  onChange={(event) => set('startDate', event.target.value)}
                  aria-invalid={Boolean(errors.startDate) || undefined}
                  aria-describedby={errors.startDate ? `${ids.from}-error` : undefined}
                />
                {errors.startDate ? <p id={`${ids.from}-error`} className={fieldError}>{errors.startDate}</p> : null}
              </div>
              <div>
                <label htmlFor={ids.to} className={fieldLabel}>
                  To
                </label>
                <input
                  id={ids.to}
                  type="date"
                  className={fieldControl}
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(event) => set('endDate', event.target.value)}
                  aria-invalid={Boolean(errors.endDate) || undefined}
                  aria-describedby={errors.endDate ? `${ids.to}-error` : `${ids.to}-hint`}
                />
                {errors.endDate ? (
                  <p id={`${ids.to}-error`} className={fieldError}>{errors.endDate}</p>
                ) : (
                  <p id={`${ids.to}-hint`} className="sr-only">Leave empty for one day.</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor={ids.note} className={fieldLabel}>
                Note to the teacher
              </label>
              <textarea
                id={ids.note}
                className={`${fieldControl} min-h-[104px] resize-y py-3 leading-normal`}
                placeholder="A short explanation helps the school plan."
                value={form.note}
                onChange={(event) => set('note', event.target.value)}
                aria-invalid={Boolean(errors.note) || undefined}
              />
              {errors.note ? <p className={fieldError}>{errors.note}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button type="submit" className={`${primaryButton} min-w-[160px] flex-1`} disabled={saving}>
                {saving ? 'Sending…' : editing ? 'Save changes' : 'Send request'}
              </button>
              {editing ? (
                <button type="button" className={ghostButton} onClick={reset}>
                  Cancel
                </button>
              ) : null}
            </div>
            <div aria-live="polite">
              {notice ? (
                <p className={`rounded-[14px] px-[15px] py-[13px] text-sm font-bold leading-normal ${notice.tone === 'success' ? 'bg-tl-success-bg text-tl-success' : 'bg-tl-warning-bg text-tl-warning'}`}>
                  {notice.text}
                </p>
              ) : null}
            </div>
          </form>
        </section>

        <section className={cardFrame} aria-labelledby="leave-list-title">
          <div className="px-[clamp(18px,2.4vw,24px)] pb-4 pt-[clamp(18px,2.4vw,24px)]">
            <h2 id="leave-list-title" className={cardTitle}>
              Past requests
            </h2>
            <p className="mt-1 text-sm text-tl-muted">
              {query.data ? `${query.data.countThisSession} request${query.data.countThisSession === 1 ? '' : 's'} this session` : ' '}
            </p>
          </div>
          {query.isPending ? <div className="px-6 pb-6"><LoadingCard rows={3} label="Loading leave requests" /></div> : null}
          {query.isError ? <div className="px-6 pb-6"><ErrorCard error={query.error} title="Leave requests couldn't be loaded" onRetry={() => void query.refetch()} /></div> : null}
          {query.data && requests.length === 0 ? (
            <p className="border-t border-tl-line-soft px-6 py-5 text-sm text-tl-muted">No requests yet this session.</p>
          ) : null}
          <ul>
            {requests.map((request) => {
              const status = STATUS[request.status] ?? STATUS.pending;
              const pending = request.status === 'pending';
              return (
                <li
                  key={request.id}
                  title={pending ? 'Pending — you can still change or withdraw this' : `${status.label}${request.decidedBy ? ` by ${request.decidedBy.name}` : ''}`}
                  className={`flex items-start gap-3.5 border-t border-tl-line-soft px-[clamp(18px,2.4vw,24px)] py-4 ${editing?.id === request.id ? 'bg-tl-select' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-tl-ink">{TYPE_LABEL.get(request.type) ?? 'Other'}</div>
                    <div className="mt-1 text-[13px] text-tl-muted">{leaveRange(request.startDate, request.endDate, request.days)}</div>
                    {request.note ? <div className="mt-1.5 text-[13px] leading-normal text-tl-faint">{request.note}</div> : null}
                    {!pending && request.decidedBy ? (
                      <div className="mt-1 text-xs text-tl-faint">
                        {status.label} by {request.decidedBy.name}
                      </div>
                    ) : null}
                    {pending ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className={rowButton} onClick={() => startEdit(request)} aria-label={`Edit the ${TYPE_LABEL.get(request.type)} request`}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={dangerGhostButton}
                          onClick={() => withdraw(request)}
                          disabled={remove.isPending}
                          aria-label={`Delete the ${TYPE_LABEL.get(request.type)} request`}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

/**
 * The Leave requests screen for the active child.
 *
 * @returns The page.
 */
export default function Leave() {
  return (
    <ChildGate needsClass="leave requests" loadingLabel="Loading leave requests">
      {(child) => <ChildLeave key={child.id} child={child} />}
    </ChildGate>
  );
}
