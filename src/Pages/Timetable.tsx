import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useChildTimetable } from '../hooks/portal/useChildData';
import { ChildGate } from '../Components/portal/ChildGate';
import { ErrorCard, LoadingCard, PageHeader } from '../Components/portal/ui/primitives';
import { cardFrame, focusRing, ghostButton } from '../Components/portal/ui/styles';
import { subjectTone } from '../Components/portal/ui/subjectTone';
import { lessonIndex } from '../Components/portal/timetable/lessonIndex';
import { dayMonth, firstNameOf } from '../lib/format';
import type { ChildSummary } from '../types/portal/children';
import type { ChildTimetable, StudentLesson } from '../types/portal/learner';

/**
 * The school day's span, for the subtitle: "08:00 to 16:00".
 *
 * @param timetable - The week.
 * @returns The span, or null when there are no periods.
 */
function daySpan(timetable: ChildTimetable): string | null {
  if (!timetable.periods.length) return null;
  return `${timetable.periods[0].startTime} to ${timetable.periods[timetable.periods.length - 1].endTime}`;
}

/**
 * One week of the child's timetable (B2): the subject legend, then a grid of
 * periods by weekday, each lesson tinted in its subject's colour with the
 * teacher's name; breaks and holidays are marked; previous and next week.
 *
 * @param props - The child.
 * @param props.child - The active child.
 * @returns The screen.
 */
function ChildTimetableScreen({ child }: { child: ChildSummary }) {
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const query = useChildTimetable(child.id, weekStart);
  const data = query.data;
  const index = useMemo(() => (data ? lessonIndex(data) : new Map<string, StudentLesson>()), [data]);
  const colourOf = useMemo(() => new Map((data?.subjects ?? []).map((subject) => [subject.courseId, subject.colourKey])), [data]);
  const span = data ? daySpan(data) : null;
  const firstName = firstNameOf(child.name);

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Timetable"
        subtitle={[child.name, child.class?.name, span ? `${span}, Monday to Friday` : null].filter(Boolean).join(' · ')}
      />

      {query.isPending ? <LoadingCard rows={5} label={`Loading ${firstName}'s timetable`} /> : null}
      {query.isError ? <ErrorCard error={query.error} title="The timetable couldn't be loaded" onRetry={() => void query.refetch()} /> : null}

      {data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="flex flex-wrap gap-2" aria-label="Subjects">
              {data.subjects.map((subject) => (
                <li
                  key={subject.courseId}
                  title={subject.title}
                  className={`${subjectTone(subject.colourKey, subject.courseId)} flex items-center gap-[7px] rounded-full border border-tl-line bg-tl-surface px-3 py-[7px] text-[13px] font-bold text-tl-body`}
                >
                  <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-tone-solid" />
                  {subject.short}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="Previous week" onClick={() => setWeekStart(data.week.prevStart)} className={`flex h-11 w-11 items-center justify-center rounded-xl border border-tl-line text-tl-brand hover:bg-tl-bg ${focusRing}`}>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="min-w-[150px] text-center text-sm font-bold text-tl-ink" aria-live="polite">
                {data.week.number ? `Week ${data.week.number} · ` : ''}
                {dayMonth(data.week.start)} – {dayMonth(data.week.end)}
              </span>
              <button type="button" aria-label="Next week" onClick={() => setWeekStart(data.week.nextStart)} className={`flex h-11 w-11 items-center justify-center rounded-xl border border-tl-line text-tl-brand hover:bg-tl-bg ${focusRing}`}>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
              {!data.week.isCurrent ? (
                <button type="button" className={ghostButton} onClick={() => setWeekStart(undefined)}>
                  This week
                </button>
              ) : null}
            </div>
          </div>

          {!data.week.inTerm ? (
            <p className="rounded-2xl border border-tl-line-soft bg-tl-surface p-4 text-sm text-tl-muted">This week is outside the term, so no lessons are timetabled.</p>
          ) : null}

          <section className={`${cardFrame} relative overflow-x-auto p-[clamp(14px,2vw,20px)]`} aria-label={`${firstName}'s week`}>
            <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-2">
              <caption className="sr-only">
                Lessons for the week of {dayMonth(data.week.start)}
              </caption>
              <colgroup>
                <col className="w-[104px]" />
              </colgroup>
              <thead>
                <tr>
                  <td />
                  {data.days.map((day) => (
                    <th key={day.date} scope="col" className={`pb-2.5 text-center text-xs font-extrabold uppercase tracking-[0.06em] ${day.isToday ? 'text-tl-brand' : 'text-tl-faint'}`}>
                      {day.day}
                      <span className="block text-[11px] font-bold normal-case tracking-normal">
                        {dayMonth(day.date)}
                        {day.isToday ? ' · today' : ''}
                      </span>
                      {day.holiday ? <span className="block text-[11px] font-bold normal-case tracking-normal text-tl-warning">{day.holiday.title}</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.periods.map((period) => (
                  <tr key={period.key}>
                    <th scope="row" className="text-left align-middle text-xs font-bold text-tl-muted">
                      {period.startTime} – {period.endTime}
                    </th>
                    {data.days.map((day) => {
                      if (period.isBreak) {
                        return (
                          <td key={day.date} className="h-[74px] rounded-[13px] bg-[repeating-linear-gradient(45deg,rgb(var(--tl-bg)),rgb(var(--tl-bg))_7px,rgb(var(--tl-line-soft))_7px,rgb(var(--tl-line-soft))_14px)] text-center align-middle text-[13px] font-extrabold uppercase tracking-[0.05em] text-tl-faint">
                            {period.label}
                          </td>
                        );
                      }
                      if (day.holiday) {
                        return <td key={day.date} className="h-[74px] rounded-[13px] bg-tl-subtle text-center text-xs text-tl-faint">No school</td>;
                      }
                      const lesson = index.get(`${day.date}|${period.key}`);
                      if (!lesson) return <td key={day.date} className="h-[74px] rounded-[13px] bg-tl-subtle/60"><span className="sr-only">Free</span></td>;
                      const tone = subjectTone(lesson.colourKey ?? colourOf.get(lesson.course.id), lesson.course.id);
                      return (
                        <td
                          key={day.date}
                          title={`${lesson.course.title}${lesson.teacher ? ` · ${lesson.teacher.name}` : ''} · ${day.day} ${period.startTime}`}
                          className={`${tone} h-[74px] rounded-[13px] border-l-4 border-tone-solid bg-tone-bg p-3 align-middle ${lesson.cancelled ? 'opacity-60' : ''}`}
                        >
                          <span className="block text-[15px] font-extrabold text-tone-fg">
                            {lesson.courseShort ?? lesson.course.title}
                            <span className="sr-only">, {lesson.course.title}</span>
                          </span>
                          {lesson.teacher ? <span className="mt-1 block truncate text-xs text-tl-body">{lesson.teacher.name}</span> : null}
                          {lesson.cancelled ? <span className="mt-1 block text-xs font-bold text-tl-danger">Cancelled</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}

/**
 * The Timetable screen for the active child.
 *
 * @returns The page.
 */
export default function Timetable() {
  return (
    <ChildGate needsClass="lessons" loadingLabel="Loading the timetable">
      {(child) => <ChildTimetableScreen key={child.id} child={child} />}
    </ChildGate>
  );
}
