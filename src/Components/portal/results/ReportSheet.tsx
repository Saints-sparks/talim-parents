import { longDate, ordinal, percent } from '../../../lib/format';
import { Pill } from '../ui/primitives';
import { card, eyebrow, type Tone } from '../ui/styles';
import { subjectTone } from '../ui/subjectTone';
import type { GradeBand, Position } from '../../../types/portal/common';
import type { ReportCard } from '../../../types/portal/reportCard';

/**
 * The tone of a grade, by its place on the school's scale: the top band
 * green, the next blue, the middle amber, the bottom (fail) red.
 *
 * @param grade - The letter.
 * @param scale - The school's scale, best first.
 * @returns The pill tone.
 */
export function gradeTone(grade: string | null | undefined, scale: readonly GradeBand[]): Tone {
  const index = scale.findIndex((band) => band.grade === grade);
  if (index < 0) return 'muted';
  if (index === 0) return 'success';
  if (index === 1) return 'info';
  if (index === scale.length - 1) return 'danger';
  return 'warning';
}

/**
 * "5th of 28".
 *
 * @param position - The rank, or null.
 * @returns The text, or an em dash.
 */
export function positionText(position: Position | null | undefined): string {
  return position ? `${ordinal(position.rank)} of ${position.of}` : '—';
}

/**
 * Each band's range, from its minimum to just under the band above.
 *
 * @param scale - The school's scale, best first.
 * @returns e.g. `[{ grade: 'A', range: '75 – 100%', label: 'Excellent' }]`.
 */
export function scaleRanges(scale: readonly GradeBand[]): { grade: string; range: string; label: string }[] {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.map((band, index) => ({
    grade: band.grade,
    range: `${band.min} – ${index === 0 ? 100 : sorted[index - 1].min - 1}%`,
    label: band.label ?? '',
  }));
}

/** Props for {@link ReportSheet}. */
export interface ReportSheetProps {
  report: ReportCard;
  parentName: string;
}

/**
 * The terminal report as the design lays it out, and as it prints: school
 * header, the student, a row per subject with the school's assessment columns,
 * the overall line, the grading scale, attendance, next term, the comments
 * and the three signatures (the parent's once acknowledged, B8).
 *
 * @param props - See {@link ReportSheetProps}.
 * @returns The sheet.
 */
