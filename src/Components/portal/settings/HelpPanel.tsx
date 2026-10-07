import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { useChildSchool } from '../../../hooks/portal/useChildData';
import { parseTicketParam } from '../../../lib/tickets';
import { useTour } from '../tour/TourProvider';
import { Sheet, SheetRow } from '../ui/Dialog';
import { ErrorCard } from '../ui/primitives';
import { rowButton, statBox } from '../ui/styles';
import { LinkRow } from './rows';
import { SupportSection } from './support/SupportSection';

/**
 * The Help tab: replay the tour, contact the active child's school (B12),
 * and My tickets (v1.5 tickets to the child's school or Talim support, which
 * replaced "Report a problem"). The open ticket follows `?ticket=`, so a
 * support notification opens its thread and closing it drops the parameter.
 *
 * @returns The panel.
 */
export function HelpPanel() {
  const { openTour } = useTour();
  const [params, setParams] = useSearchParams();
  const [contactOpen, setContactOpen] = useState(false);
  const ticketId = parseTicketParam(params.get('ticket'));

  /**
   * Opens a ticket's thread, or closes it, in the URL (no history entry).
   *
   * @param id - The ticket, or null to close the thread.
   */
  const showTicket = (id: string | null): void => {
    const next = new URLSearchParams(params);
    next.set('tab', 'help');
    if (id) next.set('ticket', id);
    else next.delete('ticket');
    setParams(next, { replace: true });
  };

  return (
    <div className="mt-[18px]">
      <LinkRow label="Getting started for parents" description="A six step walk through of the whole portal." onOpen={openTour} />
      <LinkRow label="Contact the school office" description="Call, email, visit or message." onOpen={() => setContactOpen(true)} />
      <ContactSchoolSheet open={contactOpen} onClose={() => setContactOpen(false)} />
      <SupportSection openTicketId={ticketId} onOpenTicket={showTicket} />
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
