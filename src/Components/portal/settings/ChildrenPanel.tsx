import { useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { linkChild } from '../../../services/portal/children';
import { ApiError, getErrorMessage } from '../../../lib/apiError';
import { firstNameOf, naira, ordinal, percent } from '../../../lib/format';
import { queryKeys } from '../../../lib/queryKeys';
import { Sheet } from '../ui/Dialog';
import { Avatar, ErrorCard, LoadingCard, Pill, toneOf } from '../ui/primitives';
import { chip, fieldControl, fieldError, fieldHint, fieldLabel, ghostButton, primaryButton, rowButton, statBox } from '../ui/styles';
import type { ChildSummary, LinkChildResult } from '../../../types/portal/children';
import type { Relationship } from '../../../types/portal/common';

/** The relationship choices of a link code (A11). */
const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * The Children tab: every linked child grouped by school (B13: one call), each
 * with average, grade, position and attendance, what is owed, and ways to
 * view them; and "Add a child" with a link code from any school (A11).
 *
 * @returns The panel.
 */
export function ChildrenPanel() {
  const navigate = useNavigate();
  const active = useActiveChild();
  const [linkOpen, setLinkOpen] = useState(false);

  if (active.status === 'loading') return <LoadingCard rows={2} label="Loading your children" />;
  if (active.status === 'error') return <ErrorCard error={active.error} title="Your children couldn't be loaded" onRetry={active.retry} />;

  const go = (child: ChildSummary, path: string): void => {
    active.select(child.id);
    navigate(path);
  };

  return (
    <div className="mt-[22px] flex flex-col gap-[22px]">
      {active.groups.map((group) => (
        <section key={group.school.id} aria-labelledby={`school-${group.school.id}`}>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className={`${toneOf(group.school.id)} flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-tone-bg text-sm font-extrabold text-tone-fg`}>
              {group.school.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <h3 id={`school-${group.school.id}`} className="text-base font-extrabold tracking-[-0.2px] text-tl-ink">
                {group.school.name}
              </h3>
              <p className="mt-0.5 text-[13px] text-tl-faint">
                {[group.school.city, `${group.children.length} ${group.children.length === 1 ? 'child' : 'children'}`].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <ul className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3.5">
            {group.children.map((child) => {
              const viewing = child.id === active.childId;
              const first = firstNameOf(child.name);
              return (
                <li key={child.id} className={`rounded-[22px] border bg-tl-surface p-[clamp(18px,2.4vw,24px)] ${viewing ? 'border-tl-brand' : 'border-tl-line'}`}>
                  <div className="flex items-center gap-3.5">
                    <Avatar id={child.id} name={child.name} src={child.avatarUrl} size={54} />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-extrabold tracking-[-0.3px] text-tl-ink">{child.name}</h4>
                      <p className="mt-0.5 text-[13px] text-tl-muted">{[child.class?.name ?? 'No class yet', child.admissionNumber].filter(Boolean).join(' · ')}</p>
                    </div>
                    <Pill tone={viewing ? 'info' : 'muted'}>{viewing ? 'Viewing' : 'Linked'}</Pill>
                  </div>
                  <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2.5">
                    {[
                      ['Average', percent(child.average)],
                      ['Grade', child.grade ?? '—'],
                      ['Position', child.position ? ordinal(child.position.rank) : '—'],
                      ['Attendance', percent(child.attendanceRate)],
                    ].map(([label, value]) => (
                      <div key={label} className={`${statBox} !rounded-[14px] !p-3`}>
                        <dt className="text-xs font-bold text-tl-muted">{label}</dt>
                        <dd className="mt-1 text-[19px] font-extrabold tracking-[-0.4px] text-tl-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3.5 text-sm leading-normal text-tl-muted">
                    {child.outstanding > 0 ? `${naira(child.outstanding)} of this term's fees is still outstanding.` : "This term's fees are fully paid. Nothing outstanding."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {viewing ? (
                      <span className="inline-flex min-h-[44px] items-center rounded-[13px] bg-tl-track px-4 text-sm font-bold text-tl-muted">Currently viewing</span>
                    ) : (
                      <button type="button" className={primaryButton} onClick={() => go(child, '/dashboard')}>
                        View {first}&apos;s portal
                      </button>
                    )}
                    <button type="button" className={rowButton} onClick={() => go(child, '/results')} aria-label={`${first}'s results`}>
                      Results
                    </button>
                    <button type="button" className={rowButton} onClick={() => go(child, '/payments')} aria-label={`${first}'s fees`}>
                      Fees
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-[18px] rounded-[20px] border-2 border-dashed border-tl-control bg-tl-subtle p-6">
        <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-tl-select text-[22px] font-extrabold text-tl-brand">
          +
        </span>
        <div className="min-w-[220px] flex-1">
          <h3 className="text-base font-extrabold tracking-[-0.2px] text-tl-ink">Add a child</h3>
          <p className="mt-1 text-sm leading-normal text-tl-muted">Ask any of your schools for the student link code. A child at a new school is added the same way.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => setLinkOpen(true)}>
          Enter link code
        </button>
      </div>
      <p className="text-[13px] leading-relaxed text-tl-faint">Children are linked by the school. To remove a child, ask the school office: it cannot be undone from here.</p>

      <LinkChildSheet
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onLinked={(child) => {
          active.select(child.id);
        }}
      />
    </div>
  );
}

/**
 * Links a child with the code from their school office (A11). A wrong or
 * expired code and an already used one get their own messages.
 *
 * @param props - State and callbacks.
 * @param props.open - Whether the sheet is open.
 * @param props.onClose - Closes it.
 * @param props.onLinked - Called with the new child.
 * @returns The sheet.
 */
export function LinkChildSheet({ open, onClose, onLinked }: { open: boolean; onClose: () => void; onLinked: (child: ChildSummary) => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [error, setError] = useState<string | null>(null);
  const codeId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const link = useMutation<LinkChildResult, unknown, { code: string; relationship: Relationship }>({
    mutationFn: linkChild,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      onLinked(result.child);
    },
  });

  const close = (): void => {
    setCode('');
    setRelationship(null);
    setError(null);
    link.reset();
    onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(clean)) {
      setError('Enter the 8-character code, like ABCD-1234.');
      codeRef.current?.focus();
      return;
    }
    if (!relationship) {
      setError('Choose how you are related to the child.');
      return;
    }
    setError(null);
    link.mutate(
      { code: clean.includes('-') ? clean : `${clean.slice(0, 4)}-${clean.slice(4)}`, relationship },
      {
        onError: (cause) => {
          if (cause instanceof ApiError && cause.status === 404) setError('That code is wrong or has expired. Ask the school office for a new one.');
          else if (cause instanceof ApiError && cause.status === 409) setError('That code has already been used. Each code links one child once.');
          else setError(getErrorMessage(cause, 'The child could not be linked. Please try again.'));
        },
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      eyebrowText="My children"
      title={link.isSuccess ? `${link.data.child.name} added` : 'Add a child'}
      subtitle={link.isSuccess ? undefined : 'Enter the student link code from the school office. It works for a child at any school.'}
      initialFocus={codeRef}
    >
      {link.isSuccess ? (
        <div role="status" className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-tl-muted">
            {link.data.child.name} at {link.data.child.school.name} is now linked to your account. You are viewing them now; switch children from the name at the top.
          </p>
          <button type="button" className={primaryButton} onClick={close}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor={codeId} className={fieldLabel}>
              Link code
            </label>
            <input
              ref={codeRef}
              id={codeId}
              className={`${fieldControl} uppercase tracking-[0.15em]`}
              value={code}
              maxLength={9}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABCD-1234"
              onChange={(event) => setCode(event.target.value)}
              aria-describedby={`${codeId}-hint`}
            />
            <p id={`${codeId}-hint`} className={fieldHint}>
              Codes last 14 days and link one child once.
            </p>
          </div>
          <fieldset>
            <legend className={fieldLabel}>You are their</legend>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((option) => (
                <button key={option.value} type="button" aria-pressed={relationship === option.value} className={chip(relationship === option.value)} onClick={() => setRelationship(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className={fieldError}>
              {error}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <button type="button" className={ghostButton} onClick={close}>
              Cancel
            </button>
            <button type="submit" className={`${primaryButton} flex-1`} disabled={link.isPending}>
              {link.isPending ? 'Linking…' : 'Link child'}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