export function ReportSheet({ report, parentName }: ReportSheetProps) {
  const { columns, rows, overall, scale } = report;
  const termLabel = `${report.term.name.toLowerCase()}, ${report.session ?? report.term.session ?? ''}`;
  const signed = Boolean(report.acknowledgedAt);
  const a = report.attendance;

  return (
    <section data-sheet="1" className={card} aria-label="Term report">
      <div className="flex items-center gap-3.5 border-b border-tl-line pb-[18px]">
        {report.school.logoUrl ? (
          <img src={report.school.logoUrl} alt="" className="h-[46px] w-[46px] shrink-0 rounded-xl object-contain" />
        ) : (
          <div aria-hidden="true" className="h-[46px] w-[46px] shrink-0 rounded-xl bg-tl-track" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold tracking-[-0.3px] text-tl-ink">{report.school.name}</h2>
          <p className="mt-0.5 text-[13px] text-tl-muted">Terminal report · {termLabel} session</p>
        </div>
      </div>

      <dl className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-3">
        {[
          ['Student name', report.student.name],
          ['Admission no.', report.student.admissionNumber ?? '—'],
          ['Class', report.student.class?.name ?? '—'],
          ['Term', report.term.name],
          ['Session', report.session ?? '—'],
          ['Parent / guardian', parentName],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{label}</dt>
            <dd className="mt-1 text-[15px] font-bold text-tl-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-[22px] overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Scores by subject, {termLabel}</caption>
          <colgroup>
            <col className="w-[26%]" />
            {columns.map((column) => (
              <col key={column.id} />
            ))}
            <col />
            <col />
            <col className="w-[13%]" />
          </colgroup>
          <thead>
            <tr className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-on-brand">
              <th scope="col" className="rounded-tl-xl bg-tl-brand-fill px-3.5 py-3 text-left">Subject</th>
              {columns.map((column) => (
                <th key={column.id} scope="col" className="bg-tl-brand-fill px-1 py-3 text-center">
                  {column.name} / {column.maxScore}
                </th>
              ))}
              <th scope="col" className="bg-tl-brand-fill px-1 py-3 text-center">Total</th>
              <th scope="col" className="bg-tl-brand-fill px-1 py-3 text-center">Grade</th>
              <th scope="col" className="rounded-tr-xl bg-tl-brand-fill px-1 py-3 text-center">Position</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.course.id} className={index % 2 ? 'bg-tl-subtle' : 'bg-tl-surface'}>
                <th scope="row" className="border-b border-l border-tl-line-soft px-3.5 py-3 text-left text-sm font-bold text-tl-ink">
                  <span className="flex min-w-0 items-center gap-[9px]">
                    <span aria-hidden="true" className={`${subjectTone(row.course.colourKey, row.course.id)} h-[9px] w-[9px] shrink-0 rounded-full bg-tone-solid`} />
                    <span className="truncate">{row.course.title}</span>
                  </span>
                </th>
                {row.scores.map((score, column) => (
                  <td key={columns[column]?.id ?? column} className="border-b border-tl-line-soft px-1 py-3 text-center text-tl-muted">
                    {score ?? <span title="Not published yet">–</span>}
                  </td>
                ))}
                <td className="border-b border-tl-line-soft px-1 py-3 text-center text-[15px] font-extrabold text-tl-ink">{row.total ?? '–'}</td>
                <td className="border-b border-tl-line-soft px-1 py-3 text-center">{row.grade ? <Pill tone={gradeTone(row.grade, scale)}>{row.grade}</Pill> : '–'}</td>
                <td className="border-b border-r border-tl-line-soft px-1 py-3 text-center text-[13px] text-tl-muted">{positionText(row.position)}</td>
              </tr>
            ))}
            <tr className="bg-tl-select">
              <th scope="row" className="rounded-bl-xl px-3.5 py-3.5 text-left text-sm font-extrabold text-tl-ink">Overall</th>
              {columns.map((column) => (
                <td key={column.id} />
              ))}
              <td className="text-center text-base font-extrabold text-tl-ink">{percent(overall.percent)}</td>
              <td className="text-center">{overall.grade ? <Pill tone={gradeTone(overall.grade, scale)}>{overall.grade}</Pill> : '–'}</td>
              <td className="rounded-br-xl text-center text-[13px] font-bold text-tl-muted">{positionText(overall.position)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-[18px]">
        <div>
          <h3 className={eyebrow}>Grading scale</h3>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {scaleRanges(scale).map((band) => (
              <li key={band.grade} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-[18px] font-extrabold text-tl-ink">{band.grade}</span>
                <span className="w-[92px] text-tl-muted">{band.range}</span>
                <span className="text-tl-faint">{band.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-tl-faint">Pass mark {report.passMark}%</p>
        </div>
        <div>
          <h3 className={eyebrow}>Attendance</h3>
          <p className="mt-2.5 text-[15px] leading-relaxed text-tl-body">
            {a.present + a.late} of {a.schoolDays} school days present · {a.absent} absent · {a.late} late · {a.excused} on approved leave
          </p>
          <h3 className={`${eyebrow} mt-[18px]`}>Next term begins</h3>
          <p className="mt-2 text-[15px] font-bold text-tl-ink">{report.nextTermStart ? longDate(report.nextTermStart) : 'To be announced'}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-tl-line-soft pt-[18px]">
        <h3 className={eyebrow}>Class teacher&apos;s comment</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-tl-body">
          {report.remarks?.classTeacher ?? 'Comments appear once the school publishes the term’s results.'}
        </p>
        {report.remarks?.principal ? (
          <>
            <h3 className={`${eyebrow} mt-4`}>Head teacher&apos;s comment</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-tl-body">{report.remarks.principal}</p>
          </>
        ) : null}
        <div className="mt-[38px] grid grid-cols-3 gap-[clamp(20px,5vw,64px)]">
          <div>
            <div className="flex h-[30px] items-end border-b border-tl-control pb-0.5 text-sm text-tl-muted">{report.remarks?.classTeacherName ?? ''}</div>
            <div className="mt-1.5 text-xs text-tl-faint">Class teacher</div>
          </div>
          <div>
            <div className="h-[30px] border-b border-tl-control" />
            <div className="mt-1.5 text-xs text-tl-faint">Head teacher</div>
          </div>
          <div>
            <div className="flex h-[30px] items-end overflow-hidden border-b border-tl-control pb-0.5">
              {signed ? <span className="whitespace-nowrap font-[cursive] text-[26px] leading-[26px] text-tl-brand">{parentName}</span> : null}
            </div>
            <div className="mt-1.5 text-xs text-tl-faint">{signed ? `Acknowledged ${longDate(report.acknowledgedAt)}` : 'Parent / guardian'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
