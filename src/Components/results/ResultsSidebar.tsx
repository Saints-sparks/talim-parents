import GradeBadge from './GradeBadge';
import { GRADE_LEGEND } from './gradeStyles';
import { formatFigure, ordinal, sumScores } from './resultsFormat';
import type { ResultSummary, SubjectResult } from '../../services/results.services';

/**
 * The grading scale the school uses.
 *
 * @returns The legend card.
 */
export function GradeLegendCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">Grade Legend</h3>
      <div className="space-y-1.5">
        {GRADE_LEGEND.map(({ grade, range, label }) => (
          <div key={grade} className="flex items-center gap-2 text-xs">
            <GradeBadge grade={grade} />
            <span className="w-14 text-gray-500 dark:text-slate-400">{range}</span>
            <span className="text-gray-600 dark:text-slate-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The term's totals, position and class average in one card.
 *
 * @param props - Component props.
 * @param props.summary - The child's summary; the card is hidden without one.
 * @param props.subjects - Per-subject results, for the total score.
 * @returns The card, or nothing.
 */
export function PerformanceSummaryCard({
  summary,
  subjects,
}: {
  summary: ResultSummary | undefined;
  subjects: SubjectResult[];
}) {
  if (!summary) return null;
  const { totalRaw, totalMax } = sumScores(subjects);

  const rows: Array<{ label: string; value: string | number }> = [
    { label: 'Total Score', value: totalMax > 0 ? `${totalRaw} / ${totalMax}` : '—' },
    { label: 'Percentage', value: formatFigure(summary.overallAverage, 2, '%') },
    { label: 'Grade', value: summary.overallGrade || '—' },
    { label: 'Class Position', value: summary.classPosition != null ? ordinal(summary.classPosition) : '—' },
    { label: 'Class Average', value: formatFigure(summary.classAverage, 2, '%') },
    { label: 'Students in Class', value: summary.totalStudents ?? '—' },
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">Performance Summary</h3>
      <div className="space-y-2 text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-slate-400">{label}</span>
            <span className="font-semibold text-gray-800 dark:text-slate-100">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
