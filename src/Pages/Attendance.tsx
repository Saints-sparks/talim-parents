import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useChildAttendance } from '../hooks/portal/useChildData';
import { ChildGate } from '../Components/portal/ChildGate';
import { MonthGrid } from '../Components/portal/attendance/MonthGrid';
import { attendanceShares, startMonth } from '../Components/portal/attendance/attendanceMath';
import { ErrorCard, LoadingCard, PageHeader, Pill } from '../Components/portal/ui/primitives';
import { card, cardTitle, focusRing, statBox } from '../Components/portal/ui/styles';
import { firstNameOf, monthOf, monthTitle, percent, shiftMonth, todayIso } from '../lib/format';
import type { ChildSummary } from '../types/portal/children';

/** The legend under the month title. */
const LEGEND = [
  { label: 'Present', dot: 'bg-tl-success' },
  { label: 'Late', dot: 'bg-tl-warning' },
  { label: 'Absent', dot: 'bg-tl-danger' },
  { label: 'On approved leave', dot: 'bg-tl-accent' },
  { label: 'Not yet marked', dot: 'bg-tl-control' },
];

/**
 * Attendance for one child (B6): the term's rate and numbers, and a month of
 * register marks with month navigation inside the term.
 *
 * @param props - The child.
 * @param props.child - The active child.
 * @returns The screen.
 */
function ChildAttendanceScreen({ child }: { child: ChildSummary }) {
  const today = todayIso();
  const [month, setMonth] = useState(() => monthOf(today));
  const query = useChildAttendance(child.id, month);
  const data = query.data;
  const firstName = firstNameOf(child.name);
  const term = data?.term;

  // Once the term is known, keep the month inside it.
  const bounded = useMemo(() => startMonth(`${month}-01`, term), [month, term]);
  useEffect(() => {
    if (term && bounded !== month) setMonth(bounded);
  }, [term, bounded, month]);

  const first = term?.startDate ? monthOf(term.startDate) : null;
  const last = term?.endDate ? monthOf(term.endDate) : null;
  const shares = data ? attendanceShares(data) : null;
  const onTrack = data?.band === 'on_track';

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Attendance"
        subtitle={[child.name, child.class?.name, term ? `${term.name.toLowerCase()} ${term.session ?? ''}`.trim() : null].filter(Boolean).join(' · ')}
      />

      {query.isPending ? <LoadingCard rows={3} label={`Loading ${firstName}'s attendance`} /> : null}
      {query.isError ? <ErrorCard error={query.error} title="Attendance couldn't be loaded" onRetry={() => void query.refetch()} /> : null}

      {data && shares ? (
        <>
          <section className={card} aria-labelledby="att-rate">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="att-rate" className="sr-only">
                  Attendance rate this term
                </h2>
                <div className="text-[clamp(34px,5vw,44px)] font-extrabold leading-none tracking-[-1.4px] text-tl-ink">{percent(data.rate)}</div>
                <p className="mt-1.5 text-[15px] text-tl-muted">
                  {data.present + data.late} of {data.schoolDays} school days this term
                </p>
              </div>
              {data.rate !== null ? (
                <Pill tone={onTrack ? 'success' : 'warning'} className="!px-4 !py-2.5 !text-sm">
                  {onTrack ? 'On track' : 'Needs watching'}
                </Pill>
              ) : null}
            </div>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-tl-track" aria-hidden="true">
              <div className="bg-tl-link" style={{ width: `${shares.present}%` }} />
              <div className="bg-tl-warning" style={{ width: `${shares.late}%` }} />
              <div className="bg-tl-accent" style={{ width: `${shares.leave}%` }} />
              <div className="bg-tl-danger" style={{ width: `${shares.absent}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
              {[
                { value: data.present, label: 'Days present', note: `${shares.present}% of term` },
                { value: data.absent, label: 'Days missed', note: `${shares.absent}% of term` },
                { value: data.late, label: 'Late', note: 'Arrived after assembly' },
                { value: data.onLeave, label: 'On approved leave', note: data.onLeave ? 'Does not count as absence' : 'None this term' },
              ].map((stat) => (
                <div key={stat.label} className={statBox}>
                  <div className="text-2xl font-extrabold tracking-[-0.5px] text-tl-ink">{stat.value}</div>
                  <div className="mt-[3px] text-[13px] font-bold text-tl-muted">{stat.label}</div>
                  <div className="mt-0.5 text-xs text-tl-faint">{stat.note}</div>
                </div>
              ))}
            </div>
          </section>

          <section className={card} aria-labelledby="att-month">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMonth((m) => shiftMonth(m, -1))}
                  disabled={first !== null && month <= first}
                  aria-label="Previous month"
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border border-tl-line text-tl-brand hover:bg-tl-bg disabled:opacity-40 ${focusRing}`}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <h2 id="att-month" className={`${cardTitle} min-w-[170px] text-center`} aria-live="polite">
                  {monthTitle(month)}
                </h2>
                <button
                  type="button"
                  onClick={() => setMonth((m) => shiftMonth(m, 1))}
                  disabled={last !== null && month >= last}
                  aria-label="Next month"
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border border-tl-line text-tl-brand hover:bg-tl-bg disabled:opacity-40 ${focusRing}`}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <ul className="flex flex-wrap gap-3.5" aria-label="Legend">
                {LEGEND.map((entry) => (
                  <li key={entry.label} className="flex items-center gap-[7px] text-[13px] font-bold text-tl-muted">
                    <span aria-hidden="true" className={`h-[9px] w-[9px] rounded-full ${entry.dot}`} />
                    {entry.label}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-[13px] leading-[1.55] text-tl-muted">
              A day covered by an approved leave request is marked <strong className="text-tl-ink">on leave</strong>, not absent, and does
              not count against {firstName}&apos;s attendance rate.
            </p>
            {query.isFetching && !query.isPending ? <p className="sr-only" role="status">Loading {monthTitle(month)}</p> : null}
            {data.days && data.days.length ? (
              <MonthGrid days={data.days} title={monthTitle(month)} today={today} />
            ) : (
              <p className="mt-4 rounded-2xl border border-tl-line-soft bg-tl-subtle p-4 text-sm text-tl-muted">No school days in {monthTitle(month)}.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

/**
 * The Attendance screen for the active child.
 *
 * @returns The page.
 */
export default function Attendance() {
  return (
    <ChildGate needsClass="register marks" loadingLabel="Loading attendance">
      {(child) => <ChildAttendanceScreen key={child.id} child={child} />}
    </ChildGate>
  );
}
