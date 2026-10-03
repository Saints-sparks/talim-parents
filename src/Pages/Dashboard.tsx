import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth.services';
import { useChildDashboard } from '../hooks/portal/useChildData';
import { ChildGate } from '../Components/portal/ChildGate';
import { TermGlance } from '../Components/portal/dashboard/TermGlance';
import { Dot, EmptyCard, ErrorCard, LoadingCard, PageHeader, Pill } from '../Components/portal/ui/primitives';
import { card, cardTitle, eyebrow, pill, pillTone, textLink, tile, type Tone } from '../Components/portal/ui/styles';
import { subjectTone } from '../Components/portal/ui/subjectTone';
import { normalizeNotification } from '../lib/notificationModel';
import { dayMonth, firstNameOf, naira, ordinal, percent, relativeDay } from '../lib/format';
import { pathForTarget } from '../lib/portalTargets';
import type { ChildSummary } from '../types/portal/children';
import type { AttentionItem, ParentDashboard } from '../types/portal/learner';

/** How each kind of attention item looks: dot, tag and tone. */
const ATTENTION_LOOK: Record<AttentionItem['kind'], { dot: string; tag: string; tone: Tone }> = {
  fees: { dot: 'bg-tl-danger', tag: 'Pay now', tone: 'danger' },
  attendance: { dot: 'bg-tl-warning', tag: 'Review', tone: 'warning' },
  leave: { dot: 'bg-tl-link', tag: 'Pending', tone: 'info' },
  report: { dot: 'bg-tl-success', tag: 'View', tone: 'success' },
};

/** The dot colour of a feed item, by category. */
const FEED_DOT: Record<string, string> = {
  payments: 'bg-tl-danger',
  grading: 'bg-tl-success',
  attendance: 'bg-tl-warning',
  leave: 'bg-tl-accent',
};

/** One metric tile's content. */
interface Metric {
  label: string;
  value: string;
  pill: string;
  tone: Tone;
  note: string;
  to: string;
  tip: string;
}

/**
 * The four tiles: term average, class position, attendance and fees.
 *
 * @param data - The dashboard aggregate.
 * @param firstName - The child's first name.
 * @returns The tiles' content.
 */
function dashboardMetrics(data: ParentDashboard, firstName: string): Metric[] {
  const { glance, fees } = data;
  const subjects = data.subjectTotals.filter((subject) => subject.percent !== null).length;
  const rate = glance.attendance.rate;
  const movement = glance.movement;
  return [
    {
      label: 'Term average',
      value: percent(glance.average),
      pill: glance.grade ?? '—',
      tone: 'success',
      note: `Across ${subjects} subject${subjects === 1 ? '' : 's'}`,
      to: '/results',
      tip: `Average of ${firstName}'s subject totals`,
    },
    {
      label: 'Class position',
      value: glance.position ? ordinal(glance.position.rank) : '—',
      pill: glance.position ? `of ${glance.position.of}` : 'Not ranked yet',
      tone: 'muted',
      note:
        movement === null
          ? 'No earlier term to compare'
          : movement === 0
            ? 'Same place as last term'
            : `${movement > 0 ? 'Up' : 'Down'} ${Math.abs(movement)} place${Math.abs(movement) === 1 ? '' : 's'} from last term`,
      to: '/results',
      tip: `Where ${firstName} stands in the class`,
    },
    {
      label: 'Attendance',
      value: percent(rate),
      pill: rate === null ? 'No register yet' : rate >= 92 ? 'On track' : 'Watch',
      tone: rate === null ? 'muted' : rate >= 92 ? 'success' : 'warning',
      note: `${glance.attendance.present} of ${glance.attendance.schoolDays} days`,
      to: '/attendance',
      tip: `Days the school marked ${firstName} present`,
    },
    {
      label: 'Fees',
      value: fees.outstanding > 0 ? naira(fees.outstanding) : 'Cleared',
      pill: fees.outstanding > 0 ? 'Due' : 'Paid',
      tone: fees.outstanding > 0 ? 'danger' : 'success',
      note: fees.outstanding > 0 ? (fees.dueDate ? `Due ${dayMonth(fees.dueDate)}` : 'Outstanding') : 'This term is settled',
      to: '/payments',
      tip: 'This term’s fee balance',
    },
  ];
}

