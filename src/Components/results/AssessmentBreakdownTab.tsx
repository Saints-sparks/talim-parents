import GradeBadge from './GradeBadge';
import { EmptyResultsState } from './ResultsStates';
import { formatFigure } from './resultsFormat';
import type { AssessmentBreakdownRow } from '../../services/results.services';

const HEADERS = ['Assessment', 'Subject', 'Score', 'Max', '%', 'Grade', 'Recorded By', 'Date'];

/**
 * A recorded-on date as "12 Jun 2026".
 *
 * @param value - An ISO timestamp, or nothing.
 * @returns The date, or an em dash.
 */
function formatRecorded(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Every published assessment score behind the child's results.
 *
 * @param props - Component props.
 * @param props.breakdown - One row per assessment.
 * @returns The table.
 */
export default function AssessmentBreakdownTab({ breakdown }: { breakdown: AssessmentBreakdownRow[] }) {
  if (!breakdown.length) return <EmptyResultsState termSelected />;

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
          {breakdown.map((row, index) => (
            <tr
              key={`${row.assessmentId}-${index}`}
              className="border-b border-gray-50 transition hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100">{row.assessmentName}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.subjectName}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.actualScore}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.maxScore}</td>
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100">
                {formatFigure(row.percentage, 1, '%')}
              </td>
              <td className="px-4 py-3">
                <GradeBadge grade={row.grade} />
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{row.recordedBy || '—'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                {formatRecorded(row.dateRecorded)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
