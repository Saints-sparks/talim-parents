import { useState } from 'react';
import { Link } from 'react-router-dom';
import { percent } from '../../../lib/format';
import { card, cardTitle, textLink } from '../ui/styles';
import type { SubjectTotal } from '../../../types/portal/learner';

/** Props for {@link TermGlance}. */
export interface TermGlanceProps {
  firstName: string;
  subjects: SubjectTotal[];
  passMark: number;
}

/**
 * "Musa's term at a glance": one bar per subject (one series, so one hue;
 * the score is written on each bar), with the pass mark as a dashed rule.
 * Hovering a bar shows the subject's full name, total and class average; the
 * same facts are each bar's accessible name, so the chart reads as a list.
 *
 * @param props - See {@link TermGlanceProps}.
 * @returns The card.
 */
export function TermGlance({ firstName, subjects, passMark }: TermGlanceProps) {
  const [hover, setHover] = useState<string | null>(null);
  const scored = subjects.filter((subject) => subject.percent !== null);
  const passTop = `${100 - Math.min(100, Math.max(0, passMark))}%`;

  return (
    <section className={card} aria-labelledby="term-glance-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="term-glance-title" className={cardTitle}>
            {firstName}&apos;s term at a glance
          </h2>
          <p className="mt-1 text-sm text-tl-muted">
            Totals across {scored.length} subject{scored.length === 1 ? '' : 's'} · pass mark {passMark}%
          </p>
        </div>
        <Link to="/results" className={textLink}>
          Full result sheet →
        </Link>
      </div>

      {scored.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-tl-line-soft bg-tl-subtle p-4 text-sm text-tl-muted">
          No scores have been published this term yet. They appear here as teachers publish them.
        </p>
      ) : (
        <>
          <div className="relative mt-[22px] h-[150px] border-b border-tl-line-soft pt-1.5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-tl-faint/70"
              style={{ top: passTop }}
            />
            <ul className="flex h-full items-end gap-[clamp(4px,1vw,10px)]" aria-label={`${firstName}'s subject totals`}>
              {scored.map((subject) => {
                const value = subject.percent ?? 0;
                const label = `${subject.title}: ${percent(value)}${subject.classAverage !== null ? `, class average ${percent(subject.classAverage)}` : ''}`;
                return (
                  <li
                    key={subject.courseId}
                    aria-label={label}
                    className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                    onMouseEnter={() => setHover(subject.courseId)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {hover === subject.courseId ? (
                      <span
                        role="tooltip"
                        className="absolute bottom-full z-10 mb-1 w-max max-w-[200px] rounded-lg bg-tl-ink px-2.5 py-1.5 text-xs font-semibold text-tl-surface shadow-lg"
                      >
                        {label}
                      </span>
                    ) : null}
                    <span aria-hidden="true" className="text-[11px] font-extrabold text-tl-muted">
                      {Math.round(value)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-full max-w-[46px] rounded-t ${value < passMark ? 'bg-tl-faint' : 'bg-tl-link'}`}
                      style={{ height: `${Math.max(2, Math.min(100, value)) * 0.92}%` }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
          <div aria-hidden="true" className="mt-2 flex gap-[clamp(4px,1vw,10px)]">
            {scored.map((subject) => (
              <div key={subject.courseId} className="min-w-0 flex-1 truncate text-center text-[11px] font-bold tracking-[0.04em] text-tl-faint">
                {subject.short.slice(0, 4)}
              </div>
            ))}
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tl-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-tl-link" /> At or above the pass mark
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-tl-faint" /> Below the pass mark
            </span>
          </p>
        </>
      )}
    </section>
  );
}
