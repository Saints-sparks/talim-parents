import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { useChildSchool } from '../../../hooks/portal/useChildData';
import { useSupportTicket } from '../../../hooks/portal/useAccount';
import { useParentSettings } from '../../../hooks/useParentSettings';
import { getErrorMessage } from '../../../lib/apiError';
import { useTour } from '../tour/TourProvider';
import { Sheet, SheetRow } from '../ui/Dialog';
import { ErrorCard } from '../ui/primitives';
import { chip, fieldControl, fieldError, fieldLabel, ghostButton, primaryButton, rowButton, statBox } from '../ui/styles';
import { LinkRow } from './rows';
import type { SupportArea } from '../../../types/portal/school';

/**
 * The Help tab: replay the tour, contact the active child's school (B12), and
 * report a problem to Talim support (§35).
 *
 * @returns The panel.
 */
export function HelpPanel() {
  const { openTour } = useTour();
  const [contactOpen, setContactOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  return (
    <div className="mt-[18px]">
      <LinkRow label="Getting started for parents" description="A six step walk through of the whole portal." onOpen={openTour} />
      <LinkRow label="Contact the school office" description="Call, email, visit or message." onOpen={() => setContactOpen(true)} />
      <LinkRow label="Report a problem" description="Send a fault straight to Talim support." onOpen={() => setReportOpen(true)} />
      <ContactSchoolSheet open={contactOpen} onClose={() => setContactOpen(false)} />
      <ReportProblemSheet open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

/**
 * How to reach the active child's school office (B12): call (a `tel:` link),
 * email, visit (a map search) or message in the portal. Lines the school has
 * not filled in are left out.
 *
 * @param props - State.
 * @param props.open - Whether the sheet is open.
 * @param props.onClose - Closes it.
 * @returns The sheet.
 */
export function ContactSchoolSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { child } = useActiveChild();
  const school = useChildSchool(child?.id, open);
  const data = school.data;
  const hours = data?.officeHours ? `Monday to Friday, ${data.officeHours.start} to ${data.officeHours.end}` : null;

  return (
    <Sheet open={open} onClose={onClose} eyebrowText="Contact" title={data?.name ?? child?.school.name ?? 'School office'} subtitle={`Pick how you would like to reach the office.${hours ? ` ${hours}.` : ''}`}>
      {school.isPending ? <div role="status" aria-label="Loading the school's contact details" className="h-32 animate-pulse rounded-2xl bg-tl-track" /> : null}
      {school.isError ? <ErrorCard error={school.error} title="The school's details couldn't be loaded" onRetry={() => void school.refetch()} /> : null}
      {data ? (
        <>
          {data.phone ? (
            <SheetRow label="Call the office" description={data.phone} action={<a href={`tel:${data.phone.replace(/[^+\d]/g, '')}`} className={rowButton}>Call</a>} />
          ) : null}
          {data.email ? (
            <SheetRow label="Email the office" description={data.email} action={<a href={`mailto:${data.email}`} className={rowButton}>Email</a>} />
          ) : null}
          {data.address ? (
            <SheetRow
              label="Visit the school"
              description={data.address}
              action={
                <a href={`https://maps.google.com/?q=${encodeURIComponent(data.address)}`} target="_blank" rel="noreferrer" className={rowButton}>
                  Map
                </a>
              }
            />
          ) : null}
          <SheetRow
            label="Message in the portal"
            description="Usually answered the same school day"
            action={
              <button
                type="button"
                className={rowButton}
                onClick={() => {
                  onClose();
                  navigate('/messages?to=office');
                }}
              >
                Open
              </button>
            }
          />
          <p className={`${statBox} text-[13px] leading-relaxed text-tl-muted`}>For anything about a single child, messaging the class teacher is usually faster than the office.</p>
        </>
      ) : null}
    </Sheet>
  );
}

/** The areas a parent can report a problem in (§35 with B12's payments and results). */
const AREAS: { value: SupportArea; label: string }[] = [
  { value: 'payments', label: 'Payments' },
  { value: 'results', label: 'Results' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'messages', label: 'Messages' },
  { value: 'signing_in', label: 'Signing in' },
  { value: 'other', label: 'Something else' },
];

/**
 * Sends a problem report to Talim support (§35), not the school: the area,
 * what went wrong (10 to 2000 characters) and the page it came from.
 *
 * @param props - State.
 * @param props.open - Whether the sheet is open.
 * @param props.onClose - Closes it.
 * @returns The sheet.
 */
export function ReportProblemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useParentSettings();
  const send = useSupportTicket();
  const [area, setArea] = useState<SupportArea>('payments');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const email = settings.data?.profile.email;

  const close = (): void => {
    setText('');
    setError(null);
    send.reset();
    onClose();
  };

  const submit = (): void => {
    if (text.trim().length < 10) {
      setError('Tell us a little more: at least 10 characters.');
      textRef.current?.focus();
      return;
    }
    setError(null);
    send.mutate({
      area,
      description: text.trim().slice(0, 2000),
      context: { path: window.location.pathname.slice(0, 300), appVersion: '1.0.0', userAgent: navigator.userAgent.slice(0, 500) },
    });
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      eyebrowText="Report a problem"
      title={send.isSuccess ? 'Report sent' : 'Tell Talim what is not working'}
      subtitle={send.isSuccess ? undefined : 'This goes to the Talim support team, not to your school. Include what you were doing when it happened.'}
      initialFocus={textRef}
      footer={
        send.isSuccess ? (
          <button type="button" className={`${primaryButton} flex-1`} onClick={close}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className={ghostButton} onClick={close}>
              Cancel
            </button>
            <button type="button" className={`${primaryButton} flex-1`} disabled={send.isPending || !text.trim()} onClick={submit}>
              {send.isPending ? 'Sending…' : 'Send to Talim support'}
            </button>
          </>
        )
      }
    >
      {send.isSuccess ? (
        <div role="status" className="flex flex-col gap-3">
          <CheckCircle2 className="h-10 w-10 text-tl-success" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-tl-muted">Talim support has your report and will reply{email ? ` to ${email}` : ''} within one working day.</p>
          <div className={statBox}>
            <div className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">Reference</div>
            <div className="mt-1 text-base font-extrabold text-tl-ink">{send.data.reference}</div>
          </div>
        </div>
      ) : (
        <>
          <fieldset>
            <legend className="mb-2.5 text-[13px] font-extrabold text-tl-muted">Where did it happen?</legend>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((option) => (
                <button key={option.value} type="button" aria-pressed={area === option.value} className={chip(area === option.value)} onClick={() => setArea(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor={textId} className={fieldLabel}>
              What went wrong
            </label>
            <textarea
              ref={textRef}
              id={textId}
              className={`${fieldControl} min-h-[120px] resize-y py-3 leading-relaxed`}
              maxLength={2000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. I paid the exam fee on Paystack but the receipt has not appeared."
              aria-invalid={Boolean(error) || undefined}
            />
            {error ? <p className={fieldError}>{error}</p> : null}
          </div>
          <p className="text-[13px] leading-relaxed text-tl-muted">
            We will reply{email ? ` to ${email}` : ' by email'}. Your child&apos;s records are not shared with support unless you ask us to look at them.
          </p>
          {send.isError ? (
            <p role="alert" className={fieldError}>
              {getErrorMessage(send.error, 'Your report could not be sent.')}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