/**
 * The dashboard of one child (B1): one request for the whole screen.
 *
 * @param props - The resolved child.
 * @param props.child - The active child.
 * @returns The screen.
 */
function ChildDashboard({ child }: { child: ChildSummary }) {
  const navigate = useNavigate();
  const { user, parentId } = useAuth();
  const query = useChildDashboard(child.id);
  const firstName = firstNameOf(child.name);
  const data = query.data;

  const metrics = useMemo(() => (data ? dashboardMetrics(data, firstName) : []), [data, firstName]);
  const feed = useMemo(() => (data?.feed ?? []).map((raw) => normalizeNotification(raw, 'notification', parentId)), [data, parentId]);

  const greeting = `Good ${data?.greeting ?? 'day'}, ${user?.firstName ?? 'there'}`;
  const where = [child.class?.name, child.school.name].filter(Boolean).join(' at ');
  const term = data?.term ? ` · ${data.term.name.toLowerCase()}` : '';

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title={greeting} subtitle={`Here is how ${firstName} is doing${where ? ` in ${where}` : ''}${term}`} />

      {query.isPending ? <LoadingCard rows={4} label={`Loading ${firstName}'s dashboard`} /> : null}
      {query.isError ? <ErrorCard error={query.error} title={`${firstName}'s dashboard couldn't be loaded`} onRetry={() => void query.refetch()} /> : null}

      {data ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-3.5">
            {metrics.map((metric) => (
              <Link key={metric.label} to={metric.to} title={metric.tip} className={tile}>
                <div className="text-[13px] font-bold text-tl-muted">{metric.label}</div>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <div className="text-[clamp(24px,3vw,30px)] font-extrabold tracking-[-0.6px] text-tl-ink">{metric.value}</div>
                  <span className={`${pill} ${pillTone[metric.tone]} !px-2.5 !py-1 font-extrabold`}>{metric.pill}</span>
                </div>
                <div className="mt-1 text-[13px] text-tl-faint">{metric.note}</div>
              </Link>
            ))}
          </div>

          <section className={card} aria-labelledby="attention-title" title="Things that need a decision or a payment from you">
            <h2 id="attention-title" className={cardTitle}>
              Needs your attention
            </h2>
            <p className="mt-1 text-sm text-tl-muted">
              {data.attention.length === 0
                ? 'Nothing is waiting on you today.'
                : `${data.attention.length} item${data.attention.length === 1 ? '' : 's'} waiting on you`}
            </p>
            {data.attention.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2.5">
                {data.attention.map((item) => {
                  const look = ATTENTION_LOOK[item.kind];
                  return (
                    <li key={`${item.kind}-${item.title}`}>
                      <button
                        type="button"
                        onClick={() => navigate(pathForTarget(item.target))}
                        className="flex min-h-[44px] w-full items-center gap-3.5 rounded-2xl border border-tl-line-soft px-4 py-[15px] text-left transition-colors hover:border-tl-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-link"
                      >
                        <Dot className={look.dot} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold text-tl-ink">{item.title}</span>
                          <span className="mt-[3px] block text-[13px] text-tl-muted">{item.meta}</span>
                        </span>
                        <Pill tone={look.tone}>{look.tag}</Pill>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
            <section className={card} aria-labelledby="today-title" title={`Where ${firstName} is today`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="today-title" className={eyebrow}>
                  Today&apos;s lessons
                </h2>
                <Link to="/timetable" className={textLink}>
                  Full week →
                </Link>
              </div>
              {!data.schoolDay.isSchoolDay ? (
                <p className="mt-3.5 text-sm text-tl-muted">
                  {data.schoolDay.reason === 'holiday'
                    ? `No school today${data.schoolDay.holidayTitle ? `: ${data.schoolDay.holidayTitle}` : ''}.`
                    : data.schoolDay.reason === 'no_term'
                      ? 'The school is between terms.'
                      : 'No school today. Enjoy the weekend.'}
                </p>
              ) : data.lessons.length === 0 ? (
                <p className="mt-3.5 text-sm text-tl-muted">No lessons are timetabled for today.</p>
              ) : (
                <ul className="mt-3.5 flex flex-col gap-2">
                  {data.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      title={lesson.teacher?.name ?? undefined}
                      className={`flex items-center gap-3 rounded-[14px] border px-3.5 py-3 ${lesson.state === 'now' ? 'border-tl-brand bg-tl-select' : 'border-tl-line-soft'}`}
                    >
                      <span className="w-[92px] shrink-0 text-[13px] font-semibold text-tl-muted">
                        {lesson.startTime} – {lesson.endTime}
                      </span>
                      <span aria-hidden="true" className={`${subjectTone(lesson.colourKey, lesson.course.id)} h-[9px] w-[9px] shrink-0 rounded-full bg-tone-solid`} />
                      <span className="min-w-0 flex-1 text-[15px] font-bold text-tl-ink">{lesson.course.title}</span>
                      {lesson.state === 'now' ? <Pill tone="brand">Now</Pill> : lesson.cancelled ? <Pill tone="muted">Cancelled</Pill> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={card} aria-labelledby="updates-title" title="What the school has shared recently">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="updates-title" className={eyebrow}>
                  Recent updates
                </h2>
                <Link to="/notifications" className={textLink}>
                  All notifications →
                </Link>
              </div>
              {feed.length === 0 ? (
                <p className="mt-4 text-sm text-tl-muted">Nothing new from the school yet.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3.5">
                  {feed.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/notifications?id=${encodeURIComponent(item.rawId)}`}
                        className="flex min-h-[44px] gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-link"
                      >
                        <span aria-hidden="true" className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${FEED_DOT[item.category] ?? 'bg-tl-link'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold text-tl-ink">{item.title}</span>
                          <span className="mt-[3px] block truncate text-[13px] text-tl-muted">{item.message}</span>
                        </span>
                        <span className="whitespace-nowrap text-[13px] text-tl-faint">{relativeDay(item.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <TermGlance firstName={firstName} subjects={data.subjectTotals} passMark={data.passMark} />
        </>
      ) : null}
    </div>
  );
}

/**
 * The parent's dashboard for the active child: four tiles, what needs the
 * parent's attention, today's lessons, recent updates and the term at a
 * glance. A child without a class still gets the fees and attention parts.
 *
 * @returns The page.
 */
export default function Dashboard() {
  return (
    <ChildGate loadingLabel="Loading the dashboard">
      {(child) =>
        child.class ? (
          <ChildDashboard key={child.id} child={child} />
        ) : (
          <NoClassDashboard child={child} />
        )
      }
    </ChildGate>
  );
}

/**
 * The dashboard of a child the school has not placed in a class yet: fees
 * still apply, so they are shown; lessons and results are explained.
 *
 * @param props - The child.
 * @param props.child - The active child.
 * @returns The screen.
 */
function NoClassDashboard({ child }: { child: ChildSummary }) {
  const firstName = firstNameOf(child.name);
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title={`${firstName} at ${child.school.name}`} subtitle="Waiting for the school to assign a class" />
      <EmptyCard
        title={`${firstName} is not in a class yet`}
        message={`Lessons, attendance and results appear once ${child.school.name} places ${firstName} in a class. You can already message the school office and pay any fees.`}
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link to="/messages?to=office" className={textLink}>
              Message the school office →
            </Link>
            {child.outstanding > 0 ? (
              <Link to="/payments" className={textLink}>
                Pay {naira(child.outstanding)} →
              </Link>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
