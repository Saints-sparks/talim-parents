import { LuAward, LuBookText, LuStar, LuTrophy } from 'react-icons/lu';
import KpiCard from './KpiCard';
import { describePosition, formatFigure } from './resultsFormat';
import type { ResultSummary } from '../../services/results.services';

/**
 * The five headline figures for the child's term.
 *
 * @param props - Component props.
 * @param props.summary - The child's result summary, when it has loaded.
 * @returns The KPI row.
 */
export default function ResultsKpis({ summary }: { summary: ResultSummary | undefined }) {
  const position = describePosition(summary);
  const completed = summary?.assessmentsCompleted;
  const total = summary?.totalAssessments;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <KpiCard
        icon={<span className="text-lg font-bold text-blue-500">%</span>}
        label="Overall Average"
        value={formatFigure(summary?.overallAverage, 2, '%')}
        sub={summary?.gradeRemark}
        accent="bg-blue-50"
      />
      <KpiCard
        icon={<LuTrophy className="text-yellow-500" size={18} />}
        label="Class Position"
        value={position.value}
        sub={position.sub}
        accent="bg-yellow-50"
      />
      <KpiCard
        icon={<LuBookText className="text-purple-500" size={18} />}
        label="Total Subjects"
        value={summary?.totalSubjects ?? '—'}
        sub="All Graded"
        accent="bg-purple-50"
      />
      <KpiCard
        icon={<LuStar className="text-orange-500" size={18} />}
        label="Highest Subject"
        value={summary?.highestSubject?.name || '—'}
        sub={summary?.highestSubject ? formatFigure(summary.highestSubject.percentage, 2, '%') : null}
        accent="bg-orange-50"
      />
      <KpiCard
        icon={<LuAward className="text-green-500" size={18} />}
        label="Assessments Completed"
        value={completed != null ? `${completed} / ${total}` : '—'}
        sub={completed === total && total != null && total > 0 ? '100%' : null}
        accent="bg-green-50"
      />
    </div>
  );
}
