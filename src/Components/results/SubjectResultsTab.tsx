import { LuBookText, LuCircleAlert } from 'react-icons/lu';
import GradeBadge from './GradeBadge';
import { formatFigure, sumScores } from './resultsFormat';
import type { ResultSummary, SubjectResult } from '../../services/results.services';

const HEADERS = ['Subject', 'Test Score (30%)', 'Exam Score (70%)', 'Total Score (100%)', 'Grade', 'Remark'];

/**
 * A raw score with its weighted contribution in brackets.
 *
 * @param props - Component props.
 * @param props.raw - The raw score, or `null` when there are no typed assessments.
 * @param props.weighted - The weighted contribution.
 * @returns The cell content.
 */
function WeightedScore({ raw, weighted }: { raw: number | null; weighted: number | null }) {
  if (raw === null) return <span className="text-gray-400 dark:text-slate-500">—</span>;
  return (
    <>
      {raw} <span className="text-gray-400 dark:text-slate-500">({formatFigure(weighted)})</span>
    </>
  );
}

/**
 * The per-subject results table, with the term total in its footer.
 *
 * @param props - Component props.
 * @param props.subjects - One row per subject.
 * @param props.summary - The child's summary, for the overall grade and remark.
 * @returns The table.
 */
export default function SubjectResultsTab({
  subjects,
  summary,
}: {
  subjects: SubjectResult[];
  summary: ResultSummary | undefined;
}) {
  const hasWeighted = subjects.some((subject) => subject.testScoreRaw !== null);
  const { totalRaw, totalMax } = sumScores(subjects);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-800">
            {HEADERS.map((header) => (
              <th key={header} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject, index) => (
            <tr
              key={`${subject.courseId}-${index}`}
              className="border-b border-gray-50 transition hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100">
                <div className="flex items-center gap-2">
                  <LuBookText className="shrink-0 text-gray-400 dark:text-slate-500" aria-hidden="true" />
                  {subject.subjectName}
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                {hasWeighted ? (
                  <WeightedScore raw={subject.testScoreRaw} weighted={subject.testScoreWeighted} />
                ) : (
                  <span className="text-gray-400 dark:text-slate-500">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                {hasWeighted ? (
                  <WeightedScore raw={subject.examScoreRaw} weighted={subject.examScoreWeighted} />
                ) : (
                  <span className="text-gray-400 dark:text-slate-500">—</span>
                )}
              </td>
              <td className="px-4 py-3 font-semibold text-gray-800 dark:text-slate-100">
                {formatFigure(subject.totalScore, 2, '%')}
              </td>
              <td className="px-4 py-3">
                <GradeBadge grade={subject.grade} />
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{subject.remark}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold dark:bg-slate-800/60">
            <td className="px-4 py-3 text-gray-800 dark:text-slate-100">Total</td>
            <td className="px-4 py-3 text-gray-500 dark:text-slate-400">—</td>
            <td className="px-4 py-3 text-gray-500 dark:text-slate-400">—</td>
            <td className="px-4 py-3 text-gray-800 dark:text-slate-100">
              {totalMax > 0 ? `${totalRaw} / ${totalMax} (${((totalRaw / totalMax) * 100).toFixed(2)}%)` : '—'}
            </td>
            <td className="px-4 py-3">
              <GradeBadge grade={summary?.overallGrade} />
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{summary?.gradeRemark || '—'}</td>
          </tr>
        </tfoot>
      </table>
      {hasWeighted && (
        <p className="mt-3 flex items-center gap-1 px-4 text-xs text-gray-400 dark:text-slate-500">
          <LuCircleAlert size={12} aria-hidden="true" /> Figures in brackets are weighted scores
        </p>
      )}
    </div>
  );
}
